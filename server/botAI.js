import { isBot, getBotDifficulty, getBotsInRoom } from "./botManager.js";
import { REACTION_EMOJIS } from "./data/mutakhafyData.js";

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
          case "fitna":
            handleFitnaBot(io, game, bot, config, phase, phaseData);
            break;
          case "mutakhafy":
            handleMutakhafyBot(io, game, bot, config, phase, phaseData);
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
// FITNA BOT
// ============================================================
const FITNA_SECRET_HINTS_INNOCENT = [
  "قريب من المعنى", "شي واضح", "يخليك تفكر", "مرتبط بشي نعرفه",
  "مهم", "أساسي", "يومي", "طبيعي", "معروف",
];

const FITNA_SECRET_HINTS_SABOTEUR = [
  "شي ممكن", "فكرة عامة", "مو بعيد", "الله أعلم", "شي كذا",
  "صعب أوصفه", "مو متأكد", "شي غريب شوي", "هممم",
];

const FITNA_CHAT_MESSAGES = [
  "أنا بريء والله!", "هذا مشبوه!", "خلونا نفكر", "مين ما رد؟",
  "أحس فيه خائن بينا", "ركزوا على اللي غلط", "أنا معكم",
  "الموضوع واضح", "لازم نصوت صح", "انتبهوا",
];

function handleFitnaBot(io, game, bot, config, phase, data) {
  const {
    handleFitnaAction, handleFaceOffAnswer, handleSecretWordHint,
    handleFitnaVote, handleFitnaCard, handleNightAction,
    handleDiscussionAction, handleChatMessage,
  } = data;

  const isSaboteur = bot.role === "saboteur";

  switch (phase) {
    case "loyalty_test": {
      if (!handleFitnaAction || game.phase !== "activity") return;
      const correctIdx = game.loyaltyData?.correctIdx;
      if (correctIdx === undefined) return;
      let choice;
      if (!isSaboteur) {
        // Innocents know the answer
        choice = correctIdx;
      } else {
        // Saboteurs guess — sometimes right by luck
        choice = chance(config.correctChance)
          ? correctIdx
          : Math.floor(Math.random() * 4);
      }
      handleFitnaAction(io, DUMMY_SOCKET, {
        roomCode: game.roomCode,
        token: bot.token,
        choiceIdx: choice,
      });
      break;
    }
    case "face_off": {
      if (!handleFaceOffAnswer || game.phase !== "activity" || !game.faceOffData) return;
      const pairIdx = game.faceOffData.pairs.findIndex((p) => p.tokens.includes(bot.token));
      if (pairIdx === -1) return; // sitting out
      const pair = game.faceOffData.pairs[pairIdx];
      const correctIdx = pair.correctIdx;
      let choice;
      if (!isSaboteur) {
        choice = correctIdx;
      } else {
        choice = chance(config.correctChance)
          ? correctIdx
          : Math.floor(Math.random() * 2);
      }
      handleFaceOffAnswer(io, DUMMY_SOCKET, {
        roomCode: game.roomCode,
        token: bot.token,
        pairIdx,
        choiceIdx: choice,
      });
      break;
    }
    case "secret_word": {
      if (!handleSecretWordHint || game.phase !== "activity") return;
      const hints = isSaboteur ? FITNA_SECRET_HINTS_SABOTEUR : FITNA_SECRET_HINTS_INNOCENT;
      const hint = hints[Math.floor(Math.random() * hints.length)];
      handleSecretWordHint(io, DUMMY_SOCKET, {
        roomCode: game.roomCode,
        token: bot.token,
        hint,
      });
      break;
    }
    case "discussion": {
      if (game.phase !== "discussion") return;
      // Send a chat message
      if (handleChatMessage && Math.random() < 0.6) {
        const msg = FITNA_CHAT_MESSAGES[Math.floor(Math.random() * FITNA_CHAT_MESSAGES.length)];
        handleChatMessage(io, DUMMY_SOCKET, {
          roomCode: game.roomCode,
          token: bot.token,
          text: msg,
        });
      }
      // Sometimes accuse someone
      if (handleDiscussionAction && Math.random() < 0.3) {
        const alivePlayers = game.players.filter((p) => p.alive && p.token !== bot.token);
        if (alivePlayers.length > 0) {
          const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
          setTimeout(() => {
            if (game.phase === "discussion") {
              handleDiscussionAction(io, DUMMY_SOCKET, {
                roomCode: game.roomCode,
                token: bot.token,
                action: "accuse",
                targetToken: target.token,
              });
            }
          }, 2000 + Math.random() * 3000);
        }
      }
      break;
    }
    case "cards": {
      if (!handleFitnaCard || game.phase !== "cards") return;
      if (!bot.card) return;
      // Play card on a random alive player
      const targets = game.players.filter((p) => p.alive && p.token !== bot.token);
      if (targets.length === 0) return;
      const target = targets[Math.floor(Math.random() * targets.length)];
      handleFitnaCard(io, DUMMY_SOCKET, {
        roomCode: game.roomCode,
        token: bot.token,
        cardId: bot.card.id,
        targetToken: target.token,
      });
      break;
    }
    case "voting": {
      if (!handleFitnaVote || game.phase !== "voting") return;
      if (game.silencedTokens?.has(bot.token)) return;
      const alivePlayers = game.players.filter((p) => p.alive && p.token !== bot.token);
      if (alivePlayers.length === 0) return;
      let target;
      if (!isSaboteur && chance(config.voteAccuracy)) {
        // Try to vote for saboteur
        const saboteurs = alivePlayers.filter((p) => p.role === "saboteur");
        target = saboteurs.length > 0
          ? saboteurs[Math.floor(Math.random() * saboteurs.length)]
          : alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      } else if (isSaboteur) {
        // Saboteur votes for innocent
        const innocents = alivePlayers.filter((p) => p.role !== "saboteur");
        target = innocents.length > 0
          ? innocents[Math.floor(Math.random() * innocents.length)]
          : alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      } else {
        target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      }
      handleFitnaVote(io, DUMMY_SOCKET, {
        roomCode: game.roomCode,
        token: bot.token,
        targetToken: target.token,
      });
      break;
    }
    case "night": {
      if (!handleNightAction || game.phase !== "night") return;
      if (bot.role === "saboteur") {
        // Kill a random non-saboteur
        const targets = game.players.filter((p) => p.alive && p.role !== "saboteur");
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          handleNightAction(io, DUMMY_SOCKET, {
            roomCode: game.roomCode,
            token: bot.token,
            action: "kill",
            targetToken: target.token,
          });
        }
      } else if (bot.role === "detective") {
        // Investigate random player
        const targets = game.players.filter((p) => p.alive && p.token !== bot.token);
        if (targets.length > 0) {
          const target = targets[Math.floor(Math.random() * targets.length)];
          handleNightAction(io, DUMMY_SOCKET, {
            roomCode: game.roomCode,
            token: bot.token,
            action: "investigate",
            targetToken: target.token,
          });
        }
      }
      break;
    }
  }
}

