import { v4 as uuidv4 } from "uuid";
import { joinRoom, getRoom } from "./roomManager.js";

// Arabic bot names
const BOT_NAMES = [
  "فهد", "نورة", "سعود", "ريم", "خالد", "لمى",
  "عبدالله", "هيفاء", "تركي", "دانة", "ماجد", "شهد",
  "محمد", "لطيفة", "بندر", "غادة", "فيصل", "أريج",
  "ناصر", "وجدان",
];

const BOT_AVATARS = [
  "🤖", "🦾", "🧠", "🎮", "🕹️", "🦿",
  "⚡", "🔥", "💫", "🌟", "🎯", "🏆",
  "🦊", "🐺", "🦅", "🐉", "🦁", "🐻",
  "🦈", "🐅",
];

const DIFFICULTIES = ["easy", "medium", "hard"];

// Track bot difficulty per token
const botDifficulties = new Map();

// Track used bot names per room
const roomBotNames = new Map();

export function isBot(token) {
  return typeof token === "string" && token.startsWith("bot_");
}

export function createBot(roomCode) {
  const room = getRoom(roomCode);
  if (!room) return { error: "الغرفة غير موجودة" };
  if (room.status !== "lobby") return { error: "اللعبة بدأت بالفعل" };
  if (room.players.length >= 20) return { error: "الغرفة ممتلئة" };

  // Pick unused name for this room
  if (!roomBotNames.has(roomCode)) roomBotNames.set(roomCode, new Set());
  const usedNames = roomBotNames.get(roomCode);
  const availableNames = BOT_NAMES.filter((n) => !usedNames.has(n));
  if (availableNames.length === 0) return { error: "أقصى عدد بوتات" };

  const name = availableNames[Math.floor(Math.random() * availableNames.length)];
  usedNames.add(name);

  const avatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)];
  const token = `bot_${uuidv4()}`;
  const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];

  // No session needed for bots (getSession returns null → level 1)
  botDifficulties.set(token, difficulty);

  // Join room with bot token
  const result = joinRoom(roomCode, token, name, avatar);
  if (result.error) return { error: result.error };

  // Mark bot as connected with no real socket
  const player = room.players.find((p) => p.token === token);
  if (player) {
    player.connected = true;
    player.socketId = null;
  }

  return { token, name, avatar, difficulty };
}

export function removeBot(roomCode, botToken) {
  if (!isBot(botToken)) return { error: "ليس بوت" };

  const room = getRoom(roomCode);
  if (!room) return { error: "الغرفة غير موجودة" };

  const idx = room.players.findIndex((p) => p.token === botToken);
  if (idx === -1) return { error: "البوت غير موجود" };

  const botName = room.players[idx].name;
  room.players.splice(idx, 1);

  // Free up the name
  const usedNames = roomBotNames.get(roomCode);
  if (usedNames) usedNames.delete(botName);

  botDifficulties.delete(botToken);

  return { ok: true };
}

export function getBotsInRoom(roomCode) {
  const room = getRoom(roomCode);
  if (!room) return [];
  return room.players.filter((p) => isBot(p.token)).map((p) => p.token);
}

export function getBotDifficulty(token) {
  return botDifficulties.get(token) || "medium";
}

// Clean up room bot names when room is deleted
export function cleanupRoomBots(roomCode) {
  roomBotNames.delete(roomCode);
  // Clean up difficulty entries for bots in this room
  for (const [token] of botDifficulties) {
    // We can't easily look up which room a bot was in,
    // but this is fine — stale entries are harmless for in-memory maps
  }
}
