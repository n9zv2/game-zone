import { shuffle, pick } from "../utils.js";
import {
  FAKE_NAMES, FAKE_AVATARS, REACTION_SCENARIOS, REACTION_EMOJIS,
  BINARY_CHOICES, SINGLE_WORD_TOPICS, COMPLETE_SENTENCES,
  RANKING_SETS, RATING_ITEMS, WHO_AMONG_THEM, ACTIVITY_TYPES,
  getActivityOrder, getAutoRounds,
} from "../data/mutakhafyData.js";
import { finishGame } from "../roomManager.js";
import { addScore } from "../sessionManager.js";

const activeGames = new Map();

// ============================================================
// Start Mutakhafy — "المتخفي" (The Disguised)
// ============================================================
export function startMutakhafy(io, room, settings = {}) {
  const connectedPlayers = room.players.filter((p) => p.connected);
  if (connectedPlayers.length < 4) {
    finishGame(room.code);
    return;
  }

  const playerCount = connectedPlayers.length;
  const totalRounds = settings.rounds
    ? Math.max(3, Math.min(7, settings.rounds))
    : getAutoRounds(playerCount);

  // Assign disguises — each player gets a unique fake name + avatar
  const fakeNames = pick(FAKE_NAMES, playerCount);
  const fakeAvatars = pick(FAKE_AVATARS, playerCount);

  const players = connectedPlayers.map((p, i) => ({
    token: p.token,
    name: p.name,
    avatar: p.avatar,
    socketId: p.socketId,
    score: 0,
    // Disguise
    fakeId: `fake_${i}`,
    fakeName: fakeNames[i],
    fakeAvatar: fakeAvatars[i],
    // Tracking
    roundsUndetected: 0,
    wasEverGuessed: false,
  }));

  const activityOrder = getActivityOrder(totalRounds);

  const usedContent = { reaction: [], binary: [], word: [], sentence: [], rank: [], rate: [], who: [] };

  const game = {
    roomCode: room.code,
    room,               // keep reference for socketId refresh
    phase: "countdown",
    players,
    totalRounds,
    currentRound: 0,
    activityOrder,
    usedContent,
    // Round state
    currentActivity: null,
    responses: new Map(),
    roundGuesses: new Map(),
    allGuesses: new Map(),   // token -> Map<fakeId, guessedRealToken>
    _timeout: null,
    _countInterval: null,    // FIX BUG 2: store countdown interval
  };

  // Initialize cumulative guesses
  players.forEach((p) => {
    game.allGuesses.set(p.token, new Map());
  });

  activeGames.set(room.code, game);
  const roomId = `room:${room.code}`;

  io.to(roomId).emit("mutakhafy:start", {
    players: players.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
    totalRounds,
  });

  // Countdown 3-2-1 (FIX BUG 2: store interval on game object)
  let count = 3;
  game._countInterval = setInterval(() => {
    io.to(roomId).emit("mutakhafy:countdown", { count });
    count--;
    if (count < 0) {
      clearInterval(game._countInterval);
      game._countInterval = null;
      revealDisguises(io, game);
    }
  }, 1000);
}

// ============================================================
// Refresh socketIds from room (FIX BUG 8: reconnected players)
// ============================================================
function refreshSocketIds(game) {
  if (!game.room) return;
  game.players.forEach((gp) => {
    const rp = game.room.players.find((p) => p.token === gp.token);
    if (rp && rp.socketId) {
      gp.socketId = rp.socketId;
    }
  });
}

// ============================================================
// Cleanup helper (FIX BUG 5: game abandonment cleanup)
// ============================================================
function cleanupGame(game) {
  clearTimeout(game._timeout);
  game._timeout = null;
  if (game._countInterval) {
    clearInterval(game._countInterval);
    game._countInterval = null;
  }
}

// ============================================================
// Reveal disguises
// ============================================================
function revealDisguises(io, game) {
  if (!activeGames.has(game.roomCode)) return;
  game.phase = "disguise-reveal";

  const allDisguises = game.players.map((p) => ({
    fakeId: p.fakeId,
    fakeName: p.fakeName,
    fakeAvatar: p.fakeAvatar,
  }));

  const realPlayers = game.players.map((p) => ({
    token: p.token,
    name: p.name,
    avatar: p.avatar,
  }));

  refreshSocketIds(game);

  game.players.forEach((player) => {
    if (!player.socketId) return;
    io.to(player.socketId).emit("mutakhafy:disguise-reveal", {
      yourDisguise: {
        fakeId: player.fakeId,
        fakeName: player.fakeName,
        fakeAvatar: player.fakeAvatar,
      },
      allDisguises: shuffle([...allDisguises]),
      realPlayers,
    });
  });

  game._timeout = setTimeout(() => {
    startRound(io, game);
  }, 8000);
}

