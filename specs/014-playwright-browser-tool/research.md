# Research: Playwright Browser Tool

## Decision 1: Scope browser automation to Playwright pages only

**Decision**: v1.1 implements browser automation through Playwright-controlled browser pages and excludes full desktop Computer Use.

**Rationale**: The PRD places Playwright Browser Tool in v1.1 and Computer Use/Desktop Control in P2. Browser automation provides useful web UI validation while avoiding broad OS-level control and screenshot-driven desktop automation risk.

**Alternatives considered**:
- Full Computer Use: deferred because it introduces OS control, broader safety review, and different interaction semantics.
- Browser-use hosted integration: deferred because this feature should provide local-first built-in browser capability rather than depend on a hosted browser service.

## Decision 2: Local Playwright adapter is the default execution boundary

**Decision**: Browser automation runs through a local Playwright adapter by default; Docker sandbox integration is optional and not required for browser availability.

**Rationale**: Feature 013 introduces Docker sandbox as a separate execution boundary. Requiring Docker for browser use would couple two v1.1 features and make browser functionality unavailable on machines where local Playwright would otherwise work.

**Alternatives considered**:
- Require Docker for all browser sessions: safer isolation, but too heavy for default local CLI usage and introduces dependency coupling.
- Cloud browser execution: rejected for v1.1 local-first constraints.

## Decision 3: Permission checks remain authoritative

**Decision**: Browser tool calls use the existing permission pipeline before any navigation, interaction, screenshot, or close action.

**Rationale**: Browser actions can submit forms, navigate to remote systems, expose page content, or enter sensitive text. The existing safety model must remain the single policy authority.

**Alternatives considered**:
- Auto-approve all browser actions once the browser is enabled: rejected because browser interactions can have external side effects.
- Separate browser-only permission system: rejected to avoid inconsistent policy behavior.

## Decision 4: Normalize browser output into bounded page state and local artifacts

**Decision**: Browser results return bounded visible text/page state plus local artifact metadata. Large page text, action traces, and error output are truncated before context injection.

**Rationale**: Browser pages can contain large DOMs and sensitive text. The Agent needs concise observable state, not raw full-page dumps.

**Alternatives considered**:
- Return raw DOM/HTML by default: rejected due to context size and privacy risk.
- Return screenshots only: insufficient for text-first CLI workflows and hard to test deterministically.

## Decision 5: Observability emits lifecycle and action events with redaction

**Decision**: Browser events use structured observability records for start, action, end, and failure with redacted URL/input/page summaries.

**Rationale**: Browser failures are common and must be diagnosable. Redaction must match the observability standard from feature 010.

**Alternatives considered**:
- Only log browser errors: insufficient for action trace diagnosis.
- Log full inputs and page text: rejected due to secret leakage risk.
