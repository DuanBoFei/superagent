# Feature Specification: Web Session History Sidebar

**Feature**: 032-web-session-history-sidebar
**Created**: 2026-06-19
**Status**: Draft
**Input**: 会话历史侧边栏：会话列表、搜索筛选、会话详情回放、导出导入、删除管理。

---

## 1. What & Why

### 1.1 What

本 Feature 实现一个可收起/展开的侧边栏，展示 Agent 的所有会话历史。用户可以浏览历史会话、搜索/筛选、回放会话的完整执行过程、导出/导入会话、删除不需要的会话，以及从任意历史点分支新会话。

核心能力：
- **可收起侧边栏**：右侧滑入滑出，固定/浮动两种模式，可拖拽调整宽度
- **会话列表**：按时间倒序，显示标题、第一条消息预览、时长、工具调用数量、状态标签（active/completed/error）
- **搜索与筛选**：全文搜索消息内容，按日期范围、标签、状态筛选
- **会话详情**：点击会话在主面板展示完整回放，支持逐步播放和跳转
- **导出导入**：导出单个/多个会话为 JSON，从文件导入会话
- **删除管理**：单个删除、批量删除、清除所有历史
- **会话分支**：从历史会话任意点 fork 新会话，继续执行
- **会话标签**：用户可给会话打自定义标签（如 "bugfix", "refactor"），用于筛选

### 1.2 Why

没有会话历史管理会导致：
1. 用户关闭浏览器/终端后，之前的工作完全丢失不可恢复
2. 无法回顾之前解决过的问题，重复工作浪费时间和 token
3. 无法对比同一问题的不同解决路径
4. 无法导出备份重要的调试过程，也无法导入分享给团队
5. 大量历史会话堆积，难以定位需要的那一个

会话历史侧边栏是 Agent 从"一次性工具"到"持久化工作平台"的关键转变。

### 1.3 Goals

- ✅ 侧边栏 UI：收起/展开，拖拽宽度，不影响主聊天区域操作
- ✅ 会话列表：按时间倒序，显示关键元数据和状态
- ✅ 搜索筛选：全文搜索 + 日期范围 + 标签 + 状态
- ✅ 会话回放：完整重现消息流、工具调用、输出、状态变化
- ✅ 导出导入：JSON 格式，单/批量导出，从文件导入
- ✅ 删除管理：单个/批量/清除所有，确认弹窗防误删
- ✅ 会话分支：从任意历史点 fork 新会话继续执行
- ✅ 会话标签：自定义打标 + 按标签筛选

### 1.4 Non-Goals

- ❌ 会话云同步 / 云端存储（MVP 仅本地 SQLite）
- ❌ 会话分享链接 / 公开访问
- ❌ 会话编辑 / 修改历史消息（只读回放）
- ❌ 会话合并 / 对比 diff
- ❌ 会话书签 / pin 重要消息
- ❌ 会话备注 / 注释
- ❌ 会话导出为 Markdown/PDF（仅 JSON）
- ❌ 会话统计仪表盘（时长分布、token 消耗分析等）
- ❌ 自动清理策略（N 天后自动删除）
- ❌ 会话归档（冷存储）

---

## 2. User Scenarios & Testing

### User Story 1 - 找回上次的工作（Priority: P0）

As a developer returning to work the next day, I want to see all my previous sessions in a sidebar and click to resume one, so I don't have to start over explaining the context and problem to the Agent.

**Why this priority**: 这是会话历史最核心的价值——跨会话保持工作连续性。

**Independent Test**: 关闭 Agent 再打开 → 侧边栏显示昨日会话 → 点击正确加载。

**Acceptance Scenarios**:

1. **Given** 用户昨天有 3 个会话，**When** 今天打开 Agent，**Then** 侧边栏默认显示会话列表，3 个会话按时间倒序排列（最新的在最上）。
2. **Given** 会话列表项，**When** 查看，**Then** 显示会话标题（AI 自动生成或用户修改）、第一条消息预览、时长、工具调用数量、状态徽章。
3. **Given** 用户点击一个历史会话，**When** 加载，**Then** 主面板显示该会话完整内容，当前 active 会话自动暂存。
4. **Given** 正在查看历史会话，**When** 用户发送新消息，**Then** 自动创建 fork 的新会话，不修改原历史。

### User Story 2 - 搜索找到特定会话（Priority: P0）

As a developer remembering I solved a similar problem last month but don't remember exactly when, I want to search across all my session history by keyword, so I can quickly find that previous solution.

**Why this priority**: 会话数量一旦超过 20 个，搜索就是必须品。

**Independent Test**: 搜索 "webpack config" → 匹配的会话高亮显示。

