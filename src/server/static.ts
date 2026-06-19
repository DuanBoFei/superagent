import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { writeError } from "./health";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
};

export function serveStatic(root: string, req: IncomingMessage, res: ServerResponse): boolean {
  if (!req.url || req.method !== "GET") {
    return false;
  }

  const url = new URL(req.url, "http://localhost");
  const pathname = normalize(decodeURIComponent(url.pathname));
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const rootPath = resolve(root);
  const filePath = resolve(join(rootPath, relativePath));

  if (!filePath.startsWith(rootPath)) {
    writeError(res, 403, "FORBIDDEN", "Forbidden");
    return true;
  }

  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    return false;
  }

  if (!stats.isFile()) {
    return false;
  }

  res.writeHead(200, {
    "content-type": TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "content-length": stats.size,
  });
  createReadStream(filePath).pipe(res);
  return true;
}
