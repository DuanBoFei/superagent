# Spec: Config System

## Feature Overview

### What

A hierarchical configuration system that loads Agent settings from four layers: built-in defaults → global user config → project-level config → environment variables. Each subsequent layer overrides the previous one. The system validates config syntax on load and surfaces errors with precise locations.

### Why

An Agent needs settings (API keys, model selection, tool permissions, behavioral parameters) before it can do anything useful. Without a config system, every user action would require manual parameter input. A layered config system also enables two critical scenarios:

1. **Team consistency**: Project maintainers define rules in `.superagent/` that apply to all contributors automatically (PRD US-3).
2. **Personal defaults**: Individual developers set global preferences once (API key, preferred model) and reuse across all projects.

This is the **first feature to build** because every other feature reads from config. Core Runtime needs `model` and `maxTurns`. Permission System needs `autoApprove` and `deny` rules. Model Fallback needs `apiKey` and `baseUrl`.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Four-layer config loading | defaults → global (`~/.superagent/settings.json`) → project (`.superagent/settings.json`) → env vars (`SUPERAGENT_*`) |
| Merge with override semantics | Later layers override earlier; project > global > default |
| JSON syntax validation | Parse errors reported with file path + line number |
| Graceful degradation | Missing files → use lower-priority layers silently; syntax errors → warn + use defaults |
| Startup validation | Missing required keys (e.g., `apiKey`) → prompt user on startup |
| Schema-enforced config keys | Unknown keys → warn but don't fail (forward-compat) |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| Config hot-reload (watch & auto-apply) | Adds complexity; restart is acceptable for MVP |
| CLI `--set` / interactive config wizard | Manual JSON editing is sufficient for technical target users |
| Config encryption (encrypted API key storage) | P1; MVP stores keys in plain JSON (local file, user-controlled permissions) |
| Schema migration between versions | MVP has one config schema; add migration in v1.1 |
| Remote/centralized config sync | Explicit non-goal; local-first design |
| GUI config editor | CLI-only MVP |

---

## MVP Constraints

- Config is local to the machine — no cloud sync, no remote fetching
- Config format is JSON only; no YAML, TOML, or env-file in MVP
- Environment variables use flat `SUPERAGENT_<KEY>` convention, where dots in nested paths become underscores: `permissions.autoApprove` → `SUPERAGENT_PERMISSIONS_AUTOAPPROVE`. Only top-level and one-level-deep keys are supported via env vars; deeper nesting (e.g., `a.b.c`) is not supported via env vars in MVP.
- All config files are optional — the Agent must start with zero config files present
- The full config object after merge must be ≤ 500 keys (prevent runaway complexity)
- **Clarification — Config system is a dumb key-value store**: The config system validates key *names* (warn on unknown) and value *types* (warn on mismatch) but does not validate value *semantics*. It doesn't know what a valid model name is or whether a URL is reachable. Semantic validation belongs to the consuming feature (e.g., Model Fallback validates connectivity).
- **Clarification — Error vs partial config**: When a config file has a syntax error, that entire file is skipped (not partially loaded). This prevents a half-broken JSON from silently loading half its keys. The merged config contains only layers that loaded successfully.

---

## Runtime Environment

- **Platform**: Unix-like (macOS, Linux). Windows via Git Bash best-effort.
- **File permissions**: Config files readable by the running user; no extra permission checks beyond OS filesystem permissions
- **Encoding**: UTF-8 only
- **Startup timing**: Config loading must complete within 100ms (contributes to overall ≤ 500ms startup target from PRD NFR)

---

## Business Flow

```
Start Agent
    │
    ▼
Load built-in defaults ────────────── always succeeds
    │
    ▼
Check ~/.superagent/settings.json ─── missing? → skip (no error)
    │                                  syntax error? → warn + skip
    │                                  valid? → merge (overrides defaults)
    ▼
Check ./.superagent/settings.json ─── missing? → skip (no error)
    │                                  syntax error? → warn + skip
    │                                  valid? → merge (overrides previous)
    ▼
Check SUPERAGENT_* env vars ────────── none? → skip
    │                                  parse and merge (overrides all files)
    ▼
Validate required keys
    │
    ├── apiKey missing → prompt "Set SUPERAGENT_API_KEY or add apiKey to settings.json"
    │
    └── all OK → config ready
```

Key merge rule: nested objects merge recursively. For example, `permissions.autoApprove` in project config adds to (not replaces) the global `permissions.autoApprove` list, unless the project explicitly sets `permissions.autoApprove: null` to clear.

Top-level scalar values (e.g., `maxTurns`, `model`) replace entirely — project value wins over global.

**Multiple error handling**: If both global and project config files have syntax errors, both warnings are emitted (one per file). The Agent boots with defaults only. Warnings are collected in order (global first, then project) and printed together before the REPL prompt.

**Tilde expansion**: `~/.superagent/settings.json` uses OS-level home directory resolution. `~` is expanded to `$HOME` (or `%USERPROFILE%` on Windows). If home directory is unresolvable, the global config layer is skipped.

---

## Config Item Catalog

### Required for MVP

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `apiKey` | string | (none) | Model provider API key |
| `model` | string | `"deepseek-v4-pro"` | Primary model identifier |
| `baseUrl` | string | `"https://api.deepseek.com"` | Model provider endpoint |

### Behavioral (optional)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `maxTurns` | integer | `50` | Max turns per session before forced stop |
| `fallbackModel` | string | `"deepseek-v4-flash"` | Fallback model when primary fails |
| `fallbackBaseUrl` | string | (same as baseUrl) | Fallback endpoint |

