# Tasks: Tool Scheduling

## Task Summary

12 tasks · 3 parallel groups · estimated 1.5-2 hours

---

## Group 1: Foundation (serial)

### T-01: Define scheduling types
| | |
|---|---|
| **Source** | spec §Integration Contract |
| **Dependencies** | 004-builtin-tools (types only) |
| **Verification** | `tsc --noEmit` |

Create `src/scheduling/types.ts`:
- `ToolCall { name, args, id }`
- `ToolResult { id, name, output, error?, success }`
- `BatchPlan { concurrent: ToolCall[], serial: ToolCall[] }`

---

## Group 2: Core modules (parallel — depend on T-01)

### T-02: Implement partitioner
| | |
|---|---|
| **Dependencies** | T-01, 004 (registry interface) |
| **Verification** | Unit test: correct partition for mixed batch |

Create `src/scheduling/partitioner.ts`:
- `partition(calls: ToolCall[], registry: ToolRegistry): BatchPlan`
- Query `registry.isConcurrencySafe(name)` for each tool
- true → concurrent group
- false → serial group (preserve declaration order within group)
- Unknown tool → serial group (safer default)

### T-03: Implement executor
| | |
|---|---|
| **Dependencies** | T-02, 006-permission-system (stub) |
| **Verification** | Unit test: concurrent timing, serial ordering, failure propagation |

Create `src/scheduling/executor.ts`:
- `executeBatch(plan: BatchPlan, registry: ToolRegistry, permission: PermissionSystem): Promise<ToolResult[]>`
- Step 1: Execute concurrent group in batches of 5 via `Promise.allSettled`
- Step 2: Execute serial group sequentially; stop on first failure
- Each tool call: check permission → if denied return error result → else execute tool → return result
- Merge results preserving original declaration order

---

## Group 3: Public API + Tests (parallel)

### T-04: Implement scheduler public API
| | |
|---|---|
| **Dependencies** | T-03 |
| **Verification** | Integration test passes |

Create `src/scheduling/scheduler.ts`:
- `createScheduler(registry: ToolRegistry, permission: PermissionSystem): { dispatchTools(calls: ToolCall[]): Promise<ToolResult[]> }`
- Validate batch size ≤ 8
- Call partitioner → executor
- Return results

### T-05: Unit tests — partitioner
| | |
|---|---|
| **Dependencies** | T-02 |
Create `tests/scheduling/partitioner.test.ts`:
- All safe tools → all in concurrent group
- All unsafe → all in serial group
- Mixed → correct partition
- Empty → empty both groups
- Unknown tool → serial group

### T-06: Unit tests — executor
| | |
|---|---|
| **Dependencies** | T-03 |
Create `tests/scheduling/executor.test.ts`:
- Concurrent tools finish in < serial time (mock delayed tools)
- Serial tools: failure stops subsequent
- Results in declaration order regardless of execution order
- Tool throws → caught, error result returned

### T-07: Integration test — scheduler
| | |
|---|---|
| **Dependencies** | T-04 |
Create `tests/scheduling/scheduler.test.ts`:
- Full pipeline: partition → execute → ordered results
- 12 tools → only first 8 executed

### T-08: Integration — wire to 002 stub
| | |
|---|---|
| **Dependencies** | T-04 |
Replace `src/runtime/stubs/tools.ts` dispatch with real scheduler.

### T-09: Re-run 002 integration tests
| | |
|---|---|
| **Dependencies** | T-08 |
Verify 002 runtime tests still pass with real scheduler.
