# SuperAgent Web UI · Implementation Tasks

Generated from: specs/web-plan.md
Total Tasks: 40 tasks across 7 phases

---

## Phase M0: Infrastructure & Monorepo Setup (5 tasks)

### T001: Setup pnpm workspaces and root package.json

- **Goal**: Root-level package.json with pnpm workspace configuration
- **Files to modify/create**:
  - `package.json` (root): Add `workspaces` array, update `scripts`
  - `pnpm-workspace.yaml`: Define workspace packages
- **Verification**: Run `pnpm install` at root. Verify no errors.
- **Dependencies**: None
- **Estimate**: 0.5d

### T002: Create packages/core/ directory structure

- **Goal**: Empty package structure for core runtime
- **Files to create**:
  - `packages/core/package.json` with name `@superagent/core`
  - `packages/core/tsconfig.json` (strict mode)
  - `packages/core/src/index.ts` (empty barrel file)
  - `packages/core/vitest.config.ts`
- **Verification**: Run `tsc --noEmit` in core package. No TypeScript errors.
- **Dependencies**: T001
- **Estimate**: 0.5d

### T003: Extract Agent runtime to core package

- **Goal**: Move `src/runtime/` to `packages/core/src/runtime/`
- **Files to move/refactor**:
  - `src/runtime/*` → `packages/core/src/runtime/`
  - Update all import paths to be relative within core
  - Add barrel exports from `packages/core/src/index.ts`
- **Verification**: TypeScript builds cleanly. Run existing runtime unit tests.
- **Dependencies**: T002
- **Estimate**: 1d

### T004: Extract tools and model providers to core package

- **Goal**: Move tools/ and models/ to core package
- **Files to move/refactor**:
  - `src/tools/*` → `packages/core/src/tools/`
  - `src/models/*` → `packages/core/src/models/`
  - `src/persistence/*` → `packages/core/src/persistence/`
  - `src/config/*` → `packages/core/src/config/`
  - Update all cross-module imports
- **Verification**: TypeScript builds cleanly. All tool unit tests pass.
- **Dependencies**: T003
- **Estimate**: 1d

### T005: Create packages/cli/ and port existing CLI code

- **Goal**: Move CLI code from src/cli/ to packages/cli/
- **Files to create/modify**:
  - `packages/cli/package.json` with name `@superagent/cli`, depends on `@superagent/core`
  - `packages/cli/tsconfig.json`
  - `packages/cli/src/` - port repl.ts, input.ts, render.ts
  - Update `bin/superagent.js` to point to new entry point
- **Verification**: Run `superagent` from project root. REPL starts, can send message. All existing CLI tests pass.
- **Dependencies**: T003, T004
- **Estimate**: 0.5d

---

## Phase M1: Backend Server & Socket.io (8 tasks)

### T006: Create Next.js app structure in packages/web/

- **Goal**: Empty Next.js 15 App Router project
- **Files to create**:
  - `packages/web/package.json` (Next.js 15, React 19)
  - `packages/web/tsconfig.json`
  - `packages/web/next.config.ts`
  - `packages/web/app/` directory structure
  - `packages/web/tailwind.config.ts`
  - `packages/web/postcss.config.js`
- **Verification**: Run `pnpm dev` in web package. Browser loads default Next.js page.
- **Dependencies**: T005 complete
- **Estimate**: 0.5d

### T007: Setup Express HTTP server in web/server/

- **Goal**: Standalone Express server running on port 3456
- **Files to create**:
  - `packages/web/src/server/index.ts` - Express app creation
  - `packages/web/src/server/routes/health.ts` - GET /api/health
- **Verification**: Run server, curl `http://localhost:3456/api/health` returns 200 OK.
- **Dependencies**: T006
- **Estimate**: 0.5d

### T008: Integrate Socket.io with Express server

- **Goal**: Socket.io server attached to Express HTTP server
- **Files to create/modify**:
  - `packages/web/src/server/socket.ts` - Socket.io initialization
  - Update `packages/web/src/server/index.ts` to attach Socket.io
