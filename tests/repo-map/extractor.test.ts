import { describe, expect, it } from "vitest";
import { extractSymbols } from "../../src/repo-map/extractor";
import type { CodeSymbol } from "../../src/repo-map/types";

function symNames(symbols: CodeSymbol[]): string[] {
  return symbols.map((s) => s.name);
}
function symKinds(symbols: CodeSymbol[]): string[] {
  return symbols.map((s) => s.kind);
}

describe("extractor: import extraction (T011)", () => {
  it("extracts ESM default imports", () => {
    const result = extractSymbols("src/app.ts", `import React from "react";`);
    expect(result.imports).toContain("react");
  });

  it("extracts ESM named imports", () => {
    const result = extractSymbols("src/app.ts", `import { useState, useEffect } from "react";`);
    expect(result.imports).toContain("react");
  });

  it("extracts ESM side-effect imports", () => {
    const result = extractSymbols("src/app.ts", `import "./styles.css";`);
    expect(result.imports).toContain("./styles.css");
  });

  it("extracts dynamic imports", () => {
    const result = extractSymbols("src/app.ts", `const mod = await import("./lazy");`);
    expect(result.imports).toContain("./lazy");
  });

  it("extracts CommonJS require", () => {
    const result = extractSymbols("src/app.ts", `const fs = require("fs");`);
    expect(result.imports).toContain("fs");
  });

  it("extracts multiple imports from the same file", () => {
    const result = extractSymbols("src/app.ts", `
import React from "react";
import { render } from "react-dom";
import "./init";
    `);
    expect(result.imports).toEqual(expect.arrayContaining(["react", "react-dom", "./init"]));
  });
});

describe("extractor: export extraction (T012)", () => {
  it("extracts exported function names", () => {
    const result = extractSymbols("src/app.ts", `export function hello() {}`);
    expect(result.exports).toContain("hello");
  });

  it("extracts exported const names", () => {
    const result = extractSymbols("src/app.ts", `export const API_URL = "/api";`);
    expect(result.exports).toContain("API_URL");
  });

  it("extracts exported class names", () => {
    const result = extractSymbols("src/app.ts", `export class MyService {}`);
    expect(result.exports).toContain("MyService");
  });

  it("extracts default export function", () => {
    const result = extractSymbols("src/app.ts", `export default function main() {}`);
    expect(result.exports).toContain("default");
  });

  it("extracts default export class", () => {
    const result = extractSymbols("src/app.ts", `export default class App {}`);
    expect(result.exports).toContain("default");
  });

  it("extracts named re-exports", () => {
    const result = extractSymbols("src/app.ts", `export { foo, bar } from "./lib";`);
    expect(result.exports).toContain("foo");
    expect(result.exports).toContain("bar");
  });
});

describe("extractor: top-level function symbols (T013)", () => {
  it("extracts named function declarations", () => {
    const result = extractSymbols("src/app.ts", `function doThing() {}`);
    const fns = result.symbols.filter((s) => s.kind === "function");
    expect(symNames(fns)).toContain("doThing");
  });

  it("extracts arrow function assigned to const", () => {
    const result = extractSymbols("src/app.ts", `const handler = () => {};`);
    const fns = result.symbols.filter((s) => s.kind === "function");
    expect(symNames(fns)).toContain("handler");
  });

  it("extracts async functions", () => {
    const result = extractSymbols("src/app.ts", `async function fetchData() {}`);
    const fns = result.symbols.filter((s) => s.kind === "function");
    expect(symNames(fns)).toContain("fetchData");
  });

  it("extracts generator functions", () => {
    const result = extractSymbols("src/app.ts", `function* generator() {}`);
    const fns = result.symbols.filter((s) => s.kind === "function");
    expect(symNames(fns)).toContain("generator");
  });

  it("extracts exported functions in symbols too", () => {
    const result = extractSymbols("src/app.ts", `export function init() {}`);
    const fns = result.symbols.filter((s) => s.kind === "function");
    expect(symNames(fns)).toContain("init");
    expect(result.exports).toContain("init");
  });
});

describe("extractor: top-level class symbols (T014)", () => {
  it("extracts class declarations", () => {
    const result = extractSymbols("src/app.ts", `class UserController {}`);
    const classes = result.symbols.filter((s) => s.kind === "class");
    expect(symNames(classes)).toContain("UserController");
  });

  it("extracts exported classes", () => {
    const result = extractSymbols("src/app.ts", `export class Repository {}`);
    const classes = result.symbols.filter((s) => s.kind === "class");
    expect(symNames(classes)).toContain("Repository");
    expect(result.exports).toContain("Repository");
  });
});

describe("extractor: const/type/interface/enum symbols (T015)", () => {
  it("extracts const declarations", () => {
    const result = extractSymbols("src/app.ts", `const MAX = 100;`);
    const consts = result.symbols.filter((s) => s.kind === "const");
    expect(symNames(consts)).toContain("MAX");
  });

  it("extracts let declarations", () => {
    const result = extractSymbols("src/app.ts", `let counter = 0;`);
    const vars = result.symbols.filter((s) => s.kind === "let");
    expect(symNames(vars)).toContain("counter");
  });

  it("extracts type aliases", () => {
    const result = extractSymbols("src/app.ts", `type UserId = string;`);
    const types = result.symbols.filter((s) => s.kind === "type");
    expect(symNames(types)).toContain("UserId");
  });

  it("extracts interface declarations", () => {
    const result = extractSymbols("src/app.ts", `interface IConfig { port: number; }`);
    const ifaces = result.symbols.filter((s) => s.kind === "interface");
    expect(symNames(ifaces)).toContain("IConfig");
  });

  it("extracts enum declarations", () => {
    const result = extractSymbols("src/app.ts", `enum Color { Red, Green, Blue }`);
    const enums = result.symbols.filter((s) => s.kind === "enum");
    expect(symNames(enums)).toContain("Color");
  });
});

describe("extractor: generic text fallback (T016)", () => {
  it("detects language from extension", () => {
    const ts = extractSymbols("src/app.ts", `const x = 1;`);
    expect(ts.language).toBe("typescript");

    const js = extractSymbols("src/app.js", `const x = 1;`);
    expect(js.language).toBe("javascript");

    const py = extractSymbols("src/app.py", `def foo(): pass`);
    expect(py.language).toBe("python");

    const unknown = extractSymbols("data.txt", `some text`);
    expect(unknown.language).toBe("text");
  });

  it("returns empty symbols for non-TS/JS but still provides summary", () => {
    const result = extractSymbols("readme.md", "# Project Title\n\nDescription");
    expect(result.symbols).toEqual([]);
    expect(result.imports).toEqual([]);
    expect(result.exports).toEqual([]);
    expect(result.summary).toBeTruthy();
  });

  it("summary is first meaningful lines of content", () => {
    const result = extractSymbols("src/app.ts", `
      import { x } from "y";
      // some comment
      export function main() {
        return 42;
      }
    `);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeLessThanOrEqual(300);
  });

  it("handles empty content", () => {
    const result = extractSymbols("empty.ts", "");
    expect(result.language).toBe("typescript");
    expect(result.symbols).toEqual([]);
    expect(result.summary).toBe("");
  });

  it("identifies TSX/JSX language", () => {
    const tsx = extractSymbols("app.tsx", `export const App = () => <div/>;`);
    expect(tsx.language).toBe("tsx");
  });
});
