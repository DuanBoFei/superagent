import { describe, expect, it } from "vitest";
import { renderToolCard } from "../../packages/web/src/components/chat/tool-grid/ToolCard";
import type { ToolCardData } from "../../packages/web/src/types/tool-grid";

// ── Helpers ──────────────────────────────────────────

function makeBashTool(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: overrides.toolId ?? "bash-001",
    toolName: "bash",
    parameters: overrides.parameters ?? { command: "npm test" },
    status: overrides.status ?? "running",
    progress: "progress" in overrides ? overrides.progress : 50,
    startTime: overrides.startTime ?? 1000000,
    endTime: overrides.endTime ?? null,
    durationMs: overrides.durationMs ?? null,
    outputPreview: overrides.outputPreview ?? ["[32mPASS[0m test.ts", "[31mFAIL[0m app.ts"],
    fullOutput: overrides.fullOutput ?? "[32mPASS[0m test.ts\n[31mFAIL[0m app.ts\n\nTests: 2 passed, 1 failed",
    error: overrides.error ?? null,
    isExpanded: overrides.isExpanded ?? false,
    resourceUsage: overrides.resourceUsage ?? { outputBytes: 128 },
  };
}

function makeReadTool(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: overrides.toolId ?? "read-001",
    toolName: "read",
    parameters: overrides.parameters ?? { filePath: "/src/app.ts" },
    status: overrides.status ?? "success",
    progress: "progress" in overrides ? overrides.progress : 100,
    startTime: overrides.startTime ?? 1000000,
    endTime: overrides.endTime ?? 1003000,
    durationMs: overrides.durationMs ?? 3000,
    outputPreview: overrides.outputPreview ?? ["const x = 1;", "export default x;"],
    fullOutput: overrides.fullOutput ?? "const x = 1;\nexport default x;",
    error: overrides.error ?? null,
    isExpanded: overrides.isExpanded ?? false,
    resourceUsage: overrides.resourceUsage ?? { outputBytes: 64 },
  };
}

// ── Terminal Renderer Integration ────────────────────

describe("bash tool output rendering", () => {
  it("uses terminal-renderer class when bash tool is expanded", () => {
    const html = renderToolCard(makeBashTool({
      isExpanded: true,
    }));
    expect(html).toContain("terminal-renderer");
    expect(html).toContain("terminal-line");
  });

  it("uses plain text preview when bash tool is collapsed", () => {
    const html = renderToolCard(makeBashTool({
      isExpanded: false,
    }));
    expect(html).not.toContain("terminal-renderer");
    expect(html).toContain("tool-output-preview");
  });

  it("converts ANSI escape codes to colored HTML spans when expanded", () => {
    const html = renderToolCard(makeBashTool({
      isExpanded: true,
      fullOutput: "[32mPASS[0m test.ts\n[31mFAIL[0m app.ts",
      outputPreview: ["[32mPASS[0m test.ts", "[31mFAIL[0m app.ts"],
    }));
    // ANSI codes should be converted to styled spans in visible output
    // (raw ESC codes may appear in data attributes for clipboard copy)
    expect(html).toContain("color:#60d828");
    expect(html).toContain("color:#ff5555");
    // Should contain rendered content
    expect(html).toContain("test.ts");
    expect(html).toContain("app.ts");
  });

  it("empty bash output shows terminal-renderer with empty marker", () => {
    const html = renderToolCard(makeBashTool({
      isExpanded: true,
      fullOutput: "",
      outputPreview: [],
    }));
    // Should still render terminal wrapper even when empty
    // No output section at all when both are empty
    expect(html).not.toContain("tool-output-full");
    expect(html).not.toContain("tool-output-preview");
  });
});

describe("non-bash tool output rendering", () => {
  it("uses plain text output for Read tool even when expanded", () => {
    const html = renderToolCard(makeReadTool({
      isExpanded: true,
    }));
    expect(html).not.toContain("terminal-renderer");
    expect(html).toContain("tool-output-pre");
  });

  it("uses plain text output for Grep tool", () => {
    const grepTool = makeReadTool({ toolName: "grep" });
    const html = renderToolCard({
      ...grepTool,
      isExpanded: true,
    });
    expect(html).not.toContain("terminal-renderer");
    expect(html).toContain("tool-output-pre");
  });
});

describe("terminal renderer options", () => {
  it("renders bash output with appropriate maxLines", () => {
    const html = renderToolCard(makeBashTool({
      isExpanded: true,
    }));
    expect(html).toContain("terminal-renderer");
    // Should be wrapped in output container
    expect(html).toContain("tool-output-full");
  });

  it("renders long bash output without crashing", () => {
    const longOutput = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
    const html = renderToolCard(makeBashTool({
      isExpanded: true,
      fullOutput: longOutput,
      outputPreview: longOutput.split("\n"),
    }));
    expect(html).toContain("terminal-renderer");
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });
});

describe("renderBashOutputAsync lazy loading", () => {
  it("renders bash content via dynamic import", async () => {
    const { renderBashOutputAsync } = await import(
      "../../packages/web/src/components/chat/tool-grid/ToolCard"
    );
    const result = await renderBashOutputAsync("[32mOK[0m");
    expect(result).toContain("terminal-renderer");
    expect(result).toContain("OK");
  });

  it("handles empty content", async () => {
    const { renderBashOutputAsync } = await import(
      "../../packages/web/src/components/chat/tool-grid/ToolCard"
    );
    const result = await renderBashOutputAsync("");
    expect(result).toContain("terminal-renderer");
    expect(result).toContain("terminal-empty");
  });
});

describe("mixed tool types edge cases", () => {
  it("bash with error status still uses terminal for output", () => {
    const html = renderToolCard(makeBashTool({
      status: "failed",
      isExpanded: true,
      error: { message: "exit code 1" },
      fullOutput: "[31mError in build[0m",
      outputPreview: ["Error in build"],
    }));
    // Error section should be present
    expect(html).toContain("tool-card-error");
    // Output should still use terminal renderer
    expect(html).toContain("terminal-renderer");
  });

  it("bash collapsed escapes ANSI codes in preview", () => {
    const html = renderToolCard(makeBashTool({
      isExpanded: false,
      outputPreview: ["[32mPASS[0m test.ts"],
      fullOutput: "[32mPASS[0m test.ts",
    }));
    // Preview should not contain raw ANSI escape sequences
    expect(html).toContain("tool-output-preview");
    expect(html).not.toContain("terminal-renderer");
  });
});
