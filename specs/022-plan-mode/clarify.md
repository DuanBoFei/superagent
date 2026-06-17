# Clarify: Plan Mode

## Decisions

| Question | Decision | Why |
|----------|----------|-----|
| Manual or automatic? | Both. `/plan` manually triggers; complex/risky tasks auto-trigger. | User requested both paths. |
| Does plan mode allow writes before approval? | No. Writes are denied/deferred until approval. | Prevents silent broad changes. |
| Is plan mode required for every task? | No. Simple tasks continue directly. | Avoid slowing common use. |
| Should plan mode integrate with multi-agent? | Yes. Approved plans become Implement context in 020. | Aligns orchestration and planning. |
| Should malformed plans execute? | No. They can be displayed, but not auto-approved. | Avoid executing vague plans. |

## Open Questions That Would Cause Rework

1. **Approval UI source**: Reuse existing permission prompt or add a dedicated plan approval UI?
   - Proposed default: reuse CLI prompt primitives but create plan-specific approval type.
2. **Plan schema strictness**: Require strict JSON or allow markdown plans?
   - Proposed default: internal `ExecutionPlan` object; markdown rendering allowed.
3. **Auto-trigger heuristics**: What exact thresholds?
   - Proposed default: explicit broad keywords, expected 3+ files, dangerous tools, or model attempts 3+ file edits.
4. **Post-approval edits**: Can execution deviate from approved plan?
   - Proposed default: yes for minor discoveries, but emit deviation note and re-plan if scope expands.
5. **Persistence**: How to resume pending approvals?
   - Proposed default: save pending plan summary and approval state in session metadata/events.

## Assumptions

- Runtime can inspect user prompt before model call.
- Pre-tool hooks/permission system can block writes if plan approval is missing.
- CLI has enough prompt primitives to ask approve/reject.

## Deferred

- Visual side-by-side plan approval UI
- Multi-plan alternatives
- Cost estimation in plan
- Automatic task DAG generation
- Plan execution progress bar beyond existing todo/status rendering
