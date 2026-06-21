"use client";

import React from "react";
import { MessageList } from "../../src/components/chat/message-list";
import { DiffViewer } from "../../src/components/chat/diff/DiffViewer";
import { TerminalRenderer } from "../../src/components/chat/terminal/TerminalRenderer";
import { ToolGrid } from "../../src/components/chat/tool-grid/ToolGrid";
import { SessionHistorySidebar } from "../../src/components/sidebar/session-history-sidebar";
import type { Message } from "../../src/types/message";
import type { ToolCardData } from "../../src/types/tool-grid";
import type { SessionSummary } from "../../src/types/session-history";
import type { ToolTimerState } from "../../src/hooks/use-tool-timer";

const noop = () => {};

// ── Test data ──────────────────────────────────────────

const sampleMessages: Message[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Can you fix the login bug in auth.ts?",
    status: "sent",
    timestamp: 1700000000000,
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "I found the issue. The `validateToken` function returns `null` instead of throwing, but the caller doesn't check for `null`. Here's the fix:",
    status: "sent",
    timestamp: 1700000001000,
  },
  {
    id: "msg-3",
    role: "assistant",
    content:
      "```ts\nfunction login(username: string, password: string) {\n  const token = validateToken(username, password);\n  if (!token) throw new AuthError(\"Invalid credentials\");\n  return createSession(token);\n}\n```\n\nThe change adds a **null check** with an explicit `AuthError` throw.",
    status: "sent",
    timestamp: 1700000002000,
  },
];

const emptyMessages: Message[] = [];

const sampleDiff = `--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,6 +10,10 @@
 export function login(username: string, password: string): Session {
   const token = validateToken(username, password);
-  return createSession(token);
+  if (!token) {
+    throw new AuthError("Invalid credentials");
+  }
+  const session = createSession(token);
+  return session;
 }

@@ -24,7 +28,8 @@
 function validateToken(username: string, password: string): Token | null {
-  const user = db.findUser(username);
+  const user = db.findUser(username.toLowerCase());
   if (!user || !verifyHash(password, user.hash)) {
-    return null;
+    throw new AuthError("User not found or password mismatch");
   }
   return signToken(user.id);
 }`;

const sampleAnsiContent =
  "\x1b[1;32mPASS\x1b[0m  src/auth.test.ts > login > rejects invalid credentials\n" +
  "\x1b[1;32mPASS\x1b[0m  src/auth.test.ts > login > creates session for valid user\n" +
  "\x1b[1;31mFAIL\x1b[0m  src/auth.test.ts > login > handles empty password\n" +
  "\x1b[0;33m  → Expected AuthError but got TypeError\x1b[0m\n" +
  "\n" +
  "\x1b[1;34mTests:\x1b[0m  \x1b[1;32m2 passed\x1b[0m, \x1b[1;31m1 failed\x1b[0m, 3 total\n" +
  "\x1b[1;34mTime:\x1b[0m    1.234 s\n";

const longAnsiContent = Array.from({ length: 150 }, (_, i) =>
  `\x1b[36m[${String(i + 1).padStart(4, "0")}]\x1b[0m  \x1b[${i % 3 === 0 ? "32" : i % 3 === 1 ? "33" : "31"}mline ${i + 1} output here with some more text to fill\x1b[0m`
).join("\n");

const sampleTools: ToolCardData[] = [
  {
    toolId: "t-read-1",
    toolName: "read",
    parameters: { filePath: "src/auth.ts" },
    status: "success",
    progress: 100,
    startTime: 1700000000000,
    endTime: 1700000000150,
    durationMs: 150,
    outputPreview: ["export function login", "  const token = validateToken"],
    fullOutput: "export function login(username: string, password: string): Session {\n  const token = validateToken(username, password);\n  return createSession(token);\n}",
    error: null,
    isExpanded: true,
    resourceUsage: { outputBytes: 2048 },
  },
  {
    toolId: "t-grep-1",
    toolName: "grep",
    parameters: { pattern: "validateToken", path: "src/" },
    status: "success",
    progress: 100,
    startTime: 1700000000010,
    endTime: 1700000000090,
    durationMs: 80,
    outputPreview: ["src/auth.ts:11: const token = validateToken", "src/auth.ts:28: function validateToken"],
    fullOutput: "src/auth.ts:11: const token = validateToken(username, password);\nsrc/auth.ts:28: function validateToken(username: string, password: string): Token | null {",
    error: null,
    isExpanded: true,
    resourceUsage: { outputBytes: 512 },
  },
  {
    toolId: "t-bash-1",
    toolName: "bash",
    parameters: { command: "npm test -- --reporter=verbose" },
    status: "running",
    progress: 60,
    startTime: 1700000000100,
    endTime: null,
    durationMs: null,
    outputPreview: ["PASS  src/auth.test.ts", "FAIL  src/auth.test.ts"],
    fullOutput: sampleAnsiContent,
    error: null,
    isExpanded: true,
    resourceUsage: { outputBytes: 1024 },
  },
  {
    toolId: "t-edit-1",
    toolName: "edit",
    parameters: { filePath: "src/auth.ts", newString: "if (!token) throw..." },
    status: "failed",
    progress: 100,
    startTime: 1700000000200,
    endTime: 1700000000300,
    durationMs: 100,
    outputPreview: [],
    fullOutput: "",
    error: { message: "Edit failed: old_string not found in file", stack: "Error: old_string not found in file\n    at FileEditTool.execute" },
    isExpanded: true,
    resourceUsage: { outputBytes: 0 },
  },
];

