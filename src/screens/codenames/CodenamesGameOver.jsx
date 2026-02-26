import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import Btn from "../../components/ui/Btn.jsx";
import Confetti from "../../components/ui/Confetti.jsx";

const TYPE_COLORS = {
  red: { bg: "#FF444430", border: "#FF4444", text: "#FF6666" },
  blue: { bg: "#4488FF30", border: "#4488FF", text: "#6699FF" },
  neutral: { bg: "#8B7D6B30", border: "#8B7D6B", text: "#C4B599" },
  assassin: { bg: "#1a1a1a", border: "#555", text: "#fff" },
};

export default function CodenamesGameOver({ data, token, myTeam, onFinish }) {
  const { winningTeam, reason, grid, rankings } = data;
  const isWinner = myTeam === winningTeam;
  const winColor = winningTeam === "red" ? C.red : "#4488FF";

  return (
    <div style={{ paddingTop: 16, animation: "fadeIn 0.3s ease" }}>
      <Confetti show={isWinner} />

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>{isWinner ? "🎉" : "😔"}</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", color: winColor }}>
          {winningTeam === "red" ? "🔴 الأحمر فاز!" : "🔵 الأزرق فاز!"}
        </h2>
        <div style={{ fontSize: 13, color: C.muted }}>
          {reason === "assassin" ? "💀 الفريق الخاسر اختار الكلمة القاتلة!" : "✅ كل الكلمات انكشفت!"}
        </div>
        <div style={{
          marginTop: 8, padding: "6px 16px", borderRadius: 20,
          background: isWinner ? `${C.green}20` : `${C.red}20`,
          border: `1px solid ${isWinner ? C.green : C.red}40`,
          display: "inline-block", fontSize: 14, fontWeight: 800,
          color: isWinner ? C.green : C.red,
        }}>
          {isWinner ? "فريقك فاز! 🏆" : "فريقك خسر"}
        </div>
      </div>

      {/* Revealed grid */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8, textAlign: "center" }}>🗺️ خريطة الكلمات</div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3,
        }}>
          {grid.map((cell, idx) => {
            const colors = TYPE_COLORS[cell.type];
            return (
              <div key={idx} style={{
                padding: "6px 2px", borderRadius: 6, textAlign: "center",
                background: colors?.bg, border: `1px solid ${colors?.border}50`,
                fontSize: "min(10px, 2.5vw)", fontWeight: 700, color: colors?.text,
                opacity: cell.revealed ? 1 : 0.6,
                lineHeight: 1.2,
              }}>
                {cell.type === "assassin" && "💀 "}{cell.word}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Rankings */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 10, textAlign: "center" }}>🏆 النتائج</div>
        {rankings.map((p) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
          }}>
            <span style={{
              fontSize: 11, fontWeight: 800, width: 24,
              color: p.team === "red" ? C.red : "#4488FF",
            }}>{p.team === "red" ? "🔴" : "🔵"}</span>
            <span style={{ fontSize: 18 }}>{p.avatar}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: p.token === token ? C.green : "#fff" }}>
              {p.name} {p.token === token && "(أنت)"}
              {p.isSpymaster && " 👑"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{p.score} ⭐</span>
          </div>
        ))}
      </Card>

      <Btn color={C.gold} onClick={() => onFinish(rankings)}>🏠 النتائج</Btn>
    </div>
  );
}
