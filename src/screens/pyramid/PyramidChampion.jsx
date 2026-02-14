import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import Btn from "../../components/ui/Btn.jsx";
import Confetti from "../../components/ui/Confetti.jsx";

const DIFFICULTY_LABELS = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  extreme: "خبير",
};

const DIFFICULTY_COLORS = {
  easy: C.green,
  medium: C.gold,
  hard: C.orange,
  extreme: C.red,
};

export default function PyramidChampion({ data, token, onFinish }) {
  // --- Solo mode display ---
  if (data.solo) {
    const player = data.rankings[0];
    const diffLabel = DIFFICULTY_LABELS[data.difficulty] || data.difficulty;
    const diffColor = DIFFICULTY_COLORS[data.difficulty] || C.muted;

    return (
      <div style={{ textAlign: "center", paddingTop: 20, animation: "fadeIn 0.3s ease" }}>
        <div style={{ fontSize: "min(80px, 18vw)", marginBottom: 8 }}>🎯</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 12px", color: C.text }}>خلصت!</h1>

        <Card glow color={C.gold} style={{ marginBottom: 20, padding: "24px 20px" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.gold, marginBottom: 16 }}>⭐ {player.score} نقطة</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>📊 وصلت للراوند {data.maxRound}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: diffColor }}>مستوى الصعوبة: {diffLabel}</div>
        </Card>

        <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
          <Btn color={C.green} onClick={() => onFinish(data.rankings)}>🔄 مرة ثانية</Btn>
          <Btn dark onClick={() => onFinish(data.rankings)}>🏠 رجوع</Btn>
        </div>
      </div>
    );
  }

  // --- Normal multiplayer display ---
  const isChamp = data.champion.token === token;
  const myRank = data.rankings.find((r) => r.token === token);

  return (
    <div style={{ textAlign: "center", paddingTop: 20, animation: "fadeIn 0.3s ease" }}>
      <Confetti show={isChamp} />

      {isChamp ? (
        <>
          <div style={{ fontSize: "min(90px, 20vw)", marginBottom: 8, animation: "pulse 1.5s infinite", filter: "drop-shadow(0 0 30px rgba(255,215,0,0.5))" }}>👑</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 4px", background: `linear-gradient(135deg, ${C.gold}, ${C.orange})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>بطل الهرم!</h1>
        </>
      ) : (
        <>
          <div style={{ fontSize: 60, marginBottom: 8 }}>{myRank?.rank <= 3 ? "🏅" : "💀"}</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: C.muted }}>المركز #{myRank?.rank}</h2>
        </>
      )}

      {/* Podium */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 8, margin: "20px 0" }}>
        {data.rankings.slice(0, 3).map((p, i) => {
          const heights = [120, 90, 70];
          const colors = [C.gold, "#C0C0C0", "#CD7F32"];
          const rank = i + 1;
          return (
            <div key={p.token} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 28 }}>{p.avatar}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: p.token === token ? C.green : "#fff", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <div style={{
                width: 70, height: heights[i], borderRadius: "8px 8px 0 0",
                background: `${colors[i]}20`, border: `1px solid ${colors[i]}40`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: colors[i] }}>{p.score}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Rankings */}
      <Card style={{ marginBottom: 16, textAlign: "right" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textAlign: "center" }}>الترتيب الكامل</div>
        {data.rankings.map((p) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
            opacity: p.alive ? 1 : 0.6,
          }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: C.gold, width: 24 }}>#{p.rank}</span>
            <span style={{ fontSize: 18 }}>{p.avatar}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: p.token === token ? C.green : "#fff" }}>{p.name}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{p.score} ⭐</span>
          </div>
        ))}
      </Card>

      <Btn color={C.gold} onClick={() => onFinish(data.rankings)}>🏠 النتائج</Btn>
    </div>
  );
}
