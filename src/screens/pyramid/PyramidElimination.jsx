import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";

export default function PyramidElimination({ data, token, myAlive }) {
  const wasEliminated = data.eliminated.some((p) => p.token === token);
  const hasEliminated = data.eliminated.length > 0;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 8, animation: "pulse 0.8s infinite" }}>
          {hasEliminated ? "⚠️" : "✅"}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: hasEliminated ? C.red : C.green, margin: "0 0 4px" }}>
          {hasEliminated ? "إقصاء!" : "الكل نجح!"}
        </h2>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
          {hasEliminated
            ? `${data.eliminated.length} لاعب انطردوا — راوند ${data.roundIdx + 1}`
            : `راوند ${data.roundIdx + 1} — لا أحد طلع`}
        </p>
      </div>

      {wasEliminated && (
        <Card glow color={C.red} style={{ textAlign: "center", marginBottom: 16, padding: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💀</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.red }}>انطردت!</div>
          <div style={{ fontSize: 13, color: C.muted }}>وصلت لراوند {data.roundIdx + 1}</div>
        </Card>
      )}

      {hasEliminated && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {data.eliminated.map((p, i) => (
            <div key={p.token} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              background: p.token === token ? `${C.red}15` : `${C.red}08`,
              borderRadius: 12, border: `1px solid ${C.red}20`,
              animation: `su 0.4s ${i * 0.15}s backwards`,
            }}>
              <span style={{ fontSize: 24 }}>{p.avatar}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.red }}>
                {p.name} {p.token === token && "(أنت)"}
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>{p.score} ⭐</span>
              <span style={{ fontSize: 20, animation: "pulse 1s infinite" }}>❌</span>
            </div>
          ))}
        </div>
      )}

      <Card style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>المتبقين</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {data.remaining.map((p) => (
            <div key={p.token} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{
                fontSize: 18, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                background: p.token === token ? `${C.green}20` : `${C.green}10`,
                borderRadius: 8, border: p.token === token ? `1px solid ${C.green}40` : "none",
              }}>{p.avatar}</span>
              <span style={{ fontSize: 8, color: C.muted }}>{p.token === token ? "أنت" : p.name}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.green, marginTop: 8 }}>{data.remaining.length} متبقي</div>
      </Card>

      {data.nextDifficulty && (
        <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginBottom: 8 }}>
          الراوند القادم: <span style={{ fontWeight: 800, color: data.nextDifficulty === "extreme" ? C.red : data.nextDifficulty === "hard" ? C.orange : data.nextDifficulty === "medium" ? C.gold : C.green }}>{data.nextDifficulty === "easy" ? "سهل" : data.nextDifficulty === "medium" ? "متوسط" : data.nextDifficulty === "hard" ? "صعب" : "خطير"}</span>
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>
        {wasEliminated ? "⏳ بانتظار باقي اللاعبين..." : "⏳ الراوند القادم قريباً..."}
      </div>
    </div>
  );
}
