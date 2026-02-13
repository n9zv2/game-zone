import { C } from "../../theme.js";

export default function Btn({ children, color = C.green, dark, onClick, disabled, full = true, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? "100%" : "auto", padding: "14px 22px", border: "none", borderRadius: 12,
      fontSize: 15, fontWeight: 800, cursor: disabled ? "default" : "pointer",
      fontFamily: "inherit", direction: "rtl", opacity: disabled ? 0.35 : 1,
      background: dark ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${color}, ${color}cc)`,
      color: dark ? "#fff" : C.bg1, transition: "all 0.2s", ...style,
    }}>{children}</button>
  );
}
