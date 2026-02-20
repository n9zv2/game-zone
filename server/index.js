import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  createSession,
  getSession,
  updateSession,
} from "./sessionManager.js";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  kickPlayer,
  setPlayerSocket,
  disconnectPlayer,
  startGame,
  getPublicPlayers,
  initSessionLookup,
} from "./roomManager.js";
import {
  startPyramid,
  handlePyramidAnswer,
  handleLifeline,
  updatePyramidSocket,
} from "./games/pyramid.js";
import { startArena, handleArenaSubmit, updateArenaSocket } from "./games/arena.js";
import {
  startFitna, handleFitnaAction, handleFitnaCard, handleFitnaVote,
  handleDiscussionAction, handleSecretWordHint, handleFaceOffAnswer,
  handleNightAction, handleChatMessage,
} from "./games/fitna.js";
import {
  startSalfa, handleHint, handleVoteRequest, handleVote as handleSalfaVote,
  handleSpyGuess,
} from "./games/salfa.js";
import {
  startMutakhafy, handleMutakhafySubmit, handleMutakhafyGuess,
  handleMutakhafyFinalGuesses,
} from "./games/mutakhafy.js";

const app = express();

// Security headers (CSP configured to allow WebSocket + inline styles)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:", "https://cloud.umami.is"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "data:"],
      scriptSrc: ["'self'", "https://cloud.umami.is"],
    },
  },
}));

// Limit JSON body size
app.use(express.json({ limit: "10kb" }));

const server = createServer(app);

// CORS whitelist
const ALLOWED_ORIGINS = [
  "https://gamezon.app",
  "https://www.gamezon.app",
  "http://localhost:3000",
];
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
  },
});

// Serve static frontend in production
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, "..", "dist");
app.use(express.static(distPath));

// Wire up session lookup for roomManager
initSessionLookup(getSession);

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Valid game types for room:start-game
const VALID_GAME_TYPES = ["pyramid", "arena", "fitna", "salfa", "mutakhafy"];

