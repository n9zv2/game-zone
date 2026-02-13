// Support multiple players in same browser for testing:
// Open localhost:3000 for player 1
// Open localhost:3000?p=2 for player 2
const PLAYER_ID = new URLSearchParams(window.location.search).get("p") || "1";
const PREFIX = PLAYER_ID === "1" ? "fa" : `fa_p${PLAYER_ID}`;

const TOKEN_KEY = `${PREFIX}_token`;
const NAME_KEY = `${PREFIX}_name`;
const AVATAR_KEY = `${PREFIX}_avatar`;
const ROOM_KEY = `${PREFIX}_room`;

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getName() {
  return localStorage.getItem(NAME_KEY) || "";
}

export function setName(name) {
  localStorage.setItem(NAME_KEY, name);
}

export function getAvatar() {
  return localStorage.getItem(AVATAR_KEY) || "";
}

export function setAvatar(avatar) {
  localStorage.setItem(AVATAR_KEY, avatar);
}

export function getRoomCode() {
  return localStorage.getItem(ROOM_KEY) || "";
}

export function setRoomCode(code) {
  if (code) localStorage.setItem(ROOM_KEY, code);
  else localStorage.removeItem(ROOM_KEY);
}

export function hasIdentity() {
  return !!(getToken() && getName() && getAvatar());
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(AVATAR_KEY);
  localStorage.removeItem(ROOM_KEY);
}

// Match History
const HISTORY_KEY = `${PREFIX}_history`;
const MAX_HISTORY = 20;

export function getMatchHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export function addMatch(match) {
  const history = getMatchHistory();
  history.unshift({ ...match, date: Date.now() });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
