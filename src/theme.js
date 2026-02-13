export const C = {
  bg1: "#060b0a", bg2: "#0a1510", bg3: "#0d1f16",
  green: "#00E676", greenDark: "#00C853", greenGlow: "rgba(0,230,118,0.25)",
  gold: "#FFD700", red: "#FF4444", redGlow: "rgba(255,68,68,0.3)",
  purple: "#9B59B6", cyan: "#4ECDC4", orange: "#FF9800", pink: "#E91E63",
  card: "rgba(0,230,118,0.03)", border: "rgba(0,230,118,0.1)",
  text: "#e8f5e9", muted: "rgba(232,245,233,0.4)",
};

export const CSS = `
  @keyframes su { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
  @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.97); } }
  @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
  @keyframes correctFlash { 0% { background: rgba(0,230,118,0); } 50% { background: rgba(0,230,118,0.3); } 100% { background: rgba(0,230,118,0.1); } }
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 70% { opacity: 0.7; transform: translateY(-120px) scale(1.2); } 100% { opacity: 0; transform: translateY(-200px) scale(0.8); } }
  input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
  input:focus, textarea:focus { border-color: #00E67660 !important; outline: none; }
  * { box-sizing: border-box; }

  /* Responsive */
  html { font-size: 16px; }
  .app-container { max-width: 480px; margin: 0 auto; padding: 16px 16px 40px; }

  /* Small phones */
  @media (max-width: 360px) {
    html { font-size: 14px; }
    .app-container { padding: 10px 10px 30px; }
  }

  /* Tablets */
  @media (min-width: 600px) {
    html { font-size: 17px; }
    .app-container { max-width: 540px; padding: 24px 24px 48px; }
  }

  /* Small laptops */
  @media (min-width: 900px) {
    html { font-size: 18px; }
    .app-container { max-width: 580px; padding: 32px 32px 56px; }
  }

  /* Desktops */
  @media (min-width: 1200px) {
    .app-container { max-width: 620px; }
  }

  /* Landscape phones */
  @media (max-height: 500px) and (orientation: landscape) {
    html { font-size: 13px; }
    .app-container { max-width: 90vw; padding: 8px 16px 20px; }
  }

  /* Touch-friendly tap targets */
  button { min-height: 44px; }
  input { min-height: 44px; }
`;
