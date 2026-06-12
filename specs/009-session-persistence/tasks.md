# Tasks: Session Persistence

## Task Summary

12 tasks · 3 parallel groups · estimated 1.5-2 hours

---

## Group 1: Foundation (serial)

### T-01: Define persistence types + create DB schema
| | |
|---|---|
| **Source** | spec §Integration Contract, plan §SQLite schema |
| **Dependencies** | 002-runtime (SessionState type) |
| **Verification** | `tsc --noEmit`; table created in `:memory:` database |

Create `src/persistence/types.ts`:
- `SessionRecord { id, createdAt, updatedAt, turnCount, firstMessage, stateJson }`
- `SessionSummary { id, date, turns, firstMessage }` (for --list)
- `SaveResult { success: boolean; error?: string }`

Create `src/persistence/store.ts`:
- `initDb(dbPath: string): Database` — creates table if not exists
- `upsertSession(db, record): void` — INSERT OR REPLACE
- `getSession(db, id): SessionRecord | null`
- `listSessions(db, limit = 20): SessionSummary[]`

---

## Group 2: Core modules (parallel — depend on T-01)

### T-02: Implement serializer
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests: round-trip SessionState ↔ JSON ↔ SessionState |

Create `src/persistence/serializer.ts`:
- `serialize(state: SessionState): string` — JSON.stringify with Date → number conversion
- `deserialize(json: string): SessionState` — JSON.parse with number → Date conversion
- On parse error → throw `SessionCorruptedError`

### T-03: Implement session manager
| | |
|---|---|
| **Dependencies** | T-01, T-02 |
| **Verification** | Tests: save, load, list, atomic write, disk full |

Create `src/persistence/session-manager.ts`:
- `createSessionManager(dbPath: string): SessionManager`
- `save(state: SessionState): Promise<SaveResult>` — serialize → atomic write to temp → rename
- `load(id: string): Promise<SessionState | null>` — read → deserialize
- `list(): Promise<SessionSummary[]>` — query summaries
- Disk full → catch write error → return `{ success: false }`

---

## Group 3: Wiring + Tests (parallel)

### T-04: Create public API
| | |
|---|---|
| **Dependencies** | T-03, 001-config |
| **Verification** | Exports save/load/list |

Create `src/persistence/index.ts`:
- `createPersistence(config: Config): SessionManager`
- DB path: `~/.superagent/sessions.db` (or project-level override)
- Update stub at `src/runtime/stubs/session.ts`

### T-05: Unit tests — serializer
| | |
|---|---|
| **Dependencies** | T-02 |
Create `tests/persistence/serializer.test.ts`:
- Round trip: state → JSON → state (equal)
- Empty messages → works
- Session with 100 messages → works
- Corrupted JSON → throws SessionCorruptedError
- States with undefined fields → handled

### T-06: Unit tests — store
| | |
|---|---|
| **Dependencies** | T-01 |
Create `tests/persistence/store.test.ts`:
- SQLite in `:memory:` mode
- INSERT → SELECT → record matches
- UPDATE → updated record
- listSessions → ordered by updated_at desc

### T-07: Unit tests — session manager
| | |
|---|---|
| **Dependencies** | T-03 |
Create `tests/persistence/session-manager.test.ts`:
- Save + load → SessionState matches
- List with 3 sessions → 3 summaries
- Load non-existent → null
- Save with disk full (mock) → returns error (no throw)
- Atomic write: check no .tmp file left after successful save

### T-08: Integration — wire to runtime
| | |
|---|---|
| **Dependencies** | T-04, 002-runtime |
| **Verification** | Session saved after each turn in runtime integration test |

Update 002 runtime to call `save(state)` after each `turn:end` event.

### T-09: Add --resume and --list CLI flags
| | |
|---|---|
| **Dependencies** | T-04, 008-cli-repl |
| **Verification** | `node dist/index.js --list` shows sessions; `--resume` loads last |

Update `src/index.ts`:
- Parse `--resume [sessionId]` and `--list` from `process.argv`
- `--list` → print sessions → exit
- `--resume` → load session → inject continue message → enter REPL

### T-10: Smoke test — resume
| | |
|---|---|
| **Dependencies** | T-09 |
Create `tests/persistence/smoke.test.ts`:
- Start session, complete 1 turn
- Kill process
- Start with `--resume` → continues from turn 2
