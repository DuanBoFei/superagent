# Feature Specification: Web Terminal Color Output

**Feature**: 030-web-terminal-color-output  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: 高级终端输出可视化：TrueColor (24-bit)、光标定位、备用屏幕、终端事件、交互式应用支持

---

## 1. What & Why

### 1.1 What

本 Feature 实现 Web UI 中完整的终端仿真可视化能力，超越基础 ANSI 颜色支持：

- **完整颜色空间**: 标准 16 色 + 256 色调色板 + TrueColor (24-bit RGB)
- **高级格式**: 粗体、斜体、下划线、删除线、闪烁、反显、隐藏文本
- **光标控制**: 光标定位、隐藏/显示、样式（块/下划线/竖线）
- **备用屏幕**: `less`/`nano`/`vim` 等全屏应用的备用屏幕模式（Alternate Screen Buffer）
- **终端事件**: 鼠标支持、窗口大小变化、BEL 响铃
- **滚动区域**: 可配置滚动缓冲区 + 历史回溯
- **字体系列**: 等宽字体自动降级（Consolas → Monaco → monospace）
- **流式渲染优化**: 增量 DOM 更新、虚拟滚动、行级 memoization

### 1.2 Why

028 的基础 ANSI 解析仅支持 256 色和简单格式，但现代开发工具（`npm test`、`jest --color`、`lsd`、`bat`、`git diff --color`、`rg` 等）广泛使用 TrueColor 和高级终端功能。缺少这些会导致：

- 颜色失真（TrueColor 降级为近似 256 色）
- 光标残留字符
- `less`/`vim` 输出乱码
- 格式化表格对齐错误
- 闪烁/反显等视觉提示丢失

完整的终端仿真确保 Web UI 中的命令输出与本地终端体验一致，消除 Agent 工具链与用户期望之间的视觉差距。

### 1.3 Goals

- ✅ 支持完整终端颜色光谱：16 色 → 256 色 → TrueColor (24-bit)
- ✅ 实现所有标准 SGR (Select Graphic Rendition) 格式代码（0-9, 21-29, 30-39, 40-49, 90-97, 100-107）
- ✅ 光标控制：定位、可见性、样式切换
- ✅ 备用屏幕缓冲区（Alternate Screen Buffer）支持全屏应用
- ✅ 10,000 行滚动缓冲区 + 虚拟滚动保持 60fps
- ✅ 可复用的 `TerminalRenderer` 组件，028 BashCard 和 032 会话历史均可复用

### 1.4 Non-Goals

- ❌ 终端输入仿真（MVP 仅输出渲染，不支持键盘交互）
- ❌ 完整 PTY（Pseudo-Terminal）进程管理（由后端处理）
- ❌ 终端主题自定义（仅深色主题，符合整体 UI）
- ❌ 分屏 / 标签页等高级终端功能
- ❌ 鼠标交互（除滚动外）
- ❌ Unicode 双宽字符精确对齐（Emoji / CJK 近似处理）

---

## 2. User Scenarios & Testing

### User Story 1 - TrueColor 命令输出 (Priority: P0)

As a developer running test suites with colorized reporters (Jest/Vitest), I want to see exact 24-bit RGB colors in my terminal output, so I can distinguish test results (pass/fail/pending) with the same visual fidelity as my local terminal.

**Why this priority**: 测试输出是最常用的 TrueColor 场景，颜色保真度直接影响可读性。

**Independent Test**: 执行 `vitest --color` 输出，验证红绿黄蓝等颜色的精确 RGB 渲染。

**Acceptance Scenarios**:

1. **Given** 测试输出包含 `\x1b[38;2;R;G;Bm` TrueColor 序列，**When** 渲染，**Then** 显示精确的 RGB 颜色而非近似 256 色。
2. **Given** 输出包含背景色 `\x1b[48;2;R;G;Bm`，**When** 渲染，**Then** 背景色正确应用且文本对比度达标。
3. **Given** 256 色调色板颜色（`\x1b[38;5;Nm`），**When** 渲染，**Then** 使用标准 256 色调色板映射表。
4. **Given** 标准 16 色（30-37 / 90-97），**When** 渲染，**Then** 使用设计系统定义的终端色板（与深色主题一致）。

### User Story 2 - 高级文本格式 (Priority: P0)

As a developer reading formatted CLI output, I want all text formatting (bold, italic, underline, strikethrough, inverse, blink) to render correctly, so I can understand semantic emphasis and structural cues in the output.

**Why this priority**: 格式是 CLI 语义的重要载体，丢失格式等于丢失信息。

**Independent Test**: 执行 `ls -la --color=always` + `git log --oneline --decorate --color`，验证所有格式正确。

