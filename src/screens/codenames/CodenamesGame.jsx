import { useState, useCallback, useEffect, useRef } from "react";
import useSocket from "../../hooks/useSocket.js";
import CodenamesTeams from "./CodenamesTeams.jsx";
import CodenamesBoard from "./CodenamesBoard.jsx";
import CodenamesClue from "./CodenamesClue.jsx";
import CodenamesGameOver from "./CodenamesGameOver.jsx";
import { C } from "../../theme.js";
import ReactionBar from "../../components/ReactionBar.jsx";
import LeaveGameBtn from "../../components/LeaveGameBtn.jsx";

export default function CodenamesGame({ token, roomCode, onFinish, onLeave }) {
  const [phase, setPhase] = useState("waiting");
  const [myTeam, setMyTeam] = useState(null);
  const [isSpymaster, setIsSpymaster] = useState(false);
  const [currentTeam, setCurrentTeam] = useState("red");
  const [grid, setGrid] = useState([]);
  const [teams, setTeams] = useState(null);
  const [clue, setClue] = useState(null);
  const [guessesLeft, setGuessesLeft] = useState(0);
  const [timerEnd, setTimerEnd] = useState(0);
  const [redTotal, setRedTotal] = useState(9);
  const [blueTotal, setBlueTotal] = useState(8);
  const [redFound, setRedFound] = useState(0);
  const [blueFound, setBlueFound] = useState(0);
  const [gameOverData, setGameOverData] = useState(null);
  const [countdownNum, setCountdownNum] = useState(0);
  const [lastReveal, setLastReveal] = useState(null);
  const [clueHistory, setClueHistory] = useState([]);
  const [timerWarning, setTimerWarning] = useState(false);
  const [switchCountdown, setSwitchCountdown] = useState(0);
  const switchRef = useRef(null);

  // Game start — initial data
  useSocket("codenames:start", useCallback((data) => {
    setMyTeam(data.myTeam);
    setIsSpymaster(data.isSpymaster);
    setCurrentTeam(data.currentTeam);
    setGrid(data.grid);
    setTeams(data.teams);
    setRedTotal(data.redTotal);
    setBlueTotal(data.blueTotal);
    setRedFound(data.redFound || 0);
    setBlueFound(data.blueFound || 0);
    setClueHistory(data.clueHistory || []);
    setPhase(data.phase || "countdown");
  }, []));

  // Countdown ticks
  useSocket("codenames:countdown", useCallback((data) => {
    setCountdownNum(data.count);
    setPhase("countdown");
  }, []));

  // Phase change (team-reveal after countdown)
  useSocket("codenames:phase", useCallback((data) => {
    setPhase(data.phase);
  }, []));

  // Turn start
  useSocket("codenames:turn", useCallback((data) => {
    setCurrentTeam(data.currentTeam);
    setTimerEnd(data.timerEnd);
    setClue(null);
    setGuessesLeft(0);
    setTimerWarning(false);
    setLastReveal(null);
    setPhase("spymaster-turn");
  }, []));

  // Clue given
  useSocket("codenames:clue", useCallback((data) => {
    setCurrentTeam(data.currentTeam);
    setClue(data.clue);
    setGuessesLeft(data.guessesLeft);
    setTimerEnd(data.timerEnd);
    setTimerWarning(false);
    if (data.clueHistory) setClueHistory(data.clueHistory);
    setPhase("guesser-turn");
  }, []));

  // Word revealed
  useSocket("codenames:reveal", useCallback((data) => {
    setGrid((prev) => prev.map((cell, i) =>
      i === data.wordIndex ? { ...cell, revealed: true, type: data.type } : cell
    ));
    if (data.type === "red") setRedFound((p) => p + 1);
    if (data.type === "blue") setBlueFound((p) => p + 1);
    setLastReveal({ wordIndex: data.wordIndex, type: data.type, resultType: data.resultType });
    // Clear reveal feedback after 1.5s
    setTimeout(() => setLastReveal(null), 1500);
  }, []));

  // Guesses update
  useSocket("codenames:guess-update", useCallback((data) => {
    setGuessesLeft(data.guessesLeft);
    if (data.redFound !== undefined) setRedFound(data.redFound);
    if (data.blueFound !== undefined) setBlueFound(data.blueFound);
  }, []));

  // Switch team
  useSocket("codenames:switch-team", useCallback((data) => {
    setCurrentTeam(data.currentTeam);
    setClue(null);
    setPhase("switching");
    // Mini countdown for switching
    const duration = Math.ceil((data.switchDuration || 3000) / 1000);
    setSwitchCountdown(duration);
  }, []));

  // Timer warning
  useSocket("codenames:timer-warning", useCallback(() => {
    setTimerWarning(true);
  }, []));

  // Game over
  useSocket("codenames:game-over", useCallback((data) => {
    setGameOverData(data);
    setPhase("game-over");
  }, []));

  // Reconnect — restore full state
  useSocket("codenames:reconnect", useCallback((data) => {
    setMyTeam(data.myTeam);
    setIsSpymaster(data.isSpymaster);
    setCurrentTeam(data.currentTeam);
    setGrid(data.grid);
    setTeams(data.teams);
    setRedTotal(data.redTotal);
    setBlueTotal(data.blueTotal);
    setRedFound(data.redFound || 0);
    setBlueFound(data.blueFound || 0);
    setClue(data.clue);
    setGuessesLeft(data.guessesLeft || 0);
    setClueHistory(data.clueHistory || []);
    setTimerEnd(data.timerEnd || 0);
    setPhase(data.phase || "waiting");
  }, []));

  // Switch countdown ticker
  useEffect(() => {
    if (phase !== "switching" || switchCountdown <= 0) return;
    switchRef.current = setInterval(() => {
      setSwitchCountdown((p) => {
        if (p <= 1) {
          clearInterval(switchRef.current);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(switchRef.current);
  }, [phase, switchCountdown]);

  const showReactions = phase !== "waiting" && phase !== "countdown";
  const isMyTurn = currentTeam === myTeam;
  const teamColor = currentTeam === "red" ? C.red : "#4488FF";

  const renderPhase = () => {
    // Waiting
    if (phase === "waiting") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: 60, animation: "pulse 1.5s infinite" }}>🔤</div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 12 }}>جاري تحميل اللعبة...</div>
        </div>
      );
    }

    // Countdown 3-2-1
    if (phase === "countdown") {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "70vh",
        }}>
          <div style={{
            fontSize: 120, fontWeight: 900, color: C.green,
            animation: "pulse 0.8s ease-in-out",
            textShadow: `0 0 60px ${C.greenGlow}`,
          }}>{countdownNum}</div>
          <div style={{ fontSize: 18, color: C.muted, fontWeight: 700, marginTop: 16 }}>
            استعد...
          </div>
        </div>
      );
    }

    // Team reveal with game explanation
    if (phase === "team-reveal") {
      const myColor = myTeam === "red" ? C.red : "#4488FF";
      return (
        <div style={{ animation: "fadeIn 0.3s ease", padding: "8px 0" }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>🔤</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", color: C.green }}>كلمات سرية</h2>
            <div style={{ fontSize: 15, color: myColor, fontWeight: 800, marginBottom: 4 }}>
              أنت في الفريق {myTeam === "red" ? "الأحمر 🔴" : "الأزرق 🔵"}
            </div>
            {isSpymaster && (
              <div style={{
                marginTop: 4, padding: "6px 16px", borderRadius: 20,
                background: `${C.gold}20`, border: `1px solid ${C.gold}40`,
                display: "inline-block", fontSize: 13, color: C.gold, fontWeight: 700,
              }}>👑 أنت رئيس الفريق</div>
            )}
          </div>

          {/* Game explanation */}
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 12,
            padding: 12, marginBottom: 12, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.green, marginBottom: 8, textAlign: "center" }}>
              كيف تلعب؟
            </div>
            {isSpymaster ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, textAlign: "right" }}>
                <div>👑 <strong style={{ color: "#fff" }}>أنت الرئيس</strong> — تشوف ألوان كل الكلمات</div>
                <div>💬 أعطِ تلميح <strong style={{ color: "#fff" }}>كلمة واحدة + رقم</strong> يدل على كلمات فريقك</div>
                <div>⚠️ خلّ فريقك يتجنب الكلمة القاتلة 💀</div>
                <div>🏆 الفريق الأول اللي يكشف كل كلماته يفوز!</div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.8, textAlign: "right" }}>
                <div>🔍 <strong style={{ color: "#fff" }}>أنت مخمّن</strong> — اضغط على الكلمات بناءً على تلميح الرئيس</div>
                <div>✅ كل تخمين صحيح يكشف كلمة من فريقك</div>
                <div>❌ تخمين غلط ينهي دورك</div>
                <div>💀 الكلمة القاتلة = خسارة فورية!</div>
                <div>🏆 اكشفوا كل كلمات فريقكم قبل الخصم!</div>
              </div>
            )}
          </div>

          <CodenamesTeams
            teams={teams}
            token={token}
            myTeam={myTeam}
            currentTeam={currentTeam}
            redTotal={redTotal}
            blueTotal={blueTotal}
            redFound={redFound}
            blueFound={blueFound}
          />
        </div>
      );
    }

    // Switching animation
    if (phase === "switching") {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "70vh",
        }}>
          <div style={{
            fontSize: 48, marginBottom: 12,
            animation: "pulse 0.6s infinite",
          }}>
            {currentTeam === "red" ? "🔴" : "🔵"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: teamColor }}>
            دور الفريق {currentTeam === "red" ? "الأحمر" : "الأزرق"}
          </div>
          {isMyTurn && (
            <div style={{
              marginTop: 8, fontSize: 14, fontWeight: 700, color: C.green,
            }}>فريقك!</div>
          )}
          {switchCountdown > 0 && (
            <div style={{
              marginTop: 16, fontSize: 36, fontWeight: 900,
              color: "rgba(255,255,255,0.3)",
            }}>{switchCountdown}</div>
          )}
        </div>
      );
    }

    // Game over
    if (phase === "game-over" && gameOverData) {
      return <CodenamesGameOver data={gameOverData} token={token} myTeam={myTeam} onFinish={onFinish} />;
    }

    // Active game: spymaster-turn or guesser-turn
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {/* Teams bar (compact, top) */}
        <CodenamesTeams
          teams={teams}
          token={token}
          myTeam={myTeam}
          currentTeam={currentTeam}
          redTotal={redTotal}
          blueTotal={blueTotal}
          redFound={redFound}
          blueFound={blueFound}
          compact
        />

        {/* Board */}
        <CodenamesBoard
          grid={grid}
          isSpymaster={isSpymaster}
          phase={phase}
          isMyTurn={isMyTurn}
          roomCode={roomCode}
          token={token}
          lastReveal={lastReveal}
          currentTeam={currentTeam}
        />

        {/* Clue area (fixed bottom) */}
        <CodenamesClue
          phase={phase}
          currentTeam={currentTeam}
          myTeam={myTeam}
          isSpymaster={isSpymaster}
          clue={clue}
          guessesLeft={guessesLeft}
          timerEnd={timerEnd}
          roomCode={roomCode}
          token={token}
          clueHistory={clueHistory}
          timerWarning={timerWarning}
        />
      </div>
    );
  };

  return (
    <>
      <LeaveGameBtn onLeave={onLeave} />
      <div style={{ paddingBottom: showReactions ? 56 : 0 }}>{renderPhase()}</div>
      {showReactions && <ReactionBar roomCode={roomCode} token={token} />}
    </>
  );
}
