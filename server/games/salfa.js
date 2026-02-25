import { shuffle, pick } from "../utils.js";
import { SALFA_WORDS, getSpyCount } from "../data/salfaData.js";
import { finishGame } from "../roomManager.js";
import { addScore } from "../sessionManager.js";

const activeGames = new Map();
const MAX_ROUND_PHASE_MS = 300000; // 5 minutes safety — no phase should last longer

// ============================================================
// Start Salfa — "مين برا السالفة" (Spyfall)
// ============================================================
export function startSalfa(io, room, settings = {}) {
  const connectedPlayers = room.players.filter((p) => p.connected);
  if (connectedPlayers.length < 3) {
    // Not enough players — return room to lobby
    finishGame(room.code);
    return;
  }

  const playerCount = connectedPlayers.length;
  const totalRounds = Math.max(1, Math.min(7, settings.rounds || 3));
  // Host can set spy count (1-3), or 0/null for auto
  const spyCount = settings.spyCount > 0
    ? Math.min(settings.spyCount, Math.max(1, playerCount - 2))
    : getSpyCount(playerCount);

  const players = connectedPlayers.map((p) => ({
    token: p.token,
    name: p.name,
    avatar: p.avatar,
    socketId: p.socketId,
    score: 0,
    spyRounds: 0, // track how many times they were spy (for fair rotation)
  }));

  const game = {
    roomCode: room.code,
    phase: "countdown",
    players,
    totalRounds,
    currentRound: 0,
    spyCount,
    // Round state (reset each round)
    word: null,
    category: null,
    spyTokens: [],
    hints: [],          // { token, name, avatar, hint }
    hintRound: 0,       // current hint round (0-indexed)
    maxHintRounds: 5,
    hintsSubmitted: new Set(),
    voteRequests: new Set(),
    votes: new Map(),   // token -> targetToken
    roundTimerStart: 0,
    maxRoundTime: 180000, // 3 minutes
    usedWords: new Set(),
    _timeout: null,
    _hintTimeout: null,
  };

  activeGames.set(room.code, game);
  const roomId = `room:${room.code}`;

  io.to(roomId).emit("salfa:start", {
    players: players.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
    totalRounds,
  });

  // Countdown
  let count = 3;
  const countInterval = setInterval(() => {
    try {
      io.to(roomId).emit("salfa:countdown", { count });
      count--;
      if (count < 0) {
        clearInterval(countInterval);
        startRound(io, game);
      }
    } catch (err) {
      console.error("[salfa] countdown error:", err);
      clearInterval(countInterval);
    }
  }, 1000);
}

// ============================================================
// Start a new round
// ============================================================
function startRound(io, game) {
  game.currentRound++;
  game.phase = "role-reveal";

  // Pick a word that hasn't been used
  const available = SALFA_WORDS.filter((w) => !game.usedWords.has(w.word));
  const wordData = available.length > 0 ? pick(available, 1)[0] : pick(SALFA_WORDS, 1)[0];
  game.word = wordData.word;
  game.category = wordData.category;
  game.usedWords.add(wordData.word);

  // Reset round state
  game.hints = [];
  game.hintRound = 0;
  game.hintsSubmitted = new Set();
  game.voteRequests = new Set();
  game.votes = new Map();

  // Choose spy(s) — favor players who haven't been spy yet
  const sortedBySpyCount = [...game.players].sort((a, b) => a.spyRounds - b.spyRounds);
  const minSpyCount = sortedBySpyCount[0].spyRounds;
  const eligibleForSpy = sortedBySpyCount.filter((p) => p.spyRounds === minSpyCount);
  const spies = pick(eligibleForSpy, Math.min(game.spyCount, eligibleForSpy.length));

  // If we need more spies than eligible at minimum, pick from next tier
  if (spies.length < game.spyCount) {
    const remaining = sortedBySpyCount.filter((p) => !spies.find((s) => s.token === p.token));
    const extra = pick(remaining, game.spyCount - spies.length);
    spies.push(...extra);
  }

  game.spyTokens = spies.map((s) => s.token);
  spies.forEach((s) => { s.spyRounds++; });

  // Shuffle player order for hints
  const shuffledOrder = shuffle([...game.players]);
  game.hintOrder = shuffledOrder.map((p) => p.token);

  // Send role reveal to each player
  game.players.forEach((player) => {
    if (!player.socketId) return;
    const isSpy = game.spyTokens.includes(player.token);
    io.to(player.socketId).emit("salfa:role-reveal", {
      role: isSpy ? "spy" : "innocent",
      word: isSpy ? null : game.word,
      category: isSpy ? null : game.category,
      roundIdx: game.currentRound,
      totalRounds: game.totalRounds,
      spyCount: game.spyCount,
    });
  });

  // After 10 seconds, start hint phase (longer so players can read the word)
  game._timeout = setTimeout(() => {
    try {
      startHintRound(io, game);
    } catch (err) {
      console.error("[salfa] startHintRound error:", err);
      safeEndGame(io, game);
    }
  }, 10000);

  // Safety timeout — if the round somehow gets stuck, force end
  clearTimeout(game._safetyTimeout);
  game._safetyTimeout = setTimeout(() => {
    if (game.phase !== "game-over" && game.phase !== "round-result") {
      console.warn(`[salfa] Safety timeout triggered for ${game.roomCode} in phase ${game.phase}`);
      safeEndGame(io, game);
    }
  }, MAX_ROUND_PHASE_MS);
}