// ============================================================
// Start a round
// ============================================================
function startRound(io, game) {
  if (!activeGames.has(game.roomCode)) return;
  game.currentRound++;
  game.phase = "round-intro";
  game.responses = new Map();
  game.roundGuesses = new Map();

  const activityType = game.activityOrder[game.currentRound - 1];
  const activityDef = ACTIVITY_TYPES[activityType];

  const roomId = `room:${game.roomCode}`;

  io.to(roomId).emit("mutakhafy:round-intro", {
    roundIdx: game.currentRound,
    totalRounds: game.totalRounds,
    activityType,
    activityName: activityDef.name,
    activityIcon: activityDef.icon,
  });

  game._timeout = setTimeout(() => {
    startActivity(io, game, activityType);
  }, 3000);
}

// ============================================================
// Start an activity
// ============================================================
function startActivity(io, game, type) {
  if (!activeGames.has(game.roomCode)) return;
  game.phase = "activity";
  game.responses = new Map();

  const activityDef = ACTIVITY_TYPES[type];
  const timer = activityDef.timer;
  const timerEnd = Date.now() + timer * 1000;

  let data = {};
  switch (type) {
    case "reaction": {
      const available = REACTION_SCENARIOS.filter((s) => !game.usedContent.reaction.includes(s));
      const scenario = available.length > 0 ? pick(available, 1)[0] : pick(REACTION_SCENARIOS, 1)[0];
      game.usedContent.reaction.push(scenario);
      data = { scenario, emojis: REACTION_EMOJIS };
      break;
    }
    case "binary": {
      const available = BINARY_CHOICES.filter((c) => !game.usedContent.binary.includes(c));
      const choice = available.length > 0 ? pick(available, 1)[0] : pick(BINARY_CHOICES, 1)[0];
      game.usedContent.binary.push(choice);
      data = { optionA: choice.a, optionB: choice.b };
      break;
    }
    case "word": {
      const available = SINGLE_WORD_TOPICS.filter((t) => !game.usedContent.word.includes(t));
      const topic = available.length > 0 ? pick(available, 1)[0] : pick(SINGLE_WORD_TOPICS, 1)[0];
      game.usedContent.word.push(topic);
      data = { topic };
      break;
    }
    case "sentence": {
      const available = COMPLETE_SENTENCES.filter((s) => !game.usedContent.sentence.includes(s));
      const sentence = available.length > 0 ? pick(available, 1)[0] : pick(COMPLETE_SENTENCES, 1)[0];
      game.usedContent.sentence.push(sentence);
      data = { sentence };
      break;
    }
    case "rank": {
      const available = RANKING_SETS.filter((r) => !game.usedContent.rank.includes(r));
      const rankSet = available.length > 0 ? pick(available, 1)[0] : pick(RANKING_SETS, 1)[0];
      game.usedContent.rank.push(rankSet);
      data = { prompt: rankSet.prompt, items: [...rankSet.items] };
      break;
    }
    case "rate": {
      const available = RATING_ITEMS.filter((r) => !game.usedContent.rate.includes(r));
      const item = available.length > 0 ? pick(available, 1)[0] : pick(RATING_ITEMS, 1)[0];
      game.usedContent.rate.push(item);
      data = { item };
      break;
    }
    case "who": {
      const available = WHO_AMONG_THEM.filter((q) => !game.usedContent.who.includes(q));
      const question = available.length > 0 ? pick(available, 1)[0] : pick(WHO_AMONG_THEM, 1)[0];
      game.usedContent.who.push(question);
      data = {
        question,
        realPlayers: game.players.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
      };
      break;
    }
  }

  game.currentActivity = { type, data, timerEnd };

  const roomId = `room:${game.roomCode}`;
  io.to(roomId).emit("mutakhafy:activity", { type, data, timerEnd });

  game._timeout = setTimeout(() => {
    showResults(io, game);
  }, timer * 1000 + 1000);
}