**Acceptance Scenarios**:

1. **Given** 100+ 历史会话，**When** 用户在搜索框输入关键词，**Then** 列表实时过滤显示匹配的会话。
2. **Given** 搜索结果，**When** 查看，**Then** 匹配的消息片段高亮显示在预览中。
3. **Given** 高级筛选，**When** 用户选择日期范围（上周/本月/自定义），**Then** 列表仅显示该范围内的会话。
4. **Given** 用户选择状态筛选 "Error"，**When** 应用，**Then** 仅显示以错误告终的会话。

### User Story 3 - 回放会话执行过程（Priority: P1）

As a developer wanting to understand how the Agent arrived at a solution, I want to step through the session replay and see each message/tool call in order, so I can learn the reasoning process.

**Why this priority**: 回放是"可解释性"的关键——理解 Agent 如何解决问题对学习很重要。

**Independent Test**: 点击 Play → 会话逐步重现，每个工具调用正确显示。

**Acceptance Scenarios**:

1. **Given** 一个已完成的会话，**When** 用户点击 "Play" 按钮，**Then** 会话从第一条消息开始逐步回放，工具调用、输出依次出现。
2. **Given** 回放中，**When** 用户点击某个时间点，**Then** 直接跳转到该状态。
3. **Given** 进行中的回放，**When** 用户点击 "Pause"，**Then** 暂停在当前位置。
4. **Given** 回放速度控制，**When** 选择 2x / 4x 速，**Then** 回放加速。
5. **Given** "Show All" 模式，**When** 点击，**Then** 立即显示完整会话不逐步播放。

### User Story 4 - 导出备份与导入分享（Priority: P1）

As a developer who just solved a complex bug, I want to export the session to a file so I can back it up or share it with a teammate who has the same problem.

**Why this priority**: 知识留存和团队协作的基础。

**Independent Test**: 导出会话 → 重新打开 Agent → 导入 → 完整还原。

**Acceptance Scenarios**:

1. **Given** 选中一个会话，**When** 点击 Export，**Then** 下载 JSON 文件，文件名包含会话标题和日期。
2. **Given** 多选 3 个会话，**When** 点击 Export Selected，**Then** 下载包含所有 3 个会话的 ZIP 或合并 JSON。
3. **Given** 导出的 JSON 文件，**When** 拖入侧边栏或通过 Import 按钮选择，**Then** 会话被导入，出现在列表顶部（导入日期），原创建日期保留在元数据中。
4. **Given** 导入时 ID 冲突，**When** 处理，**Then** 自动生成新 ID（不覆盖现有会话）。

### User Story 5 - 清理不需要的会话（Priority: P2）

As a developer with 100+ sessions including many one-off tests and mistakes, I want to delete old and useless sessions to keep my history clean and searchable.

**Why this priority**: 随着使用时间增长，清理是必要的。

**Acceptance Scenarios**:

1. **Given** 用户 hover 某个会话，**When** 出现删除图标，点击后显示确认弹窗，**Then** 确认后会话从列表移除，数据库删除。
2. **Given** 多选模式，**When** 用户勾选多个会话后点击 Delete Selected，**Then** 批量删除。
3. **Given** "Clear All History" 按钮，**When** 点击后双重确认（输入 DELETE 防止误触），**Then** 所有会话被清除。
4. **Given** 刚删除的会话，**When** 5 秒内，**Then** 显示 Undo 按钮可恢复。

### User Story 6 - 从历史点分支继续（Priority: P2）

As a developer seeing that the Agent took a wrong path 3 turns ago, I want to fork a new session from before that mistake and try a different approach without losing the original path.

**Why this priority**: 类似 Git 的分支工作流，允许多路径探索不丢失历史。

**Acceptance Scenarios**:

1. **Given** 正在查看历史会话的第 N 条消息，**When** 用户点击 "Fork from here"，**Then** 创建新会话，包含到第 N 条为止的所有内容。
2. **Given** forked 的会话，**When** 查看，**Then** 显示 "Forked from [原会话名]" 的引用。
3. **Given** 用户在 fork 的会话中发送新消息，**When** 执行，**Then** 原会话不受任何影响。
4. **Given** 会话列表，**When** 查看，**Then** fork 的会话有 fork 图标标记，可点击跳转到原会话。

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-SIDE-01 | Sidebar SHALL support collapsible/expandable state: slide in/out from right. |
| FR-SIDE-02 | Sidebar width SHALL be draggable adjustable: min 280px, max 600px, default 360px. |
| FR-SIDE-03 | Sidebar SHALL support two modes: docked (pushes main content) and overlay (floats over main). |
| FR-SIDE-04 | Session list SHALL be sorted in reverse chronological order (newest first) by default. |
| FR-SIDE-05 | Each list item SHALL display: title, first message preview, duration, tool call count, status badge (active/completed/error). |
| FR-SIDE-06 | Active session SHALL be visually highlighted in the list. |
| FR-SIDE-07 | Search SHALL support full-text search across all message content. |
| FR-SIDE-08 | Search SHALL highlight matching text snippets in preview. |
| FR-SIDE-09 | Filtering SHALL support: date range (presets + custom), status (active/completed/error), user tags. |
| FR-SIDE-10 | Search + filters SHALL combine with AND logic. |
| FR-SIDE-11 | Clicking a session SHALL load its full content into the main panel. |
| FR-SIDE-12 | Session playback SHALL support: Play, Pause, Jump to position, Speed control (1x/2x/4x), Show All. |
| FR-SIDE-13 | Playback SHALL correctly reproduce: messages, tool calls, outputs, state changes. |
| FR-SIDE-14 | Export SHALL support: single session, multiple selected sessions, all sessions. |
| FR-SIDE-15 | Export format SHALL be JSON with full schema including all messages and metadata. |
| FR-SIDE-16 | Import SHALL accept: single session JSON, multi-session JSON, drag-and-drop file. |
| FR-SIDE-17 | Import ID collisions SHALL be resolved by generating new IDs (no overwrite). |
| FR-SIDE-18 | Delete SHALL support: single delete, bulk delete, clear all. |
| FR-SIDE-19 | Delete SHALL require confirmation dialog: single = Yes/Cancel, clear all = type "DELETE" to confirm. |
| FR-SIDE-20 | Recent delete SHALL support Undo for 5 seconds. |
| FR-SIDE-21 | Session forking SHALL create a new session containing all messages up to the selected point. |
| FR-SIDE-22 | Forked sessions SHALL have a visual indicator and link back to the parent. |
| FR-SIDE-23 | User tags SHALL be addable/removable per session: type to add tag, click X to remove. |
| FR-SIDE-24 | Tags SHALL be clickable filters: click a tag → filter list to show only sessions with that tag. |
| FR-SIDE-25 | Title editing SHALL be supported: click title to rename, auto-save on blur. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-SIDE-01 | Sidebar toggle (open/close) animation SHALL complete in < 150ms. |
| NFR-SIDE-02 | Session list with 100 items SHALL render in < 200ms. |
| NFR-SIDE-03 | Search across 100 sessions SHALL return results in < 100ms. |
| NFR-SIDE-04 | Loading a session (100 messages) into main panel SHALL complete in < 500ms. |
| NFR-SIDE-05 | Playback SHALL maintain smooth animation: ≥ 30fps. |
| NFR-SIDE-06 | Export 10 sessions (100 messages each) SHALL complete in < 1s. |
| NFR-SIDE-07 | Import 10 sessions SHALL complete in < 1s. |
| NFR-SIDE-08 | Database operations (insert/update/delete) SHALL never block the UI thread. |
| NFR-SIDE-09 | All interactive elements SHALL be keyboard accessible. |
| NFR-SIDE-10 | Sidebar state (open/closed, width, filter) SHALL persist across restarts. |

### 3.3 Key Entities

#### SessionSummary（列表项）

- **sessionId**: `string`（唯一标识）
- **title**: `string`（AI 生成或用户编辑）
- **firstMessagePreview**: `string`（第一条消息，最多 80 字符）
- **createdAt**: `number`（创建时间戳）
- **updatedAt**: `number`（最后更新时间戳）
- **durationMs**: `number`（总时长）
- **toolCallCount**: `number`（工具调用总数）
- **status**: `'active' | 'completed' | 'error'`
- **tags**: `string[]`（用户标签）
- **forkedFrom**: `string | null`（父会话 ID）
- **messageCount**: `number`（消息总数）

#### Session（完整回放数据）

- **sessionId**: `string`
- **title**: `string`
- **createdAt**: `number`
- **updatedAt**: `number`
- **messages**: `Message[]`（完整消息数组）
- **toolCalls**: `ToolCallRecord[]`（工具调用记录）
- **tags**: `string[]`
- **forkedFrom**: `string | null`
- **forkedAtMessageIndex**: `number | null`（fork 的消息索引）

#### SearchQuery

- **text**: `string`（搜索关键词）
- **dateRange**: `{ start: number, end: number } | null`
- **statusFilter**: `('active' | 'completed' | 'error')[] | null`
- **tagsFilter**: `string[] | null`

#### ExportFormat

- **version**: `1`（schema 版本）
- **exportedAt**: `number`
- **sessions**: `Session[]`

