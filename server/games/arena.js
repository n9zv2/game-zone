import { shuffle } from "../utils.js";
import {
  ARENA_CHALLENGES,
  MATH_PROBLEMS,
  WORD_PUZZLES,
  COLOR_NAMES,
} from "../data/challenges.js";
import { finishGame } from "../roomManager.js";
import { addScore } from "../sessionManager.js";

const activeGames = new Map();

export function startArena(io, room) {
  const players = room.players
    .filter((p) => p.connected)
    .map((p) => ({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      socketId: p.socketId,
      alive: true,
      score: 0,
      roundScore: 0,
      submitted: false,
      submitData: null,
    }));

  const rounds = shuffle(ARENA_CHALLENGES).slice(0, 5);

  const game = {
    roomCode: room.code,
    players,
    rounds,
    roundIdx: 0,
    phase: "countdown",
    challengeData: null, // server-side challenge data
    timerEnd: 0,
    isTwoPlayer: players.length === 2,
    finals: false,
    finalsWins: {},
    finalsRound: 0,
  };

  activeGames.set(room.code, game);

  const roomId = `room:${room.code}`;
  io.to(roomId).emit("arena:start", {
    players: players.map((p) => ({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
    })),
    rounds: rounds.map((r) => ({ type: r.type, name: r.name, icon: r.icon })),
    totalRounds: rounds.length,
  });

  // Countdown
  let count = 3;
  const countInterval = setInterval(() => {
    io.to(roomId).emit("arena:countdown", { count });
    count--;
    if (count < 0) {
      clearInterval(countInterval);
      startRound(io, room.code, 0);
    }
  }, 1000);
}

function startRound(io, roomCode, roundIdx) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.roundIdx = roundIdx;
  game.phase = "round-intro";

  const challenge = game.rounds[roundIdx];
  const alivePlayers = game.players.filter((p) => p.alive);

  // Reset round scores
  game.players.forEach((p) => {
    if (p.alive) {
      p.roundScore = 0;
      p.submitted = false;
      p.submitData = null;
    }
  });

  const roomId = `room:${roomCode}`;
  io.to(roomId).emit("arena:round-intro", {
    roundIdx,
    totalRounds: game.rounds.length,
    type: challenge.type,
    name: challenge.name,
    icon: challenge.icon,
    desc: challenge.desc,
    aliveCount: alivePlayers.length,
    alivePlayers: alivePlayers.map((p) => ({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
    })),
  });

  setTimeout(() => {
    sendChallenge(io, roomCode);
  }, 3000);
}