- **Verification**: Write test script that connects to socket and receives ack.
- **Dependencies**: T007
- **Estimate**: 0.5d

### T009: Define shared Socket protocol TypeScript types

- **Goal**: Type definitions for all Socket events
- **Files to create**:
  - `packages/core/src/protocol/socket.ts` - All event interfaces
  - Export protocol types from core package index
- **Verification**: TypeScript builds. No any types.
- **Dependencies**: T008
- **Estimate**: 0.5d

### T010: Create Runtime bridge connecting AgentRuntime to Socket

- **Goal**: Adapter layer that connects AgentRuntime event stream to Socket events
- **Files to create**:
  - `packages/web/src/server/runtime-bridge.ts` - Bridge class
  - Map AgentRuntime events to Socket.emit calls
  - Handle tool permission flow through Socket
- **Verification**: Instantiate bridge, send test message. Socket events fire in correct order.
- **Dependencies**: T003 (runtime in core), T009 (protocol types)
- **Estimate**: 1d

### T011: Implement session HTTP endpoints

- **Goal**: REST endpoints for session CRUD
- **Files to create**:
  - `packages/web/src/server/routes/sessions.ts`
    - GET /api/sessions - list
    - GET /api/sessions/:id - get single
    - POST /api/sessions - create new
    - DELETE /api/sessions/:id - delete
- **Verification**: curl all endpoints. SQLite persistence works.
- **Dependencies**: T007
- **Estimate**: 0.5d

### T012: Implement streaming pipeline: model tokens → Socket events

- **Goal**: Model tokens stream through AgentRuntime → Bridge → Socket → Client
- **Files to modify**:
  - `packages/web/src/server/runtime-bridge.ts` - Add token streaming handler
  - Handle text delta events and emit `stream_token` socket event
  - Handle message complete event
- **Verification**: Integration test: send message, verify tokens arrive incrementally.
- **Dependencies**: T010
- **Estimate**: 1d

### T013: End-to-end message test through Socket

- **Goal**: Full flow: client sends message via socket → model responds via streaming
- **Files to create**:
  - `tests/e2e/socket-message.test.ts`
- **Verification**: Test passes. Tokens arrive incrementally. Message complete event fires at end.
- **Dependencies**: T012
- **Estimate**: 0.5d

---

## Phase M2: Foundation UI Components (8 tasks)

### T014: Setup Shadcn UI and Tailwind CSS

- **Goal**: Shadcn UI CLI initialized, core components installed
- **Files created/modified**:
  - `packages/web/components.json` - Shadcn config
  - `packages/web/src/components/ui/` - Button, Input, Card, ScrollArea
  - `packages/web/src/app/globals.css` - Tailwind directives + CSS variables
- **Verification**: Render a Button component on test page. Styles apply correctly.
- **Dependencies**: T006
- **Estimate**: 0.5d

### T015: Create Zustand store for conversation state

- **Goal**: Global state management for messages and conversation
- **Files to create**:
  - `packages/web/src/store/chat.ts` - Zustand store
  - State shape: messages array, currentSessionId, isLoading
  - Actions: addMessage, updateMessage, setSession, clearChat
- **Verification**: Unit test store actions. Verify state updates immutably.
- **Dependencies**: T014
- **Estimate**: 0.5d

### T016: Create useSocket() React hook

- **Goal**: React hook wrapping Socket.io client connection
- **Files to create**:
  - `packages/web/src/hooks/use-socket.ts`
  - Handle connection, disconnection, reconnection
  - Expose emit function and event listeners
- **Verification**: Component using hook connects on mount, disconnects on unmount.
- **Dependencies**: T015
- **Estimate**: 0.5d

### T017: Create MessageList scrollable component

- **Goal**: Virtual scroll container for chat messages
- **Files to create**:
  - `packages/web/src/components/chat/message-list.tsx`
  - Auto-scroll to bottom on new message
  - Scroll padding for input box
- **Verification**: Add 100 test messages. Scrolls smoothly, auto-scroll works.
- **Dependencies**: T016
- **Estimate**: 1d

### T018: Create MessageBubble component (user/assistant)

