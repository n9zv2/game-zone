import { useEffect, useState } from "react";
import { C } from "../theme.js";

export default function LevelUpOverlay({ level, onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", animation: "fadeIn 0.3s ease",
    }}>
      <div style={{ fontSize: 60, animation: "pulse 0.6s infinite" }}>🎉</div>
      <div style={{
        fontSize: 32, fontWeight: 900, marginTop: 12,
        background: `linear-gradient(135deg, ${C.gold}, ${C.orange})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>مستوى جديد!</div>
      <div style={{
        fontSize: 64, fontWeight: 900, color: C.gold, marginTop: 8,
        fontFamily: "'Courier New',monospace", textShadow: `0 0 40px ${C.gold}60`,
      }}>Lv.{level}</div>
      <div style={{ fontSize: 14, color: C.muted, marginTop: 12 }}>استمر في اللعب لرفع مستواك!</div>
    </div>
  );
}
