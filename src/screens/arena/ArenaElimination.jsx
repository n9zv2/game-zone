import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";

export default function ArenaElimination({ data, token, myAlive }) {
  const wasEliminated = data.eliminated.some((p) => p.token === token);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8, animation: "pulse 0.8s infinite" }}>⚠️</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.red, margin: "0 0 4px" }}>إقصاء!</h2>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{data.eliminated.length} انطردوا</p>
      </div>

      {wasEliminated && (
        <Card glow color={C.red} style={{ textAlign: "center", marginBottom: 16, padding: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💀</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.red }}>طلعت من الحلبة!</div>
        </Card>
      )}

      {/* Round scores */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textAlign: "center" }}>نتائج الجولة</div>
        {data.scores?.sort((a, b) => b.roundScore - a.roundScore).map((p, i) => {
          const elim = data.eliminated.some((e) => e.token === p.token);
          return (
            <div key={p.token} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              opacity: elim ? 0.5 : 1,
            }}>
              <span style={{ fontSize: 16 }}>{p.avatar}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: p.token === token ? C.green : "#fff" }}>{p.name}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>+{p.roundScore}</span>
              {elim && <span style={{ fontSize: 14 }}>❌</span>}
            </div>
          );
        })}
      </Card>

      <Card style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>المتبقين</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
          {data.remaining.map((p) => <span key={p.token} style={{ fontSize: 16 }}>{p.avatar}</span>)}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.green, marginTop: 6 }}>{data.remaining.length} متبقي</div>
      </Card>

      <div style={{ textAlign: "center", fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>
        {wasEliminated ? "⏳ بانتظار نهاية اللعبة..." : "⏳ التحدي التالي قريباً..."}
      </div>
    </div>
  );
}
