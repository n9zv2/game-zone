import { C } from "../theme.js";

export default function PlayerAvatar({ name, avatar, isYou, size = 36, style = {} }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, ...style }}>
      <span style={{
        fontSize: size * 0.6, width: size, height: size,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isYou ? `${C.green}20` : "rgba(255,255,255,0.04)",
        borderRadius: size * 0.3,
        border: isYou ? `1px solid ${C.green}40` : "none",
      }}>{avatar}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: isYou ? C.green : "#fff" }}>{name}{isYou ? " (أنت)" : ""}</span>
    </div>
  );
}
