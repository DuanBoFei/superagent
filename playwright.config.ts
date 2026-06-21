import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/web",
  testMatch: "**/*.pwtest.ts",
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  snapshotDir: "./tests/web/__snapshots__",
  snapshotPathTemplate: "{snapshotDir}/{testFilePath}/{projectName}/{arg}{ext}",
  use: {
    baseURL: "http://localhost:3456",
    colorScheme: "dark",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "firefox-desktop",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: {
    command: "pnpm -C packages/web dev --port 3456",
    url: "http://localhost:3456",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
