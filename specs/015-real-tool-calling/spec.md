# Feature Specification: Real Tool Calling

**Feature Branch**: `015-real-tool-calling`  
**Created**: 2026-06-16  
**Status**: Draft  
**Input**: Replace brittle text/XML pseudo-tool parsing with real OpenAI-compatible tool calling while retaining compatibility fallback.

## User Scenarios & Testing

### User Story 1 - Model calls tools through provider-native schema (Priority: P0)

As a SuperAgent user, when I ask the agent to inspect a file, the model receives real tool definitions and returns structured tool calls instead of XML or DSML text.

**Why this priority**: Current behavior depends on parsing hallucinated text formats and will keep breaking as the model changes output style.

**Independent Test**: A fake OpenAI-compatible provider receives a request body containing `tools`, emits streaming `delta.tool_calls`, and the runtime dispatches the requested tool.

**Acceptance Scenarios**:

1. **Given** a Read tool exists in the registry, **When** the model request is built, **Then** the provider request includes an OpenAI-compatible `tools` entry for Read with a JSON schema for its input.
2. **Given** the provider streams a structured Read tool call, **When** the stream is parsed, **Then** SuperAgent yields a `tool_call` event with normalized `{ file_path }` args.
3. **Given** the provider streams fragmented JSON arguments, **When** all fragments arrive, **Then** SuperAgent emits exactly one tool call with the complete parsed JSON.

---

### User Story 2 - Tool results continue the model loop (Priority: P0)

As a user, after a tool executes, the model sees the tool result and produces the final answer in the same one-shot session.

**Why this priority**: A successful tool call without a follow-up answer is not a usable agent loop.

**Independent Test**: First model response calls Read; dispatch returns file content; second model request includes the tool result and returns an analysis.

**Acceptance Scenarios**:

1. **Given** a model calls Read, **When** the Read result is returned, **Then** the next model request includes the result in session history.
2. **Given** the second model response is text, **When** one-shot mode consumes the loop, **Then** terminal output contains the final answer, not only the tool request.

---

### User Story 3 - Compatibility fallback remains safe (Priority: P1)

As a maintainer, I can keep current XML/DSML fallback behavior during migration without letting text markup override structured tool calls.

**Why this priority**: DeepSeek may not consistently follow tools immediately; fallback avoids regressions.

**Independent Test**: Structured tool calls and text markup in separate test cases both dispatch tools; when both appear, structured calls are handled deterministically.

**Acceptance Scenarios**:

1. **Given** the provider emits only text `<FunctionCall ... />`, **When** no structured call exists, **Then** fallback parser converts it into a tool call.
2. **Given** the provider emits malformed fallback markup, **When** parsing fails, **Then** SuperAgent leaves it as text or emits a safe parser error without crashing.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-RTC-01 | SuperAgent MUST serialize registered tools into OpenAI-compatible `tools` definitions in model requests. |
| FR-RTC-02 | SuperAgent MUST preserve existing tool names and input argument names when generating provider tool schemas. |
| FR-RTC-03 | SuperAgent MUST send `tool_choice: "auto"` when tools are available. |
| FR-RTC-04 | SuperAgent MUST parse streaming `delta.tool_calls` chunks into normalized `Token` tool-use events. |
| FR-RTC-05 | SuperAgent MUST accumulate partial tool-call arguments by provider tool call id or index. |
| FR-RTC-06 | SuperAgent MUST support multiple tool calls in one model response while preserving provider order. |
| FR-RTC-07 | SuperAgent MUST emit deterministic parser errors for malformed structured tool-call JSON. |
| FR-RTC-08 | SuperAgent MUST route structured tool calls through the existing permission and tool-dispatcher pipeline. |
| FR-RTC-09 | SuperAgent MUST append tool calls and tool results to session history so follow-up model requests see them. |
| FR-RTC-10 | SuperAgent MUST keep fallback text tool-call parsing for DSML/XML/FunctionCall formats after structured parsing. |
| FR-RTC-11 | SuperAgent MUST prefer structured provider tool calls over text fallback parsing when both are available. |
| FR-RTC-12 | SuperAgent MUST redact secret-like values from malformed argument previews and debug logs. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-RTC-01 | Tool schema generation must be deterministic to preserve prompt/cache stability. |
| NFR-RTC-02 | Streaming argument accumulation must not retain state across separate model requests. |
| NFR-RTC-03 | Existing stream-handler fallback tests must continue to pass. |
| NFR-RTC-04 | One-shot file analysis smoke must complete with a final text answer after Read. |

## Key Entities

| Entity | Description |
|--------|-------------|
| ModelToolDefinition | OpenAI-compatible tool schema derived from a registered SuperAgent tool. |
| ToolCallAccumulator | Per-stream state for partial provider tool calls and arguments. |
| StructuredToolToken | Normalized internal token representing a provider-native tool call. |
| FallbackToolMarkup | Compatibility parser output for text-based pseudo-tool calls. |

## Success Criteria

- The command `pnpm start -- --prompt "分析一下 src/runtime/runtime.ts 的 createRuntime 做了什么"` reads the file and prints a final analysis.
- Unit tests cover complete, fragmented, multiple, malformed, and fallback tool call formats.
- Runtime tests prove tool results are injected into the next model request.
