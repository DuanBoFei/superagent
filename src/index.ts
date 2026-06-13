#!/usr/bin/env node
import { getConfig } from "./config/config";
import { ConfigError } from "./config/types";
import { createRuntime } from "./runtime/runtime";
import { startRepl } from "./cli/repl";

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
      process.stdout.write(`SuperAgent · ${config.model} (resumed: ${resumeSessionId})\n`);
      for await (const event of runtime.resumeSession(resumeSessionId)) {
        if (event.type === "text") {
          process.stdout.write(event.content);
        }
        if (event.type === "error") {
          process.stderr.write(`✗ ${event.message}\n`);
        }
      }
      process.stdout.write("\n");
      process.exit(0);
    }

    await startRepl(runtime, config);
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
