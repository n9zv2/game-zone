import { shuffle, pick } from "../utils.js";
import {
  LOYALTY_SYMBOLS, FACE_OFF_EMOJIS, SECRET_WORDS,
  ROUND_ACTIVITIES, GENERAL_CARDS, SABOTEUR_CARDS, DETECTIVE_CARDS,
  getDefaultSettings,
} from "../data/fitnaData.js";
import { finishGame } from "../roomManager.js";
import { addScore } from "../sessionManager.js";

const activeGames = new Map();
let io_ref = null;

// ============================================================
// Start Fitna — Multiplayer (real players from room)
// ============================================================
export function startFitna(io, room, settings = {}) {
  io_ref = io;
  const connectedPlayers = room.players.filter((p) => p.connected);
  if (connectedPlayers.length < 4) return;

  const playerCount = connectedPlayers.length;
  const defaults = getDefaultSettings(playerCount);

  const saboteurCount = Math.min(settings.saboteurCount || defaults.saboteurs, Math.floor(playerCount / 2) - 1);
  const detectiveCount = Math.min(settings.detectiveCount || defaults.detectives, playerCount - saboteurCount - 1);
  const maxRounds = defaults.rounds;
  const discussionTime = settings.discussionTime || 60;
  const voteTime = settings.voteTime || 30;

  // Build player objects
  const players = shuffle(connectedPlayers.map((p) => ({
    token: p.token,
    name: p.name,
    avatar: p.avatar,
    socketId: p.socketId,
    alive: true,
    role: "innocent",
    card: null,
    suspicion: 0,
    votedFor: null,
    cardPlayed: null,
    correctAnswers: 0,
    cardsUsed: 0,
    loyaltyChoice: null,
    faceOffChoice: null,
    secretWordHint: null,
    nightAction: null,
    correctVotes: 0,
  })));

  // Assign roles: N saboteurs + M detectives + rest innocents
  const indices = shuffle(Array.from({ length: playerCount }, (_, i) => i));
  const sabIdx = indices.slice(0, saboteurCount);
  const detIdx = indices.slice(saboteurCount, saboteurCount + detectiveCount);

  sabIdx.forEach((i) => { players[i].role = "saboteur"; });
  detIdx.forEach((i) => { players[i].role = "detective"; });

  const saboteurTokens = sabIdx.map((i) => players[i].token);
  const detectiveTokens = detIdx.map((i) => players[i].token);

  // Build activity sequence (cycling through ROUND_ACTIVITIES)
  const activities = [];
  for (let r = 0; r < maxRounds; r++) {
    activities.push({ ...ROUND_ACTIVITIES[r % ROUND_ACTIVITIES.length] });
  }

  const game = {
    roomCode: room.code,
    phase: "countdown",
    roundIdx: 0,
    maxRounds,
    players,
    saboteurTokens,
    detectiveTokens,
    activities,
    currentActivity: null,
    timerEnd: 0,
    roundHistory: [],
    _timeout: null,
    // Settings from host
    discussionTime: discussionTime * 1000,
    voteTime: voteTime * 1000,
    // Per-round modifiers
    shieldedTokens: new Set(),
    silencedTokens: new Set(),
    fogActive: false,
    doubleVoteTokens: new Set(),
    redirects: new Map(),
    // Investigation memory
    investigations: [],
    framedTokens: new Set(),
    deepInvestigateTokens: new Set(),
    // Activity-specific data
    loyaltyData: null,
    faceOffData: null,
    secretWordData: null,
    // Discussion data
    discussionMessages: [],
    // Evidence tracking
    evidence: [],
    // Night data
    nightKillVotes: new Map(),
    nightKillTarget: null,
  };

  activeGames.set(room.code, game);
  const roomId = `room:${room.code}`;

  io.to(roomId).emit("fitna:start", {
    players: players.map((p) => ({
      token: p.token, name: p.name, avatar: p.avatar, alive: p.alive,
    })),
    totalRounds: game.maxRounds,
  });

  // Countdown
  let count = 3;
  const countInterval = setInterval(() => {
    io.to(roomId).emit("fitna:countdown", { count });
    count--;
    if (count < 0) {
      clearInterval(countInterval);
      sendRoleReveal(io, game);
    }
  }, 1000);
}

// ============================================================
// Deal a single card based on role
// ============================================================
function dealSingleCard(role) {
  if (role === "saboteur") {
    const pool = Math.random() < 0.5 ? SABOTEUR_CARDS : GENERAL_CARDS;
    return { ...pick(pool, 1)[0] };
  } else if (role === "detective") {
    const pool = Math.random() < 0.5 ? DETECTIVE_CARDS : GENERAL_CARDS;
    return { ...pick(pool, 1)[0] };
  }
  return { ...pick(GENERAL_CARDS, 1)[0] };
}