**Acceptance Scenarios**:

1. **Given** 输出包含粗体 (`1`)、淡色 (`2`)、斜体 (`3`)、单下划线 (`4`)、闪烁 (`5`)、反显 (`7`)、隐藏 (`8`)、删除线 (`9`)，**When** 渲染，**Then** 每种格式正确应用。
2. **Given** 双下划线 (`21: seldom used`)、 curly underline (`4:25`)，**When** 渲染，**Then** 优雅降级为单下划线或无格式。
3. **Given** 格式重置 (`0`)，**When** 遇到重置代码，**Then** 所有属性清除，后续文本恢复默认样式。
4. **Given** 嵌套格式组合（粗体 + 红色 + 下划线），**When** 渲染，**Then** 所有属性同时生效。

### User Story 3 - 光标控制与全屏应用 (Priority: P1)

As a developer using pagers (`less`, `more`) or terminal editors (`nano`, `vim -c ":q"`) through the agent, I want cursor positioning and screen clearing codes to work correctly, so I see clean full-screen output instead of garbage characters.

**Why this priority**: 全屏应用是常见的高级用例，失败则完全不可读。

**Independent Test**: 执行 `git diff | less -R`，验证分页器正确渲染无乱码。

**Acceptance Scenarios**:

1. **Given** 输出包含清屏 (`\x1b[H\x1b[2J`)，**When** 渲染，**Then** 清空当前可见区域，光标移到左上角。
2. **Given** 输出包含光标定位 (`\x1b[row;colH`)，**When** 渲染，**Then** 后续内容从指定行列开始。
3. **Given** 输出进入备用屏幕 (`\x1b[?1049h`)，**When** 渲染，**Then** 创建独立缓冲区，不污染主滚动历史。
4. **Given** 输出退出备用屏幕 (`\x1b[?1049l`)，**When** 渲染，**Then** 恢复主屏幕，备用屏幕内容保留为可折叠区块。
5. **Given** 光标隐藏 (`\x1b[?25l`) / 显示 (`\x1b[?25h`)，**When** 渲染，**Then** 光标可见性正确切换。

### User Story 4 - 大型滚动输出性能 (Priority: P1)

As a developer watching a long build process, I want thousands of lines of terminal output to scroll smoothly without UI jank, so I can monitor progress in real-time.

**Why this priority**: 长构建输出是常见的性能瓶颈，卡顿严重破坏实时监控体验。

**Independent Test**: 流式输出 10,000 行带颜色的构建日志，测量帧率和内存增长。

**Acceptance Scenarios**:

1. **Given** 终端输出 > 500 行，**When** 滚动，**Then** 自动启用虚拟滚动，保持 60fps。
2. **Given** 10,000 行输出完成，**When** 检查内存，**Then** DOM 节点数 < 200（虚拟滚动回收不可见行）。
3. **Given** 流式输出持续到达，**When** 更新，**Then** 仅增量追加新行，不重绘已渲染内容。
4. **Given** 输出包含 BEL 字符 (`\x07`)，**When** 遇到，**Then** 播放系统通知声音或视觉闪烁提示。

### User Story 5 - 终端事件与交互 (Priority: P2)

As a developer, I want terminal-specific events (resize, click, scroll) to be handled gracefully, so the output remains readable during window size changes.

**Why this priority**: 边缘优化，不影响核心可读性，但提升专业感。

**Acceptance Scenarios**:

1. **Given** 浏览器窗口调整大小，**When** 终端容器宽度变化，**Then** 自动换行重新计算，文本不溢出。
2. **Given** 终端容器宽度 < 80 列，**When** 渲染表格输出，**Then** 显示"终端宽度不足"提示 + 水平滚动。
3. **Given** 用户点击终端输出，**When** 选择文本，**Then** 选择包含完整格式（复制时纯文本，保留换行）。
4. **Given** 输出包含超链接 (`\x1b]8;;url\x1b\\text\x1b]8;;\x1b\\`)，**When** 渲染，**Then** 显示为可点击链接，新标签页打开。

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-TERM-01 | Terminal renderer SHALL support all three color spaces: standard 16 colors (SGR 30-37, 90-97), 256-color palette (SGR 38;5;N), and TrueColor 24-bit RGB (SGR 38;2;R;G;B). |
| FR-TERM-02 | Background colors SHALL be supported across all color spaces (SGR 40-47, 100-107, 48;5;N, 48;2;R;G;B). |
| FR-TERM-03 | All core SGR formatting codes SHALL be supported: 0 (reset), 1 (bold), 2 (dim), 3 (italic), 4 (underline), 5 (blink), 7 (inverse), 8 (hidden), 9 (strikethrough). |
| FR-TERM-04 | Terminal renderer SHALL support cursor positioning: absolute (row, col) and relative (up, down, forward, back). |
| FR-TERM-05 | Terminal renderer SHALL support Alternate Screen Buffer: enter (CSI ?1049h) creates separate buffer, exit (CSI ?1049l) restores main screen. |
| FR-TERM-06 | Screen clearing codes SHALL be supported: erase entire display (2J), erase to end of line (0K), erase from start of line (1K), erase entire line (2K). |
| FR-TERM-07 | Terminal renderer SHALL maintain a scrollback buffer of at least 10,000 lines. |
| FR-TERM-08 | Virtual scrolling SHALL activate automatically when line count exceeds 500, maintaining 60fps. |
| FR-TERM-09 | Incremental streaming updates SHALL only render new / changed lines, never re-render entire buffer. |
| FR-TERM-10 | Terminal output SHALL be selectable and copyable as plain text with correct line breaks. |
| FR-TERM-11 | Hyperlink OSC 8 sequences SHALL render as clickable `<a>` tags opening in new tab. |
| FR-TERM-12 | BEL character (0x07) SHALL trigger a visual indicator (terminal flash) and optional audio notification. |
| FR-TERM-13 | Terminal SHALL use monospace font stack with fallbacks: Consolas → Monaco → "Fira Code" → "Source Code Pro" → monospace. |
| FR-TERM-14 | Line height SHALL be 1.2 × font size for proper vertical spacing and character alignment. |
| FR-TERM-15 | Terminal SHALL automatically wrap lines that exceed container width. |
| FR-TERM-16 | Terminal SHALL handle window resize events, recalculating line wraps on dimension change. |
| FR-TERM-17 | Alternate screen buffer content SHALL be preserved as a collapsible section in the main scrollback after exit. |
| FR-TERM-18 | Cursor visibility SHALL be controllable via CSI ?25l (hide) and CSI ?25h (show). |
| FR-TERM-19 | Terminal SHALL support carriage return (\r) without newline for progress bar / spinner animations. |
| FR-TERM-20 | Tab characters (\t) SHALL render as 8 spaces or aligned to 8-character tab stops. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-TERM-01 | 1,000 lines of colored terminal output SHALL render in < 100ms. |
| NFR-TERM-02 | 10,000 lines of terminal output SHALL render in < 500ms with virtual scrolling active. |
| NFR-TERM-03 | Scrolling through terminal output SHALL maintain ≥ 60fps at all times. |
| NFR-TERM-04 | Streaming updates SHALL process ≥ 100 lines/second without UI blocking. |
| NFR-TERM-05 | Virtual scrolling SHALL recycle DOM nodes, maintaining < 200 total rendered lines regardless of buffer size. |
| NFR-TERM-06 | ANSI parser SHALL process ≥ 1 MB/second of escape sequences. |
| NFR-TERM-07 | Memory growth SHALL be ≤ 10 MB per 1,000 lines of formatted output. |
| NFR-TERM-08 | All foreground/background color combinations SHALL meet WCAG AA 4.5:1 contrast ratio (auto-adjust dark colors if needed). |
| NFR-TERM-09 | Terminal renderer SHALL be fully reusable: imported by both BashCard (028) and Session History Sidebar (032). |
| NFR-TERM-10 | Parser SHALL gracefully handle invalid / malformed escape sequences without crashing or leaking unparsed text. |

### 3.3 Key Entities

#### TerminalColorSpace

- **type**: `'16color' | '256color' | 'truecolor'`

#### TerminalAttributes

- **foreground**: `{ r, g, b } | null` (TrueColor 或调色板索引映射后的 RGB)
- **background**: `{ r, g, b } | null`
- **bold**: `boolean`
- **dim**: `boolean`
- **italic**: `boolean`
- **underline**: `boolean`
- **blink**: `boolean`
- **inverse**: `boolean`
- **hidden**: `boolean`
- **strikethrough**: `boolean`

#### TerminalCell

- **char**: `string` (单个 Unicode 字符，支持 emoji)
- **attributes**: `TerminalAttributes`
- **width**: `1 | 2` (单宽 / 双宽字符，CJK / Emoji 为 2)

#### TerminalLine

- **cells**: `TerminalCell[]`
- **isWrapped**: `boolean` (是否为上一行自动换行的延续)
- **timestamp**: `number` (流式输出时的到达时间)

#### TerminalBuffer

