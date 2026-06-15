# Contract: Hooks Configuration

## User-facing configuration shape

```json
{
  "hooks": {
    "SessionStart": [
      {
        "name": "announce-session",
        "enabled": true,
        "command": "node",
        "args": ["scripts/hooks/session-start.js"],
        "timeoutMs": 3000,
        "env": {
          "EXAMPLE_TOKEN": "${EXAMPLE_TOKEN}"
        }
      }
    ],
    "UserPromptSubmit": [
      {
        "name": "prompt-policy",
        "enabled": true,
        "command": "node",
        "args": ["scripts/hooks/prompt-policy.js"],
        "timeoutMs": 3000,
        "blocking": true,
        "matcher": {
          "promptPattern": "deploy|delete|credential"
        }
      }
    ],
    "PreToolUse": [
      {
        "name": "bash-policy",
        "enabled": true,
        "command": "node",
        "args": ["scripts/hooks/bash-policy.js"],
        "blocking": true,
        "matcher": {
          "tool": "Bash",
          "inputPattern": "git push|rm -rf"
        }
      }
    ],
    "PostToolUse": [
      {
        "name": "tool-audit",
        "enabled": true,
        "command": "node",
        "args": ["scripts/hooks/tool-audit.js"],
        "timeoutMs": 3000,
        "matcher": {
          "tool": "*"
        }
      }
    ]
  }
}
```

## Validation contract

| Rule | Expected outcome |
|------|------------------|
| `hooks` omitted | No hooks configured; app still starts |
| Unknown event name | Config validation error |
| Hook name empty | Config validation error |
| Enabled hook without `command` | Config validation error |
| Disabled hook without valid command | Allowed but not executed |
| `timeoutMs <= 0` | Config validation error |
| `blocking: true` on observe-only event | Config validation error |
| Unknown matcher key | Config validation error |
| Multiple hooks on one event | Run in array order |

## Hook input contract

Hook commands receive JSON on stdin:

```json
{
  "event": "PreToolUse",
  "sessionId": "session-123",
  "turnId": "turn-456",
  "timestamp": "2026-06-14T12:00:00.000Z",
  "cwd": "/repo",
  "payload": {
    "toolName": "Bash",
    "input": {
      "command": "git status"
    },
    "permissionKey": "Bash"
  }
}
```

## Hook output contract

Hooks may return JSON on stdout:

```json
{
  "decision": "continue",
  "message": "ok"
}
```

Blocking pre-action hook:

```json
{
  "decision": "block",
  "message": "Project policy blocks git push from Agent sessions."
}
```

## Decision contract

| Event | `continue` | `block` |
|-------|------------|---------|
| `SessionStart` | Continue session | Treated as failure; session continues |
| `UserPromptSubmit` | Send prompt to model | Do not send prompt; show safe message |
| `PreToolUse` | Continue to permission/tool execution | Do not execute tool; return blocked result |
| `PostToolUse` | Continue session | Treated as failure; original tool result unchanged |
| `PostToolUseFailure` | Continue session | Treated as failure; original tool failure unchanged |
| `PreCompact` | Continue compaction | Treated as failure; compaction continues |
| `Stop` | Continue shutdown | Treated as failure; shutdown continues |
