# Tasks: CLI Stability on Windows

## Task Summary

20 tasks · 2-5 min each · TDD-first where possible plus manual smoke

## Phase 1: CLI Mode Contracts

- [x] T001 [CLI] Add `tests/cli/args.test.ts` for `--prompt` selecting one-shot mode  
  Source: FR-CW-03, FR-CW-04 · Input: argv with prompt · Output: one-shot mode · Verify: `pnpm test -- tests/cli/args.test.ts`

- [x] T002 [CLI] Add empty `--prompt` error test  
  Source: FR-CW-05 · Input: empty prompt arg · Output: clear error · Verify: same test file

- [x] T003 [CLI] Extract minimal CLI mode parsing from `src/index.ts`  
  Source: FR-CW-03, FR-CW-05 · Input: argv · Output: interactive/one-shot decision · Verify: CLI args tests

- [x] T004 [CLI] Keep one-shot execution path using existing runtime `startTurn`  
  Source: FR-CW-04 · Input: prompt text · Output: turn events then exit · Verify: one-shot test

## Phase 2: Terminal Detection

- [x] T005 [CLI] Add terminal profile tests for Windows PowerShell env  
  Source: FR-CW-02, FR-CW-08 · Input: platform/env fixture · Output: windows-powershell profile · Verify: `pnpm test -- tests/cli/terminal-profile.test.ts`

- [x] T006 [CLI] Add terminal profile tests for Windows VS Code terminal env  
  Source: FR-CW-01, FR-CW-08 · Input: platform/env fixture · Output: windows-vscode profile · Verify: same test file

- [x] T007 [CLI] Add terminal profile test for non-Windows default path  
  Source: FR-CW-08, FR-CW-10 · Input: linux/darwin fixture · Output: default profile · Verify: same test file

- [x] T008 [CLI] Implement `src/cli/terminal-profile.ts` detection helper  
  Source: FR-CW-01, FR-CW-02 · Input: process env/platform · Output: terminal profile · Verify: terminal profile tests

## Phase 3: Input/Render Stabilization

- [x] T009 [CLI] Add input renderer unit test for stable idle state  
  Source: FR-CW-06 · Input: idle render events · Output: no repeated reset state · Verify: targeted CLI test

- [x] T010 [CLI] Isolate interactive REPL startup into a testable function  
  Source: FR-CW-08 · Input: runtime handle + terminal profile · Output: REPL component/path · Verify: CLI tests

- [x] T011 [CLI] Add Windows-safe input/render path behind terminal profile  
  Source: FR-CW-01, FR-CW-02, FR-CW-06 · Input: windows profile · Output: stable input mode · Verify: targeted CLI tests

- [x] T012 [CLI] Preserve default input/render path for non-Windows profile  
  Source: FR-CW-08, FR-CW-10 · Input: default profile · Output: existing mode · Verify: CLI tests

- [x] T013 [CLI] Ensure stream output appends without clearing active input unnecessarily  
  Source: FR-CW-06, FR-CW-07 · Input: stream event during input · Output: stable input state · Verify: targeted CLI test

## Phase 4: One-shot Regression

- [x] T014 [CLI] Add one-shot integration test with fake runtime text response  
  Source: FR-CW-03, FR-CW-04 · Input: `--prompt hello` · Output: text then exit · Verify: `pnpm test -- tests/cli/one-shot.test.ts`

- [x] T015 [CLI] Add one-shot error event output test  
  Source: FR-CW-03 · Input: fake runtime error event · Output: stderr error · Verify: same test file

- [x] T016 [CLI] Verify one-shot still closes observability/session cleanly  
  Source: FR-CW-04 · Input: fake runtime completion · Output: close hook called · Verify: one-shot test

## Phase 5: Manual Smoke & Verification

- [x] T017 [DOC] Add Windows manual smoke checklist to feature session notes  
  Source: FR-CW-09 · Input: Windows terminal steps · Output: repeatable checklist · Verify: file exists

- [x] T018 [INT] Run `pnpm start -- --prompt "hello"` smoke  
  Source: FR-CW-03 · Input: one-shot prompt · Output: response then exit · Verify: manual command output (PASSED)

- [x] T019 [INT] Run interactive Windows VS Code terminal smoke  
  Source: FR-CW-01, FR-CW-06 · Input: type `hello` · Output: accepted input, no flicker · Verify: PASSED

- [x] T020 [INT] Run interactive PowerShell smoke  
  Source: FR-CW-02, FR-CW-06 · Input: type `hello` · Output: accepted input, no flicker · Verify: PASSED
