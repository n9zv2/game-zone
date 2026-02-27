import { getRandomWords } from "../data/codenamesData.js";
import { finishGame } from "../roomManager.js";
import { addScore } from "../sessionManager.js";
import { isBot } from "../botManager.js";
import { scheduleBotActions } from "../botAI.js";

const activeGames = new Map();

// ============================================================
// Start game
// ============================================================
export function startCodenames(io, room) {
  const connected = room.players.filter((p) => p.connected);
  if (connected.length < 4) return;

  // Shuffle and split into two teams
  const shuffled = [...connected].sort(() => Math.random() - 0.5);
  const half = Math.ceil(shuffled.length / 2);
  const redPlayers = shuffled.slice(0, half);
  const bluePlayers = shuffled.slice(half);

  // First player in each team is spymaster
  const redSpymaster = redPlayers[0].token;
  const blueSpymaster = bluePlayers[0].token;

  // Starting team (red starts, gets 9 words; blue gets 8)
  const startingTeam = "red";
  const redTotal = 9;
  const blueTotal = 8;

  // Generate grid: 25 words with assigned types
  const words = getRandomWords(25);
  const types = [];
  for (let i = 0; i < redTotal; i++) types.push("red");
  for (let i = 0; i < blueTotal; i++) types.push("blue");
  types.push("assassin");
  while (types.length < 25) types.push("neutral");
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  const grid = words.map((word, i) => ({
    word,
    type: types[i],
    revealed: false,
  }));

  const players = connected.map((p) => {
    const team = redPlayers.includes(p) ? "red" : "blue";
    const isSpy = p.token === redSpymaster || p.token === blueSpymaster;
    return {
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      socketId: p.socketId,
      team,
      isSpymaster: isSpy,
      score: 0,
    };
  });

  const game = {
    roomCode: room.code,
    players,
    grid,
    phase: "countdown",
    currentTeam: startingTeam,
    startingTeam,
    redTotal,
    blueTotal,
    redFound: 0,
    blueFound: 0,
    clue: null,
    guessesLeft: 0,
    clueHistory: [],
    teams: {
      red: { spymaster: redSpymaster, players: redPlayers.map((p) => p.token) },
      blue: { spymaster: blueSpymaster, players: bluePlayers.map((p) => p.token) },
    },
    _timeout: null,
    _warningTimeout: null,
  };

  activeGames.set(room.code, game);

  const roomId = `room:${room.code}`;

  // Build personalized payload per player
  players.forEach((p) => {
    const payload = buildFullState(game, p.token);
    if (p.socketId) {
      io.to(p.socketId).emit("codenames:start", payload);
    }
  });

  // Countdown: 3-2-1
  runCountdown(io, room.code, 3, () => {
    game.phase = "team-reveal";
    io.to(roomId).emit("codenames:phase", { phase: "team-reveal" });

    // After 8s team reveal, start first turn
    game._timeout = setTimeout(() => {
      startTurn(io, room.code);
    }, 8000);
  });
}

// ============================================================
// Countdown helper (3-2-1)
// ============================================================
function runCountdown(io, roomCode, seconds, callback) {
  const game = activeGames.get(roomCode);
  if (!game) return;
  const roomId = `room:${roomCode}`;

  let count = seconds;
  io.to(roomId).emit("codenames:countdown", { count });

  const interval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(interval);
      callback();
    } else {
      io.to(roomId).emit("codenames:countdown", { count });
    }
  }, 1000);

  // Store so we can clean up
  game._countdownInterval = interval;
}

// ============================================================
// Build full state payload for a player (used for start + reconnect)
// ============================================================
function buildFullState(game, token) {
  const player = game.players.find((p) => p.token === token);
  if (!player) return null;

  const redPlayers = game.players.filter((p) => p.team === "red");
  const bluePlayers = game.players.filter((p) => p.team === "blue");

  return {
    myToken: token,
    myTeam: player.team,
    isSpymaster: player.isSpymaster,
    currentTeam: game.currentTeam,
    phase: game.phase,
    grid: game.grid.map((cell) => ({
      word: cell.word,
      revealed: cell.revealed,
      type: player.isSpymaster || cell.revealed ? cell.type : null,
    })),
    teams: {
      red: {
        spymaster: game.teams.red.spymaster,
        players: redPlayers.map((rp) => ({ token: rp.token, name: rp.name, avatar: rp.avatar })),
      },
      blue: {
        spymaster: game.teams.blue.spymaster,
        players: bluePlayers.map((bp) => ({ token: bp.token, name: bp.name, avatar: bp.avatar })),
      },
    },
    redTotal: game.redTotal,
    blueTotal: game.blueTotal,
    redFound: game.redFound,
    blueFound: game.blueFound,
    clue: game.clue,
    guessesLeft: game.guessesLeft,
    clueHistory: game.clueHistory,
  };
}

