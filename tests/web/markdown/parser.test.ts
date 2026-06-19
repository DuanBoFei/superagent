import { describe, expect, it } from "vitest";
import { detectPartialStructure, parseMarkdown, parsePartial } from "../../../packages/web/src/lib/markdown/parser";

const textValue = (node: { children?: Array<{ type: string; value?: string }> }) =>
  node.children?.find((child) => child.type === "text")?.value;

describe("parseMarkdown", () => {
  it("parses headings, emphasis, lists, and inline code", () => {
    const ast = parseMarkdown("# Title\n\nUse **bold**, *em*, and `code`.\n\n- [x] done\n- [ ] todo");

    expect(ast[0]).toMatchObject({ type: "heading", depth: 1 });
    expect(textValue(ast[0])).toBe("Title");

    const paragraph = ast[1];
    expect(paragraph?.type).toBe("paragraph");
    expect(paragraph?.children?.map((child) => child.type)).toContain("strong");
    expect(paragraph?.children?.map((child) => child.type)).toContain("emphasis");
    expect(paragraph?.children?.map((child) => child.type)).toContain("inlineCode");

    const list = ast[2];
    expect(list).toMatchObject({ type: "list", ordered: false });
    expect(list?.children?.[0]).toMatchObject({ type: "listItem", checked: true });
    expect(list?.children?.[1]).toMatchObject({ type: "listItem", checked: false });
  });

  it("parses fenced code blocks with language metadata", () => {
    const ast = parseMarkdown("```ts\nconst answer: number = 42;\n```");

    expect(ast).toEqual([
      {
        type: "codeBlock",
        value: "const answer: number = 42;",
        lang: "ts",
        meta: undefined,
      },
    ]);
  });

  it("parses GFM tables with alignment and header cells", () => {
    const ast = parseMarkdown("| Name | Value |\n| :--- | ---: |\n| foo | 1 |");

    expect(ast[0]).toMatchObject({ type: "table", align: ["left", "right"] });
    expect(ast[0]?.children?.[0]?.children?.[0]).toMatchObject({
      type: "tableCell",
      header: true,
      align: "left",
    });
    expect(ast[0]?.children?.[1]?.children?.[1]).toMatchObject({
      type: "tableCell",
      header: false,
      align: "right",
    });
  });

  it("parses links, images, blockquotes, and horizontal rules", () => {
    const ast = parseMarkdown('> See [docs](https://example.com)\n\n![Alt](https://example.com/image.png "Title")\n\n---');

    expect(ast[0]).toMatchObject({ type: "blockquote" });
    expect(ast[0]?.children?.[0]?.children?.some((child) => child.type === "link")).toBe(true);
    expect(ast[1]?.children?.[0]).toMatchObject({
      type: "image",
      url: "https://example.com/image.png",
      alt: "Alt",
      title: "Title",
    });
    expect(ast[2]).toMatchObject({ type: "thematicBreak" });
  });
});

describe("parsePartial", () => {
  it("returns AST and partial structure for incomplete streaming content", () => {
    const result = parsePartial("Intro\n\n```ts\nconst a = 1;");

    expect(result.partialStructure).toBe("inCodeBlock");
    expect(result.ast.at(-1)).toMatchObject({ type: "codeBlock", lang: "ts" });
  });
});

describe("detectPartialStructure", () => {
  it.each([
    ["```ts\nconst a = 1;", "inCodeBlock"],
    ["| Name | Value |\n| --- |", "inTable"],
    ["- first\n  - nested", "inList"],
    ["plain paragraph", "none"],
  ] as const)("detects %s as %s", (source, expected) => {
    expect(detectPartialStructure(source)).toBe(expected);
  });
});
