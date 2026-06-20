# Implementation Tasks: Web Terminal Color Output

**Feature**: 030-web-terminal-color-output
**Total Tasks**: 22
**Parallel Groups**: 5

**Design Sources for all [FE] tasks**:
- Root `DESIGN.md` sections: Brand & Style, Typography, Layout & Spacing, Elevation & Depth, Components
- Visual sample: `specs/design-reference/stitch-export/superagent_terminal/`
- Component baseline: React + project Web UI components; terminal/code output must follow the terminal-output guidance in root `DESIGN.md`

---

## Task List

### 并行组 A: 核心 Parser + Buffer (7 任务，可独立并行)

#### T001 [BE]: 创建 Terminal TypeScript 类型定义

- **FR 来源**: FR-TERM-01 ~ FR-TERM-20
- **依赖**: 无
- **目标**: 完整的终端类型系统，与 spec Key Entities 完全对应
- **任务内容**:
  1. 创建 `packages/web/src/types/terminal.ts`
  2. 定义 `TerminalColorSpace` 类型：`'16color' | '256color' | 'truecolor'`
  3. 定义 `TerminalAttributes` 接口（foreground/background RGB + bold/dim/italic/underline/blink/inverse/hidden/strikethrough）
  4. 定义 `TerminalCell` 接口（char + attributes + width）
  5. 定义 `TerminalLine` 接口（cells + isWrapped + timestamp）
  6. 定义 `TerminalBuffer` 接口（lines + cursorX + cursorY + cursorVisible + currentAttributes + scrollbackSize + isAlternateScreen）
  7. 定义 `TerminalEvent` 类型（bell/resize/alternate-screen-enter/exit 等）
- **验证方式**: TypeScript strict mode 编译零错误
- **预计时间**: 1 hr

#### T002 [BE]: 实现 ANSI 颜色映射表

- **FR 来源**: FR-TERM-01, FR-TERM-02
- **依赖**: T001
- **目标**: 16色 / 256色 / TrueColor → RGB 精确映射
- **任务内容**:
  1. 创建 `packages/web/src/lib/ansi-parser/colors.ts`
  2. 标准 16 色板映射（0-15）：黑/红/绿/黄/蓝/品红/青/白 + 亮版
  3. 256 色调色板映射（16-255）：6×6×6 颜色立方体 + 24 级灰度
  4. TrueColor (24-bit RGB) 解析函数（SGR 38;2;R;G;B 和 48;2;R;G;B）
  5. 深色主题优化的色板变体（与整体 UI 协调）
- **验证方式**: 单元测试：所有 256 色 → RGB 映射正确，TrueColor 解析正确
- **预计时间**: 1.5 hr

#### T003 [BE]: 实现 SGR 格式代码处理器

- **FR 来源**: FR-TERM-03
- **依赖**: T001, T002
- **目标**: 完整支持 SGR 0-107 代码，正确合并 TerminalAttributes
- **任务内容**:
  1. 创建 `packages/web/src/lib/ansi-parser/sgr.ts`
  2. 实现 0（重置）、1（粗体）、2（淡色）、3（斜体）、4（下划线）
  3. 实现 5（闪烁）、7（反显）、8（隐藏）、9（删除线）
  4. 实现 21-29（关闭对应格式）
  5. 实现 30-37（前景 16 色）、40-47（背景 16 色）
  6. 实现 90-97（亮前景）、100-107（亮背景）
  7. 实现 38（256色/TrueColor 前景）、48（256色/TrueColor 背景）
  8. 属性合并逻辑：reset 清除所有，其他代码增量更新
- **验证方式**: 单元测试：所有 SGR 代码正确解析，属性合并正确
- **预计时间**: 2 hr

#### T004 [BE]: 实现光标控制器

- **FR 来源**: FR-TERM-04, FR-TERM-18
- **依赖**: T001
- **目标**: CSI 光标定位、移动、可见性控制
- **任务内容**:
  1. 创建 `packages/web/src/lib/ansi-parser/cursor.ts`
  2. 绝对定位：CSI row;colH ( CUP )
  3. 相对移动：CSI nA (上)、CSI nB (下)、CSI nC (右)、CSI nD (左)
  4. 行首移动：CSI nE (下 n 行行首)、CSI nF (上 n 行行首)
  5. 列定位：CSI nG (绝对列)
  6. 光标可见性：CSI ?25l (隐藏)、CSI ?25h (显示)
  7. 保存/恢复：CSI s (保存)、CSI u (恢复)
  8. 边界保护：光标不超出 buffer 范围
