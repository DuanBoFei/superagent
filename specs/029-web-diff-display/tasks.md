# Implementation Tasks: Web Diff Display

**Feature**: 029-web-diff-display  
**Total Tasks**: 21  
**Parallel Groups**: 5

**Design Sources for all [FE] tasks**:
- Root `DESIGN.md` sections: Brand & Style, Typography, Layout & Spacing, Elevation & Depth, Components, Terminal Output
- Visual samples: `specs/design-reference/stitch-export/detailed_tool_card_view/` and `specs/design-reference/stitch-export/humanist_detailed_tool_card_view/`
- Component baseline: React + project Web UI components; diff/code review surfaces must follow the compact developer-tool hierarchy from root `DESIGN.md`

---

## Task List

### 并行组 A: 基础设施层 (5 任务，可并行)

#### T001 [BE]: 创建 Diff TypeScript 类型定义 ✅

- **FR 来源**: FR-DIFF-01 ~ FR-DIFF-21
- **依赖**: 无
- **目标**: 完整的 diff 类型系统，与 spec Key Entities 完全对应
- **任务内容**:
  1. 创建 `packages/web/src/types/diff.ts`
  2. 定义 `DiffViewMode` 类型：`'unified' | 'split'`
  3. 定义 `DiffLineType` 枚举：`'add' | 'delete' | 'modify' | 'context' | 'empty'`
  4. 定义 `DiffLine` 接口（type、oldLineNumber、newLineNumber、content、charChanges）
  5. 定义 `DiffHunk` 接口（hunkIndex、oldStart、oldLines、newStart、newLines、lines、isCollapsed、isContextHunk）
  6. 定义 `DiffStatistics` 和 `DiffNavigationPosition` 接口
- **验证方式**: TypeScript strict mode 编译零错误
- **预计时间**: 1 hr

#### T002 [BE]: 实现 Diff Parser 核心库 ✅

- **FR 来源**: FR-DIFF-18
- **依赖**: T001
- **目标**: unified diff 字符串 → DiffHunk[] 结构化解析
- **任务内容**:
  1. 创建 `packages/web/src/lib/diff-parser.ts`
  2. 实现 `parseUnifiedDiff()` 函数解析标准 diff 格式
  3. 实现 `computeDiffHunks()` 使用 Myers 算法计算两个文本的差异
  4. 实现 hunk 边界检测和行号计算
  5. 异常格式优雅降级（返回纯文本 context lines）
- **验证方式**: 单元测试：git diff 输出解析正确、边界 case 处理、异常格式降级
- **预计时间**: 2 hr

#### T003 [BE]: 实现字符级差异算法

- **FR 来源**: FR-DIFF-05
- **依赖**: T001
- **目标**: 单行内精确字符级差异计算
- **任务内容**:
  1. 创建 `packages/web/src/lib/char-level-diff.ts`
  2. 集成 `diff-match-patch` 库
  3. 实现 `computeCharChanges(oldText, newText)` 返回变更范围数组
  4. 支持新增、删除、替换三种字符级变更类型
  5. 空行、全相等、全删除边界情况处理
- **验证方式**: 单元测试：各种变更模式计算正确，1000 字符 < 5ms
- **预计时间**: 1.5 hr

#### T004 [BE]: 实现统计计算工具

- **FR 来源**: FR-DIFF-09
- **依赖**: T001, T002
- **目标**: 准确计算 diff 各项统计数据
- **任务内容**:
  1. 创建 `packages/web/src/lib/diff-statistics.ts`
  2. 实现 `calculateStatistics(hunks: DiffHunk[])`
  3. 计算：新增行数、删除行数、修改行数、hunk 总数、总行数
  4. 实现折叠行数排除逻辑
- **验证方式**: 单元测试：各种 diff 样本统计数字正确
- **预计时间**: 1 hr

#### T005 [BE]: 实现 Zustand diff.slice 状态管理

