/**
 * Comprehensive Pyramid Game Tests
 * Tests quiz battle royale: questions, scoring, elimination, lifelines, finals
 */
import { io } from "socket.io-client";

const URL = "http://localhost:3001";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name) {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`  \u2705 ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  \u274C ${name}`);
  }
}

function createSocket() {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ["websocket"], forceNew: true });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
    setTimeout(() => reject(new Error("Socket timeout")), 5000);
  });
}

async function createPlayer(name, avatar) {
  const s = await createSocket();
  return new Promise((resolve) => {
    s.emit("session:create", { name, avatar }, (res) => {
      resolve({ socket: s, token: res.token, name });
    });
  });
}

async function createRoom(host) {
  return new Promise((resolve) => {
    host.socket.emit("room:create", { token: host.token }, (res) => {
      resolve(res.code);
    });
  });
}

async function joinRoom(player, code) {
  return new Promise((resolve) => {
    player.socket.emit("room:join", { token: player.token, code }, (res) => {
      resolve(res);
    });
  });
}

function waitForEvent(socket, event, timeout = 15000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function waitForEventOnAll(players, event, timeout = 15000) {
  return Promise.all(players.map((p) => waitForEvent(p.socket, event, timeout)));
}

function cleanup(players) {
  players.forEach((p) => p.socket.disconnect());
}

// ============================================================
// TEST 1: Basic game start (3 players)
// ============================================================
async function testBasicStart() {
  console.log("\n\uD83E\uDDEA Test 1: Basic Game Start (3 players)");
  const p1 = await createPlayer("أحمد", "👨");
  const p2 = await createPlayer("سارة", "👩");
  const p3 = await createPlayer("خالد", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const startPromises = waitForEventOnAll([p1, p2, p3], "pyramid:start");
  const countdowns = [];
  p1.socket.on("pyramid:countdown", (d) => countdowns.push(d.count));

  // Set up round listeners before starting
  const roundPromises = waitForEventOnAll([p1, p2, p3], "pyramid:round", 20000);

  const startRes = await new Promise((resolve) => {
    p1.socket.emit("room:start-game", {
      token: p1.token, code, gameType: "pyramid",
    }, resolve);
  });

  assert(!startRes.error, "Game starts without error");

  const starts = await startPromises;
  assert(starts.every(Boolean), "All players receive pyramid:start");
  assert(starts[0].players.length === 3, "Start has 3 players");
  assert(starts[0].totalRounds >= 5, "Total rounds >= 5 (min)");
  assert(starts[0].totalRounds <= 15, "Total rounds <= 15 (max)");

  // Wait for countdown
  await sleep(4500);
  assert(countdowns.includes(3) && countdowns.includes(1), "Countdown events (3,2,1)");

  // Wait for first round
  const rounds = await roundPromises;
  assert(rounds.every(Boolean), "All players receive first round");

  const r = rounds[0];
  assert(r.roundIdx === 0, "Round index is 0");
  assert(r.question && r.question.length > 0, "Question text exists");
  assert(Array.isArray(r.options) && r.options.length === 4, "4 options provided");
  assert(typeof r.timerEnd === "number", "Timer end timestamp provided");
  assert(typeof r.difficulty === "string", "Difficulty provided");
  assert(r.lifelines && r.lifelines.skip === 1 && r.lifelines.fifty === 1 && r.lifelines.time === 1, "All lifelines available");
  assert(r.streak === 0, "Streak starts at 0");
  assert(r.score === 0, "Score starts at 0");

  cleanup([p1, p2, p3]);
}

// ============================================================
// TEST 2: Correct answer scoring
// ============================================================
async function testCorrectAnswer() {
  console.log("\n\uD83E\uDDEA Test 2: Correct Answer Scoring");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  waitForEventOnAll([p1, p2, p3], "pyramid:start");

  const roundPromises = waitForEventOnAll([p1, p2, p3], "pyramid:round", 20000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "pyramid",
  }, () => {});

  await roundPromises;
  await sleep(500);

  // Set up result listeners
  const resultPromises = waitForEventOnAll([p1, p2, p3], "pyramid:round-result", 20000);

  // All answer correctly (answer index doesn't matter — we just test the flow)
  // We need to find the correct answer, but since we can't know it from the question alone,
  // let's just submit answers and check the flow works
  [p1, p2, p3].forEach((p) => {
    p.socket.emit("pyramid:answer", {
      roomCode: code, token: p.token, answerIdx: 0,
    });
  });

  const results = await resultPromises;
  assert(results.every(Boolean), "All receive round-result");
  assert(typeof results[0].correctIdx === "number", "Correct index revealed");
  assert(Array.isArray(results[0].results), "Results array exists");
  assert(results[0].results.length === 3, "Results for all 3 players");

  const r0 = results[0];
  r0.results.forEach((r) => {
    assert(typeof r.correct === "boolean", `${r.name} has correct flag`);
    assert(typeof r.points === "number", `${r.name} has points`);
    assert(typeof r.totalScore === "number", `${r.name} has totalScore`);
  });

  assert(Array.isArray(r0.eliminated), "Eliminated array exists");
  assert(Array.isArray(r0.remaining), "Remaining array exists");

  cleanup([p1, p2, p3]);
}

// ============================================================
// TEST 3: Wrong answer elimination
// ============================================================
async function testElimination() {
  console.log("\n\uD83E\uDDEA Test 3: Wrong Answer Elimination");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👦");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  waitForEventOnAll(players, "pyramid:start");

  // Wait for round
  const roundPromises = waitForEventOnAll(players, "pyramid:round", 20000);
  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "pyramid" }, () => {});
  const rounds = await roundPromises;

  // Set up result listeners
  const resultPromises = waitForEventOnAll(players, "pyramid:round-result", 20000);

  // p1, p2 answer one index; p3, p4 answer a different one
  // At least someone should be eliminated
  const correctIdx = rounds[0].options.length - 1; // Guess last option
  [p1, p2].forEach((p) => {
    p.socket.emit("pyramid:answer", { roomCode: code, token: p.token, answerIdx: 0 });
  });
  [p3, p4].forEach((p) => {
    p.socket.emit("pyramid:answer", { roomCode: code, token: p.token, answerIdx: correctIdx });
  });

  const results = await resultPromises;
  assert(results.every(Boolean), "All receive round-result");

  const r = results[0];
  const correctPlayers = r.results.filter((p) => p.correct);
  const wrongPlayers = r.results.filter((p) => !p.correct);

  // If some are wrong, they should be eliminated (unless all wrong)
  if (wrongPlayers.length > 0 && wrongPlayers.length < 4) {
    assert(r.eliminated.length > 0, "Wrong players are eliminated");
    assert(r.remaining.length < 4, "Remaining count decreased");
  } else {
    // All correct or all wrong — no elimination or keep best
    assert(r.remaining.length >= 1, "At least 1 player remains");
  }

  cleanup(players);
}