- **验证方式**: 单元测试：各种光标移动后坐标正确，边界不越界
- **预计时间**: 1.5 hr

#### T005 [BE]: 实现屏幕管理器（清屏 + 备用屏幕）

- **FR 来源**: FR-TERM-05, FR-TERM-06
- **依赖**: T001
- **目标**: 清屏、擦行、备用屏幕切换、滚动区域设置
- **任务内容**:
  1. 创建 `packages/web/src/lib/ansi-parser/screen.ts`
  2. 清屏：CSI 0J (光标到屏尾)、CSI 1J (屏首到光标)、CSI 2J (全屏)
  3. 擦行：CSI 0K (光标到行尾)、CSI 1K (行首到光标)、CSI 2K (整行)
  4. 备用屏幕：CSI ?1049h (进入)、CSI ?1049l (退出 + 恢复)
  5. 滚动区域：CSI top;bottomr (设置滚动区域)
  6. 滚动：CSI nS (上滚)、CSI nT (下滚)
  7. 备用屏幕退出时保存内容供后续折叠显示
- **验证方式**: 单元测试：清屏/擦行范围正确，备用屏幕切换状态正确
- **预计时间**: 2 hr

#### T006 [BE]: 实现 OSC 处理器（超链接）

- **FR 来源**: FR-TERM-11
- **依赖**: T001
- **目标**: OSC 8 超链接序列解析与存储
- **任务内容**:
  1. 创建 `packages/web/src/lib/ansi-parser/osc.ts`
  2. OSC 8 序列解析：`]8;;url\`text`]8;;\``
  3. ID 参数解析（可选的 `id=...`）
  4. 链接范围跟踪：开始 → 文本 → 结束
  5. 支持同链接 ID 跨多行
- **验证方式**: 单元测试：超链接正确解析，跨行链接正确
- **预计时间**: 1 hr

#### T007 [BE]: 实现 ANSI Parser 入口 + TerminalBuffer

- **FR 来源**: FR-TERM-07, FR-TERM-09, FR-TERM-19, FR-TERM-20
- **依赖**: T002, T003, T004, T005, T006
- **目标**: 增量流式解析器 + TerminalBuffer 数据结构
- **任务内容**:
  1. 创建 `packages/web/src/lib/ansi-parser/index.ts`
  2. 状态机解析：正常文本 → ESC 开始 → CSI/OSC 判断 → 参数收集 → 执行
  3. 增量 `append(bytes)` 方法（不缓存全量输入）
  4. 未识别序列优雅降级（静默忽略或显示 ?）
  5. 创建 `packages/web/src/lib/terminal-buffer.ts`
  6. TerminalBuffer：行追加、插入、滚动、光标移动、属性继承
  7. Tab 字符处理（8 空格对齐）
  8. 回车(\r) 不换行，行首覆盖（进度条动画支持）
  9. 最大 scrollback 行数（默认 10000）
  10. 备用屏幕双缓冲区（mainBuffer + altBuffer）切换
- **验证方式**: 单元测试：流式解析正确，增量更新不重绘，buffer 滚动正确
- **预计时间**: 3 hr

---

### 并行组 B: 基础渲染 (4 任务，依赖 A)

#### T008 [INT]: 实现 WCAG 对比度自动调整

- **FR 来源**: NFR-TERM-08
- **依赖**: T001
- **目标**: 前景/背景色对比度检测，自动调整暗色保证 4.5:1
- **任务内容**:
  1. 创建 `packages/web/src/lib/color-contrast.ts`
  2. RGB → sRGB luminance 转换算法
  3. 对比度 ratio 计算：(L1 + 0.05) / (L2 + 0.05)
  4. 自动调整算法：ratio < 4.5 时，逐步调亮前景色
  5. 保留用户配置开关：`enableContrastAdjustment` prop
- **验证方式**: 单元测试：所有 16 色 + 典型暗色组合 ≥ 4.5:1
- **预计时间**: 1.5 hr

#### T009 [FE]: 实现 TerminalLine 单行渲染组件

