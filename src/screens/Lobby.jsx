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
  // Salfa settings
  const [salfaRounds, setSalfaRounds] = useState(3);
  const [salfaSpyCount, setSalfaSpyCount] = useState(0); // 0 = auto

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

  const addBot = () => {
    socket.emit("room:add-bot", { token, code: roomCode }, (res) => {
      if (res?.error) setError(res.error);
    });
  };

  const removeBot = (botToken) => {
    socket.emit("room:remove-bot", { token, code: roomCode, botToken });
  };

  const leave = () => {
    socket.emit("room:leave", { token, code: roomCode });
    onLeave();
  };

  const startGame = () => {
    setStarting(true);
    setError("");
    const payload = { token, code: roomCode, gameType: selectedGame };
    if (selectedGame === "salfa") {
      payload.settings = { rounds: salfaRounds, spyCount: salfaSpyCount };
    }
    socket.emit("room:start-game", payload, (res) => {
      setStarting(false);
      if (res?.error) setError(res.error);
    });
  };

  const connectedCount = players.filter((p) => p.connected !== false || p.isBot).length;

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
                {p.isBot && <Badge color={C.orange} style={{ marginRight: 6 }}>بوت</Badge>}
                {p.connected === false && !p.isBot && <Badge color={C.red}>منقطع</Badge>}
              </div>
              {isHost && p.token !== token && !p.isBot && (
                <button onClick={() => kickPlayer(p.token)} style={{
                  background: `${C.red}15`, border: `1px solid ${C.red}30`, borderRadius: 8,
                  padding: "4px 10px", fontSize: 11, color: C.red, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                }}>طرد</button>
              )}
              {isHost && p.isBot && (
                <button onClick={() => removeBot(p.token)} style={{
                  background: `${C.red}15`, border: `1px solid ${C.red}30`, borderRadius: 8,
                  padding: "4px 10px", fontSize: 11, color: C.red, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                }}>حذف</button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Add Bot (Host only) */}
      {isHost && players.length < 20 && (
        <Btn color={C.orange} onClick={addBot} style={{ marginBottom: 16, fontSize: 14 }}>
          + أضف بوت
        </Btn>
      )}

      {/* Game Selection (Host only) */}
      {isHost ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>🎮 اختر اللعبة</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { id: "pyramid", icon: "🔺", name: "الهرم", color: C.red, min: 2 },
              { id: "arena", icon: "⚔️", name: "الحلبة", color: C.orange, min: 2 },
              { id: "salfa", icon: "🕵️", name: "مين برا السالفة", color: C.cyan, min: 3 },
              { id: "codenames", icon: "🔤", name: "كلمات سرية", color: C.purple, min: 4 },
            ].map((g) => (
              <Card key={g.id} onClick={() => setSelectedGame(g.id)} glow={selectedGame === g.id} color={g.color} style={{
                flex: 1, textAlign: "center", padding: 14, cursor: "pointer",
                border: selectedGame === g.id ? `2px solid ${g.color}` : `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>{g.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: g.color }}>{g.name}</div>
                <div style={{ fontSize: 9, color: C.muted }}>{g.min}+ لاعب</div>
              </Card>
            ))}
          </div>

          {/* Salfa Settings */}
          {selectedGame === "salfa" && (
            <Card style={{ marginBottom: 12, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.cyan, marginBottom: 10 }}>⚙️ إعدادات مين برا السالفة</div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>عدد الجولات</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button key={n} onClick={() => setSalfaRounds(n)} style={{
                      flex: 1, padding: "6px 0", border: `1px solid ${salfaRounds === n ? C.cyan : C.border}`,
                      borderRadius: 6, background: salfaRounds === n ? `${C.cyan}20` : "transparent",
                      color: salfaRounds === n ? C.cyan : C.muted, fontSize: 13, fontWeight: 800,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>{n}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>عدد الجواسيس</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2, 3].map((n) => (
                    <button key={n} onClick={() => setSalfaSpyCount(n)} style={{
                      flex: 1, padding: "6px 0", border: `1px solid ${salfaSpyCount === n ? C.cyan : C.border}`,
                      borderRadius: 6, background: salfaSpyCount === n ? `${C.cyan}20` : "transparent",
                      color: salfaSpyCount === n ? C.cyan : C.muted, fontSize: 12, fontWeight: 800,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>{n === 0 ? "تلقائي" : n}</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8 }}>
                {salfaSpyCount === 0
                  ? `${connectedCount} لاعب → ${connectedCount >= 8 ? "2 جاسوس" : "1 جاسوس"} (تلقائي)`
                  : `${salfaSpyCount} جاسوس`}
              </div>
            </Card>
          )}

          {error && <div style={{ textAlign: "center", color: C.red, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>❌ {error}</div>}

          {(() => {
            const minPlayers = selectedGame === "codenames" ? 4 : selectedGame === "salfa" ? 3 : 2;
            const gameColors = { pyramid: C.red, arena: C.orange, salfa: C.cyan, codenames: C.purple };
            const gameNames = { pyramid: "الهرم", arena: "الحلبة", salfa: "مين برا السالفة", codenames: "كلمات سرية" };
            const notEnough = connectedCount < minPlayers;
            return (
              <Btn
                color={gameColors[selectedGame]}
                onClick={startGame}
                disabled={notEnough || starting}
              >
                {starting ? "جاري البدء..." : notEnough ? `يحتاج ${minPlayers} لاعبين على الأقل` : `🚀 ابدأ ${gameNames[selectedGame]}!`}
              </Btn>
            );
          })()}
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