// ============================================================
// Role Reveal — each player sees their own role
// ============================================================
function sendRoleReveal(io, game) {
  const roomId = `room:${game.roomCode}`;
  game.phase = "role-reveal";

  game.players.forEach((player) => {
    if (!player.socketId) return;

    const roleData = { role: player.role };
    if (player.role === "saboteur") {
      const partners = game.players.filter((p) => p.token !== player.token && p.role === "saboteur");
      roleData.partners = partners.map((p) => ({ name: p.name, avatar: p.avatar }));
    }

    io.to(player.socketId).emit("fitna:role-reveal", roleData);
  });

  game._timeout = setTimeout(() => {
    sendActivity(io, game.roomCode);
  }, 5000);
}

// ============================================================
// Activity Phase — dispatches to correct activity type
// ============================================================
function sendActivity(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const actDef = game.activities[game.roundIdx];
  if (!actDef) { endGame(io, game, "innocents"); return; }

  game.phase = "activity";
  game.currentActivity = actDef;

  // Reset per-round state
  game.players.forEach((p) => {
    p.loyaltyChoice = null;
    p.faceOffChoice = null;
    p.secretWordHint = null;
    p.votedFor = null;
    p.cardPlayed = null;
    p.nightAction = null;
  });
  game.shieldedTokens = new Set();
  game.silencedTokens = new Set();
  game.fogActive = false;
  game.doubleVoteTokens = new Set();
  game.redirects = new Map();
  game.deepInvestigateTokens = new Set();
  game.discussionMessages = [];
  game.nightKillVotes = new Map();
  game.nightKillTarget = null;

  switch (actDef.id) {
    case "loyalty_test":
      startLoyaltyTest(io, game);
      break;
    case "face_off":
      startFaceOff(io, game);
      break;
    case "secret_word":
      startSecretWord(io, game);
      break;
  }
}

// ============================================================
// 1. Loyalty Test — innocents see secret symbol, traitors guess
// ============================================================
function startLoyaltyTest(io, game) {
  const symbolSet = pick(LOYALTY_SYMBOLS, 1)[0];
  const shuffledSymbols = shuffle([...symbolSet]);
  const correctIdx = Math.floor(Math.random() * 4);
  const correctSymbol = shuffledSymbols[correctIdx];

  game.loyaltyData = { symbols: shuffledSymbols, correctIdx, correctSymbol };
  const time = game.currentActivity.time;
  game.timerEnd = Date.now() + time * 1000;

  const alivePlayers = game.players.filter((p) => p.alive);
  const aliveCount = alivePlayers.length;

  alivePlayers.forEach((player) => {
    if (!player.socketId) return;
    const isSaboteur = player.role === "saboteur";
    io.to(player.socketId).emit("fitna:loyalty-test", {
      roundIdx: game.roundIdx,
      time,
      timerEnd: game.timerEnd,
      symbols: shuffledSymbols,
      secretSymbol: isSaboteur ? null : correctSymbol,
      aliveCount,
    });
  });

  // Timer
  game._timeout = setTimeout(() => {
    // Auto-answer for non-responders
    game.players.filter((p) => p.alive && p.loyaltyChoice === null).forEach((p) => {
      p.loyaltyChoice = -1;
    });
    finishLoyaltyTest(io, game);
  }, time * 1000 + 1000);
}

function checkAllLoyaltyDone(game) {
  if (game.phase !== "activity" || !io_ref) return;
  const alive = game.players.filter((p) => p.alive);
  const allDone = alive.every((p) => p.loyaltyChoice !== null);
  if (allDone) {
    clearTimeout(game._timeout);
    game._timeout = setTimeout(() => {
      const g = activeGames.get(game.roomCode);
      if (g && g.phase === "activity") finishLoyaltyTest(io_ref, g);
    }, 500);
  }
}

function finishLoyaltyTest(io, game) {
  if (game.phase !== "activity") return;
  game.phase = "results";

  const data = game.loyaltyData;
  const alivePlayers = game.players.filter((p) => p.alive);

  const results = alivePlayers.map((p) => {
    const chose = p.loyaltyChoice;
    const isCorrect = chose === data.correctIdx;
    if (!isCorrect) p.suspicion += 1;
    if (isCorrect) p.correctAnswers++;

    return {
      token: p.token, name: p.name, avatar: p.avatar,
      choice: chose, choiceSymbol: chose >= 0 && chose < 4 ? data.symbols[chose] : "⏰",
      correct: isCorrect,
      suspicion: p.suspicion,
    };
  });

  game.evidence.push({
    round: game.roundIdx + 1,
    type: "loyalty_test",
    correctSymbol: data.correctSymbol,
    results: results.map((r) => ({
      token: r.token, name: r.name, choiceSymbol: r.choiceSymbol, correct: r.correct,
    })),
  });

  const roomId = `room:${game.roomCode}`;
  io.to(roomId).emit("fitna:activity-results", {
    roundIdx: game.roundIdx,
    type: "loyalty_test",
    correctSymbol: data.correctSymbol,
    symbols: data.symbols,
    results,
    fogActive: game.fogActive,
  });

  game._timeout = setTimeout(() => {
    startDiscussion(io, game);
  }, 5000);
}

