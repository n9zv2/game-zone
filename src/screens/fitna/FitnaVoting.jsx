import { useState } from "react";
import { C } from "../../theme.js";
import Timer from "../../components/ui/Timer.jsx";
import socket from "../../socket.js";

export default function FitnaVoting({ data, token, roomCode }) {
  const [voted, setVoted] = useState(false);
  const [votedFor, setVotedFor] = useState(null);

  const handleVote = (targetToken) => {
    if (voted || data.silenced) return;
    setVoted(true);
    setVotedFor(targetToken);
    socket.emit("fitna:vote", { roomCode, token, targetToken });
  };

  if (data.silenced) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>🤫</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.muted }}>تم إسكاتك!</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>ما تقدر تصوت هالجولة</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🗳️</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.purple }}>
          {voted ? "تم التصويت!" : "صوّت لطرد مشتبه"}
        </div>
      </div>

      <Timer timerEnd={data.timerEnd} maxSeconds={20} />

      {voted && (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 13, marginBottom: 16, animation: "su 0.3s ease" }}>
          ✅ ننتظر باقي الأصوات...
        </div>
      )}

      {/* Skip vote button */}
      {!voted && (
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <button
            onClick={() => handleVote("skip")}
            style={{
              padding: "8px 20px", border: `1px solid ${C.border}`,
              borderRadius: 10, background: "rgba(255,255,255,0.03)",
              color: C.muted, cursor: "pointer", fontFamily: "inherit",
              fontSize: 13, fontWeight: 700, transition: "all 0.2s",
            }}
          >
            ⏭️ تخطى — ما أبي أصوت
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.candidates.map((p, i) => {
          const isVoted = votedFor === p.token;
          return (
            <button
              key={i}
              onClick={() => handleVote(p.token)}
              disabled={voted}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", border: `2px solid ${isVoted ? C.red : C.border}`,
                borderRadius: 12, background: isVoted ? `${C.red}15` : `rgba(255,255,255,0.03)`,
                color: "#fff", cursor: voted ? "default" : "pointer",
                fontFamily: "inherit", direction: "rtl", transition: "all 0.2s",
                opacity: voted && !isVoted ? 0.4 : 1,
                animation: `su 0.3s ${i * 0.05}s backwards`,
              }}
            >
              <span style={{ fontSize: 28 }}>{p.avatar}</span>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: isVoted ? C.red : C.text }}>{p.name}</div>
                {p.suspicion > 0 && (
                  <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                    {Array.from({ length: Math.min(p.suspicion, 5) }, (_, j) => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: C.red }} />
                    ))}
                    <span style={{ fontSize: 10, color: C.red, marginRight: 4 }}>شك</span>
                  </div>
                )}
              </div>
              {isVoted && <span style={{ fontSize: 18, color: C.red }}>🗳️</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
