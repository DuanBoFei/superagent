import type { TerminalLine } from "../../../types/terminal";
import { renderTerminalFromLines } from "./TerminalRenderer";

// Renders a collapsible banner for alternate screen content.
// Displayed after exitAlternateScreen() when saved content is available.
export function renderAlternateScreenBanner(
  savedLines: TerminalLine[],
): string {
  if (savedLines.length === 0) return "";

  const lineCount = savedLines.length;
  const content = renderTerminalFromLines(savedLines, {
    maxLines: 500,
    fontSize: 12,
  });

  return `<div class="alternate-screen-banner bg-neutral-800/60 rounded border border-neutral-700 mt-2" role="region" aria-label="Saved full-screen output" data-collapsed="true">
    <button type="button" class="alternate-screen-toggle flex items-center gap-2 w-full px-3 py-2 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 rounded-t transition-colors" data-action="toggle-alternate-screen" aria-expanded="false">
      <span class="alternate-screen-chevron inline-block transition-transform">&#9654;</span>
      <span>Full-screen application output</span>
      <span class="text-neutral-500">(${lineCount} lines)</span>
      <span class="ml-auto text-neutral-500 text-[11px]">Show full-screen output</span>
    </button>
    <div class="alternate-screen-content hidden px-3 pb-3">
      ${content}
    </div>
  </div>`;
}
