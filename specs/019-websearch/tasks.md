# Tasks: WebSearch Tool — Built-in Search Provider

| # | Task | Label | Dependencies | Verification |
|---|------|-------|-------------|-------------|
| T01 | Add `searchDuckDuckGo()` built-in provider to `web-search.ts` | [BE] | — | `pnpm test -- tests/tools/web-search.test.ts` |
| T02 | Add 50KB result truncation to output formatter | [BE] | T01 | `pnpm test -- tests/tools/web-search.test.ts` |
| T03 | Route to built-in provider when no API key is set | [BE] | T01 | `pnpm test -- tests/tools/web-search.test.ts` |
| T04 | Write tests: built-in provider success path | [BE] | T01 | `pnpm test -- tests/tools/web-search.test.ts` |
| T05 | Write tests: built-in provider failure → graceful degradation | [BE] | T01 | `pnpm test -- tests/tools/web-search.test.ts` |
| T06 | Write tests: 50KB truncation | [BE] | T02 | `pnpm test -- tests/tools/web-search.test.ts` |
| T07 | Write tests: API key takes priority over built-in | [BE] | T03 | `pnpm test -- tests/tools/web-search.test.ts` |
| T08 | Verify existing 5 tests still pass | [INT] | T01-T03 | `pnpm test -- tests/tools/web-search.test.ts` |
| T09 | Manual smoke: real WebSearch call in one-shot mode | [INT] | T01-T08 | `npx tsx src/index.ts --prompt "search the web for TypeScript 5.8 release notes"` |
| T10 | Update closeout docs (state.md + session.md) | [INT] | T09 | Review docs |
