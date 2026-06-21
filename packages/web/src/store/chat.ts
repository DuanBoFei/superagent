"use client";

import { create } from "zustand";
import type { Message, TokenUsageStats } from "../types/message";

export type ConnectionStatus = "connected" | "disconnected" | "connecting";

export interface ChatStore {
  sessionMessages: Record<string, Message[]>;
  streamingSessionIds: string[];
  activeSessionId: string | null;
  input: string;
  connectionStatus: ConnectionStatus;
  isStreaming: boolean;

  addMessage: (message: Message, sessionId?: string) => void;
  appendToken: (id: string, token: string, sessionId?: string) => void;
  markComplete: (id: string, stats?: TokenUsageStats, sessionId?: string) => void;
  markError: (id: string, error: string, sessionId?: string) => void;
  setInput: (input: string) => void;
  clearInput: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveSession: (sessionId: string | null) => void;
  loadMessages: (sessionId: string, messages: Message[]) => void;
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

function getMessages(
  state: { sessionMessages: Record<string, Message[]>; activeSessionId: string | null },
  sessionId?: string,
): Message[] {
  const sid = sessionId ?? state.activeSessionId ?? "__default__";
  return state.sessionMessages[sid] ?? [];
}

function setMessages(
  state: { sessionMessages: Record<string, Message[]>; activeSessionId: string | null },
  messages: Message[],
  sessionId?: string,
): Record<string, Message[]> {
  const sid = sessionId ?? state.activeSessionId ?? "__default__";
  return { ...state.sessionMessages, [sid]: messages };
}

function addToStreaming(ids: string[], sessionId: string): string[] {
  if (ids.includes(sessionId)) return ids;
  return [...ids, sessionId];
}

function removeFromStreaming(ids: string[], sessionId: string): string[] {
  return ids.filter((id) => id !== sessionId);
}

export const useChatStore = create<ChatStore>((set) => ({
  sessionMessages: {},
  streamingSessionIds: [],
  activeSessionId: null,
  input: "",
  connectionStatus: "disconnected",
  isStreaming: false,

  addMessage: (message, sessionId) =>
    set((state) => {
      const sid = sessionId ?? state.activeSessionId ?? "__default__";
      const messages = [...(state.sessionMessages[sid] ?? []), message];
      const isStreaming = message.status === "streaming"
        ? addToStreaming(state.streamingSessionIds, sid)
        : state.streamingSessionIds;
      return {
        sessionMessages: { ...state.sessionMessages, [sid]: messages },
        streamingSessionIds: isStreaming,
        isStreaming: isStreaming.includes(state.activeSessionId ?? "__default__"),
      };
    }),

  appendToken: (id, token, sessionId) =>
    set((state) => {
      const sid = sessionId ?? state.activeSessionId ?? "__default__";
      const current = state.sessionMessages[sid] ?? [];
      const hasMessage = current.some((m) => m.id === id);
      let messages: Message[];

      if (!hasMessage) {
        const placeholder = createAssistantMessage(id);
        placeholder.content = token;
        messages = [...current, placeholder];
      } else {
        messages = current.map((m) =>
          m.id === id ? { ...m, content: m.content + token, status: "streaming" as const } : m,
        );
      }

      const streaming = addToStreaming(state.streamingSessionIds, sid);
      return {
        sessionMessages: { ...state.sessionMessages, [sid]: messages },
        streamingSessionIds: streaming,
        isStreaming: streaming.includes(state.activeSessionId ?? "__default__"),
      };
    }),

  markComplete: (id, _stats, sessionId) =>
    set((state) => {
      const sid = sessionId ?? state.activeSessionId ?? "__default__";
      const current = state.sessionMessages[sid] ?? [];
      const messages = current.map((m) =>
        m.id === id ? { ...m, status: "sent" as const } : m,
      );
      const streaming = removeFromStreaming(state.streamingSessionIds, sid);
      return {
        sessionMessages: { ...state.sessionMessages, [sid]: messages },
        streamingSessionIds: streaming,
        isStreaming: streaming.includes(state.activeSessionId ?? "__default__"),
      };
    }),

  markError: (id, error, sessionId) =>
    set((state) => {
      const sid = sessionId ?? state.activeSessionId ?? "__default__";
      const current = state.sessionMessages[sid] ?? [];
      const messages = current.map((m) =>
        m.id === id ? { ...m, status: "error" as const, error } : m,
      );
      const streaming = removeFromStreaming(state.streamingSessionIds, sid);
      return {
        sessionMessages: { ...state.sessionMessages, [sid]: messages },
        streamingSessionIds: streaming,
        isStreaming: streaming.includes(state.activeSessionId ?? "__default__"),
      };
    }),

  setInput: (input) => set({ input }),

  clearInput: () => set({ input: "" }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setActiveSession: (activeSessionId) =>
    set((state) => ({
      activeSessionId,
      isStreaming: activeSessionId ? state.streamingSessionIds.includes(activeSessionId) : false,
    })),

  loadMessages: (sessionId, messages) =>
    set((state) => {
      const streaming = removeFromStreaming(state.streamingSessionIds, sessionId);
      const newActiveId = state.activeSessionId ?? sessionId;
      return {
        sessionMessages: { ...state.sessionMessages, [sessionId]: messages },
        activeSessionId: newActiveId,
        streamingSessionIds: streaming,
        isStreaming: streaming.includes(newActiveId),
      };
    }),

  reset: () =>
    set({
      sessionMessages: {},
      streamingSessionIds: [],
      activeSessionId: null,
      input: "",
      connectionStatus: "disconnected",
      isStreaming: false,
    }),
}));