// ============================================================
// Handle activity submission
// ============================================================
export function handleMutakhafySubmit(io, socket, data) {
  const { roomCode, token, response } = data;
  if (typeof roomCode !== "string" || typeof token !== "string") return;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "activity") return;

  const player = game.players.find((p) => p.token === token);
  if (!player) return;
  if (game.responses.has(token)) return;

  let sanitized = response;
  const type = game.currentActivity.type;

  if (type === "word") {
    sanitized = (response || "").trim().replace(/\s+/g, "").slice(0, 15);
    if (!sanitized) return; // FIX BUG 9: reject empty
  } else if (type === "sentence") {
    sanitized = (response || "").trim().slice(0, 30);
    if (!sanitized) return; // FIX BUG 9: reject empty
  } else if (type === "rank") {
    if (!Array.isArray(response) || response.length !== 4) return;
    // FIX BUG 11: validate items match original set
    const validItems = new Set(game.currentActivity.data.items);
    const allValid = response.every((item) => typeof item === "string" && validItems.has(item));
    if (!allValid) return;
    sanitized = response;
  } else if (type === "rate") {
    const rating = parseInt(response);
    if (isNaN(rating) || rating < 1 || rating > 5) return;
    sanitized = rating;
  } else if (type === "reaction") {
    if (!REACTION_EMOJIS.includes(response)) return;
    sanitized = response;
  } else if (type === "binary") {
    if (response !== "A" && response !== "B") return;
    sanitized = response;
  } else if (type === "who") {
    if (!game.players.find((p) => p.token === response)) return;
    sanitized = response;
  }

  game.responses.set(token, sanitized);

  if (game.responses.size >= game.players.length) {
    clearTimeout(game._timeout);
    game._timeout = setTimeout(() => {
      showResults(io, game);
    }, 500);
  }
}

// ============================================================
// Show results
// ============================================================
function showResults(io, game) {
  if (game.phase === "results") return;
  game.phase = "results";
  clearTimeout(game._timeout);

  const type = game.currentActivity.type;
  const roomId = `room:${game.roomCode}`;

  const responses = game.players.map((player) => {
    const response = game.responses.get(player.token);
    const entry = {
      fakeId: player.fakeId,
      fakeName: player.fakeName,
      fakeAvatar: player.fakeAvatar,
      response: response !== undefined ? response : null,
    };

    if (type === "who" && response) {
      const votedPlayer = game.players.find((p) => p.token === response);
      entry.votedForName = votedPlayer ? votedPlayer.name : null;
      entry.votedForAvatar = votedPlayer ? votedPlayer.avatar : null;
      delete entry.response;
    }

    return entry;
  });

  const shuffledResponses = shuffle(responses);

  // FIX BUG 13: strip tokens from activityData in broadcast
  let safeActivityData = { ...game.currentActivity.data };
  if (type === "who" && safeActivityData.realPlayers) {
    safeActivityData.realPlayers = safeActivityData.realPlayers.map((p) => ({
      name: p.name, avatar: p.avatar,
    }));
  }

  io.to(roomId).emit("mutakhafy:results", {
    responses: shuffledResponses,
    activityType: type,
    activityData: safeActivityData,
  });

  game._timeout = setTimeout(() => {
    startGuessPhase(io, game);
  }, 8000);
}

// ============================================================
// Guess phase
// ============================================================
function startGuessPhase(io, game) {
  if (!activeGames.has(game.roomCode)) return;
  game.phase = "guess";
  game.roundGuesses = new Map();

  const guessTime = 30000;
  const timerEnd = Date.now() + guessTime;

  const allDisguises = game.players.map((p) => ({
    fakeId: p.fakeId,
    fakeName: p.fakeName,
    fakeAvatar: p.fakeAvatar,
  }));

  const realPlayers = game.players.map((p) => ({
    token: p.token,
    name: p.name,
    avatar: p.avatar,
  }));

  refreshSocketIds(game);

  game.players.forEach((player) => {
    if (!player.socketId) return;

    const myPrevGuesses = [];
    const myGuessMap = game.allGuesses.get(player.token);
    if (myGuessMap) {
      for (const [fakeId, guessedRealToken] of myGuessMap) {
        myPrevGuesses.push({ fakeId, guessedRealToken });
      }
    }

    io.to(player.socketId).emit("mutakhafy:guess-phase", {
      timerEnd,
      disguises: allDisguises,
      realPlayers,
      myPreviousGuesses: myPrevGuesses,
      myFakeId: player.fakeId,
    });
  });

  game._timeout = setTimeout(() => {
    endGuessPhase(io, game);
  }, guessTime + 1000);
}

