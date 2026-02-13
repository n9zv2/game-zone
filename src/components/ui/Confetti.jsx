import { C } from "../../theme.js";

export default function Confetti({ show }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
      {Array.from({ length: 50 }, (_, i) => (
        <div key={i} style={{
          position: "absolute", left: `${Math.random() * 100}%`, top: -10,
          width: Math.random() * 8 + 4, height: Math.random() * 8 + 4,
          background: [C.green, C.gold, C.red, C.cyan, C.pink, C.orange][i % 6],
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          animation: `confetti ${2 + Math.random() * 2}s ${Math.random() * 2}s ease-out forwards`,
        }} />
      ))}
    </div>
  );
}