- **FR 来源**: FR-TERM-01 ~ FR-TERM-03, FR-TERM-11, FR-TERM-13, FR-TERM-14
- **依赖**: T001, T008
- **目标**: cells → spans with inline styles，正确渲染所有格式
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/terminal/TerminalLine.tsx`
  2. Foreground/background color: RGB 直接内联 style
  3. Bold: `font-weight: 700`
  4. Dim: `opacity: 0.7`
  5. Italic: `font-style: italic`
  6. Underline: `text-decoration: underline`
  7. Blink: CSS `animation: blink 1s step-end infinite`（默认禁用，`enableBlink` prop 开启）
  8. Inverse: 交换前景/背景色
  9. Hidden: `visibility: hidden`
  10. Strikethrough: `text-decoration: line-through`
  11. 超链接：`<a>` 标签，`target="_blank"`，悬停显示 URL
  12. 等宽字体 stack：Consolas → Monaco → "Source Code Pro" → monospace
  13. Line height: 1.2 × font-size
- **验证方式**: 组件测试：所有格式正确渲染，超链接可点击，字体正确
- **预计时间**: 2 hr

#### T010 [FE]: 实现 TerminalCursor 光标组件

- **FR 来源**: FR-TERM-04, FR-TERM-18
- **依赖**: T001
- **目标**: 块/下划线/竖线三种光标样式，可见性控制
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/terminal/TerminalCursor.tsx`
  2. Block 样式：实心背景块，文字反色
  3. Underline 样式：底部 2px 下划线
  4. Bar 样式：左侧 2px 竖线
  5. 隐藏状态：不渲染
  6. 闪烁动画（默认禁用，同 blink 格式）
- **验证方式**: 组件测试：光标样式正确，可见性切换正确
- **预计时间**: 1 hr

#### T011 [INT]: TerminalRenderer 主组件 + Zustand Store 集成

- **FR 来源**: FR-TERM-07 ~ FR-TERM-10, FR-TERM-15, FR-TERM-16
- **依赖**: T007, T009, T010
- **目标**: 聚合所有子组件，流式输入处理，基础渲染（无虚拟滚动）
- **任务内容**:
  1. 创建 `packages/web/src/store/slices/terminal.slice.ts`
  2. State: buffers（多实例）、currentBufferId、cursorStyle、fontSize
  3. Actions: createBuffer / destroyBuffer / appendToBuffer / setCursorStyle
  4. 集成到主 store index.ts
  5. 创建 `packages/web/src/components/chat/terminal/TerminalRenderer.tsx`
  6. Props: stream (string | ReadableStream)、maxLines、fontSize、enableBell、enableAlternateScreen
  7. 流式输入处理：ReadableStream 分块解析 append
  8. 渲染所有行：map TerminalLine 组件
  9. 渲染光标：TerminalCursor 定位到 cursorX/Y
  10. 自动换行 CSS：`overflow-wrap: anywhere`
  11. ResizeObserver 监听容器宽度变化，重算换行
- **验证方式**: 组件测试：流式输入正确渲染，多行显示正确，光标位置正确
- **预计时间**: 2.5 hr

---

### 并行组 C: 高级功能 (4 任务，可并行，依赖 A+B)

#### T012 [FE]: 备用屏幕支持 + AlternateScreenBanner 组件

- **FR 来源**: FR-TERM-05, FR-TERM-17
- **依赖**: T007, T011
- **目标**: 进入/退出备用屏幕，退出后折叠显示备用屏幕内容
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/terminal/AlternateScreenBanner.tsx`
  2. "全屏应用输出已保存，点击展开" 提示条
  3. 点击展开/折叠备用屏幕内容
  4. 备用屏幕内容样式：稍暗背景 + 边框
  5. TerminalBuffer 中保存 altBuffer 内容
  6. 退出备用屏幕时触发事件，Banner 自动显示
- **验证方式**: 组件测试：进入/退出备用屏幕后 Banner 显示正确，展开/折叠正常
- **预计时间**: 1.5 hr

#### T013 [FE]: BEL 响铃处理 + TerminalFlash 组件

- **FR 来源**: FR-TERM-12
- **依赖**: T007, T011
- **目标**: BEL 字符触发视觉闪烁 + 可选声音通知
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/terminal/TerminalFlash.tsx`
  2. 视觉闪烁：白色背景闪烁 100ms（遵循 `prefers-reduced-motion`）
  3. 声音通知：默认禁用，`enableBellSound` prop 开启
  4. 冷却机制：1 秒内连续 BEL 只触发一次
  5. Parser 遇到 BEL (\x07) 时 emit bell 事件
