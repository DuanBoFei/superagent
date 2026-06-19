# Implementation Tasks: Web Tool Cards Rendering

**Feature**: 028-web-tool-cards  
**Total Tasks**: 20  
**Parallel Groups**: 4

**Design Sources for all [FE] tasks**:
- Root `DESIGN.md` sections: Brand & Style, Typography, Layout & Spacing, Elevation & Depth, Components, Terminal Output
- Visual samples: `specs/design-reference/stitch-export/claude_style_detailed_tool_cards/` and `specs/design-reference/stitch-export/humanist_detailed_tool_cards/`
- Component baseline: React + project Web UI components; tool cards and execution outputs must preserve the dense developer-tool hierarchy from root `DESIGN.md`

---

## Task List

### 并行组 A: 基础设施层 (6 任务，可并行)

#### T001 [BE]: 创建 ToolCard TypeScript 类型定义

- **FR 来源**: FR-CARD-01 ~ FR-CARD-25
- **依赖**: 无
- **目标**: 完整的卡片类型系统，包含 discriminant union
- **任务内容**:
  1. 创建 `packages/web/src/types/cards.ts`
  2. 定义 `ToolCardType` 枚举：9 种卡片类型
  3. 定义 `CardStatus` 枚举：pending / running / success / error
  4. 定义 `BaseCardState` 接口（id、type、status、timestamp、title）
  5. 定义每种卡片的专属 content 接口（BashCardContent、FileReadCardContent 等）
  6. 定义 discriminant union `ToolCardState` 类型
- **验证方式**: TypeScript strict mode 编译零错误
- **预计时间**: 1 hr

#### T002 [BE]: 实现 CardRegistry 卡片注册机制

- **FR 来源**: FR-CARD-22
- **依赖**: T001
- **目标**: 类型安全的可扩展卡片注册系统
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/CardRegistry.ts`
  2. 实现泛型 `registerCard(type, Component)` 方法
  3. 实现 `getCardComponent(type)` 查找方法
  4. 实现默认降级策略（未知类型渲染通用文本卡片）
  5. 内置所有卡片类型的注册入口
- **验证方式**: 单元测试：注册/查找正确，类型不匹配报错，未知类型降级
- **预计时间**: 1.5 hr

#### T003 [BE]: 实现 Zustand cards.slice 状态管理

- **FR 来源**: FR-CARD-19, FR-CARD-21, NFR-CARD-04
- **依赖**: T001
- **目标**: 卡片状态的集中管理 + 持久化
- **任务内容**:
  1. 创建 `packages/web/src/store/slices/cards.slice.ts`
  2. 实现状态结构：`Map<toolCallId, ToolCardState>`
  3. 实现 actions：`addCard` / `updateCard` / `removeCard` / `toggleExpanded`
  4. 集成 localStorage 持久化（展开/折叠状态）
  5. 集成到主 store
- **验证方式**: 单元测试：增删改查正确，刷新页面状态保持
- **预计时间**: 2 hr

#### T004 [FE]: 实现 CardHeader 通用头部组件

- **FR 来源**: FR-CARD-02, FR-CARD-03, FR-CARD-04, FR-CARD-20
- **依赖**: T001
- **目标**: 统一的卡片头部（状态图标、工具名、时间戳、操作按钮）
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/CardHeader.tsx`
  2. 4 种状态指示器样式（pending/spinner/success/error）
  3. 工具名称 + 时间戳显示
  4. 复制按钮（调用 027 useCopyToClipboard）
  5. 展开/折叠按钮 + 动画过渡
- **验证方式**: 组件测试：4种状态渲染正确，按钮点击触发对应 action
- **预计时间**: 1.5 hr

#### T005 [FE]: 实现 CardRenderer 主渲染器 + 垂直堆叠

