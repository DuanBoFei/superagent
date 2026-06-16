# State: 015 Real Tool Calling

Status: Completed
Date: 2026-06-16
Tag: v0.1.0-015-real-tool-calling

## Final Verification

- `pnpm typecheck` — passed
- `pnpm test -- tests/models tests/runtime/query-loop.test.ts tests/runtime/stream-handler.test.ts tests/context/composer.test.ts tests/tools` — passed, 52 tests passed
- `pnpm start -- --prompt "分析一下 src/runtime/runtime.ts 的 createRuntime 做了什么"` — passed, produced final Chinese analysis after tool-backed file reading

## Completed Scope

- Provider requests include OpenAI-compatible `tools` and `tool_choice: "auto"` when tools are available.
- Runtime injects current registered tool definitions into model prompts.
- Streaming parser accumulates structured `delta.tool_calls`, including fragmented arguments and multiple indexed calls.
- Malformed structured tool arguments emit redacted parser errors instead of leaking secret-looking values.
- Query loop dispatches structured tool calls and feeds tool results into the next model request.
- Text fallback parser remains available for legacy pseudo-tool markup, with structured calls taking precedence to avoid duplicate dispatch.

## Structural Gap Fixes (from test-routing-advisor)

- **G1**: `tool_error` chunk was silently dropped in `src/runtime/stubs/model.ts`. Fixed by adding `{ type: "error" }` variant to `Token` discriminated union, mapping `tool_error` chunks to error tokens in the stubs layer, yielding error `TurnEvent` in stream-handler, and verifying with a dedicated test.
- **G2**: Fallback path not tested with tools parameter. Fixed by adding "preserves tools in fallback request when primary fails" test to `tests/models/fallback.test.ts`.

## Branch Decision

015 was developed on `worktree-feat-011-mcp-server-integration` (shared worktree with 011). The branch already contains 011 MCP work and is pushed to `origin/worktree-feat-011-mcp-server-integration`. No separate 015 branch — tag `v0.1.0-015-real-tool-calling` marks the feature completion point.
