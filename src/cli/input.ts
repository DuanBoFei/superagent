import * as readline from "node:readline";

export interface PromptHandle {
  question: (prompt: string) => Promise<string>;
  close: () => void;
}

export function createPrompt(): PromptHandle {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  return {
    question: (prompt: string) => {
      return new Promise<string>((resolve) => {
        rl.question(prompt, (answer) => {
          resolve(answer);
        });
      });
    },
    close: () => {
      rl.close();
    },
  };
}

export function isCommand(input: string): boolean {
  return input.startsWith("/");
}

export interface ParsedCommand {
  command: string;
  args: string;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) {
    return { command: trimmed, args: "" };
  }
  return {
    command: trimmed.slice(0, spaceIdx),
    args: trimmed.slice(spaceIdx + 1).trim(),
  };
}

export const HELP_TEXT = `
/help    Show this help message
/exit    Exit SuperAgent
/plan    Toggle plan-and-execute mode
/model   Show current model
`.trim();
