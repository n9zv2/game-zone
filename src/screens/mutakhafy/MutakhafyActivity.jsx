import { useState, useEffect } from "react";
import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import socket from "../../socket.js";

const pink = "#E91E63";

export default function MutakhafyActivity({ data, token, roomCode }) {
  const { type, data: actData, timerEnd } = data;
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)));

  // Ranking state
  const [rankOrder, setRankOrder] = useState(type === "rank" ? [...actData.items] : []);

  useEffect(() => {
    setSubmitted(false);
    setTimeLeft(Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000)));
    if (type === "rank") setRankOrder([...actData.items]);
  }, [timerEnd, type, actData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 200);
    return () => clearInterval(interval);
  }, [timerEnd]);

  const submit = (response) => {
    if (submitted) return;
    setSubmitted(true);
    socket.emit("mutakhafy:submit", { roomCode, token, response });
  };

  const moveRankItem = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= rankOrder.length) return;
    const newOrder = [...rankOrder];
    const [item] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, item);
    setRankOrder(newOrder);
  };

  const renderActivity = () => {
    switch (type) {
      case "reaction":
        return (
          <div>
            <Card glow color={pink} style={{ textAlign: "center", marginBottom: 16, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>{actData.scenario}</div>
            </Card>
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 12 }}>وش ردة فعلك؟</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {actData.emojis.map((emoji) => (
                <button key={emoji} onClick={() => submit(emoji)} disabled={submitted} style={{
                  fontSize: 36, padding: 16, background: `${pink}08`, border: `1px solid ${pink}30`,
                  borderRadius: 14, cursor: submitted ? "default" : "pointer", opacity: submitted ? 0.5 : 1,
                  transition: "transform 0.1s", minHeight: 70,
                }}>{emoji}</button>
              ))}
            </div>
          </div>
        );

      case "binary":
        return (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, textAlign: "center", marginBottom: 16 }}>وش تختار؟</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => submit("A")} disabled={submitted} style={{
                padding: 20, background: `${C.cyan}10`, border: `2px solid ${C.cyan}40`,
                borderRadius: 14, fontSize: 16, fontWeight: 800, color: C.cyan,
                cursor: submitted ? "default" : "pointer", fontFamily: "inherit",
                opacity: submitted ? 0.5 : 1, textAlign: "center", minHeight: 60,
              }}>{actData.optionA}</button>
              <div style={{ textAlign: "center", fontSize: 14, fontWeight: 900, color: C.muted }}>أو</div>
              <button onClick={() => submit("B")} disabled={submitted} style={{
                padding: 20, background: `${C.orange}10`, border: `2px solid ${C.orange}40`,
                borderRadius: 14, fontSize: 16, fontWeight: 800, color: C.orange,
                cursor: submitted ? "default" : "pointer", fontFamily: "inherit",
                opacity: submitted ? 0.5 : 1, textAlign: "center", minHeight: 60,
              }}>{actData.optionB}</button>
            </div>
          </div>
        );

      case "word":
        return (
          <div>
            <Card glow color={pink} style={{ textAlign: "center", marginBottom: 16, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>{actData.topic}</div>
            </Card>
            <WordInput key={timerEnd} onSubmit={submit} submitted={submitted} maxLen={15} placeholder="كلمة وحدة..." />
          </div>
        );

      case "sentence":
        return (
          <div>
            <Card glow color={pink} style={{ textAlign: "center", marginBottom: 16, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>{actData.sentence}</div>
            </Card>
            <WordInput key={timerEnd} onSubmit={submit} submitted={submitted} maxLen={30} placeholder="أكمل الجملة..." />
          </div>
        );

      case "rank":
        return (
          <div>
            <Card glow color={pink} style={{ textAlign: "center", marginBottom: 16, padding: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{actData.prompt}</div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {rankOrder.map((item, idx) => (
                <div key={item} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  background: `${pink}08`, border: `1px solid ${pink}30`, borderRadius: 12,
                }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: pink, width: 28 }}>{idx + 1}</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.text }}>{item}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => moveRankItem(idx, idx - 1)} disabled={idx === 0 || submitted} style={{
                      padding: "4px 10px", fontSize: 14, background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${C.border}`, borderRadius: 6, color: C.text,
                      cursor: idx === 0 || submitted ? "default" : "pointer", fontFamily: "inherit", opacity: idx === 0 ? 0.3 : 1,
                    }}>▲</button>
                    <button onClick={() => moveRankItem(idx, idx + 1)} disabled={idx === rankOrder.length - 1 || submitted} style={{
                      padding: "4px 10px", fontSize: 14, background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${C.border}`, borderRadius: 6, color: C.text,
                      cursor: idx === rankOrder.length - 1 || submitted ? "default" : "pointer", fontFamily: "inherit", opacity: idx === rankOrder.length - 1 ? 0.3 : 1,
                    }}>▼</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => submit(rankOrder)} disabled={submitted} style={{
              width: "100%", padding: 14, background: submitted ? `${C.green}20` : `${pink}20`,
              border: `2px solid ${submitted ? C.green : pink}`, borderRadius: 12,
              fontSize: 16, fontWeight: 800, color: submitted ? C.green : pink,
              cursor: submitted ? "default" : "pointer", fontFamily: "inherit",
            }}>{submitted ? "تم الإرسال ✅" : "أرسل الترتيب"}</button>
          </div>
        );

      case "rate":
        return (
          <div>
            <Card glow color={pink} style={{ textAlign: "center", marginBottom: 20, padding: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>{actData.item}</div>
            </Card>
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 12 }}>قيّم من 1 إلى 5</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => submit(n)} disabled={submitted} style={{
                  fontSize: 32, padding: "10px 14px", background: `${C.gold}10`, border: `1px solid ${C.gold}30`,
                  borderRadius: 12, cursor: submitted ? "default" : "pointer", opacity: submitted ? 0.5 : 1,
                  minWidth: 52, minHeight: 52,
                }}>{"⭐".repeat(1)}<div style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>{n}</div></button>
              ))}
            </div>
          </div>
        );

      case "who":
        return (
          <div>
            <Card glow color={pink} style={{ textAlign: "center", marginBottom: 16, padding: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>{actData.question}</div>
            </Card>
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 12 }}>صوّت لأحد اللاعبين الحقيقيين</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {actData.realPlayers.map((p, i) => (
                <button key={p.token} onClick={() => submit(p.token)} disabled={submitted} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  background: `rgba(255,255,255,0.03)`, border: `1px solid ${C.border}`,
                  borderRadius: 12, cursor: submitted ? "default" : "pointer", fontFamily: "inherit",
                  opacity: submitted ? 0.5 : 1, animation: `su 0.3s ${i * 0.05}s backwards`,
                }}>
                  <span style={{ fontSize: 24 }}>{p.avatar}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ paddingTop: 16, animation: "fadeIn 0.3s ease" }}>
      {/* Timer */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div style={{
          fontSize: 28, fontWeight: 900, color: timeLeft <= 3 ? C.red : pink,
          fontFamily: "'Courier New',monospace",
          animation: timeLeft <= 3 ? "pulse 0.5s infinite" : undefined,
        }}>{timeLeft}</div>
      </div>

      {submitted && (
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>تم الإرسال ✅</div>
          <div style={{ fontSize: 11, color: C.muted }}>بانتظار الباقي...</div>
        </div>
      )}

      {renderActivity()}
    </div>
  );
}

// Reusable text input component
function WordInput({ onSubmit, submitted, maxLen, placeholder }) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || submitted) return;
    onSubmit(trimmed);
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, maxLen))}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        maxLength={maxLen}
        placeholder={placeholder}
        disabled={submitted}
        style={{
          flex: 1, padding: 14, background: "rgba(255,255,255,0.05)",
          border: `1px solid ${C.border}`, borderRadius: 10, color: "#fff",
          fontSize: 16, fontFamily: "inherit", textAlign: "center", outline: "none",
          direction: "rtl",
        }}
      />
      <button onClick={handleSubmit} disabled={submitted || !value.trim()} style={{
        padding: "14px 20px", background: submitted ? `${C.green}20` : `${pink}20`,
        border: `2px solid ${submitted ? C.green : pink}`, borderRadius: 10,
        fontSize: 14, fontWeight: 800, color: submitted ? C.green : pink,
        cursor: submitted || !value.trim() ? "default" : "pointer", fontFamily: "inherit",
      }}>{submitted ? "✅" : "أرسل"}</button>
    </div>
  );
}
