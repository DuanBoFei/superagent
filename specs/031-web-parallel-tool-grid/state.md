# 实施进度 · web-parallel-tool-grid

## 当前任务
[ ] T019 · 可访问性优化

## 已完成
- [x] T018 · 输出预览节流优化（2026-06-20）
  - 文件: `packages/web/src/store/slices/tool-grid.slice.ts` (修改)
  - 测试: `tests/web/tool-grid-throttle.test.ts` (15 tests, all passed)
  - 回归修复: `tests/web/use-tool-grid.test.ts` (onToolOutput 测试适配节流)
  - appendOutput 节流: 同一工具 100ms 内最多一次 outputPreview 刷新
  - pendingChunks Map 累积缓冲块，flushOutputPreview() 合并输出
  - fullOutput 始终实时追加，不受节流影响
  - completeTool/failTool/cancelTool 强制 flush 确保最后输出可见
  - scheduleDeferred/cancelDeferred: rAF 浏览器 / setTimeout Node 双环境
  - 每工具独立节流窗口，互不影响
- [x] T017 · TerminalRenderer 懒加载集成（2026-06-20）
  - 文件: `packages/web/src/components/chat/tool-grid/ToolCard.ts` (修改，+7 行)
  - 测试: `tests/web/tool-card-terminal-renderer.test.ts` (12 tests, all passed)
  - renderOutput() 新增 toolName 参数，展开 + bash 工具走 renderTerminal() ANSI 着色
  - 折叠态保持纯文本输出（不加载 TerminalRenderer）
  - 非 bash 工具（read/grep）展开时用 escapeHtml 纯文本，不走终端渲染
  - renderBashOutputAsync() 动态 import TerminalRenderer，支持异步懒加载
  - 回归通过: tool-card.test.ts 27 tests 全绿
- [x] T001 · ToolGrid TypeScript 类型定义（2026-06-20）
- [x] T016 · 028 ToolCard 集成替换（2026-06-20）
  - 文件: `packages/web/src/components/chat/cards/CardRenderer.ts` (修改，+48 行)
  - 测试: `tests/web/card-renderer-grid.test.ts` (23 tests, all passed)
  - 新增 `renderCardsGrid()` 导出 — 单工具退化为原 `renderCards()` card-stack 布局
  - 多工具 → tool-grid wrapper + calculateColumns() 响应式 grid-cols-{1|2|3}
  - 集成 4 个 ToolGrid 子组件: BulkActionBar + SortFilterControls + ViewToggle + ErrorBanner
  - 统计派生: runningCount (pending+running), completedCount (success+error)
  - 错误聚合: renderErrorBanner() — error-banner + role=alert + aria-live=polite
  - 虚拟滚动: >20 工具时启用 virtual-scroll-container (136px 卡片高度)
  - GridOptions 接口: containerWidth/viewMode/sortBy/sortOrder/filterStatus 全可选
  - 保持 028 CardRegistry 类型特定渲染，未丢失任何 card 内容能力
- [x] T002 · ToolGrid Store Slice（2026-06-20）
- [x] T003 · Derived State Selectors（2026-06-20）
- [x] T004 · Tool Orchestrator 事件订阅集成（2026-06-20）
- [x] T005 · ToolProgressBar 组件（2026-06-20）
  - 文件: `packages/web/src/components/chat/tool-grid/ToolProgressBar.ts` (37 行)
  - 测试: `tests/web/tool-progress-bar.test.ts` (15 tests, all passed)
  - Determinate 模式: progress 0-100 → width% + role=progressbar + aria-valuenow
  - Indeterminate 模式: progress = null → pulse CSS class + aria-valuenow=""
  - 状态颜色: pending/running/success/failed/cancelled 各独立 CSS class
  - clamp() 边界保护 (-5→0%, 150→100%)
- [x] T006 · ToolTimer 组件 + useToolTimer hook（2026-06-20）
  - 文件: `packages/web/src/hooks/use-tool-timer.ts` (113 行)
  - 文件: `packages/web/src/components/chat/tool-grid/ToolTimer.ts` (22 行)
  - 测试: `tests/web/use-tool-timer.test.ts` (15 tests, all passed)
  - 测试: `tests/web/tool-timer.test.ts` (14 tests, all passed)
  - createToolTimer() factory — ToolTimerController 接口（start/stop/getState/onUpdate/destroy）
  - requestAnimationFrame 驱动，每秒更新，非 setInterval
  - 输入 startTime/endTime → 输出 formatted MM:SS + running boolean
  - endTime 已设置时停止 RAF 循环，返回最终状态
  - formatTime() 纯函数：65s→01:05, 3661s→61:01
  - renderToolTimer() 纯函数：running 时 "tool-timer-running" CSS class + role=timer
  - 非运行状态的视觉效果（无闪烁动画）
  - escapeHtml/escapeAttr XSS 防护
  - 文件: `packages/web/src/hooks/use-tool-grid.ts` (105 行)
  - 测试: `tests/web/use-tool-grid.test.ts` (23 tests, all passed)
  - createToolGridSubscriber() factory — ToolGridEventSubscriber 接口
  - onToolStart → addTool() 映射，onToolOutput → appendOutput() 映射
  - onToolComplete → completeTool()/failTool() 分流，onToolError → failTool()
  - safeParse() 助手 — Zod schema 校验 + console.warn 降级
  - Slice 增强: failTool() 添加幂等性检查（与 completeTool 一致）
  - 文件: `packages/web/src/types/tool-grid.ts` (90 行)
  - ToolStatus, ToolCardData, ToolGridState, ResourceMetrics, BulkAction, GridColumns
  - calculateColumns() 响应式列数计算函数
