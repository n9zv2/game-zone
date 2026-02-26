import { useEffect, useRef } from "react";
import { C } from "../theme.js";
import Card from "../components/ui/Card.jsx";
import Btn from "../components/ui/Btn.jsx";
import Confetti from "../components/ui/Confetti.jsx";
import { addMatch } from "../session.js";
import { shareResult } from "../utils/shareResult.js";

export default function Dashboard({ token, rankings, gameType, onPlayAgain, xpData }) {
  if (!rankings || rankings.length === 0) {
    return (
      <div style={{ textAlign: "center", paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>📊</div>
        <p style={{ color: C.muted }}>لا توجد نتائج</p>
        <Btn onClick={onPlayAgain}>🏠 رجوع</Btn>
      </div>
    );
  }

  const myRank = rankings.find((r) => r.token === token);
  const isChamp = rankings[0]?.token === token;
  const totalScore = rankings.reduce((s, p) => s + p.score, 0);
  const saved = useRef(false);

  useEffect(() => {
    if (!saved.current && myRank) {
      saved.current = true;
      addMatch({
        gameType,
        rank: myRank.rank,
        score: myRank.score,
        totalPlayers: rankings.length,
        alive: myRank.alive,
      });
    }
  }, [myRank, gameType, rankings]);

  return (
    <div style={{ paddingTop: 16, animation: "fadeIn 0.3s ease" }}>
      <Confetti show={isChamp} />

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>نتائج {gameType === "pyramid" ? "🔺 الهرم" : gameType === "arena" ? "⚔️ الحلبة" : gameType === "salfa" ? "🕵️ مين برا السالفة" : gameType === "codenames" ? "🔤 كلمات سرية" : "🎮 اللعبة"}</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, background: `linear-gradient(135deg, ${C.green}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>لوحة النتائج</h1>
      </div>

      {/* Podium */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 8, marginBottom: 24 }}>
        {[1, 0, 2].map((idx) => {
          const p = rankings[idx];
          if (!p) return null;
          const heights = { 0: 130, 1: 100, 2: 80 };
          const colors = { 0: C.gold, 1: "#C0C0C0", 2: "#CD7F32" };
          const medals = { 0: "🥇", 1: "🥈", 2: "🥉" };
          return (
            <div key={p.token} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, animation: `su 0.5s ${idx * 0.15}s backwards`, flex: "1 1 0", maxWidth: 120 }}>
              {idx === 0 && <div style={{ fontSize: 24, animation: "pulse 1.5s infinite" }}>👑</div>}
              <span style={{ fontSize: "min(32px, 8vw)" }}>{p.avatar}</span>
              <span style={{ fontSize: "min(12px, 3vw)", fontWeight: 700, color: p.token === token ? C.green : "#fff", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <div style={{
                width: "100%", maxWidth: 80, height: heights[idx], borderRadius: "10px 10px 0 0",
                background: `${colors[idx]}15`, border: `1px solid ${colors[idx]}30`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <div style={{ fontSize: 22 }}>{medals[idx]}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: colors[idx] }}>{p.score}</div>
                <div style={{ fontSize: 9, color: C.muted }}>نقطة</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* My Stats */}
      {myRank && (
        <Card glow color={isChamp ? C.gold : C.green} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.gold }}>#{myRank.rank}</div>
              <div style={{ fontSize: 10, color: C.muted }}>ترتيبك</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.05)" }} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.green }}>{myRank.score}</div>
              <div style={{ fontSize: 10, color: C.muted }}>نقاطك</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.05)" }} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: myRank.alive ? C.green : C.red }}>{myRank.alive ? "✅" : "💀"}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{myRank.alive ? "نجوت" : "طلعت"}</div>
            </div>
          </div>
        </Card>
      )}

      {/* XP & Level */}
      {xpData && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 10, textAlign: "center" }}>⭐ المستوى و XP</div>
          <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.purple }}>Lv.{xpData.level}</div>
              <div style={{ fontSize: 10, color: C.muted }}>المستوى</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.05)" }} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.cyan }}>{xpData.xp}</div>
              <div style={{ fontSize: 10, color: C.muted }}>XP الكلي</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.05)" }} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.green }}>+{xpData.xpGain}</div>
              <div style={{ fontSize: 10, color: C.muted }}>XP هذه المباراة</div>
            </div>
          </div>
        </Card>
      )}

      {/* Full Rankings */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 10, textAlign: "center" }}>🏆 الترتيب الكامل</div>
        {rankings.map((p) => (
          <div key={p.token} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
            opacity: p.alive ? 1 : 0.5,
          }}>
            <span style={{
              fontSize: 13, fontWeight: 900, width: 28, textAlign: "center",
              color: p.rank === 1 ? C.gold : p.rank === 2 ? "#C0C0C0" : p.rank === 3 ? "#CD7F32" : C.muted,
            }}>#{p.rank}</span>
            <span style={{ fontSize: 20 }}>{p.avatar}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: p.token === token ? C.green : "#fff" }}>
              {p.name} {p.token === token && "(أنت)"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{p.score} ⭐</span>
          </div>
        ))}
      </Card>

      {/* Stats */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 10, textAlign: "center" }}>📊 إحصائيات الجلسة</div>
        <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.green }}>{rankings.length}</div>
            <div style={{ fontSize: 10, color: C.muted }}>لاعبين</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.gold }}>{totalScore}</div>
            <div style={{ fontSize: 10, color: C.muted }}>مجموع النقاط</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.orange }}>{rankings.filter((p) => p.alive).length}</div>
            <div style={{ fontSize: 10, color: C.muted }}>نجوا</div>
          </div>
        </div>
      </Card>

      {myRank && (
        <Btn color={C.purple} onClick={() => shareResult({
          name: myRank.name || "لاعب",
          avatar: myRank.avatar || "🎮",
          rank: myRank.rank,
          score: myRank.score,
          totalPlayers: rankings.length,
          gameType,
        })} style={{ marginBottom: 10 }}>📤 شارك نتيجتك</Btn>
      )}
      <Btn color={C.green} onClick={onPlayAgain}>🔄 العب مرة ثانية</Btn>
    </div>
  );
}
