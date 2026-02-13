import { useState, useEffect, useRef } from "react";
import { C } from "../../theme.js";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Timer from "../../components/ui/Timer.jsx";
import Btn from "../../components/ui/Btn.jsx";
import socket from "../../socket.js";

export default function ArenaChallenge({ token, roomCode, data, reactionGo, reactionGoTime, spectator }) {
  const [submitted, setSubmitted] = useState(false);

  const submit = (result) => {
    if (submitted || spectator) return;
    setSubmitted(true);
    socket.emit("arena:submit", { roomCode, token, result });
  };

  // Auto-submit on timeout
  const onTimerDone = () => {
    if (!submitted && !spectator) {
      if (data.type === "speed_tap") submit({ tapCount: tapCountRef.current });
      else if (data.type === "reaction") submit({ early: false, reactionTime: 10000 });
      else submit({});
    }
  };

  // Speed Tap
  const [tapCount, setTapCount] = useState(0);
  const tapCountRef = useRef(0);

  // Memory
  const [memPhase, setMemPhase] = useState("show");
  const [memHighlight, setMemHighlight] = useState(-1);
  const [memInput, setMemInput] = useState([]);

  // Math
  const [mathInput, setMathInput] = useState("");

  // Reaction
  const [reactionPhase, setReactionPhase] = useState("wait");
  const [reactionTime, setReactionTime] = useState(0);
  const reactionStartRef = useRef(0);

  // Word
  const [wordInput, setWordInput] = useState("");

  // Color
  const [colorPicked, setColorPicked] = useState(null);

  // Reset on new challenge
  useEffect(() => {
    setSubmitted(false);
    setTapCount(0);
    tapCountRef.current = 0;
    setMemPhase("show");
    setMemHighlight(-1);
    setMemInput([]);
    setMathInput("");
    setReactionPhase("wait");
    setReactionTime(0);
    setWordInput("");
    setColorPicked(null);

    // Memory: show sequence
    if (data.type === "memory" && data.sequence) {
      const seq = data.sequence;
      seq.forEach((v, i) => {
        setTimeout(() => setMemHighlight(v), (i + 1) * 700);
        setTimeout(() => setMemHighlight(-1), (i + 1) * 700 + 400);
      });
      setTimeout(() => setMemPhase("input"), (seq.length + 1) * 700);
    }
  }, [data]);

  // Reaction go signal
  useEffect(() => {
    if (reactionGo && reactionPhase === "wait") {
      setReactionPhase("go");
      reactionStartRef.current = Date.now();
    }
  }, [reactionGo, reactionPhase]);

  // Speed Tap
  const handleTap = () => {
    if (submitted) return;
    const newCount = tapCount + 1;
    setTapCount(newCount);
    tapCountRef.current = newCount;
  };

  // Memory Tap
  const memTap = (idx) => {
    if (memPhase !== "input" || submitted) return;
    const next = [...memInput, idx];
    setMemInput(next);
    if (next.length === data.sequence.length) {
      submit({ sequence: next });
    }
  };

  // Math submit
  const checkMath = () => {
    if (!mathInput.trim() || submitted) return;
    submit({ answer: mathInput.trim() });
  };

  // Reaction click
  const handleReaction = () => {
    if (submitted) return;
    if (reactionPhase === "wait") {
      setReactionPhase("early");
      submit({ early: true, reactionTime: 0 });
    } else if (reactionPhase === "go") {
      const t = Date.now() - reactionStartRef.current;
      setReactionTime(t);
      setReactionPhase("done");
      submit({ early: false, reactionTime: t });
    }
  };

  // Word submit
  const checkWord = () => {
    if (!wordInput.trim() || submitted) return;
    submit({ word: wordInput.trim() });
  };

  // Color pick
  const pickColor = (hex) => {
    if (submitted || colorPicked) return;
    setColorPicked(hex);
    submit({ colorHex: hex });
  };

  const spectatorBanner = spectator ? (
    <div style={{
      textAlign: "center", padding: "8px 12px", marginBottom: 10,
      background: `${C.purple}12`, border: `1px solid ${C.purple}30`, borderRadius: 10,
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>👻 وضع المتفرج</span>
      {data.spectatorCount > 0 && <span style={{ fontSize: 11, color: C.muted, marginRight: 8 }}> — {data.spectatorCount} متفرج</span>}
    </div>
  ) : null;

  // SPEED TAP
  if (data.type === "speed_tap") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <Badge color={C.gold}>⚡ سرعة الضغط</Badge>
          <Badge color={C.green}>👆 {tapCount}</Badge>
        </div>
        <Timer timerEnd={data.timerEnd} maxSeconds={data.time} onDone={onTimerDone} />
        <div style={{ textAlign: "center", marginTop: 20 }}>
          {!submitted ? (
            <button onClick={handleTap} style={{
              width: "min(200px, 50vw)", height: "min(200px, 50vw)", borderRadius: "50%", border: "none",
              background: `radial-gradient(circle, ${C.gold}, ${C.orange})`,
              fontSize: "min(60px, 15vw)", cursor: "pointer", boxShadow: `0 0 40px ${C.gold}40`,
              animation: "pulse 0.3s infinite", fontFamily: "inherit",
            }}>👆</button>
          ) : (
            <Card glow color={C.gold} style={{ maxWidth: 300, margin: "0 auto" }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: C.gold }}>{tapCount}</div>
              <div style={{ fontSize: 14, color: C.muted }}>ضغطة!</div>
            </Card>
          )}
        </div>
        {submitted && <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>⏳ بانتظار بقية اللاعبين...</div>}
      </div>
    );
  }

  // MEMORY
  if (data.type === "memory") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <Badge color={C.purple}>🧠 ذاكرة</Badge>
          {memPhase === "input" && <Badge>{memInput.length}/{data.sequence.length}</Badge>}
        </div>
        {memPhase === "input" && <Timer timerEnd={data.timerEnd} maxSeconds={data.time} onDone={onTimerDone} />}
        <div style={{ textAlign: "center", margin: "16px 0 8px", fontSize: 14, color: C.muted }}>
          {memPhase === "show" ? "ركّز وتذكر التسلسل! 👀" : submitted ? "تم الإرسال! ⏳" : "أعد التسلسل! 👇"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 280, margin: "0 auto" }}>
          {["🟢","🔴","🔵","🟡"].map((em, i) => (
            <button key={i} onClick={() => memTap(i)} disabled={memPhase !== "input" || submitted} style={{
              width: "100%", aspectRatio: "1", borderRadius: 16, border: "none", fontSize: 40,
              background: memHighlight === i ? `${[C.green, C.red, "#4488FF", C.gold][i]}40` : "rgba(255,255,255,0.05)",
              boxShadow: memHighlight === i ? `0 0 30px ${[C.green, C.red, "#4488FF", C.gold][i]}60` : "none",
              cursor: memPhase === "input" && !submitted ? "pointer" : "default",
              transition: "all 0.3s", fontFamily: "inherit",
            }}>{em}</button>
          ))}
        </div>
        {submitted && <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>⏳ بانتظار بقية اللاعبين...</div>}
      </div>
    );
  }

  // MATH
  if (data.type === "math") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <Badge color={C.cyan}>🔢 رياضيات سريعة</Badge>
        <Timer timerEnd={data.timerEnd} maxSeconds={data.time} onDone={onTimerDone} />
        <Card glow color={C.cyan} style={{ textAlign: "center", margin: "16px 0" }}>
          <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "'Courier New',monospace", direction: "ltr" }}>{data.question}</div>
        </Card>
        {!submitted ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" value={mathInput} onChange={(e) => setMathInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkMath()}
              style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 10, color: "#fff", fontSize: 22, fontFamily: "'Courier New',monospace", textAlign: "center", outline: "none", direction: "ltr" }}
              placeholder="?" autoFocus />
            <Btn color={C.cyan} onClick={checkMath} full={false} disabled={!mathInput.trim()} style={{ padding: "14px 24px" }}>✅</Btn>
          </div>
        ) : (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>⏳ بانتظار بقية اللاعبين...</div>
        )}
      </div>
    );
  }

  // REACTION
  if (data.type === "reaction") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <Badge color={C.green}>🎯 ردة الفعل</Badge>
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <button onClick={handleReaction} disabled={reactionPhase === "done" || reactionPhase === "early"} style={{
            width: "min(220px, 55vw)", height: "min(220px, 55vw)", borderRadius: "50%", border: "none", fontSize: "min(24px, 5vw)", fontWeight: 800,
            background: reactionPhase === "go" ? `radial-gradient(circle, ${C.green}, ${C.greenDark})` : reactionPhase === "early" ? `radial-gradient(circle, ${C.red}, #CC0000)` : reactionPhase === "done" ? `radial-gradient(circle, ${C.green}, ${C.greenDark})` : "radial-gradient(circle, #333, #222)",
            color: "#fff", cursor: reactionPhase === "done" || reactionPhase === "early" ? "default" : "pointer",
            boxShadow: reactionPhase === "go" ? `0 0 60px ${C.greenGlow}` : "none",
            transition: "all 0.15s", fontFamily: "inherit",
          }}>
            {reactionPhase === "wait" && "انتظر... 🔴"}
            {reactionPhase === "go" && "اضغط! 🟢"}
            {reactionPhase === "early" && "بدري! ❌"}
            {reactionPhase === "done" && `${reactionTime}ms ⚡`}
          </button>
        </div>
        {(reactionPhase === "done" || reactionPhase === "early") && (
          <Card glow color={reactionPhase === "done" ? C.green : C.red} style={{ textAlign: "center", margin: "20px 0" }}>
            {reactionPhase === "done" ? (
              <>
                <div style={{ fontSize: 16, color: C.muted }}>ردة فعلك</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: reactionTime < 300 ? C.green : reactionTime < 500 ? C.gold : C.orange, fontFamily: "'Courier New',monospace" }}>{reactionTime}ms</div>
              </>
            ) : (
              <div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>ضغطت بدري!</div>
            )}
          </Card>
        )}
        {submitted && <div style={{ textAlign: "center", fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>⏳ بانتظار بقية اللاعبين...</div>}
      </div>
    );
  }

  // WORD
  if (data.type === "word") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <Badge color={C.orange}>🔤 رتّب الحروف</Badge>
        <Timer timerEnd={data.timerEnd} maxSeconds={data.time} onDone={onTimerDone} />
        <Card glow color={C.orange} style={{ textAlign: "center", margin: "16px 0" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>الفئة: {data.category}</div>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 8, fontFamily: "'Courier New',monospace", direction: "rtl", color: C.orange }}>{data.scrambled}</div>
        </Card>
        {!submitted ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input value={wordInput} onChange={(e) => setWordInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkWord()}
              style={{ flex: 1, padding: 14, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 10, color: "#fff", fontSize: 20, fontFamily: "inherit", textAlign: "center", outline: "none", direction: "rtl" }}
              placeholder="اكتب الكلمة..." autoFocus />
            <Btn color={C.orange} onClick={checkWord} full={false} disabled={!wordInput.trim()} style={{ padding: "14px 24px" }}>✅</Btn>
          </div>
        ) : (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>⏳ بانتظار بقية اللاعبين...</div>
        )}
      </div>
    );
  }

  // COLOR
  if (data.type === "color") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <Badge color={C.pink}>🎨 تحدي الألوان</Badge>
        <Timer timerEnd={data.timerEnd} maxSeconds={data.time} onDone={onTimerDone} />
        <div style={{ textAlign: "center", margin: "12px 0 6px", fontSize: 13, color: C.muted }}>ما هو <strong>لون</strong> الكلمة؟ (مو معناها!)</div>
        <Card glow color={C.pink} style={{ textAlign: "center", margin: "12px 0 16px" }}>
          <div style={{ fontSize: 42, fontWeight: 900, color: data.textColor }}>{data.textName}</div>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {data.options?.map((o, i) => (
            <button key={i} onClick={() => pickColor(o.hex)} disabled={submitted} style={{
              padding: 16, borderRadius: 12,
              border: colorPicked === o.hex ? `2px solid ${C.gold}` : `1px solid rgba(255,255,255,0.1)`,
              background: colorPicked === o.hex ? `${C.gold}15` : "rgba(255,255,255,0.04)",
              cursor: submitted ? "default" : "pointer", fontFamily: "inherit",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: o.hex, margin: "0 auto 6px" }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{o.name}</div>
            </button>
          ))}
        </div>
        {submitted && <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>⏳ بانتظار بقية اللاعبين...</div>}
      </div>
    );
  }

  return null;
}
