import { shuffle } from "../utils.js";
import {
  ARENA_CHALLENGES,
  TRUE_FALSE_STATEMENTS,
  WORD_PUZZLES,
  COLOR_NAMES,
  EMOJI_PAIRS,
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

  const elimPerRound = players.length >= 10 ? 2 : 1;
  const roundsNeeded = Math.min(ARENA_CHALLENGES.length, Math.max(5, Math.ceil(players.length * 1.2)));
  const rounds = shuffle([...ARENA_CHALLENGES]).slice(0, Math.min(roundsNeeded, ARENA_CHALLENGES.length));

  const game = {
    roomCode: room.code,
    players,
    rounds,
    roundIdx: 0,
    phase: "countdown",
    challengeData: null,
    timerEnd: 0,
    elimPerRound,
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
    case "truefalse": {
      const picked = shuffle([...TRUE_FALSE_STATEMENTS]).slice(0, 5);
      clientData = {
        type: "truefalse",
        statements: picked.map((s) => ({ text: s.text })),
        time,
      };
      serverData = { answers: picked.map((s) => s.answer) };
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
      const scrambledLetters = shuffle(puzzle.word.split(""));
      clientData = {
        type: "word",
        scrambledLetters,
        category: puzzle.category,
        letterCount: puzzle.word.length,
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
        options: opts.map((o) => ({ name: o.name, hex: o.hex })),
        time,
      };
      serverData = { correctHex: display.hex };
      break;
    }
    case "emoji_spot": {
      const pair = EMOJI_PAIRS[Math.floor(Math.random() * EMOJI_PAIRS.length)];
      const oddPos = Math.floor(Math.random() * 16);
      const grid = Array.from({ length: 16 }, (_, i) =>
        i === oddPos ? pair.odd : pair.normal
      );
      clientData = { type: "emoji_spot", grid, time };
      serverData = { oddPosition: oddPos };
      break;
    }
    case "number_sort": {
      const nums = new Set();
      while (nums.size < 5) nums.add(Math.floor(Math.random() * 99) + 1);
      const numbers = [...nums];
      const sorted = [...numbers].sort((a, b) => a - b);
      const shuffled = shuffle([...numbers]);
      clientData = { type: "number_sort", numbers: shuffled, time };
      serverData = { sorted };
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
    case "truefalse": {
      const answers = game.challengeData.answers;
      const playerAnswers = result.answers || [];
      let correctCount = 0;
      for (let i = 0; i < answers.length; i++) {
        if (playerAnswers[i] === answers[i]) correctCount++;
      }
      player.roundScore = correctCount * 50 + Math.floor(timeLeft * 10);
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
      const selected = (result.selectedLetters || []).join("");
      const correct = selected === game.challengeData.word;
      player.roundScore = correct ? 250 + Math.floor(timeLeft * 15) : 0;
      break;
    }
    case "color": {
      const correct = result.colorHex === game.challengeData.correctHex;
      player.roundScore = correct ? 250 + Math.floor(timeLeft * 20) : 0;
      break;
    }
    case "emoji_spot": {
      const correct = result.position === game.challengeData.oddPosition;
      player.roundScore = correct ? 200 + Math.floor(timeLeft * 30) : 0;
      break;
    }
    case "number_sort": {
      const playerOrder = result.order || [];
      const sorted = game.challengeData.sorted;
      const correct = playerOrder.length === sorted.length && playerOrder.every((v, i) => v === sorted[i]);
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

  // --- Finals mode: any game that reaches 2 alive players ---
  if (alivePlayers.length === 2) {
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

  const elimCount = Math.min(game.elimPerRound, alivePlayers.length - 2);
  const toEliminate = sorted.slice(0, Math.max(1, elimCount));

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
    if (remaining.length <= 1) {
      endGame(io, roomCode);
    } else if (game.roundIdx + 1 >= game.rounds.length) {
      // Dynamic round generation — add a new challenge
      const nextChallenge = getFinalsChallenge(game);
      game.rounds.push(nextChallenge);
      startRound(io, roomCode, game.rounds.length - 1);
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
