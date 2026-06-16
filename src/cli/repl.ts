import type { RuntimeHandle } from "../runtime/runtime";
import type { Config } from "../config/types";
import type { TerminalConfig } from "./types";
import type { TerminalProfile } from "./terminal-profile";
import { dispatchEvent } from "./renderer";
import { renderSummary } from "./summary";
import { createPrompt, isCommand, parseCommand, HELP_TEXT } from "./input";
import { createSafeWriter } from "./safe-writer";

export async function startRepl(
  runtime: RuntimeHandle,
  config: Config,
  profile: TerminalProfile = "default",
): Promise<void> {
  const terminal: TerminalConfig = {
    width: process.stdout.columns ?? 80,
    supportsColor: process.stdout.isTTY ?? false,
    isTTY: process.stdout.isTTY ?? false,
  };

  const safeWriter = createSafeWriter(profile, (s) => process.stdout.write(s));

  // Startup header
  process.stdout.write(`\nSuperAgent · ${config.model} · ${process.cwd()}\n`);

  if (!process.stdin.isTTY) {
    return;
  }

  process.stdout.write('Type a message or /help\n\n');

  const prompt = createPrompt();

  const shutdown = () => {
    prompt.close();
    process.stdout.write("\n");
  };

  process.on("SIGINT", shutdown);

  try {
    while (true) {
      const input = await prompt.question("> ");

      if (input === "") continue;

      if (isCommand(input)) {
        const parsed = parseCommand(input);
        switch (parsed.command) {
          case "/exit":
            shutdown();
            return;
          case "/help":
            process.stdout.write(`${HELP_TEXT}\n\n`);
            continue;
          case "/plan":
            process.stdout.write("Plan mode toggled (stub).\n\n");
            continue;
          case "/model":
            process.stdout.write(`Model: ${config.model}\n\n`);
            continue;
          default:
            process.stdout.write(`Unknown command: ${parsed.command}\n\n`);
            continue;
        }
      }

      for await (const event of runtime.startTurn(input)) {
        dispatchEvent(event, terminal);

        if (event.type === "turn_end") {
          renderSummary(event.summary);
        }
      }

      safeWriter.write("\n");
    }
  } catch (err) {
    process.stderr.write(
      `REPL error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  } finally {
    shutdown();
  }
}
