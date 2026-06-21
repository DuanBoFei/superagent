/**
 * Serves the card + ToolGrid + Sidebar fixture pages for Playwright testing.
 * Run: npx tsx tests/web/serve-fixture.ts
 *
 * Routes:
 *   /            → 028 card fixtures (cards-fixture.html)
 *   /tool-grid   → 031 ToolGrid fixtures (tool-grid-fixture.html)
 *   /sidebar     → 032 Sidebar fixtures (sidebar-fixture.html)
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const PORT = 4321;
const FIXTURE_DIR = resolve(import.meta.dirname ?? __dirname, "../../.fixtures");
const FIXTURE_PATH = resolve(FIXTURE_DIR, "cards-fixture.html");
const TOOL_GRID_FIXTURE_PATH = resolve(FIXTURE_DIR, "tool-grid-fixture.html");
const SIDEBAR_FIXTURE_PATH = resolve(FIXTURE_DIR, "sidebar-fixture.html");

async function generateCardsHtml(): Promise<string> {
  const { generateFixtureHtml } = await import("./card-fixtures");
  return generateFixtureHtml();
}

async function generateToolGridHtml(): Promise<string> {
  const { generateToolGridFixtureHtml } = await import("./tool-grid-fixtures");
  return generateToolGridFixtureHtml();
}

async function generateSidebarHtml(): Promise<string> {
  const { generateSidebarFixtureHtml } = await import("./sidebar-fixtures");
  return generateSidebarFixtureHtml();
}

async function main() {
  if (!existsSync(FIXTURE_DIR)) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
  }

  const cardsHtml = await generateCardsHtml();
  writeFileSync(FIXTURE_PATH, cardsHtml, "utf-8");
  console.log(`[serve-fixture] Generated cards fixture: ${FIXTURE_PATH} (${cardsHtml.length} bytes)`);

  const toolGridHtml = await generateToolGridHtml();
  writeFileSync(TOOL_GRID_FIXTURE_PATH, toolGridHtml, "utf-8");
  console.log(`[serve-fixture] Generated ToolGrid fixture: ${TOOL_GRID_FIXTURE_PATH} (${toolGridHtml.length} bytes)`);

  const sidebarHtml = await generateSidebarHtml();
  writeFileSync(SIDEBAR_FIXTURE_PATH, sidebarHtml, "utf-8");
  console.log(`[serve-fixture] Generated Sidebar fixture: ${SIDEBAR_FIXTURE_PATH} (${sidebarHtml.length} bytes)`);

  const routeMap: Record<string, string> = {
    "/": FIXTURE_PATH,
    "/tool-grid": TOOL_GRID_FIXTURE_PATH,
    "/sidebar": SIDEBAR_FIXTURE_PATH,
  };

  const server = createServer((req, res) => {
    const path = routeMap[req.url ?? ""] ?? FIXTURE_PATH;
    const content = readFileSync(path, "utf-8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
  });

  server.listen(PORT, () => {
    console.log(`[serve-fixture] Serving at http://localhost:${PORT}`);
    console.log(`[serve-fixture]   /           → cards fixture`);
    console.log(`[serve-fixture]   /tool-grid  → ToolGrid fixture`);
    console.log(`[serve-fixture]   /sidebar    → Sidebar fixture`);
  });
}

main().catch((err) => {
  console.error("Failed to start fixture server:", err);
  process.exit(1);
});