// ============================================================
// 2. Face-Off — 1v1 confrontation (replaces Trust Mission)
// ============================================================
function startFaceOff(io, game) {
  const alivePlayers = game.players.filter((p) => p.alive);
  const shuffled = shuffle([...alivePlayers]);
  const pairs = [];
  let sittingOut = null;

  // Create pairs; if odd number, last player sits out
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const pair = [shuffled[i], shuffled[i + 1]];
    const emojiPair = pick(FACE_OFF_EMOJIS, 1)[0];
    const correctIdx = Math.floor(Math.random() * 2);
    pairs.push({
      tokens: [pair[0].token, pair[1].token],
      names: [pair[0].name, pair[1].name],
      avatars: [pair[0].avatar, pair[1].avatar],
      emojis: emojiPair,
      correctIdx,
      correctEmoji: emojiPair[correctIdx],
      answers: [null, null],
    });
  }
  if (shuffled.length % 2 === 1) {
    sittingOut = shuffled[shuffled.length - 1].token;
  }

  const time = game.currentActivity.time;
  game.timerEnd = Date.now() + time * 1000;
  game.faceOffData = { pairs, sittingOut };

  // Send to each player their pair info
  alivePlayers.forEach((player) => {
    if (!player.socketId) return;

    if (player.token === sittingOut) {
      io.to(player.socketId).emit("fitna:face-off", {
        roundIdx: game.roundIdx,
        time,
        timerEnd: game.timerEnd,
        sittingOut: true,
        aliveCount: alivePlayers.length,
      });
      return;
    }

    // Find this player's pair
    const pairIdx = pairs.findIndex((p) => p.tokens.includes(player.token));
    if (pairIdx === -1) return;
    const pair = pairs[pairIdx];
    const mySlot = pair.tokens[0] === player.token ? 0 : 1;
    const opponentSlot = 1 - mySlot;

    const isSaboteur = player.role === "saboteur";

    io.to(player.socketId).emit("fitna:face-off", {
      roundIdx: game.roundIdx,
      time,
      timerEnd: game.timerEnd,
      sittingOut: false,
      pairIdx,
      emojis: pair.emojis,
      correctEmoji: isSaboteur ? null : pair.correctEmoji,
      opponentName: pair.names[opponentSlot],
      opponentAvatar: pair.avatars[opponentSlot],
      aliveCount: alivePlayers.length,
    });
  });

  // Timer
  game._timeout = setTimeout(() => {
    // Auto-answer for non-responders
    game.players.filter((p) => p.alive && p.faceOffChoice === null && p.token !== sittingOut).forEach((p) => {
      p.faceOffChoice = -1;
    });
    finishFaceOff(io, game);
  }, time * 1000 + 1000);
}

function checkAllFaceOffDone(game) {
  if (game.phase !== "activity" || !io_ref || !game.faceOffData) return;
  const data = game.faceOffData;
  const allPairsDone = data.pairs.every((pair) => pair.answers[0] !== null && pair.answers[1] !== null);
  if (allPairsDone) {
    clearTimeout(game._timeout);
    game._timeout = setTimeout(() => {
      const g = activeGames.get(game.roomCode);
      if (g && g.phase === "activity") finishFaceOff(io_ref, g);
    }, 500);
  }
}

function finishFaceOff(io, game) {
  if (game.phase !== "activity") return;
  game.phase = "results";

  const data = game.faceOffData;
  const pairResults = data.pairs.map((pair) => {
    const p0 = game.players.find((p) => p.token === pair.tokens[0]);
    const p1 = game.players.find((p) => p.token === pair.tokens[1]);

    const a0 = pair.answers[0];
    const a1 = pair.answers[1];
    const correct0 = a0 === pair.correctIdx;
    const correct1 = a1 === pair.correctIdx;
    const agreed = a0 === a1 && a0 !== null && a0 !== -1;

    if (correct0 && p0) p0.correctAnswers++;
    if (correct1 && p1) p1.correctAnswers++;
    if (!correct0 && p0) p0.suspicion += 1;
    if (!correct1 && p1) p1.suspicion += 1;

    return {
      tokens: pair.tokens,
      names: pair.names,
      avatars: pair.avatars,
      emojis: pair.emojis,
      correctEmoji: pair.correctEmoji,
      answers: [a0, a1],
      correct: [correct0, correct1],
      agreed,
    };
  });

  // Store evidence
  game.evidence.push({
    round: game.roundIdx + 1,
    type: "face_off",
    pairResults: pairResults.map((pr) => ({
      tokens: pr.tokens, names: pr.names, agreed: pr.agreed, correct: pr.correct,
    })),
    sittingOut: data.sittingOut,
  });

  const roomId = `room:${game.roomCode}`;
  io.to(roomId).emit("fitna:activity-results", {
    roundIdx: game.roundIdx,
    type: "face_off",
    pairResults,
    sittingOut: data.sittingOut,
    sittingOutName: data.sittingOut ? game.players.find((p) => p.token === data.sittingOut)?.name : null,
    fogActive: game.fogActive,
  });

  game._timeout = setTimeout(() => {
    startDiscussion(io, game);
  }, 5000);
}