- **验证方式**: 组件测试：BEL 触发闪烁，冷却机制生效
- **预计时间**: 1 hr

#### T014 [FE]: 文本选择 + 复制功能

- **FR 来源**: FR-TERM-10
- **依赖**: T011
- **目标**: 终端输出可选择，复制为纯文本保留换行和空格
- **任务内容**:
  1. TerminalRenderer 中启用 `user-select: text`
  2. 保留原始换行和空格：CSS `white-space: pre`
  3. 跨行选择：选中多 cell 时正确拼接字符
  4. 复制快捷键：Ctrl/Cmd + C 正常工作
  5. 右键菜单："Copy" 选项
  6. 与浏览器查找 (Ctrl+F) 兼容：可视区域文本可被查找
- **验证方式**: 集成测试：选中多行复制，剪贴板内容与显示一致
- **预计时间**: 1.5 hr

#### T015 [INT]: useTerminalBuffer + useTerminalParser hooks

- **FR 来源**: FR-TERM-09, FR-TERM-15, FR-TERM-16
- **依赖**: T007, T011
- **目标**: React 友好的 buffer 管理和流式解析 hook
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-terminal-buffer.ts`
  2. buffer 状态管理，行追加/滚动事件订阅
  3. 备用屏幕切换事件监听
  4. 创建 `packages/web/src/hooks/use-terminal-parser.ts`
  5. 封装流式输入处理，自动调用 parser.append
  6. ReadableStream 和 string 双支持
  7. Resize 时自动触发换行重算
- **验证方式**: 单元测试：hooks 状态正确，事件正确触发
- **预计时间**: 1.5 hr

---

### 并行组 D: 性能优化 + 虚拟滚动 (3 任务，依赖 A+B+C)

#### T016 [INT]: 实现 useTerminalVirtualScroll hook

- **FR 来源**: FR-TERM-08, NFR-TERM-03, NFR-TERM-05
- **依赖**: T015, 026 useVirtualScroll
- **目标**: 终端专用虚拟滚动，>500 行自动启用，DOM 节点 < 200
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-terminal-virtual-scroll.ts`
  2. 复用 026 的 useVirtualScroll hook 核心逻辑
  3. 终端适配：固定行高（fontSize × lineHeight）
  4. 500 行阈值自动启用/禁用
  5. 行级回收：仅渲染可视区域 ± buffer
  6. 滚动位置保持：内容追加时自动 scroll to bottom（如果用户在底部）
  7. ResizeObserver 容器尺寸变化重算
- **验证方式**: 性能测试：10000 行 DOM 节点 < 200，滚动 60fps
- **预计时间**: 2 hr

#### T017 [FE]: 实现 TerminalViewport 视口组件

