#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Call tsx via its Node API entry point to avoid .cmd shell issues on Windows
const tsxDistPath = join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
const entryPoint = join(projectRoot, "src", "index.ts");

const child = spawn(process.execPath, [tsxDistPath, entryPoint, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
  windowsHide: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  if (err.code === "ENOENT") {
    console.error("Error: tsx not found. Please run 'npm install' in the project directory.");
  } else {
    console.error("Failed to start superagent:", err.message);
  }
  process.exit(1);
});
