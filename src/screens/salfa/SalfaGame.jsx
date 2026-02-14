import { useState, useCallback } from "react";
import useSocket from "../../hooks/useSocket.js";
import SalfaRoleReveal from "./SalfaRoleReveal.jsx";
import SalfaHints from "./SalfaHints.jsx";
import SalfaVoting from "./SalfaVoting.jsx";
import SalfaGuess from "./SalfaGuess.jsx";
import SalfaRoundResult from "./SalfaRoundResult.jsx";
import SalfaGameOver from "./SalfaGameOver.jsx";
import { C } from "../../theme.js";

export default function SalfaGame({ token, roomCode, onFinish }) {
  const [phase, setPhase] = useState("waiting");
  const [countdown, setCountdown] = useState(3);
  const [players, setPlayers] = useState([]);
  const [totalRounds, setTotalRounds] = useState(3);
  const [roleData, setRoleData] = useState(null);
  const [hintRoundData, setHintRoundData] = useState(null);
  const [hintsList, setHintsList] = useState([]);
  const [voteRequestInfo, setVoteRequestInfo] = useState({ count: 0, needed: 1 });
  const [votingData, setVotingData] = useState(null);
  const [voteResultData, setVoteResultData] = useState(null);
  const [spyGuessData, setSpyGuessData] = useState(null);
  const [spyGuessResultData, setSpyGuessResultData] = useState(null);
  const [roundResultData, setRoundResultData] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);

  useSocket("salfa:start", useCallback((data) => {
    setPlayers(data.players);
    setTotalRounds(data.totalRounds);
    setPhase("countdown");
  }, []));

  useSocket("salfa:countdown", useCallback((data) => {
    setCountdown(data.count);
  }, []));

  useSocket("salfa:role-reveal", useCallback((data) => {
    setRoleData(data);
    setHintsList([]);
    setVoteRequestInfo({ count: 0, needed: 1 });
    setPhase("role-reveal");
  }, []));

  useSocket("salfa:hint-round", useCallback((data) => {
    setHintRoundData(data);
    setVoteRequestInfo({ count: data.voteRequestCount, needed: Math.floor(data.totalPlayers / 2) + 1 });
    setPhase("hints");
  }, []));

  useSocket("salfa:hint-submitted", useCallback((data) => {
    setHintsList((prev) => [...prev, data]);
  }, []));

  useSocket("salfa:all-hints", useCallback((data) => {
    setVoteRequestInfo({ count: data.voteRequestCount, needed: Math.floor(data.totalPlayers / 2) + 1 });
  }, []));

  useSocket("salfa:vote-requested", useCallback((data) => {
    setVoteRequestInfo({ count: data.count, needed: data.needed });
  }, []));

  useSocket("salfa:voting", useCallback((data) => {
    setVotingData(data);
    setPhase("voting");
  }, []));

  useSocket("salfa:vote-result", useCallback((data) => {
    setVoteResultData(data);
    setPhase("vote-result");
  }, []));

  useSocket("salfa:spy-guess", useCallback((data) => {
    setSpyGuessData(data);
    setPhase("spy-guess");
  }, []));

  useSocket("salfa:spy-guess-result", useCallback((data) => {
    setSpyGuessResultData(data);
    setPhase("spy-guess-result");
  }, []));

  useSocket("salfa:round-result", useCallback((data) => {
    setRoundResultData(data);
    setPhase("round-result");
  }, []));

  useSocket("salfa:game-over", useCallback((data) => {
    setGameOverData(data);
    setPhase("game-over");
  }, []));

  const renderPhase = () => {
    if (phase === "waiting") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: 60, animation: "pulse 1.5s infinite" }}>🕵️</div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 12 }}>جاري تحميل اللعبة...</div>
        </div>
      );
    }

    if (phase === "countdown") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: "min(120px, 25vw)", fontWeight: 900, color: C.cyan, fontFamily: "'Courier New',monospace", animation: "pulse 0.8s infinite", textShadow: `0 0 60px ${C.cyan}50` }}>{countdown || "🕵️"}</div>
          <div style={{ fontSize: 18, color: C.muted, marginTop: 16 }}>{countdown > 0 ? "استعد..." : "يلا!"}</div>
          <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.cyan }}>{players.length}</div>
              <div style={{ fontSize: 10, color: C.muted }}>لاعب</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>{totalRounds}</div>
              <div style={{ fontSize: 10, color: C.muted }}>جولة</div>
            </div>
          </div>
        </div>
      );
    }

    if (phase === "role-reveal" && roleData) {
      return <SalfaRoleReveal data={roleData} />;
    }

    if (phase === "hints" && hintRoundData) {
      return <SalfaHints data={hintRoundData} token={token} roomCode={roomCode} hints={hintsList} voteRequestInfo={voteRequestInfo} />;
    }

    if (phase === "voting" && votingData) {
      return <SalfaVoting data={votingData} token={token} roomCode={roomCode} />;
    }

    if (phase === "vote-result" && voteResultData) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🗳️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.cyan, marginBottom: 20 }}>
            {voteResultData.tied ? "تعادل! الجاسوس يفوز 🕵️" : voteResultData.isSpy ? `${voteResultData.accusedName} هو الجاسوس! 🎯` : `${voteResultData.accusedName} بريء! الجاسوس يفوز 🕵️`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {voteResultData.votes.sort((a, b) => b.votesReceived - a.votesReceived).map((v, i) => (
              <div key={i} style={{
                background: v.token === voteResultData.accusedToken ? `${voteResultData.isSpy ? C.green : C.red}15` : "rgba(255,255,255,0.03)",
                border: `1px solid ${v.token === voteResultData.accusedToken ? (voteResultData.isSpy ? C.green : C.red) : C.border}`,
                borderRadius: 10, padding: "8px 12px",
                display: "flex", alignItems: "center", gap: 8,
                animation: `su 0.3s ${i * 0.05}s backwards`,
              }}>
                <span style={{ fontSize: 20 }}>{v.avatar}</span>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1, color: v.token === voteResultData.accusedToken ? (voteResultData.isSpy ? C.green : C.red) : C.text }}>{v.name}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: v.votesReceived > 0 ? C.gold : C.muted }}>{v.votesReceived} 🗳️</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (phase === "spy-guess" && spyGuessData) {
      return <SalfaGuess data={spyGuessData} token={token} roomCode={roomCode} />;
    }

    if (phase === "spy-guess-result" && spyGuessResultData) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: "pulse 1.5s infinite" }}>
            {spyGuessResultData.correct ? "🕵️" : "😇"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: spyGuessResultData.correct ? C.red : C.green, marginBottom: 12 }}>
            {spyGuessResultData.correct ? "الجاسوس خمّن الكلمة صح!" : "الجاسوس ما عرف الكلمة!"}
          </div>
          <div style={{ fontSize: 16, color: C.muted, marginBottom: 8 }}>
            تخمينه: <span style={{ fontWeight: 800, color: C.text }}>{spyGuessResultData.guess}</span>
          </div>
          <div style={{ fontSize: 16, color: C.muted }}>
            الكلمة الصحيحة: <span style={{ fontWeight: 800, color: C.gold }}>{spyGuessResultData.word}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 16, color: spyGuessResultData.correct ? C.red : C.green }}>
            {spyGuessResultData.correct ? "الجاسوس يفوز! 🕵️" : "الأبرياء يفوزون! 🎉"}
          </div>
        </div>
      );
    }

    if (phase === "round-result" && roundResultData) {
      return <SalfaRoundResult data={roundResultData} token={token} />;
    }

    if (phase === "game-over" && gameOverData) {
      return <SalfaGameOver data={gameOverData} token={token} onFinish={onFinish} />;
    }

    return null;
  };

  return <div>{renderPhase()}</div>;
}
