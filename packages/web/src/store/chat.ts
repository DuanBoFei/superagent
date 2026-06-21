"use client";

import { create } from "zustand";
import type { Message, TokenUsageStats } from "../types/message";

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export interface ChatStore {
  messages: Message[];
  input: string;
  connectionStatus: ConnectionStatus;
  isStreaming: boolean;
  sessionId: string | null;

  addMessage: (message: Message) => void;
  appendToken: (id: string, token: string) => void;
  markComplete: (id: string, stats?: TokenUsageStats) => void;
  markError: (id: string, error: string) => void;
  setInput: (input: string) => void;
  clearInput: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSessionId: (sessionId: string | null) => void;
  loadMessages: (messages: Message[]) => void;
  reset: () => void;
}

function createAssistantMessage(id: string): Message {
  return {
    id,
    role: "assistant",
    content: "",
    timestamp: Date.now(),
    status: "streaming",
  };
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  input: "",
  connectionStatus: "disconnected",
  isStreaming: false,
  sessionId: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      isStreaming: message.status === "streaming" ? true : state.isStreaming,
    })),

  appendToken: (id, token) =>
    set((state) => {
      const messages = state.messages.map((m) => {
        if (m.id !== id) return m;
        return { ...m, content: m.content + token, status: "streaming" as const };
      });

      // Create placeholder assistant message if token arrives for unknown id
      if (!state.messages.some((m) => m.id === id)) {
        const placeholder = createAssistantMessage(id);
        placeholder.content = token;
        return { messages: [...messages, placeholder], isStreaming: true };
      }

      return { messages, isStreaming: true };
    }),

  markComplete: (id, _stats) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, status: "sent" as const } : m,
      ),
      isStreaming: false,
    })),

  markError: (id, error) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, status: "error" as const, error } : m,
      ),
      isStreaming: false,
    })),

  setInput: (input) => set({ input }),

  clearInput: () => set({ input: "" }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setSessionId: (sessionId) => set({ sessionId }),

  loadMessages: (messages) =>
    set({
      messages,
      isStreaming: false,
    }),

  reset: () =>
    set({
      messages: [],
      input: "",
      connectionStatus: "disconnected",
      isStreaming: false,
      sessionId: null,
    }),
}));
