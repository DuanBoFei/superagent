# Feature Specification: Web App Shell — Next.js Migration

**Feature**: 033-web-app-shell
**Created**: 2026-06-20
**Status**: Draft
**Input**: 将现有 HTML 字符串组件体系迁移到 web-plan 规定的 Next.js 15 + React + Shadcn UI + Tailwind CSS 技术栈。

---

## 1. What & Why

### 1.1 What

废弃当前 `packages/web/src/` 下所有 HTML 字符串 Controller 模式组件，按 `specs/web-plan.md` 原始技术方案重建为：

- pnpm workspaces monorepo（`@superagent/core` + `@superagent/cli` + `@superagent/web`）
- Next.js 15 App Router + React + Shadcn UI + Tailwind CSS
- Socket.io-client 连接后端 Runtime 服务器（localhost:3457）
- Zustand 状态管理
- react-syntax-highlighter / react-diff-view / anser 渲染

### 1.2 Why

当前实现偏离 web-plan 架构，采用无框架的 HTML 字符串 SSR 模式。虽然组件逻辑完整（492 tests），但与 Next.js + React 生态不兼容，无法利用 Shadcn UI、Tailwind、SSR 等 web-plan 设计的能力。

### 1.3 Goals

- 浏览器访问 `localhost:3456` 看到完整 Web UI
- 发送消息 → Agent 流式回复端到端通
- 侧边栏（032）功能在 React 中完整复现
- 所有现有测试（492 个）逐模块迁移到 React 测试

### 1.4 Non-Goals

- 不改变后端 Runtime 服务器架构（继续用 `src/server/` port 3457）
- 不新增功能——纯迁移，功能与现有 HTML 组件 1:1 对齐
- 不影响 CLI 功能

---

## 2. Architecture

### 2.1 Monorepo Structure

```
superAgent/
├── packages/
│   ├── core/                    # 共享 runtime（从 src/ 抽离）
│   │   ├── runtime/
│   │   ├── tools/
│   │   ├── models/
│   │   ├── persistence/
│   │   └── permissions/
│   ├── cli/                     # CLI 入口（复用 core）
│   └── web/                     # Next.js Web UI
│       ├── app/
│       │   ├── layout.tsx       # 根布局：Sidebar + Chat
│       │   ├── page.tsx         # 主页
│       │   └── globals.css      # Tailwind + DESIGN.md tokens
│       ├── components/
│       │   ├── chat/            # ChatPage, MessageList, InputBox, etc.
│       │   ├── sidebar/         # SessionHistorySidebar, SessionList, etc.
│       │   ├── tool-grid/       # ToolGrid, ToolCard, etc.
│       │   ├── diff/            # DiffUnifiedView, DiffSplitView, etc.
│       │   └── terminal/        # TerminalRenderer
│       ├── store/               # Zustand stores
│       ├── hooks/               # React hooks (useSocket, useTerminalBuffer, etc.)
│       ├── lib/                 # Shared utilities
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── next.config.ts
│       └── tsconfig.json
├── src/                         # 保持不动，cli + backend 继续用
│   ├── server/                  # HTTP + Socket.io (port 3457)
│   └── ...
└── package.json                 # pnpm workspaces root
```

### 2.2 Technology Stack

All decisions from `specs/web-plan.md` §2.2:

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI Library | Shadcn UI + Tailwind CSS |
| Fonts | Inter (UI) + JetBrains Mono (code) — per DESIGN.md |
| State | Zustand |
| Real-time | Socket.io + socket.io-client |
| Syntax Highlighting | react-syntax-highlighter |
| Diff Rendering | react-diff-view |
| ANSI Rendering | anser |
| Markdown | marked + DOMPurify |
| Validation | TypeScript 5.x strict + Zod |
| Testing | Vitest + @testing-library/react |

### 2.3 Data Flow

```
Browser (localhost:3456)              Backend (localhost:3457)
────────────────────────              ─────────────────────

Next.js SSR (首屏 HTML)
     │
React App (hydration 后)
     │
     │──── Socket.io connect ────→  HTTP + Socket.io Server
     │                                    │
     │←─── stream tokens ───────────  Agent Runtime
     │                                    │
     │─── send_message ────────────→  Tool Orchestrator
     │                                    │
     │←─── tool_event ──────────────  ┌─ Read/Grep/Glob (并发)
     │                                    └─ Write/Edit/Bash (串行)
     │
     │─── get_sessions ────────────→  SQLite
     │←─── session_list ────────────
     │
Zustand Store (前端状态)
```

