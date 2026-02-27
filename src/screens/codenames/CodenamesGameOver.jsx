import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import Btn from "../../components/ui/Btn.jsx";
import Confetti from "../../components/ui/Confetti.jsx";

const TYPE_COLORS = {
  red: { bg: "rgba(211,47,47,0.3)", border: "#F44336", text: "#EF9A9A" },
  blue: { bg: "rgba(21,101,192,0.3)", border: "#2196F3", text: "#90CAF9" },
  neutral: { bg: "rgba(141,110,99,0.2)", border: "#8D6E63", text: "#BCAAA4" },
  assassin: { bg: "#1a1a1a", border: "#555", text: "#fff" },
};

export default function CodenamesGameOver({ data, token, myTeam, onFinish }) {
  const { winningTeam, reason, grid, rankings, clueHistory = [], redFound = 0, blueFound = 0, redTotal = 9, blueTotal = 8 } = data;
  const isWinner = myTeam === winningTeam;
  const winColor = winningTeam === "red" ? C.red : "#4488FF";
  const loseColor = winningTeam === "red" ? "#4488FF" : C.red;

  // Split rankings by team
  const winnerPlayers = rankings.filter((p) => p.team === winningTeam);
  const loserPlayers = rankings.filter((p) => p.team !== winningTeam);

  // Clue stats
  const redClues = clueHistory.filter((c) => c.team === "red").length;
  const blueClues = clueHistory.filter((c) => c.team === "blue").length;

  const reasonText = reason === "assassin"
    ? "💀 الفريق الخاسر اختار الكلمة القاتلة!"
    : "✅ كل الكلمات انكشفت!";

  return (
    <div style={{ paddingTop: 12, animation: "fadeIn 0.3s ease" }}>
      <Confetti show={isWinner} />

      {/* Winner banner */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 56, marginBottom: 6 }}>{isWinner ? "🎉" : "😔"}</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", color: winColor }}>
          {winningTeam === "red" ? "🔴 الأحمر فاز!" : "🔵 الأزرق فاز!"}
        </h2>
        <div style={{ fontSize: 13, color: C.muted }}>{reasonText}</div>
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

      {/* Match summary */}
      <Card style={{ marginBottom: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, marginBottom: 10, textAlign: "center" }}>
          📊 ملخص المباراة
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Red stats */}
          <div style={{
            flex: 1, padding: 10, borderRadius: 10, textAlign: "center",
            background: "rgba(244,67,54,0.08)", border: "1px solid rgba(244,67,54,0.2)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 6 }}>🔴 الأحمر</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.red }}>{redFound}/{redTotal}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>كلمات مكشوفة</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              {redClues} تلميحات
            </div>
          </div>
          {/* Blue stats */}
          <div style={{
            flex: 1, padding: 10, borderRadius: 10, textAlign: "center",
            background: "rgba(33,150,243,0.08)", border: "1px solid rgba(33,150,243,0.2)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4488FF", marginBottom: 6 }}>🔵 الأزرق</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#4488FF" }}>{blueFound}/{blueTotal}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>كلمات مكشوفة</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              {blueClues} تلميحات
            </div>
          </div>
        </div>
      </Card>

      {/* Revealed grid */}
      <Card style={{ marginBottom: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8, textAlign: "center" }}>
          🗺️ خريطة الكلمات
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
          {grid.map((cell, idx) => {
            const colors = TYPE_COLORS[cell.type];
            return (
              <div key={idx} style={{
                padding: "6px 2px", borderRadius: 6, textAlign: "center",
                background: colors?.bg, border: `1px solid ${colors?.border}50`,
                fontSize: "min(10px, 2.5vw)", fontWeight: 700, color: colors?.text,
                opacity: cell.revealed ? 1 : 0.5,
                lineHeight: 1.2,
              }}>
                {cell.type === "assassin" && "💀 "}{cell.word}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Clue history */}
      {clueHistory.length > 0 && (
        <Card style={{ marginBottom: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8, textAlign: "center" }}>
            📋 سجل التلميحات
          </div>
          {clueHistory.map((c, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 0",
              borderBottom: i < clueHistory.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <span style={{ fontSize: 11, color: c.team === "red" ? C.red : "#4488FF" }}>
                {c.team === "red" ? "🔴" : "🔵"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{c.word}</span>
              <span style={{ fontSize: 12, color: C.muted }}>({c.count})</span>
            </div>
          ))}
        </Card>
      )}

      {/* Rankings by team */}
      <Card style={{ marginBottom: 12, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 10, textAlign: "center" }}>
          🏆 النتائج
        </div>

        {/* Winner team */}
        <div style={{ fontSize: 12, fontWeight: 800, color: winColor, marginBottom: 6 }}>
          {winningTeam === "red" ? "🔴" : "🔵"} الفريق الفائز
        </div>
        {winnerPlayers.map((p) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
          }}>
            <span style={{ fontSize: 18 }}>{p.avatar}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: p.token === token ? C.green : "#fff" }}>
              {p.name} {p.token === token && "(أنت)"}
              {p.isSpymaster && " 👑"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{p.score} ⭐</span>
          </div>
        ))}

        {/* Loser team */}
        <div style={{ fontSize: 12, fontWeight: 800, color: loseColor, marginBottom: 6, marginTop: 12 }}>
          {winningTeam === "red" ? "🔵" : "🔴"} الفريق الخاسر
        </div>
        {loserPlayers.map((p) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
          }}>
            <span style={{ fontSize: 18 }}>{p.avatar}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: p.token === token ? C.green : "rgba(255,255,255,0.5)" }}>
              {p.name} {p.token === token && "(أنت)"}
              {p.isSpymaster && " 👑"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,215,0,0.5)" }}>{p.score} ⭐</span>
          </div>
        ))}
      </Card>

      <Btn color={C.gold} onClick={() => onFinish(rankings)}>🏠 النتائج</Btn>
    </div>
  );
}