// ============================================================
// Start a hint round
// ============================================================
function startHintRound(io, game) {
  game.phase = "hints";
  game.hintRound++;
  game.hintsSubmitted = new Set();
  game.roundTimerStart = Date.now();

  const roomId = `room:${game.roomCode}`;
  const timerEnd = game.roundTimerStart + game.maxRoundTime;

  io.to(roomId).emit("salfa:hint-round", {
    roundNumber: game.hintRound,
    hintOrder: game.hintOrder.map((token) => {
      const p = game.players.find((pl) => pl.token === token);
      return { token: p.token, name: p.name, avatar: p.avatar };
    }),
    players: game.players.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
    timerEnd,
    voteRequestCount: game.voteRequests.size,
    totalPlayers: game.players.length,
  });

  // Auto-end after max round time (3 minutes) — force voting
  clearTimeout(game._hintTimeout);
  game._hintTimeout = setTimeout(() => {
    try {
      if (game.phase === "hints") {
        startVoting(io, game);
      }
    } catch (err) {
      console.error("[salfa] hint timeout error:", err);
      safeEndGame(io, game);
    }
  }, game.maxRoundTime);
}

// ============================================================
// Handle a hint submission
// ============================================================
export function handleHint(io, socket, data) {
  const { roomCode, token, hint } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "hints") return;

  const player = game.players.find((p) => p.token === token);
  if (!player) return;

  // Allow multiple hints per player with 15-second cooldown
  const lastHintTime = game._lastHintTime?.get(token) || 0;
  const cooldown = game.hintsSubmitted.has(token) ? 15000 : 0; // first hint = no cooldown
  if (Date.now() - lastHintTime < cooldown) return;

  const cleanHint = (hint || "").trim().slice(0, 30);
  if (!cleanHint) return;

  if (!game._lastHintTime) game._lastHintTime = new Map();
  game._lastHintTime.set(token, Date.now());
  game.hintsSubmitted.add(token);

  const hintEntry = {
    token: player.token,
    name: player.name,
    avatar: player.avatar,
    hint: cleanHint,
    round: game.hintRound,
  };
  game.hints.push(hintEntry);

  const roomId = `room:${roomCode}`;
  io.to(roomId).emit("salfa:hint-submitted", hintEntry);
  socket.emit("salfa:hint-ack");

  // Notify when all players have submitted at least one hint this round
  if (game.hintsSubmitted.size >= game.players.length) {
    io.to(roomId).emit("salfa:all-hints", {
      hints: game.hints.filter((h) => h.round === game.hintRound),
      voteRequestCount: game.voteRequests.size,
      totalPlayers: game.players.length,
    });
    // Don't auto-advance — players can submit more hints. Let timer or vote requests end the round.
  }
}

// ============================================================
// Handle vote request ("بدأ التصويت")
// ============================================================
export function handleVoteRequest(io, socket, data) {
  const { roomCode, token } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "hints") return;

  const player = game.players.find((p) => p.token === token);
  if (!player) return;

  game.voteRequests.add(token);
  const needed = Math.floor(game.players.length / 2) + 1; // >50%
  const roomId = `room:${roomCode}`;

  io.to(roomId).emit("salfa:vote-requested", {
    count: game.voteRequests.size,
    needed,
    requesterName: player.name,
  });

  if (game.voteRequests.size >= needed) {
    clearTimeout(game._timeout);
    clearTimeout(game._hintTimeout);
    game._timeout = setTimeout(() => {
      try {
        startVoting(io, game);
      } catch (err) {
        console.error("[salfa] startVoting error:", err);
        safeEndGame(io, game);
      }
    }, 1000);
  }
}