- **FR 来源**: FR-DIFF-12, FR-DIFF-13, FR-DIFF-14
- **依赖**: T001
- **目标**: diff 视图状态的集中管理 + 持久化
- **任务内容**:
  1. 创建 `packages/web/src/store/slices/diff.slice.ts`
  2. 实现状态结构：`viewMode`、`collapsedHunks`、`currentHunkIndex`
  3. 实现 actions：`setViewMode` / `toggleHunkCollapsed` / `collapseAll` / `expandAll` / `navigateToHunk`
  4. 集成 localStorage 持久化（viewMode 用户偏好）
  5. 集成到主 store index.ts
- **验证方式**: 单元测试：模式切换正确、hunk 折叠状态正确、刷新后偏好保留
- **预计时间**: 1.5 hr

---

### 并行组 B: Unified View 核心渲染 (4 任务，可并行，依赖 A)

#### T006 [FE]: 实现 DiffLine 单行渲染组件

- **FR 来源**: FR-DIFF-03, FR-DIFF-04, FR-DIFF-05, FR-DIFF-06, FR-DIFF-08
- **依赖**: T001
- **目标**: 单行 diff 的正确渲染（颜色 + 行号 + 字符级高亮）
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffLine.tsx`
  2. 5 种行类型样式：add（绿底）、delete（红底）、modify、context（灰底）、empty（空白占位）
  3. 左右行号列渲染（支持 Split 模式的双行号）
  4. 字符级变更内联高亮（更深的背景色）
  5. 集成 027 Shiki 语法高亮
  6. 文本选择和复制支持
- **验证方式**: 组件测试：5 种行类型颜色正确、字符级高亮正确、语法高亮应用
- **预计时间**: 2 hr

#### T007 [FE]: 实现 DiffHunkHeader 头部 + 折叠控制

- **FR 来源**: FR-DIFF-12, FR-DIFF-13
- **依赖**: T001, T005
- **目标**: hunk 头部信息展示 + 折叠/展开控制
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffHunkHeader.tsx`
  2. 显示 hunk 行号范围（@@ -a,b +c,d @@ 格式）
  3. 折叠/展开按钮（chevron 图标）
  4. 折叠状态下显示 hunk 包含的行数统计
  5. 点击触发 Zustand state 更新
- **验证方式**: 组件测试：点击正确切换状态、折叠时显示行数、状态与 store 同步
- **预计时间**: 1.5 hr

#### T008 [FE]: 实现 DiffUnifiedView 合并视图

- **FR 来源**: FR-DIFF-01, FR-DIFF-07
- **依赖**: T001, T006, T007
- **目标**: 完整的 Unified 模式 diff 渲染
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffUnifiedView.tsx`
  2. 遍历 hunk 数组，依次渲染 DiffHunkHeader + DiffLine
  3. 支持折叠状态下隐藏 hunk 内容行
  4. 左右侧行号列对齐显示
  5. hunk 间视觉分隔
- **验证方式**: 组件测试：各种 diff 样本渲染正确、折叠功能正常、行号对齐
- **预计时间**: 2 hr

#### T009 [FE]: 字符级高亮在行内应用

- **FR 来源**: FR-DIFF-05
- **依赖**: T003, T006
- **目标**: modify 类型行内精确字符高亮
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-char-level-diff.ts` hook
  2. 在 DiffLine 组件中集成字符级差异计算
  3. 实现字符级高亮的 span 包裹渲染
  4. 新增字符（更深绿色）、删除字符（更深红色）的区分
  5. 性能优化：仅变更行计算，context 行跳过
- **验证方式**: 组件测试：部分修改的行字符高亮精确、性能测试无明显延迟
- **预计时间**: 1.5 hr

---

### 并行组 C: Split View + 导航系统 (5 任务，可并行，依赖 A+B)

#### T010 [FE]: 实现 DiffSplitView 分栏视图

