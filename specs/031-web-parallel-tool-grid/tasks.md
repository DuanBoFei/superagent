# Implementation Tasks: Web Parallel Tool Grid

**Feature**: 031-web-parallel-tool-grid
**Total Tasks**: 20
**Parallel Groups**: 5

**Design Sources for all [FE] tasks**:
- Root `DESIGN.md` sections: Brand & Style, Layout & Spacing, Elevation & Depth, Components, Terminal Output
- Visual samples: `specs/design-reference/stitch-export/chat_workspace_parallel_execution/` and `specs/design-reference/stitch-export/humanist_chat_workspace_parallel_execution/`
- Component baseline: React + project Web UI components; tool cards, status badges, controls, and charts must preserve the dense developer-tool hierarchy from root `DESIGN.md`

---

## Task List

### 并行组 A: 类型 + Store + 选择器 (4 任务，可独立并行)

#### T001 [BE]: 创建 ToolGrid TypeScript 类型定义

- **FR 来源**: FR-GRID-01 ~ FR-GRID-20
- **依赖**: 无
- **目标**: 完整的工具网格类型系统，与 spec Key Entities 完全对应
- **任务内容**:
  1. 创建 `packages/web/src/types/tool-grid.ts`
  2. 定义 `ToolStatus` 类型：`'pending' | 'running' | 'success' | 'failed' | 'cancelled'`
  3. 定义 `ToolCardData` 接口（toolId, toolName, parameters, status, progress, startTime/endTime, outputPreview, fullOutput, error, isExpanded, resourceUsage）
  4. 定义 `ToolGridState` 接口（toolIds, filters, sortBy, sortOrder, viewMode, errorExpanded）
  5. 定义 `ResourceMetrics` 接口（toolId, metricName, value, normalizedValue, label）
  6. 定义 `BulkAction` 类型
- **验证方式**: TypeScript strict mode 编译零错误
- **预计时间**: 1 hr

#### T002 [BE]: 实现 Zustand ToolGrid Slice

- **FR 来源**: FR-GRID-01 ~ FR-GRID-20
- **依赖**: T001
- **目标**: 工具网格状态管理 slice，所有核心 actions
- **任务内容**:
  1. 创建 `packages/web/src/store/slices/tool-grid.slice.ts`
  2. State 结构：`tools: ToolCardData[]` + `gridState: ToolGridState`
  3. Actions: `addTool()` / `updateProgress()` / `appendOutput()` / `completeTool()` / `failTool()` / `cancelTool()`
  4. Actions: `setSort()` / `setFilter()` / `setViewMode()`
  5. Actions: `expandAll()` / `collapseAll()` / `clearCompleted()` / `cancelAllRunning()`
  6. 集成到主 store index.ts
- **验证方式**: 单元测试：所有 actions 正确更新状态
- **预计时间**: 2 hr

#### T003 [BE]: 实现 Derived State Selectors

- **FR 来源**: FR-GRID-15, FR-GRID-16, FR-GRID-08, FR-GRID-10
- **依赖**: T001, T002
- **目标**: 纯函数派生状态选择器，零重复计算
- **任务内容**:
  1. 创建 `packages/web/src/store/slices/tool-grid.selectors.ts`
  2. `selectFilteredTools`: 按状态筛选工具
  3. `selectSortedTools`: 按 status/duration/name + asc/desc 排序
  4. `selectFailedTools`: 提取所有 failed 状态工具（用于错误聚合面板）
  5. `selectResourceMetrics`: 计算 ResourceMetrics（时长/输出大小归一化）
  6. `selectGridStats`: 统计各状态数量（pending/running/success/failed/cancelled）
  7. useMemo 优化：仅依赖变化时重算
- **验证方式**: 单元测试：筛选/排序/指标计算正确
- **预计时间**: 1.5 hr

#### T004 [INT]: Tool Orchestrator 事件订阅集成

- **FR 来源**: FR-GRID-03, FR-GRID-04, FR-GRID-05, FR-GRID-06
- **依赖**: T002
- **目标**: Orchestrator 事件 → Store 更新的完整链路
- **任务内容**:
  1. 在 tool-grid.slice.ts 中创建 `subscribeToOrchestrator()`
  2. 订阅 `toolStart` → 调用 `addTool()`，状态 = running
  3. 订阅 `toolProgress` → 调用 `updateProgress()`
  4. 订阅 `toolOutput` → 调用 `appendOutput()` 更新 outputPreview + fullOutput
  5. 订阅 `toolComplete` → 调用 `completeTool()`，状态 = success，计算 durationMs
  6. 订阅 `toolError` → 调用 `failTool()`，状态 = failed，保存 error 对象
  7. 晚到事件处理：已 endTime 的工具不再更新（幂等性）
