import { useState, useCallback } from "react";
import useSocket from "../../hooks/useSocket.js";
import ArenaChallenge from "./ArenaChallenge.jsx";
import ArenaElimination from "./ArenaElimination.jsx";
import ArenaChampion from "./ArenaChampion.jsx";
import { C } from "../../theme.js";
import Badge from "../../components/ui/Badge.jsx";
import ReactionBar from "../../components/ReactionBar.jsx";

export default function ArenaGame({ token, roomCode, onFinish }) {
  const [phase, setPhase] = useState("waiting"); // waiting, countdown, round-intro, challenge, elimination, champion
  const [countdown, setCountdown] = useState(3);
  const [players, setPlayers] = useState([]);
  const [roundInfo, setRoundInfo] = useState(null);
  const [challengeData, setChallengeData] = useState(null);
  const [reactionGo, setReactionGo] = useState(false);
  const [reactionGoTime, setReactionGoTime] = useState(0);
  const [elimData, setElimData] = useState(null);
  const [championData, setChampionData] = useState(null);
  const [myAlive, setMyAlive] = useState(true);

  useSocket("arena:start", useCallback((data) => {
    setPlayers(data.players);
    setPhase("countdown");
  }, []));

  useSocket("arena:countdown", useCallback((data) => {
    setCountdown(data.count);
  }, []));

  useSocket("arena:round-intro", useCallback((data) => {
    setRoundInfo(data);
    setChallengeData(null);
    setReactionGo(false);
    setPhase("round-intro");
  }, []));

  useSocket("arena:challenge", useCallback((data) => {
    setChallengeData(data);
    setReactionGo(false);
    setPhase("challenge");
  }, []));

  useSocket("arena:reaction-go", useCallback((data) => {
    setReactionGo(true);
    setReactionGoTime(data.goTime);
  }, []));

  useSocket("arena:round-result", useCallback((data) => {
    setElimData(data);
    const isEliminated = data.eliminated.some((p) => p.token === token);
    if (isEliminated) setMyAlive(false);
    setPhase("elimination");
  }, [token]));

  useSocket("arena:champion", useCallback((data) => {
    setChampionData(data);
    setPhase("champion");
  }, []));

  const showReactions = phase !== "waiting" && phase !== "countdown";

  const renderPhase = () => {
    if (phase === "waiting") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: 60, animation: "pulse 1.5s infinite" }}>⚔️</div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 12 }}>جاري تحميل اللعبة...</div>
        </div>
      );
    }

    if (phase === "countdown") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: "min(120px, 25vw)", fontWeight: 900, color: C.orange, fontFamily: "'Courier New',monospace", animation: "pulse 0.8s infinite" }}>{countdown || "⚔️"}</div>
          <div style={{ fontSize: 18, color: C.muted, marginTop: 16 }}>{countdown > 0 ? "استعد..." : "يلا!"}</div>
        </div>
      );
    }

    if (phase === "round-intro" && roundInfo) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", animation: "fadeIn 0.3s ease" }}>
          <Badge color={C.muted}>جولة {roundInfo.roundIdx + 1} / {roundInfo.totalRounds}</Badge>
          <div style={{ fontSize: 70, margin: "20px 0 12px", animation: "pulse 1s infinite" }}>{roundInfo.icon}</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: C.orange, margin: "0 0 6px" }}>{roundInfo.name}</h2>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 12 }}>{roundInfo.desc}</p>
          <div style={{ display: "flex", gap: 4 }}>
            {roundInfo.alivePlayers?.slice(0, 8).map((p) => <span key={p.token} style={{ fontSize: 16 }}>{p.avatar}</span>)}
          </div>
          <div style={{ fontSize: 13, color: C.green, fontWeight: 700, marginTop: 8 }}>{roundInfo.aliveCount} لاعب</div>
        </div>
      );
    }

    if (phase === "challenge" && challengeData) {
      return (
        <ArenaChallenge
          token={token}
          roomCode={roomCode}
          data={challengeData}
          reactionGo={reactionGo}
          reactionGoTime={reactionGoTime}
          spectator={!myAlive}
        />
      );
    }

    if (phase === "elimination" && elimData) {
      return <ArenaElimination data={elimData} token={token} myAlive={myAlive} />;
    }

    if (phase === "champion" && championData) {
      return <ArenaChampion data={championData} token={token} onFinish={onFinish} />;
    }

    return null;
  };

  return (
    <>
      <div style={{ paddingBottom: showReactions ? 56 : 0 }}>{renderPhase()}</div>
      {showReactions && <ReactionBar roomCode={roomCode} token={token} />}
    </>
  );
}
