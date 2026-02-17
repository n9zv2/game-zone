import { C } from "../../theme.js";
import Card from "../../components/ui/Card.jsx";

const pink = "#E91E63";

export default function MutakhafyResults({ data }) {
  const { responses, activityType, activityData } = data;

  const renderResponse = (r) => {
    if (r.response === null && !r.votedForName) {
      return <span style={{ color: C.muted, fontStyle: "italic" }}>ما جاوب</span>;
    }

    switch (activityType) {
      case "reaction":
        return <span style={{ fontSize: 28 }}>{r.response}</span>;
      case "binary":
        return (
          <span style={{ fontSize: 14, fontWeight: 700, color: r.response === "A" ? C.cyan : C.orange }}>
            {r.response === "A" ? activityData.optionA : activityData.optionB}
          </span>
        );
      case "word":
      case "sentence":
        return <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.response}</span>;
      case "rank":
        if (!Array.isArray(r.response)) return null;
        return (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {r.response.map((item, idx) => (
              <span key={idx} style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 6,
                background: `${pink}15`, color: C.text, fontWeight: 600,
              }}>{idx + 1}. {item}</span>
            ))}
          </div>
        );
      case "rate":
        return (
          <div style={{ display: "flex", gap: 2 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} style={{ fontSize: 16, opacity: n <= r.response ? 1 : 0.2 }}>⭐</span>
            ))}
          </div>
        );
      case "who":
        return (
          <span style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>
            {r.votedForAvatar} {r.votedForName}
          </span>
        );
      default:
        return <span>{JSON.stringify(r.response)}</span>;
    }
  };

  return (
    <div style={{ paddingTop: 16, animation: "fadeIn 0.3s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>النتائج</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: pink }}>ردود المتخفين 🥸</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {responses.map((r, i) => (
          <Card key={r.fakeId} style={{
            padding: 14, display: "flex", alignItems: "center", gap: 12,
            animation: `su 0.3s ${i * 0.06}s backwards`,
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 50 }}>
              <span style={{ fontSize: 24 }}>{r.fakeAvatar}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: pink, textAlign: "center" }}>{r.fakeName}</span>
            </div>
            <div style={{ flex: 1 }}>
              {renderResponse(r)}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: C.muted }}>
        مين فيهم مين؟ 🤔 وقت التخمين قريب...
      </div>
    </div>
  );
}
