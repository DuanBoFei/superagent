import type { ExportFormatV1, Session } from "../../types/session-history";

export interface SessionExportImportOptions {
  hasSelection: boolean;
  onExportSelected?: () => void;
  onExportAll?: () => void;
  onImportFile?: (event: Event) => void;
}

export interface SessionExportImportController {
  attach(): void;
  detach(): void;
}

// ── Pure functions ──────────────────────────────────────

export function buildExportPayload(
  sessions: Session[],
  exportedBy: string,
): ExportFormatV1 {
  return {
    version: 1,
    exportedAt: Date.now(),
    exportedBy,
    sessions,
  };
}

export function validateImportPayload(data: unknown): data is ExportFormatV1 {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (typeof d.exportedAt !== "number") return false;
  if (typeof d.exportedBy !== "string") return false;
  if (!Array.isArray(d.sessions)) return false;

  return true;
}

function generateUUID(): string {
  // RFC 4122 v4 UUID
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
  hex[12] = "4";
  hex[16] = (8 + Math.floor(Math.random() * 4)).toString(16);
  return [
    hex.slice(0, 8).join(""),
    hex.slice(8, 12).join(""),
    hex.slice(12, 16).join(""),
    hex.slice(16, 20).join(""),
    hex.slice(20, 32).join(""),
  ].join("-");
}

export function resolveImportCollisions(sessions: Session[]): Session[] {
  const now = Date.now();
  return sessions.map((s) => ({
    ...s,
    id: generateUUID(),
    updatedAt: now,
    forkedFrom: null,
  }));
}

// ── Render ─────────────────────────────────────────────

export function renderSessionExportImport(options: SessionExportImportOptions): string {
  const { hasSelection } = options;

  const exportBtnClass = hasSelection
    ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
    : "text-neutral-500 border-neutral-700 opacity-50";

  return `<div class="session-export-import flex items-center gap-1.5 px-3 py-2 bg-neutral-950 border-b border-neutral-800 select-none">
    <button class="session-export-btn text-[11px] px-2 py-1 rounded border transition-colors ${exportBtnClass}" data-action="export-selected" type="button"${
      hasSelection ? "" : " disabled"
    }>
      Export
    </button>

    <button class="session-export-all-btn text-[11px] px-2 py-1 rounded border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors" data-action="export-all" type="button">
      Export All
    </button>

    <div class="flex-1"></div>

    <button class="session-import-btn text-[11px] px-2 py-1 rounded border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors" data-action="import-file" type="button">
      Import
    </button>

    <input type="file" accept="application/json,.json" class="session-import-input hidden" />

    <div class="session-import-dropzone hidden absolute inset-0 bg-neutral-950/90 border-2 border-dashed border-emerald-500/40 rounded flex items-center justify-center text-neutral-400 text-xs">
      Drop JSON file to import
    </div>
  </div>`;
}

// ── Controller ─────────────────────────────────────────

export function createSessionExportImportController(
  el: HTMLElement,
  options: SessionExportImportOptions,
): SessionExportImportController {
  const fileInput = el.querySelector<HTMLInputElement>('input[type="file"]')!;

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    const exportBtn = target.closest<HTMLElement>('[data-action="export-selected"]');
    if (exportBtn) {
      options.onExportSelected?.();
      return;
    }

    const exportAllBtn = target.closest<HTMLElement>('[data-action="export-all"]');
    if (exportAllBtn) {
      options.onExportAll?.();
      return;
    }

    const importBtn = target.closest<HTMLElement>('[data-action="import-file"]');
    if (importBtn) {
      fileInput.click();
      return;
    }
  }

  function onFileChange(e: Event): void {
    options.onImportFile?.(e);
  }

  return {
    attach(): void {
      el.addEventListener("click", onClick);
      fileInput.addEventListener("change", onFileChange);
    },

    detach(): void {
      el.removeEventListener("click", onClick);
      fileInput.removeEventListener("change", onFileChange);
    },
  };
}
