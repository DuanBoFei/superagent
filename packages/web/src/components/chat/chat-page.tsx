"use client";

import { useCallback } from "react";
import { useChatStore } from "../../store/chat";
import { MessageList } from "./message-list";
import { InputBox } from "./input-box";

export function ChatPage({ onSend }: { onSend: (content: string) => void }) {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);

  const handleSend = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      addMessage({
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
        status: "sent",
      });
      onSend(trimmed);
    },
    [addMessage, onSend],
  );

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <InputBox onSend={handleSend} />
    </div>
  );
}
