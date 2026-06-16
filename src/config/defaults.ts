import type { Config } from "./types";

export const defaults: Config = {
  apiKey: "",
  model: "deepseek-v4-pro",
  baseUrl: "https://api.deepseek.com",
  maxTurns: 50,
  fallbackModel: "deepseek-v4-flash",
  fallbackBaseUrl: "https://api.deepseek.com",
  permissions: {
    autoApprove: [],
    deny: [
      "Bash:rm -rf *",
      "Bash:curl * | bash",
      "Bash:sudo *",
      "Bash:git push --force *",
    ],
    askTimeout: 30,
  },
  rulesFile: "CLAUDE.md",
  mcpServers: {},
  hooks: {},
  sandbox: {
    enabled: false,
    type: "docker",
    image: undefined,
    workspaceMount: "/workspace",
    network: "none",
    envAllowlist: [],
    env: {},
    pullPolicy: "never",
    timeoutMs: 120000,
    memoryMb: undefined,
    cpus: undefined,
  },
};