// ============================================================
// TEST 4: Skip lifeline
// ============================================================
async function testSkipLifeline() {
  console.log("\n\uD83E\uDDEA Test 4: Skip Lifeline");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const players = [p1, p2, p3];
  waitForEventOnAll(players, "pyramid:start");
  const roundPromises = waitForEventOnAll(players, "pyramid:round", 20000);
  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "pyramid" }, () => {});
  await roundPromises;

  // p1 uses skip lifeline
  const lifelinePromise = waitForEvent(p1.socket, "pyramid:lifeline-used", 5000);
  p1.socket.emit("pyramid:lifeline", { roomCode: code, token: p1.token, type: "skip" });

  const lifelineData = await lifelinePromise;
  assert(lifelineData !== null, "Skip lifeline acknowledged");
  assert(lifelineData.type === "skip", "Type is skip");
  assert(lifelineData.lifelines.skip === 0, "Skip count decremented to 0");
  assert(typeof lifelineData.bonusPoints === "number" && lifelineData.bonusPoints > 0, "Bonus points awarded");

  // Trying skip again should not work
  const lifelinePromise2 = waitForEvent(p1.socket, "pyramid:lifeline-used", 2000);
  p1.socket.emit("pyramid:lifeline", { roomCode: code, token: p1.token, type: "skip" });
  const lifelineData2 = await lifelinePromise2;
  assert(lifelineData2 === null, "Cannot use skip twice");

  // Other players answer to finish the round
  [p2, p3].forEach((p) => {
    p.socket.emit("pyramid:answer", { roomCode: code, token: p.token, answerIdx: 0 });
  });

  const resultPromises = waitForEventOnAll(players, "pyramid:round-result", 20000);
  const results = await resultPromises;
  assert(results.every(Boolean), "Round completes after skip");

  // p1 should be treated as correct (skip marker)
  const p1Result = results[0].results.find((r) => r.token === p1.token);
  assert(p1Result && p1Result.correct, "Skip player treated as correct");

  cleanup(players);
}

