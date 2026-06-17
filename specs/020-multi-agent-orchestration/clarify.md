# Clarify: Multi-Agent Orchestration

## Decisions

| Question | Decision | Why |
|----------|----------|-----|
| Is this a worker pool? | No. First version is serial Explore → Implement → Review. | Worker pools add scheduler, persistence, and permission complexity before success-rate gains are proven. |
| Can multiple agents write concurrently? | No. Only Implement may write, and it uses existing serial write scheduling. | Prevent file conflicts and permission blast-radius expansion. |
| How is multi-agent mode triggered? | Both explicit user trigger and automatic complexity trigger. | Users need control, but complex tasks should benefit automatically. |
| Is Review part of 020 or 021? | 020 provides minimal Review phase; 021 deepens review quality. | Keeps orchestration end-to-end usable while allowing a dedicated review feature. |
| Are sub-agents separate model sessions? | Logically separate role contexts; implementation may reuse provider/runtime primitives. | Role isolation matters more than process isolation for v1. |

## Open Questions That Would Cause Rework

1. **Routing threshold**: What exact heuristic marks a task as complex enough for multi-agent mode?
   - Proposed default: explicit `/multi-agent`, or predicted multi-file edit, or task text asks for refactor/bug fix/feature/test across modules.
2. **Phase output schema strictness**: Should role outputs be model-enforced JSON or best-effort text parsed by runtime?
   - Proposed default: runtime-owned `PhaseResult` assembled from events, with model text stored as summary.
3. **Review defect loop**: Should blocking review defects automatically trigger another Implement pass?
   - Proposed default: not in 020; report defects. Auto-fix loop can be later.
4. **Session persistence shape**: Store full sub-agent transcripts or only phase summaries?
   - Proposed default: store summaries and references to emitted events; avoid transcript bloat.
5. **Tool allowlist source**: Hardcoded role defaults or config-overridable?
   - Proposed default: hardcoded safe defaults in 020; config override later.

## Assumptions

- Existing runtime can run one model loop per phase with modified system guidance.
- Existing permission checker can be wrapped with role-scoped allow/deny logic.
- Existing persistence can store additional metadata without schema-breaking changes via JSON fields or event payloads.
- Existing observability event model can add new multi-agent events.

## Deferred

- Worker pools
- Parallel Explore agents
- DAG task planning
- Cross-worktree implementation agents
- Automatic review-fix-review loops
