import { C } from "../../theme.js";
import Btn from "../../components/ui/Btn.jsx";
import Confetti from "../../components/ui/Confetti.jsx";

export default function SalfaGameOver({ data, token, onFinish }) {
  const rankings = data.rankings;
  const myRank = rankings.find((r) => r.token === token);
  const isChamp = rankings[0]?.token === token;

  return (
    <div style={{ paddingTop: 16, animation: "fadeIn 0.5s ease" }}>
      <Confetti show={isChamp} />

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 50, marginBottom: 12, animation: "pulse 1.5s infinite" }}>
          {isChamp ? "🏆" : "🕵️"}
        </div>
        <div style={{
          fontSize: 26, fontWeight: 900,
          background: `linear-gradient(135deg, ${C.cyan}, ${C.gold})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          النتائج النهائية
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>مين برا السالفة</div>
      </div>

      {/* Podium */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 8, marginBottom: 24 }}>
        {[1, 0, 2].map((idx) => {
          const p = rankings[idx];
          if (!p) return null;
          const heights = { 0: 130, 1: 100, 2: 80 };
          const colors = { 0: C.gold, 1: "#C0C0C0", 2: "#CD7F32" };
          const medals = { 0: "🥇", 1: "🥈", 2: "🥉" };
          return (
            <div key={p.token} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, animation: `su 0.5s ${idx * 0.15}s backwards`, flex: "1 1 0", maxWidth: 120 }}>
              {idx === 0 && <div style={{ fontSize: 24, animation: "pulse 1.5s infinite" }}>👑</div>}
              <span style={{ fontSize: "min(32px, 8vw)" }}>{p.avatar}</span>
              <span style={{ fontSize: "min(12px, 3vw)", fontWeight: 700, color: p.token === token ? C.cyan : "#fff", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <div style={{
                width: "100%", maxWidth: 80, height: heights[idx], borderRadius: "10px 10px 0 0",
                background: `${colors[idx]}15`, border: `1px solid ${colors[idx]}30`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <div style={{ fontSize: 22 }}>{medals[idx]}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: colors[idx] }}>{p.score}</div>
                <div style={{ fontSize: 9, color: C.muted }}>نقطة</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* My stats */}
      {myRank && (
        <div style={{
          display: "flex", justifyContent: "space-around", textAlign: "center",
          background: `${isChamp ? C.gold : C.cyan}08`, border: `1px solid ${isChamp ? C.gold : C.cyan}20`,
          borderRadius: 14, padding: 16, marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.gold }}>#{myRank.rank}</div>
            <div style={{ fontSize: 10, color: C.muted }}>ترتيبك</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.05)" }} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.green }}>{myRank.score}</div>
            <div style={{ fontSize: 10, color: C.muted }}>نقاطك</div>
          </div>
        </div>
      )}

      {/* Full rankings */}
      <div style={{
        background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`,
        borderRadius: 14, padding: 14, marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 10, textAlign: "center" }}>🏆 الترتيب الكامل</div>
        {rankings.map((p) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
          }}>
            <span style={{
              fontSize: 13, fontWeight: 900, width: 28, textAlign: "center",
              color: p.rank === 1 ? C.gold : p.rank === 2 ? "#C0C0C0" : p.rank === 3 ? "#CD7F32" : C.muted,
            }}>#{p.rank}</span>
            <span style={{ fontSize: 20 }}>{p.avatar}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: p.token === token ? C.cyan : "#fff" }}>
              {p.name} {p.token === token && "(أنت)"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{p.score} ⭐</span>
          </div>
        ))}
      </div>

      <Btn color={C.cyan} onClick={() => onFinish(rankings)}>🔄 مرة ثانية</Btn>
    </div>
  );
}
