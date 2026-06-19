#!/usr/bin/env node
import { getConfig } from "./config/config";
import { ConfigError } from "./config/types";
import { createRuntime } from "./runtime/runtime";
import { listSessions } from "./runtime/stubs/session";
import { startRepl } from "./cli/repl";
import { parseCliMode } from "./cli/args";
import { detectTerminalProfile } from "./cli/terminal-profile";
import { runOneShot } from "./cli/one-shot";
import { startWebCommand } from "./cli/web";
import { createObservability } from "./observability/index";
import { discoverSkills } from "./skills/discovery";

async function main(): Promise<void> {
  try {
    const { config, warnings } = getConfig();

    for (const w of warnings) {
      process.stderr.write(`[WARN] ${w}\n`);
    }

    if (process.argv.includes("--list")) {
      const sessions = listSessions();
      if (sessions.length === 0) {
        process.stdout.write("No saved sessions.\n");
      } else {
        for (const s of sessions) {
          process.stdout.write(`${s.id}\t${s.date}\t${s.turns} turns\t${s.firstMessage}\n`);
        }
      }
      process.exit(0);
    }

    const sessionId = process.argv.includes("--resume")
      ? process.argv[process.argv.indexOf("--resume") + 1] ?? crypto.randomUUID()
      : crypto.randomUUID();

    const obs = createObservability(config, sessionId, {
      verbose: process.argv.includes("--verbose"),
    });

    obs.emit({
      type: "session:start",
      sessionId,
      config: { model: config.model, maxTurns: config.maxTurns },
    });

    const skillDirs = config.skills.enabled ? config.skills.directories : [];
    const discoveryResult = discoverSkills(skillDirs, {
      maxBodySize: config.skills.maxBodySize,
    });

    if (discoveryResult.registry.skills.size > 0 || discoveryResult.diagnostics.length > 0) {
      obs.emit({
        type: "skill:discovered",
        skillCount: discoveryResult.registry.skills.size,
        diagnosticCount: discoveryResult.diagnostics.length,
        sourceDirectories: discoveryResult.registry.sourceOrder,
      });
    }

    const runtime = createRuntime({
      maxTurns: config.maxTurns,
      model: config.model,
      emit: (event) => obs.emit(event),
      skillRegistry: discoveryResult.registry,
      skillDiagnostics: discoveryResult.diagnostics,
    });

    const cliMode = parseCliMode(process.argv);

    if (cliMode.mode === "error") {
      process.stderr.write(`${cliMode.message}\n`);
      process.exit(1);
    }

    if (cliMode.mode === "one-shot") {
      const exitCode = await runOneShot(runtime, cliMode.prompt, config.model, obs);
      process.exit(exitCode);
    }

    if (cliMode.mode === "web") {
      const exitCode = await startWebCommand({ ...cliMode.options, waitForSignal: true });
      process.exit(exitCode);
    }

    const isResume = process.argv.includes("--resume");

    if (isResume) {
      process.stdout.write(`SuperAgent · ${config.model} (resumed: ${sessionId})\n`);
      for await (const event of runtime.resumeSession(sessionId)) {
        if (event.type === "text") {
          process.stdout.write(event.content);
        }
        if (event.type === "error") {
          process.stderr.write(`✗ ${event.message}\n`);
        }
      }
      process.stdout.write("\n");
      obs.emit({ type: "session:end", exitCode: 0 });
      obs.close();
      process.exit(0);
    }

    await startRepl(runtime, config, detectTerminalProfile(process.platform, process.env));
    obs.emit({ type: "session:end", exitCode: 0 });
    obs.close();
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
