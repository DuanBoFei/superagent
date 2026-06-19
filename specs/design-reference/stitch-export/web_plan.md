# SuperAgent Web UI · Technical Implementation Plan

## 1. Document Information

| 项 | 值 |
|---|---|
| **文档名称** | SuperAgent Web UI Technical Plan |
| **版本** | v1.0 |
| **状态** | Draft |
| **创建日期** | 2026-06-18 |
| **上游依赖** | specs/web-prd.md (PRD 已批准) |
| **关联文档** | specs/prd.md, specs/research/04-实现方案.md |

---

## 2. Technical Context

### 2.1 Architecture Overview

```
packages/
├── core/          # Shared runtime (extracted from src/)
│   ├── runtime/   # Agent Core, Tool Orchestrator, Context Manager
│   ├── tools/     # Built-in tools (Read/Write/Edit/Bash/etc.)
│   ├── models/    # Model provider adapters
│   └── persistence/ # SQLite session storage
├── cli/           # CLI entrypoint (existing src/cli)
└── web/           # Next.js Web UI
    ├── app/       # App Router pages
    ├── components/ # React components (Shadcn UI)
    ├── store/     # Zustand state management
    ├── hooks/     # Custom React hooks
    ├── server/    # Backend API (Node.js HTTP + Socket.io)
    └── types/     # Shared TypeScript types
```

### 2.2 Technology Stack (Confirmed)

| Layer | Technology | Rationale |
|---|---|---|
| **Monorepo** | pnpm workspaces | Standard for TypeScript monorepos, fast, reliable |
| **Frontend** | Next.js 15 (App Router) | Industry standard React framework, SSR/API routes |
| **UI Library** | Shadcn UI + Tailwind CSS | Claude Code / Cursor style, customizable, CLI-like aesthetic |
| **State Management** | Zustand | Simple, un-opinionated, matches Redux devtools |
| **Real-time** | Socket.io | Bidirectional communication, mature, handles streaming |
| **Runtime** | Node.js 22+ | Shared with CLI, Bun-compatible |
| **Type Safety** | TypeScript 5.x (strict) + Zod | Full stack type safety, schema validation |
| **Syntax Highlighting** | react-syntax-highlighter | Code block rendering in chat stream |
| **Diff Rendering** | react-diff-view | Inline diff display for file edits |
| **ANSI Rendering** | anser | Terminal output colorization |

### 2.3 Module Boundaries

#### Package: `@superagent/core`

**Purpose**: Shared runtime used by both CLI and Web UI

**Exports**:
- `AgentRuntime` - Main message loop, state management
- `ToolOrchestrator` - Concurrency-safe tool execution
- `ContextManager` - Prompt composition, auto-compaction
- `ModelProvider` interface + implementations (Anthropic/OpenAI/DeepSeek)
- All built-in tools (Read, Write, Edit, Bash, Grep, Glob, Task)
- `SessionStore` - SQLite persistence
- `PermissionEngine` - Auto-approve/ask/deny rules

**Dependencies**:
- `better-sqlite3` - Session storage
- `zod` - Schema validation
- `@modelcontextprotocol/sdk` - MCP client
- `pino` - Structured logging

#### Package: `@superagent/cli`

**Purpose**: Terminal REPL interface (existing code refactored)

**Dependencies**:
- `@superagent/core`
- `ink` - React TUI
- `commander` - CLI parsing

#### Package: `@superagent/web`

**Purpose**: Next.js Web UI

**Dependencies**:
- `@superagent/core`
- `next` 15 - Framework
- `react` + `react-dom`
- `zustand` - State management
- `socket.io` + `socket.io-client` - Real-time
- `shadcn/ui` components
- `tailwindcss`
- `react-syntax-highlighter`
- `react-diff-view`
- `anser` - ANSI escape code rendering

---

## 3. Constitution Check

### 3.1 Core Principles Compliance

| Principle | Status | Notes |
|---|---|---|
| **Model freedom** | ✅ Compliant | Core package uses ModelProvider interface, supports multiple providers |
| **MIT open source** | ✅ Compliant | All dependencies are MIT-compatible |
| **CLI-first** | ✅ Compliant | Web UI is secondary interface, CLI remains primary |
| **Local-first** | ✅ Compliant | All code/data local, Socket.io only listens on localhost |

### 3.2 Security Compliance

| Requirement | Status | Notes |
|---|---|---|
| **API keys never logged/exposed** | ✅ Compliant | Core package handles key security, web UI never exposes keys |
| **Dangerous commands intercepted** | ✅ Compliant | PermissionEngine in core, web UI displays approval prompts |
| **deny overrides auto-approve** | ✅ Compliant | Enforced in core PermissionEngine |

### 3.3 Quality Compliance