#### PlaybackState

- **isPlaying**: `boolean`
- **currentMessageIndex**: `number`
- **playbackSpeed**: `1 | 2 | 4`
- **isPaused**: `boolean`

---

## 4. Success Criteria

### 4.1 Quantitative

1. **Toggle Speed**: Sidebar open/close < 150ms.
2. **List Render**: 100 sessions render in < 200ms.
3. **Search Speed**: Search across 100 sessions in < 100ms.
4. **Session Load**: 100 message session loads in < 500ms.
5. **Playback FPS**: ≥ 30fps smooth animation.
6. **Export Speed**: 10 sessions exported in < 1s.
7. **Import Speed**: 10 sessions imported in < 1s.
8. **Keyboard Accessibility**: 100% of interactive elements reachable via keyboard.

### 4.2 Qualitative

1. **Visual Consistency**: Sidebar styling matches the overall dark theme design system.
2. **Animation Smoothness**: All transitions (toggle, drag, playback) are smooth and jank-free.
3. **Predictable State**: User always knows which session is active and what is being viewed.
4. **Undo Safety**: Deletions are reversible within 5 seconds, preventing accidental data loss.
5. **Fork Intuitiveness**: Branching workflow is intuitive to users familiar with Git concepts.
6. **Data Integrity**: Export → Import roundtrip produces identical session content.
7. **Responsive**: Sidebar works on all screen sizes; on mobile (< 768px) it always overlays.

---

## 5. Out of Scope

The following features are explicitly NOT included:

- Cloud sync / remote storage (MVP: local SQLite only)
- Session sharing links / public web access
- Session editing / modifying historical messages (read-only playback)
- Session diff / side-by-side comparison
- Bookmarks / pinning specific messages within a session
- Session notes / user comments
- Export to Markdown / PDF (JSON only)
- Session analytics dashboard (time spent, token usage distribution, etc.)
- Auto-cleanup policies (auto-delete after N days)
- Session archiving / cold storage
- Team / multi-user session sharing
- Session encryption at rest (MVP: plain SQLite, OS-level security assumed)

---

## 6. Dependencies

### 6.1 Upstream Dependencies

| Dependency | Feature | Purpose |
|------------|---------|---------|
| SQLite Persistence | 009-session-persistence | Session database schema and CRUD operations |
| Zustand Store | 026-web-message-input | Sidebar state management (open/closed, width, filters) |
| Message Renderer | 027-web-chat-stream | Replay uses the same message rendering components |
| Tool Card Renderer | 028-web-tool-cards | Replay uses the same tool card rendering |
| Virtual Scroll Hook | 026-web-message-input | For 100+ session list performance |

### 6.2 Database Schema Extensions (to 009)

```sql
-- 现有 sessions 表扩展
ALTER TABLE sessions ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE sessions ADD COLUMN duration_ms INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN tool_call_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN message_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN forked_from TEXT REFERENCES sessions(id);
ALTER TABLE sessions ADD COLUMN forked_at_message_index INTEGER;

-- 新增 tags 联结表
CREATE TABLE session_tags (
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, tag)
);

-- 搜索优化索引
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at DESC);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_title ON sessions(title);
CREATE INDEX idx_session_tags_tag ON session_tags(tag);

-- FTS 全文搜索虚拟表
CREATE VIRTUAL TABLE sessions_fts USING fts5(
  title,
  messages_content,  -- 所有消息内容的去规范化副本
  content='sessions',
  content_rowid='id'
);
```

### 6.3 Downstream Dependencies

| Feature | Depends On | Purpose |
|---------|-----------|---------|
| (None yet) | This feature | - |

---

## 7. Assumptions

1. **SQLite FTS5 Available**: Assume SQLite was compiled with FTS5 enabled (standard in most builds and Bun).
2. **Background DB Operations**: All DB operations use async Web Worker or never block the main JS thread.
3. **Max Session Count Reasonable**: Assume < 1000 sessions for most users; virtual scroll handles > 100.
4. **No Data Migration Needed**: MVP starts with new schema, no migration from pre-existing unstructured session data.
5. **Dark Theme Only**: MVP assumes dark theme. Light theme support deferred.
6. **Playback is Read-Only**: Users cannot interact with tools during playback; it's for viewing only.
7. **Imported Sessions Get New IDs**: No ID conflicts, import always creates new sessions with new UUIDs.
8. **No Encryption**: MVP does not encrypt session data at rest. Relies on OS-level file system security.

---

## 8. Clarifications

### Session 2026-06-19

[NO CLARIFICATIONS NEEDED YET - This section will be populated during the clarify phase.]
