"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../types/message";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const BACKEND_URL = "http://localhost:3457";

export function useSocket() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(BACKEND_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;
    setReady(true);

    if (socket.connected) {
      setStatus("connected");
    }

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("disconnected"));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setReady(false);
    };
  }, []);

  return {
    socket: ready ? socketRef.current : null,
    status,
  };
}
