# Spec: Builtin Tools

## Feature Overview

### What

Eight built-in tools that the Agent uses to read code, modify files, execute commands, search, and manage tasks. Each tool has a defined input schema, output format, and boundary conditions. Tools are the Agent's only way to interact with the outside world.

### Why

Tools bridge the gap between "AI that talks about code" and "AI that works on code." Without tools, the Agent is a chatbot. Each tool is chosen for the MVP code-assistance workflow: find files (Glob), search code (Grep), read code (Read), modify code (Write/Edit), run commands (Bash), manage progress (Task), and search the web (WebSearch).

---

## Tool Catalog

### Read — Read file contents

| | |
|---|---|
| **Purpose** | Read a file with optional line range |
| **Input** | `file_path: string` (required), `offset?: number`, `limit?: number` |
| **Output** | File content with 1-indexed line numbers |
| **Concurrency** | Safe (read-only) |

### Write — Create or overwrite a file

| | |
|---|---|
| **Purpose** | Write content to a file, creating or overwriting |
| **Input** | `file_path: string` (required), `content: string` (required) |
| **Output** | `{ file_path, bytes_written, lines_written }` |
| **Concurrency** | Unsafe (must be serialized) |

### Edit — Exact string replacement in a file

| | |
|---|---|
| **Purpose** | Replace `old_string` with `new_string` at exactly one location |
| **Input** | `file_path: string`, `old_string: string`, `new_string: string`, `replace_all?: boolean` |
| **Output** | `{ file_path, replacements: [{ line_start, line_end }] }` or error if no/ambiguous match |
| **Concurrency** | Unsafe |

### Bash — Execute a shell command

| | |
|---|---|
| **Purpose** | Run a shell command in the project directory |
| **Input** | `command: string` (required), `timeout?: number` (default 120s) |
| **Output** | `{ stdout: string, stderr: string, exit_code: number }` |
| **Concurrency** | Unsafe |

### Grep — Search file contents with regex

| | |
|---|---|
| **Purpose** | Find lines matching a regex pattern |
| **Input** | `pattern: string` (required), `path?: string`, `glob?: string` |
| **Output** | `{ matches: [{ file, line_number, line_content }] }` |
| **Concurrency** | Safe (read-only) |

### Glob — Find files by pattern

| | |
|---|---|
| **Purpose** | List files matching a glob pattern |
| **Input** | `pattern: string` (required), `path?: string` |
| **Output** | `{ files: string[] }` sorted by modification time |
| **Concurrency** | Safe (read-only) |

### Task — Manage todo items

| | |
|---|---|
| **Purpose** | Create or update a task in the current session |
| **Input** | `subject: string`, `description?: string`, `status?: "pending" \| "in_progress" \| "completed"`, `taskId?: string` |
| **Output** | Updated task list |
| **Concurrency** | Safe (no file I/O) |

### WebSearch — Search the internet

| | |
|---|---|
| **Purpose** | Search for current information (docs, solutions) |
| **Input** | `query: string` (required) |
| **Output** | `{ results: [{ title, url, snippet }] }` or empty if unavailable |
| **Concurrency** | Safe (read-only external call) |

---

## Functional Boundaries

### In Scope for all tools

| Scope | Description |
|-------|-------------|
| Schema validation | Each tool validates its inputs; returns typed error on invalid input |
| Timeout enforcement | Bash capped at 120s; WebSearch at 30s |
| Output size limits | Read ≤ 2000 lines; Grep ≤ 250 matches; Glob ≤ 1000 files; Write ≤ 1MB |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| Tool auto-discovery / registration | Static tool list; MCP for dynamic tools in P1 |
| Async tool execution (fire-and-forget) | MVP tools complete before model gets next turn |
| Tool chaining / piping | Model orchestrates multi-tool sequences |
| Custom user-defined tools | MCP or hooks in P1 |
| Bash PTY / interactive commands | Non-interactive shell only |

---

## Acceptance Criteria

### AC-TOOL-01: Read — normal file

