import { useState, useEffect } from "react";
import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import socket from "../../socket.js";

const pink = "#E91E63";

export default function MutakhafyFinalGuess({ data, token, roomCode }) {
  const { timerEnd, disguises, realPlayers, allMyGuesses, myFakeId } = data;
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)));
  const [guesses, setGuesses] = useState(() => {
    const map = {};
    allMyGuesses.forEach((g) => { map[g.fakeId] = g.guessedRealToken; });
    return map;
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(interval);
  }, [timerEnd]);

  const otherDisguises = disguises.filter((d) => d.fakeId !== myFakeId);
  const otherReals = realPlayers.filter((p) => p.token !== token);

  // FIX BUG 17: track which real tokens are already assigned
  const assignedTokens = new Set(Object.values(guesses));

  const setGuess = (fakeId, realToken) => {
    if (submitted) return;
    setGuesses((prev) => {
      const updated = { ...prev };
      // If this realToken is already assigned to another disguise, clear it
      for (const [key, val] of Object.entries(updated)) {
        if (val === realToken && key !== fakeId) {
          delete updated[key];
        }
      }
      updated[fakeId] = realToken;
      return updated;
    });
  };

  const submitAll = () => {
    if (submitted) return;
    setSubmitted(true);
    const guessArray = Object.entries(guesses).map(([fakeId, guessedRealToken]) => ({
      fakeId,
      guessedRealToken,
    }));
    socket.emit("mutakhafy:final-guesses", { roomCode, token, guesses: guessArray });
  };

  const assignedCount = Object.keys(guesses).length;
  const totalToGuess = otherDisguises.length;

  return (
    <div style={{ paddingTop: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8, animation: "pulse 1.5s infinite" }}>🎯</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: pink }}>التخمين الأخير!</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>فرصتك الأخيرة — خمّن كل المتخفين</div>
      </div>

      {/* Timer */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{
          fontSize: 36, fontWeight: 900, color: timeLeft <= 10 ? C.red : pink,
          fontFamily: "'Courier New',monospace",
          animation: timeLeft <= 10 ? "pulse 0.5s infinite" : undefined,
        }}>{timeLeft}</div>
      </div>

      {submitted ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>تم الإرسال!</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>بانتظار الكشف الكبير...</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 12 }}>
            {assignedCount}/{totalToGuess} تخمينات
          </div>

          {otherDisguises.map((d, i) => (
            <Card key={d.fakeId} style={{
              padding: 12, marginBottom: 8,
              animation: `su 0.3s ${i * 0.04}s backwards`,
              border: guesses[d.fakeId] ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{d.fakeAvatar}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: pink }}>{d.fakeName}</span>
                {guesses[d.fakeId] && (() => {
                  const real = realPlayers.find((p) => p.token === guesses[d.fakeId]);
                  return real ? (
                    <span style={{ fontSize: 12, color: C.green, marginRight: "auto" }}>
                      → {real.avatar} {real.name}
                    </span>
                  ) : null;
                })()}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {otherReals.map((p) => {
                  const isAssigned = guesses[d.fakeId] === p.token;
                  const isUsedElsewhere = !isAssigned && assignedTokens.has(p.token);
                  return (
                    <button key={p.token} onClick={() => setGuess(d.fakeId, p.token)} disabled={isUsedElsewhere} style={{
                      padding: "6px 10px", fontSize: 12, fontWeight: 700,
                      background: isAssigned ? `${C.green}20` : isUsedElsewhere ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isAssigned ? C.green : C.border}`,
                      borderRadius: 8, cursor: isUsedElsewhere ? "default" : "pointer", fontFamily: "inherit",
                      color: isAssigned ? C.green : isUsedElsewhere ? `${C.muted}60` : C.text,
                      opacity: isUsedElsewhere ? 0.4 : 1,
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <span>{p.avatar}</span> {p.name}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}

          <button onClick={submitAll} style={{
            width: "100%", padding: 16, marginTop: 8,
            background: `${pink}20`, border: `2px solid ${pink}`,
            borderRadius: 12, fontSize: 16, fontWeight: 800, color: pink,
            cursor: "pointer", fontFamily: "inherit",
          }}>🎯 أرسل التخمينات ({assignedCount}/{totalToGuess})</button>
        </>
      )}
    </div>
  );
}
