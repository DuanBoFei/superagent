/**
 * Card fixture generator — renders all 9 card types + ErrorCard into a static HTML page.
 * Used by Playwright for visual regression (screenshots) and a11y audit (axe-core).
 * Also validates cross-browser rendering.
 */
import { renderCards } from "../../packages/web/src/components/chat/cards/CardRenderer";
import { renderBashCard } from "../../packages/web/src/components/chat/cards/BashCard";
import { renderFileReadCard } from "../../packages/web/src/components/chat/cards/FileReadCard";
import { renderFileWriteCard } from "../../packages/web/src/components/chat/cards/FileWriteCard";
import { renderFileEditCard } from "../../packages/web/src/components/chat/cards/FileEditCard";
import { renderGrepCard } from "../../packages/web/src/components/chat/cards/GrepCard";
import { renderGlobCard } from "../../packages/web/src/components/chat/cards/GlobCard";
import { renderTaskListCard } from "../../packages/web/src/components/chat/cards/TaskListCard";
import { renderSubAgentGridCard } from "../../packages/web/src/components/chat/cards/SubAgentGridCard";
import { renderWebSearchCard } from "../../packages/web/src/components/chat/cards/WebSearchCard";
import { renderErrorCard, type ErrorCardState } from "../../packages/web/src/components/chat/cards/ErrorCard";
import { createCardRegistry } from "../../packages/web/src/components/chat/cards/CardRegistry";
import type { ToolCardState } from "../../packages/web/src/types/cards";

function createTimestamp(): number {
  return Date.now();
}

export function createAllCardStates(): ToolCardState[] {
  return [
    // 1. BashCard — success with colored output
    {
      id: "card-bash-ok",
      type: "bash",
      status: "success",
      timestamp: createTimestamp(),
      title: "npm run build",
      isExpanded: true,
      isCollapsible: true,
      content: {
        command: "npm",
        args: ["run", "build"],
        output: "\x1b[32m✓\x1b[0m Building production bundle...\n\x1b[1m\x1b[33mWARN\x1b[0m  Deprecated API \"oldFn\" used in src/utils.ts:42\n\x1b[32m✓\x1b[0m Compiled 142 modules in 3.2s\n\x1b[32m✓\x1b[0m Type checking passed (0 errors)\n\x1b[34m[i]\x1b[0m Output: dist/bundle.js (284 KB gzipped)",
        exitCode: 0,
        durationMs: 3240,
      },
    },
    // 1b. BashCard — error
    {
      id: "card-bash-err",
      type: "bash",
      status: "error",
      timestamp: createTimestamp() - 5000,
      title: "npm test -- login",
      isExpanded: true,
      isCollapsible: true,
      content: {
        command: "npm",
        args: ["test", "--", "login"],
        output: "FAIL  src/login.test.ts\n  login flow\n    ✗ should handle async submit (142ms)\n\nTests: 1 failed, 1 total\n",
        exitCode: 1,
        durationMs: 1420,
      },
    },
    // 2. FileReadCard
    {
      id: "card-read",
      type: "file-read",
      status: "success",
      timestamp: createTimestamp() - 10000,
      title: "Read src/config.ts",
      isExpanded: true,
      isCollapsible: true,
      content: {
        filePath: "src/config.ts",
        fileSize: 2048,
        lineCount: 45,
        content: Array.from({ length: 15 }, (_, i) => `// line ${i + 1}: configuration`).join("\n"),
        language: "typescript",
      },
    },
    // 3. FileWriteCard — new file
    {
      id: "card-write",
      type: "file-write",
      status: "success",
      timestamp: createTimestamp() - 8000,
      title: "Write src/new-util.ts",
      isExpanded: true,
      isCollapsible: true,
      content: {
        filePath: "src/new-util.ts",
        linesWritten: 24,
        content: Array.from({ length: 8 }, (_, i) => `export function util${i}() { return ${i}; }`).join("\n"),
      },
    },
    // 4. FileEditCard — diff with additions and deletions
    {
      id: "card-edit",
      type: "file-edit",
      status: "success",
      timestamp: createTimestamp() - 7000,
      title: "Edit src/login.ts",
      isExpanded: true,
      isCollapsible: true,
      content: {
        filePath: "src/login.ts",
        diff: `@@ -1,5 +1,6 @@\n-export function handleSubmit(e: Event) {\n+export async function handleSubmit(e: Event) {\n   const data = new FormData(e.target);\n   await login(data);\n+  return { success: true };\n }\n-// TODO: add validation\n+// Validation added in login()`,
        linesAdded: 2,
        linesRemoved: 2,
      },
    },
    // 5. GrepCard
    {
      id: "card-grep",
      type: "grep",
      status: "success",
      timestamp: createTimestamp() - 15000,
      title: "grep handleSubmit",
      isExpanded: true,
      isCollapsible: true,
      content: {
        pattern: "handleSubmit",
        matches: [
          { filePath: "src/login.ts", line: 42, column: 10, matchText: "handleSubmit", contextBefore: "export function", contextAfter: "(e: Event) {" },
          { filePath: "src/form.ts", line: 88, column: 5, matchText: "handleSubmit", contextBefore: "  const", contextAfter: "= createHandler()" },
          { filePath: "tests/login.test.ts", line: 15, column: 20, matchText: "handleSubmit", contextBefore: "  it('calls", contextAfter: "with event', () => {" },
        ],
        totalMatches: 3,
        filesSearched: 142,
      },
    },
    // 6. GlobCard
    {
      id: "card-glob",
      type: "glob",
      status: "success",
      timestamp: createTimestamp() - 12000,
      title: "glob *.test.ts",
      isExpanded: true,
      isCollapsible: true,
      content: {
        pattern: "*.test.ts",
        files: ["src/login.test.ts", "src/form.test.ts", "tests/utils.test.ts", "tests/api.test.ts", "tests/e2e/login-flow.test.ts", "tests/e2e/checkout.test.ts"],
        totalFiles: 6,
      },
    },
    // 7. TaskListCard
    {
      id: "card-tasks",
      type: "task-list",
      status: "success",
      timestamp: createTimestamp() - 20000,
      title: "Tasks",
      isExpanded: true,
      isCollapsible: true,
      content: {
        tasks: [
          { taskId: "t1", title: "Add user authentication flow", status: "completed" },
          { taskId: "t2", title: "Implement login form validation", status: "completed" },
          { taskId: "t3", title: "Write integration tests", status: "in-progress" },
          { taskId: "t4", title: "Update API documentation", status: "pending" },
          { taskId: "t5", title: "Deprecated endpoint cleanup", status: "deleted" },
        ],
        completedCount: 2,
        totalCount: 5,
      },
    },
    // 8. SubAgentGridCard
    {
      id: "card-agents",
      type: "sub-agent-grid",
      status: "success",
      timestamp: createTimestamp() - 5000,
      title: "Parallel exploration",
      isExpanded: true,
      isCollapsible: true,
      content: {
        cells: [
          { agentId: "a1", title: "Explore auth module", status: "completed", output: "Found 3 files:\n- src/auth/login.ts\n- src/auth/session.ts\n- src/auth/types.ts", progress: 100 },
          { agentId: "a2", title: "Explore payment module", status: "running", output: "Scanning...\nFound src/payment/checkout.ts", progress: 60 },
          { agentId: "a3", title: "Explore utils", status: "pending", output: "", progress: 0 },
        ],
        columns: 2,
      },
    },
    // 9. WebSearchCard
    {
      id: "card-search",
      type: "web-search",
      status: "success",
      timestamp: createTimestamp() - 3000,
      title: "Search: TypeScript generic constraints",
      isExpanded: true,
      isCollapsible: true,
      content: {
        query: "TypeScript generic constraints",
        results: [
          { title: "TypeScript Handbook — Generics", url: "https://www.typescriptlang.org/docs/handbook/2/generics.html", snippet: "Official TypeScript documentation covering generic types, constraints, and advanced patterns.", source: "typescriptlang.org" },
          { title: "Understanding TypeScript Generics", url: "https://example.com/ts-generics-guide", snippet: "A comprehensive guide to TypeScript generics with practical examples and best practices.", source: "example.com" },
          { title: "Advanced Generic Patterns in TypeScript", url: "https://dev.to/advanced-ts-generics", snippet: "Deep dive into advanced generic patterns including conditional types and mapped types.", source: "dev.to" },
          { title: "TypeScript Generics Cheatsheet", url: "https://cheatsheets.io/ts-generics", snippet: "Quick reference for common generic type patterns and constraints.", source: "cheatsheets.io" },
        ],
        totalResults: 4,
      },
    },
  ];
}

