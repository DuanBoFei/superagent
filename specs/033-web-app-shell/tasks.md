# Tasks: Web App Shell — Next.js Migration

**Feature**: 033-web-app-shell
**Based on**: spec.md + plan.md
**Total tasks**: 17

---

## Group A — Monorepo Foundation (parallel)

### T001 [FE] · Initialize pnpm workspace + @superagent/web package

- [ ] Create `pnpm-workspace.yaml` with `packages/web`, `packages/core` members
- [ ] Create `packages/web/package.json` — Next.js 15, React 19, Tailwind, Shadcn UI, Socket.io-client, Zustand
- [ ] Create `packages/web/tsconfig.json` — strict mode, path aliases
- [ ] Create `packages/core/package.json` — placeholder only, no runtime code in 033
- [ ] Add `dev:web`, `build:web` scripts to root `package.json`
- [ ] Run `pnpm install` and verify no lockfile conflicts

**FR source**: spec.md §3 Phase 1, plan.md §1
**Depends on**: —
**Target**: `pnpm install` succeeds, `packages/web/package.json` has all deps

### T002 [FE] · Configure Tailwind CSS + Shadcn UI + DESIGN.md tokens

- [ ] Create `tailwind.config.ts` — DESIGN.md colors (`#0a0a0a`, `#1f1f23`, `#10b981`, zinc scale, Inter + JetBrains Mono fonts)
- [ ] Create `app/globals.css` — `@tailwind` directives + DESIGN.md CSS custom properties
- [ ] Initialize Shadcn UI with `components.json` (zinc theme, 4px radius per DESIGN.md)
- [ ] Install baseline Shadcn components: button, card, input, scroll-area, separator
- [ ] Verify `pnpm dev:web` starts Next.js without CSS errors

**FR source**: DESIGN.md (colors, typography, shapes), web-plan.md §2.2
**Depends on**: T001
**Target**: Tailwind builds without errors, dark theme renders

### T003 [FE] · Create Next.js config + root layout skeleton

- [ ] Create `next.config.ts` — output standalone, port 3456, strict mode
- [ ] Create `app/layout.tsx` — `<html lang="en">` + `<body>` + Inter font + dark background (`#0a0a0a`) + metadata
- [ ] Create `app/page.tsx` — placeholder: `<main>` with "SuperAgent Web" heading
- [ ] Verify `http://localhost:3456` renders a dark page with correct fonts

**FR source**: spec.md §3 Phase 1, DESIGN.md backgrounds
**Depends on**: T002
**Target**: Browser at localhost:3456 shows dark layout with Inter font loaded

---

## Group B — App Shell Connectivity (sequential)

### T004 [FE] · Socket.io hook + connection status

- [ ] Create `packages/web/src/types/message.ts` — `Message`, `TokenEvent`, `ToolEvent`, `TurnComplete` types
- [ ] Create `packages/web/src/hooks/useSocket.ts` — Socket.io-client connection to `ws://localhost:3457`, auto-reconnect, connection status
- [ ] Socket events: `token`, `tool_event`, `complete`, `session_list`
- [ ] Client emits: `send_message`, `cancel`, `get_sessions`
- [ ] Wire connection status into `app/page.tsx` — show "Connected" / "Disconnected" indicator
- [ ] Verify: start backend on 3457, refresh page, see "Connected"

**FR source**: spec.md §2.4 Socket.io Event Protocol, plan.md §2 Data Flow
**Depends on**: T003
**Target**: WebSocket connection established, status indicator toggles correctly

### T005 [FE] · Root layout with sidebar placeholder + chat area

- [ ] Refactor `app/layout.tsx` — two-panel layout: sidebar (280px) + main content (flex-1)
- [ ] Sidebar placeholder: dark panel (`#0d0d0d`) with "Sessions" heading + 1px border-right (`#1f1f23`)
- [ ] Main area: ChatPage component slot via `{children}`
- [ ] Responsive: sidebar collapses below 768px (toggle button), full sidebar ≥ 1024px
- [ ] One Playwright visual snapshot test for the layout

**FR source**: DESIGN.md Layout & Spacing, web-prd.md §8.1 layout
**Depends on**: T004
**Target**: Two-panel layout renders; visual snapshot matches

---

## Group C — Core Chat Components (sequential)

### T006 [FE] · Zustand chat store

- [ ] Create `packages/web/src/store/chat.ts` — Zustand store with:
  - `messages: Message[]`
  - `input: string`
  - `connectionStatus: 'connected' | 'disconnected' | 'connecting'`
  - `isStreaming: boolean`
  - Actions: `addMessage`, `appendToken`, `setInput`, `clearInput`, `setConnectionStatus`, `reset`
- [ ] Unit tests: store actions, derived state, message ordering
- [ ] Task list: `TaskCreate` creates 8 subtasks (4 store methods + 4 tests)

**FR source**: plan.md §1 File Responsibilities (store/chat.ts), web-plan.md §2.2 Zustand
**Depends on**: T004 (types defined)
**Target**: All store tests pass