- **验证方式**: 集成测试：emit 事件 → store 状态正确更新
- **预计时间**: 1.5 hr

---

### 并行组 B: 基础组件 (4 任务，可独立并行)

#### T005 [FE]: 实现 ToolProgressBar 组件

- **FR 来源**: FR-GRID-04
- **依赖**: T001
- **目标**: 确定 + 不确定两种进度条模式
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/tool-grid/ToolProgressBar.tsx`
  2. Determinate 模式：progress (0-100) → 宽度百分比
  3. Indeterminate 模式：progress = null → pulse 动画
  4. 状态颜色：running = 蓝色，success = 绿色，failed = 红色，cancelled = 灰色
  5. WCAG AA 对比度验证
- **验证方式**: 组件测试：0/50/100% 渲染正确，indeterminate 动画正确
- **预计时间**: 1 hr

#### T006 [FE]: 实现 ToolTimer 组件 + useToolTimer hook

- **FR 来源**: FR-GRID-05
- **依赖**: T001
- **目标**: MM:SS 格式实时计时器，requestAnimationFrame 驱动
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-tool-timer.ts`
  2. requestAnimationFrame 循环，每秒更新（非 setInterval，保证视觉同步）
  3. 输入：startTime, endTime | 输出：formatted MM:SS + running 状态
  4. endTime 已设置时停止更新
  5. 创建 `packages/web/src/components/chat/tool-grid/ToolTimer.tsx`
  6. 显示格式化时间，running 状态轻微闪烁动画
- **验证方式**: 单元测试：时间格式正确，running 时更新 completed 时停止
- **预计时间**: 1.5 hr

#### T007 [FE]: 实现 ToolCard 基础卡片组件

- **FR 来源**: FR-GRID-02, FR-GRID-06, FR-GRID-07, FR-GRID-03
- **依赖**: T001, T005, T006
- **目标**: 完整的单个工具卡片：状态 + 进度 + 计时 + 输出预览 + 展开/折叠
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/tool-grid/ToolCard.tsx`
  2. 头部：工具名称 + StatusBadge + ToolTimer + 展开/折叠按钮
  3. 参数摘要：显示关键参数（如 Read: filename, Grep: pattern）
  4. 进度条：ToolProgressBar 组件
  5. 输出预览：折叠时末尾 5 行，展开时完整输出
  6. 错误显示：failed 状态下红色错误信息 + stack trace
  7. React.memo 包装：仅相关 props 变化时重绘
  8. 卡片高度固定（折叠态）
- **验证方式**: 组件测试：5 种状态渲染正确，展开/折叠切换正确
- **预计时间**: 2 hr

#### T008 [FE]: 实现 ErrorAggregationPanel 错误聚合面板

- **FR 来源**: FR-GRID-08, FR-GRID-09, FR-GRID-20
- **依赖**: T001, T003
- **目标**: 顶部固定面板，列出所有失败工具，点击跳转高亮
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/tool-grid/ErrorAggregationPanel.tsx`
  2. position: sticky 始终在网格顶部
  3. 标题："N errors" (红色 badge 显示数量)
  4. 可展开/折叠：展开时显示失败工具列表
  5. 每项：工具名称 + 错误摘要，hover 效果
  6. 点击某项：scrollIntoView 到对应卡片 + 高亮闪烁动画
  7. WCAG：闪烁频率 < 3Hz，不触发癫痫风险
  8. 零错误时不渲染面板
- **验证方式**: 组件测试：0 errors 隐藏，3 errors 正确显示，点击跳转+高亮
- **预计时间**: 1.5 hr

---

### 并行组 C: 控制栏组件 (4 任务，可独立并行，依赖 A+B)

#### T009 [FE]: 实现 BulkActionBar 批量操作栏