- **Goal**: Styled message bubbles with different alignment
- **Files to create**:
  - `packages/web/src/components/chat/message-bubble.tsx`
  - User: right-aligned, dark background
  - Assistant: left-aligned, light background
- **Verification**: Render both types. Alignment and styling correct.
- **Dependencies**: T017
- **Estimate**: 0.5d

### T019: Create InputBox component (multiline)

- **Goal**: Chat input at bottom of screen
- **Files to create**:
  - `packages/web/src/components/chat/input-box.tsx`
  - Enter to send, Shift+Enter for new line
  - Auto-grow height up to max
  - Disable while waiting for response
- **Verification**: Type text, press Enter - sends message. Press Shift+Enter - new line.
- **Dependencies**: T017
- **Estimate**: 0.5d

### T020: Add Markdown rendering to assistant messages

- **Goal**: Markdown rendering in message bubbles
- **Files to modify/create**:
  - `packages/web/src/components/chat/markdown-renderer.tsx`
  - Use react-markdown or marked + DOMPurify
  - Support code blocks, lists, bold, italic
- **Verification**: Render test markdown. Code blocks, lists, formatting all work.
- **Dependencies**: T018
- **Estimate**: 0.5d

### T021: End-to-end chat flow test in browser

- **Goal**: Full manual test: type message → see streaming response
- **Files to create**:
  - Manual test script in docs/
- **Verification**: Open browser, type "hello", see assistant respond with streaming tokens.
- **Dependencies**: T020
- **Estimate**: 0.5d

---

## Phase M3: Tool Cards & Core Rendering (7 tasks)

### T022: Create generic ToolCard component framework

- **Goal**: Base card component showing tool name, status, duration
- **Files to create**:
  - `packages/web/src/components/tools/tool-card.tsx`
  - Status states: pending → executing → success/error/denied
  - Spinner for executing state
  - Checkmark/X icon for completed/failed
- **Verification**: Render each state. Visual transition smooth.
- **Dependencies**: T021 complete
- **Estimate**: 0.5d

### T023: Read tool card implementation

- **Goal**: Display Read tool results with syntax highlighting
- **Files to create**:
  - `packages/web/src/components/tools/read-tool-card.tsx`
  - File path header
  - Syntax highlighted code block (react-syntax-highlighter)
  - Line numbers
  - Collapse button for long files
- **Verification**: Render TypeScript file. Syntax highlighting works. Lines numbered.
- **Dependencies**: T022
- **Estimate**: 0.5d

### T024: Write/Edit tool card with diff display

- **Goal**: Show diff for file modifications with green/red highlighting
- **Files to create**:
  - `packages/web/src/components/tools/edit-tool-card.tsx`
  - Use react-diff-view for unified diff display
  - File path + change count header
  - Copy diff button
- **Verification**: Render test diff. Added lines green, removed lines red.
- **Dependencies**: T023
- **Estimate**: 1d

### T025: Bash tool card with ANSI terminal output

- **Goal**: Show colored terminal output from Bash commands
- **Files to create**:
  - `packages/web/src/components/tools/bash-tool-card.tsx`
  - Use anser to convert ANSI escape codes to HTML
  - Monospace font
  - Exit code indicator (green/red)
  - Collapse for long output
- **Verification**: Run `npm test` output. Colors render correctly. Exit code shown.
- **Dependencies**: T024
- **Estimate**: 1d

### T026: Grep and Glob tool cards (file list display)

- **Goal**: Show search results and file listings
- **Files to create**:
  - `packages/web/src/components/tools/grep-tool-card.tsx`
  - `packages/web/src/components/tools/glob-tool-card.tsx`
  - File list with match counts
  - Click to expand match context lines
- **Verification**: Render grep results. Match highlighting works. Expand shows lines.
- **Dependencies**: T025
- **Estimate**: 0.5d

### T027: Task tool card (todo list)

- **Goal**: Show task todo list with progress
- **Files to create**:
  - `packages/web/src/components/tools/task-tool-card.tsx`
  - Checkbox items with pending/completed states
  - Progress bar showing completion percentage
