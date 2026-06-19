import type { Server } from "node:http";

export class SocketHub {
  constructor(
    readonly httpServer: Server,
    private readonly getPort: () => number | undefined,
  ) {}

  isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) {
      return true;
    }

    try {
      const parsed = new URL(origin);
      return (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && parsed.port === String(this.getPort());
    } catch {
      return false;
    }
  }
}
