import { useState } from "react";
import { C } from "../theme.js";

export default function LeaveGameBtn({ onLeave }) {
  const [confirm, setConfirm] = useState(false);

  if (!onLeave) return null;

  if (confirm) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 9999,
      }}>
        <div style={{
          background: C.bg2, borderRadius: 16, padding: "24px 28px",
          border: `1px solid ${C.border}`, textAlign: "center", maxWidth: 300,
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚪</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>تبي تطلع؟</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>راح تخسر تقدمك في اللعبة</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirm(false)} style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${C.border}`,
              background: "transparent", color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>لا، كمّل</button>
            <button onClick={onLeave} style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
              background: C.red, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>اطلع</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} style={{
      position: "fixed", top: 14, left: 14, zIndex: 100,
      width: 48, height: 48, borderRadius: "50%", border: `2px solid ${C.border}`,
      background: `${C.bg2}ee`, color: "#fff", fontSize: 22, fontWeight: 700, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(8px)", boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
    }} title="خروج">✕</button>
  );
}