- **FR 来源**: FR-TERM-08, NFR-TERM-01, NFR-TERM-02
- **依赖**: T016, T009, T010
- **目标**: 聚合虚拟滚动 + 行渲染 + 光标
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/terminal/TerminalViewport.tsx`
  2. 集成 useTerminalVirtualScroll
  3. 仅渲染可视区域内的 TerminalLine
  4. 光标定位：在可视区域内正常渲染，不可见时隐藏
  5. 行级 memoization：React.memo(TerminalLine)，仅 timestamp 变化重绘
  6. 增量渲染：新追加的行只 render 新行，不重绘已存在行
  7. 滚动到最新行：内容追加时自动 scroll to bottom（如果用户在底部）
- **验证方式**: 性能测试：1000 行 < 100ms，10000 行 < 500ms
- **预计时间**: 2 hr

#### T018 [INT]: 性能基准测试套件

- **FR 来源**: NFR-TERM-01 ~ NFR-TERM-07
- **依赖**: T017
- **目标**: 自动化性能测试，保证所有 NFR 达标
- **任务内容**:
  1. Parser 吞吐量测试：1MB 随机 ANSI 文本解析计时（目标 ≥ 1MB/s）
  2. 1000 行渲染基准：mount 时间 < 100ms
  3. 10000 行渲染基准：mount 时间 < 500ms
  4. 滚动帧率测试：PerformanceObserver 测量 10 次完整滚动 ≥ 60fps
  5. 内存测试：1000 行内存增长 ≤ 10MB
  6. 流式更新测试：100 lines/s 输入无 UI 阻塞
  7. 性能报告生成：JSON 格式供 CI 使用
- **验证方式**: vitest bench 全部通过
- **预计时间**: 1.5 hr

---

### 并行组 E: 完善 + 集成 (4 任务，串行，依赖所有)

#### T019 [INT]: BashCard 完整集成 + fallback 逻辑

- **FR 来源**: 028 BashCard 集成
- **依赖**: T011, T017
- **目标**: 用新 TerminalRenderer 替换 028 中的基础 ANSI 渲染
- **任务内容**:
  1. 修改 `packages/web/src/components/chat/cards/BashCard.tsx`
  2. 移除旧的简单 ANSI 渲染逻辑
  3. 集成 TerminalRenderer 组件
  4. Props 配置：`maxLines={10000}`、`virtualScrollThreshold={500}`
  5. Fallback 逻辑：解析严重错误时降级到纯文本显示
  6. 视觉回归测试：与旧渲染器输出对比
- **验证方式**: 集成测试：BashCard 渲染正确，新旧对比无功能回归
- **预计时间**: 2 hr

#### T020 [FE]: 可访问性优化

- **FR 来源**: NFR-TERM-08
- **依赖**: T011, T017
- **目标**: WCAG AA 达标，完整键盘导航，屏幕阅读器支持
- **任务内容**:
  1. 所有颜色组合 axe-core 自动化测试，确保 ≥ 4.5:1
  2. 键盘导航：Tab 聚焦终端区域，方向键滚动，Home/End 跳首尾
  3. ARIA label：`role="log"` + `aria-label="Terminal output"`
  4. `aria-live="polite"`：新内容自动播报
  5. `prefers-reduced-motion`：禁用 blink 和 flash 动画
  6. 焦点管理：明确的 focus ring，键盘操作可见
- **验证方式**: axe-core 零错误，键盘全操作可达，屏幕阅读器测试
- **预计时间**: 1.5 hr

#### T021 [FE]: 深色主题样式统一 + CJK/Emoji 宽度处理

- **FR 来源**: FR-TERM-13, FR-TERM-14
- **依赖**: T009, T011
- **目标**: 终端样式与整体深色主题协调，双宽字符对齐
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/terminal/terminal.css`
  2. 终端背景色：与卡片背景一致（#1e1e1e）
  3. 边框、内边距、滚动条样式统一
  4. CJK 字符宽度近似：中文/日文/韩文/emoji 按 2 字符宽度处理
  5. 字体 fallback：确保 emoji 字体可用（Segoe UI Emoji, Apple Color Emoji）
  6. 行高精确计算：避免中英文混排行高不一致
- **验证方式**: 视觉测试：样式与整体 UI 一致，CJK 文本对齐可接受
- **预计时间**: 1.5 hr

#### T022 [INT]: 完整测试覆盖

- **FR 来源**: All FRs + NFRs
- **依赖**: T019, T020, T021
- **目标**: 单元 + 组件 + 集成 + 性能 + 可访问性测试全覆盖
- **任务内容**:
  1. ANSI Parser 单元测试：SGR 0-107 全量，256/TrueColor，光标，清屏/擦行，备用屏幕
  2. TerminalBuffer 单元测试：行追加/插入/滚动/属性继承/光标边界
  3. Color Contrast 单元测试：所有 16 色 + 256 色 + 典型 TrueColor 组合
  4. Width Calculation 单元测试：ASCII=1, CJK=2, Emoji=2
  5. TerminalLine 组件测试：纯文本/格式/嵌套/超链接/Emoji/CJK
  6. TerminalRenderer 组件测试：流式渲染/自动换行/光标定位
  7. TerminalViewport 组件测试：虚拟滚动阈值/DOM 节点数/滚动位置
  8. 集成测试：`git diff | less` 备用屏幕、`ls --color` 颜色、`npm test` TrueColor
  9. 性能基准测试：全部达标（1000 行 / 10000 行 / 滚动 / parser 吞吐量）
  10. 可访问性测试：axe-core 零错误
  11. 视觉回归测试： Percy / snapshot 测试
