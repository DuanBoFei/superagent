import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/session-a11y-audit.pwtest.ts",
  timeout: 30000,
  expect: { timeout: 10000 },
  use: { colorScheme: "dark" },
  projects: [{
    name: "chromium-desktop",
    use: { viewport: { width: 1280, height: 900 } },
  }],
});
