import { shuffle } from "../utils.js";
import { PQ, DIFFICULTY_CONFIG, calcTotalRounds, getDifficulty } from "../data/questions.js";
import { finishGame } from "../roomManager.js";
import { addScore } from "../sessionManager.js";

// Active pyramid games: roomCode -> gameState
const activeGames = new Map();

export function startPyramid(io, room) {
  const players = room.players
    .filter((p) => p.connected)
    .map((p) => ({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      socketId: p.socketId,
      alive: true,
      score: 0,
      streak: 0,
      lifelines: { skip: 1, fifty: 1, time: 1 },
      answered: false,
      answerIdx: -1,
      answerTime: 0,
      extraTime: 0,
    }));

  const totalRounds = calcTotalRounds(players.length);

  // Build question pool ordered by difficulty progression
  const questions = [];
  for (let i = 0; i < totalRounds; i++) {
    const diff = getDifficulty(i, totalRounds);
    questions.push({ roundIdx: i, difficulty: diff });
  }

  // Pick random questions per difficulty
  const pools = {
    easy: shuffle([...PQ.easy]),
    medium: shuffle([...PQ.medium]),
    hard: shuffle([...PQ.hard]),
    extreme: shuffle([...PQ.extreme]),
  };
  const poolIdx = { easy: 0, medium: 0, hard: 0, extreme: 0 };

  questions.forEach((r) => {
    const diff = r.difficulty;
    const q = pools[diff][poolIdx[diff] % pools[diff].length];
    poolIdx[diff]++;
    r.question = q;
  });

  const game = {
    roomCode: room.code,
    players,
    totalRounds,
    roundIdx: 0,
    questions,
    phase: "countdown",
    timerEnd: 0,
    currentQuestion: null,
    hiddenOptions: new Map(),
  };

  activeGames.set(room.code, game);

  const roomId = `room:${room.code}`;
  io.to(roomId).emit("pyramid:start", {
    players: players.map((p) => ({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
    })),
    totalRounds,
  });

  // Countdown 3-2-1
  let count = 3;
  const countInterval = setInterval(() => {
    io.to(roomId).emit("pyramid:countdown", { count });
    count--;
    if (count < 0) {
      clearInterval(countInterval);
      sendRound(io, room.code);
    }
  }, 1000);
}

function sendRound(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  const alivePlayers = game.players.filter((p) => p.alive);
  if (alivePlayers.length <= 1 || game.roundIdx >= game.totalRounds) {
    endGame(io, roomCode);
    return;
  }

  const roundData = game.questions[game.roundIdx];
  const q = roundData.question;
  const diff = roundData.difficulty;
  const config = DIFFICULTY_CONFIG[diff];

  game.phase = "question";
  game.currentQuestion = q;
  game.hiddenOptions = new Map();

  // Reset answers
  game.players.forEach((p) => {
    if (p.alive) {
      p.answered = false;
      p.answerIdx = -1;
      p.answerTime = 0;
    }
  });

  const baseTime = config.time;
  game.timerEnd = Date.now() + baseTime * 1000;

  const spectatorCount = game.players.filter((p) => !p.alive && p.socketId).length;

  // Send to each player individually (for 50/50 hidden options)
  game.players.forEach((p) => {
    if (!p.alive || !p.socketId) return;
    const hidden = game.hiddenOptions.get(p.token) || [];
    const personalTimerEnd = Date.now() + (baseTime + p.extraTime) * 1000;
    io.to(p.socketId).emit("pyramid:round", {
      roundIdx: game.roundIdx,
      totalRounds: game.totalRounds,
      difficulty: diff,
      question: q.q,
      options: q.o,
      hidden,
      timerEnd: personalTimerEnd,
      timerSeconds: baseTime + p.extraTime,
      streak: p.streak,
      score: p.score,
      lifelines: p.lifelines,
      spectatorCount,
    });
    p.extraTime = 0;
  });

  // Send spectator view to dead players (question without answer-ability)
  const deadPlayers = game.players.filter((p) => !p.alive && p.socketId);
  if (deadPlayers.length > 0) {
    const spectatorData = {
      roundIdx: game.roundIdx,
      totalRounds: game.totalRounds,
      difficulty: diff,
      question: q.q,
      options: q.o,
      timerEnd: game.timerEnd,
      timerSeconds: baseTime,
      spectator: true,
    };
    deadPlayers.forEach((p) => {
      io.to(p.socketId).emit("pyramid:round", spectatorData);
    });
  }

  // Global timeout
  game._questionTimeout = setTimeout(() => {
    revealAndEliminate(io, roomCode);
  }, (baseTime + 10) * 1000);
}