- **FR 来源**: FR-CARD-01, FR-CARD-01a, FR-CARD-01b
- **依赖**: T002, T003, T004
- **目标**: 卡片分发主入口 + 多卡片垂直布局
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/CardRenderer.tsx`
  2. 从 CardRegistry 按类型查找对应组件
  3. 实现垂直堆叠布局（卡片间距、分割线）
  4. 每张卡片独立状态管理
  5. 未知卡片类型的降级渲染
  6. 集成到 MessageBubble 组件
- **验证方式**: 组件测试：9种卡片正确渲染，垂直堆叠正确，状态独立
- **预计时间**: 2 hr

#### T006 [BE]: 实现 ANSI 解析器 + useAnsiParser hook

- **FR 来源**: FR-CARD-06, NFR-CARD-06
- **依赖**: 无
- **目标**: 支持 256 色 + 基础格式的 ANSI 转义序列解析
- **任务内容**:
  1. 创建 `packages/web/src/lib/ansi-parser.ts`
  2. 支持标准 16 色 + 256 色调色板
  3. 支持格式：粗体、下划线、反显
  4. 创建 `packages/web/src/hooks/use-ansi-parser.ts` hook
  5. 处理增量流式解析（不重绘已解析内容）
  6. 无法识别的序列安全忽略
- **验证方式**: 单元测试：16色/256色/格式组合解析正确，增量追加正确
- **预计时间**: 2.5 hr

---

### 并行组 B: 基础卡片组件 (7 任务，可并行)

#### T007 [FE]: BashCard 终端输出卡片

- **FR 来源**: FR-CARD-06, FR-CARD-07, FR-CARD-08, NFR-CARD-03, FR-CARD-19a
- **依赖**: T004, T006
- **目标**: 流式终端输出卡片，含 ANSI 256色
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/BashCard.tsx`
  2. 集成 ANSI 解析器
  3. 流式增量内容追加（高效 DOM 更新）
  4. exit code 显示（成功/失败）
  5. 命令执行时长显示
  6. 超过 50 行默认折叠
  7. 超过 200 行自动开启虚拟滚动
- **验证方式**: 组件测试：颜色正确，流式追加正确，折叠/展开正确，虚拟滚动生效
- **预计时间**: 2.5 hr

#### T008 [FE]: FileReadCard 文件读取卡片

- **FR 来源**: FR-CARD-09, FR-CARD-19a
- **依赖**: T004
- **目标**: 带语法高亮的文件内容展示
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/FileReadCard.tsx`
  2. 显示文件路径、大小、行数
  3. 集成 027 语法高亮渲染
  4. 超过 50 行默认折叠
  5. 行号显示
- **验证方式**: 组件测试：文件元数据显示正确，语法高亮正常
- **预计时间**: 1.5 hr

#### T009 [FE]: FileWriteCard 文件写入卡片

- **FR 来源**: FR-CARD-10, FR-CARD-19a
- **依赖**: T004
- **目标**: 新建文件操作结果展示
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/FileWriteCard.tsx`
  2. 绿色 "新建" 标签 + 文件路径
  3. 显示写入行数
  4. 可展开查看写入的完整内容
  5. 短内容默认展开
- **验证方式**: 组件测试：状态标签正确，内容展开/折叠正确
- **预计时间**: 1 hr

#### T010 [FE]: FileEditCard 文件编辑 diff 卡片

- **FR 来源**: FR-CARD-11, FR-CARD-12, FR-CARD-19a
- **依赖**: T004
- **目标**: unified diff 格式的变更可视化
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/FileEditCard.tsx`
  2. 使用 `diff` 库解析 unified diff 格式
  3. 新增行绿色背景，删除行红色背景
  4. 显示变更统计（+N 行, -M 行）
  5. 超过 100 行 diff 默认折叠，显示 "查看完整变更" 按钮
- **验证方式**: 组件测试：diff 高亮正确，统计数字正确，大 diff 折叠生效
- **预计时间**: 2 hr

#### T011 [FE]: GrepCard 搜索结果卡片

- **FR 来源**: FR-CARD-13, FR-CARD-19a
- **依赖**: T004
- **目标**: 结构化的代码搜索结果展示
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/GrepCard.tsx`
  2. 按文件分组显示匹配项
  3. 每个匹配项显示行号 + 上下文代码
  4. 匹配文本黄色高亮
  5. 匹配总数显示
  6. 超过 20 个匹配默认折叠前 10 个
- **验证方式**: 组件测试：分组正确，高亮正确，折叠逻辑正确
- **预计时间**: 1.5 hr

#### T012 [FE]: GlobCard 文件匹配卡片

