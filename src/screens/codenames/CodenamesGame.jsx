import { useState, useCallback } from "react";
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

  useSocket("codenames:start", useCallback((data) => {
    setMyTeam(data.myTeam);
    setIsSpymaster(data.isSpymaster);
    setCurrentTeam(data.currentTeam);
    setGrid(data.grid);
    setTeams(data.teams);
    setRedTotal(data.redTotal);
    setBlueTotal(data.blueTotal);
    setRedFound(0);
    setBlueFound(0);
    setPhase("team-reveal");
  }, []));

  useSocket("codenames:turn", useCallback((data) => {
    setCurrentTeam(data.currentTeam);
    setTimerEnd(data.timerEnd);
    setClue(null);
    setGuessesLeft(0);
    setPhase("spymaster-turn");
  }, []));

  useSocket("codenames:clue", useCallback((data) => {
    setCurrentTeam(data.currentTeam);
    setClue(data.clue);
    setGuessesLeft(data.guessesLeft);
    setTimerEnd(data.timerEnd);
    setPhase("guesser-turn");
  }, []));

  useSocket("codenames:reveal", useCallback((data) => {
    setGrid((prev) => prev.map((cell, i) =>
      i === data.wordIndex ? { ...cell, revealed: true, type: data.type } : cell
    ));
    if (data.type === "red") setRedFound((p) => p + 1);
    if (data.type === "blue") setBlueFound((p) => p + 1);
  }, []));

  useSocket("codenames:guess-update", useCallback((data) => {
    setGuessesLeft(data.guessesLeft);
  }, []));

  useSocket("codenames:switch-team", useCallback((data) => {
    setCurrentTeam(data.currentTeam);
    setClue(null);
    setPhase("switching");
  }, []));

  useSocket("codenames:game-over", useCallback((data) => {
    setGameOverData(data);
    setPhase("game-over");
  }, []));

  const showReactions = phase !== "waiting";
  const isMyTurn = currentTeam === myTeam;
  const teamColor = currentTeam === "red" ? C.red : "#4488FF";

  const renderPhase = () => {
    if (phase === "waiting") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: 60, animation: "pulse 1.5s infinite" }}>🔤</div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 12 }}>جاري تحميل اللعبة...</div>
        </div>
      );
    }

    if (phase === "team-reveal") {
      return (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 50, marginBottom: 8 }}>🔤</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", color: C.green }}>كلمات سرية</h2>
            <div style={{ fontSize: 14, color: C.muted }}>
              أنت في الفريق{" "}
              <span style={{ color: myTeam === "red" ? C.red : "#4488FF", fontWeight: 800 }}>
                {myTeam === "red" ? "الأحمر 🔴" : "الأزرق 🔵"}
              </span>
            </div>
            {isSpymaster && (
              <div style={{
                marginTop: 8, padding: "6px 16px", borderRadius: 20,
                background: `${C.gold}20`, border: `1px solid ${C.gold}40`,
                display: "inline-block", fontSize: 13, color: C.gold, fontWeight: 700,
              }}>👑 أنت رئيس الفريق</div>
            )}
          </div>
          <CodenamesTeams teams={teams} token={token} myTeam={myTeam} />
        </div>
      );
    }

    if (phase === "switching") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: 50, animation: "pulse 1s infinite" }}>🔄</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: teamColor, marginTop: 12 }}>
            دور الفريق {currentTeam === "red" ? "الأحمر" : "الأزرق"}
          </div>
        </div>
      );
    }

    if (phase === "game-over" && gameOverData) {
      return <CodenamesGameOver data={gameOverData} token={token} myTeam={myTeam} onFinish={onFinish} />;
    }

    // Active game phases: spymaster-turn or guesser-turn
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {/* Turn indicator */}
        <div style={{
          textAlign: "center", padding: "8px 0", marginBottom: 8,
          borderRadius: 10, background: `${teamColor}15`, border: `1px solid ${teamColor}30`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: teamColor }}>
            {currentTeam === "red" ? "🔴 دور الأحمر" : "🔵 دور الأزرق"}
            {isMyTurn ? " (فريقك)" : ""}
          </div>
        </div>

        {/* Score tracker */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>🔴 {redFound}/{redTotal}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4488FF" }}>🔵 {blueFound}/{blueTotal}</div>
        </div>

        {/* Clue area */}
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
        />

        {/* Board */}
        <CodenamesBoard
          grid={grid}
          isSpymaster={isSpymaster}
          phase={phase}
          isMyTurn={isMyTurn}
          roomCode={roomCode}
          token={token}
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
