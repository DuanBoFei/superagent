"use client";

import { useEffect, useRef } from "react";
import type { Message } from "../../types/message";
import { MessageBubble } from "./message-bubble";

export function MessageList({ messages }: { messages: Message[] }) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sentinelRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4" data-empty="true">
        <p className="text-muted-foreground text-center text-sm">
          No messages yet. Start a conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div data-scroll-sentinel="true" ref={sentinelRef} />
    </div>
  );
}
