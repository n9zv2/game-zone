import { C } from "../../theme.js";

export default function CodenamesTeams({
  teams, token, myTeam, currentTeam,
  redTotal = 9, blueTotal = 8, redFound = 0, blueFound = 0,
  compact = false,
}) {
  if (!teams) return null;

  const redLeft = redTotal - redFound;
  const blueLeft = blueTotal - blueFound;

  // Compact mode: horizontal bar above the board during gameplay
  if (compact) {
    return (
      <div style={{
        display: "flex", gap: 6, marginBottom: 8, alignItems: "stretch",
      }}>
        {/* Red team */}
        <div style={{
          flex: 1, padding: "8px 10px", borderRadius: 10,
          background: currentTeam === "red" ? "rgba(244,67,54,0.12)" : "rgba(255,255,255,0.03)",
          border: currentTeam === "red" ? "1.5px solid rgba(244,67,54,0.4)" : `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "all 0.3s",
          boxShadow: currentTeam === "red" ? "0 0 12px rgba(244,67,54,0.15)" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12 }}>🔴</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.red }}>الأحمر</span>
          </div>
          <div style={{
            fontSize: 20, fontWeight: 900, color: C.red,
            textShadow: currentTeam === "red" ? "0 0 10px rgba(244,67,54,0.4)" : "none",
          }}>{redLeft}</div>
        </div>

        {/* Blue team */}
        <div style={{
          flex: 1, padding: "8px 10px", borderRadius: 10,
          background: currentTeam === "blue" ? "rgba(33,150,243,0.12)" : "rgba(255,255,255,0.03)",
          border: currentTeam === "blue" ? "1.5px solid rgba(33,150,243,0.4)" : `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "all 0.3s",
          boxShadow: currentTeam === "blue" ? "0 0 12px rgba(33,150,243,0.15)" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12 }}>🔵</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4488FF" }}>الأزرق</span>
          </div>
          <div style={{
            fontSize: 20, fontWeight: 900, color: "#4488FF",
            textShadow: currentTeam === "blue" ? "0 0 10px rgba(33,150,243,0.4)" : "none",
          }}>{blueLeft}</div>
        </div>
      </div>
    );
  }

  // Full mode: team reveal screen
  const renderTeam = (team, color, label, emoji, totalLeft) => {
    const data = teams[team];
    if (!data) return null;

    const isActive = currentTeam === team;
    const spymasterToken = data.spymaster;

    return (
      <div style={{
        flex: 1, padding: 12, borderRadius: 14,
        background: isActive ? `${color}12` : "rgba(255,255,255,0.03)",
        border: isActive ? `2px solid ${color}40` : `1px solid ${C.border}`,
        boxShadow: isActive ? `0 0 20px ${color}15` : "none",
        transition: "all 0.3s",
      }}>
        {/* Team header with word count */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 10,
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color }}>
            {emoji} {label}
          </div>
          <div style={{
            fontSize: 24, fontWeight: 900, color,
            textShadow: `0 0 15px ${color}40`,
          }}>{totalLeft}</div>
        </div>

        {/* Spymaster */}
        {data.players.filter((p) => p.token === spymasterToken).map((p) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
            borderRadius: 8, background: `${color}10`, marginBottom: 6,
          }}>
            <span style={{ fontSize: 11, color: C.gold }}>👑</span>
            <span style={{ fontSize: 16 }}>{p.avatar}</span>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: p.token === token ? C.green : "#fff",
            }}>
              {p.name} {p.token === token && "(أنت)"}
            </span>
          </div>
        ))}

        {/* Operatives */}
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4, marginTop: 4 }}>
          المخمنين
        </div>
        {data.players.filter((p) => p.token !== spymasterToken).map((p) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "3px 0",
          }}>
            <span style={{ fontSize: 16 }}>{p.avatar}</span>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: p.token === token ? C.green : "#fff",
            }}>
              {p.name} {p.token === token && "(أنت)"}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {renderTeam("red", C.red, "الأحمر", "🔴", redLeft)}
      {renderTeam("blue", "#4488FF", "الأزرق", "🔵", blueLeft)}
    </div>
  );
}
