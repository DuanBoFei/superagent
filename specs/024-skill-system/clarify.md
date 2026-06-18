# Clarify: Skill System

## Decisions

| Question | Decision | Why |
|----------|----------|-----|
| Are skills hand-written or generated? | Hand-written only in first version. | Avoid unsafe self-modifying behavior and keep MVP bounded. |
| Where are skills loaded from? | Configured local directories, with project-local taking precedence over user-global. | Supports reusable workflows while allowing repo-specific overrides. |
| Does invoking a skill execute code? | No. Invocation injects markdown instructions and arguments as context only. | Tool execution must remain governed by existing permission checks. |
| How strict is skill metadata? | Strict required metadata; invalid skills are skipped with diagnostics. | Prevents ambiguous runtime behavior and makes discovery snapshot-testable. |
| What happens for duplicate names? | Project-local skill wins; duplicate diagnostic is emitted. | Keeps deterministic override behavior without blocking valid skills. |
| Should skills integrate with plan mode? | Yes, via optional `suggestedMode: plan`. | Workflow skills may need plan-before-execute without making all skills planning-only. |
| Should skills integrate with multi-agent roles? | Yes, via optional `allowedRoles`. | 020 can expose only role-compatible skills in role prompts. |

## Open Questions That Would Cause Rework

1. **Manifest format**: Frontmatter in `SKILL.md` or separate `skill.json`?
   - Proposed default: frontmatter in `SKILL.md` for single-file portability.
2. **Argument schema shape**: Simple named string args or full typed schema?
   - Proposed default: simple typed descriptors with required/optional flags, no zod-in-markdown DSL.
3. **Directory precedence**: Should user-global skills be disabled by project config?
   - Proposed default: project config can set explicit skill directories; project-local overrides same-name global skills.
4. **Body size policy**: Skip or truncate oversized skills?
   - Proposed default: skip with diagnostic to avoid silently changing instructions.
5. **Slash command syntax**: `/skill name args` only, or direct `/<skill-name>` aliases?
   - Proposed default: support `/skill <name> ...` first; aliases can be added later.

## Assumptions

- Runtime can inject an additional context block before model execution.
- CLI command parsing already supports slash-command style routing or can add a detector.
- Persistence can store skill invocation events as structured session events.
- Tool permissions are enforced after model tool-call generation, so skill text cannot bypass permissions.

## Deferred

- Automatic skill generation from successful sessions
- Skill marketplace or remote installation
- Skill self-modification or patching
- Skill dependency resolution
- Skill packages containing executable hooks
