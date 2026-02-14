import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";

export default function SalfaRoundResult({ data, token }) {
  const outcomeText = data.outcome === "spy"
    ? "الجاسوس فاز! 🕵️"
    : data.outcome === "spy-guessed"
    ? "الجاسوس خمّن الكلمة! 🕵️"
    : "الأبرياء فازوا! 🎉";

  const outcomeColor = data.outcome === "innocents" ? C.green : C.red;

  const myScore = data.scores.find((s) => s.token === token);

  return (
    <div style={{ animation: "fadeIn 0.5s ease", padding: "16px 0" }}>
      {/* Result banner */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>
          {data.outcome === "innocents" ? "🎉" : "🕵️"}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 900,
          background: `linear-gradient(135deg, ${outcomeColor}, ${C.gold})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {outcomeText}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
          الجولة {data.roundIdx} من {data.totalRounds}
        </div>
      </div>

      {/* Word reveal */}
      <Card glow color={C.gold} style={{ textAlign: "center", marginBottom: 16, padding: "16px 20px" }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>الكلمة كانت:</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.gold }}>{data.word}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>التصنيف: {data.category}</div>
      </Card>

      {/* Spy reveal */}
      <Card style={{ marginBottom: 16, padding: 14, border: `1px solid ${C.red}30`, background: `${C.red}06` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 8, textAlign: "center" }}>
          {data.spies.length > 1 ? "الجواسيس كانوا:" : "الجاسوس كان:"}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {data.spies.map((spy) => (
            <div key={spy.token} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>{spy.avatar}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: spy.token === token ? C.cyan : C.red, marginTop: 4 }}>
                {spy.name} {spy.token === token ? "(أنت)" : ""}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* My score */}
      {myScore && (
        <Card glow color={myScore.points > 0 ? C.green : C.muted} style={{ marginBottom: 16, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 4 }}>نقاطك هالجولة</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: myScore.points > 0 ? C.green : C.red }}>+{myScore.points}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>المجموع: {myScore.totalScore}</div>
        </Card>
      )}

      {/* All scores */}
      <Card style={{ padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textAlign: "center" }}>ترتيب النقاط:</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[...data.scores].sort((a, b) => b.totalScore - a.totalScore).map((s, i) => (
            <div key={s.token} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
              background: s.token === token ? `${C.cyan}10` : "rgba(255,255,255,0.02)",
              borderRadius: 8, animation: `su 0.3s ${i * 0.04}s backwards`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: C.gold, width: 20 }}>#{i + 1}</span>
              <span style={{ fontSize: 18 }}>{s.avatar}</span>
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1, color: s.token === token ? C.cyan : C.text }}>
                {s.name} {s.isSpy ? "🕵️" : ""}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: s.points > 0 ? C.green : C.muted }}>+{s.points}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>{s.totalScore}</span>
            </div>
          ))}
        </div>
      </Card>

      {data.roundIdx < data.totalRounds && (
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: C.muted, animation: "pulse 2s infinite" }}>
          ⏳ الجولة القادمة تبدأ قريب...
        </div>
      )}
    </div>
  );
}
