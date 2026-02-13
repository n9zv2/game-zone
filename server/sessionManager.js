import { v4 as uuidv4 } from "uuid";

// In-memory session store
const sessions = new Map();

export function createSession(name, avatar) {
  const token = uuidv4();
  const session = {
    token,
    name,
    avatar,
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    xp: 0,
    level: 1,
    createdAt: Date.now(),
  };
  sessions.set(token, session);
  return session;
}

export function getSession(token) {
  return sessions.get(token) || null;
}

export function updateSession(token, updates) {
  const session = sessions.get(token);
  if (!session) return null;
  Object.assign(session, updates);
  return session;
}

function calcLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function addScore(token, score, won = false) {
  const session = sessions.get(token);
  if (!session) return null;
  session.totalScore += score;
  session.gamesPlayed += 1;
  if (won) session.gamesWon += 1;
  const xpGain = score + (won ? 50 : 0);
  const oldLevel = session.level;
  session.xp += xpGain;
  session.level = calcLevel(session.xp);
  return { ...session, leveledUp: session.level > oldLevel, xpGain };
}

export function getAllSessions() {
  return [...sessions.values()];
}
