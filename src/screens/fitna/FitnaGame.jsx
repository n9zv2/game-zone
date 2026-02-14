import { useState, useCallback } from "react";
import useSocket from "../../hooks/useSocket.js";
import FitnaRoleReveal from "./FitnaRoleReveal.jsx";
import FitnaLoyaltyTest from "./FitnaLoyaltyTest.jsx";
import FitnaFaceOff from "./FitnaFaceOff.jsx";
import FitnaSecretWord from "./FitnaSecretWord.jsx";
import FitnaResults from "./FitnaResults.jsx";
import FitnaDiscussion from "./FitnaDiscussion.jsx";
import FitnaCards from "./FitnaCards.jsx";
import FitnaVoting from "./FitnaVoting.jsx";
import FitnaElimination from "./FitnaElimination.jsx";
import FitnaNight from "./FitnaNight.jsx";
import FitnaGameOver from "./FitnaGameOver.jsx";
import { C } from "../../theme.js";

export default function FitnaGame({ token, roomCode, onFinish }) {
  const [phase, setPhase] = useState("waiting");
  const [countdown, setCountdown] = useState(3);
  const [players, setPlayers] = useState([]);
  const [totalRounds, setTotalRounds] = useState(5);
  const [roleData, setRoleData] = useState(null);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [faceOffData, setFaceOffData] = useState(null);
  const [secretWordData, setSecretWordData] = useState(null);
  const [secretWordHints, setSecretWordHints] = useState([]);
  const [resultsData, setResultsData] = useState(null);
  const [discussionData, setDiscussionData] = useState(null);
  const [discussionMessages, setDiscussionMessages] = useState([]);
  const [cardPhaseData, setCardPhaseData] = useState(null);
  const [cardEffects, setCardEffects] = useState([]);
  const [votePhaseData, setVotePhaseData] = useState(null);
  const [voteResults, setVoteResults] = useState(null);
  const [eliminationData, setEliminationData] = useState(null);
  const [nightData, setNightData] = useState(null);
  const [nightInvestigateResults, setNightInvestigateResults] = useState([]);
  const [morningData, setMorningData] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);
  const [myCard, setMyCard] = useState(null);

  useSocket("fitna:start", useCallback((data) => {
    setPlayers(data.players);
    setTotalRounds(data.totalRounds);
    setPhase("countdown");
  }, []));

  useSocket("fitna:countdown", useCallback((data) => {
    setCountdown(data.count);
  }, []));

  useSocket("fitna:role-reveal", useCallback((data) => {
    setRoleData(data);
    setPhase("role-reveal");
  }, []));

  // Loyalty Test activity
  useSocket("fitna:loyalty-test", useCallback((data) => {
    setLoyaltyData(data);
    setPhase("loyalty-test");
  }, []));

  // Face-Off activity
  useSocket("fitna:face-off", useCallback((data) => {
    setFaceOffData(data);
    setPhase("face-off");
  }, []));

  // Secret Word activity
  useSocket("fitna:secret-word", useCallback((data) => {
    setSecretWordData(data);
    setSecretWordHints([]);
    setPhase("secret-word");
  }, []));

  useSocket("fitna:secret-word-hint", useCallback((data) => {
    setSecretWordHints((prev) => [...prev, data]);
  }, []));

  // Results (all activity types)
  useSocket("fitna:activity-results", useCallback((data) => {
    setResultsData(data);
    setPhase("results");
  }, []));

  // Discussion
  useSocket("fitna:discussion", useCallback((data) => {
    setDiscussionData(data);
    setDiscussionMessages([]);
    setPhase("discussion");
  }, []));

  useSocket("fitna:discussion-message", useCallback((data) => {
    setDiscussionMessages((prev) => [...prev, data]);
  }, []));

  // Cards
  useSocket("fitna:card-phase", useCallback((data) => {
    setCardPhaseData(data);
    setMyCard(data.card);
    setPhase("cards");
  }, []));

  useSocket("fitna:card-played", useCallback(() => {
    setMyCard(null);
  }, []));

  useSocket("fitna:card-results", useCallback((data) => {
    setCardEffects(data.effects);
    setPhase("card-effects");
  }, []));

  // Voting
  useSocket("fitna:vote-phase", useCallback((data) => {
    setVotePhaseData(data);
    setPhase("voting");
  }, []));

  useSocket("fitna:vote-results", useCallback((data) => {
    setVoteResults(data);
    setPhase("vote-results");
  }, []));

  // Elimination
  useSocket("fitna:elimination", useCallback((data) => {
    setEliminationData(data);
    setPhase("elimination");
  }, []));

  // Night phase
  useSocket("fitna:night", useCallback((data) => {
    setNightData(data);
    setNightInvestigateResults([]);
    setPhase("night");
  }, []));

  useSocket("fitna:night-action-confirmed", useCallback(() => {
    // Action confirmed
  }, []));

  useSocket("fitna:investigate-result", useCallback((data) => {
    setNightInvestigateResults((prev) => [...prev, data]);
  }, []));

  // Morning
  useSocket("fitna:morning", useCallback((data) => {
    setMorningData(data);
    setPhase("morning");
  }, []));

  // Card dealt between rounds
  useSocket("fitna:card-dealt", useCallback((data) => {
    setMyCard(data.card);
  }, []));

  // Game over
  useSocket("fitna:game-over", useCallback((data) => {
    setGameOverData(data);
    setPhase("game-over");
  }, []));

  const renderPhase = () => {
    if (phase === "waiting") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: 60, animation: "pulse 1.5s infinite" }}>🎭</div>
          <div style={{ fontSize: 16, color: C.muted, marginTop: 12 }}>جاري تحميل اللعبة...</div>
        </div>
      );
    }

    if (phase === "countdown") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <div style={{ fontSize: "min(120px, 25vw)", fontWeight: 900, color: C.purple, fontFamily: "'Courier New',monospace", animation: "pulse 0.8s infinite", textShadow: `0 0 60px ${C.purple}50` }}>{countdown || "🎭"}</div>
          <div style={{ fontSize: 18, color: C.muted, marginTop: 16 }}>{countdown > 0 ? "استعد..." : "يلا!"}</div>
          <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.purple }}>{players.length}</div>
              <div style={{ fontSize: 10, color: C.muted }}>لاعب</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.red }}>{totalRounds}</div>
              <div style={{ fontSize: 10, color: C.muted }}>جولة</div>
            </div>
          </div>
        </div>
      );
    }

    if (phase === "role-reveal" && roleData) {
      return <FitnaRoleReveal data={roleData} />;
    }

    if (phase === "loyalty-test" && loyaltyData) {
      return <FitnaLoyaltyTest data={loyaltyData} token={token} roomCode={roomCode} />;
    }

    if (phase === "face-off" && faceOffData) {
      return <FitnaFaceOff data={faceOffData} token={token} roomCode={roomCode} />;
    }

    if (phase === "secret-word" && secretWordData) {
      return <FitnaSecretWord data={secretWordData} token={token} roomCode={roomCode} hints={secretWordHints} />;
    }

    if (phase === "results" && resultsData) {
      return <FitnaResults data={resultsData} token={token} />;
    }

    if (phase === "discussion" && discussionData) {
      return <FitnaDiscussion data={discussionData} token={token} roomCode={roomCode} messages={discussionMessages} />;
    }

    if (phase === "cards" && cardPhaseData) {
      return <FitnaCards card={myCard} data={cardPhaseData} token={token} roomCode={roomCode} />;
    }

    if (phase === "card-effects") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🃏</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.purple, marginBottom: 20 }}>تأثيرات الكروت</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            {cardEffects.map((e, i) => (
              <div key={i} style={{ background: `${C.purple}12`, border: `1px solid ${C.purple}30`, borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 10, animation: `su 0.3s ${i * 0.1}s backwards` }}>
                <span style={{ fontSize: 22 }}>{e.icon}</span>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{e.desc}</span>
              </div>
            ))}
            {cardEffects.length === 0 && (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 14 }}>لا أحد لعب كرت هالجولة</div>
            )}
          </div>
        </div>
      );
    }

    if (phase === "voting" && votePhaseData) {
      return <FitnaVoting data={votePhaseData} token={token} roomCode={roomCode} />;
    }

    if (phase === "vote-results" && voteResults) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🗳️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.purple, marginBottom: 20 }}>
            {voteResults.tied ? "تعادل! لا أحد يُطرد" : "نتيجة التصويت"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {voteResults.votes.sort((a, b) => b.votesReceived - a.votesReceived).map((v, i) => (
              <div key={i} style={{
                background: v.token === voteResults.eliminatedToken ? `${C.red}15` : `rgba(255,255,255,0.03)`,
                border: `1px solid ${v.token === voteResults.eliminatedToken ? C.red : C.border}`,
                borderRadius: 10, padding: "8px 12px",
                display: "flex", alignItems: "center", gap: 8,
                animation: `su 0.3s ${i * 0.05}s backwards`,
              }}>
                <span style={{ fontSize: 20 }}>{v.avatar}</span>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1, color: v.token === voteResults.eliminatedToken ? C.red : C.text }}>{v.name}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: v.votesReceived > 0 ? C.red : C.muted }}>{v.votesReceived} 🗳️</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (phase === "elimination" && eliminationData) {
      return <FitnaElimination data={eliminationData} />;
    }

    if (phase === "night" && nightData) {
      return <FitnaNight data={nightData} token={token} roomCode={roomCode} investigateResults={nightInvestigateResults} />;
    }

    if (phase === "morning" && morningData) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: "su 0.5s ease" }}>☀️</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, marginBottom: 16 }}>صباح جديد</div>
          {morningData.killed ? (
            <div style={{ textAlign: "center", animation: "su 0.5s 0.3s backwards" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{morningData.victimAvatar}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>
                تم اكتشاف جثة {morningData.victimName}! 💀
              </div>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>
                كان {morningData.victimRole === "saboteur" ? "خائن 🔥" : morningData.victimRole === "detective" ? "محقق 🔍" : "بريء 😇"}
              </div>
            </div>
          ) : morningData.shielded ? (
            <div style={{ textAlign: "center", animation: "su 0.5s 0.3s backwards" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.cyan }}>
                {morningData.shieldedName} نجا من القتل الليلي!
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>الدرع حماه</div>
            </div>
          ) : (
            <div style={{ textAlign: "center", animation: "su 0.5s 0.3s backwards" }}>
              <div style={{ fontSize: 16, color: C.muted }}>ليلة هادئة... لا أحد مات 😴</div>
            </div>
          )}
        </div>
      );
    }

    if (phase === "game-over" && gameOverData) {
      return <FitnaGameOver data={gameOverData} token={token} onFinish={onFinish} />;
    }

    return null;
  };

  return <div>{renderPhase()}</div>;
}
