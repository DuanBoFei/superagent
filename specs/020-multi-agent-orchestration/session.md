# 020 Multi-Agent Orchestration · Session Handoff

## Summary

Feature 020 is complete as a narrow serial orchestration layer. The default runtime path remains single-agent unless routing selects multi-agent mode through `/multi-agent` or complexity heuristics.

This branch is finished and handed off as a PR-ready worktree. The `specs/020-multi-agent-orchestration/` directory stays frozen and must not be deleted; any future requirement changes should start a new numbered feature.

## Changed Areas

- `src/agents/`: role contracts, prompts, router, permissions, orchestrator, and public exports.
- `src/runtime/`: multi-agent routing branch, per-role query-loop execution, phase event type.
- `src/observability/`: `agent:phase` event contract.
- `src/cli/`: one-shot and renderer phase labels.
- `tests/agents/`, `tests/runtime/`, `tests/observability/`, `tests/cli/`: focused coverage for contracts, routing, permissions, orchestration, runtime integration, and phase rendering.

## Notes

- Explore and Review use scheduler-level role permissions to deny mutating tools.
- Implement uses the existing permission checker unchanged.
- Review blocking defects now propagate through runtime as a non-success turn, with `ReviewFinding` handled as an internal review signal instead of an external tool.
- Explore with no findings skips Implement and reports a blocked run instead of making speculative changes.
- Review receives summarized phase context only: Explore findings, changed files, and verification summaries, not unrestricted raw phase transcripts.
- Phase sessions are not persisted separately, preventing internal role runs from polluting resume and persistence tests.
- Closeout verification passed `pnpm typecheck` and full `pnpm test` on 2026-06-17.
