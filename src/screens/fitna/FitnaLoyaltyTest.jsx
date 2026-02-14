import { useState } from "react";
import { C } from "../../theme.js";
import Timer from "../../components/ui/Timer.jsx";
import Badge from "../../components/ui/Badge.jsx";
import socket from "../../socket.js";

export default function FitnaLoyaltyTest({ data, token, roomCode }) {
  const [choice, setChoice] = useState(null);

  const submitChoice = (idx) => {
    if (choice !== null) return;
    setChoice(idx);
    socket.emit("fitna:action", { roomCode, token, choiceIdx: idx });
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Badge color={C.purple}>🎭 جولة {data.roundIdx + 1}</Badge>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>🎯</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.purple }}>اختبار الولاء</span>
        </div>
      </div>

      <Timer timerEnd={data.timerEnd} maxSeconds={data.time} />

      {/* Secret Symbol Banner */}
      {data.secretSymbol ? (
        <div style={{
          background: `${C.green}12`, border: `2px solid ${C.green}40`,
          borderRadius: 14, padding: 16, textAlign: "center", marginBottom: 16,
          boxShadow: `0 0 20px ${C.green}15`,
        }}>
          <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginBottom: 6 }}>الرمز السري</div>
          <div style={{ fontSize: 48, animation: "pulse 1.5s infinite" }}>{data.secretSymbol}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>اختر هذا الرمز من الخيارات</div>
        </div>
      ) : (
        <div style={{
          background: `${C.red}12`, border: `2px solid ${C.red}40`,
          borderRadius: 14, padding: 16, textAlign: "center", marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginBottom: 6 }}>أنت خائن!</div>
          <div style={{ fontSize: 32 }}>❓</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>ما تعرف الرمز السري — خمّن!</div>
        </div>
      )}

      {/* Symbol Buttons */}
      {choice === null ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {data.symbols.map((sym, i) => (
            <button key={i} onClick={() => submitChoice(i)} style={{
              padding: "20px 12px", border: `2px solid ${C.purple}40`,
              borderRadius: 14, background: `${C.purple}08`,
              fontSize: 40, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s", minHeight: 80,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {sym}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{data.symbols[choice]}</div>
          <div style={{ fontSize: 14, color: C.muted, animation: "su 0.3s ease" }}>
            اخترت — ننتظر البقية...
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: C.muted }}>
        👥 {data.aliveCount} لاعب باقي
      </div>
    </div>
  );
}
