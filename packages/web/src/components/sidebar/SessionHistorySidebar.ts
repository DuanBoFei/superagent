import type { SessionHistorySlice } from "../../store/slices/session-history.slice";
import { escapeAttr } from "./escape";

export interface SidebarRenderOptions {
  slice: SessionHistorySlice;
}

export interface SidebarControllerOptions {
  slice: SessionHistorySlice;
  mainContentEl: HTMLElement;
}

export interface SidebarController {
  attach(): void;
  detach(): void;
  updateWidth(width: number): void;
}

const OVERLAY_BREAKPOINT = 768;

export function renderSessionHistorySidebar(options: SidebarRenderOptions): string {
  const slice = options.slice;
  const open = slice.getSidebarOpen();
  const width = slice.getSidebarWidth();
  const mode = sidebarMode(slice);

  const visibilityClass = open ? "translate-x-0" : "-translate-x-full";
  const zClass = mode === "overlay" ? "z-50 shadow-2xl" : "z-30";
  const widthStyle = `width:${width}px`;

  return `<style>@media(prefers-reduced-motion:reduce){.motion-reduce,.motion-reduce *,.motion-reduce::before,.motion-reduce::after{transition-duration:0s!important;animation-duration:0s!important}}</style>
  <aside class="session-sidebar motion-reduce fixed left-0 top-0 h-full flex flex-col bg-neutral-950 border-r border-zinc-800 transition-transform duration-150 ease-out ${visibilityClass} ${zClass}" style="${escapeAttr(widthStyle)}" data-sidebar-open="${open ? "1" : "0"}" data-sidebar-mode="${escapeAttr(mode)}" data-sidebar-width="${width}" role="complementary" aria-label="Session history" aria-expanded="${open ? "true" : "false"}">
  <div class="sidebar-drag-handle absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-emerald-500/50 transition-colors z-10" data-action="drag-handle" aria-hidden="true"></div>
  <div class="sidebar-header flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
    <span class="text-sm font-semibold text-emerald-400 tracking-tight">SuperAgent</span>
    <button type="button" class="sidebar-close-btn text-zinc-400 hover:text-zinc-300 transition-colors p-1 rounded" data-action="close-sidebar" aria-label="Close sidebar">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l8 8M12 4l-8 8"/></svg>
    </button>
  </div>
  <div class="sidebar-body flex-1 overflow-hidden" data-sidebar-body></div>
</aside>`;
}

export function createSessionHistorySidebarController(
  options: SidebarControllerOptions,
): SidebarController {
  const { slice, mainContentEl } = options;

  let sidebarEl: HTMLElement | null = null;
  let dragHandle: HTMLElement | null = null;
  let closeBtn: HTMLElement | null = null;
  let dragging = false;
  let dragStartX = 0;
  let dragStartWidth = 0;
  let mediaQuery: MediaQueryList | null = null;

  function findElements(): boolean {
    sidebarEl = document.querySelector<HTMLElement>(".session-sidebar");
    if (!sidebarEl) return false;
    dragHandle = sidebarEl.querySelector<HTMLElement>('[data-action="drag-handle"]');
    closeBtn = sidebarEl.querySelector<HTMLElement>('[data-action="close-sidebar"]');
    return true;
  }

  function sidebarMode(s: SessionHistorySlice, viewportW?: number): "dock" | "overlay" {
    const vw = viewportW ?? (typeof window !== "undefined" ? window.innerWidth : 1024);
    if (vw < OVERLAY_BREAKPOINT) return "overlay";
    return s.getSidebarMode();
  }

  function onDragStart(e: MouseEvent): void {
    e.preventDefault();
    dragging = true;
    dragStartX = e.clientX;
    dragStartWidth = slice.getSidebarWidth();
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function onDragMove(e: MouseEvent): void {
    if (!dragging) return;
    const delta = e.clientX - dragStartX;
    const newWidth = dragStartWidth + delta;
    slice.setSidebarWidth(newWidth);
    if (sidebarEl) {
      sidebarEl.style.width = `${slice.getSidebarWidth()}px`;
      sidebarEl.setAttribute(
        "data-sidebar-width",
        String(slice.getSidebarWidth()),
      );
    }
  }

  function onDragEnd(): void {
    dragging = false;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  function onCloseClick(): void {
    slice.toggleSidebar();
    updateVisibility();
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape" && slice.getSidebarOpen()) {
      slice.toggleSidebar();
      updateVisibility();
    }
  }

  function onMediaChange(e: MediaQueryListEvent | MediaQueryList): void {
    const mode = sidebarMode(slice, typeof window !== "undefined" ? window.innerWidth : undefined);
    if (mode === "overlay" && slice.getSidebarMode() === "dock") {
      if (sidebarEl) {
        sidebarEl.classList.add("z-50", "shadow-2xl");
        sidebarEl.classList.remove("z-30");
        sidebarEl.setAttribute("data-sidebar-mode", "overlay");
      }
    }
  }

  function updateVisibility(): void {
    if (!sidebarEl) return;
    const open = slice.getSidebarOpen();
    if (open) {
      sidebarEl.classList.remove("-translate-x-full");
      sidebarEl.classList.add("translate-x-0");
    } else {
      sidebarEl.classList.remove("translate-x-0");
      sidebarEl.classList.add("-translate-x-full");
    }
    sidebarEl.setAttribute("data-sidebar-open", open ? "1" : "0");
  }

  return {
    attach(): void {
      if (!findElements()) return;

      dragHandle?.addEventListener("mousedown", onDragStart);
      closeBtn?.addEventListener("click", onCloseClick);
      document.addEventListener("keydown", onKeyDown);

      mediaQuery = window.matchMedia(`(max-width: ${OVERLAY_BREAKPOINT - 1}px)`);
      mediaQuery.addEventListener("change", onMediaChange as (e: MediaQueryListEvent) => void);
      onMediaChange(mediaQuery);
    },

    detach(): void {
      dragHandle?.removeEventListener("mousedown", onDragStart);
      closeBtn?.removeEventListener("click", onCloseClick);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragEnd);
      if (mediaQuery) {
        mediaQuery.removeEventListener("change", onMediaChange as (e: MediaQueryListEvent) => void);
      }
      dragHandle = null;
      closeBtn = null;
      sidebarEl = null;
      mediaQuery = null;
    },

    updateWidth(width: number): void {
      if (sidebarEl) {
        sidebarEl.style.width = `${width}px`;
        sidebarEl.setAttribute("data-sidebar-width", String(width));
      }
    },
  };
}

function sidebarMode(slice: SessionHistorySlice): "dock" | "overlay" {
  if (typeof window !== "undefined" && window.innerWidth < OVERLAY_BREAKPOINT) return "overlay";
  return slice.getSidebarMode();
}
