/**
 * Serves the card fixture page for Playwright visual regression testing.
 * Run: npx tsx tests/web/serve-fixture.ts
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const PORT = 4321;
const FIXTURE_DIR = resolve(import.meta.dirname ?? __dirname, "../../.fixtures");
const FIXTURE_PATH = resolve(FIXTURE_DIR, "cards-fixture.html");

// Generate the fixture HTML file
async function generateFixtureHtml(): Promise<string> {
  const { generateFixtureHtml } = await import("./card-fixtures");
  return generateFixtureHtml();
}

async function main() {
  // Ensure fixture directory exists
  if (!existsSync(FIXTURE_DIR)) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
  }

  const html = await generateFixtureHtml();
  writeFileSync(FIXTURE_PATH, html, "utf-8");
  console.log(`[serve-fixture] Generated fixture: ${FIXTURE_PATH} (${html.length} bytes)`);

  const server = createServer((_req, res) => {
    const content = readFileSync(FIXTURE_PATH, "utf-8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
  });

  server.listen(PORT, () => {
    console.log(`[serve-fixture] Serving at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start fixture server:", err);
  process.exit(1);
});