// ============================================================
// 3. Secret Word — innocents see word, traitors see category only
// ============================================================
function startSecretWord(io, game) {
  const wordData = pick(SECRET_WORDS, 1)[0];
  game.secretWordData = {
    word: wordData.word,
    category: wordData.category,
    innocentHints: wordData.innocentHints,
    traitorHints: wordData.traitorHints,
  };

  const time = game.currentActivity.time;
  game.timerEnd = Date.now() + time * 1000;

  const alivePlayers = game.players.filter((p) => p.alive);
  alivePlayers.forEach((player) => {
    if (!player.socketId) return;
    const isSaboteur = player.role === "saboteur";
    io.to(player.socketId).emit("fitna:secret-word", {
      roundIdx: game.roundIdx,
      time,
      timerEnd: game.timerEnd,
      category: wordData.category,
      word: isSaboteur ? null : wordData.word,
      isSaboteur,
      players: alivePlayers.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
      aliveCount: alivePlayers.length,
    });
  });

  game._timeout = setTimeout(() => {
    finishSecretWord(io, game);
  }, time * 1000 + 1000);
}

function finishSecretWord(io, game) {
  if (game.phase !== "activity") return;
  game.phase = "results";

  const data = game.secretWordData;
  const alivePlayers = game.players.filter((p) => p.alive);

  const results = alivePlayers.map((p) => {
    const gaveHint = p.secretWordHint !== null;
    if (!gaveHint) p.suspicion += 1;
    if (gaveHint && p.role !== "saboteur") p.correctAnswers++;

    return {
      token: p.token, name: p.name, avatar: p.avatar,
      hint: p.secretWordHint || "(ما رد)",
      gaveHint,
      suspicion: p.suspicion,
    };
  });

  game.evidence.push({
    round: game.roundIdx + 1,
    type: "secret_word",
    category: data.category,
    word: data.word,
    hints: results.map((r) => ({
      token: r.token, name: r.name, hint: r.hint, gaveHint: r.gaveHint,
    })),
  });

  const roomId = `room:${game.roomCode}`;
  io.to(roomId).emit("fitna:activity-results", {
    roundIdx: game.roundIdx,
    type: "secret_word",
    category: data.category,
    word: data.word,
    results,
    fogActive: game.fogActive,
  });

  game._timeout = setTimeout(() => {
    startDiscussion(io, game);
  }, 5000);
}

// ============================================================
// Discussion Phase — free chat + quick actions
// ============================================================
function startDiscussion(io, game) {
  game.phase = "discussion";
  game.timerEnd = Date.now() + game.discussionTime;
  game.discussionMessages = [];

  const alivePlayers = game.players.filter((p) => p.alive);
  const roomId = `room:${game.roomCode}`;

  io.to(roomId).emit("fitna:discussion", {
    roundIdx: game.roundIdx,
    timerEnd: game.timerEnd,
    players: alivePlayers.map((p) => ({
      token: p.token, name: p.name, avatar: p.avatar, suspicion: p.suspicion,
    })),
    evidence: game.evidence,
  });

  game._timeout = setTimeout(() => {
    startCardPhase(io, game);
  }, game.discussionTime);
}

// ============================================================
// Handle Discussion Actions (accuse/defend/agree)
// ============================================================
export function handleDiscussionAction(io, socket, data) {
  io_ref = io;
  const { roomCode, token, action, targetToken } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "discussion") return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player) return;

  const target = targetToken ? game.players.find((p) => p.token === targetToken) : null;

  if (action === "accuse" && target) {
    target.suspicion += 0.5;
    const msg = {
      token: player.token, name: player.name, avatar: player.avatar,
      text: `يتهم ${target.name}`,
      type: "accuse", targetToken: target.token,
    };
    game.discussionMessages.push(msg);
    io.to(`room:${roomCode}`).emit("fitna:discussion-message", msg);
  } else if (action === "defend") {
    const msg = {
      token: player.token, name: player.name, avatar: player.avatar,
      text: "يدافع عن نفسه",
      type: "defend",
    };
    game.discussionMessages.push(msg);
    io.to(`room:${roomCode}`).emit("fitna:discussion-message", msg);
  } else if (action === "agree" && targetToken) {
    const targetPlayer = game.players.find((p) => p.token === targetToken);
    if (targetPlayer) targetPlayer.suspicion += 0.5;
    const msg = {
      token: player.token, name: player.name, avatar: player.avatar,
      text: `يوافق على اتهام ${targetPlayer?.name || "???"}`,
      type: "agree", targetToken,
    };
    game.discussionMessages.push(msg);
    io.to(`room:${roomCode}`).emit("fitna:discussion-message", msg);
  }
}

// ============================================================
// Handle Chat Message (free text)
// ============================================================
export function handleChatMessage(io, socket, data) {
  io_ref = io;
  const { roomCode, token, text } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "discussion") return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player) return;

  // Limit message length
  const cleanText = (text || "").trim().slice(0, 100);
  if (!cleanText) return;

  const msg = {
    token: player.token, name: player.name, avatar: player.avatar,
    text: cleanText,
    type: "chat",
  };
  game.discussionMessages.push(msg);
  io.to(`room:${roomCode}`).emit("fitna:discussion-message", msg);
}

