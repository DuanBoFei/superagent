# Feature 017 · CLI Stability on Windows — Session Notes

## Status: Complete — 20/20 tasks done, merged to master

## Changes Made

| Phase | Task | File | Change |
|-------|------|------|--------|
| 1 | T001-T002 | `tests/cli/args.test.ts` | 7 tests for `parseCliMode` — `--prompt`, empty prompt, interactive |
| 1 | T003 | `src/cli/args.ts` | `parseCliMode()` — pure function extracting CLI mode parsing from index.ts |
| 1 | T004 | `src/index.ts` | Wire `parseCliMode` into `main()` |
| 2 | T005-T007 | `tests/cli/terminal-profile.test.ts` | 8 tests for terminal detection (PowerShell, VS Code, non-Windows) |
| 2 | T008 | `src/cli/terminal-profile.ts` | `detectTerminalProfile()` — detects Windows terminal type |
| 3 | T009-T013 | `tests/cli/safe-writer.test.ts` | 8 tests for line-safe output writing |
| 3 | T010-T012 | `src/cli/safe-writer.ts` | `createSafeWriter()` — Windows-safe stdout wrapper |
| 3 | T010 | `src/cli/repl.ts` | Accept `TerminalProfile` param, use safe writer |
| 3 | T010 | `src/index.ts` | Pass detected profile to `startRepl` |
| 4 | T014-T016 | `tests/cli/one-shot.test.ts` | 5 tests for one-shot execution |
| 4 | T014 | `src/cli/one-shot.ts` | `runOneShot()` — extracted one-shot execution function |
| 4 | T014 | `src/index.ts` | Use `runOneShot` for one-shot path |

## Test Results

```
tests/cli/                9 files   79 tests   all pass
```

## Windows Manual Smoke Checklist

Run these steps on a Windows 11 machine:

### One-shot Mode
- [x] T018: Run `npx tsx src/index.ts --prompt "hello"` 
  - Expected: Prints `SuperAgent · <model>`, prints response text, exits cleanly
  - Actual: PASSED — printed header, model responded with full text, exited 0

- [x] T018: Run `npx tsx src/index.ts --prompt "   "` (whitespace-only prompt)
  - Expected: Prints `Fatal: --prompt requires a message`, exits with code 1
  - Actual: PASSED — correct error message, exit code 1

### Interactive REPL
- [x] T019: Type `hello` in VS Code integrated terminal
  - Expected: Input accepted without flicker, response streams, prompt returns
  - Actual: PASSED — no flicker, prompt recovers cleanly after response

- [x] T020: Type `hello` in PowerShell
  - Expected: Input accepted without flicker, response streams, prompt returns
  - Actual: PASSED — no flicker, prompt recovers cleanly after response

### Interactive Commands
- [x] Type `/help` — shows help text
- [x] Type `/exit` — exits cleanly
- [x] Type `/model` — shows current model

## Closeout

- **Branch**: `worktree-feat-017-cli-stability-windows`
- **Merged to**: `master`
- **Tag**: `v0.1.0-017-cli-stability-windows`
- **Final stats**: 20/20 tasks complete · 4 new source files · 4 new test files · 79 CLI tests pass
- **Full suite**: 694 tests pass (4 pre-existing failures unrelated to this feature)
