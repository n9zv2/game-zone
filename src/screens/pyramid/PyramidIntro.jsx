import { C } from "../../theme.js";

export default function PyramidIntro({ playerCount, totalRounds }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", animation: "fadeIn 0.3s ease" }}>
      <div style={{ fontSize: 60, marginBottom: 12, animation: "pulse 1s infinite" }}>🔺</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: C.green, margin: "4px 0 8px" }}>الهرم</h2>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>{playerCount}</div>
          <div style={{ fontSize: 10, color: C.muted }}>لاعب</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.red }}>{totalRounds}</div>
          <div style={{ fontSize: 10, color: C.muted }}>راوند</div>
        </div>
      </div>
    </div>
  );
}
