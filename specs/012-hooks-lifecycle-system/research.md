# Research: Hooks Lifecycle System

## Decision 1: Support local command hooks only in v1.1

**Decision:** Implement local command hooks as the only hook execution type for v1.1.

**Rationale:** Command hooks preserve the project's local-first principle, avoid adding outbound network/auth surfaces, and match the immediate need for project automation such as policy checks, formatters, and audit scripts.

**Alternatives considered:**
- HTTP hooks: rejected for v1.1 because they introduce network calls, credentials, and data egress concerns.
- Prompt/LLM evaluator hooks: rejected because they require model routing, cost tracking, and prompt-injection safeguards beyond this feature.
- Agent hooks: rejected because they depend on future sub-agent/multi-agent architecture.

---

## Decision 2: Use structured JSON over stdin/stdout

**Decision:** Hook commands receive one JSON event payload on stdin and may return a JSON result on stdout.

**Rationale:** JSON is easy for shell, Node, Python, and Go hook scripts to consume. Stdin avoids shell-escaping issues for large or sensitive payloads and keeps args stable.

**Alternatives considered:**
- Environment variables only: rejected because payloads can exceed safe env size and are harder to structure.
- CLI flags: rejected because escaping nested tool input/output is brittle.
- Temporary files: rejected for v1.1 because it creates cleanup and permission concerns.

---

## Decision 3: Blocking is limited to pre-action hooks

**Decision:** Only `UserPromptSubmit` and `PreToolUse` hooks can block continuation. `SessionStart`, `PostToolUse`, `PostToolUseFailure`, `PreCompact`, and `Stop` are observe-only.

**Rationale:** Pre-action hooks are the only points where blocking is predictable and safe: before a model request or before a tool side effect. Post hooks should not rewrite completed results because that would hide actual runtime behavior from the model and user.

**Alternatives considered:**
- Let all hooks block: rejected because Stop/Post hooks could make shutdown or result handling unreliable.
- Let hooks mutate messages/tool results: rejected because it introduces hidden behavior and complicates debugging.

---

## Decision 4: Run multiple hooks in configured order

**Decision:** Hooks for the same lifecycle event run sequentially in configuration order. The first blocking result stops the remaining hooks for that event.

**Rationale:** Ordered execution is predictable, debuggable, and avoids race conditions between policy hooks. Blocking short-circuiting prevents later hooks from seeing an action already rejected by an earlier hook.

**Alternatives considered:**
- Parallel hooks: rejected for v1.1 because hook order and shared side effects would be ambiguous.
- Priority numbers: rejected because config order is simpler and adequate.

---

## Decision 5: Hook failures are isolated and observable

**Decision:** Non-zero exit, timeout, invalid JSON, and command-not-found are normalized into safe hook failures and emitted to observability. Observe-only hook failures never crash the session.

**Rationale:** Hooks are extension points and should not make the core coding loop brittle. Users still need enough diagnostics to fix broken hook scripts.

**Alternatives considered:**
- Fail the whole session on any hook error: rejected because optional automation would reduce reliability.
- Silently ignore hook errors: rejected because users need diagnosable configuration feedback.

---

## Decision 6: Redact before terminal/log/verbose output

**Decision:** Hook payload summaries, stdout/stderr summaries, observability events, and verbose output pass through central secret redaction before display or persistence.

**Rationale:** Hooks can see tool inputs, prompts, env values, and command output. The project constitution requires API keys and secret-like values never appear in logs or terminal output.

**Alternatives considered:**
- Trust hook authors not to print secrets: rejected because hook failures commonly dump env or debug output.
- Redact only logs: rejected because terminal and verbose output are also user-visible persistence surfaces.
