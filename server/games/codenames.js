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
  // Shuffle types
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
    const isSpymaster = p.token === redSpymaster || p.token === blueSpymaster;
    return {
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      socketId: p.socketId,
      team,
      isSpymaster,
      score: 0,
    };
  });

  const game = {
    roomCode: room.code,
    players,
    grid,
    phase: "team-reveal", // team-reveal → spymaster-turn → guesser-turn → game-over
    currentTeam: startingTeam,
    startingTeam,
    redTotal,
    blueTotal,
    redFound: 0,
    blueFound: 0,
    clue: null,
    guessesLeft: 0,
    teams: {
      red: { spymaster: redSpymaster, players: redPlayers.map((p) => p.token) },
      blue: { spymaster: blueSpymaster, players: bluePlayers.map((p) => p.token) },
    },
    _timeout: null,
  };

  activeGames.set(room.code, game);

  const roomId = `room:${room.code}`;

  // Send personalized start data to each player
  players.forEach((p) => {
    const payload = {
      myToken: p.token,
      myTeam: p.team,
      isSpymaster: p.isSpymaster,
      currentTeam: startingTeam,
      grid: grid.map((cell) => ({
        word: cell.word,
        revealed: false,
        // Spymasters see the key card
        type: p.isSpymaster ? cell.type : null,
      })),
      teams: {
        red: {
          spymaster: redSpymaster,
          players: redPlayers.map((rp) => ({ token: rp.token, name: rp.name, avatar: rp.avatar })),
        },
        blue: {
          spymaster: blueSpymaster,
          players: bluePlayers.map((bp) => ({ token: bp.token, name: bp.name, avatar: bp.avatar })),
        },
      },
      redTotal,
      blueTotal,
      redFound: 0,
      blueFound: 0,
    };

    if (p.socketId) {
      io.to(p.socketId).emit("codenames:start", payload);
    }
  });

  // After team reveal, start first turn
  game._timeout = setTimeout(() => {
    startTurn(io, room.code);
  }, 5000);
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

  const timerEnd = Date.now() + 45000;
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

  // Auto-pass if spymaster doesn't give clue in 45s
  clearTimeout(game._timeout);
  game._timeout = setTimeout(() => {
    if (game.phase === "spymaster-turn") {
      // Auto-clue: pass turn
      switchTeam(io, roomCode);
    }
  }, 46000);
}

// ============================================================
// Spymaster gives a clue
// ============================================================
export function handleCodenamesClue(io, socket, data) {
  const { roomCode, token, word, count } = data || {};
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "spymaster-turn") return;

  // Validate: only current team's spymaster can give clue
  const spymasterToken = game.teams[game.currentTeam].spymaster;
  if (token !== spymasterToken) return;

  // Validate clue
  const clueWord = (word || "").trim();
  if (!clueWord || clueWord.length > 30) return;
  const clueCount = Math.max(0, Math.min(9, parseInt(count) || 0));

  game.clue = { word: clueWord, count: clueCount };
  game.guessesLeft = clueCount === 0 ? 25 : clueCount + 1; // 0 = unlimited
  game.phase = "guesser-turn";

  clearTimeout(game._timeout);

  const timerEnd = Date.now() + 60000;
  const roomId = `room:${roomCode}`;

  io.to(roomId).emit("codenames:clue", {
    currentTeam: game.currentTeam,
    clue: game.clue,
    guessesLeft: game.guessesLeft,
    timerEnd,
  });

  // Schedule bot guesses
  scheduleBotActions(io, game, "codenames", "guess", {
    handleCodenamesGuess,
  });

  // Auto-end turn after 60s
  game._timeout = setTimeout(() => {
    if (game.phase === "guesser-turn" && game.currentTeam === (game.clue ? game.currentTeam : null)) {
      switchTeam(io, roomCode);
    }
  }, 61000);
}

// ============================================================
// Guesser picks a word
// ============================================================
export function handleCodenamesGuess(io, socket, data) {
  const { roomCode, token, wordIndex } = data || {};
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "guesser-turn") return;

  // Validate: only current team's guessers can guess
  const player = game.players.find((p) => p.token === token);
  if (!player || player.team !== game.currentTeam) return;
  if (player.isSpymaster) return; // Spymaster can't guess

  // Validate index
  const idx = parseInt(wordIndex);
  if (isNaN(idx) || idx < 0 || idx >= 25) return;
  if (game.grid[idx].revealed) return;

  // Reveal the word
  const cell = game.grid[idx];
  cell.revealed = true;
  game.guessesLeft--;

  const roomId = `room:${roomCode}`;

  io.to(roomId).emit("codenames:reveal", {
    wordIndex: idx,
    type: cell.type,
    revealedBy: token,
    currentTeam: game.currentTeam,
  });

  // Track found counts
  if (cell.type === "red") game.redFound++;
  if (cell.type === "blue") game.blueFound++;

  // Check win/loss conditions
  if (cell.type === "assassin") {
    // Team that picked assassin loses
    const losingTeam = game.currentTeam;
    const winningTeam = losingTeam === "red" ? "blue" : "red";
    endGame(io, roomCode, winningTeam, "assassin");
    return;
  }

  // Check if a team found all their words
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
    // Correct guess — continue if guesses left
    if (game.guessesLeft <= 0) {
      switchTeam(io, roomCode);
    } else {
      // Emit updated guesses count
      io.to(roomId).emit("codenames:guess-update", {
        guessesLeft: game.guessesLeft,
      });
      // Schedule more bot guesses if applicable
      scheduleBotActions(io, game, "codenames", "guess", {
        handleCodenamesGuess,
      });
    }
  } else {
    // Wrong guess (neutral or opponent's word) — turn ends
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

  // Only current team members can end turn
  const player = game.players.find((p) => p.token === token);
  if (!player || player.team !== game.currentTeam) return;

  switchTeam(io, roomCode);
}

// ============================================================
// Switch to other team's turn
// ============================================================
function switchTeam(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game || game.phase === "game-over") return;

  clearTimeout(game._timeout);
  game.currentTeam = game.currentTeam === "red" ? "blue" : "red";

  const roomId = `room:${roomCode}`;
  io.to(roomId).emit("codenames:switch-team", {
    currentTeam: game.currentTeam,
  });

  // Small delay before starting next turn
  game._timeout = setTimeout(() => {
    startTurn(io, roomCode);
  }, 2000);
}

// ============================================================
// End game — calculate scores, emit results
// ============================================================
function endGame(io, roomCode, winningTeam, reason) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  clearTimeout(game._timeout);
  game.phase = "game-over";

  // Score: winners 200, losers 50, spymaster bonus +75
  game.players.forEach((p) => {
    const isWinner = p.team === winningTeam;
    p.score = isWinner ? 200 : 50;
    if (p.isSpymaster && isWinner) p.score += 75;
  });

  // Sort by score descending for rankings
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
    reason, // "assassin" | "all-found"
    grid: game.grid.map((cell) => ({
      word: cell.word,
      type: cell.type,
      revealed: cell.revealed,
    })),
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
// Reconnection
// ============================================================
export function updateCodenamesSocket(roomCode, token, socketId) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const player = game.players.find((p) => p.token === token);
  if (player) {
    player.socketId = socketId;
  }
}