const timerStates = new Map<string, ToolTimerState>(
  sampleTools.map((t) => [
    t.toolId,
    {
      formatted: t.status === "running" ? "0.6s" : `${(t.durationMs ?? 0) / 1000}s`,
      running: t.status === "running",
      elapsedMs: t.durationMs ?? 0,
    },
  ])
);

const bashOutputs = new Map<string, string>([
  ["t-bash-1", sampleAnsiContent],
]);

const toolGridProps = {
  tools: sampleTools,
  containerWidth: 800,
  sortBy: "status" as const,
  sortOrder: "asc" as const,
  filterStatus: "all" as const,
  viewMode: "grid" as const,
  errorExpanded: false,
  runningCount: 1,
  completedCount: 2,
  showUndo: false,
  selectedResourceMetric: "duration" as const,
  scrollTop: 0,
  viewportHeight: 600,
  timerStates,
  bashOutputs,
  onToggleCard: noop,
  onToggleErrorPanel: noop,
  onScrollToTool: noop,
  onCancelAll: noop,
  onExpandAll: noop,
  onCollapseAll: noop,
  onClearCompleted: noop,
  onUndoClear: noop,
  onSetView: noop,
  onSortBy: noop,
  onToggleSortOrder: noop,
  onFilterBy: noop,
  onSelectMetric: noop,
};

const sampleSessions: SessionSummary[] = [
  {
    id: "sess-1",
    title: "Fix login bug in auth.ts",
    firstMessagePreview: "Can you fix the login bug in auth.ts?",
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 1800000,
    durationMs: 120000,
    toolCallCount: 5,
    messageCount: 12,
    status: "completed",
    tags: ["bugfix", "auth"],
    forkedFrom: null,
  },
  {
    id: "sess-2",
    title: "Add rate limiting middleware",
    firstMessagePreview: "I need rate limiting for the API...",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86000000,
    durationMs: 300000,
    toolCallCount: 8,
    messageCount: 20,
    status: "completed",
    tags: ["feature", "api"],
    forkedFrom: null,
  },
  {
    id: "sess-3",
    title: "Refactor database layer",
    firstMessagePreview: "Let's migrate to the new DB schema...",
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172700000,
    durationMs: 600000,
    toolCallCount: 15,
    messageCount: 35,
    status: "active",
    tags: ["refactor", "database"],
    forkedFrom: null,
  },
];

export default function FixturesPage() {
  return (
    <div className="p-6 space-y-10" style={{ background: "#0a0a0a", color: "#fafafa", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <h1 className="text-sm font-mono text-neutral-500 border-b border-neutral-800 pb-2 mb-6">
        T016 · App Shell Visual Fixtures
      </h1>

      {/* Section 1: Message bubbles */}
      <section data-fixture="messages">
        <h2 className="text-xs font-mono text-neutral-500 mb-2">1. Message Bubbles</h2>
        <div className="border border-neutral-800 rounded" style={{ background: "#0a0a0a" }}>
          <MessageList messages={sampleMessages} />
        </div>
      </section>

      {/* Section 2: Empty message state */}
      <section data-fixture="empty-chat">
        <h2 className="text-xs font-mono text-neutral-500 mb-2">2. Empty Chat State</h2>
        <div className="border border-neutral-800 rounded" style={{ background: "#0a0a0a" }}>
          <MessageList messages={emptyMessages} />
        </div>
      </section>

      {/* Section 3: Tool card grid */}
      <section data-fixture="tool-grid">
        <h2 className="text-xs font-mono text-neutral-500 mb-2">3. Tool Card Grid</h2>
        <div className="border border-neutral-800 rounded" style={{ background: "#0a0a0a" }}>
          <ToolGrid {...toolGridProps} />
        </div>
      </section>

      {/* Section 4: Diff view */}
      <section data-fixture="diff">
        <h2 className="text-xs font-mono text-neutral-500 mb-2">4. Diff View</h2>
        <div className="border border-neutral-800 rounded">
          <DiffViewer diff={sampleDiff} filePath="src/auth.ts" language="typescript" />
        </div>
      </section>

      {/* Section 5: Terminal ANSI output */}
      <section data-fixture="terminal">
        <h2 className="text-xs font-mono text-neutral-500 mb-2">5. Terminal ANSI Output</h2>
        <div className="border border-neutral-800 rounded">
          <TerminalRenderer content={sampleAnsiContent} />
        </div>
      </section>

      {/* Section 6: Terminal — long output (collapsed) */}
      <section data-fixture="terminal-collapsed">
        <h2 className="text-xs font-mono text-neutral-500 mb-2">6. Terminal — Collapsed (50 line limit)</h2>
        <div className="border border-neutral-800 rounded">
          <TerminalRenderer content={longAnsiContent} maxLines={50} />
        </div>
      </section>

      {/* Section 7: Sidebar */}
      <section data-fixture="sidebar">
        <h2 className="text-xs font-mono text-neutral-500 mb-2">7. Sidebar</h2>
        <div className="border border-neutral-800 rounded" style={{ height: 500 }}>
          <SessionHistorySidebar sessions={sampleSessions} />
        </div>
      </section>
    </div>
  );
}
