# Feature Specification: Web Parallel Tool Grid

**Feature**: 031-web-parallel-tool-grid
**Created**: 2026-06-19
**Status**: Draft
**Input**: 并发工具执行的网格布局展示：多工具同时运行时的卡片网格、进度状态、错误聚合、资源使用条形图。

---

## 1. What & Why

### 1.1 What

本 Feature 实现 Agent Runtime 中多个工具并发执行时的可视化网格布局。当 Read/Glob/Grep 等只读工具并发运行时，每个工具以独立卡片形式在网格中展示实时状态、进度条、输出预览和资源消耗指标。

核心能力：
- **响应式网格布局**：1-2 个工具 → 单列；3-4 个 → 双列；5+ → 三列，窗口 resize 时自动重排
- **状态卡片**：每个工具独立卡片展示：pending（排队中）→ running（执行中）→ success/failed（完成）
- **实时进度**：进度条 + 百分比 + 已运行时间计时
- **输出预览**：running 状态下流式输出末尾 N 行预览，可展开查看完整输出
- **错误聚合**：所有失败工具的错误摘要统一展示区域，一键跳转到对应卡片
- **资源指标**：每个工具的执行时长 / 内存占用 / 输出大小的条形图对比
- **批量操作**：全部取消 / 全部展开 / 全部折叠 / 清空已完成
- **排序筛选**：按状态/时长/名称排序，筛选特定状态的工具

### 1.2 Why

当前的工具调用展示是线性的"一个接一个"的时间线视图，但 026 实现的并发工具调度允许多个只读工具同时执行。线性视图无法直观反映：

1. 哪些工具在真正并行执行（时间重叠）
2. 每个工具的相对进度和完成度
3. 执行缓慢的瓶颈工具
4. 多个工具同时出错时的快速诊断
5. 资源消耗分布（哪个工具输出最大 / 耗时最长）

网格视图让用户一眼掌握整体执行状况，并行执行的透明度大幅提升，问题定位从"逐个翻找"变为"一眼识别"。

### 1.3 Goals

- ✅ 响应式网格布局，自动适应工具数量和窗口宽度
- ✅ 实时状态更新：pending → running → success/failed 状态流转可视化
- ✅ 流式输出预览：running 状态下实时显示输出末尾
- ✅ 进度条 + 计时器：每个工具的进度百分比和已运行时间
- ✅ 错误聚合面板：所有失败工具的摘要列表，快速跳转
- ✅ 资源对比条形图：时长/内存/输出大小的横向对比
- ✅ 批量操作：全部取消/展开/折叠/清空
- ✅ 排序和筛选：按多种维度排序，按状态筛选

### 1.4 Non-Goals

- ❌ 工具重执行 / 重试控制（由 Agent Runtime 处理，UI 仅展示）
- ❌ 工具执行顺序调整（由调度器决定，UI 不干预）
- ❌ 工具参数编辑 / 自定义工具
- ❌ 工具执行历史记录（由会话持久化处理）
- ❌ 跨会话工具对比
- ❌ 复杂图表（甘特图/火焰图等 MVP 外）
- ❌ 工具依赖关系可视化（DAG 展示）

---

## 2. User Scenarios & Testing

### User Story 1 - 代码库批量搜索（Priority: P0）

As a developer asking the Agent to "search for all uses of useContext and useState across the codebase", I want to see multiple Grep tools running in parallel in a grid layout, so I can watch progress of each search and spot slow or failing searches immediately.

**Why this priority**: 并发搜索是最常见的多工具场景，网格视图的核心价值体现。

**Independent Test**: Agent 发起 3 个并行 Grep 搜索 → 3 列网格展示，状态流转正确。

**Acceptance Scenarios**:

1. **Given** Agent 启动 3 个并发 Grep 工具，**When** 展示，**Then** 3 列网格布局，每个工具独立卡片。
2. **Given** 工具正在执行，**When** 输出流式到达，**Then** 卡片中进度条实时更新，输出末尾 N 行预览流式刷新。
3. **Given** 某个工具完成，**When** 状态变为 success，**Then** 卡片边框变绿，显示 ✓ 标记，计时器停止。
4. **Given** 某个工具失败，**When** 状态变为 failed，**Then** 卡片边框变红，显示错误图标，错误信息出现在聚合面板。

### User Story 2 - 批量文件读取分析（Priority: P0）

