# Feature Specification: Web Chat Stream Rendering

**Feature**: 027-web-chat-stream  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: Markdown 渲染、代码块语法高亮、流式 Token 增量渲染优化

---

## 1. What & Why

### 1.1 What

本 Feature 实现 Web UI 聊天消息的富文本渲染能力：
- Assistant 消息内容的 Markdown 格式渲染（标题、列表、粗体、斜体、链接、引用、表格、代码块等）
- 代码块语法高亮，支持主流编程语言
- 流式输出的增量渲染优化——每个 Token 到达时无需重渲染整个消息，只追加渲染新内容
- 代码块复制按钮、展开/折叠功能

### 1.2 Why

纯文本聊天体验有限，无法有效呈现代码、结构化信息和富文本格式。Markdown 渲染是开发者与 AI 对话的核心体验需求，代码高亮直接影响代码审查和学习效率。流式增量渲染保证聊天的流畅感，避免长消息时的页面卡顿。

### 1.3 Goals

- 支持完整的 CommonMark Markdown 语法渲染
- 20+ 主流编程语言语法高亮准确显示
- 流式渲染延迟 < 16ms（60fps）—— Token 到达后追加渲染无闪烁
- 代码块一键复制功能可用
- 大代码块可折叠，不占用过多屏幕空间

### 1.4 Non-Goals

- ❌ Markdown 编辑器（仅渲染，不支持编辑）
- ❌ Mermaid 图表渲染（后续 feature 考虑）
- ❌ LaTeX 数学公式渲染
- ❌ 代码执行 / Run in Terminal 按钮
- ❌ 代码块内代码审查评论
- ❌ Markdown 导出（PDF/HTML）

---

## 2. User Scenarios & Testing

### User Story 1 - 查看 AI 生成的结构化答案（Priority: P0）

As a developer, I ask the AI a technical question and receive a structured answer with headings, lists, and code samples that are properly formatted and readable.

**Why this priority**: 这是聊天 UI 的核心使用场景，富文本渲染是基础需求。

**Independent Test**: 发送一个需要结构化回答的技术问题，验证 Markdown 元素正确渲染。

**Acceptance Scenarios**:

1. **Given** 我询问 "如何实现 React Context"，**When** AI 回答包含标题、列表、代码块，**Then** Markdown 格式正确渲染，代码块有语法高亮。
2. **Given** AI 回答包含一个链接，**When** 我点击链接，**Then** 在新标签页打开目标 URL。
3. **Given** AI 回答包含一个表格，**When** 表格渲染完成，**Then** 边框、对齐、表头样式正确。
4. **Given** AI 回答包含块引用（> 开头），**When** 消息显示，**Then** 引用样式正确（左侧竖线、缩进、灰色背景）。

### User Story 2 - 复制代码块（Priority: P0）

As a developer, when the AI generates code for me, I want to copy the entire code block with one click to paste into my editor.

**Why this priority**: 代码复制是开发者最高频的操作之一，节省大量手动选中文本的时间。

**Independent Test**: 生成一段代码，点击复制按钮，粘贴到编辑器验证内容完整正确。

**Acceptance Scenarios**:

1. **Given** 消息中有一段 50 行的代码，**When** 我点击代码块右上角的复制按钮，**Then** 整个代码块内容被复制到剪贴板，不包含 Markdown 标记。
2. **Given** 我刚点击了复制按钮，**When** 复制成功，**Then** 按钮短暂显示 "已复制" 提示后恢复。
3. **Given** 代码块内有特殊字符（制表符、换行、Unicode），**When** 复制后，**Then** 所有特殊字符保持原样。

### User Story 3 - 折叠长代码块（Priority: P1）

As a developer reading a long conversation with multiple large code blocks, I want to collapse individual code blocks so I can focus on the surrounding explanation.

**Why this priority**: 提升长对话的可读性，避免滚动时大段代码干扰阅读。

**Independent Test**: 渲染包含 3 个长代码块的消息，验证每个可独立折叠/展开。

