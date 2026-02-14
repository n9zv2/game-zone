import { useState, useEffect, useRef } from "react";
import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";
import Btn from "../../components/ui/Btn.jsx";
import socket from "../../socket.js";

export default function SalfaHints({ data, token, roomCode, hints, voteRequestInfo }) {
  const [myHint, setMyHint] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [voteRequested, setVoteRequested] = useState(false);
  const inputRef = useRef(null);

  // Check if already submitted this round
  useEffect(() => {
    const alreadySubmitted = hints.some((h) => h.token === token && h.round === data.roundNumber);
    setSubmitted(alreadySubmitted);
    if (!alreadySubmitted) {
      setMyHint("");
    }
  }, [data.roundNumber, hints, token]);

  // Timer countdown
  useEffect(() => {
    if (!data.timerEnd) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((data.timerEnd - Date.now()) / 1000));
      setTimeLeft(left);
    }, 100);
    return () => clearInterval(interval);
  }, [data.timerEnd]);

  const submitHint = () => {
    const trimmed = myHint.trim();
    if (!trimmed || submitted) return;
    socket.emit("salfa:hint", { roomCode, token, hint: trimmed });
    setSubmitted(true);
  };

  const requestVote = () => {
    if (voteRequested) return;
    socket.emit("salfa:vote-request", { roomCode, token });
    setVoteRequested(true);
  };

  // Current round hints
  const currentRoundHints = hints.filter((h) => h.round === data.roundNumber);
  // Previous round hints
  const previousHints = hints.filter((h) => h.round !== data.roundNumber);

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "10px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.cyan }}>
          🔍 جولة تلميحات #{data.roundNumber}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 900, color: timeLeft <= 30 ? C.red : C.gold,
          fontFamily: "'Courier New',monospace",
          animation: timeLeft <= 10 ? "pulse 0.5s infinite" : "none",
        }}>
          ⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
      </div>

      {/* Hint input */}
      {!submitted ? (
        <Card style={{ marginBottom: 12, padding: 14, border: `1px solid ${C.cyan}30` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>اكتب تلميحك (كلمة وحدة)</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={myHint}
              onChange={(e) => setMyHint(e.target.value.slice(0, 30))}
              onKeyDown={(e) => e.key === "Enter" && submitHint()}
              placeholder="تلميح..."
              maxLength={30}
              style={{
                flex: 1, padding: 12, background: "rgba(255,255,255,0.05)",
                border: `1px solid ${C.border}`, borderRadius: 10, color: "#fff",
                fontSize: 16, fontFamily: "inherit", outline: "none",
                direction: "rtl",
              }}
            />
            <Btn color={C.cyan} full={false} onClick={submitHint} disabled={!myHint.trim()} style={{ padding: "12px 20px" }}>
              إرسال
            </Btn>
          </div>
        </Card>
      ) : (
        <Card style={{ marginBottom: 12, padding: 14, border: `1px solid ${C.green}30`, background: `${C.green}08` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.green, textAlign: "center" }}>
            ✅ تم إرسال تلميحك
          </div>
        </Card>
      )}

      {/* Vote request button */}
      <div style={{ marginBottom: 16 }}>
        <Btn
          color={voteRequested ? C.muted : C.gold}
          onClick={requestVote}
          disabled={voteRequested}
          style={{ fontSize: 13, padding: "10px 16px" }}
        >
          {voteRequested ? "✅ طلبت التصويت" : "🗳️ بدأ التصويت"}
        </Btn>
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 4 }}>
          {voteRequestInfo.count} / {voteRequestInfo.needed} طلبوا التصويت
        </div>
      </div>

      {/* Current round hints */}
      {currentRoundHints.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>تلميحات الجولة الحالية:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {currentRoundHints.map((h, i) => (
              <div key={`${h.token}-${h.round}`} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                background: h.token === token ? `${C.cyan}10` : "rgba(255,255,255,0.03)",
                border: `1px solid ${h.token === token ? C.cyan : C.border}`,
                borderRadius: 10, animation: `su 0.3s ${i * 0.05}s backwards`,
              }}>
                <span style={{ fontSize: 20 }}>{h.avatar}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{h.name}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.cyan }}>"{h.hint}"</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous rounds hints */}
      {previousHints.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>تلميحات سابقة:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {previousHints.map((h, i) => (
              <div key={`${h.token}-${h.round}-prev`} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                background: "rgba(255,255,255,0.02)", borderRadius: 8, opacity: 0.7,
              }}>
                <span style={{ fontSize: 16 }}>{h.avatar}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{h.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>"{h.hint}"</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting indicator */}
      {submitted && currentRoundHints.length < data.players.length && (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.muted, animation: "pulse 2s infinite" }}>
          ⏳ بانتظار باقي اللاعبين ({currentRoundHints.length} / {data.players.length})
        </div>
      )}
    </div>
  );
}