function revealAndEliminate(io, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game || game.phase === "reveal") return;

  clearTimeout(game._questionTimeout);
  game.phase = "reveal";

  const q = game.currentQuestion;
  const roundData = game.questions[game.roundIdx];
  const diff = roundData.difficulty;
  const config = DIFFICULTY_CONFIG[diff];

  // Calculate scores
  const results = [];
  game.players.forEach((p) => {
    if (!p.alive) return;
    const skipped = p.answerIdx === -2;
    const correct = skipped || p.answerIdx === q.a;
    let points = 0;
    if (!skipped && p.answerIdx === q.a) {
      // (diffMultiplier × 100) + (timeRemaining × 10) + (streak × 50)
      const timeRemaining = Math.max(0, Math.floor(p.answerTime / 1000));
      points = (config.multiplier * 100) + (timeRemaining * 10) + (p.streak * 50);
      p.streak++;
      p.score += points;
    } else if (!skipped) {
      p.streak = 0;
    }
    if (!p.answered) {
      p.answerIdx = -1;
    }
    results.push({
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      answerIdx: p.answerIdx,
      correct,
      points,
      totalScore: p.score,
      streak: p.streak,
    });
  });

  // Elimination logic
  const alivePlayers = game.players.filter((p) => p.alive);
  const wrongPlayers = alivePlayers.filter((p) => {
    const r = results.find((r) => r.token === p.token);
    return r && !r.correct;
  });
  const correctPlayers = alivePlayers.filter((p) => {
    const r = results.find((r) => r.token === p.token);
    return r && r.correct;
  });

  const toEliminate = [];

  if (wrongPlayers.length > 0) {
    // Everyone who got it wrong is eliminated
    wrongPlayers.forEach((p) => toEliminate.push(p));
  }
  // All correct — no one gets eliminated, game continues

  // Never eliminate everyone — keep at least 1
  if (toEliminate.length >= alivePlayers.length) {
    // Keep the one with the highest score
    toEliminate.sort((a, b) => b.score - a.score);
    toEliminate.shift(); // Remove the best from elimination list
  }

  toEliminate.forEach((p) => {
    p.alive = false;
  });

  const remaining = game.players.filter((p) => p.alive);

  // Next difficulty hint
  const nextRoundIdx = game.roundIdx + 1;
  const nextDifficulty = nextRoundIdx < game.totalRounds ? getDifficulty(nextRoundIdx, game.totalRounds) : null;

  // Clear hidden options
  game.hiddenOptions = new Map();

  const roomId = `room:${roomCode}`;
  io.to(roomId).emit("pyramid:round-result", {
    correctIdx: q.a,
    results,
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
    roundIdx: game.roundIdx,
    nextDifficulty,
  });

  game.roundIdx++;

  setTimeout(() => {
    if (remaining.length <= 1 || game.roundIdx >= game.totalRounds) {
      endGame(io, roomCode);
    } else {
      sendRound(io, roomCode);
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
  io.to(roomId).emit("pyramid:champion", {
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

export function handlePyramidAnswer(io, socket, data) {
  const { roomCode, token, answerIdx } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "question") return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player || player.answered) return;

  player.answered = true;
  player.answerIdx = answerIdx;
  player.answerTime = Math.max(0, game.timerEnd - Date.now());

  const allAnswered = game.players
    .filter((p) => p.alive)
    .every((p) => p.answered);

  if (allAnswered) {
    revealAndEliminate(io, game.roomCode);
  }
}

export function handleLifeline(io, socket, data) {
  const { roomCode, token, type } = data;
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== "question") return;

  const player = game.players.find((p) => p.token === token && p.alive);
  if (!player) return;

  switch (type) {
    case "skip": {
      if (player.lifelines.skip <= 0 || player.answered) return;
      player.lifelines.skip--;
      const alivePlayers = game.players.filter((p) => p.alive && p.token !== token);
      const roundData = game.questions[game.roundIdx];
      const config = DIFFICULTY_CONFIG[roundData.difficulty];
      const avgScore = alivePlayers.length > 0
        ? Math.floor(alivePlayers.reduce((s, p) => s + p.score, 0) / alivePlayers.length)
        : config.multiplier * 100;
      const bonusPoints = Math.max(config.multiplier * 50, Math.floor(avgScore * 0.1));
      player.score += bonusPoints;
      player.answered = true;
      player.answerIdx = -2; // Skip marker — treated as "correct" for elimination purposes
      // Give them a fake high answerTime so they aren't eliminated as "slowest"
      player.answerTime = 999999;

      io.to(player.socketId).emit("pyramid:lifeline-used", {
        type: "skip",
        lifelines: player.lifelines,
        bonusPoints,
      });

      const allAnswered = game.players.filter((p) => p.alive).every((p) => p.answered);
      if (allAnswered) revealAndEliminate(io, roomCode);
      break;
    }
    case "fifty": {
      if (player.lifelines.fifty <= 0 || player.answered) return;
      if (game.hiddenOptions.has(player.token)) return;
      player.lifelines.fifty--;
      const q = game.currentQuestion;
      const wrong = [0, 1, 2, 3].filter((i) => i !== q.a);
      const hidden = shuffle(wrong).slice(0, 2);
      game.hiddenOptions.set(player.token, hidden);

      io.to(player.socketId).emit("pyramid:lifeline-used", {
        type: "fifty",
        lifelines: player.lifelines,
        hidden,
      });
      break;
    }
    case "time": {
      if (player.lifelines.time <= 0 || player.answered) return;
      player.lifelines.time--;
      player.extraTime = 8;
      const newTimerEnd = Date.now() + 8 * 1000 + Math.max(0, game.timerEnd - Date.now());

      io.to(player.socketId).emit("pyramid:lifeline-used", {
        type: "time",
        lifelines: player.lifelines,
        newTimerEnd,
      });
      break;
    }
  }
}

export function getActiveGame(roomCode) {
  return activeGames.get(roomCode);
}
