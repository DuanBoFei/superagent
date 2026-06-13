# Spec: Permission System

## Feature Overview

### What

A three-tier permission system that intercepts every tool call before execution: auto-approve (immediate), deny (immediate block), ask (prompt user). It uses pattern matching to decide the tier for each tool call and enforces a hard-coded blacklist that cannot be overridden by config.

### Why

This is the safety boundary between "Agent autonomously helps" and "Agent accidentally destroys." Without it, an Agent with Bash access could delete files, force-push to main, or exfiltrate data without the user knowing. The PRD requires 100% dangerous command interception before MVP launch.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Three-tier enforcement | auto-approve → deny → ask (checked in that order) |
| Pattern matching | `ToolName:arg_pattern` — e.g., `Bash:rm *` matches `rm file.txt` |
| Config-driven rules | Rules loaded from 001-config `permissions.autoApprove` and `permissions.deny` |
| Hard-coded blacklist | `rm -rf /`, `curl | bash`, `eval`, `sudo`, `git push --force` — always ask |
| Deny-first priority | If both auto-approve and deny match, deny wins |
| Timeout | 30s for ask → auto-deny |
| Audit log | Every permission decision logged with tool + args + decision + timestamp |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| Regex-based pattern matching | Simple glob matching (`*` wildcard) sufficient for MVP |
| Per-file permission granularity | Tool-level only; `Bash:git *` not `Bash:git commit -m "specific message"` |
| Permission profiles (read-only mode, safe mode) | P1 |
| Session-scoped permission grants | "Always" persists to config; no session-only grants in MVP |
| Permission escalation (sudo-like) | Explicitly not supported |

---

## Business Flow

```
checkPermission(toolName, args)
    │
    ▼
Check hard-coded blacklist
    │  Match? → force ASK (cannot be overridden by config)
    │
    ▼
Check deny patterns (from config)
    │  Match? → DENY immediately
    │
    ▼
Check auto-approve patterns (from config)
    │  Match? → APPROVE immediately
    │
    ▼
Neither → ASK user
    │
    ├── User says Y → APPROVE
    ├── User says A → APPROVE + add pattern to autoApprove config
    ├── User says N → DENY
    └── 30s timeout → DENY
    │
    ▼
Log decision: { tool, args_summary, decision, timestamp, matched_rule }
```

---

## Acceptance Criteria

### AC-PERM-01: Auto-approve matching

**Given** config has `autoApprove: ["Read:*", "Grep:*", "Glob:*"]`
**When** the Agent calls `Read("src/file.ts")`
**Then** permission is granted immediately without user prompt. Log: `[AUTO-APPROVE] Read: src/file.ts (matched: Read:*)`.

### AC-PERM-02: Deny matching

**Given** config has `deny: ["Bash:rm *"]`
**When** the Agent calls `Bash("rm -rf build/")`
**Then** permission is denied immediately. Log: `[DENY] Bash: rm -rf build/ (matched: Bash:rm *)`. Agent receives "Permission denied" and the tool is not executed.

### AC-PERM-03: Deny wins over auto-approve

**Given** config has `autoApprove: ["Bash:*"]` and `deny: ["Bash:rm *"]`
**When** the Agent calls `Bash("rm file.txt")`
**Then** deny is checked first → permission denied. The auto-approve rule is ignored.

### AC-PERM-04: Blacklist can't be overridden

**Given** config has `autoApprove: ["Bash:*"]` and no deny rules
**When** the Agent calls `Bash("sudo rm -rf /")`
**Then** the hard-coded blacklist triggers → forced ASK regardless of autoApprove config. The user must explicitly approve.

### AC-PERM-05: Ask interaction

**Given** no auto-approve or deny rules match a Bash call
**When** the Agent calls `Bash("npm test")`
**Then** the user is prompted: `⚠ Allow [Bash] npm test? [Y]es [N]o [A]lways`. Y executes the tool, N denies it, A executes AND adds `Bash:npm test` to autoApprove for future sessions.

### AC-PERM-06: Timeout defaults to deny

**Given** a permission prompt is showing
**When** 30 seconds pass with no user response
**Then** permission is denied. Log: `[DENY] Bash: npm test (reason: timeout)`.

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| Empty config rules (first run) | All tools go to ask tier (except auto-approved Read/Grep/Glob by sensible defaults) |
| Pattern with no wildcard (exact match) | Only matches exact tool+args: `Bash:git status` matches only `git status` |
| Pattern with `*` wildcard | `Bash:git *` matches any `git` command; `*:*` matches ALL tools (dangerous but user-configurable) |
| Concurrent permission prompts (rare) | Queue prompts; show one at a time; each has own 30s timer |
| "Always" choice during a run | Writes the new pattern to in-memory config; persisted by 009 on session end |
| API key appears in Bash args | Redact before logging: `Bash: curl -H "Authorization: sk-xxxx"` → logged as `Bash: curl -H "Authorization: sk-****"` |

---

## Integration Contract

### Provided Interface

```
checkPermission(toolName: string, args: object): Promise<PermissionResult>

PermissionResult = "approved" | "denied" | "always"
```

### Consumed Config

| Config Key | Used For |
|------------|---------|
| `permissions.autoApprove` | Pattern list → auto-approve tier |
| `permissions.deny` | Pattern list → deny tier |
| `permissions.askTimeout` | Ask timeout in seconds (default 30) |

### Called by

| Module | What |
|--------|------|
| 005-tool-scheduling | Called before each tool executes |

### Consumed by

| Module | What |
|--------|------|
| 008-cli-repl | Permission prompt rendering (ask tier) |