function sendChallenge(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const challenge = game.rounds[game.roundIdx];
  game.phase = "challenge";

  let clientData = {};
  let serverData = {};
  const time = challenge.time;

  switch (challenge.type) {
    case "speed_tap": {
      clientData = { type: "speed_tap", time };
      serverData = {};
      break;
    }
    case "memory": {
      const len = Math.min(4 + game.roundIdx, 7);
      const seq = Array.from({ length: len }, () =>
        Math.floor(Math.random() * 4)
      );
      clientData = { type: "memory", sequence: seq, time };
      serverData = { sequence: seq };
      break;
    }
    case "math": {
      const gen =
        MATH_PROBLEMS[Math.floor(Math.random() * MATH_PROBLEMS.length)];
      const problem = gen();
      clientData = { type: "math", question: problem.q, time };
      serverData = { answer: problem.ans };
      break;
    }
    case "reaction": {
      const delay = 2000 + Math.random() * 4000;
      clientData = { type: "reaction", time };
      serverData = { goTime: Date.now() + delay };
      // Schedule the "go" signal
      setTimeout(() => {
        const g = activeGames.get(roomCode);
        if (g && g.phase === "challenge") {
          const roomId = `room:${roomCode}`;
          io.to(roomId).emit("arena:reaction-go", {
            goTime: Date.now(),
          });
          g.challengeData.goActual = Date.now();
        }
      }, delay);
      break;
    }
    case "word": {
      const puzzle =
        WORD_PUZZLES[Math.floor(Math.random() * WORD_PUZZLES.length)];
      const scrambled = shuffle(puzzle.word.split("")).join("");
      clientData = {
        type: "word",
        scrambled,
        category: puzzle.category,
        time,
      };
      serverData = { word: puzzle.word };
      break;
    }
    case "color": {
      const actual =
        COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
      const display =
        COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
      const opts = shuffle(COLOR_NAMES).slice(0, 4);
      if (!opts.find((o) => o.hex === display.hex)) {
        opts[Math.floor(Math.random() * 4)] = display;
      }
      clientData = {
        type: "color",
        textName: actual.name,
        textColor: display.hex,
        correctHex: display.hex,
        options: opts.map((o) => ({ name: o.name, hex: o.hex })),
        time,
      };
      serverData = { correctHex: display.hex };
      break;
    }
  }

  game.challengeData = serverData;
  game.timerEnd = Date.now() + time * 1000;

  const spectatorCount = game.players.filter((p) => !p.alive && p.socketId).length;

  const roomId = `room:${roomCode}`;
  io.to(roomId).emit("arena:challenge", {
    ...clientData,
    timerEnd: game.timerEnd,
    spectatorCount,
  });

  // Timeout
  game._roundTimeout = setTimeout(() => {
    finishRound(io, roomCode);
  }, (time + 2) * 1000);
}

export function handleArenaSubmit(io, socket, data) {
  const { roomCode, token, result } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "challenge") return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player || player.submitted) return;

  player.submitted = true;
  player.submitData = result;
  const timeLeft = Math.max(0, game.timerEnd - Date.now()) / 1000;

  const challenge = game.rounds[game.roundIdx];

  switch (challenge.type) {
    case "speed_tap":
      player.roundScore = (result.tapCount || 0) * 15;
      break;
    case "memory": {
      const seq = game.challengeData.sequence;
      const input = result.sequence || [];
      const correct = input.length === seq.length && input.every((v, i) => v === seq[i]);
      player.roundScore = correct ? 300 : 0;
      break;
    }
    case "math": {
      const correct = parseInt(result.answer) === game.challengeData.answer;
      player.roundScore = correct ? 200 + Math.floor(timeLeft * 20) : 0;
      break;
    }
    case "reaction": {
      const rt = result.reactionTime || 10000;
      if (result.early) {
        player.roundScore = 0;
      } else {
        player.roundScore =
          rt < 300 ? 400 : rt < 500 ? 300 : rt < 800 ? 200 : 100;
      }
      break;
    }
    case "word": {
      const correct = result.word === game.challengeData.word;
      player.roundScore = correct ? 250 + Math.floor(timeLeft * 15) : 0;
      break;
    }
    case "color": {
      const correct = result.colorHex === game.challengeData.correctHex;
      player.roundScore = correct ? 250 + Math.floor(timeLeft * 20) : 0;
      break;
    }
  }

  // Check if all alive submitted
  const allSubmitted = game.players
    .filter((p) => p.alive)
    .every((p) => p.submitted);

  if (allSubmitted) {
    clearTimeout(game._roundTimeout);
    finishRound(io, roomCode);
  }
}

function getFinalsChallenge(game) {
  const used = game.rounds.map((r) => r.type);
  const available = ARENA_CHALLENGES.filter((c) => !used.includes(c.type));
  if (available.length > 0) return shuffle([...available])[0];
  return shuffle([...ARENA_CHALLENGES])[0];
}

