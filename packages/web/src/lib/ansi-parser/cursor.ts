// Cursor position snapshot for save/restore
export interface CursorSnapshot {
  x: number;
  y: number;
  visible: boolean;
}

export interface CursorState {
  x: number;
  y: number;
  visible: boolean;
  saved: CursorSnapshot | null;
}

export function createCursorState(): CursorState {
  return {
    x: 0,
    y: 0,
    visible: true,
    saved: null,
  };
}

// Clamp to column index within [0, cols-1]
function clampCol(cols: number, x: number): number {
  return Math.max(0, Math.min(cols - 1, x));
}

// Clamp to row index within [0, maxRows-1]
function clampRow(maxRows: number, y: number): number {
  return Math.max(0, Math.min(maxRows - 1, y));
}

export function cursorUp(cursor: CursorState, n: number): void {
  cursor.y = Math.max(0, cursor.y - n);
}

export function cursorDown(cursor: CursorState, n: number, maxRows: number): void {
  cursor.y = Math.min(maxRows - 1, cursor.y + n);
}

export function cursorForward(cursor: CursorState, n: number, cols: number): void {
  cursor.x = clampCol(cols, cursor.x + n);
}

export function cursorBack(cursor: CursorState, n: number): void {
  cursor.x = Math.max(0, cursor.x - n);
}

export function cursorNextLine(cursor: CursorState, n: number, maxRows: number): void {
  cursor.y = Math.min(maxRows - 1, cursor.y + n);
  cursor.x = 0;
}

export function cursorPrevLine(cursor: CursorState, n: number): void {
  cursor.y = Math.max(0, cursor.y - n);
  cursor.x = 0;
}

export function cursorPosition(cursor: CursorState, row: number, col: number, maxRows: number, cols: number): void {
  // ANSI rows/cols are 1-indexed
  cursor.y = clampRow(maxRows, (row || 1) - 1);
  cursor.x = clampCol(cols, (col || 1) - 1);
}

export function cursorColumn(cursor: CursorState, col: number, cols: number): void {
  cursor.x = clampCol(cols, (col || 1) - 1);
}

export function cursorShow(cursor: CursorState): void {
  cursor.visible = true;
}

export function cursorHide(cursor: CursorState): void {
  cursor.visible = false;
}

export function cursorSave(cursor: CursorState): void {
  cursor.saved = { x: cursor.x, y: cursor.y, visible: cursor.visible };
}

export function cursorRestore(cursor: CursorState): void {
  if (cursor.saved) {
    cursor.x = cursor.saved.x;
    cursor.y = cursor.saved.y;
    cursor.visible = cursor.saved.visible;
  }
}