// ============================================================
// Card Phase
// ============================================================
function startCardPhase(io, game) {
  if (game.roundIdx === 0) {
    startVoting(io, game);
    return;
  }

  game.phase = "cards";
  const cardTime = 12000;
  game.timerEnd = Date.now() + cardTime;

  const alivePlayers = game.players.filter((p) => p.alive);
  alivePlayers.forEach((player) => {
    if (!player.socketId) return;
    io.to(player.socketId).emit("fitna:card-phase", {
      card: player.card,
      timerEnd: game.timerEnd,
      alivePlayers: alivePlayers.filter((p) => p.token !== player.token).map((p) => ({
        token: p.token, name: p.name, avatar: p.avatar, suspicion: p.suspicion,
      })),
    });
  });

  game._timeout = setTimeout(() => {
    applyCards(io, game);
  }, cardTime);
}

// ============================================================
// Handle Card Play
// ============================================================
export function handleFitnaCard(io, socket, data) {
  io_ref = io;
  const { roomCode, token, cardId, targetToken } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "cards") return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player || !player.card || player.card.id !== cardId) return;

  player.cardPlayed = { cardId, targetToken };
  player.card = null;
  player.cardsUsed++;

  if (player.socketId) {
    io.to(player.socketId).emit("fitna:card-played", { cardId });
  }
}

// ============================================================
// Apply Cards
// ============================================================
function applyCards(io, game) {
  game.phase = "cards-resolving";
  const effects = [];

  game.players.filter((p) => p.alive && p.cardPlayed).forEach((p) => {
    const { cardId, targetToken } = p.cardPlayed;
    const target = targetToken ? game.players.find((t) => t.token === targetToken) : null;

    switch (cardId) {
      case "shield":
        game.shieldedTokens.add(p.token);
        effects.push({ player: p.name, card: cardId, icon: "🛡️", desc: `${p.name} حمى نفسه` });
        break;
      case "double_vote":
        game.doubleVoteTokens.add(p.token);
        effects.push({ player: p.name, card: cardId, icon: "✌️", desc: `${p.name} صوته مزدوج` });
        break;
      case "silence":
        if (target) {
          game.silencedTokens.add(target.token);
          effects.push({ player: p.name, card: cardId, target: target.name, icon: "🤫", desc: `${p.name} أسكت ${target.name}` });
        }
        break;
      case "scandal":
        if (target) {
          target.suspicion += 2;
          effects.push({ player: p.name, card: cardId, target: target.name, icon: "📢", desc: `${p.name} فضح ${target.name} (+2 شك)` });
        }
        break;
      case "redirect":
        if (target) {
          game.redirects.set(p.token, target.token);
          effects.push({ player: p.name, card: cardId, target: target.name, icon: "↩️", desc: `${p.name} حوّل الأصوات لـ ${target.name}` });
        }
        break;
      case "fog":
        game.fogActive = true;
        effects.push({ player: p.name, card: cardId, icon: "🌫️", desc: `ضباب يغطي النتائج!` });
        break;
      case "frame":
        if (target) {
          game.framedTokens.add(target.token);
          effects.push({ player: p.name, card: cardId, icon: "🎭", desc: `${p.name} لفّق تهمة!` });
        }
        break;
      case "deep_investigate":
        game.deepInvestigateTokens.add(p.token);
        effects.push({ player: p.name, card: cardId, icon: "🔬", desc: `${p.name} فعّل تحقيق عميق` });
        break;
      case "reveal":
        if (target) {
          const roleText = target.role === "saboteur" ? "خائن 🔥" : "بريء 😇";
          effects.push({ player: p.name, card: cardId, target: target.name, icon: "📣", desc: `${target.name} هو ${roleText}` });
        }
        break;
    }
  });

  const roomId = `room:${game.roomCode}`;
  io.to(roomId).emit("fitna:card-results", { effects });

  game._timeout = setTimeout(() => {
    startVoting(io, game);
  }, 3000);
}

// ============================================================
// Voting Phase
// ============================================================
function startVoting(io, game) {
  game.phase = "voting";
  game.timerEnd = Date.now() + game.voteTime;

  const alivePlayers = game.players.filter((p) => p.alive);
  const roomId = `room:${game.roomCode}`;

  alivePlayers.forEach((player) => {
    if (!player.socketId) return;
    io.to(player.socketId).emit("fitna:vote-phase", {
      timerEnd: game.timerEnd,
      candidates: alivePlayers.filter((p) => p.token !== player.token).map((p) => ({
        token: p.token, name: p.name, avatar: p.avatar, suspicion: p.suspicion,
      })),
      silenced: game.silencedTokens.has(player.token),
    });
  });

  game._timeout = setTimeout(() => {
    tallyVotes(io, game);
  }, game.voteTime + 1000);
}

function checkAllVoted(game) {
  if (game.phase !== "voting" || !io_ref) return;
  const voters = game.players.filter((p) => p.alive && !game.silencedTokens.has(p.token));
  const allVoted = voters.every((p) => p.votedFor !== null);
  if (allVoted) {
    clearTimeout(game._timeout);
    game._timeout = setTimeout(() => {
      const g = activeGames.get(game.roomCode);
      if (g && g.phase === "voting") tallyVotes(io_ref, g);
    }, 500);
  }
}

