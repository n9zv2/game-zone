import express from "express";
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
} from "./games/pyramid.js";
import { startArena, handleArenaSubmit } from "./games/arena.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Serve static frontend in production
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, "..", "dist");
app.use(express.static(distPath));

// Wire up session lookup for roomManager
initSessionLookup(getSession);

app.get("/health", (req, res) => res.json({ status: "ok" }));

io.on("connection", (socket) => {
  let currentToken = null;
  let currentRoom = null;

  // Session
  socket.on("session:create", ({ name, avatar }, cb) => {
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

  socket.on("room:start-game", ({ token, code, gameType }, cb) => {
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
