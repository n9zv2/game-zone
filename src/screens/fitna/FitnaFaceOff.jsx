import { useState } from "react";
import { C } from "../../theme.js";
import Timer from "../../components/ui/Timer.jsx";
import Badge from "../../components/ui/Badge.jsx";
import socket from "../../socket.js";

export default function FitnaFaceOff({ data, token, roomCode }) {
  const [choice, setChoice] = useState(null);

  const submitChoice = (idx) => {
    if (choice !== null) return;
    setChoice(idx);
    socket.emit("fitna:face-off-answer", {
      roomCode, token, pairIdx: data.pairIdx, choiceIdx: idx,
    });
  };

  // Sitting out view
  if (data.sittingOut) {
    return (
      <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Badge color={C.purple}>🎭 جولة {data.roundIdx + 1}</Badge>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>⚔️</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.purple }}>المواجهة</span>
          </div>
        </div>
        <Timer timerEnd={data.timerEnd} maxSeconds={data.time} />
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "40vh", padding: 20,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "pulse 2s infinite" }}>😴</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.muted }}>جولة راحة</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>عدد اللاعبين فردي — تقعد هالجولة</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 16 }}>👥 {data.aliveCount} لاعب باقي</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Badge color={C.purple}>🎭 جولة {data.roundIdx + 1}</Badge>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>⚔️</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.purple }}>المواجهة</span>
        </div>
      </div>

      <Timer timerEnd={data.timerEnd} maxSeconds={data.time} />

      {/* Opponent info */}
      <div style={{
        background: `${C.purple}10`, border: `1px solid ${C.purple}30`,
        borderRadius: 14, padding: 16, textAlign: "center", marginBottom: 16,
        boxShadow: `0 0 20px ${C.purple}15`,
      }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>مواجهتك مع:</div>
        <div style={{ fontSize: 36, marginBottom: 4 }}>{data.opponentAvatar}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{data.opponentName}</div>
      </div>

      {/* Correct emoji hint (innocents only) */}
      {data.correctEmoji ? (
        <div style={{
          background: `${C.green}12`, border: `1px solid ${C.green}40`,
          borderRadius: 12, padding: 12, textAlign: "center", marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 4 }}>الرمز الصحيح:</div>
          <div style={{ fontSize: 36 }}>{data.correctEmoji}</div>
        </div>
      ) : (
        <div style={{
          background: `${C.red}10`, border: `1px solid ${C.red}30`,
          borderRadius: 12, padding: 12, textAlign: "center", marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>أنت خائن — خمّن الرمز الصحيح!</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>فرصتك 50%</div>
        </div>
      )}

      {/* Emoji choices */}
      {choice === null ? (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {data.emojis.map((emoji, idx) => (
            <button key={idx} onClick={() => submitChoice(idx)} style={{
              flex: 1, padding: "20px 12px", border: `2px solid ${C.purple}40`,
              borderRadius: 16, background: `${C.purple}08`, color: "#fff",
              fontSize: 48, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}>
              {emoji}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 20, animation: "su 0.3s ease" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{data.emojis[choice]}</div>
          <div style={{ fontSize: 14, color: C.muted, fontWeight: 700 }}>تم اختيارك — ننتظر خصمك...</div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: C.muted }}>
        👥 {data.aliveCount} لاعب باقي
      </div>
    </div>
  );
}