- **Verification**: Render test tasks. Checkbox state updates correctly. Progress bar reflects count.
- **Dependencies**: T026
- **Estimate**: 0.5d

### T028: Socket event → tool card integration

- **Goal**: Socket tool events render correct card type
- **Files to modify**:
  - `packages/web/src/components/chat/message-list.tsx` - Add tool card rendering
  - `packages/web/src/store/chat.ts` - Add tool call state
- **Verification**: Send message that triggers Read tool. Read card appears with content.
- **Dependencies**: All tool cards (T023-T027)
- **Estimate**: 0.5d

---

## Phase M4: Parallel Tool Progress Grid (5 tasks)

### T029: Implement grid state management in Zustand

- **Goal**: Track 2x2 grid slots and queue
- **Files to modify**:
  - `packages/web/src/store/chat.ts` - Add grid state
  - Active slots: 2D array (4 max)
  - Queued tools array
  - Actions: assignSlot, completeTool, dequeueTool
- **Verification**: Unit test state transitions. Tools correctly queue when grid full.
- **Dependencies**: T028 complete
- **Estimate**: 0.5d

### T030: Tool execution slot assignment logic

- **Goal**: Algorithm to assign incoming tools to grid slots
- **Files to create**:
  - `packages/web/src/lib/grid-assign.ts` - Slot assignment logic
  - Find first empty slot
  - Queue if all 4 slots filled
  - On completion, fill slot with queued tool
- **Verification**: 5 concurrent tools. 4 in grid, 1 queued. One completes → queued moves to slot.
- **Dependencies**: T029
- **Estimate**: 0.5d

### T031: Create Grid UI component (2x2 responsive layout)

- **Goal**: Visual grid displaying up to 4 concurrent tools
- **Files to create**:
  - `packages/web/src/components/tools/tool-grid.tsx`
  - CSS Grid layout with 2 columns
  - Each slot shows mini tool card while executing
  - Empty slots show placeholder
- **Verification**: Render grid with 2 tools. Layout is 2x2. Responsive on narrow width.
- **Dependencies**: T030
- **Estimate**: 1d

### T032: Queued tools display with waiting count

- **Goal**: Show count of tools waiting for grid slots
- **Files to modify**:
  - `packages/web/src/components/tools/tool-grid.tsx` - Add queue indicator
  - Badge showing "N waiting"
  - Expandable list showing queued tool names
- **Verification**: 5 tools running. Badge shows "1 waiting". Expand shows tool name.
- **Dependencies**: T031
- **Estimate**: 0.5d

### T033: Transition: grid mini-card → full result card on completion

- **Goal**: When tool completes, grid slot is freed and full result card appears in chat
- **Files to modify**:
  - `packages/web/src/store/chat.ts` - Handle tool completion
  - `packages/web/src/components/tools/tool-grid.tsx` - Clear slot on completion
  - `packages/web/src/components/chat/message-list.tsx` - Add full result card
- **Verification**: Tool starts in grid, completes, grid slot empties, full result appears in chat.
- **Dependencies**: T032
- **Estimate**: 1d

---

## Phase M5: Session History & Sidebar (7 tasks)

### T034: Create Sidebar layout component (fixed width)

- **Goal**: Left sidebar at 280px with main chat area to the right
- **Files to create**:
  - `packages/web/src/components/layout/sidebar.tsx`
  - `packages/web/src/components/layout/chat-layout.tsx`
  - CSS flex layout
- **Verification**: Page renders with sidebar on left, chat on right. Sidebar stays fixed on scroll.
- **Dependencies**: T033 complete
- **Estimate**: 0.5d

### T035: Create SessionListItem component

- **Goal**: Individual session item in sidebar list
- **Files to create**:
  - `packages/web/src/components/session/session-list-item.tsx`
  - Auto-extracted title (first 50 chars of first message)
  - Relative time (5m ago, yesterday)
  - Status dot: green = active, gray = completed
  - Preview snippet of latest message
