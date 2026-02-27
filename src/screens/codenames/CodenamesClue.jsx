import { useState, useEffect, useRef } from "react";
import { C } from "../../theme.js";
import socket from "../../socket.js";

export default function CodenamesClue({
  phase, currentTeam, myTeam, isSpymaster, clue, guessesLeft,
  timerEnd, roomCode, token, clueHistory = [], timerWarning,
}) {
  const [word, setWord] = useState("");
  const [count, setCount] = useState(1);
  const [timer, setTimer] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const intervalRef = useRef(null);

  // Timer logic
  useEffect(() => {
    if (!timerEnd) return;
    const total = phase === "spymaster-turn" ? 60 : 90;
    setTotalTime(total);
    const update = () => {
      const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTimer(left);
      if (left <= 0) clearInterval(intervalRef.current);
    };
    update();
    intervalRef.current = setInterval(update, 250);
    return () => clearInterval(intervalRef.current);
  }, [timerEnd, phase]);

  const teamColor = currentTeam === "red" ? C.red : "#4488FF";
  const isMyTurn = currentTeam === myTeam;
  const timerPercent = totalTime > 0 ? Math.max(0, timer / totalTime) : 0;
  const timerBarColor = timerWarning || timer <= 10
    ? C.red
    : teamColor;

  const sendClue = () => {
    const trimmed = word.trim();
    if (!trimmed || /\s/.test(trimmed)) return;
    socket.emit("codenames:clue", { roomCode, token, word: trimmed, count });
    setWord("");
    setCount(1);
  };

  const endTurn = () => {
    socket.emit("codenames:end-turn", { roomCode, token });
  };

  // Timer bar (top of screen area)
  const TimerBar = () => {
    if (phase !== "spymaster-turn" && phase !== "guesser-turn") return null;
    return (
      <div style={{
        height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)",
        marginBottom: 8, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: timerBarColor,
          width: `${timerPercent * 100}%`,
          transition: "width 0.3s linear, background 0.3s",
        }} />
      </div>
    );
  };

  // Game log component
  const GameLog = () => {
    if (clueHistory.length === 0) return null;
    return (
      <div style={{ marginTop: 8 }}>
        <button
          onClick={() => setShowLog(!showLog)}
          style={{
            width: "100%", padding: "6px 12px", borderRadius: 8,
            border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)",
            color: C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
          }}
        >
          📋 سجل التلميحات ({clueHistory.length})
          <span style={{ fontSize: 9 }}>{showLog ? "▲" : "▼"}</span>
        </button>
        {showLog && (
          <div style={{
            marginTop: 6, padding: 8, borderRadius: 8,
            background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`,
            maxHeight: 120, overflowY: "auto",
          }}>
            {clueHistory.map((c, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "3px 0", fontSize: 12,
                borderBottom: i < clueHistory.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <span style={{
                  fontSize: 10,
                  color: c.team === "red" ? C.red : "#4488FF",
                }}>
                  {c.team === "red" ? "🔴" : "🔵"}
                </span>
                <span style={{ fontWeight: 800, color: "#fff" }}>{c.word}</span>
                <span style={{ color: C.muted }}>({c.count})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Status message above clue area
  const StatusMessage = () => {
    let msg = "";
    let icon = "";

    if (phase === "spymaster-turn") {
      if (isSpymaster && isMyTurn) {
        icon = "👑"; msg = "أعطِ تلميح لفريقك";
      } else if (isMyTurn) {
        icon = "⏳"; msg = "الرئيس يفكر بتلميح...";
      } else {
        icon = "⏳";
        msg = `الفريق ${currentTeam === "red" ? "الأحمر" : "الأزرق"} يلعب...`;
      }
    } else if (phase === "guesser-turn") {
      if (isMyTurn && !isSpymaster) {
        icon = "🔍"; msg = "خمّن الكلمات!";
      } else if (isMyTurn && isSpymaster) {
        icon = "👀"; msg = "فريقك يخمّن...";
      } else {
        icon = "⏳";
        msg = `الفريق ${currentTeam === "red" ? "الأحمر" : "الأزرق"} يخمّن...`;
      }
    }

    return (
      <div style={{
        textAlign: "center", padding: "6px 0", marginBottom: 4,
        fontSize: 13, fontWeight: 700, color: teamColor,
      }}>
        {icon} {msg}
        <span style={{
          marginRight: 8, fontSize: 14, fontWeight: 900,
          color: timerWarning || timer <= 10 ? C.red : teamColor,
          animation: timer <= 10 ? "pulse 0.5s infinite" : "none",
        }}>
          {" "}{timer}s
        </span>
      </div>
    );
  };

  return (
    <div>
      <TimerBar />
      <StatusMessage />

      {/* Spymaster input — fixed bottom bar style */}
      {phase === "spymaster-turn" && isSpymaster && isMyTurn && (
        <div style={{
          padding: 10, borderRadius: 12, marginBottom: 6,
          background: `${teamColor}10`, border: `1px solid ${teamColor}25`,
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              value={word}
              onChange={(e) => {
                // Only allow single word — strip spaces
                const val = e.target.value.replace(/\s/g, "");
                setWord(val);
              }}
              placeholder="كلمة واحدة..."
              maxLength={30}
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.06)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                fontFamily: "inherit", direction: "rtl",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") sendClue(); }}
            />

            {/* +/- counter */}
            <div style={{
              display: "flex", alignItems: "center", gap: 0,
              background: "rgba(255,255,255,0.06)", borderRadius: 10,
              border: `1px solid ${C.border}`, overflow: "hidden",
            }}>
              <button
                onClick={() => setCount((p) => Math.max(0, p - 1))}
                style={{
                  width: 36, height: 44, border: "none",
                  background: "transparent", color: "#fff", fontSize: 18,
                  fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                }}
              >-</button>
              <span style={{
                width: 28, textAlign: "center", fontSize: 18,
                fontWeight: 900, color: teamColor,
              }}>{count}</span>
              <button
                onClick={() => setCount((p) => Math.min(9, p + 1))}
                style={{
                  width: 36, height: 44, border: "none",
                  background: "transparent", color: "#fff", fontSize: 18,
                  fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                }}
              >+</button>
            </div>

            {/* Send button */}
            <button
              onClick={sendClue}
              disabled={!word.trim()}
              style={{
                padding: "10px 18px", borderRadius: 10, border: "none",
                background: word.trim() ? C.green : "rgba(255,255,255,0.1)",
                color: word.trim() ? C.bg1 : C.muted,
                fontSize: 14, fontWeight: 900, cursor: word.trim() ? "pointer" : "default",
                fontFamily: "inherit", minHeight: 44,
              }}
            >إرسال</button>
          </div>
        </div>
      )}

      {/* Active clue display (during guesser turn) */}
      {phase === "guesser-turn" && clue && (
        <div style={{
          padding: 10, borderRadius: 12, marginBottom: 6,
          background: `${teamColor}10`, border: `1px solid ${teamColor}25`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>التلميح</div>
          <div style={{
            fontSize: 24, fontWeight: 900, color: teamColor,
            textShadow: `0 0 20px ${teamColor}40`,
          }}>
            {clue.word}
            <span style={{
              fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.5)",
              marginRight: 8,
            }}>
              {clue.count}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            محاولات متبقية: <strong style={{ color: "#fff" }}>{guessesLeft}</strong>
          </div>
          {isMyTurn && !isSpymaster && (
            <button onClick={endTurn} style={{
              marginTop: 8, padding: "8px 24px", borderRadius: 10,
              border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.05)",
              color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
            }}>⏭️ إنهاء الدور</button>
          )}
        </div>
      )}

      <GameLog />
    </div>
  );
}