- **验证方式**: vitest 所有测试通过，核心覆盖率 ≥ 90%，所有性能指标达标
- **预计时间**: 3 hr

---

## 开发顺序与依赖图

```
Phase 1 (完全并行):
  A1: T001 (types)
  A2: T002 (colors mapping)
  A3: T003 (SGR processor)
  A4: T004 (cursor controller)
  A5: T005 (screen manager)
  A6: T006 (OSC hyperlinks)
  A7: T007 (ANSI Parser + TerminalBuffer)

Phase 2 (部分并行，依赖 A1-A7):
  B1: T008 (color contrast) ← 仅依赖 A1，可提前开始
  B2: T009 (TerminalLine)
  B3: T010 (TerminalCursor)
  B4: T011 (TerminalRenderer + store slice)

Phase 3 (完全并行，依赖 A+B):
  C1: T012 (AlternateScreen + Banner)
  C2: T013 (BEL + TerminalFlash)
  C3: T014 (select + copy)
  C4: T015 (useTerminalBuffer + useTerminalParser hooks)

Phase 4 (顺序执行，依赖 A+B+C):
  D1: T016 (useTerminalVirtualScroll hook) ← 依赖 026 hook + C4 hooks
  D2: T017 (TerminalViewport) ← 依赖 D1
  D3: T018 (performance benchmarks) ← 依赖 D2

Phase 5 (串行，依赖所有前置):
  E1: T019 (BashCard integration + fallback)
  E2: T020 (accessibility)
  E3: T021 (styles + CJK width)
  E4: T022 (full test coverage)
```

---

## 验收标准

- ✅ 所有 22 个任务完成
- ✅ TypeScript strict mode 编译零错误
- ✅ 单元测试 + 组件测试全部通过，核心覆盖率 ≥ 90%
- ✅ 三种颜色空间完整支持：16 色 / 256 色 / TrueColor (24-bit RGB)
- ✅ 所有 9 种 SGR 格式正确渲染（bold/dim/italic/underline/blink/inverse/hidden/strikethrough）
- ✅ 光标控制完整：绝对定位 / 相对移动 / 可见性切换
- ✅ 备用屏幕完整支持：less/nano/vim 类应用正确渲染，退出后内容可折叠查看
- ✅ 清屏 / 擦行代码正确处理
- ✅ 超链接 (OSC 8) 正确渲染为可点击链接
- ✅ 回车(\r) 不换行，支持进度条动画
- ✅ Tab 字符按 8 空格对齐
- ✅ 10,000 行滚动缓冲区，自动滚动
- ✅ >500 行自动启用虚拟滚动，保持 60fps
- ✅ DOM 节点数始终 < 200（虚拟滚动启用后）
- ✅ 流式增量渲染，新内容不触发全量重绘
- ✅ 文本选择 + 复制功能正常，保留换行和空格
- ✅ BEL 字符触发视觉闪烁，声音可选
- ✅ Resize 时自动重算换行
- ✅ 1000 行渲染 < 100ms
- ✅ 10000 行渲染 < 500ms
- ✅ Parser 吞吐量 ≥ 1MB/s
- ✅ 所有前景/背景颜色组合 WCAG AA 对比度 ≥ 4.5:1
- ✅ 键盘导航完整支持（Tab/方向键/Home/End）
- ✅ 屏幕阅读器可正确朗读终端输出
- ✅ `prefers-reduced-motion` 时禁用 blink 和 flash
- ✅ BashCard 集成无功能回归
- ✅ Chrome/Firefox 两大浏览器兼容
- ✅ 等宽字体 stack 正确 fallback
- ✅ CJK/Emoji 双宽字符近似对齐
- ✅ 深色主题样式与整体 UI 统一协调

---

**Tasks Version**: v1.0
**Created**: 2026-06-19
**Task Count**: 22
**Next Step**: Proceed to implementation, or continue to next feature (031-web-parallel-tool-grid)

---

## 下一 Feature 预览

**031-web-parallel-tool-grid** - 并发工具执行的网格布局展示：多工具同时运行时的卡片网格、进度状态、错误聚合、资源使用条形图。
