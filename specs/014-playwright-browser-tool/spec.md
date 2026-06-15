# Feature Specification: Playwright Browser Tool

**Feature Branch**: `014-playwright-browser-tool`  
**Created**: 2026-06-14  
**Status**: Draft  
**Input**: v1.1 Playwright browser tool for SuperAgent, based on PRD v1.1 plan and research decisions after completing MVP features 001-010 and planning 011-013.

## User Scenarios & Testing

### User Story 1 - Inspect browser pages from the CLI (Priority: P1)

As a developer using SuperAgent, I can ask the Agent to open a web page, inspect the visible browser state, and summarize what it sees without leaving the terminal.

**Why this priority**: Browser inspection is the smallest useful browser capability and establishes page lifecycle, navigation, screenshot, and safe result handling.

**Independent Test**: A fake Playwright adapter opens a local test page, returns title/url/text/screenshot metadata, and the Agent receives a normalized browser result.

**Acceptance Scenarios**:

1. **Given** browser tool support is enabled, **When** an approved browser navigation request opens a reachable page, **Then** SuperAgent returns the current URL, title, visible text summary, and screenshot artifact metadata.
2. **Given** a page fails to load before timeout, **When** navigation is attempted, **Then** SuperAgent returns a safe timeout/navigation error and the Agent session continues.

---

### User Story 2 - Interact with web UI safely (Priority: P2)

As a developer debugging or validating web behavior, I can ask the Agent to click, type, select, and wait for visible UI states while existing permission boundaries still apply.

**Why this priority**: Interactions make the browser useful for functional checks but introduce higher security and privacy risk.

**Independent Test**: A fake browser page receives click/type actions only after permission approval; denied actions do not reach the browser adapter.

**Acceptance Scenarios**:

1. **Given** a browser page with a form, **When** an approved sequence types test input and clicks submit, **Then** SuperAgent returns the resulting page state and action trace.
2. **Given** a browser action is denied by permission policy, **When** the Agent requests that action, **Then** no Playwright action is executed and the denial result matches built-in tool behavior.

---

### User Story 3 - Keep browser failures isolated and observable (Priority: P3)

As a maintainer, I can diagnose browser automation failures through logs and summaries without exposing secrets or crashing the Agent session.

**Why this priority**: Browser sessions have many external failure modes; safe isolation is required before real projects can rely on the feature.

**Independent Test**: Browser launch failure, action failure, timeout, oversized page output, and secret-like text are normalized and logged with redaction.

**Acceptance Scenarios**:

1. **Given** Playwright or browser binaries are unavailable, **When** a browser tool call is requested, **Then** SuperAgent returns a safe setup error and non-browser tools remain usable.
2. **Given** a page contains secret-like text, **When** visible content, screenshots, or logs are summarized, **Then** secret-like values are redacted from terminal output, verbose output, and observability events.

---

### Edge Cases

- Browser support disabled in config: browser tools are not registered or routed.
- Playwright package present but browser executable missing: return safe setup error with remediation guidance.
- Navigation redirects to a different URL: return final URL and preserve action trace.
- Page load hangs or action waits forever: enforce configured timeout and close/cleanup the browser context.
- Page output is very large: truncate visible text and DOM-derived summaries before injecting into context.
- Screenshot artifact cannot be written: return text state and safe artifact error without failing the whole session.
- Network access is unavailable or blocked: return safe navigation error and continue the session.
- Browser action targets a missing selector/role/text: return action failure with safe locator summary.
- Secret-like values in typed input, page text, URLs, headers, cookies, screenshots metadata, logs, and verbose output are redacted.
- Browser tool is used together with Docker sandbox mode: sandbox integration is optional and must not be required for browser tool availability.

## Clarifications

### Session 2026-06-14