// ============================================================
// TEST 5: Fifty-fifty lifeline
// ============================================================
async function testFiftyLifeline() {
  console.log("\n\uD83E\uDDEA Test 5: Fifty-Fifty Lifeline");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const players = [p1, p2, p3];
  waitForEventOnAll(players, "pyramid:start");
  const roundPromises = waitForEventOnAll(players, "pyramid:round", 20000);
  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "pyramid" }, () => {});
  await roundPromises;

  const lifelinePromise = waitForEvent(p1.socket, "pyramid:lifeline-used", 5000);
  p1.socket.emit("pyramid:lifeline", { roomCode: code, token: p1.token, type: "fifty" });

  const data = await lifelinePromise;
  assert(data !== null, "Fifty lifeline acknowledged");
  assert(data.type === "fifty", "Type is fifty");
  assert(data.lifelines.fifty === 0, "Fifty count decremented");
  assert(Array.isArray(data.hidden) && data.hidden.length === 2, "2 options hidden");

  // Hidden options should be wrong answers (indices 0-3 minus correct)
  assert(data.hidden.every((h) => typeof h === "number" && h >= 0 && h <= 3), "Hidden are valid indices");

  cleanup(players);
}

// ============================================================
// TEST 6: Time lifeline
// ============================================================
async function testTimeLifeline() {
  console.log("\n\uD83E\uDDEA Test 6: Time Lifeline");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const players = [p1, p2, p3];
  waitForEventOnAll(players, "pyramid:start");
  const roundPromises = waitForEventOnAll(players, "pyramid:round", 20000);
  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "pyramid" }, () => {});
  await roundPromises;

  const lifelinePromise = waitForEvent(p1.socket, "pyramid:lifeline-used", 5000);
  p1.socket.emit("pyramid:lifeline", { roomCode: code, token: p1.token, type: "time" });

  const data = await lifelinePromise;
  assert(data !== null, "Time lifeline acknowledged");
  assert(data.type === "time", "Type is time");
  assert(data.lifelines.time === 0, "Time count decremented");
  assert(typeof data.newTimerEnd === "number", "New timer end provided");
  assert(data.newTimerEnd > Date.now(), "New timer is in the future");

  cleanup(players);
}

// ============================================================
// TEST 7: All players answer triggers reveal immediately
// ============================================================
async function testAllAnswered() {
  console.log("\n\uD83E\uDDEA Test 7: All Answer → Immediate Reveal");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const players = [p1, p2, p3];
  waitForEventOnAll(players, "pyramid:start");
  const roundPromises = waitForEventOnAll(players, "pyramid:round", 20000);
  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "pyramid" }, () => {});
  await roundPromises;

  const resultPromises = waitForEventOnAll(players, "pyramid:round-result", 5000);

  const start = Date.now();
  players.forEach((p) => {
    p.socket.emit("pyramid:answer", { roomCode: code, token: p.token, answerIdx: 0 });
  });

  const results = await resultPromises;
  const elapsed = Date.now() - start;

  assert(results.every(Boolean), "Round result received");
  assert(elapsed < 3000, `Reveal triggered fast (${elapsed}ms < 3000ms)`);

  cleanup(players);
}