// ============================================================
// Handle Vote
// ============================================================
export function handleFitnaVote(io, socket, data) {
  io_ref = io;
  const { roomCode, token, targetToken } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "voting") return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player || player.votedFor !== null) return;
  if (game.silencedTokens.has(token)) return;

  player.votedFor = targetToken || "skip";

  if (targetToken && targetToken !== "skip") {
    const target = game.players.find((p) => p.token === targetToken);
    if (target && target.role === "saboteur") {
      player.correctVotes = (player.correctVotes || 0) + 1;
    }
  }

  checkAllVoted(game);
}

// ============================================================
// Tally Votes
// ============================================================
function tallyVotes(io, game) {
  if (game.phase !== "voting") return;
  game.phase = "vote-results";

  const votes = {};
  game.players.filter((p) => p.alive && p.votedFor !== null && !game.silencedTokens.has(p.token)).forEach((p) => {
    let target = p.votedFor;
    if (game.redirects.has(target)) {
      target = game.redirects.get(target);
    }
    const weight = game.doubleVoteTokens.has(p.token) ? 2 : 1;
    votes[target] = (votes[target] || 0) + weight;
  });

  let maxVotes = 0;
  let eliminated = null;
  const voteEntries = Object.entries(votes);
  voteEntries.forEach(([token, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      eliminated = token;
    }
  });

  const tiedPlayers = voteEntries.filter(([, count]) => count === maxVotes);
  if (tiedPlayers.length > 1) eliminated = null;

  const voteResults = game.players.filter((p) => p.alive).map((p) => ({
    token: p.token, name: p.name, avatar: p.avatar,
    votedFor: p.votedFor,
    votesReceived: votes[p.token] || 0,
  }));

  const roomId = `room:${game.roomCode}`;
  io.to(roomId).emit("fitna:vote-results", {
    votes: voteResults,
    eliminatedToken: eliminated,
    tied: tiedPlayers.length > 1,
  });

  game._timeout = setTimeout(() => {
    if (eliminated) {
      eliminatePlayer(io, game, eliminated);
    } else {
      startNightPhase(io, game);
    }
  }, 4000);
}

// ============================================================
// Elimination
// ============================================================
function eliminatePlayer(io, game, token) {
  game.phase = "elimination";
  const player = game.players.find((p) => p.token === token);
  if (!player) { startNightPhase(io, game); return; }

  if (game.shieldedTokens.has(token)) {
    const roomId = `room:${game.roomCode}`;
    io.to(roomId).emit("fitna:elimination", {
      token: player.token, name: player.name, avatar: player.avatar,
      role: "shielded", saved: true,
    });
    game._timeout = setTimeout(() => startNightPhase(io, game), 4000);
    return;
  }

  player.alive = false;
  const roomId = `room:${game.roomCode}`;

  io.to(roomId).emit("fitna:elimination", {
    token: player.token, name: player.name, avatar: player.avatar,
    role: player.role, saved: false,
  });

  const winCheck = checkWinCondition(game);
  if (winCheck) {
    game._timeout = setTimeout(() => endGame(io, game, winCheck), 4000);
  } else {
    game._timeout = setTimeout(() => startNightPhase(io, game), 4000);
  }
}

// ============================================================
// Night Phase — Multiple saboteurs vote on kill target + each detective investigates
// ============================================================
function startNightPhase(io, game) {
  game.phase = "night";
  const nightTime = 15000;
  game.timerEnd = Date.now() + nightTime;
  game.nightKillVotes = new Map();
  game.nightKillTarget = null;

  const alivePlayers = game.players.filter((p) => p.alive);
  const aliveSaboteurs = alivePlayers.filter((p) => p.role === "saboteur");
  const aliveDetectives = alivePlayers.filter((p) => p.role === "detective");

  alivePlayers.forEach((player) => {
    if (!player.socketId) return;

    if (player.role === "saboteur") {
      const targets = alivePlayers.filter((p) => p.role !== "saboteur");
      const partnerNames = aliveSaboteurs.filter((p) => p.token !== player.token).map((p) => p.name);
      io.to(player.socketId).emit("fitna:night", {
        role: "saboteur",
        timerEnd: game.timerEnd,
        targets: targets.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
        totalSaboteurs: aliveSaboteurs.length,
        partnerNames,
      });
    } else if (player.role === "detective") {
      const maxInvestigations = game.deepInvestigateTokens.has(player.token) ? 2 : 1;
      const candidates = alivePlayers.filter((p) => p.token !== player.token);
      io.to(player.socketId).emit("fitna:night", {
        role: "detective",
        timerEnd: game.timerEnd,
        maxInvestigations,
        candidates: candidates.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar, suspicion: p.suspicion })),
        previousInvestigations: game.investigations,
      });
    } else {
      io.to(player.socketId).emit("fitna:night", {
        role: "innocent",
        timerEnd: game.timerEnd,
      });
    }
  });

  game._timeout = setTimeout(() => {
    resolveNight(io, game);
  }, nightTime + 500);
}