- **FR 来源**: FR-GRID-12, FR-GRID-13, FR-GRID-14
- **依赖**: T002
- **目标**: Cancel All / Expand All / Collapse All / Clear Completed 批量操作
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/tool-grid/BulkActionBar.tsx`
  2. 四个按钮：Cancel All (红色) / Expand All / Collapse All / Clear Completed
  3. 按钮状态：无 running 时 Cancel All disabled
  4. Cancel All 确认弹窗："确定取消所有 N 个运行中的工具？"
  5. 调用对应 store actions: cancelAllRunning() / expandAll() / collapseAll() / clearCompleted()
  6. Undo 机制：Clear Completed 后显示 5 秒 undo 按钮
- **验证方式**: 组件测试：所有按钮正确触发 actions，Cancel All 确认弹窗工作
- **预计时间**: 1.5 hr

#### T010 [FE]: 实现 SortFilterControls 排序筛选控件

- **FR 来源**: FR-GRID-15, FR-GRID-16
- **依赖**: T002
- **目标**: 排序字段 + 方向 + 状态筛选
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/tool-grid/SortFilterControls.tsx`
  2. Sort by 下拉：Status (失败优先) / Duration / Name
  3. Sort direction 切换：Asc / Desc 箭头按钮
  4. Filter by status：All / Running only / Failed only / Completed only
  5. 调用 store actions: setSort() / setFilter()
  6. 当前筛选状态视觉反馈
- **验证方式**: 组件测试：选择不同排序/筛选 → store state 正确更新
- **预计时间**: 1.5 hr

#### T011 [FE]: 实现 ViewToggle 视图切换

- **FR 来源**: FR-GRID-17, FR-GRID-18
- **依赖**: T002
- **目标**: Grid View / List View 切换按钮
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/tool-grid/ViewToggle.tsx`
  2. 两个图标按钮：Grid (3 列网格图标) / List (单列列表图标)
  3. 当前激活视图高亮显示
  4. 点击调用 setViewMode() action
  5. aria-label 无障碍标签
- **验证方式**: 组件测试：点击切换 → viewMode state 正确更新
- **预计时间**: 0.5 hr

#### T012 [FE]: 实现 ResourceBarChart 资源条形图

- **FR 来源**: FR-GRID-10, FR-GRID-11
- **依赖**: T003
- **目标**: 时长/输出大小的横向条形对比图，归一化显示
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/tool-grid/ResourceBarChart.tsx`
  2. Metric tabs: Duration / Output Size
  3. 每行：工具名称 + 条形 + 数值标签（如 "2.3s" / "156KB"）
  4. 归一化算法：最大值 = 100% 宽度，其他按比例缩放
  5. 条形颜色与工具状态对应（success=绿，failed=红）
  6. 按当前度量降序排序显示（最长的在最上）
  7. 仅显示已完成的工具（success/failed/cancelled）
- **验证方式**: 组件测试：条形宽度与数值成比例，排序正确，标签显示正确
- **预计时间**: 1.5 hr

---

### 并行组 D: 主网格 + 性能 (3 任务，依赖 A+B+C)

#### T013 [INT]: 实现 useToolVirtualScroll hook

- **FR 来源**: FR-GRID-19, NFR-GRID-03
- **依赖**: T001，026 useVirtualScroll
- **目标**: >20 工具时自动启用虚拟滚动，保持 60fps
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-tool-virtual-scroll.ts`
  2. 复用 026 useVirtualScroll 核心逻辑
  3. 适配 ToolCard 固定高度（折叠态）
  4. 阈值：工具数量 > 20 自动启用
  5. 容器高度自适应
  6. 滚动位置保持：新工具追加时不跳屏
- **验证方式**: 性能测试：50 工具滚动 60fps，DOM 节点数 < 可见区域 + 缓冲区
- **预计时间**: 2 hr

#### T014 [FE]: 实现 ToolGrid 主组件 + 响应式布局

- **FR 来源**: FR-GRID-01, FR-GRID-17, FR-GRID-18
- **依赖**: T007, T008, T009, T010, T011, T012, T013
- **目标**: 聚合所有子组件，响应式网格布局
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/tool-grid/ToolGrid.tsx`
  2. Props: tools (可外部传入，用于 032 回放)，enableVirtualScroll, defaultViewMode
  3. 布局结构：ErrorAggregationPanel (sticky) → BulkActionBar → SortFilterControls + ViewToggle → ResourceBarChart (可选) → Grid/List 内容区
  4. CSS Grid 响应式：1 列 (<600px) / 2 列 (600-1000px) / 3 列 (>1000px)
  5. viewMode = 'list' 时强制单列
  6. 窗口 resize observer：<600px 自动切 list 视图
  7. 虚拟滚动集成：数量 > 20 时启用 useToolVirtualScroll
- **验证方式**: 组件测试：不同宽度下列数正确，<600px 自动 list 模式
- **预计时间**: 2.5 hr

