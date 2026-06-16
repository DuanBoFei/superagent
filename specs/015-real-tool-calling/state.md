# State: 015 Real Tool Calling

Status: Completed
Date: 2026-06-16

## Verification

- `pnpm typecheck` — passed
- `pnpm test -- tests/models tests/runtime/query-loop.test.ts tests/runtime/stream-handler.test.ts` — passed, 49 tests passed, 1 skipped
- `pnpm start -- --prompt "分析一下 src/runtime/runtime.ts 的 createRuntime 做了什么"` — passed, produced final Chinese analysis after tool-backed file reading

## Completed Scope

- Provider requests include OpenAI-compatible `tools` and `tool_choice: "auto"` when tools are available.
- Runtime injects current registered tool definitions into model prompts.
- Streaming parser accumulates structured `delta.tool_calls`, including fragmented arguments and multiple indexed calls.
- Malformed structured tool arguments emit redacted parser errors instead of leaking secret-looking values.
- Query loop dispatches structured tool calls and feeds tool results into the next model request.
- Text fallback parser remains available for legacy pseudo-tool markup, with structured calls taking precedence to avoid duplicate dispatch.
