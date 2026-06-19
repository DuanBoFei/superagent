# Feature Specification: Web Tool Cards Rendering

**Feature**: 028-web-tool-cards  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: 各种内置工具调用的可视化卡片渲染：Bash 输出、文件读写、搜索结果、任务列表、子 Agent 进度等

---

## 1. What & Why

### 1.1 What

本 Feature 实现 Web UI 聊天界面中各种工具调用的可视化卡片渲染：
- Bash 终端输出卡片（支持 ANSI 颜色、流式输出、滚动）
- 文件读/写/编辑操作卡片（文件路径、变更摘要、diff 预览）
- 搜索结果卡片（Grep/Glob 匹配结果、可展开详情）
- 任务列表卡片（Todo 进度、状态跟踪）
- 子 Agent 进度卡片（多任务并行状态、完成度指示）
- 统一的卡片式布局：状态头部 + 内容区域 + 操作按钮

### 1.2 Why

纯文本工具输出难以快速扫描和理解。卡片式可视化将不同类型的工具输出结构化展示，让用户一眼就能识别操作类型、状态和结果，显著提升聊天体验的可读性和操作效率。统一的卡片设计语言确保了界面一致性，同时为未来新增工具类型提供可扩展的渲染框架。

### 1.3 Goals

- 支持 6+ 种核心工具类型的专属卡片渲染（含 WebSearch）
- 卡片状态可视化（进行中/成功/失败）
- 长输出的折叠/展开 + 虚拟滚动
- 一键复制工具输出内容
- ANSI 终端颜色正确渲染
- 可扩展的卡片注册机制（新增工具无需改动核心渲染）

### 1.4 Non-Goals

- ❌ 工具执行逻辑本身（仅负责渲染，不负责执行）
- ❌ 卡片内的交互式编辑（如直接在卡片内编辑文件）
- ❌ 工具参数配置 UI（参数在 REPL 输入时确定）
- ❌ 工具权限审批 UI（由 026 权限系统处理）
- ❌ MCP 工具的专属渲染（MVP 仅处理内置工具，含 WebSearch）

---

## 2. User Scenarios & Testing

### User Story 1 - 查看 Bash 命令输出（Priority: P0）

As a developer, when the agent executes a shell command, I want to see the output in a dedicated terminal-style card with proper formatting and color coding, so I can read command output like I would in my local terminal.

**Why this priority**: Bash 是最常用的工具，终端输出的可读性直接影响用户体验。

**Independent Test**: 执行 `npm test` 命令，验证输出卡片渲染正确，颜色高亮显示。

**Acceptance Scenarios**:

1. **Given** Agent 正在执行 `npm install` 命令，**When** 输出逐行到达，**Then** 卡片内流式追加输出，ANSI 颜色和格式正确显示。
2. **Given** 命令执行完成，**When** 显示最终状态，**Then** 卡片头部显示绿色对勾（成功）或红色错误图标（失败）+ exit code。
3. **Given** 命令输出超过 50 行，**When** 渲染完成，**Then** 卡片默认折叠显示前 10 行，点击"展开全部"显示完整内容并支持滚动。
4. **Given** 我需要复制命令输出，**When** 点击卡片右上角复制按钮，**Then** 完整输出被复制到剪贴板（不含 UI 元素）。

### User Story 2 - 查看文件操作结果（Priority: P0）

As a developer, when the agent reads or modifies a file, I want to see a clear card showing the file path, operation type, and a diff preview of changes, so I can quickly understand what was modified without reading raw text.

**Why this priority**: 文件操作是代码修改的核心，diff 预览是确认变更正确性的关键。

**Independent Test**: 让 Agent 修改一个文件，验证 FileWriteCard 显示正确的文件路径和 diff 预览。

**Acceptance Scenarios**:

1. **Given** Agent 执行 FileRead 操作，**When** 读取完成，**Then** 卡片显示文件路径、文件大小、行数，内容区域显示代码高亮的文件内容。
2. **Given** Agent 执行 FileWrite 操作（新建文件），**When** 写入完成，**Then** 卡片显示绿色"新建"标签 + 文件路径 + 写入行数。
3. **Given** Agent 执行 FileEdit 操作（修改已有文件），**When** 编辑完成，**Then** 卡片显示 unified diff 预览，新增行绿色背景，删除行红色背景。
4. **Given** diff 包含超过 100 行变更，**When** 渲染完成，**Then** 默认折叠显示变更统计（+N 行，-M 行），点击展开查看完整 diff。

### User Story 3 - 查看搜索结果（Priority: P1）

