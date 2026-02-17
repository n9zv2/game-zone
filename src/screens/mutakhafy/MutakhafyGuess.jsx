import { useState, useEffect } from "react";
import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import socket from "../../socket.js";

const pink = "#E91E63";

export default function MutakhafyGuess({ data, token, roomCode }) {
  const { timerEnd, disguises, realPlayers, myPreviousGuesses, myFakeId } = data;
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)));
  const [selectedFake, setSelectedFake] = useState(null);
  const [selectedReal, setSelectedReal] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(interval);
  }, [timerEnd]);

  // Filter out own disguise and already-guessed fakeIds
  const guessedFakeIds = new Set(myPreviousGuesses.map((g) => g.fakeId));
  const availableDisguises = disguises.filter((d) => d.fakeId !== myFakeId && !guessedFakeIds.has(d.fakeId));

  // Filter out self from real players
  const availableReals = realPlayers.filter((p) => p.token !== token);

  const submitGuess = () => {
    if (!selectedFake || !selectedReal || submitted) return;
    setSubmitted(true);
    socket.emit("mutakhafy:guess", {
      roomCode,
      token,
      fakeId: selectedFake,
      guessedRealToken: selectedReal,
    });
  };

  return (
    <div style={{ paddingTop: 16, animation: "fadeIn 0.3s ease" }}>
      {/* Timer */}
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>وقت التخمين</div>
        <div style={{
          fontSize: 32, fontWeight: 900, color: timeLeft <= 5 ? C.red : pink,
          fontFamily: "'Courier New',monospace",
          animation: timeLeft <= 5 ? "pulse 0.5s infinite" : undefined,
        }}>{timeLeft}</div>
      </div>

      {submitted ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤔</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>تم التخمين!</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>بانتظار الباقي...</div>
        </div>
      ) : availableDisguises.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>خمّنت كل المتخفين!</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>1. اختر متخفي:</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 16 }}>
            {availableDisguises.map((d) => (
              <Card key={d.fakeId} onClick={() => setSelectedFake(d.fakeId)} style={{
                textAlign: "center", padding: 10, cursor: "pointer",
                border: selectedFake === d.fakeId ? `2px solid ${pink}` : `1px solid ${C.border}`,
                background: selectedFake === d.fakeId ? `${pink}15` : undefined,
              }}>
                <div style={{ fontSize: 22 }}>{d.fakeAvatar}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: selectedFake === d.fakeId ? pink : C.text }}>{d.fakeName}</div>
              </Card>
            ))}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>2. تتوقع إنه:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {availableReals.map((p) => (
              <button key={p.token} onClick={() => setSelectedReal(p.token)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                background: selectedReal === p.token ? `${C.green}15` : "rgba(255,255,255,0.03)",
                border: selectedReal === p.token ? `2px solid ${C.green}` : `1px solid ${C.border}`,
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              }}>
                <span style={{ fontSize: 22 }}>{p.avatar}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: selectedReal === p.token ? C.green : C.text }}>{p.name}</span>
              </button>
            ))}
          </div>

          <button onClick={submitGuess} disabled={!selectedFake || !selectedReal} style={{
            width: "100%", padding: 16, background: selectedFake && selectedReal ? `${pink}20` : "rgba(255,255,255,0.03)",
            border: `2px solid ${selectedFake && selectedReal ? pink : C.border}`, borderRadius: 12,
            fontSize: 16, fontWeight: 800, color: selectedFake && selectedReal ? pink : C.muted,
            cursor: selectedFake && selectedReal ? "pointer" : "default", fontFamily: "inherit",
          }}>🔍 خمّن!</button>
        </>
      )}

      {myPreviousGuesses.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>تخميناتك السابقة ({myPreviousGuesses.length})</div>
          {myPreviousGuesses.map((g) => {
            const fake = disguises.find((d) => d.fakeId === g.fakeId);
            const real = realPlayers.find((p) => p.token === g.guessedRealToken);
            return (
              <div key={g.fakeId} style={{ fontSize: 12, color: C.muted, padding: "4px 0", display: "flex", gap: 4, alignItems: "center" }}>
                <span>{fake?.fakeAvatar} {fake?.fakeName}</span>
                <span>→</span>
                <span>{real?.avatar} {real?.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