### T007 [FE] · ChatPage + MessageList components

- [ ] Create `components/chat/ChatPage.tsx` — flex column: MessageList (flex-1, overflow-y-auto) + InputBox (fixed bottom)
- [ ] Create `components/chat/MessageList.tsx` — map messages, auto-scroll to bottom on new message / streaming
- [ ] Create `components/chat/MessageBubble.tsx` — user (right, `#18181b` bg) / agent (left, `#0d0d0d` bg), Inter 14px, 8px padding, 4px radius per DESIGN.md
- [ ] Unit tests: message rendering, auto-scroll behavior, empty state
- [ ] Task list: `TaskCreate` 5 subtasks

**FR source**: DESIGN.md Components (Cards/Panels, Typography), web-prd.md F2
**Depends on**: T006, T009
**Target**: Messages render in bubble layout; auto-scroll works

### T008 [FE] · InputBox component

- [ ] Create `components/chat/InputBox.tsx` — textarea + send button, fixed at bottom
- [ ] Enter to send, Shift+Enter for newline
- [ ] Auto-resize up to 30vh, then scroll
- [ ] Send button: Emerald (`#10b981`) per DESIGN.md Buttons/Primary
- [ ] Disable input while streaming; placeholder "Ask SuperAgent..."
- [ ] Unit tests: send on Enter, newline on Shift+Enter, disabled during streaming, empty submit blocked
- [ ] Task list: `TaskCreate` 6 subtasks

**FR source**: web-prd.md F8, DESIGN.md Inputs/Buttons
**Depends on**: T006
**Target**: Text input sends messages, keyboard shortcuts work, tests pass

### T009 [FE] · MarkdownRenderer component

- [ ] Create `components/chat/MarkdownRenderer.tsx` — marked + DOMPurify for HTML rendering
- [ ] Integrate `react-syntax-highlighter` with JetBrains Mono, Night Owl theme
- [ ] Copy button per code block (top-right, appears on hover)
- [ ] Long code blocks (>50 lines) default collapsed with "Show all" toggle
- [ ] Unit tests: markdown rendering, code highlight, XSS sanitization, collapse/expand
- [ ] Task list: `TaskCreate` 6 subtasks

**FR source**: web-plan.md §2.2 (marked + DOMPurify), DESIGN.md Typography, web-prd.md F2
**Depends on**: T006
**Target**: Markdown renders correctly; code blocks syntax-highlighted; copy works

### T010 [FE] · End-to-end: send message → streaming reply

- [x] Wire InputBox send → `useSocket` emit `client_message` → store `appendToken` on `stream_token` events
- [x] Wire streaming tokens into MessageBubble (typing animation while `isStreaming`)
- [x] Handle `message_complete` event → finalize message, show turn stats
- [x] Handle connection errors — show "Reconnecting..." banner, disable input
- [x] Integration test: mock Socket.io server, simulate token stream, verify message appears
- [ ] Manual smoke test: real backend on 3457, type message, see Agent reply

**FR source**: spec.md §3 Phase 2 deliverable, plan.md §2 Data Flow
**Depends on**: T008, T009
**Target**: End-to-end message flow works; integration test passes

---

## Group D — Feature Module Migration (parallel after C)

### T011 [FE] · Migrate Sidebar (032) to React

- [ ] Create `components/sidebar/SessionHistorySidebar.tsx` — React rewrite of existing HTML string sidebar
- [ ] Migrate sub-components: SessionList, SessionListItem, SessionSearchFilter, TagManager, SessionDetailPanel
- [ ] Migrate playback: PlaybackControls, PlaybackTimeline
- [ ] Migrate actions: SessionExportImport, SessionFork, TitleEdit, DeleteUndo
- [ ] Zustand slice: `store/session-history.ts` (rewrite from `session-history.slice.ts`)
- [ ] React Testing Library tests — rewrite all 492 sidebar tests
- [ ] Delete old `packages/web/src/components/sidebar/*.ts` only after new tests pass

**FR source**: spec.md §3 Phase 3, specs/032-web-session-history-sidebar/
**Depends on**: T010 (socket + store patterns established)
**Target**: All sidebar functionality works in React; old tests deleted only after new pass

### T012 [FE] · Migrate Diff (029) to React

- [ ] Create `components/diff/DiffViewer.tsx` — unified diff with green/red lines, line numbers
- [ ] Use `diff` + `react-diff-view` per web-plan §2.2
- [ ] Copy diff button, collapse large diffs (>200 lines)
- [ ] React Testing Library tests — rewrite existing diff tests
- [ ] Delete old `packages/web/src/components/chat/diff/*.ts`

**FR source**: spec.md §3 Phase 3.2, web-prd.md F4
**Depends on**: T010
**Target**: Diff renders inline in chat; old tests migrated

### T013 [FE] · Migrate Tool Grid (031) to React

