"use client";

import { useCallback, useEffect } from "react";
import { useChatStore } from "../../store/chat";
import { useSocket } from "../../hooks/useSocket";
import { MessageList } from "./message-list";
import { InputBox } from "./input-box";

export function ChatPage() {
  const sessionMessages = useChatStore((s) => s.sessionMessages);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToken = useChatStore((s) => s.appendToken);
  const markComplete = useChatStore((s) => s.markComplete);
  const markError = useChatStore((s) => s.markError);
  const estimateOutputToken = useChatStore((s) => s.estimateOutputToken);
  const setConnectionStatus = useChatStore((s) => s.setConnectionStatus);
  const setActiveSession = useChatStore((s) => s.setActiveSession);
  const loadMessages = useChatStore((s) => s.loadMessages);

  const { socket, status } = useSocket();

  const messages = activeSessionId ? (sessionMessages[activeSessionId] ?? []) : [];

  // Sync socket status to store
  useEffect(() => {
    setConnectionStatus(status === "connected" ? "connected" : "disconnected");
  }, [status, setConnectionStatus]);

  // Wire socket events to store
  useEffect(() => {
    if (!socket) return;

    const onToken = (payload: { messageId: string; sessionId: string; token: string }) => {
      appendToken(payload.messageId, payload.token, payload.sessionId);
      estimateOutputToken(payload.sessionId, payload.token.length);
    };

    const onComplete = (payload: { messageId: string; sessionId: string; stats?: { inputTokens: number; outputTokens: number; durationMs: number } }) => {
      markComplete(payload.messageId, payload.stats, payload.sessionId);
    };

    const onError = (payload: { messageId: string; sessionId: string; message: string }) => {
      markError(payload.messageId, payload.message, payload.sessionId);
    };

    const onSessionLoaded = (payload: { sessionId: string; messages: Array<{ id: string; role: "user" | "assistant"; content: string }> }) => {
      loadMessages(
        payload.sessionId,
        payload.messages.map((m) => ({
          ...m,
          timestamp: Date.now(),
          status: "sent" as const,
        })),
      );
    };

    socket.on("stream_token", onToken);
    socket.on("message_complete", onComplete);
    socket.on("message_error", onError);
    socket.on("session_loaded", onSessionLoaded);

    return () => {
      socket.off("stream_token", onToken);
      socket.off("message_complete", onComplete);
      socket.off("message_error", onError);
      socket.off("session_loaded", onSessionLoaded);
    };
  }, [socket, appendToken, markComplete, markError, loadMessages, estimateOutputToken]);

  const handleSend = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const messageId = `user-${Date.now()}`;
      const sid = activeSessionId ?? crypto.randomUUID();
      if (!activeSessionId) {
        setActiveSession(sid);
      }

      addMessage(
        {
          id: messageId,
          role: "user",
          content: trimmed,
          timestamp: Date.now(),
          status: "sent",
        },
        sid,
      );

      if (socket?.connected) {
        socket.emit("client_send", {
          messageId,
          sessionId: sid,
          content: trimmed,
          timestamp: Date.now(),
        });
      }
    },
    [addMessage, socket, activeSessionId, setActiveSession],
  );

  return (
    <div className="flex flex-col h-full">
      {status === "disconnected" && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-amber-400">
          Disconnected from server. Reconnecting...
        </div>
      )}
      <MessageList messages={messages} />
      <InputBox onSend={handleSend} />
    </div>
  );
}