io.on("connection", (socket) => {
  let currentToken = null;
  let currentRoom = null;

  // --- Rate limiting: 30 events/second per socket ---
  let eventCount = 0;
  const rateLimitInterval = setInterval(() => { eventCount = 0; }, 1000);
  socket.use((_event, next) => {
    eventCount++;
    if (eventCount > 30) {
      clearInterval(rateLimitInterval);
      return socket.disconnect(true);
    }
    next();
  });
  socket.on("disconnect", () => clearInterval(rateLimitInterval));

  // --- Input helpers ---
  function sanitizeName(name) {
    return typeof name === "string" ? name.trim().slice(0, 20) : "";
  }
  function sanitizeAvatar(avatar) {
    return typeof avatar === "string" ? [...avatar].slice(0, 2).join("") : "";
  }
  function sanitizeText(text, maxLen = 200) {
    return typeof text === "string" ? text.trim().slice(0, maxLen) : "";
  }
  function isValidRoomCode(code) {
    return typeof code === "string" && /^[A-Z0-9]{5}$/i.test(code);
  }

  // Session
  socket.on("session:create", ({ name, avatar }, cb) => {
    name = sanitizeName(name);
    avatar = sanitizeAvatar(avatar);
    if (!name) return cb?.({ error: "الاسم مطلوب" });
    const session = createSession(name, avatar);
    currentToken = session.token;
    cb?.({ token: session.token, session });
  });

  socket.on("session:get", ({ token }, cb) => {
    const session = getSession(token);
    if (session) currentToken = token;
    cb?.({ session });
  });

  socket.on("session:update", ({ token, name, avatar }, cb) => {
    name = sanitizeName(name);
    avatar = sanitizeAvatar(avatar);
    if (!name) return cb?.({ error: "الاسم مطلوب" });
    const session = updateSession(token, { name, avatar });
    cb?.({ session });
  });

  // Room
  socket.on("room:create", ({ token }, cb) => {
    const session = getSession(token);
    if (!session) return cb?.({ error: "جلسة غير صالحة" });

    const room = createRoom(token, session.name, session.avatar);
    setPlayerSocket(room.code, token, socket.id);
    socket.join(`room:${room.code}`);
    currentRoom = room.code;
    currentToken = token;
    cb?.({ code: room.code, players: getPublicPlayers(room) });
  });

  socket.on("room:join", ({ token, code }, cb) => {
    if (!isValidRoomCode(code)) return cb?.({ error: "رمز الغرفة غير صالح" });
    const session = getSession(token);
    if (!session) return cb?.({ error: "جلسة غير صالحة" });

    const result = joinRoom(code, token, session.name, session.avatar);
    if (result.error) return cb?.({ error: result.error });

    setPlayerSocket(code, token, socket.id);
    socket.join(`room:${code}`);
    currentRoom = code;
    currentToken = token;

    const players = getPublicPlayers(result.room);
    cb?.({ code, players });

    // Broadcast to other players
    socket.to(`room:${code}`).emit("room:player-joined", {
      players,
      newPlayer: { token, name: session.name, avatar: session.avatar },
    });
  });

  socket.on("room:leave", ({ token, code }, cb) => {
    const result = leaveRoom(code, token);
    socket.leave(`room:${code}`);
    currentRoom = null;

    if (result && !result.deleted) {
      const players = getPublicPlayers(result.room);
      io.to(`room:${code}`).emit("room:player-left", {
        players,
        leftToken: token,
        newHost: result.newHost,
      });
    }
    cb?.({ ok: true });
  });

  socket.on("room:kick", ({ token, code, targetToken }, cb) => {
    const result = kickPlayer(code, token, targetToken);
    if (result.error) return cb?.({ error: result.error });

    const players = getPublicPlayers(result.room);
    io.to(`room:${code}`).emit("room:player-kicked", {
      players,
      kickedToken: targetToken,
    });
    cb?.({ ok: true });
  });

  // Solo mode — create room, mark solo, start pyramid after client is ready
  socket.on("room:solo-start", ({ token }, cb) => {
    const session = getSession(token);
    if (!session) return cb?.({ error: "جلسة غير صالحة" });

    const room = createRoom(token, session.name, session.avatar);
    room.solo = true;
    setPlayerSocket(room.code, token, socket.id);
    socket.join(`room:${room.code}`);
    currentRoom = room.code;
    currentToken = token;

    const result = startGame(room.code, token, "pyramid");
    if (result.error) return cb?.({ error: result.error });

    // Send room code first so client navigates to pyramid screen
    cb?.({ code: room.code });

    // Delay start so PyramidGame component mounts and listens for events
    setTimeout(() => {
      startPyramid(io, room);
    }, 600);
  });

  socket.on("room:start-game", ({ token, code, gameType, settings }, cb) => {
    if (!VALID_GAME_TYPES.includes(gameType)) return cb?.({ error: "نوع لعبة غير صالح" });
    const result = startGame(code, token, gameType);
    if (result.error) return cb?.({ error: result.error });

    const room = result.room;
    io.to(`room:${code}`).emit("room:game-starting", {
      gameType,
      players: getPublicPlayers(room),
    });

    // Start the appropriate game after a short delay
    setTimeout(() => {
      if (gameType === "pyramid") {
        startPyramid(io, room);
      } else if (gameType === "arena") {
        startArena(io, room);
      } else if (gameType === "fitna") {
        startFitna(io, room, settings || {});
      } else if (gameType === "salfa") {
        startSalfa(io, room, settings || {});
      } else if (gameType === "mutakhafy") {
        startMutakhafy(io, room, settings || {});
      }
    }, 500);

    cb?.({ ok: true });
  });

  // Pyramid events
  socket.on("pyramid:answer", (data) => {
    handlePyramidAnswer(io, socket, data);
  });

  socket.on("pyramid:lifeline", (data) => {
    handleLifeline(io, socket, data);
  });

  // Arena events
  socket.on("arena:submit", (data) => {
    handleArenaSubmit(io, socket, data);
  });

  // Fitna events
  socket.on("fitna:action", (data) => {
    handleFitnaAction(io, socket, data);
  });

  socket.on("fitna:card", (data) => {
    handleFitnaCard(io, socket, data);
  });

  socket.on("fitna:vote", (data) => {
    handleFitnaVote(io, socket, data);
  });

  socket.on("fitna:discussion-action", (data) => {
    handleDiscussionAction(io, socket, data);
  });

  socket.on("fitna:chat-message", (data) => {
    if (data && typeof data.message === "string") data.message = sanitizeText(data.message);
    handleChatMessage(io, socket, data);
  });

  socket.on("fitna:secret-word-hint", (data) => {
    handleSecretWordHint(io, socket, data);
  });

  socket.on("fitna:face-off-answer", (data) => {
    handleFaceOffAnswer(io, socket, data);
  });

  socket.on("fitna:night-action", (data) => {
    handleNightAction(io, socket, data);
  });

  // Salfa events
  socket.on("salfa:hint", (data) => {
    if (data && typeof data.hint === "string") data.hint = sanitizeText(data.hint, 100);
    handleHint(io, socket, data);
  });

  socket.on("salfa:vote-request", (data) => {
    handleVoteRequest(io, socket, data);
  });

  socket.on("salfa:vote", (data) => {
    handleSalfaVote(io, socket, data);
  });

  socket.on("salfa:spy-guess", (data) => {
    handleSpyGuess(io, socket, data);
  });

  // Mutakhafy events
  socket.on("mutakhafy:submit", (data) => {
    handleMutakhafySubmit(io, socket, data);
  });

  socket.on("mutakhafy:guess", (data) => {
    handleMutakhafyGuess(io, socket, data);
  });

  socket.on("mutakhafy:final-guesses", (data) => {
    handleMutakhafyFinalGuesses(io, socket, data);
  });

  // Reactions
  socket.on("reaction:send", ({ roomCode, token, emoji }) => {
    if (!roomCode || !emoji) return;
    socket.to(`room:${roomCode}`).emit("reaction:receive", { token, emoji });
  });

  // Reconnection
  socket.on("room:rejoin", ({ token, code }, cb) => {
    const room = getRoom(code);
    if (!room) return cb?.({ error: "الغرفة غير موجودة" });

    const player = room.players.find((p) => p.token === token);
    if (!player) return cb?.({ error: "أنت لست في هذه الغرفة" });

    player.connected = true;
    player.socketId = socket.id;
    socket.join(`room:${code}`);
    currentRoom = code;
    currentToken = token;

    // Update socketId in active game so player receives game events
    if (room.status === "playing") {
      if (room.gameType === "pyramid") updatePyramidSocket(code, token, socket.id);
      if (room.gameType === "arena") updateArenaSocket(code, token, socket.id);
    }

    const players = getPublicPlayers(room);
    cb?.({
      code,
      players,
      status: room.status,
      gameType: room.gameType,
      isHost: player.isHost,
    });

    socket.to(`room:${code}`).emit("room:player-reconnected", {
      players,
      token,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    const result = disconnectPlayer(socket.id);
    if (result) {
      const { code, room, player } = result;
      const players = getPublicPlayers(room);

      // Check if host left and was transferred
      if (player.isHost) {
        const newHost = room.players.find((p) => p.connected && p.isHost);
        io.to(`room:${code}`).emit("room:player-left", {
          players,
          leftToken: player.token,
          newHost: newHost?.token || null,
        });
      } else {
        io.to(`room:${code}`).emit("room:player-disconnected", {
          players,
          token: player.token,
        });
      }
    }
  });
});

// SPA fallback — serve index.html for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 Game Zone server running on port ${PORT}`);
});
