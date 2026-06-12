#!/usr/bin/env node
import { getConfig } from "./config/config";
import { ConfigError } from "./config/types";
import { createRuntime } from "./runtime/runtime";

async function main(): Promise<void> {
  try {
    const { config, warnings } = getConfig();

    for (const w of warnings) {
      process.stderr.write(`[WARN] ${w}\n`);
    }

    const runtime = createRuntime({ maxTurns: config.maxTurns });

    const resumeSessionId = process.argv.includes("--resume")
      ? process.argv[process.argv.indexOf("--resume") + 1] ?? "default-session"
      : null;

    if (resumeSessionId) {
      process.stdout.write(`SuperAgent ready (resumed: ${resumeSessionId})\n`);
      const stream = runtime.resumeSession(resumeSessionId);
      for await (const event of stream) {
        if (event.type === "text") {
          process.stdout.write(event.content);
        }
      }
    } else {
      process.stdout.write("SuperAgent ready\n");
      // Hardcoded message for MVP wiring — replaced by REPL in 008-cli-repl
      const stream = runtime.startTurn("Hello");
      for await (const event of stream) {
        if (event.type === "text") {
          process.stdout.write(event.content);
        }
      }
    }

    process.stdout.write("\n");
    process.exit(0);
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`Fatal: ${e.message}\n`);
      process.exit(1);
    }
    throw e;
  }
}

main();
