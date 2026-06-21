import { describe, expect, it } from "vitest";
import { routeMultiAgentPrompt } from "../../src/agents/router";

describe("multi-agent prompt router", () => {
  it("keeps simple prompts on the single-agent path", () => {
    expect(routeMultiAgentPrompt("explain this function")).toEqual({
      mode: "single",
      prompt: "explain this function",
      reason: "simple",
    });
  });

  it("forces multi-agent mode with the explicit marker", () => {
    expect(routeMultiAgentPrompt("/multi-agent fix the auth flow")).toEqual({
      mode: "multi",
      prompt: "fix the auth flow",
      reason: "forced",
    });
  });

  it("keeps plain search prompts on the single-agent path", () => {
    expect(routeMultiAgentPrompt("search the tests")).toEqual({
      mode: "single",
      prompt: "search the tests",
      reason: "simple",
    });
  });

  it("routes complex refactor and bug prompts to multi-agent mode", () => {
    expect(routeMultiAgentPrompt("refactor the runtime across modules")).toEqual({
      mode: "multi",
      prompt: "refactor the runtime across modules",
      reason: "complex",
    });
    expect(routeMultiAgentPrompt("fix the permission integration tests")).toEqual({
      mode: "multi",
      prompt: "fix the permission integration tests",
      reason: "complex",
    });
  });

  it("routes implementation prompts touching runtime or persistence to multi-agent mode", () => {
    expect(routeMultiAgentPrompt("add tracing to runtime files")).toEqual({
      mode: "multi",
      prompt: "add tracing to runtime files",
      reason: "complex",
    });
  });
});
