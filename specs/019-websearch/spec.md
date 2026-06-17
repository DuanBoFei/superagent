# Feature Specification: WebSearch Tool - Built-in Search Provider

**Feature Branch**: `019-websearch`  
**Created**: 2026-06-16  
**Status**: Draft  
**Input**: The WebSearch tool skeleton exists (`src/tools/web-search.ts`) with a pluggable API-key-based backend, but the default endpoint is a placeholder (`api.search.local`). The tool is non-functional out of the box. Wire in a built-in, zero-config search provider so the tool works immediately after `pnpm install`.

## User Scenarios & Testing

### User Story 1 - Agent searches the web without configuration (Priority: P0)

As a developer using SuperAgent, when the Agent needs up-to-date information (API docs, error messages, library versions), it can use the WebSearch tool and get real search results without me configuring any API key or search backend.

**Why this priority**: A search tool that requires manual API key setup is effectively not a feature — users won't configure it. Zero-config is the difference between "exists in code" and "exists in practice."

**Independent Test**: Run SuperAgent, ask it to search for something, verify it returns real results from the web.

**Acceptance Scenarios**:

1. **Given** no `SUPERAGENT_WEBSEARCH_API_KEY` is set, **When** Agent calls WebSearch, **Then** it returns real search results using the built-in provider.
2. **Given** the built-in search provider is unreachable, **When** Agent calls WebSearch, **Then** it returns "Search unavailable" gracefully without crashing.
3. **Given** `SUPERAGENT_WEBSEARCH_API_KEY` is set, **When** Agent calls WebSearch, **Then** it uses the user-configured endpoint instead of the built-in provider.

---

### User Story 2 - Search results are safe and bounded (Priority: P1)

As a developer, I want search results to be capped in size and scrubbed of obviously malicious URLs, so the Agent doesn't consume excessive context or follow phishing links.

**Why this priority**: Unbounded results could bloat context windows; unsafe URLs are a trust issue.

**Independent Test**: Search for a common term like "TypeScript" and verify results are capped at a reasonable size.

**Acceptance Scenarios**:

1. **Given** a search returns many results, **When** results exceed 50KB, **Then** output is truncated with a note.
2. **Given** search results are empty or the provider fails, **When** Agent calls WebSearch, **Then** it returns "Search temporarily unavailable" without leaking internal errors.

---

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-WS-01 | WebSearch tool SHALL use a built-in, zero-config search provider when no `SUPERAGENT_WEBSEARCH_API_KEY` is configured. |
| FR-WS-02 | The built-in provider SHALL return real search results (title, URL, snippet) from a public search service. |
| FR-WS-03 | When `SUPERAGENT_WEBSEARCH_API_KEY` is set, the tool SHALL use the configured endpoint, preserving existing behavior. |
| FR-WS-04 | Search results SHALL be truncated when output exceeds 50KB, with a visible truncation note. |
| FR-WS-05 | The tool SHALL apply a 30-second timeout to search requests. |
| FR-WS-06 | On any failure (timeout, network error, HTTP error), the tool SHALL return "Search unavailable" without throwing. |
| FR-WS-07 | The tool SHALL remain concurrency-safe (read-only, no side effects). |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-WS-01 | Built-in search SHALL NOT require any API key or authentication. |
| NFR-WS-02 | The tool SHALL NOT introduce new npm dependencies (use only Node.js built-in `fetch`/`https`). |
| NFR-WS-03 | All existing WebSearch tests SHALL continue to pass. |

### Key Entities

- **SearchResult**: `{ title: string, url: string, snippet: string }` — a single search hit.
- **ToolResult**: `{ output: string, error?: string, metadata?: { results: SearchResult[], note?: string } }` — the tool's return value.

### Edge Cases

- Query is empty or whitespace-only → validation error
- Built-in provider DNS resolution fails → "Search unavailable" with note
- Built-in provider returns HTTP 429 → "Search unavailable" (rate limited)
- Built-in provider returns malformed HTML → graceful empty results
- Results exceed 50KB → truncate with `[...truncated N results]` note
- User has configured custom API → skip built-in provider, use configured endpoint
