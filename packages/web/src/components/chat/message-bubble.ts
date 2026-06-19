import type { Message } from "../../types/message";
import { sanitizeHtml } from "../../utils/dompurify";
import { renderMarkdown } from "./markdown/renderer";

const STATUS_LABELS: Record<Message["status"], string> = {
  pending: "Pending",
  sending: "Sending",
  streaming: "Streaming",
  sent: "Sent",
  error: "Error",
  cancelled: "Cancelled",
};

export function renderMessageBubble(message: Message): string {
  const alignment = message.role === "user" ? "justify-end" : "justify-start";
  const surface = message.role === "user" ? "bg-neutral-800 border-neutral-700" : "bg-neutral-950 border-neutral-800";
  const content = message.role === "assistant" && message.ast ? renderMarkdown(message.ast) : sanitizeHtml(message.content);
  const error = message.status === "error" && message.error ? renderError(message.error) : "";

  return `<article class="message-row flex ${alignment} py-1" data-message-id="${escapeAttribute(message.id)}" data-role="${message.role}" data-status="${message.status}">
  <div class="message-bubble max-w-[80%] rounded border ${surface} px-3 py-2 text-sm leading-6 text-neutral-100 shadow-sm">
    <div class="message-content font-mono text-[13px]">${content}</div>
    <div class="message-meta mt-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-500">
      <span>${STATUS_LABELS[message.status]}</span>
      ${message.status === "streaming" ? '<span class="text-emerald-400">●</span>' : ""}
    </div>
    ${error}
  </div>
</article>`;
}

function renderError(error: string): string {
  return `<div class="message-error mt-2 rounded border border-red-900/60 bg-red-950/40 px-2 py-1 text-xs text-red-200">
      <span>${sanitizeHtml(error)}</span>
      <button type="button" data-action="retry" class="ml-2 text-emerald-300">Retry</button>
    </div>`;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