// ============================================================
// Handle Night Actions
// ============================================================
export function handleNightAction(io, socket, data) {
  io_ref = io;
  const { roomCode, token, action, targetToken } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "night") return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player) return;

  if (action === "kill" && player.role === "saboteur") {
    game.nightKillVotes.set(player.token, targetToken);

    if (player.socketId) {
      io.to(player.socketId).emit("fitna:night-action-confirmed", { action: "kill" });
    }

    // Check if all alive saboteurs have voted
    const aliveSaboteurs = game.players.filter((p) => p.alive && p.role === "saboteur");
    const allVoted = aliveSaboteurs.every((s) => game.nightKillVotes.has(s.token));
    if (allVoted) {
      // Resolve kill target by majority
      resolveNightKillTarget(game);
    }
  } else if (action === "investigate" && player.role === "detective") {
    const target = game.players.find((p) => p.token === targetToken && p.alive);
    if (!target) return;

    const maxInvestigations = game.deepInvestigateTokens.has(player.token) ? 2 : 1;
    const thisRoundInvestigations = game.investigations.filter(
      (i) => i.round === game.roundIdx + 1 && i.investigatorToken === player.token
    ).length;
    if (thisRoundInvestigations >= maxInvestigations) return;

    const isFramed = game.framedTokens.has(target.token);
    const result = isFramed ? "saboteur" : target.role === "saboteur" ? "saboteur" : "innocent";

    game.investigations.push({
      token: target.token,
      name: target.name,
      result,
      round: game.roundIdx + 1,
      framed: isFramed,
      investigatorToken: player.token,
    });

    if (player.socketId) {
      io.to(player.socketId).emit("fitna:investigate-result", {
        targetToken: target.token,
        targetName: target.name,
        result,
      });
    }
  }
}

// ============================================================
// Resolve night kill target by majority among saboteurs
// ============================================================
function resolveNightKillTarget(game) {
  const voteCounts = {};
  for (const [, targetToken] of game.nightKillVotes) {
    voteCounts[targetToken] = (voteCounts[targetToken] || 0) + 1;
  }

  let maxVotes = 0;
  const candidates = [];
  for (const [token, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidates.length = 0;
      candidates.push(token);
    } else if (count === maxVotes) {
      candidates.push(token);
    }
  }

  // Tie = random among tied
  game.nightKillTarget = candidates[Math.floor(Math.random() * candidates.length)] || null;
}

// ============================================================
// Resolve Night — morning announcement
// ============================================================
function resolveNight(io, game) {
  if (game.phase !== "night") return;
  game.phase = "morning";

  // If saboteurs didn't all vote, resolve with whoever voted
  if (!game.nightKillTarget && game.nightKillVotes.size > 0) {
    resolveNightKillTarget(game);
  }

  const roomId = `room:${game.roomCode}`;

  if (game.nightKillTarget) {
    const victim = game.players.find((p) => p.token === game.nightKillTarget && p.alive);
    if (victim) {
      if (game.shieldedTokens.has(victim.token)) {
        io.to(roomId).emit("fitna:morning", {
          killed: false,
          shielded: true,
          shieldedName: victim.name,
          shieldedAvatar: victim.avatar,
        });
      } else {
        victim.alive = false;
        io.to(roomId).emit("fitna:morning", {
          killed: true,
          victimToken: victim.token,
          victimName: victim.name,
          victimAvatar: victim.avatar,
          victimRole: victim.role,
        });
      }
    } else {
      io.to(roomId).emit("fitna:morning", { killed: false });
    }
  } else {
    io.to(roomId).emit("fitna:morning", { killed: false });
  }

  const winCheck = checkWinCondition(game);
  if (winCheck) {
    game._timeout = setTimeout(() => endGame(io, game, winCheck), 4000);
    return;
  }

  game._timeout = setTimeout(() => {
    proceedToNextRound(io, game);
  }, 4000);
}

// ============================================================
// Handle Loyalty Test Answer
// ============================================================
export function handleFitnaAction(io, socket, data) {
  io_ref = io;
  const { roomCode, token, choiceIdx } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "activity") return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player || player.loyaltyChoice !== null) return;

  player.loyaltyChoice = choiceIdx;
  checkAllLoyaltyDone(game);
}

// ============================================================
// Handle Face-Off Answer
// ============================================================
export function handleFaceOffAnswer(io, socket, data) {
  io_ref = io;
  const { roomCode, token, pairIdx, choiceIdx } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "activity" || !game.faceOffData) return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player || player.faceOffChoice !== null) return;

  const pair = game.faceOffData.pairs[pairIdx];
  if (!pair) return;

  const slot = pair.tokens.indexOf(token);
  if (slot === -1) return;

  player.faceOffChoice = choiceIdx;
  pair.answers[slot] = choiceIdx;

  checkAllFaceOffDone(game);
}

// ============================================================
// Handle Secret Word Hint
// ============================================================
export function handleSecretWordHint(io, socket, data) {
  io_ref = io;
  const { roomCode, token, hint } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "activity" || !game.secretWordData) return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player || player.secretWordHint !== null) return;

  player.secretWordHint = hint;

  const roomId = `room:${game.roomCode}`;
  io.to(roomId).emit("fitna:secret-word-hint", {
    token: player.token,
    name: player.name,
    avatar: player.avatar,
    hint: player.secretWordHint,
  });
}

