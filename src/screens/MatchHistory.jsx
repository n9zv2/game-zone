import { C } from "../theme.js";
import Card from "../components/ui/Card.jsx";
import Btn from "../components/ui/Btn.jsx";
import { getMatchHistory } from "../session.js";

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

export default function MatchHistory({ onBack }) {
  const history = getMatchHistory();

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "8px 14px", color: "#fff", cursor: "pointer",
          fontFamily: "inherit", fontSize: 14, fontWeight: 700,
        }}>← رجوع</button>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: C.text }}>📜 سجل المباريات</h2>
      </div>

      {history.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 14, color: C.muted }}>ما عندك مباريات بعد — العب أول مباراة!</div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {history.map((m, i) => (
            <Card key={i} style={{
              padding: 14, display: "flex", gap: 12, alignItems: "center",
              animation: `su 0.3s ${i * 0.05}s backwards`,
            }}>
              <div style={{
                fontSize: 28, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                background: m.gameType === "pyramid" ? `${C.red}12` : `${C.orange}12`, borderRadius: 10,
              }}>
                {m.gameType === "pyramid" ? "🔺" : "⚔️"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: m.rank === 1 ? C.gold : "#fff" }}>
                    #{m.rank}
                  </span>
                  <span style={{ fontSize: 12, color: C.muted }}>من {m.totalPlayers}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>⭐ {m.score}</span>
                  <span style={{ fontSize: 10, color: C.muted }}>{timeAgo(m.date)}</span>
                </div>
              </div>
              {m.rank === 1 && <span style={{ fontSize: 22 }}>🥇</span>}
              {m.rank === 2 && <span style={{ fontSize: 22 }}>🥈</span>}
              {m.rank === 3 && <span style={{ fontSize: 22 }}>🥉</span>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
