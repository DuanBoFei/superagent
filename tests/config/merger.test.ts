import { describe, expect, it } from "vitest";
import { mergeConfigs } from "../../src/config/merger";

describe("mergeConfigs", () => {
  it("scalar override: base value replaced by override", () => {
    expect(mergeConfigs({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  it("array merge: concatenated with dedup", () => {
    expect(mergeConfigs({ a: [1] }, { a: [2] })).toEqual({ a: [1, 2] });
  });

  it("array dedup: duplicates removed, first kept", () => {
    expect(mergeConfigs({ a: [1] }, { a: [1, 2] })).toEqual({ a: [1, 2] });
  });

  it("null reset: null in override clears value", () => {
    expect(mergeConfigs({ a: { b: 1 } }, { a: null })).toEqual({ a: null });
  });

  it("nested merge: deep objects merge recursively", () => {
    expect(mergeConfigs({ p: { a: 1 } }, { p: { b: 2 } })).toEqual({
      p: { a: 1, b: 2 },
    });
  });

  it("no mutation: input objects unchanged", () => {
    const base = { a: 1 };
    const override = { a: 2 };
    mergeConfigs(base, override);
    expect(base).toEqual({ a: 1 });
    expect(override).toEqual({ a: 2 });
  });

  it("prototype safety: __proto__ does not pollute Object.prototype", () => {
    mergeConfigs({}, JSON.parse('{"__proto__": {"polluted": true}}'));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