- **lines**: `TerminalLine[]`
- **cursorX**: `number`
- **cursorY**: `number`
- **cursorVisible**: `boolean`
- **currentAttributes**: `TerminalAttributes`
- **scrollbackSize**: `number` (最大保留行数)
- **isAlternateScreen**: `boolean`

#### TerminalEvent

- **type**: `'bell' | 'resize' | 'alternate-screen-enter' | 'alternate-screen-exit' | 'hyperlink-click'`
- **payload**: `unknown` (事件特定数据)

---

## 4. Success Criteria

### 4.1 Quantitative

1. **Rendering Speed**: 1,000 lines render in < 100ms, 10,000 lines in < 500ms.
2. **Scrolling Performance**: 60fps maintained through entire 10,000 line buffer.
3. **Color Coverage**: 100% of SGR color codes (30-37, 40-47, 90-97, 100-107, 38;5, 48;5, 38;2, 48;2) correctly rendered.
4. **Format Coverage**: All 9 core SGR formatting codes (0,1,2,3,4,5,7,8,9) correctly applied.
5. **Parser Throughput**: ≥ 1 MB/second escape sequence processing.
6. **Virtual Scroll Efficiency**: DOM nodes maintained at < 200 regardless of buffer size.
7. **Memory Efficiency**: ≤ 10 MB per 1,000 lines of formatted output.
8. **Contrast Compliance**: 100% of auto-generated color combinations meet WCAG AA 4.5:1.

### 4.2 Qualitative

1. **Visual Parity**: Side-by-side comparison with iTerm2 / Windows Terminal shows indistinguishable color rendering.
2. **Full-Screen Apps**: `less`, `git diff | less`, `nano` output renders cleanly with no garbage characters.
3. **Build Output Readability**: `npm run build` / `cargo build` color-coded warnings and errors are as readable as local terminal.
4. **Reusability**: Component is drop-in usable by both BashCard (028) and Session History (032) without modification.
5. **Graceful Degradation**: Unsupported escape sequences are silently ignored without breaking layout.

---

## 5. Out of Scope

The following features are explicitly NOT included and will be handled in separate future features:

- **Terminal Input**: Keyboard input, interactive sessions (typing in the terminal) - requires full PTY integration
- **Multiple Tabs / Panes**: Terminal multiplexer features
- **Scrollback Search**: Find-in-terminal functionality
- **Terminal Themes**: Light theme support, custom color schemes
- **Mouse Interaction**: Clickable UI elements beyond hyperlinks
- **Bidirectional Text**: RTL / complex script layout
- **Unicode grapheme clustering**: Emoji ZWJ sequences, combining marks (basic emoji work, complex sequences may have width miscalculation)
- **Sixel / iTerm2 inline images**: Graphic rendering in terminal
- **Clipboard integration OSC 52**: Copy to system clipboard via escape codes

---

## 6. Dependencies

### 6.1 Upstream Dependencies

| Dependency | Feature | Purpose |
|------------|---------|---------|
| React + TypeScript | Base tech stack | Component implementation language |
| Zustand Store | 026-web-message-input | State management for terminal instances |
| Virtual Scroll Hook | 026-web-message-input | Reuse useVirtualScroll for terminal scrolling |
| BashCard | 028-web-tool-cards | Integration target - BashCard uses new TerminalRenderer |
| useCopyToClipboard | 027-web-chat-stream | Copy terminal output to clipboard |

### 6.2 Downstream Dependencies

| Feature | Depends On | Purpose |
|---------|-----------|---------|
| 032-web-session-history-sidebar | This feature | Reuses TerminalRenderer for replaying past terminal output |
| 033-web-terminal-interactive | This feature | Builds on renderer to add keyboard input / full PTY mode |

---

## 7. Assumptions

1. **Dark Theme Only**: MVP assumes dark theme background (#1e1e1e). Color palettes are optimized for dark backgrounds. Light theme support deferred.
2. **Monospace Font Required**: All terminal content renders in monospace. Proportional fonts are not supported.
3. **UTF-8 Only**: Input is assumed to be valid UTF-8. Other encodings may display incorrectly.
4. **8-Character Tab Stops**: Standard Unix convention. Configurable tab stops are out of scope.
5. **No Persistence**: Terminal buffer is ephemeral per card. Persisting full terminal state across sessions is handled by 032-session-history.
6. **CSS `white-space: pre`**: All spacing relies on CSS preformatted text. JavaScript-based spacing is avoided.
7. **Blink Rate**: If implemented, CSS animation at 1Hz (500ms on, 500ms off) matching xterm convention.

---

## 8. Clarifications

### Session 2026-06-18

[NO CLARIFICATIONS NEEDED YET - This section will be populated during the clarify phase.]
