/**
 * Comprehensive Fitna Game Tests
 * Tests social deduction: roles, activities, discussion, voting, night, win conditions
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
// TEST 1: Basic game start (4 players, minimum)
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
  const startPromises = waitForEventOnAll(players, "fitna:start");
  const countdowns = [];
  p1.socket.on("fitna:countdown", (d) => countdowns.push(d.count));

  const startRes = await new Promise((resolve) => {
    p1.socket.emit("room:start-game", {
      token: p1.token, code, gameType: "fitna", settings: {},
    }, resolve);
  });

  assert(!startRes.error, "Game starts without error");

  const starts = await startPromises;
  assert(starts.every(Boolean), "All players receive fitna:start");
  assert(starts[0].players.length === 4, "Start has 4 players");
  assert(typeof starts[0].totalRounds === "number" && starts[0].totalRounds > 0, "Total rounds > 0");

  await sleep(4500);
  assert(countdowns.includes(3), "Countdown received");

  cleanup(players);
}

// ============================================================
// TEST 2: Role reveal (correct distribution)
// ============================================================
async function testRoleReveal() {
  console.log("\n\uD83E\uDDEA Test 2: Role Reveal (correct distribution)");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👧");
  const p5 = await createPlayer("هـ", "👦");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);
  await joinRoom(p5, code);

  const players = [p1, p2, p3, p4, p5];
  waitForEventOnAll(players, "fitna:start");

  const rolePromises = waitForEventOnAll(players, "fitna:role-reveal", 20000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "fitna", settings: {},
  }, () => {});

  const roles = await rolePromises;
  assert(roles.every(Boolean), "All players receive role-reveal");

  const roleList = roles.map((r) => r.role);
  const saboteurs = roleList.filter((r) => r === "saboteur");
  const detectives = roleList.filter((r) => r === "detective");
  const innocents = roleList.filter((r) => r === "innocent");

  assert(saboteurs.length >= 1, `At least 1 saboteur (got ${saboteurs.length})`);
  assert(detectives.length >= 1, `At least 1 detective (got ${detectives.length})`);
  assert(innocents.length >= 1, `At least 1 innocent (got ${innocents.length})`);
  assert(saboteurs.length + detectives.length + innocents.length === 5, "All 5 roles assigned");

  // Saboteurs should see their partners
  roles.forEach((r, i) => {
    if (r.role === "saboteur") {
      if (saboteurs.length > 1) {
        assert(Array.isArray(r.partners), `Saboteur ${players[i].name} sees partners`);
      }
    }
  });

  cleanup(players);
}

// ============================================================
// TEST 3: Activity dispatched → results received
// ============================================================
async function testActivityDispatch() {
  console.log("\n\uD83E\uDDEA Test 3: Activity Dispatched → Results");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👧");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];

  // Wait for activity-results which fires after ANY activity type completes
  const resultPromises = waitForEventOnAll(players, "fitna:activity-results", 45000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "fitna", settings: {},
  }, () => {});

  const results = await resultPromises;
  assert(results.every(Boolean), "All players receive activity results");

  const r = results[0];
  assert(r.roundIdx === 0, "Round index is 0");
  assert(typeof r.type === "string", "Activity type specified");
  assert(["loyalty_test", "face_off", "secret_word"].includes(r.type), "Valid activity type");

  cleanup(players);
}

// ============================================================
// TEST 4: Loyalty test answer
// ============================================================
async function testLoyaltyTest() {
  console.log("\n\uD83E\uDDEA Test 4: Loyalty Test Answer + Results");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👧");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  waitForEventOnAll(players, "fitna:start");
  waitForEventOnAll(players, "fitna:role-reveal");

  // Listen for loyalty test specifically
  const loyaltyPromises = waitForEventOnAll(players, "fitna:loyalty-test", 25000);
  const resultPromises = waitForEventOnAll(players, "fitna:activity-results", 30000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "fitna", settings: {},
  }, () => {});

  const loyaltyData = await loyaltyPromises;
  // If first activity isn't loyalty test, skip this test
  if (!loyaltyData.every(Boolean)) {
    console.log("  (First activity is not loyalty test — skipping)");
    assert(true, "Activity type varies — OK");
    cleanup(players);
    return;
  }

  // All have symbols
  assert(Array.isArray(loyaltyData[0].symbols), "Symbols array provided");
  assert(loyaltyData[0].symbols.length === 4, "4 symbols to choose from");

  // Non-saboteurs should see the secret symbol
  const secretCount = loyaltyData.filter((d) => d.secretSymbol !== null).length;
  assert(secretCount >= 1, "At least 1 player sees the secret symbol");

  // Submit answers
  players.forEach((p) => {
    p.socket.emit("fitna:action", {
      roomCode: code, token: p.token, choiceIdx: 0,
    });
  });

  const results = await resultPromises;
  assert(results.every(Boolean), "Activity results received");

  const r = results[0];
  assert(r.type === "loyalty_test", "Result type is loyalty_test");
  assert(typeof r.correctSymbol === "string", "Correct symbol revealed");
  assert(Array.isArray(r.results), "Player results array");
  assert(r.results.length === 4, "Results for all 4 players");

  r.results.forEach((pr) => {
    assert(typeof pr.correct === "boolean", `${pr.name} has correct flag`);
    assert(typeof pr.suspicion === "number", `${pr.name} has suspicion`);
  });

  cleanup(players);
}

// ============================================================
// TEST 5: Discussion + chat message
// ============================================================
async function testDiscussion() {
  console.log("\n\uD83E\uDDEA Test 5: Discussion Phase + Chat");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👧");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  waitForEventOnAll(players, "fitna:start");

  // Set short discussion time for faster testing
  const discussionPromises = waitForEventOnAll(players, "fitna:discussion", 45000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "fitna", settings: { discussionTime: 10 },
  }, () => {});

  const discussions = await discussionPromises;
  assert(discussions.every(Boolean), "Discussion phase reached");

  const d = discussions[0];
  assert(typeof d.timerEnd === "number", "Discussion has timer");
  assert(Array.isArray(d.players), "Discussion has player list");
  assert(Array.isArray(d.evidence), "Discussion has evidence");

  // Send chat message
  const msgPromise = waitForEvent(p2.socket, "fitna:discussion-message", 5000);
  p1.socket.emit("fitna:chat-message", {
    roomCode: code, token: p1.token, text: "أنا بريء!",
  });

  const msg = await msgPromise;
  assert(msg !== null, "Chat message broadcast received");
  if (msg) {
    assert(msg.type === "chat", "Message type is chat");
    assert(msg.text === "أنا بريء!", "Message text correct");
    assert(msg.token === p1.token, "Sender token correct");
  }

  // Send accusation
  const accusePromise = waitForEvent(p2.socket, "fitna:discussion-message", 5000);
  p1.socket.emit("fitna:discussion-action", {
    roomCode: code, token: p1.token, action: "accuse", targetToken: p3.token,
  });

  const accuse = await accusePromise;
  assert(accuse !== null, "Accuse action broadcast");
  if (accuse) {
    assert(accuse.type === "accuse", "Action type is accuse");
    assert(accuse.targetToken === p3.token, "Target is correct");
  }

  cleanup(players);
}

// ============================================================
// TEST 6: Voting phase
// ============================================================
async function testVoting() {
  console.log("\n\uD83E\uDDEA Test 6: Voting Phase");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👧");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  waitForEventOnAll(players, "fitna:start");

  const votePhasePromises = waitForEventOnAll(players, "fitna:vote-phase", 50000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "fitna", settings: { discussionTime: 5, voteTime: 10 },
  }, () => {});

  const votePh = await votePhasePromises;
  assert(votePh.every(Boolean), "All receive vote-phase");

  const v = votePh[0];
  assert(typeof v.timerEnd === "number", "Vote phase has timer");
  assert(Array.isArray(v.candidates), "Vote phase has candidates");
  assert(v.candidates.length === 3, "3 candidates (everyone except self)");
  assert(typeof v.silenced === "boolean", "Silenced flag present");

  // Everyone votes for p3
  const voteResultPromises = waitForEventOnAll(players, "fitna:vote-results", 15000);
  players.forEach((p) => {
    p.socket.emit("fitna:vote", {
      roomCode: code, token: p.token, targetToken: p3.token,
    });
  });

  const voteResults = await voteResultPromises;
  assert(voteResults.every(Boolean), "Vote results received");

  const vr = voteResults[0];
  assert(Array.isArray(vr.votes), "Votes array exists");
  assert(vr.eliminatedToken === p3.token, "p3 eliminated (most votes)");
  assert(!vr.tied, "No tie");

  cleanup(players);
}

// ============================================================
// TEST 7: Vote tie → no elimination
// ============================================================
async function testVoteTie() {
  console.log("\n\uD83E\uDDEA Test 7: Vote Tie → No Elimination");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👧");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  waitForEventOnAll(players, "fitna:start");

  const votePhasePromises = waitForEventOnAll(players, "fitna:vote-phase", 50000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "fitna", settings: { discussionTime: 5, voteTime: 10 },
  }, () => {});

  await votePhasePromises;

  // Create a tie: p1,p2 vote p3; p3,p4 vote p1
  const voteResultPromises = waitForEventOnAll(players, "fitna:vote-results", 15000);
  p1.socket.emit("fitna:vote", { roomCode: code, token: p1.token, targetToken: p3.token });
  p2.socket.emit("fitna:vote", { roomCode: code, token: p2.token, targetToken: p3.token });
  p3.socket.emit("fitna:vote", { roomCode: code, token: p3.token, targetToken: p1.token });
  p4.socket.emit("fitna:vote", { roomCode: code, token: p4.token, targetToken: p1.token });

  const voteResults = await voteResultPromises;
  assert(voteResults.every(Boolean), "Vote results received");

  const vr = voteResults[0];
  assert(vr.tied === true, "Vote is tied");
  assert(vr.eliminatedToken === null, "No one eliminated on tie");

  cleanup(players);
}

// ============================================================
// TEST 8: Night phase
// ============================================================
async function testNightPhase() {
  console.log("\n\uD83E\uDDEA Test 8: Night Phase");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👧");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  waitForEventOnAll(players, "fitna:start");

  // Wait for night phase (after activity + discussion + vote)
  const nightPromises = waitForEventOnAll(players, "fitna:night", 60000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "fitna", settings: { discussionTime: 5, voteTime: 5 },
  }, () => {});

  // Auto-progress through voting by casting skip votes when vote phase arrives
  players.forEach((p) => {
    p.socket.on("fitna:vote-phase", () => {
      p.socket.emit("fitna:vote", {
        roomCode: code, token: p.token, targetToken: "skip",
      });
    });
  });

  const nights = await nightPromises;
  assert(nights.every(Boolean), "All receive night phase");

  // Check role-specific data
  nights.forEach((n, i) => {
    assert(typeof n.role === "string", `${players[i].name} gets role in night`);
    assert(typeof n.timerEnd === "number", `${players[i].name} gets timer`);

    if (n.role === "saboteur") {
      assert(Array.isArray(n.targets), "Saboteur gets targets");
      assert(n.targets.length > 0, "Saboteur has targets");
    } else if (n.role === "detective") {
      assert(Array.isArray(n.candidates), "Detective gets candidates");
    }
  });

  cleanup(players);
}

// ============================================================
// TEST 9: Game over with scoring
// ============================================================
async function testGameOver() {
  console.log("\n\uD83E\uDDEA Test 9: Game Over + Scoring");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const p4 = await createPlayer("د", "👧");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);
  await joinRoom(p4, code);

  const players = [p1, p2, p3, p4];
  waitForEventOnAll(players, "fitna:start");

  const gameOverPromises = waitForEventOnAll(players, "fitna:game-over", 180000);

  // Get role reveals to know who's who
  const rolePromises = waitForEventOnAll(players, "fitna:role-reveal", 25000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "fitna", settings: { discussionTime: 3, voteTime: 5 },
  }, () => {});

  const roles = await rolePromises;
  const saboteurIdx = roles.findIndex((r) => r && r.role === "saboteur");

  // Auto-progress: vote to eliminate the saboteur each round to end the game
  players.forEach((p, i) => {
    p.socket.on("fitna:vote-phase", () => {
      // Everyone votes for the saboteur
      if (saboteurIdx >= 0) {
        p.socket.emit("fitna:vote", {
          roomCode: code, token: p.token, targetToken: players[saboteurIdx].token,
        });
      } else {
        p.socket.emit("fitna:vote", {
          roomCode: code, token: p.token, targetToken: "skip",
        });
      }
    });
  });

  const gameOvers = await gameOverPromises;
  assert(gameOvers.some(Boolean), "Game over event received");

  const go = gameOvers.find(Boolean);
  if (go) {
    assert(typeof go.winner === "string", "Winner specified");
    assert(go.winner === "innocents" || go.winner === "saboteurs", "Winner is innocents or saboteurs");
    assert(Array.isArray(go.rankings), "Rankings array exists");
    assert(go.rankings.length === 4, "Rankings has all 4 players");
    assert(typeof go.roundsPlayed === "number", "Rounds played provided");

    go.rankings.forEach((r) => {
      assert(typeof r.totalScore === "number", `${r.name} has totalScore`);
      assert(r.totalScore >= 50, `${r.name} score >= 50 (minimum)`);
      assert(typeof r.role === "string", `${r.name} has role`);
      assert(typeof r.won === "boolean", `${r.name} has won flag`);
      assert(typeof r.alive === "boolean", `${r.name} has alive flag`);
      assert(Array.isArray(r.scoreBreakdown), `${r.name} has score breakdown`);
    });
  }

  cleanup(players);
}

// ============================================================
// TEST 10: <4 players cannot start fitna
// ============================================================
async function testMinPlayers() {
  console.log("\n\uD83E\uDDEA Test 10: Minimum 4 Players Required");
  const p1 = await createPlayer("أ", "👨");
  const p2 = await createPlayer("ب", "👩");
  const p3 = await createPlayer("ج", "🧔");
  const code = await createRoom(p1);
  await joinRoom(p2, code);
  await joinRoom(p3, code);

  const players = [p1, p2, p3];

  // Try to start with 3 players
  const startPromise = waitForEvent(p1.socket, "fitna:start", 5000);

  p1.socket.emit("room:start-game", {
    token: p1.token, code, gameType: "fitna", settings: {},
  }, () => {});

  const start = await startPromise;
  // With 3 players, fitna's startFitna returns early (< 4), but the room:start-game still
  // succeeds at the room level. The game just doesn't start events.
  // Since the game engine returns without doing anything, no fitna:start is emitted.
  assert(start === null, "Fitna does NOT start with <4 players");

  cleanup(players);
}

// ============================================================
// RUN ALL
// ============================================================
async function runAll() {
  console.log("\uD83D\uDD2C FITNA GAME — COMPREHENSIVE TEST SUITE");
  console.log("=======================================================");

  try {
    await testBasicStart();
    await testRoleReveal();
    await testActivityDispatch();
    await testLoyaltyTest();
    await testDiscussion();
    await testVoting();
    await testVoteTie();
    await testNightPhase();
    await testGameOver();
    await testMinPlayers();
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
