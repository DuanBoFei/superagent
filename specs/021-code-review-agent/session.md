# 021 Code Review Agent · Session Handoff

## Summary

Feature 021 is complete as a narrow, deterministic Code Review Agent layer. It provides typed review evidence, prompt construction, output parsing, an injectable review runner, and a 020 Review phase adapter without giving Review write capabilities.

The `specs/021-code-review-agent/` directory stays frozen and must not be deleted; future requirement changes should start a new numbered feature.

## Changed Areas

- `src/review/`: review contracts, input builder, prompt builder, parser, runner, public exports, and 020 adapter.
- `src/observability/`: review start/end event contracts.
- `src/cli/`: review findings table helper.
- `tests/review/`, `tests/agents/`, `tests/cli/`, `tests/observability/`: focused contract, parser, runner, adapter, rendering, and event coverage.

## Notes

- Review input excludes full implementer transcript by default.
- Empty or malformed reviewer output is converted into a blocking result rather than approval.
- Failed test evidence is represented in prompts and covered by a blocking-review test.
- The 020 adapter maps 021 review severities/categories into existing multi-agent defect shape instead of replacing 020 contracts.
- The review runner is provider-agnostic through an injectable requester boundary.

## Verification

- `pnpm test -- tests/review tests/agents/review-adapter.test.ts tests/cli/review-findings.test.ts tests/observability/review-events.test.ts`
- `pnpm typecheck`
