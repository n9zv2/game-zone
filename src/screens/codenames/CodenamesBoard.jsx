import { C } from "../../theme.js";
import socket from "../../socket.js";

const TYPE_COLORS = {
  red: { bg: "#FF444430", border: "#FF4444", text: "#FF6666" },
  blue: { bg: "#4488FF30", border: "#4488FF", text: "#6699FF" },
  neutral: { bg: "#8B7D6B30", border: "#8B7D6B", text: "#C4B599" },
  assassin: { bg: "#1a1a1a", border: "#555", text: "#fff" },
};

const SPYMASTER_BORDER = {
  red: "#FF4444",
  blue: "#4488FF",
  neutral: "#8B7D6B",
  assassin: "#000",
};

export default function CodenamesBoard({ grid, isSpymaster, phase, isMyTurn, roomCode, token }) {
  const canGuess = phase === "guesser-turn" && isMyTurn && !isSpymaster;

  const handleClick = (idx) => {
    if (!canGuess) return;
    if (grid[idx].revealed) return;
    socket.emit("codenames:guess", { roomCode, token, wordIndex: idx });
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 4,
      padding: "4px 0",
    }}>
      {grid.map((cell, idx) => {
        const revealed = cell.revealed;
        const colors = revealed && cell.type ? TYPE_COLORS[cell.type] : null;
        const spymasterHint = isSpymaster && !revealed && cell.type;
        const isAssassinRevealed = revealed && cell.type === "assassin";

        return (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            disabled={!canGuess || revealed}
            style={{
              position: "relative",
              padding: "10px 2px",
              borderRadius: 8,
              border: revealed
                ? `2px solid ${colors?.border || C.border}`
                : spymasterHint
                  ? `2px solid ${SPYMASTER_BORDER[cell.type]}60`
                  : `1px solid ${C.border}`,
              background: revealed
                ? isAssassinRevealed ? "#1a1a1a" : colors?.bg || "transparent"
                : spymasterHint
                  ? `${SPYMASTER_BORDER[cell.type]}10`
                  : "rgba(255,255,255,0.04)",
              color: revealed
                ? colors?.text || "#fff"
                : "#fff",
              fontSize: "min(12px, 3vw)",
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: canGuess && !revealed ? "pointer" : "default",
              opacity: revealed ? (isAssassinRevealed ? 0.7 : 0.85) : 1,
              transition: "all 0.2s",
              minHeight: 44,
              lineHeight: 1.2,
              textAlign: "center",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {cell.word}
            {isAssassinRevealed && (
              <span style={{ position: "absolute", top: 2, left: 2, fontSize: 10 }}>💀</span>
            )}
            {spymasterHint && (
              <div style={{
                position: "absolute", top: 2, right: 2, width: 8, height: 8,
                borderRadius: "50%", background: SPYMASTER_BORDER[cell.type],
                opacity: 0.7,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
