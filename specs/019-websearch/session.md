# Session: 019 WebSearch Built-in Provider

Date: 2026-06-16

## Changes

- `src/tools/web-search.ts` — Rewrote to add built-in DuckDuckGo HTML search provider, 50KB truncation, and routing logic. When `SUPERAGENT_WEBSEARCH_API_KEY` is unset (the default), the tool uses DuckDuckGo's HTML search (free, no auth). When the API key is set, it uses the configured custom endpoint as before.
- `tests/tools/web-search.test.ts` — Added 9 new tests: built-in provider success, multi-result, empty results, network error, HTTP 429, 50KB truncation, small results no-truncate, API key priority, and built-in timeout. Existing 5 tests pass unchanged.
- `tests/tools/registry.test.ts` — Added fetch mock for the "each tool returns a valid ToolResult" integration test, since WebSearch now hits the network by default.
- `specs/019-websearch/` — Feature documentation (spec.md, plan.md, tasks.md, state.md, session.md).

## Gate Results

| Gate | Result |
|------|--------|
| typecheck | PASS |
| web-search tests (14) | PASS |
| all tools tests (57) | PASS |
| full suite (704/708) | PASS (3 pre-existing failures unrelated) |
| real DuckDuckGo smoke | PASS |

## No Breaking Changes

- Custom endpoint path (API key set) is untouched
- Tool schema unchanged (`{ query: string }`)
- Tool registration unchanged (concurrencySafe: true)
- Zero new dependencies
