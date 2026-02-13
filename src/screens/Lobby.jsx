import { useState, useCallback } from "react";
import { C } from "../theme.js";
import Btn from "../components/ui/Btn.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import PlayerAvatar from "../components/PlayerAvatar.jsx";
import useSocket from "../hooks/useSocket.js";
import socket from "../socket.js";

export default function Lobby({ token, roomCode, initialPlayers, isHost: initialIsHost, onLeave, onGameStart }) {
  const [players, setPlayers] = useState(initialPlayers || []);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [selectedGame, setSelectedGame] = useState("pyramid");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  useSocket("room:player-joined", useCallback((data) => {
    setPlayers(data.players);
  }, []));

  useSocket("room:player-left", useCallback((data) => {
    setPlayers(data.players);
    if (data.newHost === token) setIsHost(true);
  }, [token]));

  useSocket("room:player-kicked", useCallback((data) => {
    if (data.kickedToken === token) {
      onLeave();
      return;
    }
    setPlayers(data.players);
  }, [token, onLeave]));

  useSocket("room:player-disconnected", useCallback((data) => {
    setPlayers(data.players);
  }, []));

  useSocket("room:player-reconnected", useCallback((data) => {
    setPlayers(data.players);
  }, []));

  useSocket("room:game-starting", useCallback((data) => {
    onGameStart(data.gameType, data.players);
  }, [onGameStart]));

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = roomCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: "Game Zone", text: `تعال العب معنا في قيم زون! كود الغرفة: ${roomCode}` });
    } else {
      copyCode();
    }
  };

  const kickPlayer = (targetToken) => {
    socket.emit("room:kick", { token, code: roomCode, targetToken });
  };

  const leave = () => {
    socket.emit("room:leave", { token, code: roomCode });
    onLeave();
  };

  const startGame = () => {
    setStarting(true);
    setError("");
    socket.emit("room:start-game", { token, code: roomCode, gameType: selectedGame }, (res) => {
      setStarting(false);
      if (res?.error) setError(res.error);
    });
  };

  const connectedCount = players.filter((p) => p.connected !== false).length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Room Code */}
      <Card glow color={C.green} style={{ textAlign: "center", marginBottom: 16, padding: "24px 20px" }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>كود الغرفة</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: C.green, fontFamily: "'Courier New',monospace", letterSpacing: 8, marginBottom: 12 }}>{roomCode}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <Btn color={C.green} full={false} onClick={copyCode} style={{ padding: "8px 20px", fontSize: 13 }}>
            {copied ? "✅ تم النسخ!" : "📋 نسخ"}
          </Btn>
          <Btn color={C.gold} full={false} onClick={share} style={{ padding: "8px 20px", fontSize: 13 }}>
            📤 مشاركة
          </Btn>
        </div>
      </Card>

      {/* Players */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>👥 اللاعبين</div>
          <Badge color={C.green}>{connectedCount} / 20</Badge>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {players.map((p, i) => (
            <div key={p.token} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              background: p.token === token ? `${C.green}08` : "rgba(255,255,255,0.02)",
              borderRadius: 10, border: p.token === token ? `1px solid ${C.green}20` : "1px solid transparent",
              opacity: p.connected === false ? 0.4 : 1,
              animation: `su 0.3s ${i * 0.05}s backwards`,
            }}>
              <span style={{ fontSize: 22 }}>{p.avatar}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: p.token === token ? C.green : "#fff" }}>
                  {p.name} {p.token === token && "(أنت)"}
                </span>
                {p.level > 1 && <Badge color={C.purple} style={{ marginRight: 6 }}>Lv.{p.level}</Badge>}
                {p.isHost && <Badge color={C.gold} style={{ marginRight: 6 }}>👑 هوست</Badge>}
                {p.connected === false && <Badge color={C.red}>منقطع</Badge>}
              </div>
              {isHost && p.token !== token && (
                <button onClick={() => kickPlayer(p.token)} style={{
                  background: `${C.red}15`, border: `1px solid ${C.red}30`, borderRadius: 8,
                  padding: "4px 10px", fontSize: 11, color: C.red, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                }}>طرد</button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Game Selection (Host only) */}
      {isHost ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>🎮 اختر اللعبة</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { id: "pyramid", icon: "🔺", name: "الهرم", color: C.red },
              { id: "arena", icon: "⚔️", name: "الحلبة", color: C.orange },
            ].map((g) => (
              <Card key={g.id} onClick={() => setSelectedGame(g.id)} glow={selectedGame === g.id} color={g.color} style={{
                flex: 1, textAlign: "center", padding: 14, cursor: "pointer",
                border: selectedGame === g.id ? `2px solid ${g.color}` : `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>{g.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: g.color }}>{g.name}</div>
              </Card>
            ))}
          </div>

          {error && <div style={{ textAlign: "center", color: C.red, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>❌ {error}</div>}

          <Btn
            color={selectedGame === "pyramid" ? C.red : C.orange}
            onClick={startGame}
            disabled={connectedCount < 2 || starting}
          >
            {starting ? "جاري البدء..." : connectedCount < 2 ? "يحتاج 2 لاعبين على الأقل" : `🚀 ابدأ ${selectedGame === "pyramid" ? "الهرم" : "الحلبة"}!`}
          </Btn>
        </div>
      ) : (
        <Card style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8, animation: "pulse 2s infinite" }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>بانتظار الهوست يبدأ اللعبة...</div>
        </Card>
      )}

      <Btn dark onClick={leave} style={{ marginTop: 12 }}>→ اطلع من الغرفة</Btn>
    </div>
  );
}
