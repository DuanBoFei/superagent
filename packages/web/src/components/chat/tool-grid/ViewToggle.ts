import type { ViewMode } from "../../../types/tool-grid";

export function renderViewToggle(viewMode: ViewMode): string {
  const gridActive = viewMode === "grid" ? " view-active-grid" : "";
  const listActive = viewMode === "list" ? " view-active-list" : "";
  const gridPressed = viewMode === "grid" ? "true" : "false";
  const listPressed = viewMode === "list" ? "true" : "false";

  return `<div class="view-toggle" role="group" aria-label="View mode">
  <button class="view-toggle-btn${gridActive}" data-action="set-view-grid" aria-label="Grid view" aria-pressed="${gridPressed}">Grid</button>
  <button class="view-toggle-btn${listActive}" data-action="set-view-list" aria-label="List view" aria-pressed="${listPressed}">List</button>
</div>`;
}
