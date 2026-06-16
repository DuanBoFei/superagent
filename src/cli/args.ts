export type CliMode =
  | { mode: "one-shot"; prompt: string }
  | { mode: "interactive" }
  | { mode: "error"; message: string };

export function parseCliMode(argv: string[]): CliMode {
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