// ============================================================
// Start voting phase (30 seconds)
// ============================================================
function startVoting(io, game) {
  if (game.phase === "voting") return; // prevent double trigger
  game.phase = "voting";
  game.votes = new Map();
  clearTimeout(game._timeout);
  clearTimeout(game._hintTimeout);

  const voteTime = 30000;
  game.timerEnd = Date.now() + voteTime;
  const roomId = `room:${game.roomCode}`;

  io.to(roomId).emit("salfa:voting", {
    players: game.players.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
    timerEnd: game.timerEnd,
  });

  game._timeout = setTimeout(() => {
    try {
      resolveVote(io, game);
    } catch (err) {
      console.error("[salfa] resolveVote timeout error:", err);
      safeEndGame(io, game);
    }
  }, voteTime + 1000);
}

// ============================================================
// Handle a vote
// ============================================================
export function handleVote(io, socket, data) {
  const { roomCode, token, targetToken } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "voting") return;

  const player = game.players.find((p) => p.token === token);
  if (!player) return;
  if (game.votes.has(token)) return;

  // "__skip__" = player chose not to vote
  game.votes.set(token, targetToken === "__skip__" ? null : targetToken);

  // Check if all voted
  if (game.votes.size >= game.players.length) {
    clearTimeout(game._timeout);
    game._timeout = setTimeout(() => {
      try {
        resolveVote(io, game);
      } catch (err) {
        console.error("[salfa] resolveVote error:", err);
        safeEndGame(io, game);
      }
    }, 500);
  }
}

// ============================================================
// Resolve votes
// ============================================================
function resolveVote(io, game) {
  if (game.phase !== "voting") return;
  game.phase = "vote-result";
  clearTimeout(game._timeout);

  // Tally votes
  const voteCounts = {};
  game.players.forEach((p) => { voteCounts[p.token] = 0; });
  for (const [, targetToken] of game.votes) {
    if (voteCounts[targetToken] !== undefined) {
      voteCounts[targetToken]++;
    }
  }

  // Find player(s) with most votes
  let maxVotes = 0;
  const candidates = [];
  for (const [token, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidates.length = 0;
      candidates.push(token);
    } else if (count === maxVotes && count > 0) {
      candidates.push(token);
    }
  }

  // Check tie — but if ALL tied candidates are spies, innocents win
  const rawTied = candidates.length !== 1;
  const allCandidatesAreSpies = rawTied && candidates.length > 0 && candidates.every((t) => game.spyTokens.includes(t));
  // If all tied candidates are spies, pick the first one as accused (innocents caught them)
  const tied = rawTied && !allCandidatesAreSpies;
  const accusedToken = tied ? null : (allCandidatesAreSpies ? candidates[0] : candidates[0]);
  const accusedPlayer = accusedToken ? game.players.find((p) => p.token === accusedToken) : null;
  const isSpy = accusedToken ? game.spyTokens.includes(accusedToken) : false;

  const voteDetails = game.players.map((p) => ({
    token: p.token,
    name: p.name,
    avatar: p.avatar,
    votedFor: game.votes.get(p.token) || null,
    votesReceived: voteCounts[p.token] || 0,
  }));

  const roomId = `room:${game.roomCode}`;
  io.to(roomId).emit("salfa:vote-result", {
    accusedToken,
    accusedName: accusedPlayer?.name || null,
    accusedAvatar: accusedPlayer?.avatar || null,
    isSpy: tied ? false : isSpy,
    tied,
    allSpiesCaught: allCandidatesAreSpies,
    votes: voteDetails,
  });

  if (tied) {
    // Tie (mixed spies/innocents or no votes) — spy wins
    game._timeout = setTimeout(() => {
      try { endRound(io, game, "spy"); } catch (err) { console.error("[salfa] endRound error:", err); safeEndGame(io, game); }
    }, 4000);
  } else if (isSpy) {
    // Correct! Spy caught — give spy a chance to guess
    game._timeout = setTimeout(() => {
      try { startSpyGuess(io, game, accusedToken); } catch (err) { console.error("[salfa] startSpyGuess error:", err); safeEndGame(io, game); }
    }, 4000);
  } else {
    // Wrong person accused — spy wins
    game._timeout = setTimeout(() => {
      try { endRound(io, game, "spy"); } catch (err) { console.error("[salfa] endRound error:", err); safeEndGame(io, game); }
    }, 4000);
  }
}

