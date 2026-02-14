import { useState, useEffect, useRef } from "react";
import { C } from "../../theme.js";
import Timer from "../../components/ui/Timer.jsx";
import socket from "../../socket.js";

export default function FitnaDiscussion({ data, token, roomCode, messages }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [chatText, setChatText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const doAction = (action) => {
    if (action === "defend") {
      socket.emit("fitna:discussion-action", { roomCode, token, action: "defend" });
      setActionType(null);
    } else if (action === "accuse" && selectedTarget) {
      socket.emit("fitna:discussion-action", { roomCode, token, action: "accuse", targetToken: selectedTarget });
      setSelectedTarget(null);
      setActionType(null);
    } else if (action === "agree" && selectedTarget) {
      socket.emit("fitna:discussion-action", { roomCode, token, action: "agree", targetToken: selectedTarget });
      setSelectedTarget(null);
      setActionType(null);
    }
  };

  const sendChat = () => {
    const text = chatText.trim();
    if (!text) return;
    socket.emit("fitna:chat-message", { roomCode, token, text });
    setChatText("");
  };

  const msgColors = { accuse: C.red, defend: C.cyan, agree: C.green, neutral: C.muted, chat: C.text };

  const evidence = data.evidence || [];
  const latestEvidence = evidence.filter((e) => e.round === (data.roundIdx || 0) + 1);

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>💬</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.purple }}>نقاش — جولة {(data.roundIdx || 0) + 1}</div>
      </div>

      <Timer timerEnd={data.timerEnd} maxSeconds={90} />

      {/* Evidence Summary Banner */}
      {latestEvidence.length > 0 && (
        <div style={{
          background: `${C.purple}08`, border: `1px solid ${C.purple}25`,
          borderRadius: 12, padding: 10, marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.purple, marginBottom: 6, textAlign: "center" }}>
            📋 أدلة هالجولة
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {latestEvidence.map((ev, i) => (
              <div key={i} style={{
                fontSize: 11, color: C.text, padding: "4px 8px",
                background: `rgba(255,255,255,0.03)`, borderRadius: 6,
              }}>
                {ev.type === "loyalty_test" && (
                  <span>🎯 اختبار الولاء — {(() => {
                    const wrong = (ev.results || []).filter(r => !r.correct);
                    return wrong.length > 0
                      ? <span style={{ color: C.red }}>أخطأوا: {wrong.map(r => r.name).join("، ")}</span>
                      : <span style={{ color: C.green }}>الكل أجاب صح</span>;
                  })()}
                  </span>
                )}
                {ev.type === "face_off" && (
                  <span>⚔️ المواجهة — {(() => {
                    const disagreed = (ev.pairResults || []).filter(pr => !pr.agreed);
                    return disagreed.length > 0
                      ? <span style={{ color: C.red }}>اختلفوا: {disagreed.map(pr => pr.names.join(" و ")).join("، ")}</span>
                      : <span style={{ color: C.green }}>الكل اتفق</span>;
                  })()}
                  </span>
                )}
                {ev.type === "secret_word" && (
                  <span>🎭 الكلمة السرية: <span style={{ fontWeight: 700, color: C.purple }}>{ev.word}</span></span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages feed */}
      <div style={{
        maxHeight: 180, overflowY: "auto", marginBottom: 10,
        display: "flex", flexDirection: "column", gap: 6,
        padding: "4px 0",
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: 16 }}>
            ابدأ النقاش...
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            background: `${msgColors[msg.type] || C.muted}08`,
            border: `1px solid ${msgColors[msg.type] || C.muted}20`,
            borderRadius: 10, padding: "8px 10px",
            animation: `su 0.3s ease`,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{msg.avatar}</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: msgColors[msg.type] || C.muted }}>{msg.name}: </span>
              <span style={{ fontSize: 12, color: C.text }}>{msg.text}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Free chat input */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input
          value={chatText}
          onChange={(e) => setChatText(e.target.value.slice(0, 100))}
          onKeyDown={(e) => e.key === "Enter" && sendChat()}
          placeholder="اكتب رسالة..."
          style={{
            flex: 1, padding: "10px 12px", background: "rgba(255,255,255,0.05)",
            border: `1px solid ${C.border}`, borderRadius: 10, color: "#fff",
            fontSize: 13, fontFamily: "inherit", outline: "none", direction: "rtl",
          }}
        />
        <button onClick={sendChat} disabled={!chatText.trim()} style={{
          padding: "10px 14px", border: `1px solid ${C.green}40`, borderRadius: 10,
          background: chatText.trim() ? `${C.green}20` : "transparent",
          color: chatText.trim() ? C.green : C.muted, fontSize: 14, fontWeight: 700,
          cursor: chatText.trim() ? "pointer" : "default", fontFamily: "inherit",
        }}>
          📤
        </button>
      </div>

      {/* Quick action buttons */}
      {!actionType && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button onClick={() => setActionType("accuse")} style={{
            flex: 1, padding: "8px 6px", border: `1px solid ${C.red}40`, borderRadius: 10,
            background: `${C.red}10`, color: C.red, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            🎯 اتهم
          </button>
          <button onClick={() => doAction("defend")} style={{
            flex: 1, padding: "8px 6px", border: `1px solid ${C.cyan}40`, borderRadius: 10,
            background: `${C.cyan}10`, color: C.cyan, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            🛡️ دافع
          </button>
          <button onClick={() => setActionType("agree")} style={{
            flex: 1, padding: "8px 6px", border: `1px solid ${C.green}40`, borderRadius: 10,
            background: `${C.green}10`, color: C.green, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            👍 أتفق
          </button>
        </div>
      )}

      {/* Target selection for accuse/agree */}
      {actionType && (
        <div style={{ animation: "su 0.3s ease" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6, textAlign: "center" }}>
            {actionType === "accuse" ? "اختر من تتهم:" : "اختر من توافق على اتهامه:"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
            {data.players.filter((p) => p.token !== token).map((p, i) => (
              <button key={i} onClick={() => setSelectedTarget(p.token)} style={{
                padding: "6px 4px", border: `1px solid ${selectedTarget === p.token ? C.purple : C.border}`,
                borderRadius: 8, background: selectedTarget === p.token ? `${C.purple}20` : `rgba(255,255,255,0.03)`,
                cursor: "pointer", textAlign: "center", fontFamily: "inherit",
              }}>
                <div style={{ fontSize: 18 }}>{p.avatar}</div>
                <div style={{ fontSize: 9, color: selectedTarget === p.token ? C.purple : C.text, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => doAction(actionType)} disabled={!selectedTarget} style={{
              flex: 1, padding: "10px", border: `1px solid ${C.purple}40`, borderRadius: 10,
              background: selectedTarget ? `${C.purple}20` : `rgba(255,255,255,0.03)`,
              color: selectedTarget ? C.purple : C.muted, fontSize: 13, fontWeight: 700,
              cursor: selectedTarget ? "pointer" : "default", fontFamily: "inherit",
              opacity: selectedTarget ? 1 : 0.5,
            }}>
              تأكيد
            </button>
            <button onClick={() => { setActionType(null); setSelectedTarget(null); }} style={{
              padding: "10px 16px", border: `1px solid ${C.border}`, borderRadius: 10,
              background: "transparent", color: C.muted, fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              رجوع
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
