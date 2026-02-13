import { useState } from "react";
import { C } from "../theme.js";
import Btn from "../components/ui/Btn.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";
import socket from "../socket.js";

const HUB_GAMES = [
  { id: "pyramid", icon: "🔺", name: "الهرم", desc: "100+ سؤال — كل راوند إقصاء فوري!", players: "2-20", color: C.red },
  { id: "arena", icon: "⚔️", name: "الحلبة", desc: "6 أنواع تحديات مختلفة — الأضعف يطلع!", players: "2-20", color: C.orange },
];

export default function Landing({ token, name, avatar, onRoom, onMatchHistory }) {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createRoom = () => {
    setLoading(true);
    setError("");
    socket.emit("room:create", { token }, (res) => {
      setLoading(false);
      if (res?.error) return setError(res.error);
      if (res?.code) onRoom(res.code, res.players, true);
    });
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 5) return setError("الكود لازم 5 أحرف");
    setLoading(true);
    setError("");
    socket.emit("room:join", { token, code }, (res) => {
      setLoading(false);
      if (res?.error) return setError(res.error);
      if (res?.code) onRoom(res.code, res.players, false);
    });
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🎮</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.green, letterSpacing: 2, fontFamily: "'Courier New',monospace", lineHeight: 1 }}>GAME</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 4, fontWeight: 600 }}>ZONE</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{avatar}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{name}</span>
        </div>
      </div>

      <Card glow color={C.green} style={{ marginBottom: 20, textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.3, marginBottom: 6, background: `linear-gradient(135deg, ${C.green}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ساحة الألعاب الجماعية</div>
        <div style={{ fontSize: 12, color: C.muted }}>العب مع أصدقائك — أنشئ غرفة أو ادخل بكود!</div>
      </Card>

      {/* Create Room */}
      <Btn onClick={createRoom} disabled={loading} style={{ marginBottom: 12 }}>
        {loading ? "جاري الإنشاء..." : "🏠 أنشئ غرفة"}
      </Btn>

      {/* Join Room */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>أو ادخل غرفة بكود</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={5}
            placeholder="XXXXX"
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            style={{
              flex: 1, padding: 14, background: "rgba(255,255,255,0.05)",
              border: `1px solid ${C.border}`, borderRadius: 10, color: "#fff",
              fontSize: 20, fontFamily: "'Courier New',monospace", textAlign: "center",
              outline: "none", letterSpacing: 6, direction: "ltr",
            }}
          />
          <Btn color={C.gold} onClick={joinRoom} full={false} disabled={loading || joinCode.trim().length !== 5} style={{ padding: "14px 24px" }}>ادخل</Btn>
        </div>
      </Card>

      {error && <div style={{ textAlign: "center", color: C.red, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>❌ {error}</div>}

      {/* Games List */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.muted }}>🎮 الألعاب المتاحة</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {HUB_GAMES.map((g, i) => (
          <Card key={g.id} style={{
            padding: 14, display: "flex", gap: 12, alignItems: "center",
            animation: `su 0.4s ${i * 0.08}s backwards`,
            border: `1px solid ${g.color}35`, background: `${g.color}06`,
          }}>
            <div style={{ fontSize: 28, flexShrink: 0, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", background: `${g.color}12`, borderRadius: 10 }}>{g.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: g.color }}>{g.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{g.desc}</div>
              <span style={{ fontSize: 10, color: C.muted }}>👥 {g.players}</span>
            </div>
            <Badge color={C.green}>🟢</Badge>
          </Card>
        ))}
      </div>

      <Btn dark onClick={onMatchHistory} style={{ marginTop: 16 }}>📜 سجل المباريات</Btn>
      <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: "rgba(255,255,255,0.1)" }}>🎮 GAME ZONE v3.0</div>
    </div>
  );
}