- [ ] Create `components/tool-grid/ToolGrid.tsx` — 2x2 parallel tool cards
- [ ] Each card: tool icon + name + status (pending/in_progress/done/error) + elapsed
- [ ] Cards transition from progress → result on completion
- [ ] Queue display for >4 tools: "Waiting (#5, #6...)"
- [ ] React Testing Library tests — rewrite existing tool-grid tests
- [ ] Delete old `packages/web/src/components/chat/tool-grid/*.ts`

**FR source**: spec.md §3 Phase 3.3, web-prd.md F5
**Depends on**: T010
**Target**: Parallel tools display in 2x2 grid; old tests migrated

### T014 [FE] · Migrate Terminal (027) to React

- [ ] Create `components/terminal/TerminalRenderer.tsx` — ANSI color via `anser`, JetBrains Mono, `#050505` bg
- [ ] Collapse/expand: ≤50 lines open, >200 lines collapsed, failure auto-expand + red border
- [ ] Exit code badge (green 0 / red non-zero)
- [ ] React Testing Library tests — rewrite existing terminal tests
- [ ] Delete old `packages/web/src/components/chat/terminal/*.ts`

**FR source**: spec.md §3 Phase 3.4, web-prd.md F6, DESIGN.md Terminal Output
**Depends on**: T010
**Target**: ANSI terminal output renders correctly; old tests migrated

### T015 [FE] · Migrate Tool Cards (028) to React

- [ ] Create `components/cards/ToolCard.tsx` — generic card: icon + name + status + elapsed + content slot
- [ ] Create per-tool cards: ReadCard, WriteCard, EditCard, BashCard, GrepCard, GlobCard, TaskCard, WebSearchCard
- [ ] Each card reuses: DiffViewer (Write/Edit), TerminalRenderer (Bash), MarkdownRenderer (Read/generic)
- [ ] React Testing Library tests — rewrite existing tool-card tests
- [ ] Delete old `packages/web/src/components/chat/cards/*.ts`

**FR source**: spec.md §3 Phase 3.5, web-prd.md F3
**Depends on**: T010, T012 (DiffViewer), T014 (TerminalRenderer)
**Target**: All 8 tool cards render correctly; old tests migrated

---

## Group E — Integration & Cleanup (sequential)

### T016 [INT] · Integration tests + visual regression

- [ ] Write 5 integration tests: full send→stream→complete, tool call→card render, sidebar session load, parallel tools grid, terminal ANSI output
- [ ] Playwright visual snapshots: app shell layout, message bubbles, tool card grid, diff view, terminal output, sidebar open/closed
- [ ] Update `playwright.config.ts` if needed for Next.js dev server
- [ ] Task list: `TaskCreate` 4 subtasks (integration folder, 5 tests, visual snapshots, config)

**FR source**: plan.md §4 Phase 5, spec.md §4 Testing Strategy
**Depends on**: T011-T015
**Target**: 5 integration tests pass; visual snapshots match

### T017 [FE] · Cleanup: remove old HTML string components

- [ ] Delete `packages/web/src/components/` — all old HTML string files (sidebar/, chat/, diff/, tool-grid/, terminal/, cards/)
- [ ] Delete `packages/web/src/store/` — old Zustand slices (session-history.slice.ts, selectors/)
- [ ] Delete `packages/web/src/hooks/` — old hooks (useSessionPlayback.ts, etc.)
- [ ] Verify `pnpm test` — all tests still pass (only new React tests remain)
- [ ] Run `pnpm typecheck` — zero errors
- [ ] Remove old web tests from `tests/web/` that tested HTML string components
- [ ] Task list: `TaskCreate` 5 subtasks

**FR source**: plan.md §1 (old packages/web/src/ to be removed), spec.md §1.1
**Depends on**: T016
**Target**: Zero HTML string files remain; full test suite passes; typecheck clean

---

## Dependency Graph

```
A: T001 → T002 → T003          (Monorepo + Next.js skeleton)
                              ↓
B:                           T004 → T005  (Socket.io + layout shell)
                              ↓
                            T006 (Zustand store)
                           /      \
C:                  T009(MD)   T008(Input)
                       \       /
                      T007(ChatPage)
                           ↓
                        T010 (E2E wire)
                              ↓
D:     ┌── T011 (sidebar/032) ──┐
       ├── T012 (diff/029) ─────┤
T010 → ├── T013 (tool-grid/031) ─┤ (parallel)
       ├── T014 (terminal/027) ─┤
       └── T015 (tool-cards/028)┘
                              ↓
E:                           T016 → T017  (integration + cleanup)
```

## Parallel Execution Notes

- **Group A**: T001 + T002 can partially overlap (package.json + tailwind config)
- **Group C**: After T006, T008 (InputBox) and T009 (MarkdownRenderer) can run in parallel. T007 (ChatPage) starts after T006 + T009 are done
- **Group D**: T011-T015 are fully parallel — each is an independent module migration
- **T011 risk**: Rewriting 492 sidebar tests is the largest single task (~2-3x others). If too large, split into T011a (core sidebar) + T011b (playback/actions) after Group C
- **Within each task**: write tests first (TDD), then implementation, then delete old code

---

> **Version**: v1.0 | **Created**: 2026-06-20 | **Status**: Draft