- **FR 来源**: FR-CARD-14, FR-CARD-19a
- **依赖**: T004
- **目标**: 文件名匹配结果列表
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/GlobCard.tsx`
  2. 列表形式显示匹配的文件名
  3. 匹配总数显示
  4. 超过 30 个文件默认折叠前 10 个
- **验证方式**: 组件测试：列表渲染正确，折叠逻辑正确
- **预计时间**: 1 hr

#### T013 [FE]: ErrorCard 智能错误摘要卡片

- **FR 来源**: FR-CARD-04
- **依赖**: T004
- **目标**: 错误摘要 + 可折叠堆栈跟踪
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/ErrorCard.tsx`
  2. 默认只显示错误类型和错误消息
  3. 可折叠区域显示完整堆栈跟踪
  4. 红色视觉风格 + 错误图标
  5. 一键复制完整错误详情
- **验证方式**: 组件测试：堆栈默认折叠，点击展开，复制功能正常
- **预计时间**: 1.5 hr

---

### 并行组 C: 高级卡片组件 (3 任务，可并行)

#### T014 [FE]: TaskListCard 任务列表进度卡片

- **FR 来源**: FR-CARD-15, FR-CARD-16
- **依赖**: T004
- **目标**: 多任务进度可视化
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/TaskListCard.tsx`
  2. 顶部总体进度条（已完成/总数）
  3. 每个任务的复选框 + 标题
  4. pending 任务灰色，running 显示 spinner，completed 绿色对勾
  5. 任务状态实时更新动画
- **验证方式**: 组件测试：进度条百分比正确，状态更新正确，动画流畅
- **预计时间**: 2 hr

#### T015 [FE]: SubAgentGridCard 子 Agent 网格卡片

- **FR 来源**: FR-CARD-17, FR-CARD-18
- **依赖**: T004, T007 (BashCard 可复用流式渲染逻辑)
- **目标**: 2列网格布局，每个子任务独立流式输出
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/SubAgentGridCard.tsx`
  2. CSS Grid 2列布局（响应式，窄屏自动1列）
  3. 每个网格单元独立状态管理
  4. 每个单元内流式输出内容
  5. 每个单元独立的成功/失败状态指示
  6. 单元边框和间距
- **验证方式**: 组件测试：网格布局正确，每个单元独立更新，状态互不干扰
- **预计时间**: 2.5 hr

#### T016 [FE]: WebSearchCard 网络搜索结果卡片