// ============================================================
// Start a team's turn (spymaster gives clue)
// ============================================================
function startTurn(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game || game.phase === "game-over") return;

  game.phase = "spymaster-turn";
  game.clue = null;
  game.guessesLeft = 0;

  const timerEnd = Date.now() + 60000; // 60s for spymaster
  game._timerEnd = timerEnd;
  const roomId = `room:${roomCode}`;

  io.to(roomId).emit("codenames:turn", {
    currentTeam: game.currentTeam,
    phase: "spymaster-turn",
    timerEnd,
  });

  // Schedule bot spymaster clue if applicable
  const spymasterToken = game.teams[game.currentTeam].spymaster;
  if (isBot(spymasterToken)) {
    scheduleBotActions(io, game, "codenames", "spymaster-clue", {
      handleCodenamesClue,
    });
  }

  // Timer warning at last 10s
  clearTimeout(game._warningTimeout);
  game._warningTimeout = setTimeout(() => {
    if (game.phase === "spymaster-turn") {
      io.to(roomId).emit("codenames:timer-warning", { phase: "spymaster-turn" });
    }
  }, 50000);

  // Auto-pass if spymaster doesn't give clue in 60s
  clearTimeout(game._timeout);
  game._timeout = setTimeout(() => {
    if (game.phase === "spymaster-turn") {
      switchTeam(io, roomCode);
    }
  }, 61000);
}

// ============================================================
// Spymaster gives a clue
// ============================================================
export function handleCodenamesClue(io, socket, data) {
  const { roomCode, token, word, count } = data || {};
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "spymaster-turn") return;

  const spymasterToken = game.teams[game.currentTeam].spymaster;
  if (token !== spymasterToken) return;

  const clueWord = (word || "").trim();
  if (!clueWord || clueWord.length > 30) return;
  // Validate: no spaces (single word)
  if (/\s/.test(clueWord)) return;

  const clueCount = Math.max(0, Math.min(9, parseInt(count) || 0));

  game.clue = { word: clueWord, count: clueCount };
  game.guessesLeft = clueCount === 0 ? 25 : clueCount + 1;
  game.phase = "guesser-turn";

  // Save to history
  game.clueHistory.push({
    team: game.currentTeam,
    word: clueWord,
    count: clueCount,
  });

  clearTimeout(game._timeout);
  clearTimeout(game._warningTimeout);

  const timerEnd = Date.now() + 90000; // 90s for guessers
  game._timerEnd = timerEnd;
  const roomId = `room:${roomCode}`;

  io.to(roomId).emit("codenames:clue", {
    currentTeam: game.currentTeam,
    clue: game.clue,
    guessesLeft: game.guessesLeft,
    timerEnd,
    clueHistory: game.clueHistory,
  });

  // Schedule bot guesses
  scheduleBotActions(io, game, "codenames", "guess", {
    handleCodenamesGuess,
  });

  // Timer warning at last 10s
  game._warningTimeout = setTimeout(() => {
    if (game.phase === "guesser-turn") {
      io.to(roomId).emit("codenames:timer-warning", { phase: "guesser-turn" });
    }
  }, 80000);

  // Auto-end turn after 90s
  game._timeout = setTimeout(() => {
    if (game.phase === "guesser-turn") {
      switchTeam(io, roomCode);
    }
  }, 91000);
}

// ============================================================
// Guesser picks a word
// ============================================================
export function handleCodenamesGuess(io, socket, data) {
  const { roomCode, token, wordIndex } = data || {};
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "guesser-turn") return;

  const player = game.players.find((p) => p.token === token);
  if (!player || player.team !== game.currentTeam) return;
  if (player.isSpymaster) return;

  const idx = parseInt(wordIndex);
  if (isNaN(idx) || idx < 0 || idx >= 25) return;
  if (game.grid[idx].revealed) return;

  // Reveal the word
  const cell = game.grid[idx];
  cell.revealed = true;
  game.guessesLeft--;

  const roomId = `room:${roomCode}`;

  // Determine result type for feedback
  let resultType = "neutral"; // neutral/opponent
  if (cell.type === game.currentTeam) resultType = "correct";
  else if (cell.type === "assassin") resultType = "assassin";
  else if (cell.type !== "neutral") resultType = "opponent";

  io.to(roomId).emit("codenames:reveal", {
    wordIndex: idx,
    type: cell.type,
    revealedBy: token,
    currentTeam: game.currentTeam,
    resultType,
  });

  // Track found counts
  if (cell.type === "red") game.redFound++;
  if (cell.type === "blue") game.blueFound++;

  // Check win/loss conditions
  if (cell.type === "assassin") {
    const losingTeam = game.currentTeam;
    const winningTeam = losingTeam === "red" ? "blue" : "red";
    endGame(io, roomCode, winningTeam, "assassin");
    return;
  }

  if (game.redFound >= game.redTotal) {
    endGame(io, roomCode, "red", "all-found");
    return;
  }
  if (game.blueFound >= game.blueTotal) {
    endGame(io, roomCode, "blue", "all-found");
    return;
  }

  // Determine if turn continues
  if (cell.type === game.currentTeam) {
    if (game.guessesLeft <= 0) {
      switchTeam(io, roomCode);
    } else {
      io.to(roomId).emit("codenames:guess-update", {
        guessesLeft: game.guessesLeft,
        redFound: game.redFound,
        blueFound: game.blueFound,
      });
      scheduleBotActions(io, game, "codenames", "guess", {
        handleCodenamesGuess,
      });
    }
  } else {
    // Wrong guess — turn ends
    switchTeam(io, roomCode);
  }
}

