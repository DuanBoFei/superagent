# Tasks: Release Readiness

## Task Summary

18 tasks · 2-5 min each · documentation/checklist first, verification at the end

## Phase 1: Setup Documentation

- [ ] T001 [DOC] Add local install steps to release readiness notes  
  Source: FR-RR-01 · Input: package manager scripts · Output: install section · Verify: docs contain `pnpm install`

- [ ] T002 [DOC] Add local API key configuration instructions with placeholders  
  Source: FR-RR-02, FR-RR-07 · Input: settings path and env option · Output: placeholder-only config docs · Verify: no real key in docs

- [ ] T003 [DOC] Add one-shot startup command documentation  
  Source: FR-RR-03 · Input: prompt command · Output: documented smoke command · Verify: docs contain `pnpm start -- --prompt`

- [ ] T004 [DOC] Add Playwright/browser setup note for browser tool  
  Source: FR-RR-06 · Input: browser tool dependency · Output: setup/verify note · Verify: docs mention browser binary verification

## Phase 2: Release Gate Definition

- [ ] T005 [DOC] Define typecheck gate command  
  Source: FR-RR-04 · Input: repository scripts · Output: gate includes `pnpm typecheck` · Verify: docs contain command

- [ ] T006 [DOC] Define targeted model/runtime test gate  
  Source: FR-RR-04 · Input: changed test paths · Output: gate includes targeted tests · Verify: docs contain command

- [ ] T007 [DOC] Define stream-handler compatibility gate  
  Source: FR-RR-04 · Input: fallback parser suite · Output: gate includes stream-handler test · Verify: docs contain command

- [ ] T008 [DOC] Define final file-analysis smoke gate  
  Source: FR-RR-05 · Input: runtime file prompt · Output: smoke checklist step · Verify: docs contain exact prompt

## Phase 3: Safety Checklist

- [ ] T009 [DOC] Add credential non-commit warning  
  Source: FR-RR-07 · Input: local settings/env paths · Output: warning text · Verify: docs mention credentials must not enter git

- [ ] T010 [DOC] Add tag naming convention without executing tag  
  Source: FR-RR-08 · Input: feature id/name · Output: tag checklist item · Verify: docs require explicit approval

- [ ] T011 [DOC] Add known limitations section template  
  Source: FR-RR-10 · Input: current release gaps · Output: limitations section · Verify: docs contain section

- [ ] T012 [DOC] Add release decision checklist  
  Source: FR-RR-04, FR-RR-08 · Input: gates + tag rule · Output: pass/fail checklist · Verify: docs contain all gates

## Phase 4: Verification Execution

- [ ] T013 [BE] Run typecheck  
  Source: FR-RR-04 · Input: repository · Output: no TS errors · Verify: `pnpm typecheck`

- [ ] T014 [INT] Run stream-handler compatibility suite  
  Source: FR-RR-04 · Input: fallback parser tests · Output: green suite · Verify: `pnpm test -- tests/runtime/stream-handler.test.ts`

- [ ] T015 [INT] Run targeted model/runtime/cli tests  
  Source: FR-RR-04 · Input: release-relevant tests · Output: green suite · Verify: documented targeted command

- [ ] T016 [INT] Run one-shot `hello` smoke  
  Source: FR-RR-03 · Input: `hello` prompt · Output: response then exit · Verify: manual output recorded

- [ ] T017 [INT] Run final file-analysis smoke  
  Source: FR-RR-05 · Input: runtime analysis prompt · Output: Read then final analysis · Verify: manual output recorded

## Phase 5: Closeout

- [ ] T018 [DOC] Create `state.md` and `session.md` after verification  
  Source: FR-RR-09, FR-RR-10 · Input: gate results · Output: closeout docs · Verify: files exist
