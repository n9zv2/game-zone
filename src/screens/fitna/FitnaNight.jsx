import { useState } from "react";
import { C } from "../../theme.js";
import Timer from "../../components/ui/Timer.jsx";
import socket from "../../socket.js";

export default function FitnaNight({ data, token, roomCode, investigateResults }) {
  const [killTarget, setKillTarget] = useState(null);
  const [investigated, setInvestigated] = useState([]);

  const submitKill = (targetToken) => {
    if (killTarget !== null) return;
    setKillTarget(targetToken);
    socket.emit("fitna:night-action", { roomCode, token, action: "kill", targetToken });
  };

  const submitInvestigate = (targetToken) => {
    if (investigated.length >= (data.maxInvestigations || 1)) return;
    if (investigated.includes(targetToken)) return;
    setInvestigated((prev) => [...prev, targetToken]);
    socket.emit("fitna:night-action", { roomCode, token, action: "investigate", targetToken });
  };

  // Saboteur View — Kill
  if (data.role === "saboteur") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌙</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>ليل — وقت القتل</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>اختر ضحية لقتلها الليلة</div>
        </div>

        <Timer timerEnd={data.timerEnd} maxSeconds={10} />

        {/* Partner info for multi-saboteur */}
        {data.totalSaboteurs > 1 && data.partnerNames && (
          <div style={{
            background: `${C.red}08`, border: `1px solid ${C.red}20`,
            borderRadius: 10, padding: "8px 12px", marginBottom: 10, textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>
              🔥 شركاؤك: {data.partnerNames.join("، ")}
            </div>
          </div>
        )}

        {killTarget === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.targets.map((p, i) => (
              <button key={i} onClick={() => submitKill(p.token)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", border: `1px solid ${C.red}30`,
                borderRadius: 10, background: `rgba(255,255,255,0.03)`,
                color: "#fff", cursor: "pointer", fontFamily: "inherit",
                animation: `su 0.3s ${i * 0.05}s backwards`,
              }}>
                <span style={{ fontSize: 24 }}>{p.avatar}</span>
                <span style={{ flex: 1, textAlign: "right", fontSize: 13, fontWeight: 800, color: C.text }}>{p.name}</span>
                <span style={{ fontSize: 14, color: C.red }}>🗡️</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 20, animation: "su 0.3s ease" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗡️</div>
            <div style={{ fontSize: 14, color: C.red, fontWeight: 700 }}>
              {data.totalSaboteurs > 1 ? "تم اختيارك — ننتظر بقية الخونة..." : "تم اختيار الهدف..."}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Detective View — Investigate
  if (data.role === "detective") {
    const maxInv = data.maxInvestigations || 1;
    const allDone = investigated.length >= maxInv;

    return (
      <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌙</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.cyan }}>ليل — تحقيق</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            اختر {maxInv > 1 ? `${maxInv} لاعبين` : "لاعب"} للتحقيق معه
          </div>
        </div>

        <Timer timerEnd={data.timerEnd} maxSeconds={10} />

        {/* Previous investigations */}
        {data.previousInvestigations && data.previousInvestigations.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>تحقيقات سابقة:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {data.previousInvestigations.map((inv, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: inv.result === "saboteur" ? `${C.red}10` : `${C.green}10`,
                  border: `1px solid ${inv.result === "saboteur" ? C.red : C.green}30`,
                  borderRadius: 8, padding: "6px 10px", fontSize: 12,
                }}>
                  <span style={{ fontWeight: 700, color: C.text }}>{inv.name}</span>
                  <span style={{ color: inv.result === "saboteur" ? C.red : C.green, fontWeight: 800 }}>
                    {inv.result === "saboteur" ? "خائن 🔥" : "بريء 😇"}
                  </span>
                  <span style={{ color: C.muted, marginRight: "auto", fontSize: 10 }}>جولة {inv.round}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current investigation results */}
        {investigateResults.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan, marginBottom: 6 }}>نتائج هالجولة:</div>
            {investigateResults.map((r, i) => (
              <div key={i} style={{
                background: r.result === "saboteur" ? `${C.red}15` : `${C.green}15`,
                border: `2px solid ${r.result === "saboteur" ? C.red : C.green}40`,
                borderRadius: 10, padding: 12, marginBottom: 6, textAlign: "center",
                animation: "su 0.4s ease",
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: r.result === "saboteur" ? C.red : C.green }}>
                  {r.targetName} = {r.result === "saboteur" ? "خائن! 🔥" : "بريء 😇"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Candidates */}
        {!allDone ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.candidates.filter((c) => !investigated.includes(c.token)).map((p, i) => (
              <button key={i} onClick={() => submitInvestigate(p.token)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", border: `1px solid ${C.cyan}30`,
                borderRadius: 10, background: `rgba(255,255,255,0.03)`,
                color: "#fff", cursor: "pointer", fontFamily: "inherit",
                animation: `su 0.3s ${i * 0.05}s backwards`,
              }}>
                <span style={{ fontSize: 24 }}>{p.avatar}</span>
                <div style={{ flex: 1, textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{p.name}</div>
                  {p.suspicion > 0 && (
                    <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                      {Array.from({ length: Math.min(Math.round(p.suspicion), 5) }, (_, j) => (
                        <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: C.red }} />
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 14, color: C.cyan }}>🔍</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: 12 }}>
            انتهت تحقيقاتك — ننتظر الصباح
          </div>
        )}
      </div>
    );
  }

  // Innocent View — Sleep
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ fontSize: 60, marginBottom: 16, animation: "pulse 2s infinite" }}>🌙</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.purple, marginBottom: 8 }}>نام بسلام...</div>
      <div style={{ fontSize: 14, color: C.muted }}>الليل نزل — الخونة يتحركون</div>
      <Timer timerEnd={data.timerEnd} maxSeconds={10} />
    </div>
  );
}
