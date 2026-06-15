import type { HookConfig, HookEvent, HookEventName } from "./types";

export function hookMatchesEvent(
  hook: HookConfig,
  eventName: HookEventName,
  event: HookEvent,
): boolean {
  if (event.event !== eventName) return false;

  const matcher = hook.matcher;
  if (!matcher) return true;

  if (matcher.tool !== undefined) {
    if (!hasToolPayload(event)) return false;
    if (matcher.tool !== "*" && matcher.tool !== event.payload.toolName) return false;
  }

  if (matcher.inputPattern !== undefined) {
    if (!hasToolPayload(event)) return false;
    if (!new RegExp(matcher.inputPattern).test(JSON.stringify(event.payload.input))) return false;
  }

  if (matcher.promptPattern !== undefined) {
    if (event.event !== "UserPromptSubmit") return false;
    if (!new RegExp(matcher.promptPattern).test(event.payload.prompt)) return false;
  }

  return true;
}

function hasToolPayload(
  event: HookEvent,
): event is Extract<HookEvent, { payload: { toolName: string; input: Record<string, unknown> } }> {
  return "toolName" in event.payload && "input" in event.payload;
}
