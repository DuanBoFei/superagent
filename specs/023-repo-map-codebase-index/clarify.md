# Clarify: Repo Map / Codebase Index

## Decisions

| Question | Decision | Why |
|----------|----------|-----|
| Is first version semantic/vector search? | No. Use deterministic lexical/path/symbol ranking. | Keeps MVP local, cheap, testable, and dependency-light. |
| Does indexing call a model? | No for first version. | Avoids cost, latency, and nondeterministic snapshots. |
| What languages are supported first? | TypeScript/JavaScript plus generic text fallback. | Current repo is TypeScript; fallback keeps other files discoverable. |
| Should the repo map be injected every turn? | Only as a bounded context block when available and relevant. | Prevents prompt bloat and preserves cache stability. |
| Should index errors fail runtime? | No. Emit diagnostics and continue without those files. | Invalid files must not block agent work. |
| Should ignored/secret files be indexed? | No by default. | Prevents accidental secret exposure in prompts. |
| Should incremental indexing be required? | Yes for changed files, with full rebuild as fallback. | Keeps context current without scanning everything every turn. |

## Open Questions That Would Cause Rework

1. **Parser depth**: Regex-based top-level extraction or TypeScript compiler API?
   - Proposed default: use TypeScript compiler API only if already available in dependencies; otherwise regex-based extraction for exports/imports.
2. **Persistence shape**: Store full index in SQLite or write JSON cache under project metadata?
   - Proposed default: persist metadata through existing session persistence first; JSON cache can follow if needed.
3. **Ranking formula**: Should path matches beat symbol matches?
   - Proposed default: exact symbol > exact basename > import match > path substring > summary token match.
4. **Context budget**: What default max size should repo-map prompt block use?
   - Proposed default: 8-12KB characters, configurable.
5. **Gitignore support**: Parse `.gitignore` fully or use built-in skip patterns first?
   - Proposed default: built-in skip patterns plus project config; full `.gitignore` parser deferred unless dependency already exists.

## Assumptions

- File listing and reading can use existing Glob/Read primitives or shared filesystem helpers.
- The codebase already has TypeScript available as a dev/runtime dependency.
- Runtime prompt builder can accept an optional repo-map context section.
- Persistence can store structured events or compact metadata for index refresh.

## Deferred

- Embedding-based semantic search
- Vector database storage
- Full AST indexing for all languages
- Cross-repository global index
- Background daemon or file watcher
- RepoWiki-style generated architecture documentation
