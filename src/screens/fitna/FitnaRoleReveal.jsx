import { useState, useEffect } from "react";
import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";

const ROLE_CONFIG = {
  saboteur:  { title: "أنت مخرب", emoji: "🔥", color: C.red, desc: "هدفك: اخرب بدون ما ينكشف أمرك!" },
  detective: { title: "أنت محقق", emoji: "🔍", color: C.cyan, desc: "هدفك: حقق مع اللاعبين واكشف المخربين! كل جولة تحقق مع شخص واحد." },
  innocent:  { title: "أنت بريء", emoji: "😇", color: C.green, desc: "هدفك: اكتشف المخربين واطردهم!" },
};

export default function FitnaRoleReveal({ data }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 800);
    return () => clearTimeout(t);
  }, []);

  const config = ROLE_CONFIG[data.role] || ROLE_CONFIG.innocent;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: 20 }}>
      <div style={{
        width: 220, height: 300, perspective: 800, cursor: "pointer",
      }} onClick={() => setFlipped(true)}>
        <div style={{
          width: "100%", height: "100%", position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.8s ease",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}>
          {/* Back of card */}
          <div style={{
            position: "absolute", width: "100%", height: "100%",
            backfaceVisibility: "hidden",
            background: `linear-gradient(135deg, ${C.purple}, ${C.purple}88)`,
            borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${C.purple}`,
            boxShadow: `0 0 40px ${C.purple}40`,
          }}>
            <span style={{ fontSize: 60 }}>🎭</span>
          </div>
          {/* Front of card (revealed) */}
          <div style={{
            position: "absolute", width: "100%", height: "100%",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: `linear-gradient(135deg, ${config.color}20, ${C.bg2})`,
            borderRadius: 20, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 16,
            border: `2px solid ${config.color}`,
            boxShadow: `0 0 40px ${config.color}40`,
          }}>
            <span style={{ fontSize: 50, marginBottom: 12 }}>{config.emoji}</span>
            <div style={{ fontSize: 22, fontWeight: 900, color: config.color, marginBottom: 8 }}>{config.title}</div>
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>{config.desc}</div>
          </div>
        </div>
      </div>

      {flipped && (
        <div style={{ marginTop: 24, animation: "su 0.5s ease", textAlign: "center" }}>
          {data.role === "saboteur" && data.partners && data.partners.length > 0 && (
            <Card style={{ background: `${C.red}10`, border: `1px solid ${C.red}30`, padding: 14 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                {data.partners.length === 1 ? "شريكك في التخريب:" : "شركاؤك في التخريب:"}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {data.partners.map((p, i) => (
                  <div key={i} style={{ fontSize: 16, fontWeight: 800, color: C.red }}>
                    {p.avatar} {p.name}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {data.role === "saboteur" && (!data.partners || data.partners.length === 0) && (
            <Card style={{ background: `${C.red}10`, border: `1px solid ${C.red}30`, padding: 14 }}>
              <div style={{ fontSize: 13, color: C.red, fontWeight: 700 }}>أنت الخائن الوحيد!</div>
            </Card>
          )}
          {data.role === "detective" && (
            <Card style={{ background: `${C.cyan}10`, border: `1px solid ${C.cyan}30`, padding: 14 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>قدراتك:</div>
              <div style={{ fontSize: 13, color: C.cyan, fontWeight: 700, lineHeight: 1.6 }}>
                كل جولة تحقق مع لاعب واحد وتعرف إذا بريء أو مخرب
              </div>
            </Card>
          )}
          {data.role === "innocent" && (
            <div style={{ fontSize: 13, color: C.muted }}>راقب وحلل — مين يتصرف غريب؟</div>
          )}
        </div>
      )}
    </div>
  );
}
