import { useState, useEffect } from "react";
import { C } from "../../theme.js";

export default function FitnaElimination({ data }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 1000);
    return () => clearTimeout(t);
  }, []);

  if (data.saved) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
        <div style={{ fontSize: 60, marginBottom: 16, animation: "pulse 1.5s infinite" }}>🛡️</div>
        <div style={{ fontSize: 28 }}>{data.avatar}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.cyan, marginTop: 8 }}>{data.name} محمي!</div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>الدرع أنقذه من الطرد!</div>
      </div>
    );
  }

  const isSaboteur = data.role === "saboteur";
  const flashColor = isSaboteur ? C.green : C.red;
  const roleText = isSaboteur ? "مخرب 🔥" : data.role === "detective" ? "محقق 🔍" : "بريء 😇";
  const feedbackText = isSaboteur ? "عمل ممتاز! مخرب أقل" : "للأسف... كان بريء";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "70vh", padding: 20,
      animation: flipped ? `correctFlash 0.6s ease` : "none",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 20 }}>تم طرد...</div>

      {/* Card flip */}
      <div style={{ width: 180, height: 240, perspective: 800 }}>
        <div style={{
          width: "100%", height: "100%", position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.8s ease",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}>
          {/* Back */}
          <div style={{
            position: "absolute", width: "100%", height: "100%",
            backfaceVisibility: "hidden",
            background: `linear-gradient(135deg, ${C.purple}, ${C.purple}88)`,
            borderRadius: 20, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            border: `2px solid ${C.purple}`,
          }}>
            <span style={{ fontSize: 40 }}>{data.avatar}</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: 8 }}>{data.name}</div>
          </div>
          {/* Front */}
          <div style={{
            position: "absolute", width: "100%", height: "100%",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: `linear-gradient(135deg, ${flashColor}20, ${C.bg2})`,
            borderRadius: 20, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            border: `2px solid ${flashColor}`,
            boxShadow: `0 0 40px ${flashColor}40`,
          }}>
            <span style={{ fontSize: 40 }}>{data.avatar}</span>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginTop: 8 }}>{data.name}</div>
            <div style={{
              marginTop: 12, padding: "6px 16px", borderRadius: 20,
              background: `${flashColor}20`, border: `1px solid ${flashColor}50`,
              fontSize: 16, fontWeight: 900, color: flashColor,
            }}>
              {roleText}
            </div>
          </div>
        </div>
      </div>

      {flipped && (
        <div style={{ marginTop: 24, textAlign: "center", animation: "su 0.5s ease" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: flashColor }}>{feedbackText}</div>
        </div>
      )}
    </div>
  );
}
