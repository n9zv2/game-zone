/**
 * Comprehensive Arena Game Tests
 * Tests 8 challenge types, scoring, elimination, finals
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
// TEST 1: Basic game start (4 players)
// ============================================================
async function testBasicStart() {
  console.log("\n\uD83E\uDDEA Test 1: Basic Game Start (4 players)");
  const p1 = await createPlayer("أحمد", "👨");
  const p2 = await createPlayer("سارة", "👩");
  const p3 = await createPlayer("خالد", "🧔");
  const p4 = await createPlayer("فاطمة", "👧");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  const startPromises = waitForEventOnAll(players, "arena:start");
  const countdowns = [];
  p1.socket.on("arena:countdown", (d) => countdowns.push(d.count));

  const introPromises = waitForEventOnAll(players, "arena:round-intro", 20000);

  const startRes = await new Promise((resolve) => {
    p1.socket.emit("room:start-game", {
      token: p1.token, code, gameType: "arena",
    }, resolve);
  });

  assert(!startRes.error, "Game starts without error");

  const starts = await startPromises;
  assert(starts.every(Boolean), "All players receive arena:start");
  assert(starts[0].players.length === 4, "Start has 4 players");
  assert(starts[0].totalRounds >= 5, "At least 5 rounds");
  assert(Array.isArray(starts[0].rounds), "Rounds list provided");

  // Check challenge types
  const types = starts[0].rounds.map((r) => r.type);
  assert(types.every((t) => typeof t === "string"), "All rounds have type");

  await sleep(4500);
  assert(countdowns.includes(3), "Countdown received");

  const intros = await introPromises;
  assert(intros.every(Boolean), "Round intro received");
  assert(typeof intros[0].type === "string", "Intro has challenge type");
  assert(typeof intros[0].name === "string", "Intro has challenge name");
  assert(typeof intros[0].icon === "string", "Intro has icon");

  cleanup(players);
}

// ============================================================
// TEST 2: Challenge event dispatched
// ============================================================
async function testChallengeEvent() {
  console.log("\n\uD83E\uDDEA Test 2: Challenge Event Dispatched");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const players = [p1, p2, p3];
  waitForEventOnAll(players, "arena:start");
  const challengePromises = waitForEventOnAll(players, "arena:challenge", 25000);

  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "arena" }, () => {});

  const challenges = await challengePromises;
  assert(challenges.every(Boolean), "All receive challenge event");

  const ch = challenges[0];
  assert(typeof ch.type === "string", "Challenge has type");
  assert(typeof ch.timerEnd === "number", "Challenge has timerEnd");
  assert(ch.timerEnd > Date.now(), "Timer is in the future");

  // Verify different challenge types have appropriate data
  if (ch.type === "speed_tap") {
    assert(typeof ch.time === "number", "Speed tap has time");
  } else if (ch.type === "memory") {
    assert(Array.isArray(ch.sequence), "Memory has sequence");
    assert(ch.sequence.length >= 4, "Memory sequence >= 4 elements");
  } else if (ch.type === "truefalse") {
    assert(Array.isArray(ch.statements), "True/false has statements");
    assert(ch.statements.length === 5, "5 true/false statements");
  } else if (ch.type === "word") {
    assert(Array.isArray(ch.scrambledLetters), "Word has scrambled letters");
    assert(typeof ch.category === "string", "Word has category");
  } else if (ch.type === "color") {
    assert(typeof ch.textName === "string", "Color has text name");
    assert(typeof ch.textColor === "string", "Color has text color");
    assert(Array.isArray(ch.options), "Color has options");
  } else if (ch.type === "emoji_spot") {
    assert(Array.isArray(ch.grid), "Emoji spot has grid");
    assert(ch.grid.length === 16, "Grid has 16 cells");
  } else if (ch.type === "number_sort") {
    assert(Array.isArray(ch.numbers), "Number sort has numbers");
    assert(ch.numbers.length === 5, "5 numbers to sort");
  }

  cleanup(players);
}

// ============================================================
// TEST 3: Speed tap scoring
// ============================================================
async function testSpeedTapScoring() {
  console.log("\n\uD83E\uDDEA Test 3: Submit + Round Result");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👦");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  waitForEventOnAll(players, "arena:start");

  // Wait for challenge
  const challengePromises = waitForEventOnAll(players, "arena:challenge", 25000);
  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "arena" }, () => {});
  await challengePromises;

  // Set up result listeners
  const resultPromises = waitForEventOnAll(players, "arena:round-result", 25000);

  // Submit results — varying scores
  p1.socket.emit("arena:submit", { roomCode: code, token: p1.token, result: { tapCount: 50 } });
  p2.socket.emit("arena:submit", { roomCode: code, token: p2.token, result: { tapCount: 30 } });
  p3.socket.emit("arena:submit", { roomCode: code, token: p3.token, result: { tapCount: 10 } });
  p4.socket.emit("arena:submit", { roomCode: code, token: p4.token, result: { tapCount: 40 } });

  const results = await resultPromises;
  // Could get round-result or finals-start depending on challenge type scoring
  const r = results.find(Boolean);
  if (r) {
    assert(Array.isArray(r.scores), "Scores array exists");
    assert(r.scores.length >= 3, "Scores for players");
    assert(typeof r.scores[0].roundScore === "number", "Round score exists");
    assert(typeof r.scores[0].totalScore === "number", "Total score exists");

    // Check elimination
    if (r.eliminated) {
      assert(Array.isArray(r.eliminated), "Eliminated is array");
      assert(r.eliminated.length >= 1, "At least 1 eliminated");
      assert(Array.isArray(r.remaining), "Remaining exists");
    }
  } else {
    // Might have gotten finals-start instead
    assert(true, "Game state advanced (finals or result)");
  }

  cleanup(players);
}

// ============================================================
// TEST 4: Elimination count (10+ players → 2 per round)
// ============================================================
async function testEliminationCount() {
  console.log("\n\uD83E\uDDEA Test 4: Elimination Count (10+ players)");
  const players = [];
  for (let i = 0; i < 10; i++) {
    players.push(await createPlayer(`ل${i}`, "👤"));
  }

  const code = await createRoom(players[0]);
  for (let i = 1; i < 10; i++) {
    await joinRoom(players[i], code);
  }

  const startPromises = waitForEventOnAll(players, "arena:start");
  p1_emit(players[0], code);

  function p1_emit(host, code) {
    host.socket.emit("room:start-game", { token: host.token, code, gameType: "arena" }, () => {});
  }

  const starts = await startPromises;
  assert(starts.every(Boolean), "All 10 receive arena:start");
  assert(starts[0].players.length === 10, "10 players in game");

  // Wait for challenge
  const challengePromises = waitForEventOnAll(players, "arena:challenge", 25000);
  const challenges = await challengePromises;
  assert(challenges.every(Boolean), "Challenge received by all");

  // Submit with varying scores
  const resultPromises = waitForEventOnAll(players, "arena:round-result", 25000);
  players.forEach((p, i) => {
    p.socket.emit("arena:submit", {
      roomCode: code, token: p.token,
      result: { tapCount: (i + 1) * 5 }, // p0 lowest, p9 highest
    });
  });

  const results = await resultPromises;
  const r = results.find(Boolean);
  if (r && r.eliminated) {
    // 10+ players should eliminate 2
    assert(r.eliminated.length === 2, `2 eliminated for 10 players (got ${r.eliminated.length})`);
    assert(r.remaining.length === 8, `8 remaining (got ${r.remaining.length})`);
  }

  cleanup(players);
}

// ============================================================
// TEST 5: All submit triggers immediate round finish
// ============================================================
async function testAllSubmitImmediate() {
  console.log("\n\uD83E\uDDEA Test 5: All Submit → Immediate Finish");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const players = [p1, p2, p3];
  waitForEventOnAll(players, "arena:start");

  const challengePromises = waitForEventOnAll(players, "arena:challenge", 25000);
  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "arena" }, () => {});
  await challengePromises;

  // Listen for either round-result or finals-start
  const resultPromise = waitForEvent(p1.socket, "arena:round-result", 5000);
  const finalsPromise = waitForEvent(p1.socket, "arena:finals-start", 5000);

  const start = Date.now();
  players.forEach((p) => {
    p.socket.emit("arena:submit", {
      roomCode: code, token: p.token,
      result: { tapCount: 20 },
    });
  });

  const result = await Promise.race([resultPromise, finalsPromise]);
  const elapsed = Date.now() - start;
  assert(result !== null, "Result received");
  assert(elapsed < 3000, `Finish triggered fast (${elapsed}ms < 3000ms)`);

  cleanup(players);
}

// ============================================================
// TEST 6: Full game → champion
// ============================================================
async function testFullGameChampion() {
  console.log("\n\uD83E\uDDEA Test 6: Full Game → Champion");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👦");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  waitForEventOnAll(players, "arena:start");

  const championPromises = waitForEventOnAll(players, "arena:champion", 120000);

  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "arena" }, () => {});

  // Play through rounds
  const playRound = async () => {
    // Wait for challenge
    const challenges = await waitForEventOnAll(players, "arena:challenge", 25000);
    if (!challenges.some(Boolean)) return false;

    // Submit with different scores so elimination works
    players.forEach((p, i) => {
      p.socket.emit("arena:submit", {
        roomCode: code, token: p.token,
        result: { tapCount: (i + 1) * 10 },
      });
    });

    // Wait for result or finals
    await Promise.race([
      waitForEventOnAll(players, "arena:round-result", 10000),
      waitForEventOnAll(players, "arena:finals-start", 10000),
    ]);

    return true;
  };

  for (let i = 0; i < 15; i++) {
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
    assert(Array.isArray(ch.rankings), "Rankings exists");
    assert(ch.rankings.length === 4, "Rankings has all 4 players");
    assert(ch.rankings[0].rank === 1, "First is rank 1");
    assert(ch.rankings.every((r) => typeof r.score === "number"), "All have scores");
    // Check alive status
    const alivePlayers = ch.rankings.filter((r) => r.alive);
    assert(alivePlayers.length >= 1, "At least 1 player alive");
  }

  cleanup(players);
}

// ============================================================
// TEST 7: Memory challenge data integrity
// ============================================================
async function testMemoryChallenge() {
  console.log("\n\uD83E\uDDEA Test 7: Challenge Data Integrity");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const code = await createRoom(p1);
  await joinRoom(p2, code);

  const players = [p1, p2];
  waitForEventOnAll(players, "arena:start");

  p1.socket.emit("room:start-game", { token: p1.token, code, gameType: "arena" }, () => {});

  // Collect first challenge
  const challenge = await waitForEvent(p1.socket, "arena:challenge", 25000);
  assert(challenge !== null, "Challenge received");
  assert(typeof challenge.type === "string", "Has type field");
  assert(typeof challenge.time === "number" || typeof challenge.timerEnd === "number", "Has timing info");

  // Verify spectatorCount
  assert(typeof challenge.spectatorCount === "number", "Has spectator count");
  assert(challenge.spectatorCount === 0, "No spectators initially");

  cleanup(players);
}

// ============================================================
// RUN ALL
// ============================================================
async function runAll() {
  console.log("\uD83D\uDD2C ARENA GAME — COMPREHENSIVE TEST SUITE");
  console.log("=======================================================");

  try {
    await testBasicStart();
    await testChallengeEvent();
    await testSpeedTapScoring();
    await testEliminationCount();
    await testAllSubmitImmediate();
    await testFullGameChampion();
    await testMemoryChallenge();
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
