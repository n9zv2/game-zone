import { C } from "../theme.js";

export default function PlayerGrid({ players, myToken }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
      {players.map((p, i) => {
        const isYou = p.token === myToken;
        return (
          <div key={p.token} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            animation: `su 0.3s ${i * 0.04}s backwards`,
          }}>
            <span style={{
              fontSize: 20, width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isYou ? `${C.green}20` : "rgba(255,255,255,0.04)",
              borderRadius: 10,
              border: isYou ? `1px solid ${C.green}40` : "none",
              opacity: p.connected === false ? 0.3 : 1,
            }}>{p.avatar}</span>
            <span style={{ fontSize: 9, color: isYou ? C.green : C.muted, fontWeight: isYou ? 800 : 400, maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{isYou ? "أنت" : p.name}</span>
          </div>
        );
      })}
    </div>
  );
}
