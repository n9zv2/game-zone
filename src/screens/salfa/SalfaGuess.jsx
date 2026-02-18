import { useState, useEffect } from "react";
import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import Btn from "../../components/ui/Btn.jsx";
import socket from "../../socket.js";

export default function SalfaGuess({ data, token, roomCode }) {
  const [submitted, setSubmitted] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);

  const isSpy = data.isSpy;
  const options = data.options || [];

  useEffect(() => {
    if (!data.timerEnd) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((data.timerEnd - Date.now()) / 1000));
      setTimeLeft(left);
    }, 100);
    return () => clearInterval(interval);
  }, [data.timerEnd]);

  const submitGuess = (word) => {
    if (submitted || !isSpy) return;
    setSelectedWord(word);
    setSubmitted(true);
    socket.emit("salfa:spy-guess", { roomCode, token, guess: word });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 20, animation: "fadeIn 0.3s ease" }}>
      <div style={{ fontSize: 48, marginBottom: 16, animation: "pulse 1.5s infinite" }}>🕵️</div>

      <div style={{ fontSize: 18, fontWeight: 800, color: C.red, marginBottom: 8 }}>
        {data.spyName} انكشف!
      </div>

      <div style={{
        fontSize: 28, fontWeight: 900, color: timeLeft <= 5 ? C.red : C.gold,
        fontFamily: "'Courier New',monospace", marginBottom: 16,
        animation: timeLeft <= 5 ? "pulse 0.5s infinite" : "none",
      }}>
        {timeLeft}s
      </div>

      {isSpy ? (
        // Spy's view — pick the word from options
        <Card style={{ width: "100%", padding: 16, border: `1px solid ${C.red}30`, background: `${C.red}08` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 4, textAlign: "center" }}>
            فرصتك الأخيرة!
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, textAlign: "center" }}>
            التصنيف: <span style={{ fontWeight: 800, color: C.gold }}>{data.category}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, textAlign: "center" }}>
            اختر الكلمة الصحيحة عشان تفوز
          </div>
          {!submitted ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {options.map((word) => (
                <Btn
                  key={word}
                  color={C.red}
                  onClick={() => submitGuess(word)}
                  style={{ fontSize: 15, padding: "12px 16px", fontWeight: 700 }}
                >
                  {word}
                </Btn>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: C.gold }}>
              ✅ اخترت "{selectedWord}" — بانتظار النتيجة...
            </div>
          )}
        </Card>
      ) : (
        // Innocent's view — waiting
        <Card style={{ width: "100%", padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 8 }}>
            الجاسوس يحاول يخمن الكلمة...
          </div>
          <div style={{ fontSize: 12, color: C.muted, animation: "pulse 2s infinite" }}>
            إذا خمّن صح يفوز الجاسوس!
          </div>
        </Card>
      )}
    </div>
  );
}
