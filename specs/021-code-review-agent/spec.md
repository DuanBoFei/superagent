# Feature Specification: Code Review Agent

**Feature Branch**: `021-code-review-agent`  
**Created**: 2026-06-17  
**Status**: Draft  
**Input**: Add an independent review capability that inspects diffs, test output, and task intent to catch defects before SuperAgent reports success. This can run as a standalone command/path and as the Review phase of 020 Multi-Agent Orchestration.

## User Scenarios & Testing

### User Story 1 - Agent reviews its own changes before success (Priority: P0)

As a developer, when SuperAgent modifies files, I want a review pass to inspect the diff and tests before the task is marked complete.

**Why this priority**: The model often misses issues in its own work. A reviewer with constrained context improves first-fix success rate.

**Independent Test**: Feed a synthetic diff with a known defect into the review agent and verify it returns a blocking finding with file/line reference.

**Acceptance Scenarios**:

1. **Given** a diff introduces a failing import or obvious type mismatch, **When** review runs, **Then** it reports a blocking defect.
2. **Given** tests failed, **When** review runs, **Then** it treats the failed tests as blocking unless explicitly unrelated.
3. **Given** no defects are found, **When** review completes, **Then** it returns an approval result with concise rationale.

---

### User Story 2 - Review uses evidence, not broad conversation history (Priority: P0)

As a developer, I want review to be independent enough to catch mistakes, so it should review the diff and evidence rather than inherit the implementer's full reasoning.

**Independent Test**: Verify review input builder includes task intent, changed files, diff excerpt, test output, and excludes full assistant transcript.

**Acceptance Scenarios**:

1. **Given** a previous implementation transcript exists, **When** review input is built, **Then** the full transcript is excluded.
2. **Given** changed files exist, **When** review input is built, **Then** diff summaries and relevant snippets are included.
3. **Given** tool failures occurred, **When** review input is built, **Then** failures are included as review evidence.

---

### User Story 3 - Findings are actionable and structured (Priority: P1)

As a developer, I need review findings to be easy to act on: severity, category, file reference, and suggested fix direction.

**Independent Test**: Parse reviewer output into structured findings and verify invalid output degrades to a safe blocking summary.

**Acceptance Scenarios**:

1. **Given** reviewer returns structured findings, **When** parser runs, **Then** findings contain severity/category/file/description.
2. **Given** reviewer output is malformed, **When** parser runs, **Then** review is marked inconclusive instead of approved.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-CR-01 | The system SHALL provide a Code Review Agent role that reviews task intent, diffs, changed files, test output, and tool failures. |
| FR-CR-02 | Review SHALL NOT have write permissions. |
| FR-CR-03 | Review SHALL output a structured `ReviewResult` with `approved`, `findings`, and `summary`. |
| FR-CR-04 | Findings SHALL include severity, category, description, and optional file reference. |
| FR-CR-05 | Failed tests SHALL produce a blocking finding unless marked unrelated by deterministic input metadata. |
| FR-CR-06 | Malformed reviewer output SHALL NOT be treated as approval. |
| FR-CR-07 | Review input SHALL exclude full implementer transcript by default. |
| FR-CR-08 | Review SHALL integrate with 020 Review phase when multi-agent orchestration is enabled. |
| FR-CR-09 | Review SHALL be callable independently for a prepared diff/test bundle. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-CR-01 | Review should be deterministic enough for snapshot tests of prompt/input builder. |
| NFR-CR-02 | Review must not add new dependencies. |
| NFR-CR-03 | Review must not mutate files or run shell commands. |
| NFR-CR-04 | Review findings should prefer precise file references when available. |

### Key Entities

- **ReviewInput**: task intent, changed files, diff text/summary, test output, tool failures, optional Explore findings.
- **ReviewFinding**: severity, category, fileRef, description, recommendation.
- **ReviewResult**: approved boolean, findings array, summary, rawOutput.
- **ReviewCategory**: correctness, tests, security, permissions, overreach, tool-failure-truthfulness, style.

### Edge Cases

- No diff exists → review can approve no-op only if task was read-only or explicitly no changes required.
- Test command not run → non-blocking warning unless task required verification.
- Tool failure happened before final answer → finding category `tool-failure-truthfulness` if answer claims success.
- File reference line unavailable → finding includes file path only.
- Reviewer returns empty output → inconclusive blocking result.