- [x] T002 · ToolGrid Store Slice（2026-06-20）
  - 文件: `packages/web/src/store/slices/tool-grid.slice.ts` (290+ 行)
  - 测试: `tests/web/tool-grid-slice.test.ts` (34 tests, all passed)
  - Factory pattern (非 Zustand)，adapter 到项目实际架构
  - 全部 actions: addTool/getTool/getAllTools/getToolIds
  - 状态更新: updateProgress/appendOutput/completeTool/failTool/cancelTool
  - 批量操作: expandAll/collapseAll/clearCompleted/cancelAllRunning
  - AbortController 管理: registerAbortController/getAbortController
  - Undo 机制: getUndoStack/undoClear (保留原插入顺序)
  - 错误聚合: getFailedTools
  - 网格状态: setSort/setFilter/setViewMode/toggleErrorExpanded/toggleExpanded
- [x] T003 · Derived State Selectors（2026-06-20）
  - 文件: `packages/web/src/store/slices/tool-grid.selectors.ts` (135 行)
  - 测试: `tests/web/tool-grid-selectors.test.ts` (30 tests, all passed)
  - selectFilteredTools / selectSortedTools / selectFailedTools / selectResourceMetrics / selectGridStats
  - 全部为纯函数，零 store 依赖

## 阻塞项
（无）

- [x] T007 · ToolCard 基础卡片组件（2026-06-20）
  - 文件: `packages/web/src/components/chat/tool-grid/ToolCard.ts` (117 行)
  - 测试: `tests/web/tool-card.test.ts` (27 tests, all passed)
  - renderToolCard() 纯函数 — 返回完整卡片 HTML 字符串
  - 头部: 工具标签(toolLabel映射) + 工具名 + ToolTimer + 展开/折叠按钮(aria-expanded)
  - 参数摘要: 最多显示 3 个参数键值对
  - 进度条: 集成 renderToolProgressBar（含 indeterminate 模式）
  - 计时器: computeTimerState() → renderToolTimer()（running 状态识别）
  - 输出预览: 折叠时展示 outputPreview 末尾行，展开时展示 fullOutput 全文
  - 错误显示: tool-card-error 区域 + 错误消息 + 可选 stack trace
  - 状态标识: card-status-{pending|running|success|failed|cancelled} CSS class
  - 数据属性: data-tool-id, data-status 挂载到卡片 wrapper
  - escapeHtml/escapeAttr XSS 防护

- [x] T008 · ErrorAggregationPanel（2026-06-20）
  - 文件: `packages/web/src/components/chat/tool-grid/ErrorAggregationPanel.ts` (48 行)
  - 测试: `tests/web/error-aggregation-panel.test.ts` (19 tests, all passed)
  - renderErrorAggregationPanel() 纯函数 — 返回错误聚合面板 HTML 字符串
  - 零错误: 返回空字符串，不渲染面板
  - 错误计数 badge: "1 error" / "N errors" + error-count-badge CSS class
  - 展开/折叠: toggle 按钮 + aria-expanded + error-item-list 显隐
  - 错误项: 工具名 + 错误消息 + data-tool-id + data-action="scroll-to-tool"
  - WCAG: role="alert" + aria-live="polite" + role="list"/role="button"
  - 输入: failedTools (ToolCardData[]) + isExpanded (boolean)
  - escapeHtml/escapeAttr XSS 防护

- [x] T009 · BulkActionBar（2026-06-20）
  - 文件: `packages/web/src/components/chat/tool-grid/BulkActionBar.ts` (45 行)
  - 测试: `tests/web/bulk-action-bar.test.ts` (18 tests, all passed)
  - renderBulkActionBar() 纯函数 — 返回批量操作栏 HTML 字符串
  - 四个按钮: Cancel All / Expand All / Collapse All / Clear Completed
  - Cancel All: 无 running 时 disabled + cancel-all-disabled CSS class
  - Clear Completed: 无 completed 时 disabled + clear-completed-disabled CSS class
  - Undo 机制: showUndo=true 时替换 Clear Completed 为 Undo (Xs) 倒计时按钮
  - role="toolbar" + aria-label 无障碍标注