- Q: Is full desktop Computer Use in scope for this feature? → A: No. v1.1 supports Playwright-controlled browser automation only; OS desktop control, arbitrary app control, and screenshot-based Computer Use are deferred.
- Q: Should Docker sandbox be required for browser automation? → A: No. Browser automation must work through a local Playwright adapter by default, with Docker sandbox integration treated as optional future hardening.
- Q: Should browser actions bypass existing permissions because they run in a browser context? → A: No. Browser tool calls use the existing permission pipeline; navigation and interaction actions can require ask/deny according to tool and input policy.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-BRW-01 | SuperAgent MUST support a `browser` configuration section with enablement, headless mode, default timeout, artifact directory, viewport, and optional network policy fields. |
| FR-BRW-02 | SuperAgent MUST keep browser tools disabled by default unless explicitly enabled. |
| FR-BRW-03 | SuperAgent MUST expose browser actions as Agent-callable tools or one browser tool action schema without colliding with built-in or MCP tool names. |
| FR-BRW-04 | SuperAgent MUST route every browser tool call through the existing permission policy before invoking Playwright. |
| FR-BRW-05 | SuperAgent MUST support opening/navigating to a URL and returning normalized page state including final URL, title, visible text summary, and screenshot artifact metadata when captured. |
| FR-BRW-06 | SuperAgent MUST support safe browser interactions for click, type, select, wait, screenshot, and close actions. |
| FR-BRW-07 | SuperAgent MUST maintain per-session browser lifecycle state so repeated actions can operate on the same browser context until closed or session end. |
| FR-BRW-08 | SuperAgent MUST enforce per-action and per-navigation timeouts and return `timedOut: true` when exceeded. |
| FR-BRW-09 | SuperAgent MUST normalize browser results into a stable result shape containing success, page state, artifacts, action trace, durationMs, timedOut, and safeError fields. |
| FR-BRW-10 | SuperAgent MUST isolate browser launch, navigation, action, artifact, and cleanup failures so they do not terminate the Agent session. |
| FR-BRW-11 | SuperAgent MUST redact secret-like values from browser inputs, page summaries, URLs where applicable, artifact metadata, logs, verbose output, and observability events. |
| FR-BRW-12 | SuperAgent MUST truncate oversized visible text, DOM-derived summaries, action traces, and error output before injecting them into model context. |
| FR-BRW-13 | SuperAgent MUST emit observability events for browser start, browser action, browser end, and browser failure. |
| FR-BRW-14 | SuperAgent MUST keep non-browser built-in tools usable when Playwright setup or browser execution fails. |
| FR-BRW-15 | SuperAgent MUST close browser contexts on session stop and after explicit close actions. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-BRW-01 | Browser setup failure must be reported in under 2 seconds after detection. |
| NFR-BRW-02 | Default browser action timeout must be finite and configurable. |
| NFR-BRW-03 | Browser result summaries injected into model context must be bounded to avoid large page output exhausting context. |
| NFR-BRW-04 | Browser artifacts must be stored locally only and never uploaded to third-party services by this feature. |
| NFR-BRW-05 | Secret redaction coverage for browser logs and summaries must match the existing observability redaction standard. |

## Key Entities

| Entity | Description |
|--------|-------------|
| BrowserConfig | User/project settings controlling browser enablement, headless mode, timeout, viewport, artifacts, and network policy. |
| BrowserSession | Runtime state for a launched browser/context/page within a SuperAgent session. |
| BrowserAction | One requested browser operation after permission approval. |
| BrowserResult | Normalized result returned to the Agent after a browser action or setup failure. |
| BrowserArtifact | Local artifact metadata such as screenshot path, mime type, size, and redacted label. |
| BrowserAvailability | Safe readiness result for Playwright package and browser executable availability. |

## Success Criteria

| ID | Criterion |
|----|-----------|
| SC-BRW-01 | A developer can enable browser support and inspect a local test page from the CLI without leaving the session. |
| SC-BRW-02 | Denied browser tool calls do not invoke the Playwright adapter. |
| SC-BRW-03 | Browser setup/navigation/action failures return safe results and the Agent session continues. |
| SC-BRW-04 | Secret-like page content and typed input are redacted from logs, verbose output, and result summaries. |
| SC-BRW-05 | Browser lifecycle events appear in structured observability output with safe fields only. |

## Out of Scope

- Full desktop Computer Use or arbitrary OS application control.
- Cloud browser execution services.
- Browser-use hosted MCP integration as part of this feature.
- CAPTCHA solving, login automation for real user accounts, payment flows, or bypassing website access controls.
- Visual reasoning model integration beyond returning screenshots/artifact metadata to the existing Agent context.
- Plugin marketplace or browser extension distribution.
