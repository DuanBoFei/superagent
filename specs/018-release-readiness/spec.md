# Feature Specification: Release Readiness

**Feature Branch**: `018-release-readiness`  
**Created**: 2026-06-16  
**Status**: Draft  
**Input**: Prepare the project for a local MVP release with reproducible install, test, smoke, and closeout steps.

## User Scenarios & Testing

### User Story 1 - New maintainer can run the local CLI (Priority: P0)

As a maintainer, I can follow documented steps to install dependencies, configure a DeepSeek API key locally, and run SuperAgent in one-shot mode.

**Why this priority**: A release is not usable if setup lives only in conversation history.

**Independent Test**: Follow the documented local setup path on a clean checkout and run one-shot `hello`.

**Acceptance Scenarios**:

1. **Given** a fresh checkout, **When** I follow install docs, **Then** dependencies install with the documented package manager.
2. **Given** no API key is configured, **When** I read setup docs, **Then** I can create a local settings file using placeholders, not real secrets.
3. **Given** setup is complete, **When** I run one-shot mode, **Then** SuperAgent prints model output and exits.

---

### User Story 2 - Release gate is repeatable (Priority: P0)

As a maintainer, I can run a documented release gate that proves type safety, core tests, and end-to-end smoke pass before tagging.

**Why this priority**: Manual release decisions need a consistent verification checklist.

**Independent Test**: Run every documented release gate command and record results.

**Acceptance Scenarios**:

1. **Given** source changes are complete, **When** I run typecheck, **Then** it passes.
2. **Given** changed model/runtime behavior, **When** I run targeted tests, **Then** they pass.
3. **Given** a local API key, **When** I run the final one-shot file-analysis smoke, **Then** the tool reads the file and prints final analysis.

---

### User Story 3 - Release artifacts are explicit and safe (Priority: P1)

As a maintainer, I can see what to tag, what not to commit, and which specs/session notes capture release state.

**Why this priority**: Release metadata affects git history and future feature planning.

**Independent Test**: Review release checklist and ensure it names tag format, forbidden secrets, and closeout files.

**Acceptance Scenarios**:

1. **Given** release is ready, **When** I read the checklist, **Then** it shows the tag naming convention but requires explicit confirmation before tagging.
2. **Given** local config exists, **When** release docs are reviewed, **Then** they warn not to commit credentials.
3. **Given** release verification finishes, **When** closeout is done, **Then** `state.md` and `session.md` record final results.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-RR-01 | SuperAgent MUST have documented local install steps for maintainers. |
| FR-RR-02 | SuperAgent MUST have documented local API key configuration with placeholders only. |
| FR-RR-03 | SuperAgent MUST have documented one-shot startup and smoke commands. |
| FR-RR-04 | Release readiness MUST define a repeatable typecheck/test gate. |
| FR-RR-05 | Release readiness MUST include the final file-analysis smoke scenario. |
| FR-RR-06 | Release readiness MUST include Playwright/browser setup notes if browser tool remains in the release. |
| FR-RR-07 | Release readiness MUST warn against committing `.env`, settings files, or credentials. |
| FR-RR-08 | Release readiness MUST document tag naming without creating tags automatically. |
| FR-RR-09 | Release readiness MUST produce final `state.md` and `session.md` closeout notes when completed. |
| FR-RR-10 | Release readiness MUST list remaining known limitations after verification. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-RR-01 | Release docs must be concise enough to follow during a release. |
| NFR-RR-02 | Release commands must be copy-pastable and use placeholders for secrets. |
| NFR-RR-03 | Release gate must avoid destructive git operations. |
| NFR-RR-04 | Closeout notes must be append-only/frozen once the feature is complete. |

## Key Entities

| Entity | Description |
|--------|-------------|
| ReleaseGate | Ordered command/checklist set that must pass before release. |
| LocalSetupGuide | Steps for dependencies, config, and local run. |
| SmokeScenario | Manual end-to-end behavior proof. |
| CloseoutNotes | Final `state.md` and `session.md` release-readiness records. |

## Success Criteria

- Maintainer can run one-shot local smoke from documented steps.
- Release gate commands are documented and pass when executed.
- Final file-analysis smoke reads `src/runtime/runtime.ts` and prints analysis.
- No real API keys or local credentials are written into tracked docs.
