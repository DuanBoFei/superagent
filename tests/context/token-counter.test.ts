import { describe, expect, it } from "vitest";
import { estimateTokens, trackUsage, getLastUsage } from "../../src/context/token-counter";

describe("Token Counter", () => {
  describe("estimateTokens", () => {
    it("estimates ASCII text as ceil(chars/4)", () => {
      expect(estimateTokens("hello")).toBe(2); // 5/4 = 1.25 → 2
    });

    it("estimates an empty string as 0", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("estimates CJK text as ceil(chars/4)", () => {
      expect(estimateTokens("你好世界")).toBe(1); // 4/4 = 1
    });

    it("estimates a long sentence correctly", () => {
      // 40 chars → 10 tokens
      expect(estimateTokens("a".repeat(40))).toBe(10);
    });

    it("handles odd-length strings", () => {
      expect(estimateTokens("abc")).toBe(1); // 3/4 = 0.75 → 1
      expect(estimateTokens("abcde")).toBe(2); // 5/4 = 1.25 → 2
    });

    it("handles emoji (over-estimates for safety)", () => {
      // "😀" is 2 JS chars (surrogate pair), so 2/4 = 0.5 → 1
      expect(estimateTokens("😀")).toBe(1);
    });

    it("handles mixed content", () => {
      // "hello世界" = 7 chars → ceil(7/4) = 2
      expect(estimateTokens("hello世界")).toBe(2);
    });
  });

  describe("trackUsage / getLastUsage", () => {
    it("returns null initially", () => {
      expect(getLastUsage()).toBeNull();
    });

    it("tracks and returns usage", () => {
      trackUsage({ input_tokens: 1000, output_tokens: 200 });
      expect(getLastUsage()).toEqual({
        input_tokens: 1000,
        output_tokens: 200,
      });
    });

    it("overwrites previous usage", () => {
      trackUsage({ input_tokens: 500, output_tokens: 50 });
      expect(getLastUsage()).toEqual({
        input_tokens: 500,
        output_tokens: 50,
      });
    });
  });
});
