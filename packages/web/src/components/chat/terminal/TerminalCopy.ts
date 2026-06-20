// Terminal copy button and text extraction helpers.
// Copy action is handled by client-side JS via data-action="copy-terminal".
// Raw text is stored in data-terminal-content for clipboard access.

export function renderCopyButton(): string {
  return `<button type="button" class="terminal-copy-btn text-xs text-neutral-500 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded px-2 py-1 transition-colors absolute top-2 right-2 z-10" data-action="copy-terminal" aria-label="Copy terminal output">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block mr-1"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    Copy
  </button>`;
}

// Strip ANSI escape sequences and HTML tags to get plain text.
export function stripAnsiForCopy(content: string): string {
  // Strip ANSI escape sequences
  return content
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
    .replace(/\x1b\][0-9;]*[^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x07/g, "");
}

// Escape raw text for use in HTML data attribute
export function escapeForDataAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "&#10;")
    .replace(/\r/g, "&#13;");
}
