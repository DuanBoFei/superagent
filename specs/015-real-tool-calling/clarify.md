# Clarify: Real Tool Calling

**Feature**: `015-real-tool-calling`  
**Created**: 2026-06-16  
**Status**: Draft

## Technical Clarifications

| ID | Question | Why it matters | Decision / Default |
|----|----------|----------------|--------------------|
| Q-015-01 | Which tool-calling protocol is authoritative for MVP? | Different providers emit different shapes; choosing late causes parser rewrites. | OpenAI-compatible Chat Completions `tools` + `tool_calls` is authoritative because DeepSeek exposes an OpenAI-compatible API. |
| Q-015-02 | Should XML/DSML/text fallback parsers be removed? | Removing them may regress current DeepSeek behavior while schemas are stabilizing. | Keep fallback parsers as compatibility only; structured tool calls take precedence. |
| Q-015-03 | How should streaming partial arguments be handled? | OpenAI-compatible streams send `delta.tool_calls[*].function.arguments` in fragments. | Accumulate by tool call index/id until finish or a complete JSON object can be parsed safely. |
| Q-015-04 | Where should tool schemas come from? | Duplicating schemas between registry and model provider will drift. | Generate model tool definitions from the existing tool registry metadata and zod schemas where possible. |
| Q-015-05 | What if a provider ignores `tools` and emits text markup? | DeepSeek may still emit XML-like text during transition. | Parse structured tool calls first; then pass text through fallback markup parser. |
| Q-015-06 | Should `tool_choice` force a tool? | Forcing can make final answers impossible; not forcing can reduce tool usage. | Default `tool_choice: "auto"`; no forced tool choice in MVP. |
| Q-015-07 | How should malformed tool arguments be surfaced? | Silent drops make the agent appear stuck. | Emit a deterministic `error` TurnEvent with tool name and redacted argument preview. |
| Q-015-08 | How many tool calls may be returned in one model response? | Runtime currently handles events one by one, but providers may stream multiple calls. | Support multiple calls per response and preserve provider order; existing scheduler handles dispatch policy. |

## Scope Boundaries

- In scope: provider request schema, streaming parser, runtime event conversion, tests, compatibility fallback.
- Out of scope: adding new tools, changing permission policy semantics, replacing DeepSeek model selection.
- Out of scope: multi-agent tool routing.

## Rework Risks If Not Clarified

1. Tool schema source duplication could force broad refactors across tools and model provider code.
2. Partial argument streaming could pass tests with complete chunks but fail in real provider streams.
3. Removing fallback parsers too early could break current user-visible workflows.
4. Provider-specific code paths could leak into runtime if the normalized Token shape is not preserved.
