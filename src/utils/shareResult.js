export async function generateResultCard({ name, avatar, rank, score, totalPlayers, gameType }) {
  const W = 800, H = 600;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#060b0a");
  grad.addColorStop(0.5, "#0a1510");
  grad.addColorStop(1, "#0d1f16");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Border glow
  ctx.strokeStyle = "rgba(0,230,118,0.3)";
  ctx.lineWidth = 3;
  ctx.roundRect(10, 10, W - 20, H - 20, 20);
  ctx.stroke();

  // Game type icon + title
  ctx.textAlign = "center";
  ctx.font = "48px serif";
  ctx.fillText(gameType === "pyramid" ? "🔺" : "⚔️", W / 2, 70);
  ctx.font = "bold 28px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#00E676";
  ctx.fillText("GAME ZONE", W / 2, 110);

  // Avatar
  ctx.font = "80px serif";
  ctx.fillText(avatar, W / 2, 210);

  // Player name
  ctx.font = "bold 32px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#e8f5e9";
  ctx.fillText(name, W / 2, 260);

  // Rank
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const medal = medals[rank] || "";
  ctx.font = "bold 72px 'Courier New', monospace";
  ctx.fillStyle = rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "#00E676";
  ctx.fillText(`${medal} #${rank}`, W / 2, 360);

  // Score
  ctx.font = "bold 28px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(`⭐ ${score} نقطة`, W / 2, 420);

  // Players count
  ctx.font = "18px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(232,245,233,0.4)";
  ctx.fillText(`من أصل ${totalPlayers} لاعب`, W / 2, 460);

  // Footer
  ctx.font = "14px 'Courier New', monospace";
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillText("GAME ZONE v3 — gamezone.app", W / 2, H - 30);

  return canvas;
}

export async function shareResult(params) {
  const canvas = await generateResultCard(params);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const file = new File([blob], "game-zone-result.png", { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: "نتيجتي في Game Zone",
        text: `حصلت على المركز #${params.rank} بـ ${params.score} نقطة!`,
        files: [file],
      });
      return;
    } catch {
      // User cancelled or error — fall through to download
    }
  }

  // Fallback: download PNG
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "game-zone-result.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
