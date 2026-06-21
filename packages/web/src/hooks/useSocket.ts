"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../types/message";
import type { SessionSummary, Session } from "../types/session-history";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT ?? "3456";
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

export interface SessionListEvent {
  sessions: SessionSummary[];
}

export interface SessionLoadedEvent {
  sessionId: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
  }>;
}

export interface UseSocketOptions {
  onSessionList?: (events: SessionListEvent) => void;
  onSessionLoaded?: (events: SessionLoadedEvent) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [ready, setReady] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

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

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("get_sessions");
    });
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("disconnected"));

    // Session event listeners — forwarded to callbacks so components can wire to stores
    socket.on("session_list", (payload: SessionListEvent) => {
      optionsRef.current.onSessionList?.(payload);
    });

    socket.on("session_loaded", (payload: SessionLoadedEvent) => {
      optionsRef.current.onSessionLoaded?.(payload);
    });

    socket.on("message_complete", () => {
      socket.emit("get_sessions");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setReady(false);
    };
  }, []);

  const loadSession = useCallback((sessionId: string) => {
    socketRef.current?.emit("load_session", { sessionId });
  }, []);

  return {
    socket: ready ? socketRef.current : null,
    status,
    loadSession,
  };
}
