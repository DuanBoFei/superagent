import type { CardsSlice } from "../store/slices/cards.slice";
import type { CardStatus, ToolCardType } from "../types/cards";
import { ToolStartSchema, ToolOutputSchema, ToolCompleteSchema, ToolErrorSchema, type ToolStartEvent, type ToolOutputEvent, type ToolCompleteEvent, type ToolErrorEvent } from "../types/tool-events";

export interface ToolCardEventDispatcher {
  dispatchToolStart(raw: unknown): void;
  dispatchToolOutput(raw: unknown): void;
  dispatchToolComplete(raw: unknown): void;
  dispatchToolError(raw: unknown): void;
}

const TOOL_CARD_TYPE_MAP: Record<string, ToolCardType> = {
  bash: "bash", Bash: "bash", BashTool: "bash",
  read: "file-read", Read: "file-read", FileRead: "file-read", FileReadTool: "file-read",
  write: "file-write", Write: "file-write", FileWrite: "file-write", FileWriteTool: "file-write",
  edit: "file-edit", Edit: "file-edit", FileEdit: "file-edit", FileEditTool: "file-edit",
  grep: "grep", Grep: "grep", GrepTool: "grep",
  glob: "glob", Glob: "glob", GlobTool: "glob",
  task: "task-list", Task: "task-list", TaskCreate: "task-list", TaskList: "task-list",
  "sub-agent": "sub-agent-grid", SubAgent: "sub-agent-grid", Agent: "sub-agent-grid",
  "web-search": "web-search", WebSearch: "web-search", WebSearchTool: "web-search",
};

function mapToolType(toolName: string): ToolCardType {
  return TOOL_CARD_TYPE_MAP[toolName] ?? "bash";
}

export function createToolCardDispatcher(cards: CardsSlice): ToolCardEventDispatcher {
  const toolNameMap = new Map<string, string>();

  function safeParse<T>(schema: { safeParse(data: unknown): { success: boolean; data?: T; error?: { issues: unknown[] } } }, raw: unknown, eventName: string): T | null {
    const result = schema.safeParse(raw);
    if (!result.success) {
      // Graceful degradation: log warning, return null
      console.warn(`[tool-cards] Invalid ${eventName} payload, skipping:`, raw, result.error?.issues);
      return null;
    }
    return result.data as T;
  }

  return {
    dispatchToolStart(raw: unknown) {
      const event = safeParse<ToolStartEvent>(ToolStartSchema, raw, "tool_start");
      if (!event) return;

      toolNameMap.set(event.toolCallId, event.toolName);
      const cardType = mapToolType(event.toolName);

      cards.addCard({
        id: event.toolCallId,
        type: cardType,
        status: "running" as CardStatus,
        timestamp: event.timestamp,
        title: event.title,
        isExpanded: true,
        isCollapsible: true,
        content: createEmptyContent(cardType),
      } as any);
    },

    dispatchToolOutput(raw: unknown) {
      const event = safeParse<ToolOutputEvent>(ToolOutputSchema, raw, "tool_output");
      if (!event) return;

      const card = cards.getCard(event.toolCallId);
      if (!card) return;

      // Append output content based on card type
      const updated = appendOutput(card, event.content);
      cards.updateCard(event.toolCallId, updated);
    },

    dispatchToolComplete(raw: unknown) {
      const event = safeParse<ToolCompleteEvent>(ToolCompleteSchema, raw, "tool_complete");
      if (!event) return;

      if (event.status === "error") {
        cards.updateCard(event.toolCallId, {
          status: "error" as CardStatus,
        } as any);
        return;
      }

      cards.updateCard(event.toolCallId, {
        status: "success" as CardStatus,
      } as any);
    },

    dispatchToolError(raw: unknown) {
      const event = safeParse<ToolErrorEvent>(ToolErrorSchema, raw, "tool_error");
      if (!event) return;

      cards.updateCard(event.toolCallId, {
        status: "error" as CardStatus,
      } as any);
    },
  };
}

function createEmptyContent(type: ToolCardType): unknown {
  switch (type) {
    case "bash": return { command: "", args: [], output: "", exitCode: null, durationMs: null };
    case "file-read": return { filePath: "", fileSize: 0, lineCount: 0, content: "", language: "" };
    case "file-write": return { filePath: "", linesWritten: 0, content: "" };
    case "file-edit": return { filePath: "", diff: "", linesAdded: 0, linesRemoved: 0 };
    case "grep": return { pattern: "", matches: [], totalMatches: 0, filesSearched: 0 };
    case "glob": return { pattern: "", files: [], totalFiles: 0 };
    case "task-list": return { tasks: [], completedCount: 0, totalCount: 0 };
    case "sub-agent-grid": return { cells: [], columns: 2 };
    case "web-search": return { query: "", results: [], totalResults: 0 };
  }
}

function appendOutput(card: any, output: string): Record<string, unknown> {
  const content = { ...card.content };
  switch (card.type as ToolCardType) {
    case "bash":
      content.output = (content.output ?? "") + output;
      break;
    case "file-read":
      content.content = (content.content ?? "") + output;
      break;
    case "file-write":
      content.content = (content.content ?? "") + output;
      break;
    case "sub-agent-grid": {
      const cells = [...(content.cells ?? [])];
      if (cells.length > 0) {
        cells[cells.length - 1] = { ...cells[cells.length - 1], output: (cells[cells.length - 1].output ?? "") + output };
      }
      content.cells = cells;
      break;
    }
    // Other types don't stream output
  }
  return { content };
}

export const useToolCards = createToolCardDispatcher;