| Requirement | Status | Notes |
|---|---|---|
| **Spec → Plan → Tasks before code** | ✅ Compliant | Following the process |
| **Tests must pass** | ✅ Compliant | Will add Vitest tests for all packages |
| **TypeScript strict mode** | ✅ Compliant | Enabled across all packages |

---

## 4. Research Findings

### 4.1 Monorepo Structure with pnpm Workspaces

**Decision**: Use pnpm workspaces with isolated packages

**Rationale**:
- Clean separation between core, CLI, and web
- Shared dependencies hoisted to root
- TypeScript project references for fast incremental builds
- Standard industry practice (Vercel, Turborepo examples)

**Alternatives considered**:
- Turborepo - Overkill for MVP, can add later
- Nx - Too opinionated, heavyweight
- Single package - Not scalable, mixes concerns

### 4.2 Socket.io vs Server-Sent Events (SSE)

**Decision**: Socket.io bidirectional communication

**Rationale**:
- Need both directions: server sends streaming tokens, client sends user input/permissions
- Built-in reconnection, ack mechanism, rooms
- Handles binary data if needed
- Mature TypeScript support

**Alternatives considered**:
- SSE + REST POST - One-way only, more complex for full duplex
- WebSocket raw - Missing reconnection, heartbeats, ack

### 4.3 Zustand vs Redux vs Jotai

**Decision**: Zustand

**Rationale**:
- Minimal boilerplate, simple API
- DevTools support (Redux DevTools)
- No provider needed
- Matches state shape needed (conversation list, current message, tool calls)
- Claude Code uses similar simple pattern

**Alternatives considered**:
- Redux Toolkit - Too much boilerplate for this use case
- Jotai - Atomic model good but less familiar, ecosystem smaller
- React Context - Re-render performance issues with deep updates

### 4.4 Shadcn UI vs Radix UI Primitives Directly

**Decision**: Shadcn UI (copy-paste components built on Radix)

**Rationale**:
- Pre-built components that match the dark CLI aesthetic
- Customizable via Tailwind variants
- No npm dependency - code lives in project
- Industry standard for new React projects

---

## 5. Data Model

### 5.1 Core Entities

#### Session

```typescript
interface Session {
  id: string; // UUID
  title: string; // Auto-extracted from first message (first 50 chars)
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  status: 'active' | 'completed' | 'error';
}
```

#### Message

```typescript
type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  type: 'text' | 'tool_call' | 'tool_result' | 'error';
  metadata?: ToolCallMetadata | ToolResultMetadata;
  createdAt: Date;
  timestamp: number;
}
```

#### ToolCallMetadata

```typescript
interface ToolCallMetadata {
  toolName: string;
  toolId: string;
  input: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'error' | 'denied';
  startTime?: number;
  endTime?: number;
  durationMs?: number;
}
```

#### ToolResultMetadata

```typescript
interface ToolResultMetadata {
  toolName: string;
  toolId: string;
  resultType: 'text' | 'diff' | 'terminal' | 'file_list' | 'search';
  summary?: string;
  truncated?: boolean;
  originalLength?: number;
}
```

#### ConcurrentToolGrid

```typescript
interface ConcurrentToolGrid {
  grid: ToolCallMetadata[][]; // 2x2 max
  queued: ToolCallMetadata[]; // Tools waiting for slot
}
```

---

## 6. Contracts / Protocol Design

### 6.1 Socket.io Event Protocol

#### Client → Server Events

```typescript
// Client sends user message
interface ClientSendMessage {
  sessionId: string | null; // null = new session
  content: string;
}

// Client approves/denies tool execution
interface ClientPermissionResponse {
  toolId: string;
  decision: 'approve' | 'deny' | 'always';
  pattern?: string; // for 'always'
}

// Client requests session history
interface ClientGetSessions {}

// Client loads specific session
interface ClientLoadSession {
  sessionId: string;
}

// Client creates new session
interface ClientNewSession {}
```

#### Server → Client Events

