export type ToolCardType =
  | "bash"
  | "file-read"
  | "file-write"
  | "file-edit"
  | "grep"
  | "glob"
  | "task-list"
  | "sub-agent-grid"
  | "web-search";

export type CardStatus = "pending" | "running" | "success" | "error";

export interface BaseCardState {
  id: string;
  type: ToolCardType;
  status: CardStatus;
  timestamp: number;
  title: string;
  isExpanded: boolean;
  isCollapsible: boolean;
}

// ── Bash ──────────────────────────────────────────────

export interface BashCardContent {
  command: string;
  args: string[];
  output: string;
  exitCode: number | null;
  durationMs: number | null;
}

export interface BashCard extends BaseCardState {
  type: "bash";
  content: BashCardContent;
}

// ── File Read ─────────────────────────────────────────

export interface FileReadCardContent {
  filePath: string;
  fileSize: number;
  lineCount: number;
  content: string;
  language: string;
}

export interface FileReadCard extends BaseCardState {
  type: "file-read";
  content: FileReadCardContent;
}

// ── File Write ────────────────────────────────────────

export interface FileWriteCardContent {
  filePath: string;
  linesWritten: number;
  content: string;
}

export interface FileWriteCard extends BaseCardState {
  type: "file-write";
  content: FileWriteCardContent;
}

// ── File Edit ─────────────────────────────────────────

export interface FileEditCardContent {
  filePath: string;
  diff: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface FileEditCard extends BaseCardState {
  type: "file-edit";
  content: FileEditCardContent;
}

// ── Grep ──────────────────────────────────────────────

export interface GrepMatch {
  filePath: string;
  line: number;
  column: number;
  matchText: string;
  contextBefore: string;
  contextAfter: string;
}

export interface GrepCardContent {
  pattern: string;
  matches: GrepMatch[];
  totalMatches: number;
  filesSearched: number;
}

export interface GrepCard extends BaseCardState {
  type: "grep";
  content: GrepCardContent;
}

// ── Glob ──────────────────────────────────────────────

export interface GlobCardContent {
  pattern: string;
  files: string[];
  totalFiles: number;
}

export interface GlobCard extends BaseCardState {
  type: "glob";
  content: GlobCardContent;
}

// ── Task List ─────────────────────────────────────────

export type TaskItemStatus = "pending" | "in-progress" | "completed" | "deleted";

export interface TaskListItem {
  taskId: string;
  title: string;
  status: TaskItemStatus;
}

export interface TaskListCardContent {
  tasks: TaskListItem[];
  completedCount: number;
  totalCount: number;
}

export interface TaskListCard extends BaseCardState {
  type: "task-list";
  content: TaskListCardContent;
}

// ── Sub-Agent Grid ────────────────────────────────────

export interface SubAgentCell {
  agentId: string;
  title: string;
  status: CardStatus;
  output: string;
  progress: number;
}

export interface SubAgentGridCardContent {
  cells: SubAgentCell[];
  columns: number;
}

export interface SubAgentGridCard extends BaseCardState {
  type: "sub-agent-grid";
  content: SubAgentGridCardContent;
}

// ── Web Search ────────────────────────────────────────

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface WebSearchCardContent {
  query: string;
  results: WebSearchResult[];
  totalResults: number;
}

export interface WebSearchCard extends BaseCardState {
  type: "web-search";
  content: WebSearchCardContent;
}

// ── Discriminant Union ────────────────────────────────

export type ToolCardState =
  | BashCard
  | FileReadCard
  | FileWriteCard
  | FileEditCard
  | GrepCard
  | GlobCard
  | TaskListCard
  | SubAgentGridCard
  | WebSearchCard;