### Permission (optional)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `permissions.autoApprove` | string[] | `[]` | Tool patterns to auto-approve |
| `permissions.deny` | string[] | `["Bash:rm -rf *", "Bash:curl * | bash", "Bash:sudo *", "Bash:git push --force *"]` | Tool patterns always denied |
| `permissions.askTimeout` | integer | `30` | Seconds before auto-deny timeout |

### Context (optional)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `rulesFile` | string | `"CLAUDE.md"` | Project-level rules file path |

---

## Acceptance Criteria

### AC-CFG-01: Zero-config startup

**Given** no `~/.superagent/` directory and no `.superagent/` in the project
**When** the Agent starts
**Then** it loads only built-in defaults and enters REPL normally, without any error or warning about missing config files.

### AC-CFG-02: Project overrides global

**Given** global config sets `maxTurns: 30` and project config sets `maxTurns: 50`
**When** the Agent starts in that project directory
**Then** the effective `maxTurns` is `50` and the log records config source as "project".

### AC-CFG-03: Env var has highest priority

**Given** global config sets `model: "deepseek-v4-flash"` and `SUPERAGENT_MODEL="deepseek-v4-pro"` is exported
**When** the Agent starts
**Then** the effective `model` is `"deepseek-v4-pro"` (env > global).

### AC-CFG-04: JSON syntax error — clear message

**Given** `.superagent/settings.json` has a JSON syntax error (missing comma at line 3)
**When** the Agent starts
**Then** output: "Config error in .superagent/settings.json: Unexpected token at line 3. Using default configuration." The Agent continues to start with defaults.

### AC-CFG-05: Missing API key — prompt user

**Given** no config file provides `apiKey` and `SUPERAGENT_API_KEY` is not set
**When** the Agent starts
**Then** output: "API key not configured. Set SUPERAGENT_API_KEY environment variable or add 'apiKey' to ~/.superagent/settings.json" — Agent exits with code 1 (cannot operate without model access).

### AC-CFG-06: Unknown config key — warn only

**Given** settings.json contains `"unknownFutureOption": true`
**When** the Agent starts
**Then** output: "Warning: unknown config key 'unknownFutureOption' ignored." Agent continues normally (forward-compatibility).

### AC-CFG-07: Permission merge preserves both layers

**Given** global config has `permissions.autoApprove: ["Read", "Grep"]` and project config has `permissions.autoApprove: ["Glob"]`
**When** the Agent starts
**Then** the effective `autoApprove` list is `["Read", "Grep", "Glob"]` (merged, not replaced).

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| Config file is empty (0 bytes) | Treat as `{}` — no error, no warning |
| Config file has BOM or non-UTF-8 encoding | Fail with "Config file encoding must be UTF-8" + file path |
| Config file > 100KB | Warn "Large config file ({size}KB)" but load normally |
| Env var value is valid JSON (object/array) | Parse as JSON and merge; if parse fails, treat as plain string |
| `SUPERAGENT_MAXTURNS="notanumber"` | Warn + use default (env var type mismatch) |
| Circular reference in env var override | N/A — flat keys only, no nesting in env vars |
| `permissions.autoApprove: null` in project config | Clear the inherited list (explicit reset) |
| Both `~/.superagent/` and `./.superagent/` exist but one is unreadable | Warn about the unreadable file + skip it; continue with other layers |
| User home directory not resolvable ($HOME unset) | Skip global config layer entirely; only use project + env |
| `SUPERAGENT_API_KEY=""` (empty string) | Treated as "not set" — same as missing; prompts user on startup. Empty string is not a valid API key. |
| `maxTurns` set to float (e.g., `50.5`) | Truncate to integer (`50`) + warn "maxTurns must be an integer, truncated to 50" |
| `maxTurns` set to ≤ 0 | Warn "maxTurns must be > 0, using default 50" |
| `permissions.autoApprove` set to a string instead of array (e.g., `"Read"`) | Warn "permissions.autoApprove must be an array" + use default `[]` |
| Duplicate entries in merged arrays | Automatically deduplicate (first occurrence kept). E.g., global `["Read"]` + project `["Read", "Grep"]` → effective `["Read", "Grep"]` |

---

## Integration Contract

The config system exposes a single read-only interface to all other features:

### Provided Interface

```
getConfig(): MergedConfig
```

Returns the fully merged, validated config object. This is called once at startup after all layers are loaded and validated. Features read config values via property access (e.g., `config.maxTurns`, `config.permissions.autoApprove`).

### Config ownership boundaries

| Config key | Owned by (validates) | Consumed by |
|------------|---------------------|-------------|
| `apiKey`, `baseUrl` | 001-config (presence check only) | 003-model-fallback (connectivity) |
| `model`, `fallbackModel`, `fallbackBaseUrl` | 001-config (type check only) | 003-model-fallback |
| `maxTurns` | 001-config (range: 1-500) | 002-core-runtime |
| `permissions.*` | 001-config (type check only) | 006-permission-system |
| `rulesFile` | 001-config (path existence NOT checked here) | 007-context-management (file loading+parsing) |
| `askTimeout` | 001-config (range: 5-300s) | 006-permission-system |

### Error signaling

When startup validation fails (missing `apiKey`):
- `getConfig()` throws `ConfigError` with `code: "MISSING_REQUIRED_KEY"` and a human-readable message
- The CLI entry point catches this and displays the message before exiting with code 1

Non-fatal warnings (unknown keys, type mismatches, syntax errors in optional files) are emitted via a `warnings: string[]` field on the returned config object. The CLI prints them but continues.
