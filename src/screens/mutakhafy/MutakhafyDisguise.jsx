import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";

const pink = "#E91E63";

export default function MutakhafyDisguise({ data }) {
  const { yourDisguise, allDisguises, realPlayers } = data;

  return (
    <div style={{ animation: "fadeIn 0.5s ease", paddingTop: 16 }}>
      {/* Your disguise */}
      <Card glow color={pink} style={{ textAlign: "center", marginBottom: 20, padding: "28px 20px" }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>هويتك المتخفية</div>
        <div style={{ fontSize: 60, marginBottom: 12, animation: "pulse 1.5s infinite" }}>{yourDisguise.fakeAvatar}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: pink, marginBottom: 4 }}>{yourDisguise.fakeName}</div>
        <div style={{ fontSize: 12, color: C.muted }}>ما أحد يعرف إنك أنت! حاول تبقى مجهول</div>
      </Card>

      {/* All disguises */}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>🥸 كل المتخفين ({allDisguises.length})</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
        {allDisguises.map((d, i) => (
          <Card key={d.fakeId} style={{
            textAlign: "center", padding: 12,
            animation: `su 0.3s ${i * 0.05}s backwards`,
            border: d.fakeId === yourDisguise.fakeId ? `2px solid ${pink}` : `1px solid ${C.border}`,
            background: d.fakeId === yourDisguise.fakeId ? `${pink}10` : undefined,
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{d.fakeAvatar}</div>
            <div style={{
              fontSize: 12, fontWeight: 700,
              color: d.fakeId === yourDisguise.fakeId ? pink : C.text,
            }}>
              {d.fakeName}
              {d.fakeId === yourDisguise.fakeId && <span style={{ fontSize: 10, color: C.muted }}> (أنت)</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Real players list */}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8, marginTop: 16 }}>👥 اللاعبين الحقيقيين ({realPlayers.length})</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {realPlayers.map((p, i) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
            background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
            borderRadius: 10, animation: `su 0.3s ${i * 0.05}s backwards`,
          }}>
            <span style={{ fontSize: 20 }}>{p.avatar}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{p.name}</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: C.muted }}>
        احفظ هويتك... اللعبة تبدأ قريب!
      </div>
    </div>
  );
}
