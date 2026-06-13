import { LogEvent } from "./types";

export interface VerbosePrinter {
  print(event: LogEvent): void;
}

interface VerboseOpts {
  write(data: string): void;
  enabled?: boolean;
}

export function createVerbosePrinter(stderr?: VerboseOpts): VerbosePrinter {
  const sink = stderr?.write ? stderr : process.stderr;
  const enabled = stderr?.enabled ?? true;

  function print(event: LogEvent): void {
    if (!enabled) return;

    switch (event.type) {
      case "model:request":
        sink.write(
          `[VERBOSE] model:request | model=${event.model} | estimatedInputTokens=${event.estimatedInputTokens}\n`,
        );
        break;
      case "model:response":
        sink.write(
          `[VERBOSE] model:response | model=${event.model} | inputTokens=${event.inputTokens} outputTokens=${event.outputTokens} cost=$${event.cost.toFixed(6)}\n`,
        );
        break;
      default:
        // Only model events are verbose printed
        break;
    }
  }

  return { print };
}

export function redactSecrets(text: string): string {
  return text
    .replace(/api_key=\S+/gi, "api_key=****")
    .replace(/sk-[a-zA-Z0-9]+/g, "sk-****")
    .replace(/Authorization:\s*[^\n]*/gi, "Authorization: ****");
}
