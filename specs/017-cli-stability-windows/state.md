# State: 017 CLI Stability on Windows

Status: Completed
Date: 2026-06-16
Tag: v0.1.0-017-cli-stability-windows

## Final Verification

- `pnpm typecheck` — passed
- `pnpm test -- tests/cli` — 9 files, 79 tests pass
- Full suite (`pnpm test`) — 694 passed (4 pre-existing failures unrelated to 017)
- One-shot smoke (`npx tsx src/index.ts --prompt "hello"`) — PASSED
- Interactive REPL smoke (VS Code terminal + PowerShell) — PASSED, no flicker, prompt recovers cleanly

## Completed Scope

- `parseCliMode()` — pure function extracting CLI arg parsing from `src/index.ts` for testability
- `detectTerminalProfile()` — auto-detect Windows terminal type (PowerShell / VS Code / default)
- `createSafeWriter()` — line-safe stdout wrapper with `\r\x1b[K` line-clearing on Windows
- `runOneShot()` — extracted one-shot execution as testable function with fake runtime injection
- Terminal profile gating: Windows-safe path behind profile detection, non-Windows uses default passthrough
- No runtime/model logic changes — only CLI entry/input/render layer modified

## Branch Decision

017 developed on dedicated worktree `worktree-feat-017-cli-stability-windows`. Merged to master, tagged `v0.1.0-017-cli-stability-windows`.
