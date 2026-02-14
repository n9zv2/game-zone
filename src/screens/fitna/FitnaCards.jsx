import { useState } from "react";
import { C } from "../../theme.js";
import Timer from "../../components/ui/Timer.jsx";
import Btn from "../../components/ui/Btn.jsx";
import socket from "../../socket.js";

export default function FitnaCards({ card, data, token, roomCode }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [played, setPlayed] = useState(false);

  const needsTarget = card && card.needsTarget;

  const playCard = () => {
    if (!card) return;
    if (needsTarget && !selectedTarget) return;

    const targetToken = card.id === "shield" ? token : selectedTarget;

    socket.emit("fitna:card", {
      roomCode, token,
      cardId: card.id,
      targetToken: targetToken || null,
    });
    setPlayed(true);
  };

  if (played) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ fontSize: 50, marginBottom: 12, animation: "pulse 1.5s infinite" }}>🃏</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.purple }}>تم لعب الكرت!</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>ننتظر باقي اللاعبين...</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🃏</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.purple }}>العب كرت أو تخطى</div>
      </div>

      <Timer timerEnd={data.timerEnd} maxSeconds={12} />

      {/* Single card display */}
      {!card ? (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 14, marginBottom: 16, padding: 20 }}>
          ما عندك كرت هالجولة
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{
            background: `${C.purple}20`, border: `2px solid ${C.purple}`,
            borderRadius: 16, padding: "16px 20px", textAlign: "center",
            minWidth: 140, boxShadow: `0 0 25px ${C.purple}30`,
            animation: "su 0.4s ease",
          }}>
            <div style={{ fontSize: 36 }}>{card.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginTop: 6 }}>{card.name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{card.desc}</div>
          </div>
        </div>
      )}

      {/* Target selection */}
      {card && needsTarget && (
        <div style={{ marginBottom: 16, animation: "su 0.3s ease" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textAlign: "center" }}>اختر الهدف:</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {data.alivePlayers.map((p, i) => {
              const isSelected = selectedTarget === p.token;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedTarget(isSelected ? null : p.token)}
                  style={{
                    background: isSelected ? `${C.purple}20` : `rgba(255,255,255,0.03)`,
                    border: `1px solid ${isSelected ? C.purple : C.border}`,
                    borderRadius: 10, padding: "8px 4px", textAlign: "center",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: 20 }}>{p.avatar}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? C.purple : C.text, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  {p.suspicion > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 3 }}>
                      {Array.from({ length: Math.min(Math.round(p.suspicion), 5) }, (_, j) => (
                        <div key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: C.red }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        {card && (
          <Btn
            color={C.purple}
            onClick={playCard}
            disabled={needsTarget && !selectedTarget}
            style={{ flex: 1 }}
          >
            🃏 العب الكرت
          </Btn>
        )}
        <Btn dark onClick={() => setPlayed(true)} style={{ flex: 1 }}>
          ⏭️ تخطى
        </Btn>
      </div>
    </div>
  );
}