// ============================================================
// Spy guess phase (15 seconds)
// ============================================================
function startSpyGuess(io, game, caughtSpyToken) {
  game.phase = "spy-guess";
  game.caughtSpyToken = caughtSpyToken;
  game.spyGuess = null;

  const guessTime = 15000;
  game.timerEnd = Date.now() + guessTime;
  const roomId = `room:${game.roomCode}`;

  // Build 6 options: correct word + 5 random from same category
  const sameCategory = SALFA_WORDS.filter(
    (w) => w.category === game.category && w.word !== game.word
  );
  const decoys = pick(sameCategory, Math.min(5, sameCategory.length));
  const options = shuffle([game.word, ...decoys.map((d) => d.word)]);

  // Tell everyone we're in spy guess phase
  game.players.forEach((player) => {
    if (!player.socketId) return;
    const isCaughtSpy = player.token === caughtSpyToken;
    io.to(player.socketId).emit("salfa:spy-guess", {
      spyToken: caughtSpyToken,
      spyName: game.players.find((p) => p.token === caughtSpyToken)?.name,
      timerEnd: game.timerEnd,
      isSpy: isCaughtSpy,
      category: game.category,
      options: isCaughtSpy ? options : [],
    });
  });

  game._timeout = setTimeout(() => {
    try {
      if (game.phase === "spy-guess") {
        resolveSpyGuess(io, game, null);
      }
    } catch (err) {
      console.error("[salfa] spy guess timeout error:", err);
      safeEndGame(io, game);
    }
  }, guessTime + 1000);
}

// ============================================================
// Handle spy's guess
// ============================================================
export function handleSpyGuess(io, socket, data) {
  const { roomCode, token, guess } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "spy-guess") return;
  if (token !== game.caughtSpyToken) return;
  if (game.spyGuess !== null) return;

  game.spyGuess = (guess || "").trim();
  clearTimeout(game._timeout);
  resolveSpyGuess(io, game, game.spyGuess);
}

// ============================================================
// Resolve spy guess
// ============================================================
function resolveSpyGuess(io, game, guess) {
  game.phase = "spy-guess-result";
  clearTimeout(game._timeout);

  // Normalize comparison (trim whitespace, case insensitive)
  const normalizedGuess = (guess || "").trim();
  const normalizedWord = game.word.trim();
  const correct = normalizedGuess === normalizedWord;

  const roomId = `room:${game.roomCode}`;
  io.to(roomId).emit("salfa:spy-guess-result", {
    guess: normalizedGuess || "(ما خمن)",
    correct,
    word: game.word,
  });

  if (correct) {
    // Spy guessed correctly — spy wins!
    game._timeout = setTimeout(() => {
      try { endRound(io, game, "spy-guessed"); } catch (err) { console.error("[salfa] endRound error:", err); safeEndGame(io, game); }
    }, 4000);
  } else {
    // Spy guessed wrong — innocents win
    game._timeout = setTimeout(() => {
      try { endRound(io, game, "innocents"); } catch (err) { console.error("[salfa] endRound error:", err); safeEndGame(io, game); }
    }, 4000);
  }
}

// ============================================================
// End round — calculate scores
// ============================================================
function endRound(io, game, outcome) {
  // outcome: "spy" | "spy-guessed" | "innocents"
  game.phase = "round-result";
  clearTimeout(game._timeout);

  const spyTokens = game.spyTokens;
  const roundScores = [];

  game.players.forEach((p) => {
    const isSpy = spyTokens.includes(p.token);
    let points = 0;

    if (outcome === "spy") {
      // Spy wasn't caught (tie or wrong person accused)
      if (isSpy) {
        points = 200; // spy escaped
      } else {
        points = 0;   // innocents failed
      }
    } else if (outcome === "spy-guessed") {
      // Spy was caught but guessed the word correctly
      if (isSpy) {
        points = 150; // spy caught but saved by guess
      } else {
        points = 50;  // innocents caught spy but spy saved
        // Bonus for voting correctly
        const votedFor = game.votes.get(p.token);
        if (votedFor && spyTokens.includes(votedFor)) {
          points += 30;
        }
      }
    } else if (outcome === "innocents") {
      // Spy caught and failed to guess
      if (isSpy) {
        points = 25;  // participation points
      } else {
        points = 150; // innocents won
        // Bonus for voting correctly
        const votedFor = game.votes.get(p.token);
        if (votedFor && spyTokens.includes(votedFor)) {
          points += 30;
        }
      }
    }

    p.score += points;
    roundScores.push({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      points,
      totalScore: p.score,
      isSpy,
    });
  });

  const roomId = `room:${game.roomCode}`;
  const spyPlayers = game.players.filter((p) => spyTokens.includes(p.token));

  io.to(roomId).emit("salfa:round-result", {
    outcome,
    word: game.word,
    category: game.category,
    spies: spyPlayers.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
    scores: roundScores,
    roundIdx: game.currentRound,
    totalRounds: game.totalRounds,
  });

  // Check if more rounds
  if (game.currentRound < game.totalRounds) {
    game._timeout = setTimeout(() => {
      try { startRound(io, game); } catch (err) { console.error("[salfa] startRound error:", err); safeEndGame(io, game); }
    }, 6000);
  } else {
    game._timeout = setTimeout(() => {
      try { endGame(io, game); } catch (err) { console.error("[salfa] endGame error:", err); safeEndGame(io, game); }
    }, 6000);
  }
}