As a developer, when the agent searches my codebase, I want the matching results displayed in a scannable card with file paths, line numbers, and highlighted match text, so I can quickly navigate to relevant code.

**Why this priority**: 搜索是代码理解的高频操作，结构化结果比纯文本更易扫描。

**Independent Test**: 执行 Grep 搜索 "function"，验证搜索结果卡片显示正确的文件路径、行号和匹配高亮。

**Acceptance Scenarios**:

1. **Given** Agent 执行 Grep 搜索，**When** 返回 15 个匹配结果，**Then** 卡片按文件分组显示，每个匹配项显示行号 + 上下文代码，匹配文本黄色高亮。
2. **Given** 搜索结果超过 20 个匹配，**When** 渲染完成，**Then** 卡片默认显示前 10 个，"查看更多 N 个匹配"按钮可展开全部。
3. **Given** Agent 执行 Glob 文件名搜索，**When** 返回匹配文件列表，**Then** 卡片以列表形式显示文件名，支持点击跳转（未来功能，MVP 仅显示）。

### User Story 4 - 追踪任务列表进度（Priority: P1）

As a developer, when the agent creates and updates tasks, I want a dedicated card showing all tasks with their status (pending/in-progress/completed), so I can track overall progress at a glance.

**Why this priority**: 多步骤任务的进度可视化是理解 Agent 工作流的关键。

**Independent Test**: 创建 3 个任务，逐个标记完成，验证任务卡片实时更新状态。

**Acceptance Scenarios**:

1. **Given** Agent 创建了 5 个待处理任务，**When** 任务列表更新，**Then** 卡片显示总进度条（已完成/总数）+ 每个任务的复选框状态。
2. **Given** 某个任务正在执行中，**When** 任务状态更新，**Then** 该任务行显示 spinner 动画，其他任务保持静止。
3. **Given** 所有任务完成，**When** 最后一个任务标记完成，**Then** 卡片显示完成庆祝动画 + "所有任务已完成"提示。

### User Story 5 - 查看网络搜索结果（Priority: P1）

As a developer, when the agent performs a web search, I want results displayed as structured cards with clickable titles, source domains, and text snippets, so I can quickly evaluate result relevance and visit sources if needed.

**Why this priority**: WebSearch 结果包含链接和结构化元数据，纯文本展示浪费了这种结构化信息。

**Independent Test**: 执行网络搜索 "TypeScript async patterns"，验证搜索结果卡片显示标题、来源、链接和摘要。

**Acceptance Scenarios**:

1. **Given** Agent 执行 WebSearch 返回 8 个结果，**When** 渲染完成，**Then** 卡片按列表显示每个结果的标题、来源域名、内容摘要。
2. **Given** 搜索结果包含 URL，**When** 点击标题，**Then** 在新浏览器标签页打开目标链接。
3. **Given** 搜索结果超过 5 个，**When** 渲染完成，**Then** 默认显示前 5 个，点击"查看更多 N 个结果"展开全部。

### User Story 6 - 追踪子 Agent 并行进度（Priority: P1）

As a developer, when the agent spawns sub-agents to handle parallel work, I want a grid view showing each sub-agent's status and progress, so I can understand what multiple concurrent workers are doing.

**Why this priority**: 多 Agent 协作是复杂任务的关键，用户需要可见性到各 worker 的状态。

**Independent Test**: 启动 2 个并行子任务，验证进度网格正确显示各任务状态。

**Acceptance Scenarios**:

1. **Given** Agent 启动了 3 个子任务并行执行，**When** 子任务列表创建，**Then** 卡片以 2 列网格布局显示每个子任务的独立状态区域。
2. **Given** 某个子任务正在输出，**When** 内容到达，**Then** 对应网格单元内流式追加输出，不影响其他单元。
3. **Given** 某个子任务完成，**When** 状态更新，**Then** 对应单元边框变为绿色，显示完成图标。
4. **Given** 某个子任务出错，**When** 错误返回，**Then** 对应单元边框变为红色，显示错误信息摘要。

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-CARD-01 | All tool outputs SHALL render as dedicated cards with a consistent header + content + footer structure. |
| FR-CARD-01a | Multiple tool calls within the same message SHALL render as separate independent cards stacked vertically. |
| FR-CARD-01b | Each vertically stacked card SHALL maintain its own expanded/collapsed state independently. |
| FR-CARD-02 | Card headers SHALL display tool name, timestamp, and status indicator (pending/spinning/success/error). |
| FR-CARD-03 | Success status SHALL be indicated with green color and check icon. |
| FR-CARD-04 | Error status SHALL be indicated with red color, error icon, and smart error summary (type + message by default, full stack trace collapsible). |
| FR-CARD-05 | In-progress status SHALL be indicated with an animated spinner. |
| FR-CARD-06 | BashToolCard SHALL support ANSI escape code rendering: standard 16 colors + 256-color palette, bold, underline, and reverse video formatting. |
| FR-CARD-07 | BashToolCard SHALL stream output incrementally as it arrives from the process. |
| FR-CARD-08 | BashToolCard SHALL show exit code upon command completion. |
| FR-CARD-09 | FileReadCard SHALL display file path, size, line count, and syntax-highlighted content. |
| FR-CARD-10 | FileWriteCard SHALL display "new file" indicator, file path, and line count written. |
| FR-CARD-11 | FileEditCard SHALL display unified diff with green/red line highlighting for additions/deletions. |
| FR-CARD-12 | FileEditCard SHALL display change statistics (+N lines added, -M lines removed). |
| FR-CARD-13 | GrepResultCard SHALL group matches by file, show line numbers, and highlight matching text. |
| FR-CARD-14 | GlobResultCard SHALL display matching file names in a list format. |
| FR-CARD-15 | TaskListCard SHALL display an overall progress bar and individual tasks with checkboxes. |
| FR-CARD-16 | TaskListCard SHALL update task statuses in real-time as they change. |
| FR-CARD-17 | SubAgentGridCard SHALL display parallel sub-tasks in a grid layout (2 columns by default). |
| FR-CARD-18 | SubAgentGridCard SHALL isolate each sub-task's output stream to its own grid cell. |
| FR-CARD-19 | All cards with long content SHALL be collapsible, showing a summary when folded and full content when expanded. |
| FR-CARD-19a | Cards SHALL use smart defaults: short content (< 50 lines / < 5 results) expanded by default, long content folded by default. |
| FR-CARD-20 | All cards with text output SHALL have a one-click copy button for the full content. |
| FR-CARD-21 | Cards SHALL maintain their expanded/collapsed state during streaming updates. |
| FR-CARD-22 | The card system SHALL provide an extensible registry mechanism for adding new tool card types. |
| FR-CARD-23 | WebSearchCard SHALL display search results as items with title, source domain, and text snippet. |
| FR-CARD-24 | WebSearchCard titles SHALL be clickable links that open in a new browser tab. |
| FR-CARD-25 | WebSearchCard SHALL support "show more" behavior for result sets larger than 5 items. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-CARD-01 | Card rendering from tool result availability to display SHALL take < 50ms. |
| NFR-CARD-02 | Streaming card updates SHALL NOT cause layout shifts in surrounding content. |
| NFR-CARD-03 | Virtual scrolling in long output cards SHALL maintain 60fps performance. |
| NFR-CARD-04 | Card state (expanded/collapsed) SHALL persist across chat sessions. |
| NFR-CARD-05 | Copy to clipboard operations SHALL complete in < 100ms. |
| NFR-CARD-06 | ANSI color rendering SHALL support the standard 16 colors + 256-color palette and basic formatting (bold/underline/reverse). |
| NFR-CARD-07 | Card layout SHALL be responsive, adjusting to chat container width. |
| NFR-CARD-08 | Card colors SHALL maintain WCAG AA contrast ratios in both light and dark themes. |
| NFR-CARD-09 | Maximum card height SHALL be configurable (default: 600px), with overflow scrolling. |
| NFR-CARD-10 | The card registry SHALL support adding new card types without modifying core renderer code. |

### 3.3 Key Entities

#### ToolCard

- **type**: `bash` | `file-read` | `file-write` | `file-edit` | `grep` | `glob` | `task-list` | `sub-agent-grid` | `web-search`
- **toolCallId**: string (unique identifier)
- **status**: `pending` | `running` | `success` | `error`
- **timestamp**: Date
- **title**: string (display name)
- **content**: ToolContent (type-specific content)
- **isExpanded**: boolean
- **isCollapsible**: boolean

#### BashCardContent

- **command**: string
- **args**: string[]
- **output**: string (raw ANSI output)
- **exitCode**: number | null
- **durationMs**: number | null

#### FileReadCardContent

- **filePath**: string
- **fileSize**: number
- **lineCount**: number
- **content**: string
- **language**: string

#### FileEditCardContent

- **filePath**: string
- **diff**: string (unified diff format)
- **linesAdded**: number
- **linesRemoved**: number

#### GrepMatch

- **filePath**: string
- **line**: number
- **column**: number
- **matchText**: string
- **contextBefore**: string
- **contextAfter**: string

#### GrepCardContent

- **pattern**: string
- **matches**: GrepMatch[]
- **totalMatches**: number
- **filesSearched**: number

#### TaskListItem

