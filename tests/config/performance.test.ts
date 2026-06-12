import { describe, expect, it } from "vitest";

describe("Config loading performance", () => {
  it("getConfig completes within 100ms", async () => {
    const envBackup = process.env.SUPERAGENT_API_KEY;
    const homeBackup = process.env.HOME;
    const userProfileBackup = process.env.USERPROFILE;
    process.env.SUPERAGENT_API_KEY = "sk-perf-test";
    process.env.HOME = "/nonexistent-home";
    process.env.USERPROFILE = "/nonexistent-home";

    try {
      const { getConfig } = await import("../../src/config/config.js");
      const start = performance.now();
      getConfig();
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    } finally {
      if (envBackup !== undefined) {
        process.env.SUPERAGENT_API_KEY = envBackup;
      } else {
        delete process.env.SUPERAGENT_API_KEY;
      }
      if (homeBackup !== undefined) {
        process.env.HOME = homeBackup;
      } else {
        delete process.env.HOME;
      }
      if (userProfileBackup !== undefined) {
        process.env.USERPROFILE = userProfileBackup;
      } else {
        delete process.env.USERPROFILE;
      }
    }
  });

  it("fast path: 10 sequential getConfig calls all under 100ms", async () => {
    const envBackup = process.env.SUPERAGENT_API_KEY;
    const homeBackup = process.env.HOME;
    const userProfileBackup = process.env.USERPROFILE;
    process.env.SUPERAGENT_API_KEY = "sk-perf-test";
    process.env.HOME = "/nonexistent-home";
    process.env.USERPROFILE = "/nonexistent-home";

    try {
      const { getConfig } = await import("../../src/config/config.js");

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        getConfig();
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(100);
      }
    } finally {
      if (envBackup !== undefined) {
        process.env.SUPERAGENT_API_KEY = envBackup;
      } else {
        delete process.env.SUPERAGENT_API_KEY;
      }
      if (homeBackup !== undefined) {
        process.env.HOME = homeBackup;
      } else {
        delete process.env.HOME;
      }
      if (userProfileBackup !== undefined) {
        process.env.USERPROFILE = userProfileBackup;
      } else {
        delete process.env.USERPROFILE;
      }
    }
  });
});