As a developer asking the Agent to "read all component files in src/components/ and analyze their props", I want to see many Read tools in a grid with resource usage bars, so I can identify which files are largest and which are taking longest to process.

**Why this priority**: 大量并发读取是常见场景，资源对比视图帮助理解性能瓶颈。

**Independent Test**: 10 个并发 Read 工具 → 网格正确分页，资源条形图按长度排序。

**Acceptance Scenarios**:

1. **Given** 10 个并发 Read 工具，**When** 网格展示，**Then** 3 列布局，自动分页或虚拟滚动。
2. **Given** 所有工具完成，**When** 查看资源对比，**Then** 条形图正确显示每个文件的读取时长和大小，最大的文件条形最长。
3. **Given** 用户点击"按时长排序"，**When** 排序应用，**Then** 耗时最长的工具排在最前。
4. **Given** 用户点击"清空已完成"，**When** 操作执行，**Then** 所有 success 状态的卡片移除，仅保留 running/pending。

### User Story 3 - 错误诊断与聚合（Priority: P1）

As a developer watching the Agent run multiple tools, I want all errors to appear in a single aggregated panel at the top, so I don't have to scan the entire grid to find what went wrong.

**Why this priority**: 错误是用户最关心的信息，聚合展示可节省大量诊断时间。

**Independent Test**: 2 个成功 + 1 个失败工具 → 错误聚合面板显示失败摘要。

**Acceptance Scenarios**:

1. **Given** 1 个工具失败，其他成功，**When** 展示，**Then** 顶部错误聚合面板显示 "1 error"，点击跳转到对应失败卡片。
2. **Given** 3 个工具失败，**When** 展示，**Then** 聚合面板列出所有 3 个错误，每项可点击跳转。
3. **Given** 用户点击错误聚合中的某一项，**When** 跳转，**Then** 对应卡片自动展开、高亮、滚动到可视区域。
4. **Given** 用户展开失败卡片，**When** 查看详情，**Then** 完整错误信息和 stack trace 可复制。

### User Story 4 - 批量操作与控制（Priority: P1）

As a developer, I want to cancel all running tools, expand/collapse all cards, or clear completed ones in one click, so I don't have to perform the same action on each card individually.

**Why this priority**: 工具数量多时，逐个操作效率极低，批量操作是必须的。

**Independent Test**: 5 个 running 工具 → 点击"全部取消" → 全部变为 cancelled。

**Acceptance Scenarios**:

1. **Given** 多个 running 工具，**When** 用户点击"全部取消"，**Then** 所有工具收到取消信号，状态变为 cancelled。
2. **Given** 多个折叠的卡片，**When** 用户点击"全部展开"，**Then** 所有卡片展开显示完整输出。
3. **Given** 多个展开的卡片，**When** 用户点击"全部折叠"，**Then** 所有卡片折叠为仅显示标题和状态。
4. **Given** 混合状态（success + running + pending），**When** 点击"清空已完成"，**Then** 仅 success 卡片被移除，running/pending 保留。

### User Story 5 - 排序筛选与视图切换（Priority: P2）

As a developer watching many tools execute, I want to sort the grid by status/duration/name and filter by specific states, so I can focus on what matters most in the moment.

**Why this priority**: 工具数量多时，排序筛选显著提升信息获取效率。

**Acceptance Scenarios**:

1. **Given** 混合状态的工具，**When** 用户选择"仅显示失败"，**Then** 网格中仅保留 failed 状态卡片。
2. **Given** 多个工具不同时长，**When** 选择"按时长降序"，**Then** 耗时最长的排在最前。
3. **Given** 用户切换"列表视图"，**When** 切换，**Then** 从网格变为紧凑单列列表（适合大量工具时垂直滚动）。
4. **Given** 窗口宽度 < 600px，**When** resize，**Then** 自动降级为单列列表视图。

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-GRID-01 | Tool grid SHALL support responsive layout: 1 column for 1-2 tools, 2 columns for 3-4 tools, 3 columns for 5+ tools. |
| FR-GRID-02 | Each tool SHALL be rendered as an independent card with: tool name, parameters, status badge, progress bar, timer, and output preview. |
| FR-GRID-03 | Status SHALL support four states: pending (queued), running (executing), success, failed, cancelled. |
| FR-GRID-04 | Progress bar SHALL display 0-100% completion, with indeterminate state for tools without progress information. |
| FR-GRID-05 | Timer SHALL display elapsed time in MM:SS format, updating in real-time for running tools. |
| FR-GRID-06 | Output preview SHALL display the last N lines (default 5) of streaming output for running tools. |
| FR-GRID-07 | Each card SHALL support expand/collapse: collapsed shows preview only, expanded shows full output. |
| FR-GRID-08 | Error aggregation panel SHALL appear at the top when any tool is in failed state. |
| FR-GRID-09 | Error panel SHALL list all failed tools with error summaries, each item clickable to jump to the corresponding card. |
| FR-GRID-10 | Resource comparison bar chart SHALL display for completed tools: duration, output size, and (where available) memory usage. |
| FR-GRID-11 | Bar chart SHALL normalize values: longest bar = 100% width, others scaled proportionally. |
| FR-GRID-12 | Bulk action bar SHALL provide: Cancel All, Expand All, Collapse All, Clear Completed. |
| FR-GRID-13 | Cancel All SHALL send abort signal to all running tools, changing their state to cancelled. |
| FR-GRID-14 | Clear Completed SHALL remove all success/failed/cancelled cards from the grid, leaving running/pending. |
| FR-GRID-15 | Sorting SHALL be supported by: status (failed first), duration (asc/desc), tool name (alphabetical). |
| FR-GRID-16 | Filtering SHALL be supported by status: all / running only / failed only / completed only. |
| FR-GRID-17 | View toggle SHALL support: Grid View (default) vs List View (compact single column). |
| FR-GRID-18 | View mode SHALL automatically switch to List View on narrow screens (< 600px). |
| FR-GRID-19 | Grid SHALL support virtual scrolling for 20+ tools to maintain 60fps performance. |
| FR-GRID-20 | Clicking a tool card in error panel SHALL scroll it into view and highlight it temporarily. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-GRID-01 | Adding a new tool card to the grid SHALL complete in < 16ms (one frame). |
| NFR-GRID-02 | Updating progress/output across 10 concurrent running tools SHALL maintain 60fps. |
| NFR-GRID-03 | 50 tool cards in the grid SHALL maintain smooth scrolling (no jank). |
| NFR-GRID-04 | Status transition animation (pending → running → success) SHALL complete in < 300ms. |
| NFR-GRID-05 | Error highlight animation (jump to failed card) SHALL be WCAG compliant (no flash). |
| NFR-GRID-06 | Color coding for status SHALL meet WCAG AA 4.5:1 contrast ratio requirements. |
| NFR-GRID-07 | Bulk action (Cancel All) on 10 tools SHALL complete in < 100ms. |
| NFR-GRID-08 | Sort/filter on 50 items SHALL complete in < 50ms. |
| NFR-GRID-09 | Component SHALL be fully keyboard accessible: Tab navigation, Enter/Space to activate. |
| NFR-GRID-10 | Screen reader SHALL announce status changes and error events appropriately. |

### 3.3 Key Entities

#### ToolGridState

- **toolIds**: `string[]`（工具 ID 有序列表，控制展示顺序）
- **filters**: `{ status?: ToolStatus[] }`（筛选条件）
- **sortBy**: `'status' | 'duration' | 'name'`（排序字段）
- **sortOrder**: `'asc' | 'desc'`（排序方向）
- **viewMode**: `'grid' | 'list'`（视图模式）
- **errorExpanded**: `boolean`（错误聚合面板展开状态）

#### ToolCardData

- **toolId**: `string`（唯一标识）
- **toolName**: `string`（工具类型：Read/Grep/Glob/Bash 等）
- **parameters**: `Record<string, unknown>`（工具参数，用于显示摘要）
- **status**: `'pending' | 'running' | 'success' | 'failed' | 'cancelled'`
- **progress**: `number | null`（0-100，null = indeterminate）
- **startTime**: `number`（毫秒时间戳）
- **endTime**: `number | null`（完成时间戳）
- **durationMs**: `number | null`（计算得到的时长）
- **outputPreview**: `string[]`（末尾 N 行，最多 5 行）
- **fullOutput**: `string`（完整输出，展开时渲染）
- **error**: `{ message: string; stack?: string } | null`（错误信息）
- **isExpanded**: `boolean`（卡片展开/折叠）
- **resourceUsage**: `{ outputBytes: number; memoryBytes?: number }`

