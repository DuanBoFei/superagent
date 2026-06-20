# 会话总结 · web-parallel-tool-grid

## Feature 概述

Feature 031 实现了 SuperAgent Web 端的并行工具网格可视化系统。核心能力：将 Agent 并行工具执行
转为浏览器网格展示——ToolCard 五态卡片（pending/running/success/failed/cancelled）、进度条、错误
聚合面板、批量操作栏、资源条形图、排序筛选、视图切换、虚拟滚动。

跨 feature 链路：026 (Tool Orchestrator) → 028 (CardRenderer bridge) → 030 (TerminalRenderer ANSI) → 031 (ToolGrid main)

## 完成状态 · 2026-06-20

✅ **FEATURE COMPLETE** · tag: `v0.1.0-031-web-parallel-tool-grid`

### 任务完成清单 (T001–T020 + 5 收尾补测)

| 任务 | 描述 | 状态 |
|------|------|------|
| T001 | ToolGrid TypeScript 类型定义 (90行, 12 types) | ✅ |
| T002 | ToolGrid Store Slice (290+行, factory pattern) | ✅ |
| T003 | Derived State Selectors (135行, 5 selectors) | ✅ |
| T004 | Tool Orchestrator 事件订阅集成 (Zod parsed → slice dispatch) | ✅ |
| T005 | ToolProgressBar (determinate/indeterminate, 15 tests) | ✅ |
| T006 | ToolTimer + useToolTimer hook (29 tests) | ✅ |
| T007 | ToolCard 基础卡片组件 (117行, 27 tests) | ✅ |
| T008 | ErrorAggregationPanel (48行, 19 tests) | ✅ |
| T009 | BulkActionBar cancel/clear/undo (45行, 18 tests) | ✅ |
| T010 | SortFilterControls (64行, 15 tests, 24 combos) | ✅ |
| T011 | ViewToggle Grid/List (12行, 15 tests) | ✅ |
| T012 | ResourceBarChart duration/output metrics (79行, 26 tests) | ✅ |
| T013 | useToolVirtualScroll hook (34行, 20 tests) | ✅ |
| T014 | ToolGrid 主组件 + 响应式布局 (89行, 24 tests) | ✅ |
| T015 | AbortController cancel signal propagation (21 tests) | ✅ |
| T016 | 028 CardRenderer 集成 (renderCardsGrid bridge, 23 tests) | ✅ |
| T017 | TerminalRenderer 懒加载集成 (12 tests) | ✅ |
| T018 | Output preview 节流优化 (15 tests) | ✅ |
| T019 | Accessibility WCAG AA (47 a11y tests + CSS) | ✅ |
| T020 | Full test coverage (56 files, 595 tests, 0 regressions) | ✅ |
| Gap ① | Design token lint — stylelint config + DESIGN.md enforcement | ✅ |
| Gap ② | Full-chain journey test — path-inventory + J-031-001 (17 tests) | ✅ |
| Gap ③ | L3 a11y audit — axe-core scan + structure tests | ✅ |
| Gap ④ | L4 responsive — multi-viewport Playwright tests (1920/1280/768/500) | ✅ |
| Gap ⑤ | L2 visual regression — Playwright screenshot snapshots | ✅ |

### 文件清单

