import { C } from "../../theme.js";

export default function Badge({ children, color = C.green }) {
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}25` }}>{children}</span>
  );
}