#### ResourceMetrics

- **toolId**: `string`
- **metricName**: `'duration' | 'outputSize' | 'memory'`
- **value**: `number`（原始值）
- **normalizedValue**: `number`（0-100，用于条形图宽度）
- **label**: `string`（显示标签，如 "2.3s" / "156KB"）

#### BulkAction

- **actionType**: `'cancelAll' | 'expandAll' | 'collapseAll' | 'clearCompleted'`
- **affectedCount**: `number`（受影响的工具数量）
- **timestamp**: `number`（执行时间）

---

## 4. Success Criteria

### 4.1 Quantitative

1. **Render Performance**: 10 new tool cards added in < 160ms total (< 16ms each).
2. **Animation FPS**: Progress updates across 10 concurrent tools maintain 60fps.
3. **Scroll Performance**: 50-tool grid maintains 60fps scrolling with virtual scroll.
4. **Bulk Action Speed**: Cancel All on 10 tools completes in < 100ms.
5. **Sort/Filter Speed**: 50 items sorted/filtered in < 50ms.
6. **Status Transition**: Animation from pending → running → success completes in < 300ms.
7. **Color Contrast**: All status colors (pending/running/success/failed) meet WCAG AA 4.5:1.
8. **Keyboard Accessibility**: 100% of interactive elements reachable via Tab navigation.

### 4.2 Qualitative

1. **Visual Clarity**: At a glance, user can identify how many tools are running, which are failed, which are slowest.
2. **Progressive Disclosure**: Collapsed view shows essentials only, expanded view shows details on demand.
3. **Error Visibility**: Failures are immediately noticeable without scanning entire grid.
4. **Responsive Behavior**: Grid reflows gracefully at all window widths without breaking layout.
5. **Predictable State**: Status transitions are visually clear, user always understands what's happening.

---

## 5. Out of Scope

The following features are explicitly NOT included:

- Tool retry / re-execution controls (handled by Agent Runtime, not UI)
- Tool execution order reordering
- Custom tool creation / parameter editing
- Tool execution history persistence across sessions (handled by 009)
- Cross-session tool comparison analytics
- Gantt chart / timeline visualization of parallel execution overlap
- DAG (directed acyclic graph) visualization of tool dependencies
- Resource usage real-time charts (CPU/memory over time)
- Export tool execution results to JSON/CSV
- Tool grouping / custom categories
- User-defined column counts (auto only)

---

## 6. Dependencies

### 6.1 Upstream Dependencies

| Dependency | Feature | Purpose |
|------------|---------|---------|
| Zustand Store | 026-web-message-input | Store integration for grid state management |
| Tool Orchestrator | 026-web-message-input | Concurrent tool execution events feed grid updates |
| Virtual Scroll Hook | 026-web-message-input | Reuse for 20+ tool grid virtualization |
| BashCard / TerminalRenderer | 028 + 030 | Output rendering within each tool card (ANSI color support) |
| Status Badge Component | 027-web-chat-stream | Reusable status badge styling (consistent with chat) |

### 6.2 Downstream Dependencies

| Feature | Depends On | Purpose |
|---------|-----------|---------|
| 032-web-session-history-sidebar | This feature | Replays tool grid state from historical sessions |
| Future: Agent Dashboard | This feature | Tool grid as a component in broader execution overview |

---

## 7. Assumptions

1. **Zustand Single Source of Truth**: All grid state lives in Zustand store, no component-local state for shared data.
2. **Progress Information Optional**: Not all tools provide progress percentage. Indeterminate progress bar is the fallback.
3. **Memory Usage Optional**: Memory metrics may not be available for all tool types. Bar chart falls back to duration + output size only.
4. **Max Concurrent Tools**: Reasonable upper bound of 50 concurrent tools per batch. Beyond that, virtual scroll activates.
5. **Dark Theme Only**: MVP assumes dark theme background (#1e1e1e). Light theme support deferred.
6. **Status Transitions Irreversible**: Once a tool leaves pending/running, it cannot go back. Simplifies animation logic.
7. **Tool Order Consistency**: The order of tool cards remains stable unless user explicitly sorts. New tools append to end.

---

## 8. Clarifications

### Session 2026-06-19

[NO CLARIFICATIONS NEEDED YET - This section will be populated during the clarify phase.]