export function createErrorCardState(): ErrorCardState {
  return {
    id: "card-error",
    status: "error",
    timestamp: createTimestamp(),
    title: "rm -rf /protected/path",
    isExpanded: true,
    content: {
      errorType: "PermissionDeniedError",
      message: "Cannot remove /protected/path: root directory access denied. Check file permissions and retry.",
      stackTrace: "Error: PermissionDeniedError\n    at BashTool.execute (bash.ts:142)\n    at ToolOrchestrator.run (orchestrator.ts:87)\n    at AgentSession.executeTool (session.ts:312)\n    at async Agent.run (agent.ts:89)",
    },
  };
}

export function createCollapsedCardStates(): ToolCardState[] {
  const states = createAllCardStates();
  return states.map((card) => ({ ...card, isExpanded: false }));
}

export function generateFixtureHtml(): string {
  const registry = createCardRegistry();
  registry.register("bash", renderBashCard as any);
  registry.register("file-read", renderFileReadCard as any);
  registry.register("file-write", renderFileWriteCard as any);
  registry.register("file-edit", renderFileEditCard as any);
  registry.register("grep", renderGrepCard as any);
  registry.register("glob", renderGlobCard as any);
  registry.register("task-list", renderTaskListCard as any);
  registry.register("sub-agent-grid", renderSubAgentGridCard as any);
  registry.register("web-search", renderWebSearchCard as any);

  const allCards = createAllCardStates();
  const errorCard = createErrorCardState();
  const collapsedCards = createCollapsedCardStates();

  const expandedHtml = renderCards(allCards, registry);
  const errorHtml = renderErrorCard(errorCard);
  const collapsedHtml = renderCards(collapsedCards, registry);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Cards — Visual Regression & a11y Fixture</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      background-color: #0a0a0a;
      color: #fafafa;
      font-family: Inter, system-ui, sans-serif;
      padding: 24px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #a1a1aa;
      margin-bottom: 16px;
      margin-top: 32px;
      border-bottom: 1px solid #1f1f23;
      padding-bottom: 8px;
    }
    .section-title:first-child {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="container" style="max-width:720px; margin:0 auto;">
    <h1 class="section-title">All 9 card types — Expanded</h1>
    ${expandedHtml}

    <h1 class="section-title">Error card</h1>
    ${errorHtml}

    <h1 class="section-title">All cards — Collapsed</h1>
    ${collapsedHtml}

    <h1 class="section-title">Long output — Bash with 100+ lines</h1>
    <div id="long-bash-section"></div>
  </div>

  <script>
    // Render a long-output bash card for scroll/fold testing
    var longOutput = [];
    for (var i = 0; i < 150; i++) {
      longOutput.push("line " + i + ": some output text here for scrolling test");
    }
  </script>
</body>
</html>`;
}
