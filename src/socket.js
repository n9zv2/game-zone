import { io } from "socket.io-client";

// In production, connect to same origin. In dev, Vite proxy handles it.
const socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
