import type { IncomingMessage, ServerResponse } from "node:http";

export function writeJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const content = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(content),
  });
  res.end(content);
}

export function writeError(
  res: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  details?: object,
): void {
  writeJson(res, statusCode, {
    error: details ? { code, message, details } : { code, message },
  });
}

export function handleHealth(_req: IncomingMessage, res: ServerResponse, startedAt = Date.now()): void {
  writeJson(res, 200, {
    status: "ok",
    uptime: Math.max(0, Date.now() - startedAt),
  });
}
