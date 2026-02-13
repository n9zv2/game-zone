import { useState, useCallback, useRef } from "react";
import { C } from "../theme.js";
import socket from "../socket.js";
import useSocket from "../hooks/useSocket.js";

const REACTIONS = ["👏", "🔥", "😂", "😱", "💀", "❤️"];
const COOLDOWN_MS = 2000;

export default function ReactionBar({ roomCode, token }) {
  const [floats, setFloats] = useState([]);
  const lastSent = useRef(0);
  const idRef = useRef(0);

  const sendReaction = (emoji) => {
    const now = Date.now();
    if (now - lastSent.current < COOLDOWN_MS) return;
    lastSent.current = now;
    socket.emit("reaction:send", { roomCode, token, emoji });
  };

  useSocket("reaction:receive", useCallback((data) => {
    const id = ++idRef.current;
    const left = 10 + Math.random() * 80;
    setFloats((prev) => [...prev, { id, emoji: data.emoji, left }]);
    setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 2000);
  }, []));

  return (
    <>
      {/* Floating emojis overlay */}
      <div style={{ position: "fixed", bottom: 70, left: 0, right: 0, pointerEvents: "none", zIndex: 999 }}>
        {floats.map((f) => (
          <div key={f.id} style={{
            position: "absolute", bottom: 0, left: `${f.left}%`,
            fontSize: 28, animation: "floatUp 2s ease-out forwards",
          }}>{f.emoji}</div>
        ))}
      </div>

      {/* Reaction bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 6,
        padding: "8px 12px", background: `${C.bg1}ee`,
        borderTop: `1px solid ${C.border}`, zIndex: 998,
      }}>
        {REACTIONS.map((emoji) => (
          <button key={emoji} onClick={() => sendReaction(emoji)} style={{
            fontSize: 22, padding: "6px 10px", background: "rgba(255,255,255,0.05)",
            border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer",
            transition: "transform 0.1s", fontFamily: "inherit",
          }}
          onPointerDown={(e) => { e.currentTarget.style.transform = "scale(0.85)"; }}
          onPointerUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          onPointerLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >{emoji}</button>
        ))}
      </div>
    </>
  );
}
