# Tasks: Real Tool Calling

## Task Summary

24 tasks · 2-5 min each · TDD-first where possible

## Phase 1: Provider Request Contracts

- [x] T001 [BE] Add `tests/models/provider-tools.test.ts` with a failing test for `tools` in request body  
  Source: FR-RTC-01, FR-RTC-03 · Input: fake prompt + one Read schema · Output: request JSON contains `tools` and `tool_choice` · Verify: `pnpm test -- tests/models/provider-tools.test.ts`

- [x] T002 [BE] Add stable tool-order test for generated model tool definitions  
  Source: NFR-RTC-01 · Input: two fake tools · Output: deterministic order · Verify: same test file

- [x] T003 [BE] Create `src/models/tool-schema.ts` export placeholder builder  
  Source: FR-RTC-01 · Input: registered tool metadata · Output: `ModelToolDefinition[]` · Verify: typecheck

- [x] T004 [BE] Implement minimal zod-object to JSON schema mapping for string/number/boolean/optional  
  Source: FR-RTC-02 · Input: Read schema · Output: JSON schema properties · Verify: provider tool tests

- [x] T005 [BE] Wire schema builder into `src/models/provider.ts` request body  
  Source: FR-RTC-01, FR-RTC-03 · Input: prompt + tools · Output: provider receives tools · Verify: provider tool tests

## Phase 2: Streaming Parser

- [ ] T006 [BE] Add `tests/models/client-tool-calls.test.ts` for complete `delta.tool_calls` chunk  
  Source: FR-RTC-04 · Input: SSE chunk with Read call · Output: tool_use token · Verify: targeted test

- [ ] T007 [BE] Add fragmented arguments stream test  
  Source: FR-RTC-05 · Input: two argument fragments · Output: one complete token · Verify: targeted test

- [ ] T008 [BE] Add multiple tool-call stream test  
  Source: FR-RTC-06 · Input: two indexed tool calls · Output: ordered tokens · Verify: targeted test

- [ ] T009 [BE] Add malformed structured JSON stream test  
  Source: FR-RTC-07 · Input: invalid JSON arguments · Output: error token/event · Verify: targeted test

- [ ] T010 [BE] Implement per-request tool-call accumulator in model client  
  Source: FR-RTC-05 · Input: streamed deltas · Output: accumulated call state · Verify: client tests

- [ ] T011 [BE] Emit normalized `Token` tool_use from completed accumulator entries  
  Source: FR-RTC-04 · Input: completed call · Output: existing token shape · Verify: client tests

- [ ] T012 [BE] Clear accumulator state at stream end/error  
  Source: NFR-RTC-02 · Input: two sequential fake streams · Output: no cross-stream leakage · Verify: client tests

## Phase 3: Runtime Integration

- [ ] T013 [INT] Extend runtime deps to pass available model tools to provider layer  
  Source: FR-RTC-01 · Input: runtime registry · Output: provider request gets tools · Verify: runtime/provider test

- [ ] T014 [INT] Add query-loop test for structured tool call dispatch  
  Source: FR-RTC-08 · Input: structured tool token · Output: dispatcher called · Verify: `pnpm test -- tests/runtime/query-loop.test.ts`

- [ ] T015 [INT] Add query-loop test for tool result in next request  
  Source: FR-RTC-09 · Input: Read result · Output: second prompt contains result · Verify: query-loop test

- [ ] T016 [INT] Ensure fallback parser remains after structured token path  
  Source: FR-RTC-10 · Input: text FunctionCall markup · Output: tool_call event · Verify: stream-handler test

- [ ] T017 [INT] Add precedence test: structured call plus text markup does not duplicate dispatch  
  Source: FR-RTC-11 · Input: mixed provider output · Output: single dispatch · Verify: runtime test

## Phase 4: Safety & Smoke

- [ ] T018 [BE] Redact malformed argument previews in parser errors  
  Source: FR-RTC-12 · Input: invalid JSON containing api_key · Output: redacted error · Verify: client parser test

- [ ] T019 [BE] Add observability-safe parser error summary test  
  Source: FR-RTC-12 · Input: malformed tool call · Output: no raw secrets in emitted error · Verify: client/runtime test

- [ ] T020 [INT] Run stream-handler fallback suite  
  Source: NFR-RTC-03 · Input: existing fallback cases · Output: no regressions · Verify: `pnpm test -- tests/runtime/stream-handler.test.ts`

- [ ] T021 [INT] Run one-shot local smoke against DeepSeek  
  Source: NFR-RTC-04 · Input: `pnpm start -- --prompt ...` · Output: final analysis after Read · Verify: manual command output

- [ ] T022 [BE] Run typecheck  
  Source: all · Input: repository · Output: no TS errors · Verify: `pnpm typecheck`

- [ ] T023 [INT] Run targeted model/runtime tests together  
  Source: all · Input: changed tests · Output: green targeted suite · Verify: `pnpm test -- tests/models tests/runtime/query-loop.test.ts tests/runtime/stream-handler.test.ts`

- [ ] T024 [DOC] Update feature state/session notes after verification  
  Source: closeout · Input: test results · Output: state/session docs · Verify: files exist
