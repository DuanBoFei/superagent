import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../../packages/web/src/utils/dompurify";
import { createMessageId } from "../../packages/web/src/utils/uuid";

describe("web sanitizing and ids", () => {
  it("removes scripts and unsafe attributes", () => {
    expect(sanitizeHtml('<p onclick="alert(1)">safe<script>alert(1)</script></p>')).toBe("<p>safe</p>");
    expect(sanitizeHtml('<a href="javascript:alert(1)">bad</a>')).toBe("<a>bad</a>");
  });

  it("creates unique browser-safe message ids", () => {
    const first = createMessageId();
    const second = createMessageId();

    expect(first).toMatch(/^msg_[\w-]+$/);
    expect(second).toMatch(/^msg_[\w-]+$/);
    expect(first).not.toBe(second);
  });
});
