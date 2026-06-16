# Tasks: Model Fallback

## Task Summary

18 tasks · 2-5 min each · TDD-first where possible

## Phase 1: Policy Contracts

- [x] T001 [BE] Add `tests/models/fallback-policy.test.ts` for timeout fallback decision  
  Source: FR-MF-02 · Input: timeout error category · Output: fallback decision · Verify: `pnpm test -- tests/models/fallback-policy.test.ts`

- [x] T002 [BE] Add policy test for 5xx primary retry then fallback  
  Source: FR-MF-02, FR-MF-05 · Input: 5xx error + attempt count · Output: retry then fallback · Verify: same test file

- [x] T003 [BE] Add policy test for 400/401/403 terminal errors  
  Source: FR-MF-03 · Input: non-retryable status · Output: fail decision · Verify: same test file

- [x] T004 [BE] Create `src/models/fallback-policy.ts` with minimal decision function  
  Source: FR-MF-02, FR-MF-03 · Input: error category + attempts · Output: retry/fallback/fail · Verify: policy tests

## Phase 2: Provider Error Normalization

- [x] T005 [BE] Add provider error classification test for HTTP 429/5xx  
  Source: FR-MF-02 · Input: fake response status · Output: retryable category · Verify: `pnpm test -- tests/models/provider-fallback.test.ts`

- [x] T006 [BE] Add provider error classification test for HTTP 400/401  
  Source: FR-MF-03 · Input: fake response status · Output: terminal category · Verify: same test file

- [x] T007 [BE] Normalize provider thrown errors with status/category fields  
  Source: FR-MF-02, FR-MF-03 · Input: provider failure · Output: categorized error · Verify: provider fallback tests

- [x] T008 [BE] Add timeout error mapping in model client/provider boundary  
  Source: FR-MF-02 · Input: abort/timeout error · Output: timeout category · Verify: provider fallback tests

## Phase 3: Fallback Orchestration

- [x] T009 [BE] Add test that fallback preserves request body except model id  
  Source: FR-MF-04 · Input: prompt + tools · Output: second request differs only in model · Verify: provider fallback tests

- [x] T010 [BE] Add test that successful primary does not call fallback  
  Source: NFR-MF-02 · Input: primary success stream · Output: one provider call · Verify: provider fallback tests

- [x] T011 [BE] Wire fallback policy into `src/models/client.ts` stream path  
  Source: FR-MF-01, FR-MF-02 · Input: retryable primary failure · Output: fallback stream · Verify: provider fallback tests

- [x] T012 [BE] Cap total attempts and emit deterministic failure after fallback fails  
  Source: FR-MF-05, FR-MF-06 · Input: primary and fallback failures · Output: error token/event · Verify: provider fallback tests

## Phase 4: Observability & Safety

- [x] T013 [BE] Add observability event test for fallback trigger  
  Source: FR-MF-07 · Input: fake retryable failure · Output: fallback event · Verify: targeted model test

- [x] T014 [BE] Emit model attempt start/end/fallback events  
  Source: FR-MF-07 · Input: primary then fallback · Output: safe events · Verify: observability test

- [x] T015 [BE] Add redaction test for provider errors containing api_key or Authorization  
  Source: FR-MF-08 · Input: secret-like error text · Output: redacted summary · Verify: redaction test

- [x] T016 [BE] Redact provider error summaries before user/log output  
  Source: FR-MF-08 · Input: provider error · Output: safe message · Verify: redaction test

## Phase 5: Verification

- [x] T017 [INT] Run targeted model/runtime fallback tests together  
  Source: all · Input: changed tests · Output: green suite · Verify: `pnpm test -- tests/models tests/runtime/query-loop.test.ts`

- [x] T018 [BE] Run typecheck  
  Source: all · Input: repository · Output: no TS errors · Verify: `pnpm typecheck`