// ============================================================
// TEST 8: Game ends with champion
// ============================================================
async function testChampion() {
  console.log("\n\uD83E\uDDEA Test 8: Full Game → Champion");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const players = [p1, p2, p3];
  waitForEventOnAll(players, "pyramid:start");

  // Set up champion listener early
  const championPromises = waitForEventOnAll(players, "pyramid:champion", 120000);

  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "pyramid" }, () => {});

  // Play through rounds — everyone answers index 0 each round
  const playRound = async () => {
    const rounds = await waitForEventOnAll(players, "pyramid:round", 20000);
    if (!rounds.every(Boolean)) return false;

    // All answer
    players.forEach((p) => {
      p.socket.emit("pyramid:answer", { roomCode: code, token: p.token, answerIdx: 0 });
    });

    const results = await waitForEventOnAll(players, "pyramid:round-result", 20000);
    return results.every(Boolean);
  };

  // Play up to 20 rounds or until champion
  for (let i = 0; i < 20; i++) {
    const gotRound = await playRound();
    if (!gotRound) break;
    await sleep(4200);
  }

  const champions = await championPromises;
  assert(champions.some(Boolean), "Champion event received");

  const ch = champions.find(Boolean);
  if (ch) {
    assert(ch.champion && ch.champion.token, "Champion has token");
    assert(ch.champion.name, "Champion has name");
    assert(typeof ch.champion.score === "number", "Champion has score");
    assert(Array.isArray(ch.rankings), "Rankings array exists");
    assert(ch.rankings.length === 3, "Rankings has all 3 players");
    assert(ch.rankings[0].rank === 1, "First ranking is rank 1");
    assert(ch.rankings.every((r) => typeof r.score === "number"), "All rankings have scores");
  }

  cleanup(players);
}

// ============================================================
// TEST 9: Solo mode
// ============================================================
async function testSoloMode() {
  console.log("\n\uD83E\uDDEA Test 9: Solo Mode");
  const p1 = await createPlayer("سولو", "🦸");

  const startPromise = waitForEvent(p1.socket, "pyramid:start", 10000);

  const res = await new Promise((resolve) => {
    p1.socket.emit("room:solo-start", { token: p1.token }, resolve);
  });

  assert(!res.error, "Solo start without error");
  assert(res.code && res.code.length === 5, "Room code provided");

  const start = await startPromise;
  assert(start !== null, "Pyramid start received");
  assert(start.players.length === 1, "1 player in solo");
  assert(start.totalRounds === 20, "Solo has 20 rounds");

  // Play 1 round
  const roundData = await waitForEvent(p1.socket, "pyramid:round", 20000);
  assert(roundData !== null, "First round received");

  const resultPromise = waitForEvent(p1.socket, "pyramid:round-result", 20000);
  p1.socket.emit("pyramid:answer", { roomCode: res.code, token: p1.token, answerIdx: 0 });

  const result = await resultPromise;
  assert(result !== null, "Round result received in solo");
  assert(result.eliminated.length === 0, "No elimination in solo");

  cleanup([p1]);
}

// ============================================================
// TEST 10: Streak scoring
// ============================================================
async function testStreakScoring() {
  console.log("\n\uD83E\uDDEA Test 10: Streak Increments on Correct Answers");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const players = [p1, p2, p3];
  waitForEventOnAll(players, "pyramid:start");
  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "pyramid" }, () => {});

  // Play 2 rounds
  let lastResult = null;
  for (let i = 0; i < 2; i++) {
    const rounds = await waitForEventOnAll(players, "pyramid:round", 20000);
    if (!rounds.every(Boolean)) break;

    const resultPromises = waitForEventOnAll(players, "pyramid:round-result", 20000);
    players.forEach((p) => {
      p.socket.emit("pyramid:answer", { roomCode: code, token: p.token, answerIdx: 0 });
    });
    lastResult = await resultPromises;
    if (i < 1) await sleep(4200);
  }

  assert(lastResult && lastResult.every(Boolean), "Both rounds completed");

  // After 2 rounds, check streak values
  if (lastResult && lastResult[0]) {
    const r = lastResult[0].results;
    r.forEach((p) => {
      if (p.correct) {
        // If correct in both rounds, streak should be 2
        // If correct only in round 2, streak should be 1
        assert(p.streak >= 1, `${p.name} streak >= 1 after correct answer`);
      }
    });
  }

  cleanup(players);
}

// ============================================================
// RUN ALL
// ============================================================
async function runAll() {
  console.log("\uD83D\uDD2C PYRAMID GAME — COMPREHENSIVE TEST SUITE");
  console.log("=======================================================");

  try {
    await testBasicStart();
    await testCorrectAnswer();
    await testElimination();
    await testSkipLifeline();
    await testFiftyLifeline();
    await testTimeLifeline();
    await testAllAnswered();
    await testChampion();
    await testSoloMode();
    await testStreakScoring();
  } catch (e) {
    console.error("\n\u26A0\uFE0F Fatal error:", e.message);
  }

  console.log("\n=======================================================");
  console.log(`\uD83D\uDCCA Results: ${passed}/${totalTests} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log("=======================================================");
  process.exit(failed > 0 ? 1 : 0);
}

runAll();
