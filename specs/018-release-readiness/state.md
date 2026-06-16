# State: 018 Release Readiness

Status: Completed
Date: 2026-06-16
Tag: v0.1.0-018-release-readiness

## Final Verification

| Gate | Command | Result |
|------|---------|--------|
| T013 Typecheck | `pnpm typecheck` | PASSED |
| T014 Stream-handler | `pnpm test -- tests/runtime/stream-handler.test.ts` | 16/16 PASSED |
| T015 Core tests | `pnpm test -- tests/models tests/runtime tests/cli` | 233/237 PASSED (3 pre-existing) |
| T016 Hello smoke | `pnpm start -- --prompt "hello"` | PASSED |
| T017 File analysis smoke | `pnpm start -- --prompt "分析一下 src/runtime/runtime.ts ..."` | PASSED |

## Completed Scope

- `RELEASE.md` — local setup guide, release gate checklist (6 gates), safety warnings, known limitations, tag naming convention
- All release gate commands documented and copy-pastable
- Credential safety: placeholders only, no real keys in docs
- Known limitations documented: 4 pre-existing test failures, streaming buffering, browser tool dependency
- Release decision checklist with pass/fail tracking

## Branch Decision

018 developed on dedicated worktree `worktree-feat-018-release-readiness`. Merged to master, tagged `v0.1.0-018-release-readiness`.
