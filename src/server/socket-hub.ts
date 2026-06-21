import { Server as SocketIOServer } from "socket.io";
import type { Server } from "node:http";

export class SocketHub {
  readonly io: SocketIOServer;

  constructor(
    readonly httpServer: Server,
    private readonly getPort: () => number | undefined,
  ) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin: string | undefined, callback) => {
          if (this.isOriginAllowed(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error("Not allowed by CORS"));
        },
      },
      serveClient: false,
      pingInterval: 10000,
      pingTimeout: 5000,
    });
  }

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