// ============================================================
// End game — final rankings
// ============================================================
function endGame(io, game) {
  game.phase = "game-over";
  clearTimeout(game._timeout);
  clearTimeout(game._hintTimeout);
  clearTimeout(game._safetyTimeout);

  const roomId = `room:${game.roomCode}`;

  // Build rankings sorted by score
  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  const rankings = sorted.map((p, i) => ({
    token: p.token,
    name: p.name,
    avatar: p.avatar,
    rank: i + 1,
    score: p.score,
    alive: true, // everyone is alive in salfa
  }));

  io.to(roomId).emit("salfa:game-over", { rankings });

  // Add XP for all players
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

// ============================================================
// Safety: force-end a stuck game to prevent server hangs
// ============================================================
function safeEndGame(io, game) {
  try {
    clearTimeout(game._timeout);
    clearTimeout(game._hintTimeout);
    console.warn(`[salfa] Force-ending stuck game ${game.roomCode}`);
    endGame(io, game);
  } catch (err) {
    console.error("[salfa] safeEndGame failed:", err);
    finishGame(game.roomCode);
    activeGames.delete(game.roomCode);
  }
}

// ============================================================
// Update socket ID for reconnecting player
// ============================================================
export function updateSalfaSocket(io, roomCode, token, socketId) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const player = game.players.find((p) => p.token === token);
  if (!player) return;
  player.socketId = socketId;

  // Send current game state to the reconnecting player so they're not stuck
  const isSpy = game.spyTokens.includes(token);

  if (game.phase === "role-reveal") {
    io.to(socketId).emit("salfa:role-reveal", {
      role: isSpy ? "spy" : "innocent",
      word: isSpy ? null : game.word,
      category: isSpy ? null : game.category,
      roundIdx: game.currentRound,
      totalRounds: game.totalRounds,
      spyCount: game.spyCount,
    });
  } else if (game.phase === "hints") {
    io.to(socketId).emit("salfa:hint-round", {
      roundNumber: game.hintRound,
      hintOrder: game.hintOrder.map((t) => {
        const p = game.players.find((pl) => pl.token === t);
        return { token: p.token, name: p.name, avatar: p.avatar };
      }),
      players: game.players.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
      timerEnd: game.roundTimerStart + game.maxRoundTime,
      voteRequestCount: game.voteRequests.size,
      totalPlayers: game.players.length,
    });
    // Send existing hints
    game.hints.forEach((h) => {
      io.to(socketId).emit("salfa:hint-submitted", h);
    });
  } else if (game.phase === "voting") {
    io.to(socketId).emit("salfa:voting", {
      players: game.players.map((p) => ({ token: p.token, name: p.name, avatar: p.avatar })),
      timerEnd: game.timerEnd,
    });
  } else if (game.phase === "spy-guess") {
    io.to(socketId).emit("salfa:spy-guess", {
      spyToken: game.caughtSpyToken,
      spyName: game.players.find((p) => p.token === game.caughtSpyToken)?.name,
      timerEnd: game.timerEnd,
      isSpy: token === game.caughtSpyToken,
      category: game.category,
      options: token === game.caughtSpyToken ? [] : [], // don't resend options for spy guess
    });
  }
}

// ============================================================
// Helper
// ============================================================
export function getActiveGame(roomCode) {
  return activeGames.get(roomCode);
}
