# Tasks: Config System

## Task Summary

14 tasks · 4 parallel groups · estimated 2-3 hours total

---

## Group 1: Foundation (serial)

### T-01: Define config types and built-in defaults
| | |
|---|---|
| **Source** | PRD §6-F8, spec §Config Item Catalog |
| **Dependencies** | None |
| **Verification** | `types.ts` compiles with strict mode; `defaults.ts` has all keys from spec catalog |

**What to do:**
- Create `src/config/types.ts` with `ConfigSchema` type (all keys from spec Config Item Catalog), `MergedConfig` type (resolved config after merge), `ConfigLoadResult` type (`{ config, warnings }`), and `ConfigError` class
- Create `src/config/defaults.ts` with a single exported object containing all default values per spec catalog
- Both files must compile with `tsc --strict`

**Done when:** Types file passes `tsc --noEmit`; defaults file exports an object matching the ConfigSchema shape.

---

## Group 2: Core modules (parallel — all depend on T-01)

### T-02: Implement file loader
| | |
|---|---|
| **Source** | spec §Business Flow, spec §Boundary Conditions |
| **Dependencies** | T-01 (types) |
| **Verification** | `pnpm vitest run tests/config/loader.test.ts` — all pass |

**What to do:**
- Create `src/config/loader.ts`
- Implement `loadConfigFile(filePath: string): object | null`
  - Resolve `~` to `os.homedir()` or `%USERPROFILE%`
  - Read file with `fs.readFileSync` (UTF-8 only)
  - Detect BOM — fail with `ConfigError("ENCODING_ERROR")`
  - Empty file → return `{}`
  - Parse JSON — on failure throw `ConfigError("PARSE_ERROR", { filePath, lineNumber })`
  - File not found → return `null` (not an error)
  - Permission denied → warn + return `null`

### T-03: Implement deep merge
| | |
|---|---|
| **Source** | spec §Business Flow (merge rules), spec §Integration Contract |
| **Dependencies** | T-01 (types) |
| **Verification** | `pnpm vitest run tests/config/merger.test.ts` — all pass |

**What to do:**
- Create `src/config/merger.ts`
- Implement `mergeConfigs(base: object, override: object): object`
  - Scalar values: override replaces base entirely
  - Arrays: concatenate + deduplicate (first occurrence kept)
  - Nested objects: recurse and merge
  - `null` in override → explicit reset (key removed or set to null)
  - No prototype pollution (only own properties)
  - No mutation of input objects (return new object)

### T-04: Implement environment variable parser
| | |
|---|---|
| **Source** | spec §MVP Constraints, spec §Boundary Conditions |
| **Dependencies** | T-01 (types) |
| **Verification** | `pnpm vitest run tests/config/env-parser.test.ts` — all pass |

**What to do:**
- Create `src/config/env-parser.ts`
- Implement `parseEnvVars(): object`
  - Extract all `process.env` keys starting with `SUPERAGENT_`
  - Strip prefix, lowercase, convert underscores back to dots: `SUPERAGENT_MAX_TURNS` → `maxTurns`
  - Type coercion: `"50"` → `50` (integer), `"true"` → `true`, `"[...]"` → parsed JSON array, invalid JSON → plain string
  - Empty string → skip (treated as not set)
  - Return a flat object ready for merging

### T-05: Implement Zod validator
| | |
|---|---|
| **Source** | spec §Config Item Catalog, spec §Integration Contract |
| **Dependencies** | T-01 (types) |
| **Verification** | `pnpm vitest run tests/config/validator.test.ts` — all pass |

**What to do:**
- Create `src/config/validator.ts`
- Define Zod schema matching spec Config Item Catalog:
  - `apiKey`: `z.string().min(1)` (required)
  - `model`: `z.string()` (default provided by merger)
  - `baseUrl`: `z.string().url()`
  - `maxTurns`: `z.number().int().min(1).max(500)`
  - `fallbackModel`: `z.string()`
  - `fallbackBaseUrl`: `z.string().url()`
  - `permissions.autoApprove`: `z.array(z.string())`
  - `permissions.deny`: `z.array(z.string())`
  - `permissions.askTimeout`: `z.number().int().min(5).max(300)`
  - `rulesFile`: `z.string()`
- Implement `validateConfig(raw: object): { config: MergedConfig; warnings: string[] }`
  - Unknown keys → warn, strip from output
  - Type mismatches → warn + use default
  - `apiKey` missing → throw `ConfigError("MISSING_REQUIRED_KEY")`
- Infer TS types from Zod: `type MergedConfig = z.infer<typeof configSchema>`

---

## Group 3: Orchestrator (serial — depends on all Group 2)

### T-06: Implement getConfig() orchestrator
| | |
|---|---|
| **Source** | spec §Business Flow diagram, spec §Integration Contract |
| **Dependencies** | T-02, T-03, T-04, T-05 |
| **Verification** | `pnpm vitest run tests/config/config.test.ts` — all pass |

**What to do:**
- Create `src/config/config.ts`
- Implement `getConfig(): ConfigLoadResult`
  - Step 1: Start with defaults (T-01)
  - Step 2: Load global config (T-02) → merge (T-03)
  - Step 3: Load project config (T-02) → merge (T-03)
  - Step 4: Parse env vars (T-04) → merge (T-03)
  - Step 5: Validate (T-05)
  - Step 6: Return `{ config, warnings }` or throw `ConfigError`
- Collect all warnings from each step into a single array
- On fatal error (missing apiKey), throw — do not return partial config

---

## Group 4: Tests (parallel — each depends on its target module)

### T-07: Unit tests — defaults
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Test file runs; all assertions pass |

