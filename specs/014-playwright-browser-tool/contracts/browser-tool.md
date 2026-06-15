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
  "action": "open",
  "url": "http://localhost:3000",
  "timeoutMs": 30000,
  "captureScreenshot": true
}
```

Interaction request:

```json
{
  "action": "click",
  "target": {
    "kind": "role",
    "value": "button",
    "name": "Submit"
  },
  "timeoutMs": 10000
}
```

Typing request:

```json
{
  "action": "type",
  "target": {
    "kind": "label",
    "value": "Email"
  },
  "text": "user@example.invalid",
  "timeoutMs": 10000
}
```

## Normalized browser result

```json
{
  "success": true,
  "pageState": {
    "url": "http://localhost:3000/dashboard",
    "title": "Dashboard",
    "visibleText": "Dashboard Welcome Recent activity...",
    "truncated": false
  },
  "artifacts": [
    {
      "artifactId": "artifact-123",
      "type": "screenshot",
      "path": ".superagent/browser-artifacts/artifact-123.png",
      "mimeType": "image/png",
      "sizeBytes": 12345,
      "label": "dashboard screenshot"
    }
  ],
  "actionTrace": [
    {
      "actionId": "action-123",
      "type": "open",
      "target": "http://localhost:3000",
      "durationMs": 842,
      "success": true
    }
  ],
  "durationMs": 842,
  "timedOut": false,
  "safeError": null
}
```

## Setup failure result

```json
{
  "success": false,
  "pageState": null,
  "artifacts": [],
  "actionTrace": [],
  "durationMs": 12,
  "timedOut": false,
  "safeError": "Playwright browser is not available. Install browser dependencies or disable browser tools."
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

Required fields:

```text
browserSessionId
actionId
actionType
url
safeTarget
durationMs
success
timedOut
artifactCount
safeError
```

All URL, input, page text, artifact label, and error summaries must be redacted before logging.
