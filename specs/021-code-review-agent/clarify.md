# Clarify: Code Review Agent

## Decisions

| Question | Decision | Why |
|----------|----------|-----|
| Is review write-capable? | No. Review is read-only and cannot run Bash/Edit/Write. | Maintains independent reviewer role and avoids review causing side effects. |
| Should failed tests block approval? | Yes by default. | Reporting success with failed tests directly hurts trust. |
| Does review see full implementation transcript? | No by default. | Reviewer should not inherit implementer's rationalizations. |
| Is this only for multi-agent mode? | No. Review is independently callable and can plug into 020. | Allows separate testing and reuse. |
| What happens on malformed review output? | Mark as inconclusive/blocking. | Avoid false approval. |

## Open Questions That Would Cause Rework

1. **Diff source**: Should Review compute git diff itself or receive diff from runtime?
   - Proposed default: receive diff/test bundle from runtime; later add git diff collector.
2. **Severity taxonomy**: How many severity levels are needed?
   - Proposed default: `blocking | warning | info`.
3. **Auto-fix loop**: Should blocking findings trigger Implement again?
   - Proposed default: no for 021; 020 can report defects. Auto-fix loop later.
4. **Review timing**: Run after every write or only at task end?
   - Proposed default: task end only.
5. **Line number precision**: Require exact changed line references?
   - Proposed default: best effort; file path required when known.

## Assumptions

- Runtime/tool events can provide changed file list and test command output.
- Existing model provider path can be reused with a review-specific prompt.
- Review result parser can handle both strict JSON and fallback text.

## Deferred

- Automatic patch generation from review findings
- Multiple reviewer agents
- Security-specialized reviewer
- Performance reviewer
- PR-comment formatting for GitHub
