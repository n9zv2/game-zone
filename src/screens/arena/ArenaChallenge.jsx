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
      else if (data.type === "truefalse") submit({ answers: tfAnswersRef.current });
      else if (data.type === "word") submit({ selectedLetters: wordSelectedRef.current });
      else if (data.type === "number_sort") submit({ order: sortSelectedRef.current });
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

  // Reaction
  const [reactionPhase, setReactionPhase] = useState("wait");
  const [reactionTime, setReactionTime] = useState(0);
  const reactionStartRef = useRef(0);

  // Word (button-based)
  const [wordSelected, setWordSelected] = useState([]);
  const [wordAvailable, setWordAvailable] = useState([]);
  const wordSelectedRef = useRef([]);

  // Color
  const [colorPicked, setColorPicked] = useState(null);

  // True/False
  const [tfIndex, setTfIndex] = useState(0);
  const [tfAnswers, setTfAnswers] = useState([]);
  const tfAnswersRef = useRef([]);
  const [tfFeedback, setTfFeedback] = useState(null);

  // Emoji Spot
  const [emojiPicked, setEmojiPicked] = useState(null);

  // Number Sort
  const [sortSelected, setSortSelected] = useState([]);
  const [sortAvailable, setSortAvailable] = useState([]);
  const sortSelectedRef = useRef([]);

  // Reset on new challenge
  useEffect(() => {
    setSubmitted(false);
    setTapCount(0);
    tapCountRef.current = 0;
    setMemPhase("show");
    setMemHighlight(-1);
    setMemInput([]);
    setReactionPhase("wait");
    setReactionTime(0);
    setWordSelected([]);
    wordSelectedRef.current = [];
    setColorPicked(null);
    setTfIndex(0);
    setTfAnswers([]);
    tfAnswersRef.current = [];
    setTfFeedback(null);
    setEmojiPicked(null);
    setSortSelected([]);
    sortSelectedRef.current = [];

    // Memory: show sequence
    if (data.type === "memory" && data.sequence) {
      const seq = data.sequence;
      seq.forEach((v, i) => {
        setTimeout(() => setMemHighlight(v), (i + 1) * 700);
        setTimeout(() => setMemHighlight(-1), (i + 1) * 700 + 400);
      });
      setTimeout(() => setMemPhase("input"), (seq.length + 1) * 700);
    }

    // Word: init available letters
    if (data.type === "word" && data.scrambledLetters) {
      setWordAvailable(data.scrambledLetters.map((l, i) => ({ letter: l, id: i })));
    }

    // Number Sort: init available numbers
    if (data.type === "number_sort" && data.numbers) {
      setSortAvailable([...data.numbers]);
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
    tapCountRef.current++;
    setTapCount(tapCountRef.current);
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

  // Word: select letter (item = { letter, id })
  const wordSelectLetter = (item) => {
    if (submitted) return;
    const newSelected = [...wordSelected, item];
    const newAvailable = wordAvailable.filter((a) => a.id !== item.id);
    setWordSelected(newSelected);
    setWordAvailable(newAvailable);
    wordSelectedRef.current = newSelected.map((i) => i.letter);
    if (newSelected.length === data.letterCount) {
      submit({ selectedLetters: newSelected.map((i) => i.letter) });
    }
  };

  // Word: undo last letter
  const wordUndo = () => {
    if (submitted || wordSelected.length === 0) return;
    const lastItem = wordSelected[wordSelected.length - 1];
    const newSelected = wordSelected.slice(0, -1);
    setWordSelected(newSelected);
    setWordAvailable([...wordAvailable, lastItem]);
    wordSelectedRef.current = newSelected.map((i) => i.letter);
  };

  // Color pick
  const pickColor = (hex) => {
    if (submitted || colorPicked) return;
    setColorPicked(hex);
    submit({ colorHex: hex });
  };

  // True/False: answer
  const tfAnswer = (answer) => {
    if (submitted) return;
    const newAnswers = [...tfAnswers, answer];
    setTfAnswers(newAnswers);
    tfAnswersRef.current = newAnswers;
    setTfFeedback(answer);
    setTimeout(() => {
      setTfFeedback(null);
      if (newAnswers.length >= data.statements.length) {
        submit({ answers: newAnswers });
      } else {
        setTfIndex(tfIndex + 1);
      }
    }, 300);
  };

  // Emoji Spot: pick
  const emojiPick = (idx) => {
    if (submitted || emojiPicked !== null) return;
    setEmojiPicked(idx);
    submit({ position: idx });
  };

  // Number Sort: select number
  const sortSelectNum = (num) => {
    if (submitted) return;
    const newSelected = [...sortSelected, num];
    const newAvailable = sortAvailable.filter((n) => n !== num);
    setSortSelected(newSelected);
    setSortAvailable(newAvailable);
    sortSelectedRef.current = newSelected;
    if (newSelected.length === data.numbers.length) {
      submit({ order: newSelected });
    }
  };

  // Number Sort: undo
  const sortUndo = () => {
    if (submitted || sortSelected.length === 0) return;
    const last = sortSelected[sortSelected.length - 1];
    setSortSelected(sortSelected.slice(0, -1));
    setSortAvailable([...sortAvailable, last]);
    sortSelectedRef.current = sortSelected.slice(0, -1);
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

  const waitingMsg = submitted ? (
    <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted, animation: "pulse 1.5s infinite" }}>⏳ بانتظار بقية اللاعبين...</div>
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
        {waitingMsg}
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
        {waitingMsg}
      </div>
    );
  }

  // TRUE/FALSE
  if (data.type === "truefalse") {
    const stmt = data.statements?.[tfIndex];
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <Badge color={C.green}>✅ صح ولا غلط</Badge>
          <Badge>{tfAnswers.length}/{data.statements?.length || 5}</Badge>
        </div>
        <Timer timerEnd={data.timerEnd} maxSeconds={data.time} onDone={onTimerDone} />
        {!submitted && stmt ? (
          <>
            <Card glow color={C.green} style={{ textAlign: "center", margin: "16px 0", minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.6, direction: "rtl" }}>{stmt.text}</div>
            </Card>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => tfAnswer(true)} style={{
                flex: 1, maxWidth: 150, padding: "16px 0", borderRadius: 14, border: "none",
                background: tfFeedback === true ? `${C.green}30` : "rgba(255,255,255,0.05)",
                fontSize: 22, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: C.green,
              }}>صح ✅</button>
              <button onClick={() => tfAnswer(false)} style={{
                flex: 1, maxWidth: 150, padding: "16px 0", borderRadius: 14, border: "none",
                background: tfFeedback === false ? `${C.red}30` : "rgba(255,255,255,0.05)",
                fontSize: 22, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: C.red,
              }}>غلط ❌</button>
            </div>
          </>
        ) : (
          <Card glow color={C.green} style={{ textAlign: "center", margin: "16px 0" }}>
            <div style={{ fontSize: 36 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>تم الإرسال!</div>
          </Card>
        )}
        {waitingMsg}
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
        {waitingMsg}
      </div>
    );
  }

  // WORD (button-based)
  if (data.type === "word") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <Badge color={C.orange}>🔤 رتّب الحروف</Badge>
        <Timer timerEnd={data.timerEnd} maxSeconds={data.time} onDone={onTimerDone} />
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", margin: "8px 0 4px" }}>الفئة: {data.category}</div>
        {!submitted ? (
          <>
            {/* Selected letters display */}
            <Card glow color={C.orange} style={{ textAlign: "center", margin: "8px 0 12px", minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {wordSelected.length > 0 ? (
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 6, direction: "rtl", color: C.orange }}>
                  {wordSelected.map((i) => i.letter).join("")}
                </div>
              ) : (
                <div style={{ fontSize: 14, color: C.muted }}>اضغط على الحروف بالترتيب الصحيح</div>
              )}
            </Card>
            {/* Available letter buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 12 }}>
              {wordAvailable.map((item) => (
                <button key={item.id} onClick={() => wordSelectLetter(item)} style={{
                  width: 52, height: 52, borderRadius: 12, border: "none",
                  background: `${C.orange}20`, fontSize: 24, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit", color: "#fff",
                }}>
                  {item.letter}
                </button>
              ))}
            </div>
            {/* Undo button */}
            {wordSelected.length > 0 && (
              <div style={{ textAlign: "center" }}>
                <button onClick={wordUndo} style={{
                  padding: "8px 20px", borderRadius: 10, border: `1px solid ${C.border}`,
                  background: "rgba(255,255,255,0.05)", color: C.muted, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit",
                }}>تراجع ↩</button>
              </div>
            )}
          </>
        ) : (
          <Card glow color={C.orange} style={{ textAlign: "center", margin: "16px 0" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.orange }}>{wordSelected.map((i) => i.letter).join("")}</div>
          </Card>
        )}
        {waitingMsg}
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
        {waitingMsg}
      </div>
    );
  }

  // EMOJI SPOT
  if (data.type === "emoji_spot") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <Badge color={C.cyan}>👀 اكتشف المختلف</Badge>
        <Timer timerEnd={data.timerEnd} maxSeconds={data.time} onDone={onTimerDone} />
        <div style={{ textAlign: "center", margin: "8px 0", fontSize: 13, color: C.muted }}>اضغط على الإيموجي المختلف!</div>
        {!submitted ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxWidth: 300, margin: "0 auto" }}>
            {data.grid?.map((emoji, i) => (
              <button key={i} onClick={() => emojiPick(i)} style={{
                aspectRatio: "1", borderRadius: 12, border: "none",
                background: emojiPicked === i ? `${C.cyan}30` : "rgba(255,255,255,0.05)",
                fontSize: 32, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{emoji}</button>
            ))}
          </div>
        ) : (
          <Card glow color={C.cyan} style={{ textAlign: "center", margin: "16px 0" }}>
            <div style={{ fontSize: 48 }}>{data.grid?.[emojiPicked]}</div>
            <div style={{ fontSize: 14, color: C.muted }}>تم الاختيار!</div>
          </Card>
        )}
        {waitingMsg}
      </div>
    );
  }

  // NUMBER SORT
  if (data.type === "number_sort") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {spectatorBanner}
        <Badge color={C.purple}>🔢 رتّب الأرقام</Badge>
        <Timer timerEnd={data.timerEnd} maxSeconds={data.time} onDone={onTimerDone} />
        <div style={{ textAlign: "center", margin: "8px 0", fontSize: 13, color: C.muted }}>رتّب من الأصغر للأكبر</div>
        {!submitted ? (
          <>
            {/* Selected numbers display */}
            <Card glow color={C.purple} style={{ textAlign: "center", margin: "8px 0 12px", minHeight: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {sortSelected.length > 0 ? (
                sortSelected.map((n, i) => (
                  <span key={i} style={{ fontSize: 24, fontWeight: 900, color: C.purple, fontFamily: "'Courier New',monospace" }}>
                    {n}{i < sortSelected.length - 1 ? " ←" : ""}
                  </span>
                ))
              ) : (
                <div style={{ fontSize: 14, color: C.muted }}>اضغط على الأرقام بالترتيب</div>
              )}
            </Card>
            {/* Available number buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 12 }}>
              {sortAvailable.map((num) => (
                <button key={num} onClick={() => sortSelectNum(num)} style={{
                  width: 60, height: 60, borderRadius: 14, border: "none",
                  background: `${C.purple}20`, fontSize: 22, fontWeight: 900,
                  cursor: "pointer", fontFamily: "'Courier New',monospace", color: "#fff",
                }}>{num}</button>
              ))}
            </div>
            {/* Undo button */}
            {sortSelected.length > 0 && (
              <div style={{ textAlign: "center" }}>
                <button onClick={sortUndo} style={{
                  padding: "8px 20px", borderRadius: 10, border: `1px solid ${C.border}`,
                  background: "rgba(255,255,255,0.05)", color: C.muted, fontSize: 13,
                  cursor: "pointer", fontFamily: "inherit",
                }}>تراجع ↩</button>
              </div>
            )}
          </>
        ) : (
          <Card glow color={C.purple} style={{ textAlign: "center", margin: "16px 0" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.purple, fontFamily: "'Courier New',monospace" }}>
              {sortSelected.join(" → ")}
            </div>
          </Card>
        )}
        {waitingMsg}
      </div>
    );
  }

  return null;
}
