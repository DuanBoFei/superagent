import { describe, expect, it } from "vitest";
import { createMarkdownStream } from "../../../packages/web/src/hooks/use-markdown-stream";

describe("createMarkdownStream", () => {
  it("appends tokens and exposes partial markdown state", () => {
    const stream = createMarkdownStream();

    stream.appendToken("## Title\n\n");
    stream.appendToken("```ts\nconst answer = 42;");

    const state = stream.getState();
    expect(state.rawContent).toBe("## Title\n\n```ts\nconst answer = 42;");
    expect(state.partialStructure).toBe("inCodeBlock");
    expect(state.ast).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "heading", depth: 2 }),
        expect.objectContaining({ type: "codeBlock", lang: "ts", value: "const answer = 42;" }),
      ]),
    );
  });

  it("re-parses complete content on finish", () => {
    const stream = createMarkdownStream();

    stream.appendToken("- first\n");
    stream.appendToken("- second");
    const finalState = stream.finish();

    expect(finalState.partialStructure).toBe("none");
    expect(finalState.ast).toEqual([
      expect.objectContaining({
        type: "list",
        children: [
          expect.objectContaining({ type: "listItem" }),
          expect.objectContaining({ type: "listItem" }),
        ],
      }),
    ]);
  });
});
