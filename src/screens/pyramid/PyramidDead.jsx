import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import ReactionBar from "../../components/ReactionBar.jsx";

const DIFF_META = {
  easy:    { name: "سهل",   color: C.green,  icon: "🟢" },
  medium:  { name: "متوسط", color: C.gold,   icon: "🟡" },
  hard:    { name: "صعب",   color: C.orange, icon: "🟠" },
  extreme: { name: "خطير",  color: C.red,    icon: "🔴" },
};

export default function PyramidDead({ score, level, roundData, revealData, roomCode, token }) {
  const hasLiveData = !!roundData;
  const diffMeta = hasLiveData ? (DIFF_META[roundData.difficulty] || DIFF_META.easy) : null;
  const showReveal = !!revealData && hasLiveData;

  return (
    <div style={{ textAlign: "center", paddingTop: 16, paddingBottom: 70, animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 40, marginBottom: 4 }}>👻</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: C.red, margin: "0 0 4px" }}>أنت متفرج</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>⭐ {score} نقطة</span>
          <span style={{ fontSize: 13, color: C.orange, fontWeight: 700 }}>مرحلة {level + 1}/5</span>
        </div>
      </div>

      {/* Live question view */}
      {hasLiveData ? (
        <div style={{ animation: "su 0.3s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10 }}>
            <Badge color={diffMeta.color}>{diffMeta.icon} {diffMeta.name}</Badge>
            <Badge color={C.muted}>راوند {roundData.roundIdx + 1}/{roundData.totalRounds}</Badge>
          </div>

          <Card glow color={diffMeta.color} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.6 }}>{roundData.question}</div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {roundData.options.map((opt, i) => {
              const isCorrect = showReveal && i === revealData.correctIdx;
              return (
                <div key={i} style={{
                  padding: 12, borderRadius: 12, textAlign: "center",
                  border: isCorrect ? `2px solid ${C.green}` : `1px solid ${diffMeta.color}20`,
                  background: isCorrect ? `${C.green}20` : `${diffMeta.color}06`,
                  fontSize: 13, fontWeight: 700, color: "#fff",
                  animation: isCorrect ? "correctFlash 0.6s ease" : undefined,
                }}>{opt}{isCorrect && " ✅"}</div>
              );
            })}
          </div>

          {/* Player answers after reveal */}
          {showReveal && revealData.results && (
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textAlign: "center" }}>إجابات اللاعبين</div>
              {revealData.results.map((r) => (
                <div key={r.token} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "4px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}>
                  <span style={{ fontSize: 14 }}>{r.avatar}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: r.correct ? C.green : C.red }}>{r.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: r.correct ? C.green : C.red }}>
                    {r.correct ? `+${r.points} ✅` : "❌"}
                  </span>
                </div>
              ))}
            </Card>
          )}

          {!showReveal && (
            <div style={{ fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>
              ⏳ بانتظار إجابات اللاعبين...
            </div>
          )}
        </div>
      ) : (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: C.muted, animation: "pulse 1.5s infinite" }}>
            ⏳ بانتظار الراوند التالي...
          </div>
        </Card>
      )}

      <ReactionBar roomCode={roomCode} token={token} />
    </div>
  );
}
