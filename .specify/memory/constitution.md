# SuperAgent · Constitution

## Core Principles

- Model freedom: no vendor lock-in. Default to DeepSeek V4 Pro, fallback to V4 Flash.
- MIT open source. All code must be cleanly licensable with no proprietary dependencies.
- CLI-first: terminal is the primary interface. No IDE plugin, no web dashboard in MVP.
- Local-first: code and data stay on the user's machine. No cloud upload without explicit opt-in.

## Security

- API keys must never appear in logs, git history, or terminal output.
- Dangerous commands (`rm -rf`, `curl | bash`, `sudo`, `git push --force`) are always intercepted.
- deny rules always override auto-approve rules.

## Quality

- Every feature must have a spec (spec.md), plan (plan.md), and task list (tasks.md) before code.
- Tests must pass before marking a task complete.
- TypeScript strict mode. No `any` without justification.

---

### Implementation Discipline (for Superpowers handoff)

- Before executing any tasks.md, ALWAYS read .specify/memory/constitution.md FIRST.
- Always follow TDD: Red (failing test) → Green (minimum code) → Refactor.
- Always update tasks.md checkbox after EACH task completes.
- After each task: commit, then STOP and wait for "next".
- All [FE] tasks: MUST read root DESIGN.md and the matched
  design-reference/stitch-export/<page>/ BEFORE writing any component code.

---

> **Version**: v1.0 | **Last Updated**: 2026-06-12
