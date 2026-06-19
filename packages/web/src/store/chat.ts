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
      updateMessage(id, { content: `${message.content}${token}`, status: "streaming" });
      state = { ...state, streamingMessageId: id };
    },
    markComplete: (id, _stats) => {
      updateMessage(id, { status: "sent" });
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

export const useChatStore = createChatStore;
