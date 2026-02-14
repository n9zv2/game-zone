import { useState, useEffect } from "react";
import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import socket from "../../socket.js";

export default function SalfaVoting({ data, token, roomCode }) {
  const [voted, setVoted] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!data.timerEnd) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((data.timerEnd - Date.now()) / 1000));
      setTimeLeft(left);
    }, 100);
    return () => clearInterval(interval);
  }, [data.timerEnd]);

  const castVote = (targetToken) => {
    if (voted) return;
    setSelectedToken(targetToken);
    setVoted(true);
    socket.emit("salfa:vote", { roomCode, token, targetToken });
  };

  const candidates = data.players.filter((p) => p.token !== token);

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "10px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🗳️</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.cyan }}>صوّت على الجاسوس!</div>
        <div style={{
          fontSize: 28, fontWeight: 900, color: timeLeft <= 10 ? C.red : C.gold,
          fontFamily: "'Courier New',monospace", marginTop: 8,
          animation: timeLeft <= 10 ? "pulse 0.5s infinite" : "none",
        }}>
          {timeLeft}s
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {candidates.map((p, i) => {
          const isSelected = selectedToken === p.token;
          return (
            <Card
              key={p.token}
              onClick={() => castVote(p.token)}
              style={{
                padding: 14, display: "flex", alignItems: "center", gap: 12,
                cursor: voted ? "default" : "pointer",
                border: isSelected ? `2px solid ${C.cyan}` : `1px solid ${C.border}`,
                background: isSelected ? `${C.cyan}15` : undefined,
                opacity: voted && !isSelected ? 0.5 : 1,
                animation: `su 0.3s ${i * 0.05}s backwards`,
              }}
            >
              <span style={{ fontSize: 28 }}>{p.avatar}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: isSelected ? C.cyan : C.text, flex: 1 }}>{p.name}</span>
              {isSelected && <span style={{ fontSize: 18, color: C.cyan }}>✅</span>}
            </Card>
          );
        })}
      </div>

      {voted && (
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.green, fontWeight: 700 }}>
          ✅ تم التصويت — بانتظار البقية...
        </div>
      )}
    </div>
  );
}
