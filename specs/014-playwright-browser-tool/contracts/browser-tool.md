# Contract: Playwright Browser Tool

## User-facing configuration shape

```json
{
  "browser": {
    "enabled": true,
    "headless": true,
    "defaultTimeoutMs": 30000,
    "artifactDir": ".superagent/browser-artifacts",
    "viewport": {
      "width": 1280,
      "height": 720
    },
    "network": "enabled",
    "captureScreenshots": true
  }
}
```

## Validation contract

| Rule | Expected outcome |
|------|------------------|
| `browser` omitted | Browser tools disabled; existing behavior unchanged |
| `enabled: false` | Browser tools disabled; config may still be stored |
| `defaultTimeoutMs <= 0` | Config validation error |
| `viewport.width <= 0` or `viewport.height <= 0` | Config validation error |
| Unknown `network` value | Config validation error |
| `artifactDir` outside allowed local path policy | Config validation error |
| Secret-like config value | Allowed only where applicable and redacted in diagnostics |

## Browser action request contract

```json
{
  "action": {
    "type": "open",
    "url": "http://localhost:3000",
    "timeoutMs": 30000
  }
}
```

Interaction request:

```json
{
  "action": {
    "type": "click",
    "selector": "button[type=submit]",
    "timeoutMs": 10000
  }
}
```

Typing request:

```json
{
  "action": {
    "type": "type",
    "selector": "input[name=email]",
    "text": "user@example.invalid",
    "timeoutMs": 10000
  }
}
```

Other supported action types are `select`, `wait`, `screenshot`, and `close`.

## Normalized browser result

```json
{
  "action": "open",
  "status": "running",
  "finalUrl": "http://localhost:3000/dashboard",
  "title": "Dashboard",
  "textSummary": "Dashboard Welcome Recent activity...",
  "artifacts": [
    {
      "id": "artifact-123",
      "kind": "screenshot",
      "path": ".superagent/browser-artifacts/artifact-123.png",
      "mimeType": "image/png",
      "bytes": 12345,
      "createdAt": "2026-06-16T12:00:00.000Z"
    }
  ],
  "actionTrace": "opened http://localhost:3000",
  "durationMs": 842,
  "timedOut": false
}
```

## Setup failure result

```json
{
  "action": "open",
  "status": "failed",
  "artifacts": [],
  "durationMs": 12,
  "timedOut": false,
  "safeError": "Browser setup failed: Playwright browser is not available. Install browser dependencies or disable browser tools."
}
```

## Permission contract

1. Existing permission and dangerous-action checks run before browser action execution.
2. If permission returns deny, no Playwright action starts.
3. If permission returns ask, user approval is required before browser action starts.
4. If permission returns allow, browser execution may start.
5. Browser mode must not convert deny/ask into allow.
6. Browser permission rules should be able to match all browser actions, one action type, or action input patterns.

## Observability contract

Events:

```text
browser:start
browser:action
browser:end
browser:failure
```

Event fields:

```text
action
status
durationMs
success
timedOut
urlSummary
inputSummary
textSummary
safeError
```

All URL, input, page text, artifact label, and error summaries must be redacted before logging.
