import { isBot, getBotDifficulty, getBotsInRoom } from "./botManager.js";

// ============================================================
// Difficulty config
// ============================================================
const DIFFICULTY = {
  easy:   { correctChance: 0.40, minDelay: 3000, maxDelay: 8000, voteAccuracy: 0.30 },
  medium: { correctChance: 0.70, minDelay: 1500, maxDelay: 5000, voteAccuracy: 0.60 },
  hard:   { correctChance: 0.90, minDelay: 800,  maxDelay: 3000, voteAccuracy: 0.80 },
};

function getConfig(token) {
  return DIFFICULTY[getBotDifficulty(token)] || DIFFICULTY.medium;
}

function randDelay(config) {
  return config.minDelay + Math.random() * (config.maxDelay - config.minDelay);
}

function chance(probability) {
  return Math.random() < probability;
}

// Dummy socket for bot actions — bots don't receive events
const DUMMY_SOCKET = { emit: () => {}, id: null };

// ============================================================
// Main entry point — called by game engines after each phase
// ============================================================
export function scheduleBotActions(io, game, gameType, phase, phaseData = {}) {
  if (!game || !game.players) return;

  const botPlayers = game.players.filter((p) => {
    if (!isBot(p.token)) return false;
    // Only alive bots act (for games with elimination)
    if (p.alive !== undefined && !p.alive) return false;
    return true;
  });

  if (botPlayers.length === 0) return;

  botPlayers.forEach((bot) => {
    const config = getConfig(bot.token);
    const delay = randDelay(config);

    setTimeout(() => {
      try {
        switch (gameType) {
          case "arena":
            handleArenaBot(io, game, bot, config, phase, phaseData);
            break;
          case "salfa":
            handleSalfaBot(io, game, bot, config, phase, phaseData);
            break;
          case "codenames":
            handleCodenamesBot(io, game, bot, config, phase, phaseData);
            break;
        }
      } catch (err) {
        console.error(`[botAI] Error for ${bot.token} in ${gameType}:${phase}:`, err.message);
      }
    }, delay);
  });
}

// ============================================================
// ARENA BOT
// ============================================================
function handleArenaBot(io, game, bot, config, phase, data) {
  if (game.phase !== "challenge") return;
  if (bot.submitted) return;

  const { handleArenaSubmit } = data;
  if (!handleArenaSubmit) return;

  const challenge = game.rounds[game.roundIdx];
  let result = {};

  switch (challenge.type) {
    case "speed_tap": {
      // Random tap count between 40-85% of a reasonable max
      const maxTaps = 40;
      const ratio = 0.4 + config.correctChance * 0.45;
      result = { tapCount: Math.floor(maxTaps * ratio * (0.8 + Math.random() * 0.4)) };
      break;
    }
    case "memory": {
      const seq = game.challengeData.sequence;
      if (chance(config.correctChance)) {
        result = { sequence: [...seq] };
      } else {
        // Wrong: flip one random element
        const wrong = [...seq];
        const idx = Math.floor(Math.random() * wrong.length);
        wrong[idx] = (wrong[idx] + 1 + Math.floor(Math.random() * 3)) % 4;
        result = { sequence: wrong };
      }
      break;
    }
    case "truefalse": {
      const answers = game.challengeData.answers;
      result = {
        answers: answers.map((correct) =>
          chance(config.correctChance) ? correct : !correct
        ),
      };
      break;
    }
    case "reaction": {
      if (game.challengeData.goActual) {
        // Bot "reacted" — give a reaction time based on difficulty
        const baseTime = config.minDelay === 800 ? 250 : config.minDelay === 1500 ? 400 : 600;
        const rt = baseTime + Math.random() * 300;
        result = { reactionTime: rt, early: false };
      } else {
        result = { reactionTime: 5000, early: false };
      }
      break;
    }
    case "word": {
      const word = game.challengeData.word;
      if (chance(config.correctChance)) {
        result = { selectedLetters: word.split("") };
      } else {
        // Scramble the word
        const letters = word.split("");
        const i = Math.floor(Math.random() * letters.length);
        const j = (i + 1) % letters.length;
        [letters[i], letters[j]] = [letters[j], letters[i]];
        result = { selectedLetters: letters };
      }
      break;
    }
    case "color": {
      if (chance(config.correctChance)) {
        result = { colorHex: game.challengeData.correctHex };
      } else {
        result = { colorHex: "#000000" };
      }
      break;
    }
    case "emoji_spot": {
      if (chance(config.correctChance)) {
        result = { position: game.challengeData.oddPosition };
      } else {
        let pos;
        do { pos = Math.floor(Math.random() * 16); } while (pos === game.challengeData.oddPosition);
        result = { position: pos };
      }
      break;
    }
    case "number_sort": {
      if (chance(config.correctChance)) {
        result = { order: [...game.challengeData.sorted] };
      } else {
        const wrong = [...game.challengeData.sorted];
        const i = Math.floor(Math.random() * (wrong.length - 1));
        [wrong[i], wrong[i + 1]] = [wrong[i + 1], wrong[i]];
        result = { order: wrong };
      }
      break;
    }
  }

  handleArenaSubmit(io, DUMMY_SOCKET, {
    roomCode: game.roomCode,
    token: bot.token,
    result,
  });
}

