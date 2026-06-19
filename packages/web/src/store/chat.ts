import { parseMarkdown, parsePartial } from "../lib/markdown/parser";
import type { Message, TokenUsageStats } from "../types/message";

export interface ChatState {
  messages: Message[];
  currentSessionId: string;
  isConnected: boolean;
  pendingQueue: string[];
  streamingMessageId?: string;
}

export interface ChatStore {
  getState(): ChatState;
  setConnected(isConnected: boolean): void;
  setSession(sessionId: string): void;
  replaceMessages(messages: Message[]): void;
  addMessage(message: Message): void;
  updateMessage(id: string, updates: Partial<Message>): void;
  appendToken(id: string, token: string): void;
  markComplete(id: string, stats?: TokenUsageStats): void;
  markError(id: string, error: string): void;
  enqueueMessage(id: string): boolean;
  processNextMessage(): string | undefined;
  dequeueMessage(id: string): void;
}

export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
}

export interface SessionStore {
  createNewSession(): string;
}

export interface SessionHistorySource {
  loadMessages(sessionId: string): Promise<Message[]>;
}

export interface QueueProcessor {
  process(): string | undefined;
  complete(id: string): string | undefined;
}

export function createChatStore(sessionId: string): ChatStore {
  let state: ChatState = {
    messages: [],
    currentSessionId: sessionId,
    isConnected: false,
    pendingQueue: [],
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    state = {
      ...state,
      messages: state.messages.map((message) => (message.id === id ? { ...message, ...updates } : message)),
    };
  };

  return {
    getState: () => state,
    setConnected: (isConnected) => {
      state = { ...state, isConnected };
    },
    setSession: (sessionId) => {
      state = {
        messages: [],
        currentSessionId: sessionId,
        isConnected: state.isConnected,
        pendingQueue: [],
      };
    },
    replaceMessages: (messages) => {
      state = { ...state, messages: [...messages], streamingMessageId: messages.find((message) => message.status === "streaming")?.id };
    },
    addMessage: (message) => {
      state = {
        ...state,
        messages: [...state.messages, message],
        streamingMessageId: message.status === "streaming" ? message.id : state.streamingMessageId,
      };
    },
    updateMessage,
    appendToken: (id, token) => {
      const message = state.messages.find((item) => item.id === id);
      if (!message) {
        return;
      }
      const content = `${message.content}${token}`;
      const parsed = message.role === "assistant" ? parsePartial(content) : undefined;
      updateMessage(id, { content, status: "streaming", ast: parsed?.ast, partialStructure: parsed?.partialStructure });
      state = { ...state, streamingMessageId: id };
    },
    markComplete: (id, _stats) => {
      const message = state.messages.find((item) => item.id === id);
      const markdown = message?.role === "assistant" ? { ast: parseMarkdown(message.content), partialStructure: "none" as const } : undefined;
      updateMessage(id, { status: "sent", ...markdown });
      if (state.streamingMessageId === id) {
        state = { ...state, streamingMessageId: undefined };
      }
    },
    markError: (id, error) => {
      updateMessage(id, { status: "error", error });
      if (state.streamingMessageId === id) {
        state = { ...state, streamingMessageId: undefined };
      }
    },
    enqueueMessage: (id) => {
      if (state.pendingQueue.length >= 5) {
        return false;
      }
      state = { ...state, pendingQueue: [...state.pendingQueue, id] };
      return true;
    },
    processNextMessage: () => state.pendingQueue[0],
    dequeueMessage: (id) => {
      state = { ...state, pendingQueue: state.pendingQueue.filter((queuedId) => queuedId !== id) };
    },
  };
}

export function initializeSessionId(
  storage: SessionStorageLike,
  createId: () => string = () => `session_${crypto.randomUUID()}`,
): string {
  const existing = storage.getItem("superagent_session_id");
  if (existing) {
    return existing;
  }

  const sessionId = createId();
  storage.setItem("superagent_session_id", sessionId);
  return sessionId;
}

export function createSessionStore(
  store: ChatStore,
  storage: SessionStorageLike,
  createId: () => string = () => `session_${crypto.randomUUID()}`,
): SessionStore {
  return {
    createNewSession: () => {
      const sessionId = createId();
      storage.setItem("superagent_session_id", sessionId);
      store.setSession(sessionId);
      return sessionId;
    },
  };
}

export async function loadSessionHistory(store: ChatStore, source: SessionHistorySource): Promise<void> {
  const messages = await source.loadMessages(store.getState().currentSessionId);
  store.replaceMessages(messages);
}

export function createQueueProcessor(store: ChatStore, send: (message: Message) => void): QueueProcessor {
  const process = () => {
    const id = store.processNextMessage();
    const message = store.getState().messages.find((item) => item.id === id);
    if (!message) {
      return undefined;
    }
    store.updateMessage(message.id, { status: "sending" });
    send({ ...message, status: "sending" });
    return message.id;
  };

  return {
    process,
    complete: (id) => {
      store.dequeueMessage(id);
      return process();
    },
  };
}

export const useChatStore = createChatStore;