- **FR 来源**: FR-CARD-23, FR-CARD-24, FR-CARD-25
- **依赖**: T004
- **目标**: 结构化搜索结果展示
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/cards/WebSearchCard.tsx`
  2. 顶部显示搜索 query
  3. 每个结果项：标题（可点击链接）、来源域名、内容摘要
  4. 链接新标签页打开
  5. 超过 5 个结果默认折叠前 5 个
  6. 总数显示
- **验证方式**: 组件测试：链接正确，点击打开新标签，折叠逻辑正确
- **预计时间**: 2 hr

---

### 并行组 D: 优化与测试 (4 任务，串行依赖)

#### T017 [FE]: 性能优化 + 样式精调

- **FR 来源**: NFR-CARD-01, NFR-CARD-02, NFR-CARD-03, NFR-CARD-07, NFR-CARD-08
- **依赖**: T005, T007-T016 全部完成
- **目标**: 流畅的性能和精美的样式
- **任务内容**:
  1. React.memo 包装所有卡片组件，避免不必要重渲染
  2. Bash 流式渲染的 rAF 节流批处理
  3. 长内容虚拟滚动集成（复用 026 useVirtualScroll）
  4. 所有卡片的深色主题适配
  5. WCAG AA 对比度验证（所有文本颜色）
  6. 卡片间距、阴影、圆角的视觉统一
  7. 展开/折叠动画平滑过渡
- **验证方式**: 性能测试：单卡片 < 50ms 渲染；Bash 流式 60fps；对比度检查通过
- **预计时间**: 2 hr

#### T018 [INT]: Socket 事件集成端到端

- **FR 来源**: 所有 FR
- **依赖**: T003 (cards.slice), T005 (CardRenderer)
- **目标**: Socket 事件驱动完整卡片生命周期
- **任务内容**:
  1. 创建事件监听中间件：`tool_start` → `addCard`
  2. `tool_output` → `updateCard`（内容追加）
  3. `tool_complete` → `updateCard`（状态 → success）
  4. `tool_error` → `updateCard`（状态 → error + 错误信息）
  5. 事件 payload 的 Zod schema 验证 + 优雅降级
- **验证方式**: 集成测试：完整生命周期正确执行，格式错误不崩溃而是降级显示
- **预计时间**: 2 hr

#### T019 [INT]: 核心单元测试 + 组件测试

- **依赖**: 所有组件完成
- **目标**: 核心逻辑测试覆盖
- **任务内容**:
  1. CardRegistry 单元测试（注册/查找/降级/类型安全）
  2. ANSI 解析器单元测试（16色/256色/格式/混合/增量）
  3. cards.slice 单元测试（增删改查/持久化）
  4. BashCard 组件测试（流式渲染/颜色/折叠/复制/虚拟滚动）
  5. FileEditCard 组件测试（diff 高亮/统计/大 diff 折叠）
  6. WebSearchCard 组件测试（链接/展开/复制）
  7. ErrorCard 组件测试（摘要/堆栈展开/复制）
- **验证方式**: vitest 所有测试通过，核心逻辑覆盖率 ≥ 85%
- **预计时间**: 3 hr

#### T020 [INT]: 端到端集成验收 + 视觉回归

- **依赖**: T018, T019
- **目标**: 完整功能验收
- **任务内容**:
  1. 端到端测试：Agent 执行命令 → 工具事件 → 卡片渲染完整流程
  2. 9 种卡片类型的视觉快照测试（像素级回归检查）
  3. 3 个工具并行执行 → 3 张卡片垂直堆叠测试
  4. 长输出性能测试（1000 行 Bash 输出）
  5. 刷新页面状态保持测试
  6. 浏览器兼容性测试（Chrome/Firefox）
  7. 最终用户体验走查
- **验证方式**: 所有验收标准通过，视觉快照无回归，性能达标
- **预计时间**: 2.5 hr

---

## 开发顺序与依赖图

```
Phase 1 (完全并行):
  A1: T001 (types)
  A2: T002 (registry)
  A3: T003 (zustand slice)
  A4: T004 (CardHeader)
  A5: T005 (CardRenderer)
  A6: T006 (ANSI parser + hook)

Phase 2 (并行，依赖 A1/A4):
  B1: T007 (BashCard)   ← 需要 T006
  B2: T008 (FileReadCard)
  B3: T009 (FileWriteCard)
  B4: T010 (FileEditCard)
  B5: T011 (GrepCard)
  B6: T012 (GlobCard)
  B7: T013 (ErrorCard)

Phase 3 (并行，依赖 A1/A4):
  C1: T014 (TaskListCard)
  C2: T015 (SubAgentGridCard)  ← 部分依赖 T007 流式逻辑
  C3: T016 (WebSearchCard)

Phase 4 (串行，依赖所有 Phase 1-3):
  D1: T017 (性能优化 + 样式精调)
  D2: T018 (Socket 事件集成)
  D3: T019 (单元测试 + 组件测试)
  D4: T020 (E2E 集成验收 + 视觉回归)
```

---

## 验收标准

- ✅ 所有 20 个任务完成
- ✅ TypeScript strict mode 编译零错误
- ✅ 单元测试 + 组件测试全部通过，核心覆盖率 ≥ 85%
- ✅ 9 种卡片类型全部正确实现，FR 覆盖率 100%
- ✅ 单卡片首次渲染 < 50ms
- ✅ Bash 流式渲染保持 60fps
- ✅ ANSI 256 色 + 基础格式全部正确渲染
- ✅ 智能默认折叠：短内容展开，长内容折叠
- ✅ 垂直堆叠多卡片独立状态，互不干扰
- ✅ 刷新页面卡片展开/折叠状态保持不变
- ✅ Socket 事件端到端集成正常
- ✅ 所有卡片深色主题适配，WCAG AA 对比度达标
- ✅ 错误卡片智能摘要，堆栈可折叠
- ✅ 所有卡片复制按钮功能正常
- ✅ Chrome/Firefox 两大浏览器兼容
- ✅ 视觉回归测试通过，所有卡片样式统一

---

**Tasks Version**: v1.0  
**Created**: 2026-06-18  
**Task Count**: 20  
**Next Step**: Proceed to implementation