// ============================================================
// Team voluntarily ends their turn
// ============================================================
export function handleCodenamesEndTurn(io, socket, data) {
  const { roomCode, token } = data || {};
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "guesser-turn") return;

  const player = game.players.find((p) => p.token === token);
  if (!player || player.team !== game.currentTeam) return;

  switchTeam(io, roomCode);
}

// ============================================================
// Switch to other team's turn (with switching animation)
// ============================================================
function switchTeam(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game || game.phase === "game-over") return;

  clearTimeout(game._timeout);
  clearTimeout(game._warningTimeout);
  game.currentTeam = game.currentTeam === "red" ? "blue" : "red";
  game.phase = "switching";

  const roomId = `room:${roomCode}`;
  io.to(roomId).emit("codenames:switch-team", {
    currentTeam: game.currentTeam,
    switchDuration: 3000,
  });

  // 3s switching animation, then start next turn
  game._timeout = setTimeout(() => {
    startTurn(io, roomCode);
  }, 3000);
}

// ============================================================
// End game — calculate scores, emit results
// ============================================================
function endGame(io, roomCode, winningTeam, reason) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  clearTimeout(game._timeout);
  clearTimeout(game._warningTimeout);
  if (game._countdownInterval) clearInterval(game._countdownInterval);
  game.phase = "game-over";

  // Better scoring:
  // Winner team: 150 + (25 × their words revealed)
  // Loser team: 50 + (10 × their words revealed)
  // Winning spymaster: +100 bonus
  game.players.forEach((p) => {
    const isWinner = p.team === winningTeam;
    const teamFound = p.team === "red" ? game.redFound : game.blueFound;
    if (isWinner) {
      p.score = 150 + (25 * teamFound);
      if (p.isSpymaster) p.score += 100;
    } else {
      p.score = 50 + (10 * teamFound);
    }
  });

  // Sort by score descending
  const ranked = [...game.players].sort((a, b) => b.score - a.score);

  // Award XP
  ranked.forEach((p, idx) => {
    if (isBot(p.token)) return;
    const result = addScore(p.token, p.score, idx === 0);
    if (result && p.socketId) {
      io.to(p.socketId).emit("session:xp-update", {
        xp: result.xp,
        level: result.level,
        xpGain: result.xpGain,
        leveledUp: result.leveledUp,
      });
    }
  });

  const roomId = `room:${roomCode}`;

  io.to(roomId).emit("codenames:game-over", {
    winningTeam,
    reason,
    grid: game.grid.map((cell) => ({
      word: cell.word,
      type: cell.type,
      revealed: cell.revealed,
    })),
    clueHistory: game.clueHistory,
    redFound: game.redFound,
    blueFound: game.blueFound,
    redTotal: game.redTotal,
    blueTotal: game.blueTotal,
    rankings: ranked.map((p, i) => ({
      rank: i + 1,
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      team: p.team,
      isSpymaster: p.isSpymaster,
      alive: p.team === winningTeam,
    })),
    teams: game.teams,
  });

  finishGame(roomCode);
  activeGames.delete(roomCode);
}

// ============================================================
// Reconnection — sends full game state to reconnecting player
// ============================================================
export function updateCodenamesSocket(io, roomCode, token, socketId) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const player = game.players.find((p) => p.token === token);
  if (!player) return;

  player.socketId = socketId;

  // Send full state to reconnecting player
  const payload = buildFullState(game, token);
  if (payload && socketId) {
    payload.timerEnd = game._timerEnd || 0;
    io.to(socketId).emit("codenames:reconnect", payload);
  }
}
