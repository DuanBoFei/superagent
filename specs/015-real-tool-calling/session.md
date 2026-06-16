# Session: 015 Real Tool Calling

## Result

Feature 015 is complete and verified. SuperAgent now sends real tool definitions (`tools` + `tool_choice: "auto"`) to OpenAI-compatible providers, parses structured streaming `delta.tool_calls` with fragment accumulation, dispatches tool calls through the runtime, feeds tool results back into subsequent model requests, and safely redacts malformed argument previews. Two structural gaps (G1 `tool_error` silently dropped, G2 fallback tools not tested) found by the test-routing-advisor are also closed.

## Final Metrics

- 24 tasks (T001-T024) — all complete
- 2 structural gap fixes (G1, G2) — both complete
- Total tests: 52 passed across 8 test files
- Typecheck: clean
- DeepSeek smoke: passed

## Changes Summary

### Provider Request Contracts (T001-T005)
- Model tool definition generation from registered Zod tool schemas
- Stable tool ordering for deterministic request bodies
- `tools` and `tool_choice: "auto"` wired into provider request body

### Streaming Parser (T006-T012)
- Per-request `ToolCallAccumulator` (Map-based) for delta tool calls
- Fragmented argument accumulation and reassembly
- Multiple indexed tool calls emitted in order
- Malformed JSON arguments emit redacted error tokens (no secret leakage)
- Accumulator state cleared at stream end/error (no cross-stream leakage)

### Runtime Integration (T013-T017)
- Runtime injects registered tool definitions into model prompts
- Structured tool call dispatch through query loop
- Tool results fed into next model request as `role: "tool"` messages
- Text fallback parser preserved alongside structured path
- Precedence: structured calls take priority, no duplicate dispatch

### Safety & Smoke (T018-T024)
- Malformed argument previews redacted in parser errors
- Observability-safe error summaries (no raw secrets)
- Stream-handler fallback suite — no regressions
- DeepSeek one-shot smoke — passed
- Typecheck — clean
- Closeout docs — state.md + session.md

### Structural Gap Fixes
- **G1**: `tool_error` chunk silently dropped — fixed `Token` discriminated union, stubs mapping, stream-handler error yield, and test
- **G2**: Fallback tools path untested — added "preserves tools in fallback request when primary fails" test

## Verification Log

```bash
pnpm typecheck                              # passed
pnpm test -- tests/models tests/runtime/query-loop.test.ts \
  tests/runtime/stream-handler.test.ts \
  tests/context/composer.test.ts tests/tools  # 52 passed
pnpm start -- --prompt "分析 createRuntime"  # passed (DeepSeek smoke)
```

## Branch & Tag

Developed on `worktree-feat-011-mcp-server-integration` (shared with 011 MCP).
Tag: `v0.1.0-015-real-tool-calling`.

## Notes

- Interactive Windows terminal input flicker → `017-cli-stability-windows`
- Model fallback policy → `016-model-fallback`
- The `client-tool-calls.test.ts` file is added but untracked in the final commit; it belongs to 015 T006-T012 verification
