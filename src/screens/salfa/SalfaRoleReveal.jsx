import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";

export default function SalfaRoleReveal({ data }) {
  const isSpy = data.role === "spy";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: 20, animation: "fadeIn 0.5s ease" }}>
      {/* Round info */}
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        الجولة {data.roundIdx} من {data.totalRounds}
      </div>

      {/* Role icon */}
      <div style={{ fontSize: 80, marginBottom: 16, animation: "pulse 1.5s infinite" }}>
        {isSpy ? "🕵️" : "😇"}
      </div>

      {/* Role text */}
      <div style={{
        fontSize: 24, fontWeight: 900, marginBottom: 12,
        background: `linear-gradient(135deg, ${isSpy ? C.red : C.green}, ${isSpy ? C.purple : C.cyan})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        {isSpy ? "أنت الجاسوس!" : "أنت بريء"}
      </div>

      {/* Word or spy message */}
      {isSpy ? (
        <Card style={{ textAlign: "center", padding: "20px 24px", marginBottom: 16, border: `1px solid ${C.red}30`, background: `${C.red}08` }}>
          <div style={{ fontSize: 14, color: C.red, fontWeight: 700, marginBottom: 8 }}>
            ما تعرف الكلمة!
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            حاول تكتشف الكلمة من تلميحات الباقين بدون ما تنكشف
          </div>
          {data.spyCount > 1 && (
            <div style={{ fontSize: 11, color: C.orange, marginTop: 8 }}>
              فيه {data.spyCount} جواسيس هالجولة
            </div>
          )}
        </Card>
      ) : (
        <Card glow color={C.green} style={{ textAlign: "center", padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>التصنيف: {data.category}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.green, marginBottom: 8 }}>
            {data.word}
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            وصّف الكلمة بتلميح — بدون ما تسهّل على الجاسوس
          </div>
          {data.spyCount > 1 && (
            <div style={{ fontSize: 11, color: C.orange, marginTop: 8 }}>
              انتبه — فيه {data.spyCount} جواسيس!
            </div>
          )}
        </Card>
      )}

      <div style={{ fontSize: 11, color: C.muted, animation: "pulse 2s infinite" }}>
        جاري البدء...
      </div>
    </div>
  );
}
