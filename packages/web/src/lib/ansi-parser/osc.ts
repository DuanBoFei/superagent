// OSC 8 hyperlink parsing
// Format: ESC ] 8 ; params ; uri ST (text) ESC ] 8 ; ; ST
// where params can include id=<id>
// and ST is ESC \ (BEL terminated also possible: ESC ] 8 ; params ; uri BEL)

export interface HyperlinkState {
  url: string | null;
  id: string | null;
  active: boolean;
}

// Parse OSC 8 parameters: e.g., "8;id=myid;https://example.com" or "8;;"
// Returns the parsed hyperlink info
export function parseOsc8(params: string): HyperlinkState | null {
  const parts = params.split(";");
  if (parts.length < 2 || parts[0] !== "8") return null;

  const urlPart = parts.length > 2 ? parts.slice(2).join(";") : parts[1] || "";
  const paramPart = parts[1] || "";

  // Extract optional id=... parameter
  let id: string | null = null;
  const idMatch = paramPart.match(/^id=(.+)$/);
  if (idMatch) {
    id = idMatch[1] || null;
  }

  const url = urlPart || null;
  return {
    url,
    id,
    active: url !== null,
  };
}

// Track hyperlink state across text processing
export interface OscHandler {
  currentLink: HyperlinkState | null;
  // Process an OSC command string (e.g., "8;;https://example.com")
  processOscCommand(params: string): void;
  // Get the current active hyperlink
  getActiveLink(): HyperlinkState | null;
  // Reset state
  reset(): void;
}

export function createOscHandler(): OscHandler {
  let currentLink: HyperlinkState | null = null;

  return {
    currentLink,

    processOscCommand(params: string): void {
      const parsed = parseOsc8(params);
      if (parsed) {
        if (parsed.active) {
          // Starting a hyperlink
          currentLink = parsed;
        } else {
          // Ending the current hyperlink (empty URL)
          currentLink = null;
        }
      }
    },

    getActiveLink(): HyperlinkState | null {
      return currentLink;
    },

    reset(): void {
      currentLink = null;
    },
  };
}

// Render a hyperlink as HTML anchor tag
export function renderHyperlink(url: string, text: string): string {
  const escapedUrl = escapeAttr(url);
  const escapedText = escapeHtml(text);
  return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="terminal-link">${escapedText}</a>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
