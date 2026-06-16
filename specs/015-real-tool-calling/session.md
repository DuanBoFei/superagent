# Session: 015 Real Tool Calling

## Summary

Implemented real model tool-calling support for OpenAI-compatible providers and verified the DeepSeek one-shot path. The feature now sends registered tool definitions to the provider, parses structured streaming tool calls, dispatches them through the runtime, and returns tool results to the next model request.

## Changes

- Added model tool definition generation from registered Zod tool schemas.
- Wired runtime prompt composition to include available tool definitions.
- Extended provider request bodies with `tools` and `tool_choice: "auto"`.
- Added streaming tool-call accumulation for complete, fragmented, and multiple indexed calls.
- Added safe malformed-argument handling with secret-looking preview redaction.
- Preserved text fallback parsing while preventing duplicate dispatch when structured tool calls are present.
- Added one-shot `--prompt` CLI support and `pnpm start` script for local smoke verification.

## Verification Log

- Provider/tool schema tests passed.
- Client structured tool-call parser tests passed.
- Runtime/query-loop and stream-handler tests passed.
- `pnpm typecheck` passed.
- `pnpm test -- tests/models tests/runtime/query-loop.test.ts tests/runtime/stream-handler.test.ts` passed.
- DeepSeek smoke command returned a final Chinese `createRuntime` analysis.

## Notes

Interactive Windows terminal input flicker remains outside this feature and belongs to `017-cli-stability-windows`.
