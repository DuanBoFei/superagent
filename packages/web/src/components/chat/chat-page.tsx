"use client";

import { useCallback, useEffect } from "react";
import { useChatStore } from "../../store/chat";
import { useSocket } from "../../hooks/useSocket";
import { MessageList } from "./message-list";
import { InputBox } from "./input-box";

export function ChatPage() {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToken = useChatStore((s) => s.appendToken);
  const markComplete = useChatStore((s) => s.markComplete);
  const markError = useChatStore((s) => s.markError);
  const setConnectionStatus = useChatStore((s) => s.setConnectionStatus);
  const sessionId = useChatStore((s) => s.sessionId);
  const setSessionId = useChatStore((s) => s.setSessionId);

  const { socket, status } = useSocket();

  // Sync socket status to store for InputBox disabled state
  useEffect(() => {
    setConnectionStatus(status === "connected" ? "connected" : "disconnected");
  }, [status, setConnectionStatus]);

  // Wire socket events to store
  useEffect(() => {
    if (!socket) return;

    const onToken = (payload: { messageId: string; token: string }) => {
      appendToken(payload.messageId, payload.token);
    };

    const onComplete = (payload: { messageId: string; stats?: { inputTokens: number; outputTokens: number; durationMs: number } }) => {
      markComplete(payload.messageId, payload.stats);
    };

    const onError = (payload: { messageId: string; message: string }) => {
      markError(payload.messageId, payload.message);
    };

    socket.on("stream_token", onToken);
    socket.on("message_complete", onComplete);
    socket.on("message_error", onError);

    return () => {
      socket.off("stream_token", onToken);
      socket.off("message_complete", onComplete);
      socket.off("message_error", onError);
    };
  }, [socket, appendToken, markComplete, markError]);

  const handleSend = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const messageId = `user-${Date.now()}`;
      const sid = sessionId ?? `session-${Date.now()}`;
      if (!sessionId) {
        setSessionId(sid);
      }

      addMessage({
        id: messageId,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
        status: "sent",
      });

      if (socket?.connected) {
        socket.emit("client_send", {
          messageId,
          sessionId: sid,
          content: trimmed,
          timestamp: Date.now(),
        });
      }
    },
    [addMessage, socket, sessionId, setSessionId],
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
