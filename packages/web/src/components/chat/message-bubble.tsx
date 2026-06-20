"use client";

import type { Message } from "../../types/message";
import { MarkdownRenderer } from "./markdown/renderer";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const hasError = message.status === "error";

  return (
    <div className={`message-bubble ${message.role}`}>
      <div
        className={`message-bubble-inner ${isUser ? "ml-auto bg-[#18181b]" : "bg-[#0d0d0d]"} max-w-[80%] rounded px-2 py-1.5 text-sm`}
        data-streaming={isStreaming ? "true" : undefined}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
        {isStreaming && <span className="message-cursor" />}
        {hasError && message.error && (
          <p className="text-red-500 text-xs mt-1">{message.error}</p>
        )}
      </div>
    </div>
  );
}