**新建文件 (23)**:
- `packages/web/src/types/tool-grid.ts` — 12 types + calculateColumns()
- `packages/web/src/store/slices/tool-grid.slice.ts` — factory pattern, 290+ lines
- `packages/web/src/store/slices/tool-grid.selectors.ts` — 5 derived selectors, 135 lines
- `packages/web/src/hooks/use-tool-grid.ts` — event subscriber (026→031 bridge), 105 lines
- `packages/web/src/hooks/use-tool-timer.ts` — createToolTimer factory, 113 lines
- `packages/web/src/hooks/use-tool-virtual-scroll.ts` — virtual scroll adapter, 34 lines
- `packages/web/src/components/chat/tool-grid/ToolCard.ts` — 117 lines
- `packages/web/src/components/chat/tool-grid/ToolGrid.ts` — 89 lines, orchestrator
- `packages/web/src/components/chat/tool-grid/ToolProgressBar.ts` — 37 lines
- `packages/web/src/components/chat/tool-grid/ToolTimer.ts` — 22 lines
- `packages/web/src/components/chat/tool-grid/ErrorAggregationPanel.ts` — 48 lines
- `packages/web/src/components/chat/tool-grid/BulkActionBar.ts` — 45 lines
- `packages/web/src/components/chat/tool-grid/SortFilterControls.ts` — 64 lines
- `packages/web/src/components/chat/tool-grid/ViewToggle.ts` — 12 lines
- `packages/web/src/components/chat/tool-grid/ResourceBarChart.ts` — 79 lines
- `packages/web/src/components/chat/tool-grid/tool-grid-a11y.css` — WCAG AA styles
- `specs/031-web-parallel-tool-grid/path-inventory.json` — 4 features / 16 nodes / 14 edges / 1 journey
- `.stylelintrc.json` — DESIGN.md color enforcement
- `.stylelintignore`
- `tests/web/tool-grid-slice.test.ts`
- `tests/web/full-chain-tool-grid-journey.test.ts` — 17 cross-feature tests
- `tests/web/tool-grid-a11y.test.ts` — 47 a11y structure tests
- `tests/web/tool-grid-calculate-columns.test.ts`
- `tests/web/tool-grid-fixtures.ts`
- `tests/web/tool-grid-a11y-audit.test.ts`
- `tests/web/tool-grid-responsive.pwtest.ts`
- `tests/web/tool-grid-visual-regression.pwtest.ts`

**修改文件 (5)**:
- `package.json` — +stylelint deps + npm script
- `pnpm-lock.yaml` — stylelint lock
- `packages/web/src/components/chat/cards/CardRenderer.ts` — +renderCardsGrid() bridge
- `packages/web/src/components/chat/terminal/terminal.css` — stylelint fixes (duplicate blocks, focus ordering)
- `packages/web/src/components/chat/tool-grid/{7 components}` — T019 ARIA attributes

### 跨 feature 旅程 J-031-001

```
026 Tool Orchestrator
  → (ToolStart/ToolOutput/ToolComplete events, Zod validated)
  → 031 use-tool-grid subscriber (createToolGridSubscriber)
  → 031 tool-grid.slice (addTool/appendOutput/completeTool/failTool)
  → 031 selectors (filter/sort/metrics/stats)
  → 031 ToolGrid + ToolCard + sub-components
  → 030 TerminalRenderer (ANSI coloring for bash output)
  → 028 CardRenderer (renderCardsGrid bridge for card-stack→grid conversion)
```

14 条边全部 code-confirmed，每条带 provenance (file:line)。

### 测试矩阵

| 层级 | 文件数 | 测试数 | 工具 |
|------|--------|--------|------|
| Vitest unit/slice | 14 | 350+ | vitest + jsdom |
| ToolGrid 专项 | 19 | 413+ | vitest |
| Full-chain journey | 1 | 17 | vitest |
| Visual regression | 1 | — | Playwright (test:visual) |
| Responsive | 1 | — | Playwright (test:visual) |
| a11y audit | 2 | 47+ | vitest + axe-core |
| **全量 Web** | **56** | **595** | all green |

### 已知局限

1. Playwright visual/responsive tests need real browser: `pnpm test:visual`
2. `tool-grid-a11y.css` not imported by HTML string components → focus-visible/forced-colors/prefers-reduced-motion don't apply in jsdom
3. HTML string components can't directly run axe-core; must be attached to document.body first
4. TerminalRenderer in ToolCard is lazy-loaded (dynamic import), not SSR-safe

### 收尾命令

```bash
git add <feature-031 files>
git commit -m "feat(031): finalize — full-chain journey tests, stylelint config, a11y audit, responsive tests"
git tag v0.1.0-031-web-parallel-tool-grid
```

### specs 目录冻结

本 spec 归档不删。需求变更开新编号 (032+)。
