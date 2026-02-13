import { useState, useEffect } from "react";
import { C } from "../../theme.js";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Timer from "../../components/ui/Timer.jsx";
import socket from "../../socket.js";

export default function PyramidQuestion({ token, roomCode, data, revealData, diffMeta, spectatorCount }) {
  const [sel, setSel] = useState(null);
  const [shake, setShake] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset when new question comes
  useEffect(() => {
    setSel(null);
    setSubmitted(false);
    setShake(false);
  }, [data.roundIdx]);

  const doAnswer = (idx) => {
    if (submitted || revealData) return;
    setSel(idx);
    setSubmitted(true);
    socket.emit("pyramid:answer", { roomCode, token, answerIdx: idx });
  };

  const useLifeline = (type) => {
    if (submitted || revealData) return;
    socket.emit("pyramid:lifeline", { roomCode, token, type });
    if (type === "skip") setSubmitted(true);
  };

  const showAns = !!revealData;
  const myResult = revealData?.results?.find((r) => r.token === token);
  const hidden = data.hidden || [];

  // Shake on wrong answer
  useEffect(() => {
    if (showAns && myResult && !myResult.correct) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }, [showAns, myResult]);

  return (
    <div style={{ animation: shake ? "shake 0.4s ease" : "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Badge color={diffMeta.color}>{diffMeta.icon} {diffMeta.name}</Badge>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>راوند {data.roundIdx + 1}/{data.totalRounds}</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {spectatorCount > 0 && <Badge color={C.muted}>👻 {spectatorCount}</Badge>}
          <span style={{ fontSize: 12, color: C.gold, fontWeight: 800 }}>⭐{data.score}</span>
        </div>
      </div>

      {data.streak > 2 && <div style={{ textAlign: "center", marginBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 800, color: C.gold, animation: "pulse 1s infinite" }}>🔥 سلسلة {data.streak}!</span></div>}

      <Timer timerEnd={data.timerEnd} maxSeconds={data.timerSeconds} onDone={() => {
        if (!submitted) {
          setSubmitted(true);
          socket.emit("pyramid:answer", { roomCode, token, answerIdx: -1 });
        }
      }} />

      <Card glow color={diffMeta.color} style={{ marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.6 }}>{data.question}</div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {data.options.map((opt, i) => {
          if (hidden.includes(i)) {
            return <div key={i} style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", textAlign: "center", opacity: 0.15 }}><span style={{ color: C.muted }}>—</span></div>;
          }
          const isC = showAns && i === revealData.correctIdx;
          const isW = showAns && i === sel && i !== revealData.correctIdx;
          const isSelected = !showAns && i === sel;

          return (
            <button key={i} onClick={() => doAnswer(i)} disabled={submitted} style={{
              padding: 14, borderRadius: 12, fontFamily: "inherit", textAlign: "center",
              border: isC ? `2px solid ${C.green}` : isW ? `2px solid ${C.red}` : isSelected ? `2px solid ${C.gold}` : `1px solid ${diffMeta.color}25`,
              background: isC ? `${C.green}20` : isW ? `${C.red}20` : isSelected ? `${C.gold}15` : `${diffMeta.color}08`,
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: submitted ? "default" : "pointer",
              animation: isC ? "correctFlash 0.6s ease" : isW ? "shake 0.4s ease" : `su 0.3s ${i * 0.06}s backwards`,
              opacity: submitted && !isSelected && !showAns ? 0.5 : 1,
            }}>{opt}{isC && " ✅"}{isW && " ❌"}</button>
          );
        })}
      </div>

      {/* Show points earned on reveal */}
      {showAns && myResult && (
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: myResult.correct ? C.green : C.red }}>
            {myResult.correct ? `+${myResult.points} نقطة! ✅` : "إجابة خاطئة — إقصاء! ❌"}
          </span>
        </div>
      )}

      {/* Lifelines */}
      {!showAns && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {[
            { type: "skip", ic: "⏭️", n: "تخطي", c: data.lifelines.skip },
            { type: "fifty", ic: "✂️", n: "50/50", c: data.lifelines.fifty },
            { type: "time", ic: "⏰", n: "وقت", c: data.lifelines.time },
          ].map(({ type, ic, n, c }) => (
            <button key={type} onClick={() => useLifeline(type)} disabled={c <= 0 || submitted} style={{
              flex: 1, padding: "10px 0", borderRadius: 10,
              background: c > 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: c > 0 && !submitted ? "pointer" : "default",
              opacity: c > 0 ? 1 : 0.3, textAlign: "center", fontFamily: "inherit",
            }}>
              <div style={{ fontSize: 16 }}>{ic}</div>
              <div style={{ fontSize: 9, color: C.muted }}>{n} ({c})</div>
            </button>
          ))}
        </div>
      )}

      {/* Waiting for others */}
      {submitted && !showAns && (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>
          ⏳ بانتظار بقية اللاعبين...
        </div>
      )}
    </div>
  );
}