### 2.4 Socket.io Event Protocol

Reuse existing `src/server/socket-handlers.ts` definitions:

| Direction | Event | Purpose |
|-----------|-------|---------|
| client → server | `send_message` | Send user message, trigger Agent inference |
| server → client | `token` | Streaming text token |
| server → client | `tool_event` | Tool call status change |
| server → client | `complete` | Current turn finished + stats |
| client → server | `cancel` | Abort current Agent inference |
| client → server | `get_sessions` | Request session list |
| server → client | `session_list` | Return session list |

---

## 3. Implementation Phases

### Phase 1 — Next.js Skeleton

**Goal**: `localhost:3456` opens in browser, Socket.io connected.

```
packages/web/
├── package.json          ← next, react, react-dom, tailwindcss, shadcn/ui, socket.io-client, zustand
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── app/
    ├── layout.tsx        ← <html><body> + Sidebar placeholder + {children}
    ├── page.tsx           ← ChatPage placeholder
    └── globals.css        ← @tailwind directives + DESIGN.md design tokens
```

**Deliverables**:
- `pnpm dev:web` starts Next.js on port 3456
- Browser shows a blank page with dark background and sidebar placeholder
- Socket.io-client connects to `ws://localhost:3457`

### Phase 2 — Core Chat Components

**Goal**: Send message in browser, see Agent streaming reply.

```
components/chat/
├── ChatPage.tsx          ← Main chat page layout
├── MessageList.tsx       ← Virtual scrolling message list
├── MessageBubble.tsx     ← Single message (user right, agent left)
├── InputBox.tsx          ← Multi-line input + send button
└── MarkdownRenderer.tsx  ← marked + react-syntax-highlighter

store/chat.ts             ← Zustand chat store
hooks/useSocket.ts        ← Socket.io connection + event bindings
```

**Deliverables**:
- End-to-end: type message → see agent streaming reply
- Markdown rendering with syntax-highlighted code blocks
- Ctrl+Enter send, Shift+Enter newline

### Phase 3 — Feature Modules

Migrate each existing feature to React, in dependency order:

| Order | Feature | Source | Target |
|-------|---------|--------|--------|
| 3.1 | Sidebar (032) | `packages/web/src/components/sidebar/` | `components/sidebar/` |
| 3.2 | Diff (029) | `packages/web/src/components/chat/diff/` | `components/diff/` |
| 3.3 | Tool Grid (031) | `packages/web/src/components/chat/tool-grid/` | `components/tool-grid/` |
| 3.4 | Terminal (027) | `packages/web/src/components/chat/terminal/` | `components/terminal/` |
| 3.5 | Tool Cards (028) | `packages/web/src/components/chat/cards/` | `components/cards/` |

Each module: migrate render + controller → React components → rewrite tests → integrate into ChatPage.

---

## 4. Testing Strategy

- Each migrated component gets a `@testing-library/react` test replacing the old HTML string assertion test
- Old tests deleted only after new test passes
- Phase 1-2: focus on integration (socket mock + render + user input)
- Phase 3: per-module unit + integration tests
- Visual regression: Playwright snapshots after each phase

---

## 5. Risks

| Risk | Mitigation |
|------|-----------|
| Core extraction breaks CLI | Run full CLI test suite after each extraction step |
| Socket.io event protocol mismatch | Reuse existing definitions, no protocol changes |
| Tailwind + Shadcn UI conflicts with DESIGN.md | Map DESIGN.md tokens to Tailwind config (already partially done in `packages/web/src/styles/`) |
| Migration scope creep | Strict 1:1 feature parity, no new features |

---

## 6. Out of Scope

- Adding new features or UX enhancements (pure migration)
- Electron / desktop app
- Changing backend Runtime architecture
- Modifying CLI functionality

---

> **Version**: v1.0 | **Created**: 2026-06-20 | **Status**: Draft
