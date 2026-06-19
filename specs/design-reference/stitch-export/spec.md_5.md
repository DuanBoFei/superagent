# Feature Specification: Web Diff Display

**Feature**: 029-web-diff-display  
**Created**: 2026-06-19  
**Status**: Draft  
**Input**: 文件编辑差异对比可视化：统一的 diff 展示组件、side-by-side 对比、语法高亮、行号对照、变更统计

---

## 1. What & Why

### 1.1 What

本 Feature 实现 Web UI 中文件差异的专业级可视化展示：
- Unified diff 视图（合并视图）
- Side-by-side 分栏对比视图
- 代码语法高亮集成
- 左右行号对照显示
- 变更统计摘要（新增/删除/修改行数）
- 变更块导航（上一处/下一处快捷跳转）
- 差异块折叠/展开控制
- 行内字符级差异高亮

### 1.2 Why

代码 Review 和文件变更确认是开发者日常工作流的核心环节。清晰可读的 diff 可视化直接影响代码审查效率和错误发现率。统一的 diff 组件确保 Agent 编辑文件、Git 变更、历史对比等所有场景提供一致的高质量阅读体验，避免用户在纯文本 diff 中费力寻找变更点。

### 1.3 Goals

- 支持两种核心视图模式：Unified（合并）+ Split（分栏）
- 语法高亮 + 字符级差异高亮，阅读体验媲美专业 IDE
- 变更块导航：一键跳转到上一处/下一处差异
- 大文件性能：10,000 行 diff 流畅渲染无卡顿
- 可复用组件设计，支持 FileEditCard、Git History、Code Review 等多场景集成

### 1.4 Non-Goals

- ❌ 在线代码编辑（仅展示，不支持直接在 diff 中修改）
- ❌ 三方合并视图（3-way merge）- MVP 仅支持两方对比
- ❌ Git blame / 作者信息显示
- ❌ 代码评论 / Review 批注功能
- ❌ 语法层面的语义 diff（仅文本层面对比）
- ❌ 二进制文件 / 图片 diff 展示

---

## 2. User Scenarios & Testing

### User Story 1 - 查看 Agent 对代码的修改（Priority: P0）

As a developer, when the Agent proposes edits to my code file, I want to see a color-coded diff with line numbers and syntax highlighting, so I can quickly understand what changed before approving.

**Why this priority**: 这是 FileEditCard 的核心使用场景，diff 可读性直接影响代码变更审核效率。

**Independent Test**: Agent 修改 200 行文件，生成 diff，验证可读性和性能。

**Acceptance Scenarios**:

1. **Given** Agent 修改了一个包含 200 行的 TypeScript 文件，**When** FileEditCard 渲染，**Then** 新增行绿色背景，删除行红色背景，未变更行正常显示，语法高亮与编辑器一致。
2. **Given** 同一行内只有部分字符修改，**When** 渲染该行，**Then** 修改的字符用更深色的背景高亮显示（字符级差异）。
3. **Given** 变更跨越多个函数，**When** 滚动查看，**Then** 差异块之间的未变更上下文清晰可见，变更块间距符合阅读习惯。

### User Story 2 - Side-by-Side 分栏对比（Priority: P0）

As a developer reviewing a large refactor, I want to see old and new code side by side in two columns, so I can more easily understand structural changes.

**Why this priority**: 对于重构和结构性变更，分栏视图比合并视图更易于理解。

**Independent Test**: 对比查看一个包含函数重命名和参数调整的 diff，验证分栏对齐正确性。

**Acceptance Scenarios**:

1. **Given** 我正在查看代码重构 diff，**When** 切换到 Split 模式，**Then** 左侧显示旧代码，右侧显示新代码，左右行号垂直对齐。
2. **Given** 某行只有左侧（删除）或只有右侧（新增），**When** 显示，**Then** 另一侧显示空白占位行，保持垂直位置对应。
3. **Given** 我在 Unified 模式滚动到第 150 行，**When** 切换到 Split 模式，**Then** 滚动位置保持在对应内容区域。

### User Story 3 - 变更块导航与统计（Priority: P1）

As a developer reviewing a 500-line diff across 12 different change blocks, I want summary statistics and one-click navigation between change blocks, so I can systematically review all changes without missing anything.

**Why this priority**: 大 diff 的系统性审查需要导航辅助，避免遗漏或重复滚动。

**Acceptance Scenarios**:

1. **Given** diff 包含 8 处变更块，**When** 页面加载，**Then** 顶部显示统计：+42 行新增, -18 行删除, 5 处修改。
2. **Given** 我正在查看第 3 处变更，**When** 点击"下一处变更"按钮，**Then** 页面平滑滚动到第 4 处变更并高亮提示。
3. **Given** 我在第 1 处变更点击"上一处"，**When** 到达边界，**Then** 按钮禁用或提示"已是第一处变更"。
4. **Given** diff 包含 30 处变更，**When** 显示统计，**Then** 显示变更位置指示器（类似滚动条上的标记）。

### User Story 4 - 大文件性能与折叠（Priority: P1）

As a developer viewing a 10,000-line file with 500 lines changed, I want unchanged sections to be collapsible and rendering to stay smooth, so my review workflow isn't interrupted by performance issues.

**Why this priority**: 大文件 diff 是常见性能瓶颈，直接影响用户体验。

**Acceptance Scenarios**:

1. **Given** diff 中有 200 行未变更的代码块，**When** 渲染，**Then** 未变更块自动折叠，显示"展开 N 行未变更内容"按钮。
2. **Given** 一个 8,000 行的 diff 文件，**When** 滚动浏览，**Then** 保持 60fps 流畅滚动，无明显掉帧。
3. **Given** 我点击"展开全部"按钮，**When** 操作完成，**Then** 所有折叠的未变更块全部展开，页面响应时间 < 200ms。

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-DIFF-01 | Diff component SHALL support both Unified and Split view modes. |
| FR-DIFF-02 | Users SHALL be able to toggle between Unified and Split modes with a single click. |
| FR-DIFF-03 | Added lines SHALL be rendered with a green background indicator. |
| FR-DIFF-04 | Deleted lines SHALL be rendered with a red background indicator. |
| FR-DIFF-05 | Modified lines with character-level changes SHALL have intra-line highlighting for changed characters. |
| FR-DIFF-06 | Unchanged context lines SHALL be rendered with neutral styling. |
| FR-DIFF-07 | Line numbers SHALL be displayed for both old and new versions in both view modes. |
| FR-DIFF-08 | Syntax highlighting SHALL be applied to code content matching the file's language. |
| FR-DIFF-09 | Change statistics SHALL be displayed: lines added, lines deleted, lines modified, change blocks count. |
| FR-DIFF-10 | Navigation controls SHALL exist for jumping to previous/next change block. |
| FR-DIFF-11 | Gutter indicators (markers in scrollbar) SHALL show positions of all change blocks. |
| FR-DIFF-12 | Large unchanged sections (> 20 consecutive lines) SHALL be automatically collapsed. |
| FR-DIFF-13 | Users SHALL be able to expand/collapse individual unchanged sections. |
| FR-DIFF-14 | "Expand all" and "Collapse all" actions SHALL be available. |
| FR-DIFF-15 | In Split mode, corresponding lines SHALL be vertically aligned between left and right columns. |
| FR-DIFF-16 | In Split mode, one-sided changes (add only / delete only) SHALL leave an empty placeholder on the opposite side for alignment. |
| FR-DIFF-17 | Split mode columns SHALL scroll synchronously (vertical scroll is synchronized). |
| FR-DIFF-18 | Diff component SHALL accept both unified diff string input and structured old/new file content input. |
| FR-DIFF-19 | Diff component SHALL support dark theme colors with proper contrast. |
| FR-DIFF-20 | Users SHALL be able to select and copy text from the diff (including both old and new versions). |
| FR-DIFF-21 | Word-wrap SHALL be configurable and disabled by default. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-DIFF-01 | Initial render of a 1,000-line diff SHALL complete in < 200ms. |
| NFR-DIFF-02 | Initial render of a 10,000-line diff SHALL complete in < 1 second. |
| NFR-DIFF-03 | Scrolling through any diff SHALL maintain 60fps. |
| NFR-DIFF-04 | Mode switch (Unified ↔ Split) SHALL complete in < 100ms. |
| NFR-DIFF-05 | Virtual scrolling SHALL be enabled for diffs larger than 500 lines. |
| NFR-DIFF-06 | Memory usage for a 10,000-line diff SHALL NOT exceed 50MB. |
| NFR-DIFF-07 | All text and background color combinations SHALL meet WCAG AA contrast standards (4.5:1). |
| NFR-DIFF-08 | Component SHALL be fully keyboard navigable (tab through change blocks, enter to expand/collapse). |
| NFR-DIFF-09 | Diff parsing time (10,000 lines) SHALL be < 100ms. |
| NFR-DIFF-10 | The component SHALL be reusable across FileEditCard, Git History, and Code Review contexts without modification. |

