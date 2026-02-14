import { genCode } from "./utils.js";

// In-memory room store
const rooms = new Map();

export function createRoom(hostToken, hostName, hostAvatar) {
  let code = genCode();
  while (rooms.has(code)) code = genCode();

  const room = {
    code,
    hostToken: hostToken,
    status: "lobby", // lobby | playing | finished
    gameType: null,
    players: [
      {
        token: hostToken,
        name: hostName,
        avatar: hostAvatar,
        socketId: null,
        connected: true,
        isHost: true,
      },
    ],
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(code) || null;
}

export function joinRoom(code, token, name, avatar) {
  const room = rooms.get(code);
  if (!room) return { error: "الغرفة غير موجودة" };
  if (room.status !== "lobby") return { error: "اللعبة بدأت بالفعل" };
  if (room.players.length >= 20) return { error: "الغرفة ممتلئة (20 لاعب)" };

  const existing = room.players.find((p) => p.token === token);
  if (existing) {
    existing.connected = true;
    existing.name = name;
    existing.avatar = avatar;
    return { room, rejoined: true };
  }

  room.players.push({
    token,
    name,
    avatar,
    socketId: null,
    connected: true,
    isHost: false,
  });
  return { room };
}

export function leaveRoom(code, token) {
  const room = rooms.get(code);
  if (!room) return null;

  const idx = room.players.findIndex((p) => p.token === token);
  if (idx === -1) return null;

  const player = room.players[idx];

  if (room.status === "lobby") {
    room.players.splice(idx, 1);
  } else {
    player.connected = false;
  }

  // Transfer host if needed
  if (player.isHost && room.players.length > 0) {
    player.isHost = false;
    const newHost = room.players.find((p) => p.connected);
    if (newHost) {
      newHost.isHost = true;
      room.hostToken = newHost.token;
    }
  }

  if (room.players.filter((p) => p.connected).length === 0) {
    rooms.delete(code);
    return { deleted: true };
  }

  return { room, newHost: room.hostToken };
}

export function kickPlayer(code, hostToken, targetToken) {
  const room = rooms.get(code);
  if (!room) return { error: "الغرفة غير موجودة" };
  if (room.hostToken !== hostToken) return { error: "أنت لست الهوست" };

  const idx = room.players.findIndex((p) => p.token === targetToken);
  if (idx === -1) return { error: "اللاعب غير موجود" };
  if (room.players[idx].isHost) return { error: "لا يمكن طرد الهوست" };

  room.players.splice(idx, 1);
  return { room };
}

export function setPlayerSocket(code, token, socketId) {
  const room = rooms.get(code);
  if (!room) return;
  const player = room.players.find((p) => p.token === token);
  if (player) {
    player.socketId = socketId;
    player.connected = true;
  }
}

export function disconnectPlayer(socketId) {
  for (const [code, room] of rooms) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) {
      player.connected = false;
      player.socketId = null;
      return { code, room, player };
    }
  }
  return null;
}

export function startGame(code, hostToken, gameType) {
  const room = rooms.get(code);
  if (!room) return { error: "الغرفة غير موجودة" };
  if (room.hostToken !== hostToken) return { error: "أنت لست الهوست" };
  if (room.status !== "lobby") return { error: "اللعبة بدأت بالفعل" };
  if (!room.solo && room.players.filter((p) => p.connected).length < 2)
    return { error: "يجب أن يكون هناك لاعبين على الأقل" };

  room.status = "playing";
  room.gameType = gameType;
  return { room };
}

export function finishGame(code) {
  const room = rooms.get(code);
  if (!room) return;
  room.status = "lobby";
  room.gameType = null;
}

export function getPublicPlayers(room) {
  // Import lazily to avoid circular deps
  const { getSession } = require_session();
  return room.players.map((p) => {
    const sess = getSession(p.token);
    return {
      token: p.token,
      name: p.name,
      avatar: p.avatar,
      connected: p.connected,
      isHost: p.isHost,
      level: sess?.level || 1,
    };
  });
}

// Lazy loader to avoid circular import
let _getSession = null;
function require_session() {
  if (!_getSession) {
    // Dynamic import workaround - we'll pass it in via init
    return { getSession: _getSession || (() => null) };
  }
  return { getSession: _getSession };
}

export function initSessionLookup(fn) {
  _getSession = fn;
}
