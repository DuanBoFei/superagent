import { Server as SocketIOServer } from "socket.io";
import type { Server } from "node:http";
import type { ClientMessageEvent } from "../../packages/web/src/types/message";
import {
  registerClientMessageHandler,
  registerSessionHandlers,
  type MessageRuntime,
  type SessionDataProvider,
} from "./socket-handlers";

export class SocketHub {
  readonly io: SocketIOServer;
  private handlersRegistered = false;

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

  registerHandlers(runtime: MessageRuntime, sessionProvider: SessionDataProvider): void {
    if (this.handlersRegistered) return;
    this.handlersRegistered = true;

    this.io.on("connection", (socket) => {
      const handleClientMessage = registerClientMessageHandler(runtime);

      socket.on("client_send", (msg: ClientMessageEvent) => {
        void handleClientMessage(socket, msg);
      });

      socket.on("abort_turn", (data: { messageId: string }) => {
        // Abort handled by the runtime bridge — the socket just relays the signal
        void data;
      });

      registerSessionHandlers(socket, sessionProvider);
    });
  }

  isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) {
      return true;
    }

    try {
      const parsed = new URL(origin);
      return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  }
}
