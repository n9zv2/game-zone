import { C } from "../../theme.js";

export default function FitnaResults({ data, token }) {
  if (data.fogActive) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ fontSize: 60, marginBottom: 16, animation: "pulse 1.5s infinite" }}>🌫️</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.muted }}>ضباب! النتائج مخفية</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>أحد الخونة استخدم كرت الضباب</div>
      </div>
    );
  }

  const type = data.type;

  // ── Loyalty Test Results ──
  if (type === "loyalty_test") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎯</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>نتائج اختبار الولاء</div>
        </div>

        {/* Correct Symbol */}
        <div style={{
          background: `${C.green}12`, border: `1px solid ${C.green}40`,
          borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "center",
        }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>الرمز الصحيح:</div>
          <div style={{ fontSize: 36 }}>{data.correctSymbol}</div>
        </div>

        {/* Player choices */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {data.results.map((r, i) => {
            const isMe = r.token === token;
            return (
              <div key={i} style={{
                background: isMe ? `${C.purple}15` : !r.correct ? `${C.red}08` : `rgba(255,255,255,0.03)`,
                border: `1px solid ${isMe ? C.purple : !r.correct ? `${C.red}40` : C.border}`,
                borderRadius: 10, padding: "8px 6px", textAlign: "center",
                animation: `su 0.3s ${i * 0.04}s backwards`,
              }}>
                <div style={{ fontSize: 20 }}>{r.avatar}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isMe ? C.purple : C.text, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 22, marginTop: 4 }}>{r.choiceSymbol}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  {r.correct ? "✅" : "❌"}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.muted }}>
          ❌ = ما عرف الرمز السري — الأبرياء دائماً يعرفونه!
        </div>
      </div>
    );
  }

  // ── Face-Off Results ──
  if (type === "face_off") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⚔️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>نتائج المواجهة</div>
        </div>

        {/* Pair results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.pairResults.map((pr, i) => {
            const hasMe = pr.tokens.includes(token);
            return (
              <div key={i} style={{
                background: hasMe ? `${C.purple}12` : `rgba(255,255,255,0.03)`,
                border: `1px solid ${hasMe ? C.purple : C.border}`,
                borderRadius: 12, padding: 12,
                animation: `su 0.3s ${i * 0.08}s backwards`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                  {/* Player 1 */}
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: 22 }}>{pr.avatars[0]}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: pr.tokens[0] === token ? C.purple : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.names[0]}</div>
                    <div style={{ fontSize: 14, marginTop: 2 }}>{pr.correct[0] ? "✅" : "❌"}</div>
                  </div>

                  {/* VS + result */}
                  <div style={{ textAlign: "center", padding: "0 8px" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>
                      {pr.agreed ? "✅" : "❌"}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: pr.agreed ? C.green : C.red }}>
                      {pr.agreed ? "اتفقوا" : "اختلفوا"}
                    </div>
                    <div style={{ fontSize: 16, marginTop: 4 }}>{pr.correctEmoji}</div>
                  </div>

                  {/* Player 2 */}
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: 22 }}>{pr.avatars[1]}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: pr.tokens[1] === token ? C.purple : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.names[1]}</div>
                    <div style={{ fontSize: 14, marginTop: 2 }}>{pr.correct[1] ? "✅" : "❌"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {data.sittingOutName && (
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.muted }}>
            😴 {data.sittingOutName} قعد هالجولة
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.muted }}>
          ❌ اختلاف = واحد منهم خائن! ✅ اتفاق = غالباً كلهم أبرياء
        </div>
      </div>
    );
  }

  // ── Secret Word Results ──
  if (type === "secret_word") {
    return (
      <div style={{ animation: "fadeIn 0.3s ease", padding: "0 4px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎭</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>نتائج الكلمة السرية</div>
        </div>

        {/* The word & category */}
        <div style={{
          background: `${C.purple}15`, border: `1px solid ${C.purple}40`,
          borderRadius: 12, padding: 14, marginBottom: 16, textAlign: "center",
        }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{data.category}:</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.purple }}>{data.word}</div>
        </div>

        {/* Player hints */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {data.results.map((r, i) => {
            const isMe = r.token === token;
            return (
              <div key={i} style={{
                background: isMe ? `${C.purple}15` : `rgba(255,255,255,0.03)`,
                border: `1px solid ${isMe ? C.purple : C.border}`,
                borderRadius: 10, padding: "8px 6px", textAlign: "center",
                animation: `su 0.3s ${i * 0.04}s backwards`,
              }}>
                <div style={{ fontSize: 20 }}>{r.avatar}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isMe ? C.purple : C.text, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 3, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minHeight: 14 }}>
                  {r.gaveHint ? `"${r.hint}"` : "—"}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.muted }}>
          قارن التلميحات — الخونة تلميحاتهم غامضة لأنهم ما يعرفون الكلمة!
        </div>
      </div>
    );
  }

  return null;
}