// ============================================================
// Handle a guess (FIX BUG 3 + 23: only accept during "guess" phase, validate inputs)
// ============================================================
export function handleMutakhafyGuess(io, socket, data) {
  const { roomCode, token, fakeId, guessedRealToken } = data;
  if (typeof roomCode !== "string" || typeof token !== "string") return;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "guess") return;

  const player = game.players.find((p) => p.token === token);
  if (!player) return;

  // Validate fakeId and guessedRealToken exist
  if (!game.players.find((p) => p.fakeId === fakeId)) return;
  if (!game.players.find((p) => p.token === guessedRealToken)) return;

  if (fakeId === player.fakeId) return;
  if (guessedRealToken === token) return;

  // One guess per round
  if (game.roundGuesses.has(token)) return;
  game.roundGuesses.set(token, { fakeId, guessedRealToken });

  const myGuessMap = game.allGuesses.get(token);
  myGuessMap.set(fakeId, guessedRealToken);
}

// ============================================================
// End guess phase
// ============================================================
function endGuessPhase(io, game) {
  if (game.phase !== "guess") return;
  game.phase = "guess-count";
  clearTimeout(game._timeout);

  const guessCount = game.roundGuesses.size;
  const roomId = `room:${game.roomCode}`;

  io.to(roomId).emit("mutakhafy:guess-count", { count: guessCount });

  // Track stealth
  game.players.forEach((player) => {
    let guessedThisRound = false;
    for (const [, guess] of game.roundGuesses) {
      if (guess.fakeId === player.fakeId && guess.guessedRealToken === player.token) {
        guessedThisRound = true;
        break;
      }
    }
    if (!guessedThisRound) {
      player.roundsUndetected++;
    }
  });

  game._timeout = setTimeout(() => {
    if (game.currentRound < game.totalRounds) {
      startRound(io, game);
    } else {
      startFinalGuess(io, game);
    }
  }, 3000);
}

// ============================================================
// Final guess phase (45 seconds)
// ============================================================
function startFinalGuess(io, game) {
  if (!activeGames.has(game.roomCode)) return;
  game.phase = "final-guess";

  const guessTime = 45000;
  const timerEnd = Date.now() + guessTime;

  const allDisguises = game.players.map((p) => ({
    fakeId: p.fakeId,
    fakeName: p.fakeName,
    fakeAvatar: p.fakeAvatar,
  }));

  const realPlayers = game.players.map((p) => ({
    token: p.token,
    name: p.name,
    avatar: p.avatar,
  }));

  refreshSocketIds(game);

  game.players.forEach((player) => {
    if (!player.socketId) return;

    const allMyGuesses = [];
    const myGuessMap = game.allGuesses.get(player.token);
    if (myGuessMap) {
      for (const [fakeId, guessedRealToken] of myGuessMap) {
        allMyGuesses.push({ fakeId, guessedRealToken });
      }
    }

    io.to(player.socketId).emit("mutakhafy:final-guess", {
      timerEnd,
      disguises: allDisguises,
      realPlayers,
      allMyGuesses,
      myFakeId: player.fakeId,
    });
  });

  game._timeout = setTimeout(() => {
    startReveal(io, game);
  }, guessTime + 1000);
}

// ============================================================
// Handle final guesses (batch)
// ============================================================
export function handleMutakhafyFinalGuesses(io, socket, data) {
  const { roomCode, token, guesses } = data;
  if (typeof roomCode !== "string" || typeof token !== "string") return;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "final-guess") return;

  const player = game.players.find((p) => p.token === token);
  if (!player) return;
  if (!Array.isArray(guesses)) return;

  const myGuessMap = game.allGuesses.get(token);

  guesses.forEach(({ fakeId, guessedRealToken }) => {
    if (typeof fakeId !== "string" || typeof guessedRealToken !== "string") return;
    if (fakeId === player.fakeId) return;
    if (guessedRealToken === token) return;
    if (!game.players.find((p) => p.fakeId === fakeId)) return;
    if (!game.players.find((p) => p.token === guessedRealToken)) return;
    myGuessMap.set(fakeId, guessedRealToken);
  });
}

