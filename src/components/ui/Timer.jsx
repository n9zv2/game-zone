import { useState, useEffect } from "react";
import { C } from "../../theme.js";

export default function Timer({ timerEnd, maxSeconds, onDone }) {
  const [time, setTime] = useState(maxSeconds);

  useEffect(() => {
    if (!timerEnd) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTime(remaining);
      if (remaining <= 0) {
        onDone?.();
        return;
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [timerEnd]);

  const pct = maxSeconds > 0 ? (time / maxSeconds) * 100 : 0;
  const low = time <= 5;

  return (
    <div style={{ width: "100%", marginBottom: 14 }}>
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "'Courier New',monospace", fontSize: 32, fontWeight: 900, color: low ? C.red : C.green, animation: low ? "pulse 0.5s infinite" : "none" }}>{time}</span>
      </div>
      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: low ? C.red : C.green, borderRadius: 2, transition: "width 0.3s linear" }} />
      </div>
    </div>
  );
}