**Given** a file at `src/index.ts` with 100 lines
**When** `Read({ file_path: "src/index.ts" })` is called
**Then** returns lines 1-100 with line numbers. Lines are 1-indexed.

### AC-TOOL-02: Read — with offset/limit

**Given** the same file
**When** `Read({ file_path: "src/index.ts", offset: 50, limit: 10 })` is called
**Then** returns lines 50-59 only.

### AC-TOOL-03: Read — file not found

**Given** no file at `nonexistent.ts`
**When** `Read({ file_path: "nonexistent.ts" })` is called
**Then** returns error `{ error: "File not found: nonexistent.ts" }`. Does not throw.

### AC-TOOL-04: Write — new file

**Given** no file at `output.txt`
**When** `Write({ file_path: "output.txt", content: "hello" })` is called
**Then** creates `output.txt` with content "hello". Returns `{ bytes_written: 5, lines_written: 1 }`.

### AC-TOOL-05: Edit — exact match

**Given** a file containing `const x = 1;`
**When** `Edit({ file_path: "...", old_string: "const x = 1;", new_string: "const x = 2;" })` is called
**Then** the file contains `const x = 2;`. Returns the replacement line.

### AC-TOOL-06: Edit — no match

**Given** a file that does NOT contain `nonexistent text`
**When** `Edit({ file_path: "...", old_string: "nonexistent text", new_string: "..." })` is called
**Then** returns error "No match found. Use Read to verify the current content." File is unchanged.

### AC-TOOL-07: Edit — multiple matches without replace_all

**Given** a file containing `TODO` on lines 5 and 10
**When** `Edit({ file_path: "...", old_string: "TODO", new_string: "DONE" })` is called without `replace_all`
**Then** returns error "Multiple matches found at lines 5, 10. Use replace_all: true or provide more context."

### AC-TOOL-08: Bash — successful command

**Given** the current working directory is a git repo
**When** `Bash({ command: "git status --short" })` is called
**Then** returns `{ stdout: "<file list>", stderr: "", exit_code: 0 }`.

### AC-TOOL-09: Bash — timeout

**Given** a command that sleeps 300 seconds
**When** `Bash({ command: "sleep 300", timeout: 1 })` is called
**Then** kills the process after 1 second; returns partial stdout + exit_code from signal.

---

## Boundary Conditions

| Tool | Condition | Behavior |
|------|-----------|----------|
| Read | File > 1MB | Return first 2000 lines + warning "File too large ({size})" |
| Read | Binary file | Detect null bytes in first 1KB → error "Cannot read binary file" |
| Write | Parent directory missing | Error "Directory not found: {parent}" — do NOT auto-create (security) |
| Write | File exists | Read old content first, present in diff, then overwrite |
| Write | Content > 1MB | Error "Content too large ({size})" |
| Edit | old_string is empty | Error "old_string must not be empty" |
| Bash | Command contains `sudo` | Flag for permission check (handled by 006) |
| Bash | Command empty | Error "Command must not be empty" |
| Grep | Pattern has invalid regex | Error "Invalid regex pattern: {error_message}" |
| Grep | > 250 matches | Truncate + warning "Showing first 250 of {total} matches" |
| Glob | Pattern traverses above project root (`../../`) | Error "Pattern must stay within project directory" |
| Task | > 20 tasks | Warning "Too many tasks ({N}). Consider merging." |
| WebSearch | API timeout (30s) | Return `{ results: [], note: "Search unavailable" }` — do not block |
| WebSearch | API key not configured | Return empty gracefully (WebSearch is optional) |

---

## Integration Contract

### Provided Interface

Each tool is a function:

```
type ToolFunction = (args: object, context: ToolContext) => Promise<ToolResult>

ToolContext = {
  workingDirectory: string    // project root
  sessionId: string
}

ToolResult = {
  output: string              // human-readable result
  error?: string              // set if tool failed
  metadata?: object           // structured data (line numbers, match counts, etc.)
}
```

### Tool Registry

```
registerTool(name: string, fn: ToolFunction, schema: ZodSchema, concurrencySafe: boolean)
```

Called at startup for each of the 8 tools. The registry is consumed by 005-tool-scheduling.