#### T015 [INT]: AbortController 取消信号传播

- **FR 来源**: FR-GRID-13
- **依赖**: T002, T004
- **目标**: Cancel All → AbortSignal 到达所有运行中工具
- **任务内容**:
  1. 在 tool-grid.slice.ts 中创建 `abortControllers: Map<string, AbortController>`
  2. toolStart 时：创建 AbortController，存入 map
  3. toolComplete / toolFail 时：清理 map 中对应 controller
  4. cancelAllRunning()：遍历 map，对每个 controller 调用 abort()
  5. Tool Orchestrator 接收 abort signal，终止对应工具执行
  6. cancelled 状态卡片：灰色显示，3 秒后允许被 Clear Completed 移除
- **验证方式**: 集成测试：Cancel All → 所有 running 工具收到 abort 信号 → 状态变为 cancelled
- **预计时间**: 1.5 hr

---

### 并行组 E: 集成 + 完善 + 测试 (5 任务，串行，依赖所有)

#### T016 [INT]: 028 ToolCard 集成替换

- **FR 来源**: 028 集成
- **依赖**: T014
- **目标**: 用新 ToolGrid 替换 028 的线性工具列表
- **任务内容**:
  1. 修改 `packages/web/src/components/chat/cards/ToolCard.tsx` (028)
  2. 移除原有的简单工具列表渲染逻辑
  3. 集成 ToolGrid 组件：`enableVirtualScroll={tools.length > 20}`
  4. 向后兼容：单工具时退化为原有单卡片样式（可选）
  5. 视觉回归测试：与旧渲染对比
- **验证方式**: 集成测试：多工具运行 → 网格正确显示
- **预计时间**: 1.5 hr

#### T017 [INT]: TerminalRenderer 懒加载集成

- **FR 来源**: FR-GRID-07
- **依赖**: T007, 030 TerminalRenderer
- **目标**: ToolCard 展开时才初始化彩色输出渲染
- **任务内容**:
  1. ToolCard 折叠时：纯文本 outputPreview（快速渲染）
  2. ToolCard 展开时：动态 import + React.lazy 加载 TerminalRenderer
  3. Loading fallback：简易骨架屏
  4. 仅 Bash 工具使用 TerminalRenderer，Read/Grep 等用纯文本 + 语法高亮
  5. 展开动画平滑，无闪烁跳变
- **验证方式**: 性能测试：展开延迟 < 100ms，折叠状态不加载 TerminalRenderer
- **预计时间**: 1.5 hr

#### T018 [INT]: 输出预览节流优化

- **FR 来源**: NFR-GRID-02
- **依赖**: T004, T007
- **目标**: 10 个工具同时流式输出保持 60fps
- **任务内容**:
  1. appendOutput 节流：同一工具 100ms 内最多更新一次 outputPreview
  2. fullOutput 仍实时追加，但 UI 仅每隔 100ms 刷新预览
  3. requestAnimationFrame 批量更新多个工具的输出
  4. 完成时强制刷新一次，确保最后输出可见
  5. useDeferredValue 优化：输出更新优先级低于用户交互
- **验证方式**: 性能测试：10 并发工具流式输出 → 帧率 ≥ 60fps
- **预计时间**: 1.5 hr

#### T019 [FE]: 可访问性优化

- **FR 来源**: NFR-GRID-06, NFR-GRID-09, NFR-GRID-10
- **依赖**: T007, T008, T009, T010, T011, T014
- **目标**: WCAG AA 达标，完整键盘导航，屏幕阅读器友好
- **任务内容**:
  1. 所有状态颜色 axe-core 对比度验证 ≥ 4.5:1
  2. Tab 顺序：批量操作栏 → 筛选排序 → 卡片 → 错误面板
  3. 方向键在卡片间移动焦点（网格导航）
  4. Enter/Space 激活按钮和卡片展开/折叠
  5. ARIA labels：所有交互元素有描述，status = aria-live 区域播报变化
  6. aria-live 区域：新错误到达时自动朗读
  7. prefers-reduced-motion：禁用 progress pulse 和高亮闪烁动画
- **验证方式**: axe-core 零错误，键盘可操作所有功能，屏幕阅读器测试
- **预计时间**: 2 hr

#### T020 [INT]: 完整测试覆盖

