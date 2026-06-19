import type { ClientMessageEvent } from "../../types/message";
import { createMessageId } from "../../utils/uuid";

export interface InputBoxKeyEvent {
  key: string;
  shiftKey: boolean;
}

export interface InputBoxControllerOptions {
  onSend: (message: ClientMessageEvent) => void;
  sessionId?: string;
  now?: () => number;
  limit?: number;
}

export type InputBoxKeyResult = "ignored" | "newline" | "sent" | "blocked" | "cleared";

export interface InputBoxController {
  getValue(): string;
  setValue(value: string): void;
  paste(text: string): void;
  isOverLimit(): boolean;
  handleKeyDown(event: InputBoxKeyEvent): InputBoxKeyResult;
}

export interface InputBoxRenderOptions {
  value: string;
  connected: boolean;
  limit?: number;
}

const DEFAULT_LIMIT = 50_000;

export function createInputBoxController(options: InputBoxControllerOptions): InputBoxController {
  let value = "";
  const limit = options.limit ?? DEFAULT_LIMIT;

  const controller: InputBoxController = {
    getValue: () => value,
    setValue: (nextValue) => {
      value = nextValue;
    },
    paste: (text) => {
      value += text;
    },
    isOverLimit: () => value.length > limit,
    handleKeyDown: (event) => {
      if (event.key === "Escape") {
        value = "";
        return "cleared";
      }

      if (event.key !== "Enter") {
        return "ignored";
      }

      if (event.shiftKey) {
        return "newline";
      }

      const content = value.trim();
      if (!content || value.length > limit) {
        return "blocked";
      }

      options.onSend({
        messageId: createMessageId(),
        sessionId: options.sessionId ?? "default",
        content,
        timestamp: options.now?.() ?? Date.now(),
      });
      value = "";
      return "sent";
    },
  };

  return controller;
}

export function renderInputBox(options: InputBoxRenderOptions): string {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const overLimit = options.value.length > limit;
  const disabled = overLimit || !options.connected;

  return `<form class="input-box border-t border-neutral-800 bg-neutral-950 px-3 py-2" data-over-limit="${overLimit}">
  <textarea class="min-h-10 max-h-[30vh] w-full resize-none rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm leading-6 text-neutral-100 outline-none focus:border-emerald-500" rows="1">${escapeText(options.value)}</textarea>
  <div class="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
    <span>Enter to send · Shift+Enter newline · Esc clear</span>
    <span class="${overLimit ? "text-red-300" : ""}">${options.value.length} / ${limit}</span>
  </div>
  <button type="submit" class="mt-2 rounded border border-emerald-900/70 px-3 py-1 text-xs text-emerald-300"${disabled ? " disabled" : ""}>Send</button>
</form>`;
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
