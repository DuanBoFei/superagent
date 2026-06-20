import { describe, expect, it } from "vitest";
import {
  createOscHandler,
  parseOsc8,
  renderHyperlink,
} from "../../../../packages/web/src/lib/ansi-parser/osc";
import type { OscHandler } from "../../../../packages/web/src/lib/ansi-parser/osc";

describe("ansi OSC hyperlink processor", () => {
  describe("parseOsc8", () => {
    it("parses a basic OSC 8 hyperlink with URL", () => {
      const result = parseOsc8("8;;https://example.com");
      expect(result).not.toBeNull();
      if (result) {
        expect(result.url).toBe("https://example.com");
        expect(result.id).toBeNull();
        expect(result.active).toBe(true);
      }
    });

    it("parses OSC 8 hyperlink with id parameter", () => {
      const result = parseOsc8("8;id=my-link;https://example.com");
      expect(result).not.toBeNull();
      if (result) {
        expect(result.url).toBe("https://example.com");
        expect(result.id).toBe("my-link");
        expect(result.active).toBe(true);
      }
    });

    it("parses OSC 8 termination (empty URL)", () => {
      const result = parseOsc8("8;;");
      expect(result).not.toBeNull();
      if (result) {
        expect(result.url).toBeNull();
        expect(result.active).toBe(false);
        expect(result.id).toBeNull();
      }
    });

    it("parses OSC 8 termination with id", () => {
      const result = parseOsc8("8;id=my-link;");
      expect(result).not.toBeNull();
      if (result) {
        expect(result.url).toBeNull();
        expect(result.active).toBe(false);
        expect(result.id).toBe("my-link");
      }
    });

    it("returns null for non-OSC 8 sequences", () => {
      expect(parseOsc8("0;title")).toBeNull();
      expect(parseOsc8("7;current-directory")).toBeNull();
    });

    it("returns null for malformed input", () => {
      expect(parseOsc8("")).toBeNull();
    });

    it("handles URLs with semicolons in the URI", () => {
      // URL like data:text/html,<div>test</div> could contain weird chars
      const result = parseOsc8("8;;https://example.com/path?q=1;2");
      expect(result).not.toBeNull();
      if (result) {
        expect(result.url).toContain("https://example.com/path?q=1;2");
      }
    });

    it("handles id parameter with empty id value", () => {
      const result = parseOsc8("8;id=;https://example.com");
      expect(result).not.toBeNull();
      if (result) {
        expect(result.url).toBe("https://example.com");
        expect(result.id).toBeNull(); // empty string treated as null
      }
    });
  });

  describe("createOscHandler — stateful tracking", () => {
    it("starts with no active link", () => {
      const handler = createOscHandler();
      expect(handler.getActiveLink()).toBeNull();
    });

    it("tracks link activation and deactivation", () => {
      const handler = createOscHandler();
      handler.processOscCommand("8;;https://example.com");
      expect(handler.getActiveLink()).not.toBeNull();
      expect(handler.getActiveLink()!.url).toBe("https://example.com");

      handler.processOscCommand("8;;");
      expect(handler.getActiveLink()).toBeNull();
    });

    it("tracks id across link lifecycle", () => {
      const handler = createOscHandler();
      handler.processOscCommand("8;id=ref42;https://example.com");
      expect(handler.getActiveLink()!.id).toBe("ref42");

      handler.processOscCommand("8;id=ref42;");
      expect(handler.getActiveLink()).toBeNull();
    });

    it("reset clears active link", () => {
      const handler = createOscHandler();
      handler.processOscCommand("8;;https://example.com");
      expect(handler.getActiveLink()).not.toBeNull();
      handler.reset();
      expect(handler.getActiveLink()).toBeNull();
    });

    it("ignores non-OSC 8 commands without crashing", () => {
      const handler = createOscHandler();
      handler.processOscCommand("0;SuperAgent Terminal");
      handler.processOscCommand("7;current-directory");
      expect(handler.getActiveLink()).toBeNull();
    });
  });

  describe("renderHyperlink", () => {
    it("renders a clickable anchor tag", () => {
      const result = renderHyperlink("https://example.com", "Click here");
      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain("Click here");
      expect(result).toContain("</a>");
    });

    it("escapes HTML in link text", () => {
      const result = renderHyperlink("https://example.com", "<script>alert('xss')</script>");
      expect(result).toContain("&lt;script&gt;");
      expect(result).not.toContain("<script>");
    });

    it("escapes double quotes in URL attribute", () => {
      const result = renderHyperlink("https://example.com?q=\"test\"", "link");
      expect(result).toContain("&quot;");
      expect(result).toContain('href="https://example.com?q=&quot;test&quot;"');
    });

    it("renders with terminal-link CSS class", () => {
      const result = renderHyperlink("https://example.com", "text");
      expect(result).toContain('class="terminal-link"');
    });
  });
});