```typescript
// Streaming token from model
interface ServerStreamToken {
  messageId: string;
  token: string;
  role: 'assistant';
  timestamp: number;
}

// Tool call started
interface ServerToolCallStart {
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  gridPosition: { row: number; col: number } | null; // null if queued
}

// Tool call progress update
interface ServerToolCallProgress {
  toolId: string;
  progress: number; // 0-100
  status: 'executing';
}

// Tool call completed
interface ServerToolCallComplete {
  toolId: string;
  resultType: 'text' | 'diff' | 'terminal' | 'file_list' | 'search';
  content: unknown;
  durationMs: number;
}

// Tool requires permission
interface ServerPermissionRequired {
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  dangerLevel: 'low' | 'medium' | 'high';
  reason: string;
}

// Message complete (end of stream)
interface ServerMessageComplete {
  messageId: string;
  role: 'assistant';
  content: string; // full content
  toolCalls: string[]; // tool IDs in this message
}

// Session list update
interface ServerSessionList {
  sessions: Session[];
}

// Session loaded
interface ServerSessionLoaded {
  sessionId: string;
  messages: Message[];
}

// Error
interface ServerError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### 6.2 HTTP Endpoints (Minimal - most via Socket.io)

```
GET  /api/health           # Health check
GET  /api/sessions         # List all sessions (JSON)
GET  /api/sessions/:id     # Get single session
POST /api/sessions         # Create new session
DELETE /api/sessions/:id   # Delete session
```

---

## 7. Implementation Phases & Tasks

### Phase M0: Infrastructure & Monorepo Setup (Week 1 - Days 1-2)

**Goal**: Get pnpm workspace structure working, extract core package

| Task | Description | Estimate | Dependencies |
|---|---|---|---|
| M0.1 | Setup pnpm workspaces, root package.json | 0.5d | - |
| M0.2 | Create packages/core/ structure | 0.5d | M0.1 |
| M0.3 | Extract runtime from src/ to packages/core/ | 1d | M0.2 |
| M0.4 | Extract tools from src/ to packages/core/ | 1d | M0.2 |
| M0.5 | Create packages/cli/ and port existing CLI code | 0.5d | M0.3, M0.4 |
| M0.6 | Setup TypeScript project references | 0.5d | M0.1 |
| M0.7 | Verify existing CLI still works after refactor | 0.5d | M0.5 |
| M0.8 | Vitest setup for all packages | 0.5d | M0.1 |

**Total for M0**: 5 person-days

### Phase M1: Backend Server & Socket.io (Week 1 - Days 3-5)

**Goal**: Node.js backend server running, Socket.io connected, runtime integrated

| Task | Description | Estimate | Dependencies |
|---|---|---|---|
| M1.1 | Create packages/web/ Next.js app structure | 0.5d | M0 complete |
| M1.2 | Setup Express HTTP server in web/server/ | 0.5d | M1.1 |
| M1.3 | Integrate Socket.io with Express server | 0.5d | M1.2 |
| M1.4 | Implement Socket protocol types (shared) | 0.5d | M1.3 |
| M1.5 | Runtime bridge: connect AgentRuntime to Socket | 1d | M0.3, M1.4 |
| M1.6 | Implement session HTTP endpoints | 0.5d | M1.2 |
| M1.7 | Streaming pipeline: model tokens → Socket events | 1d | M1.5 |
| M1.8 | Test: send message → get response via Socket | 0.5d | M1.7 |

**Total for M1**: 5 person-days

### Phase M2: Foundation UI Components (Week 2 - Days 1-3)

**Goal**: Basic chat UI working, message rendering, input box

| Task | Description | Estimate | Dependencies |
|---|---|---|---|
| M2.1 | Setup Shadcn UI + Tailwind in web package | 0.5d | M1 complete |
| M2.2 | Create Zustand store: conversation/messages state | 0.5d | M2.1 |
| M2.3 | Socket.io client hook: useSocket() | 0.5d | M2.2 |
| M2.4 | MessageList component (scrollable chat stream) | 1d | M2.3 |
| M2.5 | MessageBubble component (user/assistant) | 0.5d | M2.4 |
| M2.6 | InputBox component (multiline, Enter send) | 0.5d | M2.4 |
| M2.7 | Markdown rendering in messages | 0.5d | M2.5 |
| M2.8 | End-to-end: type message → see assistant response | 0.5d | M2.7 |

**Total for M2**: 5 person-days

### Phase M3: Tool Cards & Core Rendering (Week 2 - Days 4-5 + Week 3 - Day 1)

**Goal**: Tool calls render as cards in chat stream (F2, F3)

| Task | Description | Estimate | Dependencies |
|---|---|---|---|
| M3.1 | Generic ToolCard component framework | 0.5d | M2 complete |
| M3.2 | Read tool card (file path + syntax highlighted code) | 0.5d | M3.1 |
| M3.3 | Write/Edit tool card with diff display (F4) | 1d | M3.2 |
| M3.4 | Bash tool card with ANSI color terminal output | 1d | M3.2 |
| M3.5 | Grep/Glob tool cards (file list) | 0.5d | M3.2 |
| M3.6 | Task tool card (todo list) | 0.5d | M3.4 |
| M3.7 | Status indicators: executing spinner / success check / error red | 0.5d | All tool cards |

**Total for M3**: 4.5 person-days

### Phase M4: Parallel Tool Progress Grid (Week 3 - Days 2-3)

**Goal**: 2x2 grid showing concurrent tool execution (F5)

| Task | Description | Estimate | Dependencies |
|---|---|---|---|
| M4.1 | Grid state management in Zustand | 0.5d | M3 complete |
| M4.2 | Tool execution slot assignment logic | 0.5d | M4.1 |
| M4.3 | Grid UI component (2x2 responsive) | 1d | M4.2 |
| M4.4 | Queued tools display (waiting count) | 0.5d | M4.3 |
| M4.5 | Transition: grid card → result card on completion | 1d | M4.4 |

**Total for M4**: 3.5 person-days

### Phase M5: Session History & Sidebar (Week 3 - Days 4-5)

**Goal**: Left sidebar with session list, load history (F7)

| Task | Description | Estimate | Dependencies |
|---|---|---|---|
| M5.1 | Sidebar layout component (fixed width 280px) | 0.5d | M4 complete |
| M5.2 | Session list item component (title + time + preview) | 0.5d | M5.1 |
| M5.3 | Load session from SQLite via Socket endpoint | 1d | M5.2 |
| M5.4 | New session button + functionality | 0.5d | M5.3 |
| M5.5 | Right-click menu: rename/delete session | 0.5d | M5.4 |
| M5.6 | Session search box | 0.5d | M5.5 |
| M5.7 | Test: refresh browser → history persists | 0.5d | M5.6 |

**Total for M5**: 4 person-days

### Phase M6: Should Have Features (Week 4 - Days 1-3)

**Goal**: F9-F13 (code folding, copy buttons, token count, theme, shortcuts)

| Task | Description | Estimate | Dependencies |
|---|---|---|---|
| M6.1 | Code block folding (long code collapsed by default) | 1d | M5 complete |
| M6.2 | One-click copy button on all code blocks | 0.5d | M6.1 |
| M6.3 | Token counter + cost display in header | 1d | M6.2 |
| M6.4 | Dark/light theme toggle + system preference | 0.5d | M6.3 |
| M6.5 | Keyboard shortcuts (Ctrl+Enter send, Ctrl+N new session) | 1d | M6.4 |

**Total for M6**: 4 person-days

### Phase M7: Testing, Bug Fixes & Polish (Week 4 - Day 4 + Week 5)

**Goal**: All tests passing, performance targets met, production ready

| Task | Description | Estimate | Dependencies |
|---|---|---|---|
| M7.1 | Unit tests for core package (runtime + tools) | 2d | All phases |
| M7.2 | Component tests for web package | 1d | All phases |
| M7.3 | Socket.io integration tests | 1d | All phases |
| M7.4 | Performance optimization: virtual scroll for long messages | 1d | M7.2 |
| M7.5 | Error boundary + crash recovery | 0.5d | M7.2 |
| M7.6 | Auto-reconnect on WebSocket disconnect | 0.5d | M7.3 |
| M7.7 | Browser compatibility testing (Chrome/Firefox/Safari) | 0.5d | M7.5 |
| M7.8 | Documentation: README, quickstart guide | 0.5d | All |

**Total for M7**: 7 person-days

---

## 8. Summary & Milestones

| Milestone | End Date | Deliverables |
|---|---|---|
| **M0** | Week 1, Day 2 | Monorepo working, core package extracted, CLI verified |
| **M1** | Week 1, Day 5 | Backend server + Socket.io + runtime bridge working |
| **M2** | Week 2, Day 3 | Basic chat UI: type message → get streaming response |
| **M3** | Week 3, Day 1 | All tool cards rendering properly (Read/Write/Edit/Bash/etc.) |
| **M4** | Week 3, Day 3 | Parallel tool grid with 2x2 concurrency display |
| **M5** | Week 3, Day 5 | Session history sidebar, persistence across browser refresh |
| **M6** | Week 4, Day 3 | Should-have features complete |
| **M7** | Week 5, Day 5 | Full MVP tested, production-ready |

**Total Estimated Effort**: 34 person-days

---

## 9. Risks & Mitigation

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Core extraction breaks existing CLI | High | Medium | Full regression test suite before/after extraction; run all existing CLI tests |
| Socket.io message ordering / dropped messages | Medium | Medium | Add message sequence numbers + ack mechanism; queue while disconnected |
| Long chat list rendering performance | Medium | Medium | Implement virtual scrolling early (M7.4); cap visible message count |
| Type mismatches across Socket protocol | Medium | Low | Shared TypeScript types; Zod validation on both ends |
| State sync issues between server and client | Medium | Medium | Single source of truth on server; client is dumb renderer |
| npm install / pnpm workspace issues | Low | Low | Lock files checked in; verify on both Windows and Unix |

---

## 10. Next Steps

1. **Generate tasks.md**: Break down each phase into individual testable tasks
2. **Start Phase M0**: Begin monorepo setup and core extraction
3. **Run existing tests**: Verify CLI functionality continuously during refactoring
4. **Create shared types package**: Socket protocol types should be shared between web and core

---

> **Plan Version**: v1.0 | **Created**: 2026-06-18 | **Status**: Ready for implementation