- **taskId**: string
- **title**: string
- **status**: `pending` | `in-progress` | `completed` | `failed`

#### TaskListCardContent

- **tasks**: TaskListItem[]
- **completedCount**: number
- **totalCount**: number

#### SubAgentCell

- **agentId**: string
- **title**: string
- **status**: `pending` | `running` | `completed` | `failed`
- **output**: string
- **progress**: number (0-100)

#### SubAgentGridCardContent

- **cells**: SubAgentCell[]
- **columns**: number (default: 2)

#### WebSearchResult

- **title**: string
- **url**: string
- **snippet**: string
- **source**: string (domain name)

#### WebSearchCardContent

- **query**: string
- **results**: WebSearchResult[]
- **totalResults**: number

---

## 4. Success Criteria

### 4.1 Quantitative

1. **Rendering Performance**: 100% of tool cards render within 50ms of result availability.
2. **Streaming Performance**: Bash command streaming updates achieve 60fps without layout shift.
3. **Card Type Coverage**: All 9 core tool types (bash, file-read, file-write, file-edit, grep, glob, task-list, sub-agent-grid, web-search) have dedicated card renderers.
4. **ANSI Support**: Standard 16 colors + bright variants are correctly rendered.
5. **Copy Accuracy**: 100% of copy operations produce exact content match (no extra UI characters).
6. **State Persistence**: Card expanded/collapsed state is preserved across 100% of chat sessions.

### 4.2 Qualitative

1. **User Satisfaction**: Users rate the card-based tool output experience 4.5/5 or higher in usability testing.
2. **Visual Consistency**: All card types follow the same design language (headers, spacing, color scheme).
3. **Extensibility**: New tool card types can be added by engineers who are not familiar with the core renderer code.
4. **Readability**: Users report being able to scan tool output 2x faster compared to plain text display.

---

## 5. Out of Scope

The following features are explicitly NOT included in this feature and will be handled in separate future features:

- MCP (Model Context Protocol) tool-specific card rendering
- Interactive editing within cards (inline file edits, command re-runs)
- Tool parameter configuration UI
- Permission approval UI (handled by 026-web-message-input)
- "Re-run tool" button functionality
- File navigation / jumping to line in IDE
- Custom card themes or user-styling
- Card export / save functionality
- Terminal history search within Bash cards

---

## 6. Dependencies

### 6.1 Upstream Dependencies

| Dependency | Feature | Purpose |
|------------|---------|---------|
| Web Chat UI | 026-web-message-input | Message bubble container where cards render |
| Web Socket | 025-web-server-start | Real-time tool result delivery for streaming cards |
| Markdown Rendering | 027-web-chat-stream | Syntax highlighting reused in file/edit cards |
| Copy to Clipboard | 027-web-chat-stream | Hook reused across all card types |
| Zustand Store | 026-web-message-input | Card state management (expanded, data) |

### 6.2 Downstream Dependencies

| Feature | Depends On | Purpose |
|---------|-----------|---------|
| 029-web-diff-display | This feature | Enhanced diff visualization builds on FileEditCard foundation |
| 030-web-terminal-output | This feature | Advanced terminal features build on BashCard foundation |

---

## 7. Assumptions

1. **Tool Output Format**: Tool execution results include sufficient metadata (tool type, status, timestamps) to determine card type and rendering.
2. **ANSI Parsing Library**: A standard ANSI escape code parser will be used (either existing implementation or new dependency).
3. **State Management**: Zustand store from 026 will be extended to hold card state (expanded/collapsed, full content).
4. **Dark Theme Only**: MVP supports only dark theme for syntax highlighting and card colors.
5. **Grid Layout**: 2-column sub-agent grid is sufficient for MVP; more columns can be added later.
6. **Copy Implementation**: The useCopyToClipboard hook from 027 will be reused across all card types.
7. **Streaming Mechanism**: Socket.io events from 025 carry incremental tool output that can be mapped to specific toolCallIds.

---

## 8. Clarifications

### Session 2026-06-18

- Q: WebSearch should have dedicated card type or use generic Markdown? → A: Dedicated WebSearchCard with structured rendering (9th core card type)
- Q: Default expand/collapse behavior for long content cards? → A: Smart defaults - short content expanded, long content folded (50 lines / 5 results threshold)
- Q: ANSI terminal rendering depth? → A: 256 colors + basic formatting (bold/underline/reverse), no full terminal emulation
- Q: Multiple tool call layout within same message? → A: Vertical stacking - each tool call is independent card, stacked top to bottom
- Q: Long error output and stack trace display strategy? → A: Smart error summaries - show error type + message by default, full stack trace is collapsible