- **FR 来源**: FR-DIFF-01, FR-DIFF-15, FR-DIFF-16, FR-DIFF-17
- **依赖**: T001, T006, T007
- **目标**: 左旧右新分栏对比，垂直对齐精确
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffSplitView.tsx`
  2. CSS Grid 两列布局，等宽分配
  3. 每行配对渲染：新增行 → 左侧空占位 + 右侧内容；删除行 → 左侧内容 + 右侧空
  4. empty placeholder 行保证跨 hunk 垂直对齐
  5. 左右列同步滚动（scroll event 联动）
  6. 折叠状态下两列同时隐藏
- **验证方式**: 组件测试：新增/删除/修改/上下文行对齐精确、滚动同步无偏差
- **预计时间**: 2.5 hr

#### T011 [FE]: 实现 DiffViewModeToggle 模式切换按钮

- **FR 来源**: FR-DIFF-02
- **依赖**: T005
- **目标**: Unified ↔ Split 一键切换
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffViewModeToggle.tsx`
  2. 两个按钮：Unified（合并图标）、Split（分栏图标）
  3. 点击更新 Zustand viewMode state
  4. 当前激活模式视觉高亮
  5. 工具提示说明两种模式
- **验证方式**: 组件测试：点击正确切换模式、激活状态高亮正确
- **预计时间**: 1 hr

#### T012 [FE]: 实现 DiffNavigationControls 导航按钮

- **FR 来源**: FR-DIFF-10
- **依赖**: T001, T005
- **目标**: 上一处/下一处变更块快速跳转
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffNavigationControls.tsx`
  2. Previous / Next 按钮组
  3. 当前位置指示器："3 / 8"（第 3 处变更，共 8 处）
  4. 到达边界时按钮禁用状态
  5. 键盘快捷键支持（j / k）
  6. 跳转后滚动到对应 hunk 位置
- **验证方式**: 组件测试：跳转正确、边界禁用正确、键盘快捷键生效
- **预计时间**: 1.5 hr

#### T013 [FE]: 实现 DiffGutterIndicators 滚动条标记

- **FR 来源**: FR-DIFF-11
- **依赖**: T001
- **目标**: 滚动条上显示所有变更位置的视觉标记
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffGutterIndicators.tsx`
  2. 计算每个 hunk 在总高度中的相对位置
  3. 固定定位的标记条渲染在滚动区域右侧
  4. 新增 hunk 绿色细条、删除 hunk 红色细条、修改 hunk 黄色细条
  5. 点击标记跳转到对应 hunk
  6. 滚动区域 resize 时自动重新计算位置
- **验证方式**: 组件测试：标记位置与实际 hunk 对应、点击跳转正确
- **预计时间**: 2 hr

#### T014 [FE]: 实现 DiffStatistics 统计面板

- **FR 来源**: FR-DIFF-09
- **依赖**: T004
- **目标**: 变更统计信息的可视化展示
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffStatistics.tsx`
  2. 显示：+N 新增、-M 删除、*K 修改、P 处变更块
  3. 彩色数字（绿/红/黄）
  4. 折叠行数量提示（如果有自动折叠的未变更区块）
  5. "展开全部折叠" 快捷按钮
- **验证方式**: 组件测试：统计数字与 diff 内容一致、折叠提示正确显示
- **预计时间**: 1 hr

---

### 并行组 D: 性能优化 + 虚拟滚动 (3 任务，可并行，依赖 A+B+C)

#### T015 [FE]: 实现 DiffVirtualScroll 虚拟滚动组件

- **FR 来源**: NFR-DIFF-01, NFR-DIFF-02, NFR-DIFF-03
- **依赖**: T008 (Unified), T010 (Split)
- **目标**: 500+ 行 diff 自动启用虚拟滚动，保持 60fps
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffVirtualScroll.tsx`
  2. 复用 026 的 useVirtualScroll hook
  3. 500 行阈值自动启用
  4. Unified 和 Split 两种布局适配
  5. 折叠 hunk 时动态调整视口高度
  6. 滚动位置在模式切换时保持对应内容
- **验证方式**: 性能测试：10,000 行 diff 滚动 60fps、模式切换位置对应正确
- **预计时间**: 2.5 hr

#### T016 [INT]: 实现 useDiffVirtualScroll hook