// ============================================================
// Win Condition
// ============================================================
function checkWinCondition(game) {
  const alive = game.players.filter((p) => p.alive);
  const aliveSaboteurs = alive.filter((p) => p.role === "saboteur");
  const aliveInnocents = alive.filter((p) => p.role !== "saboteur");

  if (aliveSaboteurs.length === 0) return "innocents";
  if (aliveSaboteurs.length >= aliveInnocents.length) return "saboteurs";
  return null;
}

// ============================================================
// Next Round
// ============================================================
function proceedToNextRound(io, game) {
  game.roundIdx++;

  if (game.roundIdx >= game.maxRounds) {
    const alive = game.players.filter((p) => p.alive);
    const aliveSaboteurs = alive.filter((p) => p.role === "saboteur");
    const winner = aliveSaboteurs.length === 0 ? "innocents" : "saboteurs";
    endGame(io, game, winner);
    return;
  }

  // Deal cards: random alive players get 1 card each
  const alivePlayers = game.players.filter((p) => p.alive && p.card === null);
  const numCards = Math.min(Math.floor(alivePlayers.length * 0.4) + 1, alivePlayers.length);
  const cardRecipients = pick(alivePlayers, numCards);

  cardRecipients.forEach((p) => {
    const newCard = dealSingleCard(p.role);
    p.card = newCard;
    if (p.socketId) {
      io.to(p.socketId).emit("fitna:card-dealt", { card: newCard });
    }
  });

  sendActivity(io, game.roomCode);
}

// ============================================================
// End Game
// ============================================================
function endGame(io, game, winner) {
  game.phase = "game-over";
  clearTimeout(game._timeout);

  const roomId = `room:${game.roomCode}`;

  // Calculate scores for ALL players
  const rankings = game.players.map((p) => {
    const playerWon = (winner === "innocents" && p.role !== "saboteur") ||
                      (winner === "saboteurs" && p.role === "saboteur");

    const scoreBreakdown = [];
    let totalScore = 0;

    if (playerWon) {
      scoreBreakdown.push({ label: "فوز", value: 150 });
      totalScore += 150;
    }

    if (p.alive) {
      scoreBreakdown.push({ label: "نجاة", value: 75 });
      totalScore += 75;
    }

    if (p.role === "saboteur") {
      scoreBreakdown.push({ label: "دور صعب (خائن)", value: 100 });
      totalScore += 100;
    }

    const correctVotes = p.correctVotes || 0;
    if (correctVotes > 0) {
      const voteScore = correctVotes * 30;
      scoreBreakdown.push({ label: `تصويت صحيح (${correctVotes}×)`, value: voteScore });
      totalScore += voteScore;
    }

    if (p.correctAnswers > 0) {
      const answerScore = p.correctAnswers * 15;
      scoreBreakdown.push({ label: `إجابات صحيحة (${p.correctAnswers}×)`, value: answerScore });
      totalScore += answerScore;
    }

    if (p.cardsUsed > 0) {
      const cardScore = p.cardsUsed * 20;
      scoreBreakdown.push({ label: `كروت مستخدمة (${p.cardsUsed}×)`, value: cardScore });
      totalScore += cardScore;
    }

    if (p.role === "detective") {
      const correctInvestigations = game.investigations.filter(
        (i) => i.investigatorToken === p.token && !i.framed
      ).length;
      if (correctInvestigations > 0) {
        const invScore = correctInvestigations * 40;
        scoreBreakdown.push({ label: `تحقيق صحيح (${correctInvestigations}×)`, value: invScore });
        totalScore += invScore;
      }
    }

    if (game.roundIdx >= 4) {
      scoreBreakdown.push({ label: "لعبة طويلة", value: 25 });
      totalScore += 25;
    }

    if (totalScore < 50) totalScore = 50;

    return {
      token: p.token, name: p.name, avatar: p.avatar,
      role: p.role, alive: p.alive, suspicion: p.suspicion,
      won: playerWon, totalScore, scoreBreakdown,
    };
  });

  // Sort: winners first, then by score
  rankings.sort((a, b) => {
    if (a.won !== b.won) return a.won ? -1 : 1;
    return b.totalScore - a.totalScore;
  });

  io.to(roomId).emit("fitna:game-over", {
    winner,
    rankings,
    roundsPlayed: game.roundIdx + 1,
  });

  // Add scores + XP for all players
  game.players.forEach((p) => {
    const ranking = rankings.find((r) => r.token === p.token);
    if (!ranking) return;

    const xpResult = addScore(p.token, ranking.totalScore, ranking.won);
    if (xpResult && p.socketId) {
      io.to(p.socketId).emit("session:xp-update", {
        xp: xpResult.xp, level: xpResult.level,
        xpGain: xpResult.xpGain, leveledUp: xpResult.leveledUp,
      });
    }
  });

  finishGame(game.roomCode);
  setTimeout(() => { activeGames.delete(game.roomCode); }, 5000);
}

// ============================================================
// Helpers
// ============================================================
export function getActiveGame(roomCode) {
  return activeGames.get(roomCode);
}