// ============================================================
// The Grand Reveal
// ============================================================
function startReveal(io, game) {
  if (!activeGames.has(game.roomCode)) return;
  game.phase = "reveal";
  clearTimeout(game._timeout);

  const roomId = `room:${game.roomCode}`;

  calculateScores(game);

  const reveals = game.players.map((player) => {
    const guessedBy = [];
    game.players.forEach((guesser) => {
      if (guesser.token === player.token) return;
      const guessMap = game.allGuesses.get(guesser.token);
      if (guessMap && guessMap.get(player.fakeId) === player.token) {
        guessedBy.push({ token: guesser.token, name: guesser.name, avatar: guesser.avatar });
      }
    });

    return {
      fakeId: player.fakeId,
      fakeName: player.fakeName,
      fakeAvatar: player.fakeAvatar,
      realName: player.name,
      realAvatar: player.avatar,
      realToken: player.token,
      guessedBy,
    };
  });

  const shuffledReveals = shuffle(reveals);

  io.to(roomId).emit("mutakhafy:reveal", { reveals: shuffledReveals });

  const revealDuration = (shuffledReveals.length * 3 + 2) * 1000;
  game._timeout = setTimeout(() => {
    endGame(io, game);
  }, revealDuration);
}

// ============================================================
// Calculate scores (FIX BUG 19: single clean pass)
// ============================================================
function calculateScores(game) {
  // First: mark wasEverGuessed for each player
  game.players.forEach((player) => {
    let guessedCorrectly = false;
    game.players.forEach((guesser) => {
      if (guesser.token === player.token) return;
      const guessMap = game.allGuesses.get(guesser.token);
      if (guessMap && guessMap.get(player.fakeId) === player.token) {
        guessedCorrectly = true;
      }
    });
    player.wasEverGuessed = guessedCorrectly;
  });

  // Second: calculate each player's score
  game.players.forEach((player) => {
    let score = 0;

    // === ATTACK: correct guesses (35 pts each, only first match per target) ===
    const guessMap = game.allGuesses.get(player.token);
    const counted = new Set();

    if (guessMap) {
      for (const [fakeId, guessedRealToken] of guessMap) {
        const actualPlayer = game.players.find((p) => p.fakeId === fakeId);
        if (!actualPlayer || counted.has(actualPlayer.token)) continue;
        if (guessedRealToken === actualPlayer.token) {
          counted.add(actualPlayer.token);
          score += 35;
        }
      }
    }

    // === DEFENSE: stealth (20 pts per undetected round) ===
    score += player.roundsUndetected * 20;

    // === STEALTH BONUS ===
    if (!player.wasEverGuessed) {
      // "شبح كامل" — nobody guessed you at all
      score += 100;
    } else {
      // Count how many people correctly guessed this player
      let correctGuessersCount = 0;
      game.players.forEach((guesser) => {
        if (guesser.token === player.token) return;
        const gMap = game.allGuesses.get(guesser.token);
        if (gMap && gMap.get(player.fakeId) === player.token) {
          correctGuessersCount++;
        }
      });
      if (correctGuessersCount === 1) {
        score += 30; // only one person found you
      }
    }

    player.score = score;
  });
}

// ============================================================
// End game
// ============================================================
function endGame(io, game) {
  game.phase = "game-over";
  cleanupGame(game);

  const roomId = `room:${game.roomCode}`;

  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  const rankings = sorted.map((p, i) => ({
    token: p.token,
    name: p.name,
    avatar: p.avatar,
    rank: i + 1,
    score: p.score,
    alive: true,
    fakeName: p.fakeName,
    fakeAvatar: p.fakeAvatar,
    wasEverGuessed: p.wasEverGuessed,
    roundsUndetected: p.roundsUndetected,
  }));

  io.to(roomId).emit("mutakhafy:game-over", { rankings });

  // Add XP
  refreshSocketIds(game);
  game.players.forEach((p) => {
    const ranking = rankings.find((r) => r.token === p.token);
    if (!ranking) return;
    const won = ranking.rank === 1;
    const xpResult = addScore(p.token, ranking.score, won);
    if (xpResult && p.socketId) {
      io.to(p.socketId).emit("session:xp-update", {
        xp: xpResult.xp,
        level: xpResult.level,
        xpGain: xpResult.xpGain,
        leveledUp: xpResult.leveledUp,
      });
    }
  });

  finishGame(game.roomCode);
  setTimeout(() => { activeGames.delete(game.roomCode); }, 5000);
}
