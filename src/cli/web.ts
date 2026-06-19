export interface WebCommandOptions {
  port?: number;
  verbose?: boolean;
  noOpen?: boolean;
  start?: () => Promise<void>;
}

export async function startWebCommand(options: WebCommandOptions = {}): Promise<number> {
  try {
    await options.start?.();
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to start web server: ${message}\n`);
    return 1;
  }
}