- **FR 来源**: All FRs + NFRs
- **依赖**: T016, T017, T018, T019
- **目标**: 单元 + 组件 + 集成 + 性能 + 可访问性测试全覆盖
- **任务内容**:
  1. Selectors 单元测试：筛选/排序/指标计算正确
  2. ToolGrid Slice 单元测试：所有 actions 正确更新 state
  3. useToolTimer hook 单元测试
  4. 所有 7 个组件测试（ToolCard/ProgressBar/Timer/ErrorPanel/BulkActions/SortFilter/ViewToggle/ResourceChart）
  5. ToolGrid 主组件集成测试：响应式布局、虚拟滚动、跳转高亮
  6. 性能基准测试：单卡片 <16ms、10 并发 60fps、50 工具滚动 60fps、Cancel All <100ms、排序 <50ms
  7. 可访问性测试：axe-core 零错误
  8. 视觉回归测试： Percy 快照
- **验证方式**: vitest 所有测试通过，核心覆盖率 ≥ 90%，所有性能指标达标
- **预计时间**: 3 hr

---

## 开发顺序与依赖图

```
Phase 1 (完全并行):
  A1: T001 (types)
  A2: T002 (zustand slice)
  A3: T003 (selectors)
  A4: T004 (orchestrator integration)

Phase 2 (完全并行):
  B1: T005 (ToolProgressBar)
  B2: T006 (ToolTimer + hook)
  B3: T007 (ToolCard)
  B4: T008 (ErrorAggregationPanel)

Phase 3 (完全并行，依赖 A+B):
  C1: T009 (BulkActionBar)
  C2: T010 (SortFilterControls)
  C3: T011 (ViewToggle)
  C4: T012 (ResourceBarChart)

Phase 4 (依赖 A+B+C):
  D1: T013 (useToolVirtualScroll hook)
  D2: T014 (ToolGrid main + responsive)
  D3: T015 (AbortController cancel propagation)

Phase 5 (串行，依赖所有前置):
  E1: T016 (028 ToolCard integration replacement)
  E2: T017 (TerminalRenderer lazy load)
  E3: T018 (output preview throttling + 60fps optimization)
  E4: T019 (accessibility: WCAG AA + keyboard + screen reader)
  E5: T020 (full test coverage)
```

---

## 验收标准

- ✅ 所有 20 个任务完成
- ✅ TypeScript strict mode 编译零错误
- ✅ 单元测试 + 组件测试全部通过，核心覆盖率 ≥ 90%
- ✅ 响应式布局：1-2 工具 = 1 列，3-4 = 2 列，5+ = 3 列
- ✅ <600px 自动切换列表视图
- ✅ 5 种工具状态正确渲染：pending/running/success/failed/cancelled
- ✅ 进度条支持 determinate (0-100%) 和 indeterminate (pulse)
- ✅ 实时计时器 MM:SS 格式，completed 时停止
- ✅ 卡片展开/折叠：折叠显示 5 行预览，展开显示完整输出
- ✅ 错误聚合面板：sticky 顶部，点击跳转 + 高亮动画
- ✅ 批量操作：Cancel All / Expand All / Collapse All / Clear Completed
- ✅ Clear Completed 后 5 秒 undo
- ✅ 排序支持：status/duration/name，asc/desc
- ✅ 筛选支持：all/running/failed/completed
- ✅ Grid/List 视图切换
- ✅ 资源条形图：时长/输出大小，归一化显示
- ✅ >20 工具自动启用虚拟滚动，50 工具滚动 60fps
- ✅ Cancel All 正确传播 AbortSignal 到所有运行中工具
- ✅ 10 个并发工具流式输出保持 60fps
- ✅ 028 集成：ToolGrid 替换原有线性列表
- ✅ TerminalRenderer 懒加载，展开时才初始化
- ✅ 所有颜色 WCAG AA 对比度 ≥ 4.5:1
- ✅ 100% 键盘可访问，Tab/方向键/Enter/Space 全操作
- ✅ 屏幕阅读器友好，ARIA labels 完整
- ✅ prefers-reduced-motion 时禁用动画
- ✅ 所有性能指标达标：单卡片 <16ms, Cancel All <100ms, 排序 <50ms
- ✅ 深色主题样式与整体 UI 协调统一

---

**Tasks Version**: v1.0
**Created**: 2026-06-19
**Task Count**: 20
**Next Step**: Proceed to implementation, or continue to 032-web-session-history-sidebar

---

## 下一 Feature 预览

**032-web-session-history-sidebar** - 会话历史侧边栏：会话列表、搜索筛选、会话详情回放、导出、导入、删除管理。