// ============================================================
// SALFA BOT
// ============================================================
const SALFA_INNOCENT_HINTS = [
  "شي يوصل", "يستخدمه الناس", "معروف عند الكل", "شي طبيعي", "يشوفه كل يوم",
  "مرتبط بالحياة", "شي مهم", "الكل يعرفه", "شي أساسي", "مو غريب",
  "واضح مثل الشمس", "شي عادي", "يحتاجه الناس", "موجود بكل مكان",
];

const SALFA_SPY_HINTS = [
  "شي معين", "ممكن يكون", "شي من الأشياء", "الناس تعرفه", "مو بعيد",
  "يمكن شفته", "شي موجود", "كلنا نعرفه", "شي كويس", "مو واضح لي",
  "هممم صعب أوصفه", "شي ما أقدر أقوله", "الله أعلم",
];

function handleSalfaBot(io, game, bot, config, phase, data) {
  const { handleHint, handleVoteRequest, handleVote, handleSpyGuess } = data;
  const isSpy = game.spyTokens.includes(bot.token);

  switch (phase) {
    case "hints": {
      if (!handleHint) return;
      if (game.phase !== "hints") return;
      const hints = isSpy ? SALFA_SPY_HINTS : SALFA_INNOCENT_HINTS;
      const hint = hints[Math.floor(Math.random() * hints.length)];
      handleHint(io, DUMMY_SOCKET, {
        roomCode: game.roomCode,
        token: bot.token,
        hint,
      });
      // Sometimes request vote after giving hint
      if (handleVoteRequest && Math.random() < 0.3 && game.hintRound >= 2) {
        setTimeout(() => {
          if (game.phase === "hints") {
            handleVoteRequest(io, DUMMY_SOCKET, {
              roomCode: game.roomCode,
              token: bot.token,
            });
          }
        }, 3000 + Math.random() * 5000);
      }
      break;
    }
    case "voting": {
      if (!handleVote || game.phase !== "voting") return;
      const others = game.players.filter((p) => p.token !== bot.token);
      let target;
      if (!isSpy && chance(config.voteAccuracy)) {
        // Try to vote for an actual spy
        const spies = others.filter((p) => game.spyTokens.includes(p.token));
        target = spies.length > 0
          ? spies[Math.floor(Math.random() * spies.length)].token
          : others[Math.floor(Math.random() * others.length)].token;
      } else {
        // Random vote
        target = others[Math.floor(Math.random() * others.length)].token;
      }
      handleVote(io, DUMMY_SOCKET, {
        roomCode: game.roomCode,
        token: bot.token,
        targetToken: target,
      });
      break;
    }
    case "spy-guess": {
      if (!handleSpyGuess) return;
      if (game.phase !== "spy-guess") return;
      if (bot.token !== game.caughtSpyToken) return;
      // Bot picks from options if available
      const options = data.options || [];
      if (options.length > 0) {
        const guess = chance(config.correctChance)
          ? game.word
          : options[Math.floor(Math.random() * options.length)];
        handleSpyGuess(io, DUMMY_SOCKET, {
          roomCode: game.roomCode,
          token: bot.token,
          guess,
        });
      }
      break;
    }
  }
}

// ============================================================
// CODENAMES BOT (guesser only — bots are never spymaster)
// ============================================================
function handleCodenamesBot(io, game, bot, config, phase, data) {
  const { handleCodenamesClue, handleCodenamesGuess } = data;

  // Bot spymaster: give a generic clue
  if (phase === "spymaster-clue") {
    if (!handleCodenamesClue || game.phase !== "spymaster-turn") return;
    const spymasterToken = game.teams[game.currentTeam]?.spymaster;
    if (bot.token !== spymasterToken) return;

    // Pick a simple clue — just say a vague word with count 1
    const teamWords = game.grid.filter((c) => c.type === bot.team && !c.revealed);
    const clueWord = teamWords.length > 0 ? "تلميح" : "تخمين";
    handleCodenamesClue(io, DUMMY_SOCKET, {
      roomCode: game.roomCode,
      token: bot.token,
      word: clueWord,
      count: Math.min(2, teamWords.length),
    });
    return;
  }

  // Bot guesser: pick a word
  if (phase === "guess") {
    if (!handleCodenamesGuess || game.phase !== "guesser-turn") return;
    if (bot.team !== game.currentTeam) return;
    if (bot.isSpymaster) return;

    const unrevealed = game.grid
      .map((c, i) => ({ ...c, idx: i }))
      .filter((c) => !c.revealed);
    if (unrevealed.length === 0) return;

    // Difficulty determines if bot picks correctly
    const teamWords = unrevealed.filter((c) => c.type === bot.team);
    const accuracy = config.correctChance;

    let pick;
    if (teamWords.length > 0 && chance(accuracy)) {
      pick = teamWords[Math.floor(Math.random() * teamWords.length)];
    } else {
      // Random unrevealed word (could be neutral, opponent, or assassin)
      const nonTeam = unrevealed.filter((c) => c.type !== bot.team);
      pick = nonTeam.length > 0
        ? nonTeam[Math.floor(Math.random() * nonTeam.length)]
        : unrevealed[Math.floor(Math.random() * unrevealed.length)];
    }

    handleCodenamesGuess(io, DUMMY_SOCKET, {
      roomCode: game.roomCode,
      token: bot.token,
      wordIndex: pick.idx,
    });
  }
}
