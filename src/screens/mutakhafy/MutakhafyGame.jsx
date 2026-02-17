import { useState, useCallback } from "react";
import useSocket from "../../hooks/useSocket.js";
import MutakhafyDisguise from "./MutakhafyDisguise.jsx";
import MutakhafyActivity from "./MutakhafyActivity.jsx";
import MutakhafyResults from "./MutakhafyResults.jsx";
import MutakhafyGuess from "./MutakhafyGuess.jsx";
import MutakhafyFinalGuess from "./MutakhafyFinalGuess.jsx";
import MutakhafyReveal from "./MutakhafyReveal.jsx";
import MutakhafyGameOver from "./MutakhafyGameOver.jsx";
import { C } from "../../theme.js";

export default function MutakhafyGame({ token, roomCode, onFinish }) {
  const [phase, setPhase] = useState("waiting");
  const [countdown, setCountdown] = useState(3);
  const [players, setPlayers] = useState([]);
  const [totalRounds, setTotalRounds] = useState(4);
  const [disguiseData, setDisguiseData] = useState(null);
  const [roundIntro, setRoundIntro] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [guessData, setGuessData] = useState(null);
  const [guessCount, setGuessCount] = useState(0);
  const [finalGuessData, setFinalGuessData] = useState(null);
  const [revealData, setRevealData] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);

  useSocket("mutakhafy:start", useCallback((data) => {
    setPlayers(data.players);
    setTotalRounds(data.totalRounds);
    setPhase("countdown");
  }, []));

  useSocket("mutakhafy:countdown", useCallback((data) => {
    setCountdown(data.count);
  }, []));

  useSocket("mutakhafy:disguise-reveal", useCallback((data) => {
    setDisguiseData(data);
    setPhase("disguise");
  }, []));

  useSocket("mutakhafy:round-intro", useCallback((data) => {
    setRoundIntro(data);
    setPhase("round-intro");
  }, []));

  useSocket("mutakhafy:activity", useCallback((data) => {
    setActivityData(data);
    setPhase("activity");
  }, []));

  useSocket("mutakhafy:results", useCallback((data) => {
    setResultsData(data);
    setPhase("results");
  }, []));

  useSocket("mutakhafy:guess-phase", useCallback((data) => {
    setGuessData(data);
    setPhase("guess");
  }, []));

  useSocket("mutakhafy:guess-count", useCallback((data) => {
    setGuessCount(data.count);
    setPhase("guess-count");
  }, []));

  useSocket("mutakhafy:final-guess", useCallback((data) => {
    setFinalGuessData(data);
    setPhase("final-guess");
  }, []));

  useSocket("mutakhafy:reveal", useCallback((data) => {
    setRevealData(data);
    setPhase("reveal");
  }, []));

  useSocket("mutakhafy:game-over", useCallback((data) => {
    setGameOverData(data);
    setPhase("game-over");
  }, []));

  const pink = "#E91E63";

  const renderPhase = () => {
    if (phase === "waiting") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: 60, animation: "pulse 1.5s infinite" }}>🥸</div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 12 }}>جاري تحميل اللعبة...</div>
        </div>
      );
    }

    if (phase === "countdown") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: "min(120px, 25vw)", fontWeight: 900, color: pink, fontFamily: "'Courier New',monospace", animation: "pulse 0.8s infinite", textShadow: `0 0 60px ${pink}50` }}>{countdown || "🥸"}</div>
          <div style={{ fontSize: 18, color: C.muted, marginTop: 16 }}>{countdown > 0 ? "استعد للتخفي..." : "يلا!"}</div>
          <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: pink }}>{players.length}</div>
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

    if (phase === "disguise" && disguiseData) {
      return <MutakhafyDisguise data={disguiseData} />;
    }

    if (phase === "round-intro" && roundIntro) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", animation: "fadeIn 0.3s ease" }}>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>الجولة {roundIntro.roundIdx} من {roundIntro.totalRounds}</div>
          <div style={{ fontSize: 60, marginBottom: 16, animation: "pulse 1s infinite" }}>{roundIntro.activityIcon}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: pink }}>{roundIntro.activityName}</div>
        </div>
      );
    }

    if (phase === "activity" && activityData) {
      return <MutakhafyActivity data={activityData} token={token} roomCode={roomCode} />;
    }

    if (phase === "results" && resultsData) {
      return <MutakhafyResults data={resultsData} />;
    }

    if (phase === "guess" && guessData) {
      return <MutakhafyGuess data={guessData} token={token} roomCode={roomCode} />;
    }

    if (phase === "guess-count") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", animation: "fadeIn 0.3s ease" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: pink }}>{guessCount} لاعب خمّن</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>هل تخمينك كان صح؟ بتعرف بالنهاية...</div>
        </div>
      );
    }

    if (phase === "final-guess" && finalGuessData) {
      return <MutakhafyFinalGuess data={finalGuessData} token={token} roomCode={roomCode} />;
    }

    if (phase === "reveal" && revealData) {
      return <MutakhafyReveal data={revealData} token={token} />;
    }

    if (phase === "game-over" && gameOverData) {
      return <MutakhafyGameOver data={gameOverData} token={token} onFinish={onFinish} />;
    }

    return null;
  };

  return <div>{renderPhase()}</div>;
}