// ============================================================
// MUTAKHAFY BOT
// ============================================================
const MUTAKHAFY_WORD_RESPONSES = [
  "حماس", "سعادة", "قوة", "هدوء", "فرح", "تركيز", "إبداع",
  "شجاعة", "أمل", "نشاط", "طاقة", "ذكاء", "صبر",
];

const MUTAKHAFY_SENTENCE_RESPONSES = [
  "الشي اللي يخلي الحياة حلوة", "لو أقدر أسوي شي واحد",
  "أفضل شي ممكن يصير", "الحل هو التفكير", "كل شي يمشي",
  "المهم الصحة", "أبي أرتاح بس",
];

function handleMutakhafyBot(io, game, bot, config, phase, data) {
  const { handleMutakhafySubmit, handleMutakhafyGuess, handleMutakhafyFinalGuesses } = data;

  switch (phase) {
    case "activity": {
      if (!handleMutakhafySubmit || game.phase !== "activity") return;
      const type = game.currentActivity?.type;
      if (!type) return;

      let response;
      switch (type) {
        case "reaction":
          response = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
          break;
        case "binary":
          response = Math.random() < 0.5 ? "A" : "B";
          break;
        case "word":
          response = MUTAKHAFY_WORD_RESPONSES[Math.floor(Math.random() * MUTAKHAFY_WORD_RESPONSES.length)];
          break;
        case "sentence":
          response = MUTAKHAFY_SENTENCE_RESPONSES[Math.floor(Math.random() * MUTAKHAFY_SENTENCE_RESPONSES.length)];
          break;
        case "rank": {
          const items = game.currentActivity.data?.items;
          if (items) {
            // Random shuffle
            const shuffled = [...items].sort(() => Math.random() - 0.5);
            response = shuffled;
          }
          break;
        }
        case "rate":
          response = Math.floor(Math.random() * 5) + 1;
          break;
        case "who": {
          // Pick a random player (not self)
          const others = game.players.filter((p) => p.token !== bot.token);
          if (others.length > 0) {
            response = others[Math.floor(Math.random() * others.length)].token;
          }
          break;
        }
      }

      if (response !== undefined) {
        handleMutakhafySubmit(io, DUMMY_SOCKET, {
          roomCode: game.roomCode,
          token: bot.token,
          response,
        });
      }
      break;
    }
    case "guess": {
      if (!handleMutakhafyGuess || game.phase !== "guess") return;
      // Pick a random disguise that's not ours and guess a random real player
      const otherDisguises = game.players.filter((p) => p.fakeId !== bot.fakeId);
      const otherReals = game.players.filter((p) => p.token !== bot.token);
      if (otherDisguises.length > 0 && otherReals.length > 0) {
        const disguise = otherDisguises[Math.floor(Math.random() * otherDisguises.length)];
        const real = otherReals[Math.floor(Math.random() * otherReals.length)];
        handleMutakhafyGuess(io, DUMMY_SOCKET, {
          roomCode: game.roomCode,
          token: bot.token,
          fakeId: disguise.fakeId,
          guessedRealToken: real.token,
        });
      }
      break;
    }
    case "final-guess": {
      if (!handleMutakhafyFinalGuesses || game.phase !== "final-guess") return;
      // Submit guesses for all other disguises
      const otherDisguises = game.players.filter((p) => p.fakeId !== bot.fakeId);
      const otherReals = game.players.filter((p) => p.token !== bot.token);
      const guesses = otherDisguises.map((d) => ({
        fakeId: d.fakeId,
        guessedRealToken: otherReals[Math.floor(Math.random() * otherReals.length)].token,
      }));
      handleMutakhafyFinalGuesses(io, DUMMY_SOCKET, {
        roomCode: game.roomCode,
        token: bot.token,
        guesses,
      });
      break;
    }
  }
}
