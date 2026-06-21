import type { RuntimeHandle } from "../runtime/runtime";

export interface ObservabilityHandle {
  emit(event: Record<string, unknown>): void;
  close(): void;
}

export async function runOneShot(
  runtime: RuntimeHandle,
  prompt: string,
  model: string,
  obs: ObservabilityHandle,
): Promise<number> {
  process.stdout.write(`SuperAgent · ${model}\n`);
  for await (const event of runtime.startTurn(prompt)) {
    if (event.type === "text") {
      process.stdout.write(event.content);
    }
    if (event.type === "agent_phase") {
      process.stdout.write(`[${event.role}] ${event.lifecycle}\n`);
    }
    if (event.type === "error") {
      process.stderr.write(`✗ ${event.message}\n`);
    }
  }
  process.stdout.write("\n");
  obs.emit({ type: "session:end", exitCode: 0 });
  obs.close();
  return 0;
}
