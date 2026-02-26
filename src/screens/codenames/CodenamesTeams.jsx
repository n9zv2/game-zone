import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";

export default function CodenamesTeams({ teams, token, myTeam }) {
  if (!teams) return null;

  const renderTeam = (team, color, label, emoji) => {
    const data = teams[team];
    if (!data) return null;

    return (
      <Card color={color} glow={team === myTeam} style={{ flex: 1, padding: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 8, textAlign: "center" }}>
          {emoji} {label}
        </div>
        {data.players.map((p) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 0",
          }}>
            <span style={{ fontSize: 18 }}>{p.avatar}</span>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: p.token === token ? C.green : "#fff",
            }}>
              {p.name} {p.token === token && "(أنت)"}
            </span>
            {p.token === data.spymaster && (
              <span style={{ fontSize: 11, color: C.gold }}>👑</span>
            )}
          </div>
        ))}
      </Card>
    );
  };

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {renderTeam("red", C.red, "الأحمر", "🔴")}
      {renderTeam("blue", "#4488FF", "الأزرق", "🔵")}
    </div>
  );
}