function finishRound(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game || game.phase === "elimination") return;

  clearTimeout(game._roundTimeout);
  game.phase = "elimination";

  // Apply scores
  game.players.forEach((p) => {
    if (p.alive) {
      p.score += p.roundScore;
    }
  });

  const alivePlayers = game.players.filter((p) => p.alive);
  const roomId = `room:${roomCode}`;

  if (alivePlayers.length <= 1) {
    endGame(io, roomCode);
    return;
  }

  // --- Finals mode: only if the game started with exactly 2 players ---
  if (game.isTwoPlayer) {
    // Determine round winner (highest roundScore)
    const sorted = [...alivePlayers].sort((a, b) => b.roundScore - a.roundScore);
    const roundWinner = sorted[0];

    if (!game.finals) {
      // First round finished — enter finals mode
      game.finals = true;
      game.finalsRound = 1;
      game.finalsWins = {};
      alivePlayers.forEach((p) => { game.finalsWins[p.token] = 0; });
      game.finalsWins[roundWinner.token]++;

      io.to(roomId).emit("arena:finals-start", {
        players: alivePlayers.map((p) => ({
          token: p.token,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
        })),
        firstRoundWinner: roundWinner.token,
        finalsWins: { ...game.finalsWins },
      });
    } else {
      // Subsequent finals rounds
      game.finalsRound++;
      game.finalsWins[roundWinner.token]++;

      io.to(roomId).emit("arena:round-result", {
        roundIdx: game.roundIdx,
        scores: alivePlayers.map((p) => ({
          token: p.token,
          name: p.name,
          avatar: p.avatar,
          roundScore: p.roundScore,
          totalScore: p.score,
        })),
        eliminated: [],
        remaining: alivePlayers.map((p) => ({
          token: p.token,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
        })),
        finals: true,
        finalsWins: { ...game.finalsWins },
        finalsRound: game.finalsRound,
        roundWinner: roundWinner.token,
      });
    }

    // Check if someone reached 2 wins
    const winner = Object.entries(game.finalsWins).find(([, w]) => w >= 2);
    if (winner) {
      setTimeout(() => endGame(io, roomCode), 4000);
    } else {
      // Generate a new challenge and continue
      setTimeout(() => {
        const nextChallenge = getFinalsChallenge(game);
        game.rounds.push(nextChallenge);
        startRound(io, roomCode, game.rounds.length - 1);
      }, 4000);
    }
    return;
  }

  // --- Normal elimination (3+ players) ---
  // Sort by roundScore ascending (worst first)
  const sorted = [...alivePlayers].sort((a, b) => {
    if (a.roundScore !== b.roundScore) return a.roundScore - b.roundScore;
    return a.score - b.score;
  });

  const elimCount = Math.max(
    1,
    Math.floor(alivePlayers.length * 0.3)
  );
  const toEliminate = sorted.slice(
    0,
    Math.min(elimCount, alivePlayers.length - 1)
  );

  toEliminate.forEach((p) => {
    p.alive = false;
  });

  const remaining = game.players.filter((p) => p.alive);

  io.to(roomId).emit("arena:round-result", {
    roundIdx: game.roundIdx,
    scores: alivePlayers.map((p) => ({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      roundScore: p.roundScore,
      totalScore: p.score,
    })),
    eliminated: toEliminate.map((p) => ({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
    })),
    remaining: remaining.map((p) => ({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
    })),
  });

  setTimeout(() => {
    if (
      remaining.length <= 1 ||
      game.roundIdx + 1 >= game.rounds.length
    ) {
      endGame(io, roomCode);
    } else {
      startRound(io, roomCode, game.roundIdx + 1);
    }
  }, 4000);
}

function endGame(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  game.phase = "champion";

  const ranked = [...game.players].sort((a, b) => b.score - a.score);
  const champion = ranked[0];

  ranked.forEach((p, idx) => {
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
  io.to(roomId).emit("arena:champion", {
    champion: {
      token: champion.token,
      name: champion.name,
      avatar: champion.avatar,
      score: champion.score,
    },
    rankings: ranked.map((p, i) => ({
      rank: i + 1,
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      alive: p.alive,
    })),
  });

  finishGame(roomCode);
  activeGames.delete(roomCode);
}

export function getActiveGame(roomCode) {
  return activeGames.get(roomCode);
}
