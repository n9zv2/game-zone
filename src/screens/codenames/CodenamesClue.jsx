import { useState, useEffect, useRef } from "react";
import { C } from "../../theme.js";
import socket from "../../socket.js";

export default function CodenamesClue({ phase, currentTeam, myTeam, isSpymaster, clue, guessesLeft, timerEnd, roomCode, token }) {
  const [word, setWord] = useState("");
  const [count, setCount] = useState(1);
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!timerEnd) return;
    const update = () => {
      const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTimer(left);
      if (left <= 0) clearInterval(intervalRef.current);
    };
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timerEnd]);

  const teamColor = currentTeam === "red" ? C.red : "#4488FF";
  const isMyTurn = currentTeam === myTeam;

  const sendClue = () => {
    const trimmed = word.trim();
    if (!trimmed) return;
    socket.emit("codenames:clue", { roomCode, token, word: trimmed, count });
    setWord("");
  };

  const endTurn = () => {
    socket.emit("codenames:end-turn", { roomCode, token });
  };

  // Spymaster giving clue
  if (phase === "spymaster-turn") {
    if (isSpymaster && isMyTurn) {
      return (
        <div style={{
          padding: 12, borderRadius: 12, marginBottom: 8,
          background: `${teamColor}10`, border: `1px solid ${teamColor}30`,
        }}>
          <div style={{ fontSize: 12, color: teamColor, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
            👑 أعطِ تلميح لفريقك ({timer}s)
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="كلمة واحدة..."
              maxLength={30}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.05)",
                color: "#fff", fontSize: 14, fontFamily: "inherit", direction: "rtl",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") sendClue(); }}
            />
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              style={{
                width: 50, padding: "8px 4px", borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.bg1,
                color: "#fff", fontSize: 14, fontFamily: "inherit", textAlign: "center",
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button
              onClick={sendClue}
              disabled={!word.trim()}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: teamColor, color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: word.trim() ? "pointer" : "default", opacity: word.trim() ? 1 : 0.4,
                fontFamily: "inherit",
              }}
            >إرسال</button>
          </div>
        </div>
      );
    }

    // Waiting for spymaster
    return (
      <div style={{
        textAlign: "center", padding: 12, borderRadius: 12, marginBottom: 8,
        background: `${teamColor}10`, border: `1px solid ${teamColor}30`,
      }}>
        <div style={{ fontSize: 13, color: teamColor, fontWeight: 700 }}>
          {isMyTurn ? "👑 الرئيس يفكر..." : "⏳ الفريق الثاني يلعب..."}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: teamColor, marginTop: 4 }}>{timer}s</div>
      </div>
    );
  }

  // Guesser turn — show clue
  if (phase === "guesser-turn" && clue) {
    return (
      <div style={{
        padding: 12, borderRadius: 12, marginBottom: 8,
        background: `${teamColor}10`, border: `1px solid ${teamColor}30`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>التلميح</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: teamColor }}>{clue.word} ({clue.count})</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          محاولات متبقية: {guessesLeft} | {timer}s
        </div>
        {isMyTurn && !isSpymaster && (
          <button onClick={endTurn} style={{
            marginTop: 8, padding: "6px 20px", borderRadius: 8,
            border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.05)",
            color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>⏭️ إنهاء الدور</button>
        )}
      </div>
    );
  }

  return null;
}
