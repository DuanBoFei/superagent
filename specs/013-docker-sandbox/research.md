# Research: Docker Sandbox

## Decision 1: Support local Docker sandbox only

**Decision:** v1.1 implements local Docker container execution and defers cloud sandboxes and OS-native sandboxes.

**Rationale:** Docker is a practical P1 hardening step after MVP local subprocess execution. It preserves local-first behavior, keeps code on the user's machine, and aligns with the research plan: local process in MVP, Docker in P1, cloud sandboxes later.

**Alternatives considered:**
- Cloud sandboxes such as E2B/Daytona: rejected because PRD marks cloud sandbox out of scope and it would upload code to third-party infrastructure.
- macOS Seatbelt/Linux Bubblewrap/Landlock: rejected for v1.1 because platform-specific behavior would increase scope and test matrix.
- Firecracker/gVisor: rejected as too heavy for a local developer CLI MVP.

---

## Decision 2: Sandbox is an execution boundary, not a permission bypass

**Decision:** Existing permission and dangerous-command checks run before sandbox container startup.

**Rationale:** The constitution requires dangerous operations to be intercepted and deny rules to override auto-approve. A container reduces host blast radius but does not make every command safe or desirable.

**Alternatives considered:**
- Auto-approve all sandboxed commands: rejected because destructive commands can still destroy mounted workspace files or exfiltrate data if network is enabled.
- Replace permissions with sandboxing: rejected because sandboxing and permissions solve different safety layers.

---

## Decision 3: Use explicit workspace mount and env allowlist

**Decision:** The current workspace is mounted at a deterministic container path, and host environment variables are not passed unless explicitly allowlisted.

**Rationale:** Deterministic paths make command behavior predictable, while env allowlisting prevents accidental secret injection into containers and logs.

**Alternatives considered:**
- Mount host home directory: rejected because it expands filesystem access too broadly.
- Pass all host environment variables: rejected because shell environments commonly contain secrets.
- Copy workspace instead of mount: rejected for v1.1 because it complicates syncing output files back to the host.

---

## Decision 4: No implicit image pull by default

**Decision:** Image pull behavior is configurable and defaults to no silent pull.

**Rationale:** Pulling images can be slow, network-dependent, and surprising. It may also violate local/offline expectations. Users should opt in or pre-pull images.

**Alternatives considered:**
- Always pull missing images: rejected because it introduces network side effects before a command runs.
- Never support pulling: rejected because explicit pull can be convenient for users who opt in.

---

## Decision 5: Normalize sandbox output to existing Bash result shape

**Decision:** Sandbox execution returns stdout, stderr, exitCode, durationMs, timedOut, and safe error fields compatible with current Bash/tool result semantics.

**Rationale:** The runtime and model should not need a separate mental model for sandboxed vs non-sandboxed command results. Compatibility reduces integration churn.

**Alternatives considered:**
- Create a new Sandbox tool result shape: rejected because it would duplicate Bash handling and increase context complexity.

---

## Decision 6: Emit sandbox observability events

**Decision:** Sandbox start/end/failure events are emitted through the existing observability flow with redacted diagnostic summaries.

**Rationale:** Users need to diagnose Docker setup, timeout, image, and command failures. Observability also verifies sandbox use during tests and audits.

**Alternatives considered:**
- Only return command results: rejected because setup/startup failures need lifecycle diagnostics beyond command stdout/stderr.
