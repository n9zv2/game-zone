import { useState, useCallback } from "react";
import { C } from "../theme.js";
import Btn from "../components/ui/Btn.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import PlayerAvatar from "../components/PlayerAvatar.jsx";
import useSocket from "../hooks/useSocket.js";
import socket from "../socket.js";

const FITNA_DEFAULTS = [
  { min: 4,  max: 5,  saboteurs: 1, detectives: 1 },
  { min: 6,  max: 8,  saboteurs: 2, detectives: 1 },
  { min: 9,  max: 12, saboteurs: 2, detectives: 1 },
  { min: 13, max: 16, saboteurs: 3, detectives: 1 },
  { min: 17, max: 20, saboteurs: 3, detectives: 2 },
];

function getFitnaDefaults(count) {
  const e = FITNA_DEFAULTS.find(d => count >= d.min && count <= d.max);
  return e || { saboteurs: 1, detectives: 1 };
}

export default function Lobby({ token, roomCode, initialPlayers, isHost: initialIsHost, onLeave, onGameStart }) {
  const [players, setPlayers] = useState(initialPlayers || []);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [selectedGame, setSelectedGame] = useState("pyramid");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  // Fitna settings
  const [fitnaCustom, setFitnaCustom] = useState(false);
  const [fitnaSaboteurs, setFitnaSaboteurs] = useState(0);
  const [fitnaDetectives, setFitnaDetectives] = useState(0);
  const [fitnaDiscussionTime, setFitnaDiscussionTime] = useState(60);
  const [fitnaVoteTime, setFitnaVoteTime] = useState(30);
  // Salfa settings
  const [salfaRounds, setSalfaRounds] = useState(3);

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
    const payload = { token, code: roomCode, gameType: selectedGame };
    if (selectedGame === "fitna") {
      payload.settings = {
        saboteurCount: fitnaCustom ? fitnaSaboteurs : 0,
        detectiveCount: fitnaCustom ? fitnaDetectives : 0,
        discussionTime: fitnaDiscussionTime,
        voteTime: fitnaVoteTime,
      };
    } else if (selectedGame === "salfa") {
      payload.settings = { rounds: salfaRounds };
    }
    socket.emit("room:start-game", payload, (res) => {
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
              { id: "pyramid", icon: "🔺", name: "الهرم", color: C.red, min: 2 },
              { id: "arena", icon: "⚔️", name: "الحلبة", color: C.orange, min: 2 },
              { id: "fitna", icon: "🎭", name: "فتنة", color: C.purple, min: 4 },
              { id: "salfa", icon: "🕵️", name: "مين برا السالفة", color: C.cyan, min: 3 },
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

          {/* Fitna Settings */}
          {selectedGame === "fitna" && (
            <Card style={{ marginBottom: 12, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.purple, marginBottom: 10 }}>⚙️ إعدادات فتنة</div>

              {/* Auto/Custom toggle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => setFitnaCustom(false)} style={{
                  flex: 1, padding: "6px 8px", border: `1px solid ${!fitnaCustom ? C.purple : C.border}`,
                  borderRadius: 8, background: !fitnaCustom ? `${C.purple}20` : "transparent",
                  color: !fitnaCustom ? C.purple : C.muted, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>تلقائي</button>
                <button onClick={() => setFitnaCustom(true)} style={{
                  flex: 1, padding: "6px 8px", border: `1px solid ${fitnaCustom ? C.purple : C.border}`,
                  borderRadius: 8, background: fitnaCustom ? `${C.purple}20` : "transparent",
                  color: fitnaCustom ? C.purple : C.muted, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}>يدوي</button>
              </div>

              {!fitnaCustom && (() => {
                const d = getFitnaDefaults(connectedCount);
                return (
                  <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 8 }}>
                    {connectedCount} لاعب → {d.saboteurs} خائن، {d.detectives} محقق
                  </div>
                );
              })()}

              {fitnaCustom && (
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>خونة</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1, 2, 3, 4].map((n) => (
                        <button key={n} onClick={() => setFitnaSaboteurs(n)} style={{
                          flex: 1, padding: "6px 0", border: `1px solid ${fitnaSaboteurs === n ? C.red : C.border}`,
                          borderRadius: 6, background: fitnaSaboteurs === n ? `${C.red}20` : "transparent",
                          color: fitnaSaboteurs === n ? C.red : C.muted, fontSize: 13, fontWeight: 800,
                          cursor: "pointer", fontFamily: "inherit",
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>محققين</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0, 1, 2].map((n) => (
                        <button key={n} onClick={() => setFitnaDetectives(n)} style={{
                          flex: 1, padding: "6px 0", border: `1px solid ${fitnaDetectives === n ? C.cyan : C.border}`,
                          borderRadius: 6, background: fitnaDetectives === n ? `${C.cyan}20` : "transparent",
                          color: fitnaDetectives === n ? C.cyan : C.muted, fontSize: 13, fontWeight: 800,
                          cursor: "pointer", fontFamily: "inherit",
                        }}>{n}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Discussion & Vote time */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>وقت النقاش</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[30, 60, 90].map((t) => (
                      <button key={t} onClick={() => setFitnaDiscussionTime(t)} style={{
                        flex: 1, padding: "6px 0", border: `1px solid ${fitnaDiscussionTime === t ? C.green : C.border}`,
                        borderRadius: 6, background: fitnaDiscussionTime === t ? `${C.green}20` : "transparent",
                        color: fitnaDiscussionTime === t ? C.green : C.muted, fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                      }}>{t}s</button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>وقت التصويت</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[15, 30, 45].map((t) => (
                      <button key={t} onClick={() => setFitnaVoteTime(t)} style={{
                        flex: 1, padding: "6px 0", border: `1px solid ${fitnaVoteTime === t ? C.gold : C.border}`,
                        borderRadius: 6, background: fitnaVoteTime === t ? `${C.gold}20` : "transparent",
                        color: fitnaVoteTime === t ? C.gold : C.muted, fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                      }}>{t}s</button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

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
              <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8 }}>
                {connectedCount} لاعب → {connectedCount >= 8 ? "2 جاسوس" : "1 جاسوس"} (تلقائي)
              </div>
            </Card>
          )}

          {error && <div style={{ textAlign: "center", color: C.red, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>❌ {error}</div>}

          {(() => {
            const minPlayers = selectedGame === "fitna" ? 4 : selectedGame === "salfa" ? 3 : 2;
            const gameColors = { pyramid: C.red, arena: C.orange, fitna: C.purple, salfa: C.cyan };
            const gameNames = { pyramid: "الهرم", arena: "الحلبة", fitna: "فتنة", salfa: "مين برا السالفة" };
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