- **FR 来源**: NFR-DIFF-05
- **依赖**: T015
- **目标**: diff 专用的虚拟滚动逻辑封装
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-diff-virtual-scroll.ts`
  2. 适配 hunk 折叠状态的动态行高计算
  3. 折叠/展开触发重新计算可见范围
  4. 滚动到指定 hunk 的辅助方法
  5. ResizeObserver 监听容器尺寸变化
- **验证方式**: 单元测试 + 组件测试：动态高度计算正确、折叠后重新计算正确
- **预计时间**: 2 hr

#### T017 [INT]: 大未变更区块自动折叠

- **FR 来源**: FR-DIFF-12
- **依赖**: T002, T005
- **目标**: > 20 行连续未变更内容自动折叠
- **任务内容**:
  1. 在 diff-parser.ts 中实现 `markContextHunks()`
  2. 检测连续 context lines > 20 行的 hunk，标记 `isContextHunk = true`
  3. context hunk 默认 `isCollapsed = true`
  4. DiffHunkHeader 中显示 "展开 N 行未变更内容"
  5. "展开全部上下文" 按钮支持
- **验证方式**: 组件测试：长未变更区块自动折叠、手动展开/收起正常
- **预计时间**: 1.5 hr

---

### 并行组 E: 集成 + 完善 (4 任务，串行，依赖所有)

#### T018 [FE]: DiffViewer 主组件 + hooks 封装

- **FR 来源**: FR-DIFF-01 ~ FR-DIFF-21
- **依赖**: T008, T010, T011, T012, T013, T014, T015, T017
- **目标**: 统一的入口组件，聚合所有子组件
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/diff/DiffViewer.tsx`
  2. 创建 `packages/web/src/hooks/use-diff-parser.ts` hook
  3. 创建 `packages/web/src/hooks/use-diff-navigation.ts` hook
  4. Props 设计：`diff` (string) / `oldContent + newContent` (pair)、`defaultViewMode`、`showStatistics`、`showNavigation`、`virtualScrollThreshold`
  5. 根据 viewMode 条件渲染 UnifiedView 或 SplitView
  6. 布局：顶部统计 + 模式切换 → 导航按钮 → 主内容区 → 侧边 gutter 标记
- **验证方式**: 组件测试：双输入格式都支持、所有子组件正确集成
- **预计时间**: 2 hr

#### T019 [INT]: FileEditCard 集成升级

- **FR 来源**: FR-CARD-11, FR-CARD-12 (028 spec)
- **依赖**: T018
- **目标**: 用新 DiffViewer 替换 028 中的基础 diff 渲染
- **任务内容**:
  1. 修改 `packages/web/src/components/chat/cards/FileEditCard.tsx`
  2. 移除原有的简单 diff 渲染逻辑
  3. 集成 DiffViewer 组件
  4. 小 diff 默认 Unified 模式，大 diff 默认 Split 模式的智能选择
  5. 超过 100 行默认折叠显示统计 + "查看完整变更" 按钮
  6. 保留旧实现作为 fallback（diff 格式不支持时）
- **验证方式**: 集成测试：FileEditCard 渲染正确、新旧对比无功能回归
- **预计时间**: 1.5 hr

#### T020 [FE]: 样式统一 + 可访问性

- **FR 来源**: FR-DIFF-19, FR-DIFF-20, NFR-DIFF-07, NFR-DIFF-08
- **依赖**: T018
- **目标**: 深色主题样式统一 + WCAG AA 达标 + 完整键盘导航
- **任务内容**:
  1. 所有组件的深色主题 CSS 样式
  2. 所有文本/背景组合的对比度验证（axe-core 自动化测试）
  3. 键盘导航完整实现（Tab 遍历、Enter/Space 触发、j/k 快捷键）
  4. ARIA label：变更行朗读、折叠状态、行号语义
  5. 焦点管理：导航跳转后焦点移动到目标 hunk
  6. 文本选择和复制功能验证
- **验证方式**: 可访问性测试：axe-core 零错误、键盘全操作可达、WCAG AA 对比度全部达标
- **预计时间**: 2 hr

#### T021 [INT]: 完整测试覆盖

