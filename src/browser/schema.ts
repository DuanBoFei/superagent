import { z } from "zod/v4";

export const browserConfigSchema = z.object({
  enabled: z.boolean().default(false),
  headless: z.boolean().default(true),
  defaultTimeoutMs: z.number().int().positive().default(30000),
  artifactDir: z.string().min(1).regex(/^(?!\.\.)(?!.*[\\/]\.\.[\\/]).*/).default(".superagent/browser-artifacts"),
  viewport: z.object({
    width: z.number().int().positive().default(1280),
    height: z.number().int().positive().default(720),
  }).default({ width: 1280, height: 720 }),
  network: z.enum(["enabled", "disabled"]).default("enabled"),
  captureScreenshots: z.boolean().default(true),
});
