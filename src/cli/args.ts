import type { WebCommandOptions } from "./web";

export type CliMode =
  | { mode: "one-shot"; prompt: string }
  | { mode: "web"; options: WebCommandOptions }
  | { mode: "interactive" }
  | { mode: "error"; message: string };

export function parseCliMode(argv: string[]): CliMode {
  if (argv[2] === "web") {
    return { mode: "web", options: parseWebOptions(argv.slice(3)) };
  }

  const promptIndex = argv.indexOf("--prompt");
  if (promptIndex === -1) {
    return { mode: "interactive" };
  }

  const userMessage = argv.slice(promptIndex + 1).join(" ").trim();
  if (userMessage === "") {
    return { mode: "error", message: "Fatal: --prompt requires a message" };
  }

  return { mode: "one-shot", prompt: userMessage };
}

function parseWebOptions(args: string[]): WebCommandOptions {
  const options: WebCommandOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--verbose") {
      options.verbose = true;
      continue;
    }
    if (arg === "--no-open") {
      options.noOpen = true;
      continue;
    }
    if (arg === "--port") {
      const value = args[i + 1];
      if (value !== undefined) {
        options.port = Number(value);
        i++;
      }
    }
  }

  return options;
}
