import http, { type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { handleHealth, writeError } from "./health";
import { serveStatic } from "./static";
import { SocketHub } from "./socket-hub";

export interface ServerOptions {
  port?: number;
  host?: string;
  maxPortAttempts?: number;
  requestTimeoutMs?: number;
  connectionTimeoutMs?: number;
  bodyLimitBytes?: number;
  staticRoot?: string;
}

export interface StartResult {
  host: string;
  port: number;
  url: string;
  pid: number;
}

export type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

interface Route {
  path: string;
  handler: RouteHandler;
}

export class WebServer {
  private readonly host: string;
  private readonly initialPort: number;
  private readonly maxPortAttempts: number;
  private readonly bodyLimitBytes: number;
  private readonly staticRoot?: string;
  private readonly startedAt = Date.now();
  private readonly routes: Route[] = [];
  private readonly sockets = new Set<Socket>();
  private readonly server: Server;
  private io?: SocketHub;
  private activePort?: number;

  constructor(options: ServerOptions = {}) {
    this.host = options.host ?? "127.0.0.1";
    this.initialPort = options.port ?? 3456;
    this.maxPortAttempts = options.maxPortAttempts ?? 10;
    this.bodyLimitBytes = options.bodyLimitBytes ?? 10 * 1024 * 1024;
    this.staticRoot = options.staticRoot;
    this.server = http.createServer((req, res) => void this.handleRequest(req, res));
    this.server.requestTimeout = options.requestTimeoutMs ?? 30_000;
    this.server.timeout = options.connectionTimeoutMs ?? 10_000;
    this.server.on("connection", (socket) => {
      this.sockets.add(socket);
      socket.on("close", () => this.sockets.delete(socket));
    });
    this.use("/api/health", (req, res) => handleHealth(req, res, this.startedAt));
  }

  getHttpServer(): Server {
    return this.server;
  }

  attachSocketIO(): SocketHub {
    this.io ??= new SocketHub(this.server, () => this.activePort ?? this.initialPort);
    return this.io;
  }

  getIO(): SocketHub {
    return this.attachSocketIO();
  }
  use(path: string, handler: RouteHandler): void {
    this.routes.push({ path, handler });
  }

  async start(): Promise<StartResult> {
    for (let offset = 0; offset < this.maxPortAttempts; offset++) {
      const port = this.initialPort + offset;
      try {
        await this.listen(port);
        const activePort = this.resolveActivePort();
        this.activePort = activePort;
        this.attachSocketIO();
        return {
          host: this.host,
          port: activePort,
          url: `http://localhost:${activePort}`,
          pid: process.pid,
        };
      } catch (error) {
        if (!isAddressInUse(error) || offset === this.maxPortAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error("Unable to find an available port");
  }

  async shutdown(timeoutMs = 1000): Promise<void> {
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        this.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
        for (const socket of this.sockets) {
          socket.end();
        }
      }),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          for (const socket of this.sockets) {
            socket.destroy();
          }
          resolve();
        }, timeoutMs);
      }),
    ]);
  }

  private listen(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const onError = (error: Error) => {
        this.server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        this.server.off("error", onError);
        resolve();
      };
      this.server.once("error", onError);
      this.server.once("listening", onListening);
      this.server.listen(port, this.host);
    });
  }

  private resolveActivePort(): number {
    const address = this.server.address() as AddressInfo | null;
    return address?.port ?? this.initialPort;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (!this.isSameOrigin(req)) {
        writeError(res, 403, "FORBIDDEN", "Cross-origin requests are not allowed");
        return;
      }

      const tooLarge = await this.rejectLargeBody(req, res);
      if (tooLarge) {
        return;
      }

      const url = new URL(req.url ?? "/", "http://localhost");
      for (const route of this.routes) {
        if (url.pathname === route.path) {
          await route.handler(req, res);
          return;
        }
      }

      if (this.staticRoot && serveStatic(this.staticRoot, req, res)) {
        return;
      }

      writeError(res, 404, "NOT_FOUND", "Not found");
    } catch (error) {
      writeError(res, 500, "INTERNAL_ERROR", error instanceof Error ? error.message : String(error));
    }
  }

  private isSameOrigin(req: IncomingMessage): boolean {
    const origin = req.headers.origin;
    if (!origin) {
      return true;
    }

    try {
      const parsed = new URL(origin);
      return (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && parsed.port === String(this.activePort ?? this.initialPort);
    } catch {
      return false;
    }
  }

  private async rejectLargeBody(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const length = req.headers["content-length"];
    if (typeof length === "string" && Number(length) > this.bodyLimitBytes) {
      writeError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
      return true;
    }

    return false;
  }
}

function isAddressInUse(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EADDRINUSE";
}