- **Verification**: Render test session. Title truncated correctly, time displays.
- **Dependencies**: T034
- **Estimate**: 0.5d

### T036: Implement load session from SQLite via Socket

- **Goal**: Socket endpoint for loading session history
- **Files to modify**:
  - `packages/web/src/server/socket.ts` - Add `load_session` handler
  - `packages/web/src/store/chat.ts` - Add hydrateFromSession action
- **Verification**: Save session, refresh browser, click session. Chat loads correctly.
- **Dependencies**: T035
- **Estimate**: 1d

### T037: New session button and functionality

- **Goal**: Button to start fresh conversation
- **Files to create/modify**:
  - `packages/web/src/components/session/new-session-button.tsx`
  - Socket `new_session` event handler
  - Clear chat store, reset to empty state
- **Verification**: Click button. Chat empties, new session created in DB.
- **Dependencies**: T036
- **Estimate**: 0.5d

### T038: Right-click context menu: rename/delete

- **Goal**: Context menu for session operations
- **Files to create**:
  - `packages/web/src/components/session/session-context-menu.tsx`
  - Rename: prompt for new title
  - Delete: confirmation dialog
- **Verification**: Right-click session. Rename updates title. Delete removes session from list.
- **Dependencies**: T037
- **Estimate**: 0.5d

### T039: Session search box

- **Goal**: Filter session list by search term
- **Files to create**:
  - `packages/web/src/components/session/session-search.tsx`
  - Filter sessions by title content
  - Debounced search input
- **Verification**: Type in search box. List filters to matching sessions only.
- **Dependencies**: T038
- **Estimate**: 0.5d

### T040: Session persistence test across browser refresh

- **Goal**: Full integration test for history
- **Verification**:
  1. Create session with multiple messages and tool calls
  2. Refresh browser
  3. Session appears in sidebar list
  4. Click session, full history loads correctly
  5. Continue conversation, new messages appended correctly
- **Dependencies**: T039
- **Estimate**: 0.5d

---

## Phase M6: Should Have Features (5 tasks)

### T041: Code block folding

- **Goal**: Long code blocks collapsed by default, click to expand
- **Files to modify**:
  - `packages/web/src/components/chat/markdown-renderer.tsx`
  - >50 lines: collapsed, show "Show X more lines"
  - Expand/collapse button
- **Verification**: Render 100 line code block. Collapsed by default. Click expands.
- **Dependencies**: T040 complete
- **Estimate**: 1d

### T042: One-click copy button on all code blocks

- **Goal**: Copy icon in top-right of code blocks
- **Files to modify**:
  - `packages/web/src/components/chat/code-block.tsx`
  - Hover shows copy button
  - Click copies to clipboard, shows checkmark
- **Verification**: Hover code block. Copy button appears. Click, paste verifies content.
- **Dependencies**: T041
- **Estimate**: 0.5d

### T043: Real-time token counter + cost display

- **Goal**: Header shows current session token usage and cost
- **Files to create/modify**:
  - `packages/web/src/components/layout/header.tsx`
  - `packages/web/src/store/cost.ts` - Cost tracking store
  - Update cost on each `stream_token` event
  - Model price lookup table
- **Verification**: Send message. Token count and cost increment in real-time.
- **Dependencies**: T042
- **Estimate**: 1d

### T044: Dark/light theme toggle

- **Goal**: Toggle between themes, respect system preference
- **Files to create**:
  - `packages/web/src/components/layout/theme-toggle.tsx`
  - `packages/web/src/lib/theme-provider.tsx`
  - CSS variables for both themes
  - Persist preference in localStorage
- **Verification**: Toggle theme. Colors change. Refresh browser, theme preference persists.
- **Dependencies**: T043
- **Estimate**: 0.5d

### T045: Keyboard shortcuts

- **Goal**: Keyboard navigation
- **Files to create**:
  - `packages/web/src/hooks/use-keyboard-shortcuts.ts`
  - Ctrl+Enter: Send message (when input focused)
  - Ctrl+N: New session
  - Ctrl+S: Search sessions (focus search input)
