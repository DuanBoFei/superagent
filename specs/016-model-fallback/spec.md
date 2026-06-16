# Feature Specification: Model Fallback

**Feature Branch**: `016-model-fallback`  
**Created**: 2026-06-16  
**Status**: Draft  
**Input**: Add deterministic DeepSeek V4 Pro to V4 Flash fallback for transient provider failures without changing runtime semantics.

## User Scenarios & Testing

### User Story 1 - Transient primary failure still completes the turn (Priority: P0)

As a SuperAgent user, when DeepSeek V4 Pro has a transient outage or rate limit, the agent automatically retries or falls back to DeepSeek V4 Flash so my one-shot task can still complete.

**Why this priority**: MVP reliability depends on the model call not being a single point of failure.

**Independent Test**: A fake provider fails the primary request with a 5xx, then succeeds on the fallback request and the runtime yields final text.

**Acceptance Scenarios**:

1. **Given** the primary model returns 5xx, **When** fallback is available, **Then** the same prompt is sent to DeepSeek V4 Flash and the turn continues.
2. **Given** the primary model times out, **When** fallback is available, **Then** no same-model retry blocks the user and fallback starts.
3. **Given** the primary returns 429 with Retry-After, **When** retry budget remains, **Then** one primary retry occurs before fallback.

---

### User Story 2 - Non-retryable errors stay visible (Priority: P0)

As a maintainer, when the model request is invalid, I want the error to fail loudly instead of being hidden by fallback.

**Why this priority**: Real tool calling work must expose schema/request bugs immediately.

**Independent Test**: A fake provider returns 400 for invalid request body and fallback is not called.

**Acceptance Scenarios**:

1. **Given** the provider returns 400, **When** the model layer handles the error, **Then** no fallback request is sent.
2. **Given** the provider returns 401/403, **When** credentials or permissions are wrong, **Then** the user receives a deterministic error.

---

### User Story 3 - Fallback is observable and safe (Priority: P1)

As a maintainer, I can tell when fallback happened without leaking API keys or raw provider secrets.

**Why this priority**: Reliability claims and cost tracking require model attempt visibility.

**Independent Test**: A fallback run emits model attempt/fallback events with redacted error summaries.

**Acceptance Scenarios**:

1. **Given** fallback is triggered, **When** observability events are collected, **Then** events include primary model, fallback model, reason category, and duration.
2. **Given** provider errors include sensitive headers or keys, **When** emitted to logs/events, **Then** secrets are redacted.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-MF-01 | SuperAgent MUST try DeepSeek V4 Pro before fallback for each model request. |
| FR-MF-02 | SuperAgent MUST fallback to DeepSeek V4 Flash on timeout, network error, 429 exhaustion, or 5xx exhaustion. |
| FR-MF-03 | SuperAgent MUST NOT fallback on 400/401/403/404 request or authentication errors. |
| FR-MF-04 | SuperAgent MUST send the same prompt, messages, tools, and tool_choice to fallback, changing only model id. |
| FR-MF-05 | SuperAgent MUST cap model attempts to prevent infinite retry/fallback loops. |
| FR-MF-06 | SuperAgent MUST surface a deterministic error when all model attempts fail. |
| FR-MF-07 | SuperAgent MUST emit observability events for model attempt start/end/fallback. |
| FR-MF-08 | SuperAgent MUST redact secret-like provider error data before logs/events. |
| FR-MF-09 | SuperAgent MUST preserve streaming behavior when fallback succeeds. |
| FR-MF-10 | SuperAgent MUST keep fallback non-sticky across separate model requests in MVP. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-MF-01 | Fallback decision behavior must be deterministic and unit-tested. |
| NFR-MF-02 | Fallback must add no overhead on successful primary calls beyond normal timing instrumentation. |
| NFR-MF-03 | Error summaries must not include API keys, Authorization headers, or raw request bodies. |
| NFR-MF-04 | Existing model/client/runtime tests must continue to pass. |

## Key Entities

| Entity | Description |
|--------|-------------|
| ModelAttempt | One provider request attempt with model id, start time, result, and error category. |
| FallbackPolicy | Decision function that maps provider errors to retry/fallback/fail. |
| FallbackEvent | Observability event describing fallback reason and target model. |
| RedactedProviderError | Safe error summary for user-visible errors and logs. |

## Success Criteria

- A fake primary 5xx results in a successful fallback response from DeepSeek V4 Flash.
- A fake 400 does not call fallback and surfaces the invalid request error.
- `pnpm test -- tests/models tests/runtime/query-loop.test.ts` passes.
- `pnpm typecheck` passes.