- [x] T010 · SortFilterControls（2026-06-20）
  - 文件: `packages/web/src/components/chat/tool-grid/SortFilterControls.ts` (64 行)
  - 测试: `tests/web/sort-filter-controls.test.ts` (15 tests, all passed)
  - renderSortFilterControls() 纯函数 — 返回排序筛选控件 HTML 字符串
  - Sort select: data-action="sort-by" + data-sort-selected 标记当前排序字段
  - Sort direction toggle: data-action="toggle-sort-order" + sort-order-asc/desc CSS class
  - Filter buttons: data-action="filter-by" + data-filter-value + filter-active-{status} active 状态
  - Status/Duration/Name 三字段 + All/Running/Failed/Completed 四筛选
  - 全组合测试 (3×2×4=24 combos) 均通过
  - escapeHtml/escapeAttr XSS 防护

- [x] T011 · ViewToggle（2026-06-20）
  - 文件: `packages/web/src/components/chat/tool-grid/ViewToggle.ts` (12 行)
  - 测试: `tests/web/view-toggle.test.ts` (15 tests, all passed)
  - renderViewToggle() 纯函数 — 返回 Grid/List 视图切换按钮组 HTML
  - 两个按钮: data-action="set-view-grid" / data-action="set-view-list"
  - 当前视图: view-active-grid / view-active-list CSS class + aria-pressed true/false
  - role="group" + aria-label="View mode"
  - 每个按钮独立 aria-label + aria-pressed 无障碍标注

- [x] T012 · ResourceBarChart（2026-06-20）
  - 文件: `packages/web/src/components/chat/tool-grid/ResourceBarChart.ts` (79 行)
  - 测试: `tests/web/resource-bar-chart.test.ts` (26 tests, all passed)
  - renderResourceBarChart() 纯函数 — 返回资源条形图 HTML
  - Metric tabs: Duration / Output Size，data-action="select-metric-{metric}"
  - 行: tool name + bar (width%) + value label，按值降序排列
  - 归一化: max=100%，bar color 对应工具状态 (bar-color-{status})
  - 仅显示已完成工具 (success/failed/cancelled)，排除 pending/running
  - No-data 状态: no-data CSS class
  - 格式化: durationMs→"2.3s", outputBytes→"1.5KB"/"0B"
  - escapeHtml/escapeAttr XSS 防护

- [x] T013 · useToolVirtualScroll hook（2026-06-20）
  - 文件: `packages/web/src/hooks/use-tool-virtual-scroll.ts` (34 行)
  - 测试: `tests/web/use-tool-virtual-scroll.test.ts` (20 tests, all passed)
  - useToolVirtualScroll() — 复用 createVirtualScroll，适配工具卡片固定高度
  - TOOL_CARD_HEIGHT = 136px，启用阈值默认 >20 个工具
  - 低于阈值返回 enabled=false + window=null
  - 计算 startIndex/endIndex/items/totalHeight/padding
  - 负值 scrollTop 自动 clamp 到 0

- [x] T014 · ToolGrid 主组件 + 响应式布局（2026-06-20）
  - 文件: `packages/web/src/components/chat/tool-grid/ToolGrid.ts` (89 行)
  - 测试: `tests/web/tool-grid.test.ts` (24 tests, all passed)
  - renderToolGrid() 纯函数 — 聚合所有子组件的 orchestrator
  - 计算响应式列数: calculateColumns(toolCount, viewMode, width) — 优先 toolCount
  - 集成 7 个子组件: ErrorAggregationPanel + BulkActionBar + SortFilterControls + ViewToggle + ResourceBarChart + ToolCards + VirtualScroll
  - 空状态: 无工具时显示 tool-grid-empty + message
  - 虚拟滚动: toolCount > 20 时启用 useToolVirtualScroll
  - view-mode-{grid|list} + grid-cols-{1|2|3} CSS class
  - 仅在有已完成工具时渲染 ResourceBarChart

- [x] T015 · AbortController 取消信号传播（2026-06-20）
  - 文件: `packages/web/src/store/slices/tool-grid.slice.ts` (修改，新增 CANCEL_GRACE_MS)
  - 文件: `packages/web/src/types/tool-grid.ts` (修改，新增 cancelledAt 字段)
  - 测试: `tests/web/tool-grid-abort.test.ts` (21 tests, all passed)
  - cancelTool()/cancelAllRunning() 记录 cancelledAt 时间戳
  - clearCompleted() 排除 3 秒内取消的工具（CANCEL_GRACE_MS = 3000）
  - AbortController 注册/清理/abort() 传播完整链路
  - cancelAllRunning() 对 pending+running 工具批量 abort
  - clearCompleted 同时清理已清除工具的 AbortController
  - undoClear 恢复时保留 cancelledAt

## 最后更新
2026-06-20 12:45
