import { io } from "socket.io-client";

// In production, connect to same origin. In dev, Vite proxy handles it.
const socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

export default socket;
