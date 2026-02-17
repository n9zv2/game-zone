import { useState, useEffect, useRef } from "react";
import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";

const pink = "#E91E63";

export default function MutakhafyReveal({ data, token }) {
  const { reveals } = data;
  const [revealedCount, setRevealedCount] = useState(0);
  const bottomRef = useRef(null);

  // Reveal one by one every 3 seconds
  useEffect(() => {
    if (revealedCount >= reveals.length) return;
    const timer = setTimeout(() => {
      setRevealedCount((prev) => prev + 1);
    }, revealedCount === 0 ? 1500 : 3000);
    return () => clearTimeout(timer);
  }, [revealedCount, reveals.length]);

  // FIX BUG 27: auto-scroll to latest reveal
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [revealedCount]);

  return (
    <div style={{ paddingTop: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎭</div>
        <div style={{
          fontSize: 24, fontWeight: 900,
          background: `linear-gradient(135deg, ${pink}, ${C.gold})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>الكشف الكبير!</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          {revealedCount}/{reveals.length} انكشفوا
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {reveals.slice(0, revealedCount).map((r, i) => {
          const isMe = r.realToken === token;
          const ghostMode = r.guessedBy.length === 0;
          return (
            <Card key={r.fakeId} style={{
              padding: 16,
              animation: `fadeIn 0.5s ease`,
              border: isMe ? `2px solid ${pink}` : ghostMode ? `1px solid ${C.gold}40` : `1px solid ${C.border}`,
              background: isMe ? `${pink}08` : ghostMode ? `${C.gold}05` : undefined,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Fake identity */}
                <div style={{ textAlign: "center", minWidth: 55 }}>
                  <div style={{ fontSize: 28 }}>{r.fakeAvatar}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: pink }}>{r.fakeName}</div>
                </div>

                {/* Arrow */}
                <div style={{ fontSize: 20, color: C.gold }}>→</div>

                {/* Real identity */}
                <div style={{ textAlign: "center", minWidth: 55 }}>
                  <div style={{ fontSize: 28 }}>{r.realAvatar}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isMe ? pink : C.text }}>
                    {r.realName} {isMe && "(أنت)"}
                  </div>
                </div>

                {/* Guessed by */}
                <div style={{ flex: 1, textAlign: "left" }}>
                  {ghostMode ? (
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>👻 شبح!</div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>كشفه {r.guessedBy.length}:</div>
                      {r.guessedBy.map((g) => (
                        <div key={g.token} style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>
                          {g.avatar} {g.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div ref={bottomRef} />

      {revealedCount < reveals.length && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 36, animation: "pulse 1s infinite" }}>🥸</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>التالي ينكشف...</div>
        </div>
      )}
    </div>
  );
}
