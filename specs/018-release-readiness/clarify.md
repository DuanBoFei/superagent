# Clarify: Release Readiness

**Feature**: `018-release-readiness`  
**Created**: 2026-06-16  
**Status**: Draft

## Technical Clarifications

| ID | Question | Why it matters | Decision / Default |
|----|----------|----------------|--------------------|
| Q-018-01 | What release scope is this feature preparing? | Release checklist depends on included capabilities. | Prepare MVP local CLI release after real tool calling, fallback, and Windows CLI stability are verified. |
| Q-018-02 | Is this a code feature or closeout feature? | Release readiness should not add new product behavior. | This feature is documentation, smoke scripts/checklists, packaging validation, and final verification only. |
| Q-018-03 | Which install path must be documented? | Users need reproducible setup. | Document local `pnpm install`, config file setup, Playwright/browser install if needed, and one-shot smoke. |
| Q-018-04 | Should API key instructions include real examples? | Secrets must not leak into docs. | Use placeholder values only and explicitly warn not to commit credentials. |
| Q-018-05 | What tests gate release readiness? | A release without a gate can regress core flows. | Typecheck, targeted model/runtime tests, stream-handler fallback suite, one-shot smoke, and selected full test run. |
| Q-018-06 | Should release create a tag automatically? | Tagging is shared git state and should be explicit. | Document tag command/checklist; do not tag without user confirmation. |
| Q-018-07 | What is the final smoke scenario? | MVP must prove end-to-end usefulness. | One-shot prompt asks to analyze `src/runtime/runtime.ts` and must read file then produce final analysis. |
| Q-018-08 | Where should closeout notes live? | Specs are frozen and must preserve feature state. | Use `specs/018-release-readiness/state.md` and `session.md` at completion. |

## Scope Boundaries

- In scope: install/run docs, smoke checklist, release gate commands, packaging validation, closeout notes.
- Out of scope: implementing real tool calling, fallback, or CLI stability fixes themselves.
- Out of scope: publishing to npm or pushing tags without explicit user approval.
- Out of scope: adding new product capabilities.

## Rework Risks If Not Clarified

1. Mixing release readiness with feature implementation could hide unfinished work.
2. Writing real API keys into docs would create a security incident.
3. Tagging automatically could publish an unapproved release marker.
4. Missing smoke docs would make future regressions hard to reproduce.