Create `tests/config/defaults.test.ts`:
- Every required key from spec catalog is present in defaults
- No extra keys beyond spec catalog
- Default `maxTurns` = 50
- Default `model` = `"deepseek-v4-pro"`

### T-08: Unit tests — loader
| | |
|---|---|
| **Dependencies** | T-02 |
| **Verification** | Test file runs; all assertions pass |

Create `tests/config/loader.test.ts`:
- Valid JSON file → returns parsed object
- Missing file → returns `null` (not throw)
- Empty file → returns `{}`
- JSON syntax error → throws `ConfigError` with file path and line number
- BOM file → throws `ConfigError("ENCODING_ERROR")`
- Tilde expansion: `~/...` resolves to `$HOME/...`

### T-09: Unit tests — merger
| | |
|---|---|
| **Dependencies** | T-03 |
| **Verification** | Test file runs; all assertions pass |

Create `tests/config/merger.test.ts`:
- Scalar override: `{a: 1}` + `{a: 2}` → `{a: 2}`
- Array merge: `{a: [1]}` + `{a: [2]}` → `{a: [1, 2]}`
- Array dedup: `{a: [1]}` + `{a: [1, 2]}` → `{a: [1, 2]}`
- Null reset: `{a: {b: 1}}` + `{a: null}` → `{a: null}`
- Nested merge: `{p: {a: 1}}` + `{p: {b: 2}}` → `{p: {a: 1, b: 2}}`
- No mutation: input objects unchanged after merge
- Prototype safety: `__proto__` key does not affect Object.prototype

### T-10: Unit tests — env parser
| | |
|---|---|
| **Dependencies** | T-04 |
| **Verification** | Test file runs; all assertions pass |

Create `tests/config/env-parser.test.ts`:
- `SUPERAGENT_MODEL=test` → `{model: "test"}`
- `SUPERAGENT_MAX_TURNS=100` → `{maxTurns: 100}` (integer, not string)
- `SUPERAGENT_PERMISSIONS_AUTOAPPROVE='["Read"]'` → `{permissions: {autoApprove: ["Read"]}}`
- `SUPERAGENT_API_KEY=""` → key not in output (empty = not set)
- No `SUPERAGENT_*` vars → returns `{}`
- Non-prefixed vars ignored (e.g., `PATH`, `HOME`)

### T-11: Unit tests — validator
| | |
|---|---|
| **Dependencies** | T-05 |
| **Verification** | Test file runs; all assertions pass |

Create `tests/config/validator.test.ts`:
- Valid config passes → returns config without warnings
- Missing apiKey → throws `ConfigError("MISSING_REQUIRED_KEY")`
- Unknown key → warning emitted, key stripped from output
- `maxTurns` = `"notanumber"` → warning + default used
- `maxTurns` = `-5` → warning + default used
- `baseUrl` = `"not-a-url"` → warning + default used
- `askTimeout` = `0` → warning + default used

### T-12: Integration test — full pipeline
| | |
|---|---|
| **Dependencies** | T-06 |
| **Verification** | Test file runs; all assertions pass |

Create `tests/config/config.test.ts`:
- No config files + no env vars → loads defaults, warns about missing apiKey (but gets past merge — apiKey check in validator)
- Project overrides global (mock both files with temp dirs)
- Env var overrides project (set `SUPERAGENT_MAX_TURNS=99` before test)
- Both files have syntax errors → boots with defaults + 2 warnings
- One file unreadable → warning + skip + continue with other layers
- Multiple warnings collected in order (global → project → env)

---

## Group 5: CLI wiring + smoke test (serial — depends on Group 4)

### T-13: Wire up CLI skeleton
| | |
|---|---|
| **Source** | spec §Integration Contract |
| **Dependencies** | T-06 |
| **Verification** | `node dist/index.js` prints config or error message |

**What to do:**
- Create `src/index.ts` (or update if exists)
- Import `getConfig` from `./config/config`
- Call `getConfig()` in a try/catch
- On success: print each warning to stderr, then print `"Config loaded. Model: {model}"` to stdout
- On `ConfigError`: print message to stderr, `process.exit(1)`
- On unexpected error: print stack trace, `process.exit(2)`

### T-14: End-to-end smoke test
| | |
|---|---|
| **Dependencies** | T-13 |
| **Verification** | Test runs the built CLI as a subprocess; verifies exit codes and output |

Create `tests/config/smoke.test.ts`:
- Run `node dist/index.js` with `SUPERAGENT_API_KEY=test-key` → exit 0, stdout contains "Config loaded"
- Run without `SUPERAGENT_API_KEY` and no config files → exit 1, stderr contains "API key not configured"
- Run with malformed `.superagent/settings.json` → exit 0 (non-fatal), stderr contains warning, stdout contains "Config loaded"

---

## Execution Order

```
T-01 (types + defaults)
 │
 ├── T-02 (loader) ────────┐
 ├── T-03 (merger) ────────┤  parallel
 ├── T-04 (env-parser) ────┤
 └── T-05 (validator) ─────┘
              │
         T-06 (orchestrator)
              │
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
T-07       T-08       T-09     (parallel unit tests)
T-10       T-11       T-12
    │         │         │
    └─────────┼─────────┘
              ▼
         T-13 (CLI wire)
              │
         T-14 (smoke test)
```

**Parallel opportunities**: T-02/03/04/05 can all be built simultaneously. T-07 through T-12 can all run in parallel after their respective implementations are done.

**Task duration estimate**: Each task targets 2-5 minutes for the core logic, plus test writing time within each task. Total ~2-3 hours for the full feature.
