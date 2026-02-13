import { useEffect } from "react";
import socket from "../socket.js";

export default function useSocket(event, handler) {
  useEffect(() => {
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [event, handler]);
}
