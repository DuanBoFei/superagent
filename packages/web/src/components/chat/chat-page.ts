import type { ChatStore } from "../../store/chat";
import { renderInputBox } from "./input-box";
import { renderMessageList } from "./message-list";

export interface ChatPageRenderOptions {
  store: ChatStore;
  inputValue: string;
  viewportHeight: number;
  scrollTop: number;
}

export interface ChatPageControllerOptions {
  store: ChatStore;
  now?: () => number;
  createId?: () => string;
}

export interface ChatPageController {
  sendMessage(content: string): boolean;
}

export function renderChatPage(options: ChatPageRenderOptions): string {
  const state = options.store.getState();
  const messages = renderMessageList({
    messages: state.messages,
    viewportHeight: options.viewportHeight,
    scrollTop: options.scrollTop,
  });
  const input = renderInputBox({
    value: options.inputValue,
    connected: state.isConnected,
  });

  return `<main class="chat-page grid h-full grid-rows-[1fr_auto] bg-neutral-950 text-neutral-100" data-session-id="${escapeAttribute(state.currentSessionId)}">
  ${messages}
  ${input}
</main>`;
}

export function createChatPageController(options: ChatPageControllerOptions): ChatPageController {
  return {
    sendMessage: (content) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return false;
      }

      const id = options.createId?.() ?? `msg_${crypto.randomUUID()}`;
      options.store.addMessage({
        id,
        role: "user",
        content: trimmed,
        timestamp: options.now?.() ?? Date.now(),
        status: "pending",
      });
      return options.store.enqueueMessage(id);
    },
  };
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
