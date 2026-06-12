# Tasks: Builtin Tools

## Task Summary

16 tasks · 4 parallel groups · estimated 3-4 hours

---

## Group 1: Foundation (serial)

### T-01: Define tool types + registry
| | |
|---|---|
| **Source** | spec §Integration Contract, spec §Tool Catalog |
| **Dependencies** | None |
| **Verification** | `tsc --noEmit`; registry test passes |

**What to do:**
- Create `src/tools/types.ts`: ToolFunction, ToolContext, ToolResult
- Create `src/tools/registry.ts`: `registerTool()`, `getTool()`, `listTools()`, `isConcurrencySafe()`
- Registry uses Map<string, { fn, schema, concurrencySafe }>

---

## Group 2: Read-only tools (parallel — depend on T-01)

### T-02: Implement Read tool
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: normal, offset/limit, missing file, binary, large file |

Create `src/tools/read.ts`:
- Resolve path relative to workingDirectory
- Validate path is within project (no `../` escape)
- Detect binary (null bytes in first 1KB)
- Apply offset/limit
- Format output: line-numbered text
- > 1MB → first 2000 lines + size warning

### T-03: Implement Grep tool
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: found, not found, invalid regex, > 250 matches truncated |

Create `src/tools/grep.ts`:
- Validate regex (try new RegExp)
- Walk directory recursively (skip node_modules, .git, dist)
- Filter by glob pattern if provided
- Read each file line-by-line
- Truncate at 250 matches
- Return matches with file, line_number, line_content

### T-04: Implement Glob tool
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: matched files, empty pattern, escape attempt |

Create `src/tools/glob.ts`:
- Use minimatch or fast-glob
- Default ignore: node_modules, .git, dist, .next, build
- Sort by mtime descending
- Return file list (≤ 1000)
- Block patterns that escape project root

### T-05: Implement Task tool
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: create, update, complete, list, > 20 warning |

Create `src/tools/task.ts`:
- In-memory task array (scoped to session)
- Operations: create, update (by id), list
- Auto-assign IDs if not provided
- > 20 tasks → warning in output
- Return formatted task list after each operation

---

## Group 3: Write tools (parallel — depend on T-01)

### T-06: Implement Write tool
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: new file, overwrite, parent missing, large content |

Create `src/tools/write.ts`:
- Resolve path, check within project
- Parent directory must exist (error if not)
- If file exists: read old content for diff (store for 008-cli-repl)
- Write content via fs.writeFileSync
- Validate content ≤ 1MB
- Return `{ bytes_written, lines_written }`

### T-07: Implement Edit tool
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: exact match, no match, multi-match, replace_all |

Create `src/tools/edit.ts`:
- Read current file content
- Search for old_string exact match
- 0 matches → error "No match found"
- > 1 match + !replace_all → error with line numbers
- = 1 or replace_all → replace and write
- Return `{ replacements: [{ line_start, line_end }] }`

### T-08: Implement Bash tool
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: normal exit, non-zero exit, timeout, empty command |

Create `src/tools/bash.ts`:
- Use `child_process.exec` with cwd = workingDirectory
- env: inherit process.env + `SUPERAGENT_MODE=true`
- Timeout: setTimeout + process.kill after N ms (default 120s)
- Capture stdout + stderr (max 100KB each)
- Return `{ stdout, stderr, exit_code, killed_by_timeout }`
- Empty command → error

### T-09: Implement WebSearch tool
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: results returned, timeout handled, no API key → empty |

Create `src/tools/web-search.ts`:
- POST to search API (configurable endpoint)
- 30s timeout
- Parse results → `[{ title, url, snippet }]`
- On any error (timeout, no key, server error) → return empty with note
- Never block or throw

---

## Group 4: Tests for all tools (parallel)

### T-10: Unit tests — Read
| | |
|---|---|
| **Dependencies** | T-02 |
Create `tests/tools/read.test.ts` — standard file, offset, missing, binary, large.

### T-11: Unit tests — Grep
| | |
|---|---|
| **Dependencies** | T-03 |
Create `tests/tools/grep.test.ts` — found, not found, regex error, truncation.

### T-12: Unit tests — Glob
| | |
|---|---|
| **Dependencies** | T-04 |
Create `tests/tools/glob.test.ts` — match, empty, escape blocked, mtime sort.

### T-13: Unit tests — Task
| | |
|---|---|
| **Dependencies** | T-05 |
Create `tests/tools/task.test.ts` — CRUD, list, > 20 warning.

### T-14: Unit tests — Write + Edit
| | |
|---|---|
| **Dependencies** | T-06, T-07 |
Create `tests/tools/write.test.ts` + `tests/tools/edit.test.ts` — full coverage.

### T-15: Unit tests — Bash + WebSearch
| | |
|---|---|
| **Dependencies** | T-08, T-09 |
Create `tests/tools/bash.test.ts` + `tests/tools/web-search.test.ts`.

---

## Group 5: Integration

### T-16: Register all tools + registry integration test
| | |
|---|---|
| **Dependencies** | T-02 through T-09 |
| **Verification** | All 8 tools pass integration test: register → get → execute → result |

Create `src/tools/index.ts`:
- `registerAllTools()` — calls `registerTool()` for all 8
- Update 002 stub: `src/runtime/stubs/tools.ts` now imports from `src/tools/index.ts`

Create `tests/tools/registry.test.ts`:
- Register all tools → count = 8
- Each tool returns valid ToolResult (no throws)
- Concurrency flags correct: Read/Grep/Glob/Task/WebSearch = safe; Write/Edit/Bash = unsafe
