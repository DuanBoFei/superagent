#!/usr/bin/env node
import { getConfig } from "./config/config";
import { ConfigError } from "./config/types";

function main(): void {
  try {
    const { config, warnings } = getConfig();

    for (const w of warnings) {
      process.stderr.write(`${w}\n`);
    }

    process.stdout.write(`${config.model}\n`);
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
