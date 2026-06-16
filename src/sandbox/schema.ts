import { z } from "zod/v4";

export const sandboxConfigSchema = z.object({
  enabled: z.boolean().default(false),
  type: z.literal("docker").default("docker"),
  image: z.string().min(1).optional(),
  workspaceMount: z.string().regex(/^\//).default("/workspace"),
  network: z.enum(["none", "host"]).default("none"),
  envAllowlist: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).default({}),
  pullPolicy: z.enum(["never", "missing", "always"]).default("never"),
  timeoutMs: z.number().int().positive().default(120000),
  memoryMb: z.number().int().positive().optional(),
  cpus: z.number().positive().optional(),
}).superRefine((config, ctx) => {
  if (config.enabled && !config.image) {
    ctx.addIssue({
      code: "custom",
      path: ["image"],
      message: "sandbox.image is required when sandbox is enabled",
    });
  }
});
