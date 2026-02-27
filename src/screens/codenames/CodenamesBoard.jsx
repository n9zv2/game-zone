import { useState } from "react";
import { C } from "../../theme.js";
import socket from "../../socket.js";

// Spymaster sees full-color cards (like the original game)
const SPYMASTER_COLORS = {
  red: { bg: "#D32F2F", border: "#F44336", text: "#fff" },
  blue: { bg: "#1565C0", border: "#2196F3", text: "#fff" },
  neutral: { bg: "#8D6E63", border: "#A1887F", text: "#EFEBE9" },
  assassin: { bg: "#212121", border: "#424242", text: "#fff" },
};

// Revealed card colors (visible to everyone after reveal)
const REVEALED_COLORS = {
  red: { bg: "rgba(211,47,47,0.25)", border: "#F44336", text: "#EF9A9A" },
  blue: { bg: "rgba(21,101,192,0.25)", border: "#2196F3", text: "#90CAF9" },
  neutral: { bg: "rgba(141,110,99,0.18)", border: "#8D6E63", text: "#BCAAA4" },
  assassin: { bg: "#1a1a1a", border: "#555", text: "#fff" },
};

// Guesser unrevealed card (cream/beige — same for all)
const GUESSER_CARD = {
  bg: "rgba(255,248,230,0.08)",
  border: "rgba(255,248,230,0.15)",
  text: "#F5F0E0",
};

export default function CodenamesBoard({ grid, isSpymaster, phase, isMyTurn, roomCode, token, lastReveal, currentTeam }) {
  const [confirmIdx, setConfirmIdx] = useState(null);
  const canGuess = phase === "guesser-turn" && isMyTurn && !isSpymaster;

  const handleClick = (idx) => {
    if (!canGuess || grid[idx].revealed) return;

    // Confirmation tap: first tap selects, second tap confirms
    if (confirmIdx === idx) {
      socket.emit("codenames:guess", { roomCode, token, wordIndex: idx });
      setConfirmIdx(null);
    } else {
      setConfirmIdx(idx);
    }
  };

  // Dismiss confirmation when tapping elsewhere
  const handleBgClick = () => {
    if (confirmIdx !== null) setConfirmIdx(null);
  };

  return (
    <div onClick={handleBgClick} style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 5,
      padding: "6px 0",
    }}>
      {grid.map((cell, idx) => {
        const revealed = cell.revealed;
        const isConfirming = confirmIdx === idx;
        const isLastRevealed = lastReveal && lastReveal.wordIndex === idx;

        // Determine card style
        let cardBg, cardBorder, cardText;

        if (revealed) {
          // Revealed — show true color to everyone
          const rc = REVEALED_COLORS[cell.type] || REVEALED_COLORS.neutral;
          cardBg = rc.bg;
          cardBorder = rc.border;
          cardText = rc.text;
        } else if (isSpymaster && cell.type) {
          // Spymaster — full color key card
          const sc = SPYMASTER_COLORS[cell.type];
          cardBg = sc.bg;
          cardBorder = sc.border;
          cardText = sc.text;
        } else {
          // Guesser — all same beige/cream
          cardBg = GUESSER_CARD.bg;
          cardBorder = GUESSER_CARD.border;
          cardText = GUESSER_CARD.text;
        }

        // Feedback animation
        let animation = "";
        if (isLastRevealed) {
          if (lastReveal.resultType === "correct") animation = "correctFlash 0.6s ease";
          else if (lastReveal.resultType === "assassin") animation = "shake 0.5s ease";
          else animation = "shake 0.3s ease";
        }

        // Clickable glow for guesser's turn
        const clickableGlow = canGuess && !revealed
          ? `0 0 8px ${currentTeam === "red" ? "rgba(244,67,54,0.2)" : "rgba(33,150,243,0.2)"}`
          : "none";

        // Confirmation highlight
        const confirmGlow = isConfirming
          ? `0 0 16px ${currentTeam === "red" ? "rgba(244,67,54,0.5)" : "rgba(33,150,243,0.5)"}, inset 0 0 20px rgba(255,255,255,0.1)`
          : clickableGlow;

        return (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); handleClick(idx); }}
            disabled={!canGuess || revealed}
            style={{
              position: "relative",
              padding: "12px 3px",
              borderRadius: 10,
              border: isConfirming
                ? `2px solid ${currentTeam === "red" ? "#F44336" : "#2196F3"}`
                : `1.5px solid ${cardBorder}`,
              background: cardBg,
              color: cardText,
              fontSize: "min(13px, 3.5vw)",
              fontWeight: 800,
              fontFamily: "inherit",
              cursor: canGuess && !revealed ? "pointer" : "default",
              opacity: revealed && cell.type !== "assassin" ? 0.7 : 1,
              transition: "all 0.25s ease",
              animation,
              minHeight: 48,
              lineHeight: 1.2,
              textAlign: "center",
              overflow: "hidden",
              wordBreak: "break-word",
              boxShadow: confirmGlow,
              transform: isConfirming ? "scale(1.05)" : "scale(1)",
            }}
          >
            {cell.word}

            {/* Assassin skull on revealed */}
            {revealed && cell.type === "assassin" && (
              <span style={{
                position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)",
                fontSize: 12, opacity: 0.8,
              }}>💀</span>
            )}

            {/* Confirmation overlay */}
            {isConfirming && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 700,
                paddingTop: 28,
              }}>
                اضغط للتأكيد
              </div>
            )}

            {/* Revealed checkmark/cross overlay */}
            {isLastRevealed && lastReveal.resultType === "correct" && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 10,
                background: "rgba(0,230,118,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, pointerEvents: "none",
              }}>✅</div>
            )}
            {isLastRevealed && (lastReveal.resultType === "opponent" || lastReveal.resultType === "neutral") && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 10,
                background: "rgba(255,68,68,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, pointerEvents: "none",
              }}>❌</div>
            )}
            {isLastRevealed && lastReveal.resultType === "assassin" && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: 10,
                background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, pointerEvents: "none",
              }}>💀</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