- **FR 来源**: All FRs + NFRs
- **依赖**: T019, T020
- **目标**: 单元 + 组件 + 性能 + 集成测试全覆盖
- **任务内容**:
  1. diff-parser 单元测试（各种 diff 格式、边界 case）
  2. char-level-diff 单元测试（各种字符变更模式 + 性能基准）
  3. DiffUnifiedView 组件测试（行类型、折叠、语法高亮）
  4. DiffSplitView 组件测试（对齐精度、滚动同步）
  5. DiffNavigation 组件测试（跳转 + 边界）
  6. 性能基准测试：1,000 行 < 200ms、10,000 行 < 1s
  7. FileEditCard 集成测试（端到端渲染流程）
  8. 视觉回归测试（VRT）快照
- **验证方式**: vitest 所有测试通过，核心覆盖率 ≥ 90%，性能指标全部达标
- **预计时间**: 3 hr

---

## 开发顺序与依赖图

```
Phase 1 (完全并行):
  A1: T001 (types)
  A2: T002 (diff parser)
  A3: T003 (char-level diff)
  A4: T004 (statistics)
  A5: T005 (zustand diff slice)

Phase 2 (并行，依赖 A1):
  B1: T006 (DiffLine component)
  B2: T007 (DiffHunkHeader)
  B3: T008 (DiffUnifiedView) ← 需要 T006+T007
  B4: T009 (char highlighting)  ← 需要 T003+T006

Phase 3 (并行，依赖 A1+A5+B1+B2):
  C1: T010 (DiffSplitView)      ← 需要 T006+T007
  C2: T011 (ViewModeToggle)
  C3: T012 (NavigationControls)
  C4: T013 (GutterIndicators)
  C5: T014 (Statistics panel)

Phase 4 (并行，依赖 A+B+C):
  D1: T015 (DiffVirtualScroll)   ← 需要 T008+T010
  D2: T016 (useDiffVirtualScroll hook)
  D3: T017 (auto-collapse context)

Phase 5 (串行，依赖所有):
  E1: T018 (DiffViewer + hooks)
  E2: T019 (FileEditCard integration)
  E3: T020 (styles + a11y)
  E4: T021 (full test coverage)
```

---

## 验收标准

- ✅ 所有 21 个任务完成
- ✅ TypeScript strict mode 编译零错误
- ✅ 单元测试 + 组件测试全部通过，核心覆盖率 ≥ 90%
- ✅ Unified 和 Split 两种视图模式完整实现，切换流畅
- ✅ 字符级差异高亮精确无误
- ✅ 语法高亮正确应用于所有代码行
- ✅ 行号在两种模式下均正确对齐显示
- ✅ 变更统计数字准确：新增/删除/修改行数 + hunk 数量
- ✅ 上一处/下一处导航功能完整，边界处理正确
- ✅ 滚动条 gutter 标记位置准确，点击跳转正确
- ✅ > 20 行未变更区块自动折叠，可手动展开
- ✅ 1,000 行 diff 首屏渲染 < 200ms，10,000 行 diff 首屏渲染 < 1 秒
- ✅ 虚拟滚动启用后保持 60fps 滚动流畅度
- ✅ 模式切换延迟 < 100ms
- ✅ 所有颜色组合 WCAG AA 对比度 ≥ 4.5:1
- ✅ 完整键盘导航支持（Tab/Enter/Space/j/k）
- ✅ 屏幕阅读器可正确朗读变更信息
- ✅ 文本选择和复制功能正常工作
- ✅ FileEditCard 集成无功能回归
- ✅ Chrome/Firefox 两大浏览器兼容
- ✅ 视觉回归测试通过，所有组件样式统一

---

**Tasks Version**: v1.0  
**Created**: 2026-06-18  
**Task Count**: 21  
**Next Step**: Proceed to implementation

---

## 下一 Feature 预览

**030-web-terminal-color-output** - BashCard 的进阶终端输出：完整 PTY 终端仿真、终端颜色（ANSI 256色 + TrueColor）、光标定位、备用屏幕模式（less/nano/vim 支持）
