export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LoggerOptions {
  verbose?: boolean;
  write?: (line: string) => void;
  now?: () => Date;
  maxLines?: number;
  color?: boolean;
}

const COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  debug: "\x1b[90m",
};

export class WebLogger {
  private readonly buffer: string[] = [];
  private readonly verbose: boolean;
  private readonly writeLine: (line: string) => void;
  private readonly now: () => Date;
  private readonly maxLines: number;
  private readonly color: boolean;

  constructor(options: LoggerOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.writeLine = options.write ?? ((line) => process.stdout.write(`${line}\n`));
    this.now = options.now ?? (() => new Date());
    this.maxLines = options.maxLines ?? 1000;
    this.color = options.color ?? true;
  }

  info(message: string): void {
    this.log("info", message);
  }

  warn(message: string): void {
    this.log("warn", message);
  }

  error(message: string): void {
    this.log("error", message);
  }

  debug(message: string): void {
    if (this.verbose) {
      this.log("debug", message);
    }
  }

  lines(): string[] {
    return [...this.buffer];
  }

  private log(level: LogLevel, message: string): void {
    const label = level.toUpperCase();
    const line = `[${this.now().toISOString()}] ${label} ${message}`;
    this.buffer.push(line);
    if (this.buffer.length > this.maxLines) {
      this.buffer.splice(0, this.buffer.length - this.maxLines);
    }
    this.writeLine(this.color ? `${COLORS[level]}${line}\x1b[0m` : line);
  }
}
