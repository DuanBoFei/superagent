# Contract: Docker Sandbox Configuration

## User-facing configuration shape

```json
{
  "sandbox": {
    "enabled": true,
    "type": "docker",
    "image": "node:22-bookworm-slim",
    "workspaceMount": "/workspace",
    "workdir": "/workspace",
    "network": "disabled",
    "pullPolicy": "never",
    "timeoutMs": 120000,
    "memoryLimit": "1g",
    "cpus": "2",
    "envAllowlist": ["CI", "NODE_ENV"],
    "env": {
      "EXAMPLE_TOKEN": "${EXAMPLE_TOKEN}"
    }
  }
}
```

## Validation contract

| Rule | Expected outcome |
|------|------------------|
| `sandbox` omitted | Sandbox disabled; host execution behavior unchanged |
| `enabled: false` | Sandbox disabled; config may still be stored |
| `enabled: true` without `image` | Config validation error |
| Unknown `type` | Config validation error |
| Unknown `network` | Config validation error |
| Unknown `pullPolicy` | Config validation error |
| `timeoutMs <= 0` | Config validation error |
| `workspaceMount` not absolute container path | Config validation error |
| Secret-like env value | Allowed but redacted in diagnostics |

## Execution contract

Sandboxed command request:

```json
{
  "command": "pnpm test",
  "cwd": "D:/repo/project",
  "timeoutMs": 120000
}
```

Normalized sandbox result:

```json
{
  "stdout": "...",
  "stderr": "...",
  "exitCode": 0,
  "durationMs": 1532,
  "timedOut": false,
  "safeError": null
}
```

Setup failure result:

```json
{
  "stdout": "",
  "stderr": "",
  "exitCode": null,
  "durationMs": 12,
  "timedOut": false,
  "safeError": "Docker is not available. Start Docker or disable sandbox mode."
}
```

## Permission contract

1. Existing permission and dangerous command checks run first.
2. If permission returns deny, no Docker command starts.
3. If permission returns ask, user approval is required before Docker command starts.
4. If permission returns allow, sandbox execution may start.
5. Sandbox mode must not convert deny/ask into allow.

## Observability contract

Events:

```text
sandbox:start
sandbox:end
sandbox:failure
```

Required fields:

```text
executionId
image
workspaceMount
network
commandSummary
durationMs
success
timedOut
safeError
```

All command/env/output summaries must be redacted before logging.