**Acceptance Scenarios**:

1. **Given** 有一个超过 30 行的代码块，**When** 渲染完成，**Then** 代码块显示行数指示器和折叠按钮。
2. **Given** 代码块已折叠，**When** 我点击展开按钮，**Then** 代码块平滑展开显示全部内容。
3. **Given** 代码块已展开，**When** 我点击折叠按钮，**Then** 代码块折叠只显示首行或标题。

### User Story 4 - 流式输出流畅渲染（Priority: P0）

As a developer waiting for the AI's response, I want each word to appear instantly as it streams in, without flickering or re-rendering of content I've already read.

**Why this priority**: 流畅的流式输出是 Claude/ChatGPT 用户体验的标杆，直接影响用户感知速度。

**Independent Test**: 发送一条消息，观察流式渲染过程，测量每个 Token 的渲染延迟。

**Acceptance Scenarios**:

1. **Given** AI 正在流式输出 Markdown 内容，**When** 新 Token 到达，**Then** 新内容立即追加显示，已显示内容不闪烁、不跳动、不重新渲染。
2. **Given** 流式输出正在形成代码块（``` 已出现但尚未闭合），**When** Token 继续追加，**Then** 代码块内内容持续增量渲染，语法高亮随内容增长逐步应用。
3. **Given** 流式输出正在形成列表或表格，**When** 每行/每单元格完成，**Then** 格式正确应用，无布局跳变。
4. **Given** 一条 1000 Tokens 的长消息流式输出完成，**When** 我向上滚动查看开头，**Then** 开头部分的渲染效果与最终状态一致。

### User Story 5 - XSS 安全防护（Priority: P0）

As a security-conscious user, I want to be confident that any malicious script or HTML injected into the AI's response will not execute in my browser.

**Why this priority**: 安全底线。模型输出是不可信来源，必须防止 XSS 攻击。

**Independent Test**: 注入 XSS payload，验证被正确转义而不执行。

**Acceptance Scenarios**:

1. **Given** 模型输出包含 `<script>alert('xss')</script>`，**When** 渲染完成，**Then** 脚本以纯文本显示，不执行。
2. **Given** 模型输出包含 `javascript:` 链接，**When** 点击链接，**Then** 链接不执行，显示为纯文本或被移除。
3. **Given** 模型输出包含 onload/onerror 等事件属性，**When** 渲染完成，**Then** 事件属性被移除。

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-MD-01 | Chat messages SHALL render CommonMark Markdown syntax correctly. |
| FR-MD-02 | Headings (h1-h6) SHALL render with appropriate font sizes and weights. |
| FR-MD-03 | Bold (**) and italic (*) text SHALL render with correct styling. |
| FR-MD-04 | Inline code (`code`) SHALL render with monospace font and distinct background color. |
| FR-MD-05 | Code blocks (```) SHALL render with syntax highlighting for detected language. |
| FR-MD-06 | Unordered and ordered lists SHALL render with proper indentation and markers. |
| FR-MD-07 | Links ([text](url)) SHALL be clickable and open in a new browser tab. |
| FR-MD-08 | Block quotes (>) SHALL render with distinct styling (left border, indent, background). |
| FR-MD-09 | Tables SHALL render with borders, header styling, and proper column alignment. |
| FR-MD-10 | Images (![alt](url)) SHALL render with appropriate sizing and alt text. |
| FR-MD-11 | Horizontal rules (---) SHALL render as visible divider lines. |
| FR-MD-12 | Task lists (- [ ] / - [x]) SHALL render with checkboxes and appropriate strikethrough. |
| FR-HL-01 | Syntax highlighting SHALL support at least 20 programming languages (JavaScript, TypeScript, Python, Java, Go, Rust, C++, C#, PHP, Ruby, etc.). |
| FR-HL-02 | Code blocks SHALL display the detected language name in the header. |
| FR-HL-03 | Code block header SHALL include a one-click "Copy" button. |
| FR-HL-04 | Copy button SHALL show "Copied" confirmation for 2 seconds after clicking. |
| FR-HL-05 | Code blocks over 30 lines SHALL be collapsible with expand/collapse toggle. |
| FR-HL-06 | Line numbers SHALL be displayed in code blocks for readability. |
| FR-ST-01 | Streaming token rendering SHALL be incremental — new tokens are appended without re-rendering existing content. |
| FR-ST-02 | Streaming rendering SHALL maintain 60fps performance — no frame drops during token arrival. |
| FR-ST-03 | Incomplete Markdown structures (open code blocks, open tables, open lists) SHALL degrade gracefully during streaming. |
| FR-ST-04 | When message streaming completes, full Markdown parsing SHALL apply to ensure perfect final rendering. |
| FR-ST-05 | Cursor indicator (typing animation) SHALL be shown while streaming is active. |
| FR-XSS-01 | ALL rendered content SHALL be sanitized to prevent XSS attacks. |
| FR-XSS-02 | Script tags SHALL be removed or escaped entirely. |
| FR-XSS-03 | Event handler attributes (onclick, onload, onerror) SHALL be removed. |
| FR-XSS-04 | javascript: URLs SHALL be stripped or replaced with text only. |
| FR-XSS-05 | iframe, form, input, button, select dangerous HTML tags SHALL be removed. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-MD-01 | Markdown rendering latency from token arrival to display SHALL be < 16ms (60fps). |
| NFR-MD-02 | A 1000-token message complete re-render SHALL take < 100ms. |
| NFR-MD-03 | Memory usage SHALL NOT grow unbounded during long streaming sessions — clean up unused parser state. |
| NFR-MD-04 | Syntax highlighting SHALL be applied asynchronously to avoid blocking the main thread during streaming. |
| NFR-MD-05 | Copy to clipboard SHALL work in both Firefox, Chrome, and Safari. |
| NFR-MD-06 | Markdown rendered output SHALL be accessible — screen readers can read formatted content with proper semantics. |
| NFR-MD-07 | Color contrast in code blocks and syntax highlighting SHALL meet WCAG AA standards. |
| NFR-MD-08 | Code block font SHALL be a readable monospace with appropriate line height and letter spacing. |
| NFR-MD-09 | Streaming partial Markdown SHALL NOT cause layout shifts — reserve space for common structures. |
| NFR-MD-10 | XSS sanitization SHALL NOT introduce noticeable rendering delay (< 1ms per message). |

### 3.3 Key Entities

#### MarkdownNode

- **type**: `text` | `heading` | `paragraph` | `list` | `listItem` | `code` | `codeBlock` | `link` | `image` | `blockquote` | `table` | `tableRow` | `tableCell` | `horizontalRule`
- **content**: string (text content)
- **children**: MarkdownNode[] (nested structure)
- **level**: number (for headings: 1-6)
- **language**: string (for code blocks, detected language)
- **url**: string (for links/images)
- **ordered**: boolean (for lists)
- **checked**: boolean (for task list items)

#### StreamState

- **messageId**: string
- **rawContent**: string (accumulated raw markdown)
- **renderedContent**: MarkdownNode[]
- **isStreaming**: boolean
- **partialStructure**: `none` | `inCodeBlock` | `inTable` | `inList`
- **lastTokenTimestamp**: number

#### SanitizationConfig

- **allowedTags**: string[] (Markdown-safe HTML tags only)
- **allowedAttributes**: Record<string, string[]>
- **addAttr**: (tag: string, attr: string, value: string) => void (e.g., add target="_blank" to links)

---

## 4. Success Criteria

### 4.1 Quantitative

1. **Rendering Performance**: 99% of tokens render within 16ms of arrival (60fps target)
2. **Language Support**: Syntax highlighting works correctly for 20+ programming languages (verified by test suite)
3. **Markdown Coverage**: 100% of CommonMark spec test cases pass rendering verification
4. **XSS Security**: Zero successful script execution in penetration test suite (100+ payloads)
5. **Copy Accuracy**: 100% of code block copy operations produce exact content match (no missing/extra characters)
6. **Frame Rate**: Streaming maintains 60fps even during 10 tokens/second burst rate

### 4.2 Qualitative

1. **User Satisfaction**: Users rate the Markdown rendering experience 4.5/5 or higher in usability testing
2. **No Surprises**: Users report zero instances of "the formatting looked wrong during streaming but fixed at the end"
3. **Accessibility**: Screen reader users can navigate and understand all formatted content
4. **Visual Consistency**: Rendered Markdown matches the visual style of popular chat AI products (Claude, ChatGPT)

---

## 5. Out of Scope

The following features are explicitly NOT included in this feature and will be handled in separate future features:

- Mermaid diagram rendering in code blocks
- LaTeX / mathematical formula rendering
- Code block execution / "Run in Terminal" button
- Code review comments within code blocks
- Markdown editor / WYSIWYG input
- PDF / HTML export functionality
- Syntax theme switching (light/dark only)
- Custom CSS for Markdown styling

---

## 6. Dependencies

### 6.1 Upstream Dependencies

| Dependency | Feature | Purpose |
|------------|---------|---------|
| Web Server | 025-web-server-start | Serves the web UI that displays chat messages |
| Message Input & List | 026-web-message-input | Provides the message bubble component and chat list where Markdown renders |
| Socket.io Streaming | 025 + 026 | Delivers streaming tokens that need incremental rendering |
| XSS Protection | 026-web-message-input | DOMPurify foundation that this feature builds upon |

### 6.2 Downstream Dependencies

| Feature | Depends On | Purpose |
|---------|-----------|---------|
| 028-web-tool-cards | This feature | Tool output often contains code and Markdown that needs rendering |
| 029-web-diff-display | This feature | Diff views use Markdown-like formatting and syntax highlighting |
| 030-web-terminal-output | This feature | Terminal color output shares similar rendering infrastructure |

---

## 7. Assumptions

1. **Markdown Flavor**: CommonMark is the standard flavor; GitHub Flavored Markdown (GFM) extensions (task lists, tables, strikethrough) are included as they're industry standard.
2. **Language Detection**: Code block language is determined by the explicit language tag after ```; auto-detection is a nice-to-have but not required.
3. **Dark Theme Only**: MVP supports only dark theme for syntax highlighting; light theme will be added in a future theming feature.
4. **Mobile Not Required**: As per overall Web MVP, desktop-only focus; mobile responsive layout not required.
5. **Clipboard API**: Modern browser Clipboard API (navigator.clipboard) is available and sufficient; fallback for older browsers is not required.
6. **Image Proxy**: Images from external URLs are loaded directly; no same-origin proxy or CSP bypass needed for MVP.
7. **DOMPurify Reuse**: The DOMPurify wrapper created in 026 is reused and extended for Markdown-specific sanitization rules.

---

## 8. Clarifications

### Session 2026-06-18

- Q: 代码块复制行为 - 行号是否包含在复制内容中？ → A: 行号纯视觉显示，复制时不包含（行业标准行为）
- Q: 外部链接安全属性 → A: 所有外部链接自动添加 `rel="noopener noreferrer"`（Web 安全最佳实践）
- Q: 流式 Markdown 渲染策略 → A: 采用 Claude.ai 同款策略：渐进式解析 + 代码块立即进入高亮模式（无需等待 ``` 闭合），不完整结构先作为纯文本显示
- Q: 内联 HTML 支持策略 → A: B+ 增强白名单：允许 `<b>/<i>/<code>/<pre>/<p>/<span>/<ul>/<ol>/<li>/<blockquote>/<del>/<ins>/<mark>/<small>/<h1>-<h6>/<table>/<thead>/<tbody>/<tr>/<th>/<td>/<br>`，其余转义为纯文本
- Q: 图片加载策略 → A: 完整策略：容器最大宽度限制 + 视口懒加载（viewport lazy loading） + skeleton 灰色占位符 + 加载失败回退显示（破损图片图标 + alt 文本）

