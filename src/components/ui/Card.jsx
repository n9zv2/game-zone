import { C } from "../../theme.js";

export default function Card({ children, glow, color = C.green, onClick, style = {} }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18,
      ...(glow ? { boxShadow: `0 0 30px ${color}20`, border: `1px solid ${color}30` } : {}),
      ...(onClick ? { cursor: "pointer", transition: "all 0.2s" } : {}), ...style,
    }}>{children}</div>
  );
}
