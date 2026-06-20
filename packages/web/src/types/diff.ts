export type DiffViewMode = "unified" | "split";

export type DiffLineType = "add" | "delete" | "modify" | "context" | "empty";

export interface CharChange {
  start: number;
  end: number;
  type: "add" | "delete";
}

export interface DiffLine {
  type: DiffLineType;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
  charChanges: CharChange[];
}

export interface DiffHunk {
  hunkIndex: number;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
  isCollapsed: boolean;
  isContextHunk: boolean;
}

export interface DiffStatistics {
  linesAdded: number;
  linesDeleted: number;
  linesModified: number;
  changeBlocks: number;
  totalLines: number;
}

export interface DiffNavigationPosition {
  currentHunkIndex: number;
  currentLineIndex: number;
  totalHunks: number;
}

export interface DiffViewerProps {
  diff?: string;
  oldContent?: string;
  newContent?: string;
  filePath?: string;
  language?: string;
  defaultViewMode?: DiffViewMode;
  showStatistics?: boolean;
  showNavigation?: boolean;
  virtualScrollThreshold?: number;
}
