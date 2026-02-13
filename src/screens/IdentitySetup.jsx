import { useState } from "react";
import { C } from "../theme.js";
import Btn from "../components/ui/Btn.jsx";
import Card from "../components/ui/Card.jsx";
import socket from "../socket.js";

const AVATARS = ["🎮","🦁","🐺","🦊","🐉","🦈","🐅","🦂","🎯","💎","👑","⚡","🔥","⭐","🌙","💜","🕹️","🏆","🌸","🦋","🎭","🌑","🧊","🎪"];

export default function IdentitySetup({ onDone }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDone = () => {
    if (!name.trim() || !avatar) return;
    setLoading(true);
    socket.emit("session:create", { name: name.trim(), avatar }, (res) => {
      setLoading(false);
      if (res?.token) {
        onDone(res.token, name.trim(), avatar);
      }
    });
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>🎮</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px", background: `linear-gradient(135deg, ${C.green}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>أهلاً بك في قيم زون!</h1>
        <p style={{ color: C.muted, fontSize: 13 }}>اختر اسمك وأفاتارك</p>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>اسمك</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="اكتب اسمك..."
          style={{
            width: "100%", padding: 14, background: "rgba(255,255,255,0.05)",
            border: `1px solid ${C.border}`, borderRadius: 10, color: "#fff",
            fontSize: 16, fontFamily: "inherit", textAlign: "center", outline: "none", direction: "rtl",
          }}
        />
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>اختر أفاتار</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {AVATARS.map((av) => (
            <button key={av} onClick={() => setAvatar(av)} style={{
              fontSize: 26, width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
              background: avatar === av ? `${C.green}20` : "rgba(255,255,255,0.04)",
              border: avatar === av ? `2px solid ${C.green}` : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
              transform: avatar === av ? "scale(1.1)" : "scale(1)",
            }}>{av}</button>
          ))}
        </div>
      </Card>

      <Btn onClick={handleDone} disabled={!name.trim() || !avatar || loading}>
        {loading ? "جاري التسجيل..." : "🚀 يلا نبدأ!"}
      </Btn>
    </div>
  );
}
