import { useState, useEffect, useRef } from "react";
import { C } from "../../theme.js";
import Timer from "../../components/ui/Timer.jsx";
import Badge from "../../components/ui/Badge.jsx";
import socket from "../../socket.js";

export default function FitnaSecretWord({ data, token, roomCode, hints }) {
  const [myHint, setMyHint] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const hintsEndRef = useRef(null);

  useEffect(() => {
    hintsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hints]);

  const submitHint = () => {
    if (submitted || !myHint.trim()) return;
    setSubmitted(true);
    socket.emit("fitna:secret-word-hint", { roomCode, token, hint: myHint.trim() });
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Badge color={C.purple}>🎭 جولة {data.roundIdx + 1}</Badge>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>🎭</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.purple }}>الكلمة السرية</span>
        </div>
      </div>

      <Timer timerEnd={data.timerEnd} maxSeconds={data.time} />

      {/* Word/Category Banner */}
      <div style={{
        background: data.word ? `${C.green}12` : `${C.red}12`,
        border: `2px solid ${data.word ? C.green : C.red}40`,
        borderRadius: 14, padding: 16, textAlign: "center", marginBottom: 16,
        boxShadow: `0 0 20px ${data.word ? C.green : C.red}15`,
      }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>الفئة: {data.category}</div>
        {data.word ? (
          <>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{data.word}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>اعطِ تلميح يدل على الكلمة بدون ما تقولها</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.red }}>???</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>أنت خائن! ما تعرف الكلمة — اعطِ تلميح عام</div>
          </>
        )}
      </div>

      {/* Hint Input */}
      {!submitted ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={myHint}
            onChange={(e) => setMyHint(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitHint()}
            placeholder="اكتب تلميحك..."
            maxLength={30}
            style={{
              flex: 1, padding: "10px 14px", border: `1px solid ${C.purple}40`,
              borderRadius: 10, background: `rgba(255,255,255,0.05)`,
              color: C.text, fontSize: 14, fontFamily: "inherit",
              direction: "rtl",
            }}
          />
          <button onClick={submitHint} disabled={!myHint.trim()} style={{
            padding: "10px 16px", border: `1px solid ${C.purple}40`,
            borderRadius: 10, background: myHint.trim() ? `${C.purple}20` : `rgba(255,255,255,0.03)`,
            color: myHint.trim() ? C.purple : C.muted, fontSize: 13, fontWeight: 700,
            cursor: myHint.trim() ? "pointer" : "default", fontFamily: "inherit",
          }}>
            ارسل
          </button>
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: 10, marginBottom: 16,
          background: `${C.green}10`, border: `1px solid ${C.green}30`,
          borderRadius: 10, fontSize: 13, color: C.green,
        }}>
          تم إرسال تلميحك: "{myHint}"
        </div>
      )}

      {/* Hints Feed */}
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>تلميحات اللاعبين:</div>
      <div style={{
        maxHeight: 200, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {hints.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: 16 }}>
            ننتظر التلميحات...
          </div>
        )}
        {hints.map((h, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: `${C.purple}08`, border: `1px solid ${C.purple}20`,
            borderRadius: 10, padding: "8px 10px",
            animation: "su 0.3s ease",
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{h.avatar}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.purple }}>{h.name}:</span>
            <span style={{ fontSize: 12, color: C.text, fontStyle: "italic" }}>"{h.hint}"</span>
          </div>
        ))}
        <div ref={hintsEndRef} />
      </div>

      <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.muted }}>
        👥 {data.aliveCount} لاعب باقي
      </div>
    </div>
  );
}
