import { useState, useEffect, useCallback } from "react";
import { C, CSS } from "./theme.js";
import socket from "./socket.js";
import * as session from "./session.js";
import IdentitySetup from "./screens/IdentitySetup.jsx";
import Landing from "./screens/Landing.jsx";
import Lobby from "./screens/Lobby.jsx";
import PyramidGame from "./screens/pyramid/PyramidGame.jsx";
import ArenaGame from "./screens/arena/ArenaGame.jsx";
import SalfaGame from "./screens/salfa/SalfaGame.jsx";
import CodenamesGame from "./screens/codenames/CodenamesGame.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import MatchHistory from "./screens/MatchHistory.jsx";
import LevelUpOverlay from "./components/LevelUpOverlay.jsx";

export default function GameZone() {
  // Screen: identity | landing | lobby | pyramid | arena | salfa | codenames | dashboard | match-history
  const [screen, setScreen] = useState("loading");
  const [token, setToken] = useState(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [gameType, setGameType] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [xpData, setXpData] = useState(null);
  const [levelUpLevel, setLevelUpLevel] = useState(null);
  const [soloMode, setSoloMode] = useState(false);

  // Emit with timeout — if callback doesn't fire within ms, resolve with fallback
  const emitWithTimeout = useCallback((event, data, ms = 5000) => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      socket.emit(event, data, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
    });
  }, []);

  // Initialize: connect socket, check session
  useEffect(() => {
    socket.connect();

    // Safety: if still loading after 8 seconds, force out
    const loadingSafety = setTimeout(() => {
      setScreen((prev) => {
        if (prev === "loading") {
          const hasId = session.getToken() && session.getName();
          return hasId ? "landing" : "identity";
        }
        return prev;
      });
    }, 8000);

    socket.on("connect", async () => {
      setConnectionError(false);
      const savedToken = session.getToken();
      const savedName = session.getName();
      const savedAvatar = session.getAvatar();

      if (savedToken && savedName && savedAvatar) {
        // Validate session with server (5s timeout)
        const res = await emitWithTimeout("session:get", { token: savedToken });
        if (res?.session) {
          setToken(savedToken);
          setName(savedName);
          setAvatar(savedAvatar);

          // Check if was in a room
          const savedRoom = session.getRoomCode();
          if (savedRoom) {
            const rejoinRes = await emitWithTimeout("room:rejoin", { token: savedToken, code: savedRoom });
            if (rejoinRes?.code) {
              setRoomCode(rejoinRes.code);
              setPlayers(rejoinRes.players);
              setIsHost(rejoinRes.isHost);
              if (rejoinRes.status === "playing") {
                setGameType(rejoinRes.gameType);
                setScreen(rejoinRes.gameType);
              } else {
                setScreen("lobby");
              }
            } else {
              session.setRoomCode(null);
              setScreen("landing");
            }
          } else {
            setScreen("landing");
          }
        } else {
          // Session invalid, clear and start fresh
          session.clearSession();
          setScreen("identity");
        }
      } else {
        setScreen("identity");
      }
    });

    socket.on("disconnect", () => {
      setConnectionError(true);
    });

    socket.on("connect_error", () => {
      setConnectionError(true);
    });

    socket.on("session:xp-update", (data) => {
      setXpData(data);
      if (data.leveledUp) {
        setLevelUpLevel(data.level);
      }
    });

    return () => {
      clearTimeout(loadingSafety);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("session:xp-update");
    };
  }, []);

  const handleIdentityDone = useCallback((tok, n, av) => {
    session.setToken(tok);
    session.setName(n);
    session.setAvatar(av);
    setToken(tok);
    setName(n);
    setAvatar(av);
    setScreen("landing");
  }, []);

  const handleRoom = useCallback((code, playerList, host) => {
    setRoomCode(code);
    setPlayers(playerList);
    setIsHost(host);
    session.setRoomCode(code);
    setScreen("lobby");
  }, []);

  const handleSoloPlay = useCallback(() => {
    socket.emit("room:solo-start", { token }, (res) => {
      if (res?.error) return;
      if (res?.code) {
        setRoomCode(res.code);
        setGameType("pyramid");
        setSoloMode(true);
        session.setRoomCode(res.code);
        setScreen("pyramid");
      }
    });
  }, [token]);

  const handleLeaveRoom = useCallback(() => {
    setRoomCode(null);
    setPlayers([]);
    setIsHost(false);
    session.setRoomCode(null);
    setScreen("landing");
  }, []);

  const handleGameStart = useCallback((type, playerList) => {
    setGameType(type);
    setPlayers(playerList);
    setScreen(type);
  }, []);

  const handleLeaveGame = useCallback(() => {
    socket.emit("room:leave", { token, code: roomCode });
    setRoomCode(null);
    setPlayers([]);
    setIsHost(false);
    setGameType(null);
    setSoloMode(false);
    session.setRoomCode(null);
    setScreen("landing");
  }, [token, roomCode]);

  const handleGameFinish = useCallback((gameRankings) => {
    // Solo pyramid — skip dashboard, go to landing
    if (!gameRankings && soloMode) {
      setSoloMode(false);
      setGameType(null);
      session.setRoomCode(null);
      setRoomCode(null);
      setScreen("landing");
      return;
    }
    setRankings(gameRankings);
    setScreen("dashboard");
  }, [soloMode]);

  const handlePlayAgain = useCallback(() => {
    setRankings(null);
    setGameType(null);
    // Solo mode — go straight back to landing
    if (soloMode) {
      setSoloMode(false);
      session.setRoomCode(null);
      setRoomCode(null);
      setScreen("landing");
      return;
    }
    // Go back to lobby if still in room
    if (roomCode) {
      socket.emit("room:rejoin", { token, code: roomCode }, (res) => {
        if (res?.code) {
          setPlayers(res.players);
          setIsHost(res.isHost);
          setScreen("lobby");
        } else {
          session.setRoomCode(null);
          setRoomCode(null);
          setScreen("landing");
        }
      });
    } else {
      setScreen("landing");
    }
  }, [roomCode, token, soloMode]);

  const renderScreen = () => {
    switch (screen) {
      case "loading":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
            <div style={{ fontSize: 60, animation: "pulse 1.5s infinite" }}>🎮</div>
            <div style={{ fontSize: 16, color: C.muted, marginTop: 12 }}>
              {connectionError ? "فشل الاتصال..." : "جاري الاتصال..."}
            </div>
            {connectionError && (
              <button onClick={() => { socket.connect(); setConnectionError(false); }} style={{
                marginTop: 16, padding: "10px 24px", borderRadius: 10, border: `1px solid ${C.green}`,
                background: `${C.green}20`, color: C.green, fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>🔄 إعادة المحاولة</button>
            )}
          </div>
        );
      case "identity":
        return <IdentitySetup onDone={handleIdentityDone} />;
      case "landing":
        return <Landing token={token} name={name} avatar={avatar} onRoom={handleRoom} onSoloPlay={handleSoloPlay} onMatchHistory={() => setScreen("match-history")} />;
      case "match-history":
        return <MatchHistory onBack={() => setScreen("landing")} />;
      case "lobby":
        return (
          <Lobby
            token={token}
            roomCode={roomCode}
            initialPlayers={players}
            isHost={isHost}
            onLeave={handleLeaveRoom}
            onGameStart={handleGameStart}
          />
        );
      case "pyramid":
        return <PyramidGame token={token} roomCode={roomCode} onFinish={handleGameFinish} onLeave={handleLeaveGame} />;
      case "arena":
        return <ArenaGame token={token} roomCode={roomCode} onFinish={handleGameFinish} onLeave={handleLeaveGame} />;
      case "salfa":
        return <SalfaGame token={token} roomCode={roomCode} onFinish={handleGameFinish} onLeave={handleLeaveGame} />;
      case "codenames":
        return <CodenamesGame token={token} roomCode={roomCode} onFinish={handleGameFinish} onLeave={handleLeaveGame} />;
      case "dashboard":
        return <Dashboard token={token} rankings={rankings} gameType={gameType} onPlayAgain={handlePlayAgain} xpData={xpData} />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(145deg, ${C.bg1} 0%, ${C.bg2} 40%, ${C.bg3} 70%, ${C.bg1} 100%)`,
      color: "#fff",
      fontFamily: "'Segoe UI',Tahoma,sans-serif",
      direction: "rtl",
    }}>
      <div className="app-container">
        {connectionError && (
          <div style={{
            background: `${C.red}15`, border: `1px solid ${C.red}30`, borderRadius: 10,
            padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 13, color: C.red, fontWeight: 700 }}>انقطع الاتصال — جاري إعادة الاتصال...</span>
          </div>
        )}
        {renderScreen()}
      </div>
      {levelUpLevel && (
        <LevelUpOverlay level={levelUpLevel} onDone={() => setLevelUpLevel(null)} />
      )}
      <style>{CSS}</style>
    </div>
  );
}