- **Verification**: Press Ctrl+N. New session created. Press Ctrl+Enter. Message sends.
- **Dependencies**: T044
- **Estimate**: 1d

---

## Phase M7: Testing, Bug Fixes & Polish (8 tasks)

### T046: Core package unit test coverage

- **Goal**: ≥80% coverage on runtime, tools, permission engine
- **Files to create**:
  - `packages/core/test/runtime/*.test.ts`
  - `packages/core/test/tools/*.test.ts`
  - `packages/core/test/permission/*.test.ts`
- **Verification**: `pnpm test` in core package. Coverage report shows ≥80%.
- **Dependencies**: All phases complete
- **Estimate**: 1d

### T047: Web component tests using React Testing Library

- **Goal**: Test key UI components
- **Files to create**:
  - `packages/web/src/components/chat/*.test.tsx`
  - `packages/web/src/components/tools/*.test.tsx`
  - `packages/web/src/components/session/*.test.tsx`
- **Verification**: All component tests pass.
- **Dependencies**: All phases complete
- **Estimate**: 1d

### T048: Socket.io integration tests

- **Goal**: Test full socket protocol flow
- **Files to create**:
  - `tests/e2e/socket-protocol.test.ts`
  - Test message flow, tool call flow, permission flow
- **Verification**: All integration tests pass.
- **Dependencies**: All phases complete
- **Estimate**: 1d

### T049: Implement virtual scroll for long message list

- **Goal**: Smooth performance with 1000+ messages
- **Files to modify**:
  - `packages/web/src/components/chat/message-list.tsx`
  - Implement virtualization using @tanstack/react-virtual
- **Verification**: 1000 messages. Scroll remains 60fps. No layout shift.
- **Dependencies**: T047 complete
- **Estimate**: 1d

### T050: Add React Error Boundary + crash recovery

- **Goal**: Graceful handling of rendering errors
- **Files to create**:
  - `packages/web/src/components/error-boundary.tsx`
  - Friendly error message + "Recover session" button
  - Recovery reloads session from SQLite
- **Verification**: Throw test error in component. Error boundary catches. Click recover, session restores.
- **Dependencies**: T049
- **Estimate**: 0.5d

### T051: Implement WebSocket auto-reconnect with backoff

- **Goal**: Connection resilience
- **Files to modify**:
  - `packages/web/src/hooks/use-socket.ts`
  - Exponential backoff retry
  - Reconnect indicator in UI
  - Queue messages while offline, flush on reconnect
- **Verification**: Kill server. UI shows offline. Restart server. Auto-reconnects, messages send.
- **Dependencies**: T050
- **Estimate**: 0.5d

### T052: Browser compatibility testing (Chrome/Firefox/Safari)

- **Goal**: Works on all 3 major browsers
- **Verification checklist**:
  - Chrome: chat works, tool cards render, diff shows, terminal colors work
  - Firefox: same test
  - Safari: same test
  - All tests pass on all 3 browsers
- **Files modified**: Bug fixes as needed
- **Dependencies**: T051
- **Estimate**: 0.5d

### T053: Write documentation: README and quickstart guide

- **Goal**: User documentation
- **Files to create**:
  - `packages/web/README.md` - Development setup
  - `docs/WEB-QUICKSTART.md` - User guide
  - Update root README with Web UI instructions
- **Verification**: Follow instructions from scratch. Works end-to-end.
- **Dependencies**: All
- **Estimate**: 0.5d

---

## Summary

| Phase | Tasks | Person-Days |
|---|---|---|
| M0: Infrastructure | 5 | 3.5 |
| M1: Backend Server | 8 | 5 |
| M2: Foundation UI | 8 | 5 |
| M3: Tool Cards | 7 | 4.5 |
| M4: Parallel Grid | 5 | 3.5 |
| M5: Session History | 7 | 4 |
| M6: Should Have | 5 | 4 |
| M7: Testing & Polish | 8 | 6 |
| **Total** | **53 tasks** | **35.5 days** |

---

> **Tasks Version**: v1.0 | **Generated**: 2026-06-18 | **Based on**: specs/web-plan.md v1.0
