# Feature Specification: Repo Map / Codebase Index

**Feature Branch**: `023-repo-map-codebase-index`  
**Created**: 2026-06-17  
**Status**: Draft  
**Input**: Add a lightweight repository map and codebase index that helps the agent locate relevant files, symbols, and module relationships before editing. First version must be local, deterministic, and dependency-light; it must not implement a cloud vector database or full semantic embedding pipeline.

## User Scenarios & Testing

### User Story 1 - Agent finds relevant code faster (Priority: P0)

As a developer, I want SuperAgent to build a compact repo map so it can answer "where is this implemented?" and choose relevant files without brute-force reading the whole repository.

**Why this priority**: The roadmap goal is improving success rate. Better upfront code discovery reduces missed files and wrong edits.

**Independent Test**: Create a fixture repository with multiple TypeScript modules, build the repo map, query by symbol and path keyword, and verify ranked relevant files are returned.

**Acceptance Scenarios**:

1. **Given** a repository with source files, **When** indexing runs, **Then** the index contains files, exported symbols, imports, and lightweight summaries.
2. **Given** a query for a known function or class, **When** search runs, **Then** the defining file ranks above unrelated files.
3. **Given** a query has no matches, **When** search runs, **Then** a clear empty result is returned without hallucinated paths.

---

### User Story 2 - Repo map is safe and bounded (Priority: P0)

As a developer, I want indexing to avoid secrets, generated files, and huge outputs so context stays useful and private files are not accidentally surfaced.

**Why this priority**: The repo map will be injected into prompts; unsafe or noisy indexing can leak secrets or degrade model quality.

**Independent Test**: Index a fixture with ignored paths, binary files, large files, and `.env`; verify excluded files are not included and diagnostics explain skips.

**Acceptance Scenarios**:

1. **Given** ignored directories like `node_modules`, `.git`, and build output exist, **When** indexing runs, **Then** they are skipped.
2. **Given** likely secret files like `.env` exist, **When** indexing runs, **Then** they are skipped by default.
3. **Given** a file exceeds size limits, **When** indexing runs, **Then** it is skipped with a diagnostic.

---

### User Story 3 - Runtime uses repo map as context (Priority: P1)

As a developer, I want SuperAgent to inject a concise repo map into planning, multi-agent Explore, and normal execution so the model starts with a better project overview.

**Why this priority**: 020 and 022 both need reliable discovery context; 023 should improve them without forcing expensive full scans every turn.

**Independent Test**: Run a fake runtime turn with a built repo map and verify the prompt includes a bounded repo-map context block.

**Acceptance Scenarios**:

1. **Given** a valid repo map exists, **When** runtime builds context, **Then** it includes a compact map within the configured token/character budget.
2. **Given** files changed after indexing, **When** incremental refresh runs, **Then** changed files update without rebuilding unchanged entries.
3. **Given** 020 Explore runs, **When** role context is built, **Then** Explore receives repo map hints before searching files.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-RM-01 | The system SHALL build a local repo map from files under the workspace root. |
| FR-RM-02 | The repo map SHALL include file paths, lightweight file metadata, imports, exports, and top-level symbols where supported. |
| FR-RM-03 | The indexer SHALL skip ignored, binary, oversized, generated, and likely secret files by default. |
| FR-RM-04 | The indexer SHALL emit diagnostics for skipped or failed files without failing the whole index. |
| FR-RM-05 | The system SHALL provide deterministic ranked search over indexed paths, symbols, imports, and summaries. |
| FR-RM-06 | The system SHALL expose a compact repo-map context block for runtime prompt injection. |
| FR-RM-07 | The system SHALL support incremental refresh for changed files. |
| FR-RM-08 | The system SHALL persist index metadata locally when session persistence is available. |
| FR-RM-09 | The repo map SHALL integrate with 020 Explore and 022 Plan Mode as optional context. |
| FR-RM-10 | The first version SHALL NOT require embeddings, a vector database, or network calls. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-RM-01 | No new npm dependencies unless existing TypeScript/Node APIs cannot provide parsing fallback. |
| NFR-RM-02 | Index output must be deterministic and snapshot-testable. |
| NFR-RM-03 | Invalid or unreadable files must not block indexing valid files. |
| NFR-RM-04 | Prompt injection output must be bounded by configurable character limits. |
| NFR-RM-05 | Indexing must avoid reading files excluded by default deny patterns. |

### Key Entities

- **RepoMap**: Root metadata, indexed files, symbol table, import graph, diagnostics, updated timestamp.
- **IndexedFile**: Path, language, size, mtime, imports, exports, symbols, lightweight summary.
- **CodeSymbol**: Name, kind, file path, line number when available.
- **RepoMapQuery**: Query text plus optional filters like language, path prefix, symbol kind.
- **RepoMapResult**: Ranked file/symbol results with match reasons.
- **RepoMapDiagnostic**: Skipped or failed file reason.

### Edge Cases

- Monorepo with many packages → index paths deterministically and enforce file count/size limits.
- Generated files → skip common generated paths and minified bundles.
- Unsupported languages → index path and text headings only; symbol extraction may be empty.
- Duplicate symbol names → return all matches ranked by path/signal.
- File deleted after indexing → incremental refresh removes stale entry.
- No index available → runtime continues without repo-map context and emits diagnostic.