### 3.3 Key Entities

#### DiffViewMode

- **type**: `'unified'` | `'split'`

#### DiffLineType

- **type**: `'add'` | `'delete'` | `'modify'` | `'context'` | `'empty'` (placeholder for alignment)

#### DiffLine

- **type**: DiffLineType
- **oldLineNumber**: number | null
- **newLineNumber**: number | null
- **content**: string
- **charChanges**: Array<{ start: number, end: number, type: 'add' | 'delete' }> (字符级变更)

#### DiffHunk

- **hunkIndex**: number
- **oldStart**: number
- **oldLines**: number
- **newStart**: number
- **newLines**: number
- **lines**: DiffLine[]
- **isCollapsed**: boolean
- **isContextHunk**: boolean (true for unchanged sections)

#### DiffStatistics

- **linesAdded**: number
- **linesDeleted**: number
- **linesModified**: number
- **changeBlocks**: number
- **totalLines**: number

#### DiffNavigationPosition

- **currentHunkIndex**: number
- **currentLineIndex**: number
- **totalHunks**: number

---

## 4. Success Criteria

### 4.1 Quantitative

1. **Render Performance**: 10,000-line diff renders in < 1 second and scrolls at 60fps.
2. **Parsing Speed**: 10,000-line unified diff parses in < 100ms.
3. **Mode Switch**: Toggle between Unified and Split views in < 100ms.
4. **Feature Coverage**: 100% of FRs implemented and tested.
5. **Accessibility**: 100% of WCAG AA contrast requirements met for all color combinations.
6. **Navigation Accuracy**: Previous/Next navigation correctly visits 100% of change blocks without skipping or duplication.
7. **Line Alignment**: In Split mode, 100% of corresponding lines are correctly vertically aligned.

### 4.2 Qualitative

1. **User Satisfaction**: Developers rate the diff readability 4.5/5 or higher compared to their preferred IDE.
2. **Readability**: Users report being able to identify character-level changes instantly without squinting or careful inspection.
3. **Performance Perception**: Users report no perceptible lag or jank during scrolling or mode changes.
4. **Reusability**: The component can be dropped into 3+ different contexts (FileEdit, Git History, PR Review) without modification.

---

## 5. Out of Scope

The following features are explicitly NOT included and will be handled in separate future features:

- 3-way merge views (base version + ours + theirs)
- Git blame / author information display
- Inline code comments or review annotations
- Direct in-diff editing capabilities
- Semantic diff (language-aware structural comparison)
- Binary file / image difference visualization
- Word-level vs character-level diff algorithm selection
- Diff syntax theme customization (stick to default dark theme only)
- Ignore whitespace option (MVP always considers whitespace)

---

## 6. Dependencies

### 6.1 Upstream Dependencies

| Dependency | Feature | Purpose |
|------------|---------|---------|
| Syntax Highlighting | 027-web-chat-stream | Reuse Shiki/highlight.js for code syntax coloring |
| Virtual Scroll | 026-web-message-input | Reuse virtual scrolling implementation for large diff performance |
| Zustand Store | 026-web-message-input | Store view mode preference and navigation state |
| FileEditCard | 028-web-tool-cards | Primary integration point - enhance existing diff card |

### 6.2 Downstream Dependencies

| Feature | Depends On | Purpose |
|---------|-----------|---------|
| Git History View | This feature | Visualizing commit diffs and file history |
| Code Review UI | This feature | PR / code review change visualization |
| File Version Compare | This feature | Comparing arbitrary file versions |

---

## 7. Assumptions

1. **Diff Format**: Input will be standard unified diff format or structured old/new text pairs; no support for context diff or other formats.
2. **Monospace Font**: Diff content will be rendered using a monospace font for proper alignment.
3. **Dark Theme Only**: MVP supports only dark theme matching the existing UI; light theme support deferred.
4. **File Size Limit**: MVP handles up to 10,000-line diffs gracefully; larger files show truncated warning + download full diff option.
5. **Algorithm**: Myers diff algorithm (industry standard) for optimal diff quality and performance.
6. **Context Lines**: Default 3 lines of context around each change; user configurable via optional prop.
7. **Copy Behavior**: Selecting text in Split mode copies content from the focused column only.

---

## 8. Clarifications

### Session 2026-06-19

[NO CLARIFICATIONS NEEDED YET - This section will be populated during the clarify phase]
