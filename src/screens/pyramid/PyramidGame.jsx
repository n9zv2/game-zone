import { useState, useCallback } from "react";
import useSocket from "../../hooks/useSocket.js";
import PyramidIntro from "./PyramidIntro.jsx";
import PyramidQuestion from "./PyramidQuestion.jsx";
import PyramidElimination from "./PyramidElimination.jsx";
import PyramidDead from "./PyramidDead.jsx";
import PyramidChampion from "./PyramidChampion.jsx";
import { C } from "../../theme.js";
import ReactionBar from "../../components/ReactionBar.jsx";
import LeaveGameBtn from "../../components/LeaveGameBtn.jsx";

const DIFF_META = {
  easy:    { name: "سهل",   color: C.green,  icon: "🟢" },
  medium:  { name: "متوسط", color: C.gold,   icon: "🟡" },
  hard:    { name: "صعب",   color: C.orange, icon: "🟠" },
  extreme: { name: "خطير",  color: C.red,    icon: "🔴" },
};

export default function PyramidGame({ token, roomCode, onFinish, onLeave }) {
  const [phase, setPhase] = useState("waiting"); // waiting, countdown, intro, question, elimination, champion
  const [countdown, setCountdown] = useState(3);
  const [players, setPlayers] = useState([]);
  const [totalRounds, setTotalRounds] = useState(0);
  const [questionData, setQuestionData] = useState(null);
  const [revealData, setRevealData] = useState(null);
  const [elimData, setElimData] = useState(null);
  const [championData, setChampionData] = useState(null);
  const [myAlive, setMyAlive] = useState(true);
  const [myScore, setMyScore] = useState(0);
  const [myLevel, setMyLevel] = useState(0);
  const [spectatorRoundData, setSpectatorRoundData] = useState(null);
  const [spectatorRevealData, setSpectatorRevealData] = useState(null);
  const [answeredTokens, setAnsweredTokens] = useState(new Set());
  const [answerProgress, setAnswerProgress] = useState({ answeredCount: 0, totalAlive: 0 });
  const [alivePlayers, setAlivePlayers] = useState([]);

  useSocket("pyramid:start", useCallback((data) => {
    setPlayers(data.players);
    setTotalRounds(data.totalRounds);
    setPhase("countdown");
  }, []));

  useSocket("pyramid:countdown", useCallback((data) => {
    setCountdown(data.count);
  }, []));

  useSocket("pyramid:round", useCallback((data) => {
    if (data.spectator) {
      // Dead player receiving spectator view
      setSpectatorRoundData(data);
      setSpectatorRevealData(null);
      setAnsweredTokens(new Set());
      setAnswerProgress({ answeredCount: 0, totalAlive: 0 });
    } else {
      setQuestionData(data);
      setRevealData(null);
      setElimData(null);
      setPhase("question");
    }
  }, []));

  useSocket("pyramid:player-answered", useCallback((data) => {
    setAnsweredTokens((prev) => new Set([...prev, data.token]));
    setAnswerProgress({ answeredCount: data.answeredCount, totalAlive: data.totalAlive });
  }, []));

  useSocket("pyramid:round-result", useCallback((data) => {
    setRevealData(data);
    setSpectatorRevealData(data);
    if (data.alivePlayers) setAlivePlayers(data.alivePlayers);
    // After showing answer, transition to elimination view
    setTimeout(() => {
      setElimData(data);
      const isEliminated = data.eliminated.some((p) => p.token === token);
      if (isEliminated) {
        setMyAlive(false);
        // Find my score from the results
        const myResult = data.results?.find((r) => r.token === token);
        if (myResult) {
          setMyScore(myResult.totalScore);
          setMyLevel(data.roundIdx || 0);
        }
      }
      setPhase("elimination");
    }, 2000);
  }, [token]));

  useSocket("pyramid:lifeline-used", useCallback((data) => {
    if (data.type === "fifty") {
      setQuestionData((prev) => prev ? { ...prev, hidden: data.hidden, lifelines: data.lifelines } : prev);
    } else if (data.type === "time") {
      setQuestionData((prev) => prev ? { ...prev, timerEnd: data.newTimerEnd, timerSeconds: data.newTimerSeconds, lifelines: data.lifelines } : prev);
    } else if (data.type === "skip") {
      setQuestionData((prev) => prev ? { ...prev, lifelines: data.lifelines } : prev);
    }
  }, []));

  useSocket("pyramid:champion", useCallback((data) => {
    setChampionData(data);
    setPhase("champion");
  }, []));

  const showReactions = phase !== "waiting" && phase !== "countdown";

  const renderPhase = () => {
    if (phase === "waiting") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: 60, animation: "pulse 1.5s infinite" }}>🔺</div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 12 }}>جاري تحميل اللعبة...</div>
        </div>
      );
    }

    if (phase === "countdown") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: "min(120px, 25vw)", fontWeight: 900, color: C.red, fontFamily: "'Courier New',monospace", animation: "pulse 0.8s infinite", textShadow: `0 0 60px ${C.redGlow}` }}>{countdown || "🔺"}</div>
          <div style={{ fontSize: 18, color: C.muted, marginTop: 16 }}>{countdown > 0 ? "استعد..." : "يلا!"}</div>
          <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>{players.length}</div>
              <div style={{ fontSize: 10, color: C.muted }}>لاعب</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.red }}>{totalRounds}</div>
              <div style={{ fontSize: 10, color: C.muted }}>راوند</div>
            </div>
          </div>
        </div>
      );
    }

    if (!myAlive && phase !== "champion") {
      return (
        <PyramidDead
          score={myScore}
          level={myLevel}
          roundData={spectatorRoundData}
          revealData={spectatorRevealData}
          roomCode={roomCode}
          token={token}
          answeredTokens={answeredTokens}
          answerProgress={answerProgress}
          alivePlayers={alivePlayers}
          totalPlayers={players.length}
          totalRounds={totalRounds}
        />
      );
    }

    if (phase === "question" && questionData) {
      const diffMeta = DIFF_META[questionData.difficulty] || DIFF_META.easy;
      return (
        <PyramidQuestion
          token={token}
          roomCode={roomCode}
          data={questionData}
          revealData={revealData}
          diffMeta={diffMeta}
          spectatorCount={questionData.spectatorCount}
        />
      );
    }

    if (phase === "elimination" && elimData) {
      return <PyramidElimination data={elimData} token={token} myAlive={myAlive} />;
    }

    if (phase === "champion" && championData) {
      return <PyramidChampion data={championData} token={token} onFinish={onFinish} />;
    }

    return null;
  };

  return (
    <>
      <LeaveGameBtn onLeave={onLeave} />
      <div style={{ paddingBottom: showReactions ? 56 : 0 }}>{renderPhase()}</div>
      {showReactions && <ReactionBar roomCode={roomCode} token={token} />}
    </>
  );
}
