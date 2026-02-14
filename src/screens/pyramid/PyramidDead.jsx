import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";

const DIFF_META = {
  easy:    { name: "سهل",   color: C.green,  icon: "🟢" },
  medium:  { name: "متوسط", color: C.gold,   icon: "🟡" },
  hard:    { name: "صعب",   color: C.orange, icon: "🟠" },
  extreme: { name: "خطير",  color: C.red,    icon: "🔴" },
};

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export default function PyramidDead({
  score, level, roundData, revealData, roomCode, token,
  answeredTokens, answerProgress, alivePlayers, totalPlayers, totalRounds,
}) {
  const hasLiveData = !!roundData;
  const diffMeta = hasLiveData ? (DIFF_META[roundData.difficulty] || DIFF_META.easy) : null;
  const showReveal = !!revealData && hasLiveData;
  const aliveCount = alivePlayers?.length || 0;
  const { answeredCount = 0, totalAlive = 0 } = answerProgress || {};

  return (
    <div style={{ textAlign: "center", paddingTop: 12, paddingBottom: 16, animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 32, marginBottom: 2 }}>👻</div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: C.red, margin: "0 0 4px" }}>أنت متفرج</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>⭐ {score} نقطة</span>
          <span style={{ fontSize: 13, color: C.orange, fontWeight: 700 }}>وصلت راوند {level + 1}{totalRounds ? `/${totalRounds}` : ""}</span>
        </div>
      </div>

      {/* Scoreboard */}
      {alivePlayers && alivePlayers.length > 0 && (
        <Card style={{ marginBottom: 12, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.muted, marginBottom: 8, textAlign: "center" }}>
            📊 الترتيب ({aliveCount} متبقي من {totalPlayers || "?"})
          </div>
          {alivePlayers.map((p, i) => {
            const hasAnswered = answeredTokens?.has(p.token);
            const rankIcon = RANK_ICONS[i] || `${i + 1}.`;
            return (
              <div key={p.token} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 0",
                borderBottom: i < alivePlayers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{rankIcon}</span>
                <span style={{ fontSize: 14 }}>{p.avatar}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#fff", textAlign: "right" }}>{p.name}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.gold, minWidth: 50, textAlign: "center" }}>⭐ {p.score}</span>
                {!showReveal && (
                  <span style={{
                    fontSize: 14, width: 22, textAlign: "center",
                    transition: "all 0.3s ease",
                  }}>
                    {hasAnswered ? "✅" : "⏳"}
                  </span>
                )}
              </div>
            );
          })}
          {!showReveal && totalAlive > 0 && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6, fontWeight: 700 }}>
              {answeredCount}/{totalAlive} جاوبوا
            </div>
          )}
        </Card>
      )}

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
    </div>
  );
}
