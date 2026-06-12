# Spec: Tool Scheduling

## Feature Overview

### What

A tool orchestrator that receives a batch of tool calls from the Core Runtime, partitions them into concurrent (read-only) and serial (write) groups, executes each group in the correct order, and returns results. It is the bridge between "Agent wants to do X" and "X actually happens."

### Why

Without scheduling, all tool calls would execute serially — a single turn with 5 Read calls would take 5× longer than necessary. Conversely, running Write and Edit concurrently on the same file would cause race conditions. Smart partitioning makes the Agent faster without sacrificing correctness.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Concurrency-safe partitioning | Split tool calls into parallel-safe (Read, Grep, Glob, Task, WebSearch) and serial-required (Write, Edit, Bash) groups |
| Parallel execution | Execute all safe tools concurrently (max 5 at once) |
| Serial execution | Execute unsafe tools one at a time, in declaration order |
| Result ordering | Return results in the same order tool calls were declared (regardless of execution order) |
| Timeout per tool | Each tool has its own timeout; scheduler adds no extra timeout |
| Output trimming | Trim tool results before returning to prevent context overflow |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| Tool execution across multiple turns | Scheduler handles one batch per call |
| Dynamic reprioritization | Order is fixed per batch |
| Tool cancellation once started | Only Ctrl+C (process-level) |
| Streaming tool results | Tools complete fully before result returned |

---

## Acceptance Criteria

### AC-SCH-01: Parallel read-only tools

**Given** a batch of 5 tool calls: Read, Read, Grep, Glob, WebSearch
**When** the scheduler processes them
**Then** all 5 execute concurrently. Total execution time ≈ slowest single tool (not sum of all 5).

### AC-SCH-02: Write tools serialized

**Given** a batch: Write(file A), Edit(file B), Write(file C)
**When** the scheduler processes them
**Then** they execute sequentially: A → B → C. If A fails, B and C are skipped (they return `{ error: "Skipped: previous tool failed" }`).

### AC-SCH-03: Mixed batch partitioned correctly

**Given** a batch: Read(a), Write(b), Grep(c), Edit(d)
**When** the scheduler processes them
**Then** Read + Grep execute in parallel first, then Write, then Edit (serial group after parallel group completes).

### AC-SCH-04: Parallel capped at 5

**Given** a batch of 10 Read calls
**When** the scheduler processes them
**Then** max 5 run concurrently. The next 5 start as the first 5 complete. Result order matches declaration order.

### AC-SCH-05: Model requests > 8 tools

**Given** a batch of 12 tool calls from the model
**When** the scheduler receives them
**Then** only the first 8 execute. The remaining 4 return `{ error: "Skipped: batch limited to 8 tools per turn" }`.

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| Empty batch (0 tool calls) | Return empty results array immediately |
| Single tool call | Execute regardless of type (no concurrency benefit) |
| Same file in parallel read and serial write | Read completes before Write starts (read group finishes before serial group) |
| Tool not found in registry | Return `{ error: "Unknown tool: {name}" }` for that tool; continue with others |
| Tool throws (unexpected) | Catch, return `{ error: "Tool execution error: {message}" }`; continue |

---

## Integration Contract

### Provided Interface

```
dispatchTools(calls: ToolCall[], registry: ToolRegistry): Promise<ToolResult[]>
```

### Consumed

| Module | What |
|--------|------|
| 004-builtin-tools | Tool registry (getTool, isConcurrencySafe) |
| 006-permission-system | Intercepts each tool call before execution |

### Called by

| Module | What |
|--------|------|
| 002-core-runtime | Sends batch of tool calls parsed from model response |
