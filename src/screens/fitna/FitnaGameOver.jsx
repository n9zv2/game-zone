import { C } from "../../theme.js";
import Btn from "../../components/ui/Btn.jsx";
import Confetti from "../../components/ui/Confetti.jsx";

export default function FitnaGameOver({ data, token, onFinish }) {
  const myRanking = data.rankings.find((r) => r.token === token);
  const humanWon = myRanking?.won || false;
  const winnerText = data.winner === "innocents" ? "فاز الأبرياء! 😇" : "فاز المخربين! 🔥";
  const humanRoleText = myRanking?.role === "saboteur" ? "مخرب 🔥" : myRanking?.role === "detective" ? "محقق 🔍" : "بريء 😇";

  return (
    <div style={{ animation: "fadeIn 0.5s ease", padding: "20px 4px", textAlign: "center" }}>
      <Confetti show={humanWon} />

      {/* Winner banner */}
      <div style={{ fontSize: 50, marginBottom: 12, animation: "pulse 1.5s infinite" }}>
        {humanWon ? "🏆" : "💀"}
      </div>

      <div style={{
        fontSize: 26, fontWeight: 900, marginBottom: 8,
        background: `linear-gradient(135deg, ${humanWon ? C.green : C.red}, ${humanWon ? C.gold : C.purple})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        {winnerText}
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: humanWon ? C.green : C.red }}>
        {humanWon ? "أنت فزت!" : "أنت خسرت!"}
      </div>

      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
        دورك: {humanRoleText} — {data.roundsPlayed} جولة
      </div>

      {/* Score breakdown */}
      {myRanking?.scoreBreakdown && myRanking.scoreBreakdown.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.gold, marginBottom: 10 }}>تفصيل النقاط:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {myRanking.scoreBreakdown.map((item, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: `${C.gold}08`, border: `1px solid ${C.gold}15`,
                borderRadius: 8, padding: "6px 12px",
                animation: `su 0.3s ${i * 0.06}s backwards`,
              }}>
                <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: 13, color: C.gold, fontWeight: 800 }}>+{item.value}</span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: `${C.gold}15`, border: `1px solid ${C.gold}30`,
              borderRadius: 8, padding: "8px 12px", marginTop: 4,
            }}>
              <span style={{ fontSize: 14, color: C.gold, fontWeight: 900 }}>المجموع</span>
              <span style={{ fontSize: 18, color: C.gold, fontWeight: 900 }}>{myRanking.totalScore}</span>
            </div>
          </div>
        </div>
      )}

      {/* All roles reveal */}
      <div style={{ fontSize: 14, fontWeight: 800, color: C.purple, marginBottom: 12 }}>كشف الأدوار:</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 20 }}>
        {data.rankings.map((p, i) => {
          const roleColor = p.role === "saboteur" ? C.red : p.role === "detective" ? C.cyan : C.green;
          const roleEmoji = p.role === "saboteur" ? "🔥" : p.role === "detective" ? "🔍" : "😇";
          const isMe = p.token === token;
          return (
            <div key={i} style={{
              background: isMe ? `${C.purple}15` : `rgba(255,255,255,0.03)`,
              border: `1px solid ${isMe ? C.purple : roleColor}30`,
              borderRadius: 10, padding: "8px 4px", textAlign: "center",
              opacity: p.alive ? 1 : 0.5,
              animation: `su 0.3s ${i * 0.04}s backwards`,
            }}>
              <div style={{ fontSize: 20 }}>{p.avatar}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: isMe ? C.purple : C.text, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name} {isMe ? "(أنت)" : ""}
              </div>
              <div style={{ fontSize: 12, marginTop: 2, color: roleColor, fontWeight: 800 }}>{roleEmoji}</div>
              {!p.alive && <div style={{ fontSize: 9, color: C.muted }}>مطرود</div>}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Btn color={C.purple} onClick={() => onFinish(data.rankings)}>🔄 مرة ثانية</Btn>
      </div>
    </div>
  );
}
