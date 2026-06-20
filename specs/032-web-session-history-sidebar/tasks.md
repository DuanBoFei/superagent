# Implementation Tasks: Web Session History Sidebar

**Feature**: 032-web-session-history-sidebar
**Total Tasks**: 22
**Parallel Groups**: 5

**Design Sources for all [FE] tasks**:
- Root `DESIGN.md` sections: Brand & Style, Layout & Spacing, Elevation & Depth, Components, Terminal Output
- Visual samples: `specs/design-reference/stitch-export/claude_style_session_history/` and `specs/design-reference/stitch-export/session_history_replay/`
- Component baseline: React + project Web UI components; sidebar, list, playback, and dialog UI must preserve the compact terminal-first hierarchy from root `DESIGN.md`

---

## Task List

### 并行组 A: 类型 + DB + Store (5 任务，可独立并行)

#### T001 [BE]: 创建 Session History TypeScript 类型定义

- **FR 来源**: FR-SIDE-01 ~ FR-SIDE-25
- **依赖**: 无
- **目标**: 完整的会话历史类型系统，与 spec Key Entities 完全对应
- **任务内容**:
  1. 创建 `packages/web/src/types/session-history.ts`
  2. 定义 `SessionStatus` 类型：`'active' | 'completed' | 'error'`
  3. 定义 `SessionSummary` 接口（列表项：id, title, preview, createdAt/updatedAt, durationMs, toolCallCount, status, tags, forkedFrom）
  4. 定义 `Session` 接口（完整回放：messages, toolCalls, full metadata）
  5. 定义 `SearchQuery` 接口（text, dateRange, statusFilter, tagsFilter）
  6. 定义 `ExportFormatV1` 接口（version, exportedAt, sessions array）
  7. 定义 `PlaybackState` 接口（isPlaying, currentIndex, speed）
- **验证方式**: TypeScript strict mode 编译零错误
- **预计时间**: 1 hr

#### T002 [BE]: 实现 SQLite 数据库迁移 + Schema 扩展

- **FR 来源**: FR-SIDE-07 (FTS), FR-SIDE-22 (forking)
- **依赖**: T001
- **目标**: 009 现有 sessions 表的完整扩展，包括 FTS5 和标签表
- **任务内容**:
  1. 创建 migration `004_add_session_history_columns.sql`
  2. ALTER TABLE 添加所有新列（title, status, duration_ms, tool_call_count, message_count, forked_from, forked_at_message_index）
  3. 创建 `session_tags` 联结表（带 ON DELETE CASCADE）
  4. 创建性能索引（updated_at DESC, status, title, tag）
  5. 创建 `sessions_fts` FTS5 虚拟表
  6. 创建 triggers 保持 FTS 表与 sessions 表同步
  7. 测试空数据库和已有数据数据库的迁移结果
- **验证方式**: Migration 运行无错误；schema 检查正确；triggers 在 insert/update/delete 时正确同步 FTS
- **预计时间**: 2 hr

#### T003 [BE]: 实现 Session DB Service 层

- **FR 来源**: FR-SIDE-04, FR-SIDE-07, FR-SIDE-14, FR-SIDE-16, FR-SIDE-18
- **依赖**: T002
- **目标**: 完整的 CRUD + 搜索 + 标签管理服务层
- **任务内容**:
  1. 创建 `packages/web/src/services/session-db.service.ts`
  2. `getSessionSummaries()` - 分页获取会话列表，默认按 updated_at DESC
  3. `getSession(id)` - 获取单个完整会话
  4. `updateSession()` - 更新元数据（title, tags, etc.）
  5. `deleteSession(id)` / `deleteSessions(ids[])` - 单个/批量删除
  6. `searchSessions(query)` - FTS5 全文搜索 + 过滤器组合
  7. `addTag(sessionId, tag)` / `removeTag(sessionId, tag)` - 标签管理
  8. `getAllTags()` - 获取所有唯一标签用于筛选器
  9. 所有方法返回 Promise，不阻塞主线程
- **验证方式**: 单元测试：所有 CRUD 操作正确；搜索返回预期结果；标签增删正确
- **预计时间**: 2 hr

#### T004 [BE]: 实现 Zustand Session History Slice

- **FR 来源**: FR-SIDE-01, FR-SIDE-03, FR-SIDE-04, FR-SIDE-09
- **依赖**: T001, T003
- **目标**: 会话列表状态管理，过滤/排序状态，读取缓存
- **任务内容**:
  1. 创建 `packages/web/src/store/slices/session-history.slice.ts`
  2. State: `sessions: SessionSummary[]`, `filters: SearchQuery`, `activeSessionId: string | null`
  3. State: `sidebarOpen: boolean`, `sidebarWidth: number`, `sidebarMode: 'dock' | 'overlay'`
  4. Actions: `setFilters()`, `toggleSidebar()`, `setSidebarWidth()`, `setSidebarMode()`
  5. Actions: `selectSession(id)`, `refreshSessions()` - 通过 DB service 读取
  6. Actions: `updateTags(sessionId, tags[])`, `updateTitle(sessionId, title)`
  7. 集成到主 store index.ts
- **验证方式**: 单元测试：所有 actions 正确更新 state
- **预计时间**: 1.5 hr

#### T005 [BE]: 实现 Derived State Selectors

- **FR 来源**: FR-SIDE-07, FR-SIDE-08, FR-SIDE-09
- **依赖**: T001, T004
- **目标**: 纯函数派生状态选择器，零重复计算
- **任务内容**:
  1. 创建 `packages/web/src/store/slices/session-history.selectors.ts`
  2. `selectFilteredSessions` - 按搜索词+日期+状态+标签过滤（调用 DB service）
  3. `selectSortedSessions` - 默认按 updated_at DESC
  4. `selectActiveSession` - 当前选中的完整会话
  5. `selectSessionTags` - 所有会话的唯一标签集合（用于 filter chips）
  6. `selectStats` - 统计：总数、各状态数量
  7. useMemo 优化：仅依赖变化时重算
- **验证方式**: 单元测试：筛选/排序/统计正确
- **预计时间**: 1.5 hr

---

### 并行组 B: 基础 UI 组件 (5 任务，可独立并行)

#### T006 [FE]: 实现 Sidebar Container + 拖拽宽度

- **FR 来源**: FR-SIDE-01, FR-SIDE-02, FR-SIDE-03
- **依赖**: T001, T004
- **目标**: 可收起/展开的侧边栏容器，可拖拽调整宽度
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/SessionHistorySidebar.tsx`
  2. Toggle 按钮 + 滑入滑出动画（<150ms）
  3. 拖拽手柄：min 280px / max 600px / default 360px
  4. Dock 模式（推挤主内容区）vs Overlay 模式（浮动覆盖）
  5. 窗口 <768px 时自动切换到 overlay 模式
  6. ESC 键关闭侧边栏
  7. Focus management：打开时焦点移到搜索框
- **验证方式**: 组件测试：开关动画流畅；拖拽边界正确；响应式模式切换正确
- **预计时间**: 2 hr

#### T007 [FE]: 实现 SessionListItem 会话卡片组件

- **FR 来源**: FR-SIDE-04, FR-SIDE-05, FR-SIDE-06
- **依赖**: T001
- **目标**: 单个会话列表项，显示所有元数据
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/SessionListItem.tsx`
  2. 标题（加粗）+ 第一条消息预览（灰色小字，最多 2 行，省略号）
  3. 时长（MM:SS 格式）+ 工具调用数量（badge）
  4. 状态徽章：active（蓝色）/ completed（绿色）/ error（红色）
  5. 标签 chips：最多显示 3 个，多余显示 +N
  6. Fork 指示器：从其他会话 fork 来的显示图标 + hover tooltip
  7. Active session 高亮效果
  8. 删除按钮（hover 时出现）+ checkbox 用于多选
- **验证方式**: 组件测试：所有状态渲染正确；文本截断正确
- **预计时间**: 1.5 hr

#### T008 [FE]: 实现 SessionList + 虚拟滚动

- **FR 来源**: NFR-SIDE-02, FR-SIDE-04
- **依赖**: T001, T007
- **目标**: 100+ 会话仍保持 60fps 滚动性能
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/SessionList.tsx`
  2. 使用 react-window VariableSizeList（每个 item 高度可变）
  3. 阈值：>20 个会话自动启用虚拟滚动
  4. 多选模式：Shift+点击范围选择，Ctrl+点击单个
  5. 列表空状态："No sessions yet" + 提示
  6. 加载状态 skeleton
- **验证方式**: 性能测试：100 项渲染 <200ms，滚动 60fps
- **预计时间**: 2 hr

#### T009 [FE]: 实现 SessionSearchFilter 搜索筛选组件

- **FR 来源**: FR-SIDE-07, FR-SIDE-08, FR-SIDE-09
- **依赖**: T001, T005
- **目标**: 全文搜索 + 日期范围 + 状态 + 标签组合筛选
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/SessionSearchFilter.tsx`
  2. 搜索输入框：placeholder "Search sessions..."，清除按钮
  3. 日期范围选择器：预设（Today/Last 7 days/Last 30 days/All）+ 自定义范围
  4. 状态下拉：All / Active / Completed / Error
  5. 标签 chips：点击标签筛选，再次点击取消，全部标签可展开
  6. 搜索结果中匹配片段高亮（bold 显示匹配文本）
  7. 搜索 debounce 200ms（避免频繁查询 DB）
- **验证方式**: 组件测试：所有筛选器正确更新 store state；高亮显示正确
- **预计时间**: 2 hr

#### T010 [FE]: 实现 TagManager 标签管理组件

- **FR 来源**: FR-SIDE-23, FR-SIDE-24
- **依赖**: T001, T004
- **目标**: 会话添加/移除标签，点击标签筛选
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/TagManager.tsx`
  2. 输入框打字添加标签（Enter 确认，自动去重）
  3. 每个标签带 × 按钮可删除
  4. 标签颜色自动分配（基于 hash 的固定颜色）
  5. 点击列表中的标签 → 自动填入筛选器
  6. 空状态提示 "Add tags to organize sessions"
- **验证方式**: 组件测试：添加/删除正确；标签筛选联动正确
- **预计时间**: 1 hr

---

### 并行组 C: 回放系统 (4 任务，依赖 A+B)

#### T011 [FE]: 实现 SessionDetailPanel 会话详情面板

- **FR 来源**: FR-SIDE-11, FR-SIDE-13
- **依赖**: T001, T004, 027 Message 组件, 028 ToolCard 组件
- **目标**: 在主面板显示完整会话内容，复用现有消息渲染
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/SessionDetailPanel.tsx`
  2. 复用 027 的 Message 组件渲染每条消息
  3. 复用 028 的 ToolCard 组件渲染工具调用
  4. 复用 030 的 TerminalRenderer 渲染 bash 输出（如果已完成）
  5. 会话元数据头部：标题、时间、时长、标签、fork 链接
  6. "Fork from here" 按钮（每条消息 hover 时出现）
  7. Read-only 模式指示（历史会话不可编辑）
- **验证方式**: 组件测试：消息/工具正确渲染；fork 按钮出现时机正确
- **预计时间**: 2 hr

#### T012 [INT]: 实现 useSessionPlayback hook + state slice

- **FR 来源**: FR-SIDE-12, FR-SIDE-13
- **依赖**: T001, T004
- **目标**: 回放状态机 + 计时器控制
- **任务内容**:
  1. 创建 `packages/web/src/store/slices/session-playback.slice.ts`
  2. State: `isPlaying`, `currentIndex`, `playbackSpeed: 1 | 2 | 4`
  3. Actions: `play()`, `pause()`, `stepForward()`, `stepBack()`, `jumpTo(index)`, `setSpeed()`, `showAll()`
  4. 创建 `packages/web/src/hooks/useSessionPlayback.ts`
  5. requestAnimationFrame 驱动的计时器（根据 speed 计算间隔）
  6. 播放到最后一条消息自动停止
  7. 切换会话时自动 reset 回放状态
- **验证方式**: 单元测试：播放/暂停/跳转逻辑正确；速度设置生效
- **预计时间**: 2 hr

#### T013 [FE]: 实现 PlaybackControls 回放控制组件

- **FR 来源**: FR-SIDE-12
- **依赖**: T001, T012
- **目标**: 播放/暂停/步进/跳转 + 速度控制
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/PlaybackControls.tsx`
  2. Play/Pause 主按钮（大按钮，最突出）
  3. Step forward / Step back 按钮（逐条消息浏览）
  4. Speed selector: 1x / 2x / 4x
  5. "Show All" 按钮：立即显示全部消息
  6. 进度指示器：`15 / 42 messages`
  7. Keyboard shortcuts: Space (play/pause), ←/→ (step), Home/End
- **验证方式**: 组件测试：所有按钮触发正确 actions；键盘快捷键工作
- **预计时间**: 1.5 hr

#### T014 [FE]: 实现 PlaybackTimeline 时间线滑块

- **FR 来源**: FR-SIDE-12
- **依赖**: T001, T012
- **目标**: 可视化时间线，点击跳转到任意消息
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/PlaybackTimeline.tsx`
  2. 水平进度条，显示当前位置
  3. 点击任意位置跳转到对应消息索引
  4. 工具调用标记：tool call 位置显示小圆点
  5. 拖动 scrubber 实时预览消息编号
  6. Hover 显示消息预览 tooltip
- **验证方式**: 组件测试：点击跳转到正确位置；拖动流畅；60fps
- **预计时间**: 1.5 hr

---

### 并行组 D: 操作功能 (4 任务，依赖 A 组)

#### T015 [FE]: 实现 Session Export/Import 功能

- **FR 来源**: FR-SIDE-14, FR-SIDE-15, FR-SIDE-16, FR-SIDE-17
- **依赖**: T001, T003
- **目标**: 单个/批量/全部导出为 JSON，从文件导入
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/SessionExportImport.tsx`
  2. 创建 `packages/web/src/hooks/useSessionExportImport.ts`
  3. Export 功能：单个会话 / 选中的多个会话 / 全部会话
  4. Export JSON schema: version 1, exportedAt timestamp, sessions array
  5. Import 功能：文件选择 + drag & drop 区域
  6. Import ID 冲突处理：总是生成新 UUID（不覆盖现有）
  7. Import 后新会话出现在列表顶部（updated_at = now），保留原始 created_at
  8. Fork 关系重映射：导入时 forked_from 指向新的导入 ID
- **验证方式**: 组件测试：导出文件格式正确；导入后内容一致；ID 冲突正确解决
- **预计时间**: 2.5 hr

#### T016 [INT]: 实现 Delete + Undo 机制

- **FR 来源**: FR-SIDE-18, FR-SIDE-19, FR-SIDE-20
- **依赖**: T001, T003
- **目标**: 单个/批量/全部删除 + 5 秒撤销窗口
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/SessionDeleteConfirm.tsx`
  2. 单个删除确认对话框："Delete this session?" Yes/Cancel
  3. 批量删除："Delete N selected sessions?"
  4. Clear All：要求输入 "DELETE" 字符串确认（防止误触）
  5. 删除后显示 Undo toast：5 秒倒计时，点击 Undo 恢复
  6. Store 中的 tombstone 队列：保存已删除会话 5 秒
  7. 5 秒后真正从 DB 删除，tombstone 清理
- **验证方式**: 组件测试：删除确认正确；Undo 在 5 秒内可恢复；Clear All 需要输入字符串
- **预计时间**: 2 hr

#### T017 [INT]: 实现 Session Fork 分支功能

- **FR 来源**: FR-SIDE-21, FR-SIDE-22
- **依赖**: T001, T003, T012
- **目标**: 从历史会话任意点 fork 新会话
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/SessionForkDialog.tsx`
  2. "Fork from here" 按钮出现在每条消息 hover 时 + 播放控制栏
  3. Fork 逻辑：复制源会话到当前索引的所有消息
  4. 新会话 forked_from = 源会话 ID，forked_at_message_index = N
  5. Fork 后自动切换主聊天到新会话
  6. 新会话标题可编辑，默认：`Fork of "[original title]"`
  7. Fork 指示器可点击，跳转回父会话
- **验证方式**: 集成测试：fork 后新会话包含正确消息数；fork 关系元数据正确
- **预计时间**: 2 hr

#### T018 [FE]: 实现 TitleEdit 内联标题编辑器

- **FR 来源**: FR-SIDE-25
- **依赖**: T001, T004
- **目标**: 点击标题即可编辑，自动保存
- **任务内容**:
  1. 创建 `packages/web/src/components/sidebar/TitleEdit.tsx`
  2. 点击标题切换到 input 模式，全选文字
  3. Enter 保存，Esc 取消
  4. Blur 时自动保存（on blur）
  5. 保存状态指示器（Saving... ✓ Saved）
  6. 空标题自动回退到默认："Untitled Session"
- **验证方式**: 组件测试：编辑/保存/取消逻辑正确；auto-save on blur
- **预计时间**: 1 hr

---

### 并行组 E: 集成 + 完善 + 测试 (4 任务，串行，依赖所有)

#### T019 [INT]: 主聊天面板集成

- **FR 来源**: FR-SIDE-11
- **依赖**: T011, 026 主聊天
- **目标**: 点击会话加载到主面板，fork 后无缝切换
- **任务内容**:
  1. 修改 `packages/web/src/components/chat/ChatPanel.tsx`
  2. 接收 `viewMode: 'live' | 'playback'` prop
  3. Playback 模式：消息从 playback state 获取，而非 WebSocket 流
  4. Playback 模式指示条：显示正在查看历史 + "Resume live chat" 按钮
  5. 从 playback 模式发送新消息 → 自动 fork 新会话
  6. 状态同步：store 中的 activeSessionId 变化时面板切换
- **验证方式**: 集成测试：点击会话正确加载；发送消息自动 fork；切换无闪烁
- **预计时间**: 2 hr

#### T020 [FE]: 响应式 + 可访问性优化

- **FR 来源**: FR-SIDE-03, NFR-SIDE-09, NFR-SIDE-10
- **依赖**: T006, T013
- **目标**: WCAG AA 达标，完整键盘导航，屏幕阅读器友好
- **任务内容**:
  1. 响应式：<768px 自动 overlay 模式，覆盖全屏 90% 宽度
  2. 键盘导航完整：Tab 顺序正确；Enter 激活；Space 播放/暂停；方向键导航列表
  3. ARIA labels：所有交互元素有描述；aria-live 区域播报状态变化
  4. 颜色对比度：所有文本 ≥4.5:1
  5. Focus management：侧边栏打开/关闭时焦点正确移动
  6. Prefers reduced motion：用户开启时禁用动画
- **验证方式**: axe-core 零错误；键盘可操作所有功能；屏幕阅读器测试
- **预计时间**: 2 hr

#### T021 [INT]: 性能优化

- **FR 来源**: NFR-SIDE-01 ~ NFR-SIDE-07
- **依赖**: T008, T009, T011
- **目标**: 所有性能指标达标
- **任务内容**:
  1. 搜索 debounce：200ms 延迟避免频繁 DB 查询
  2. 列表虚拟化优化：item size 预计算，over scan 调整
  3. 大图会话 lazy load：只渲染可见消息，滚动时动态加载
  4. React.memo 包装 SessionListItem：仅 props 变化时重绘
  5. FTS5 搜索优化：LIMIT + 分页，避免一次返回 1000 条
  6. 导出优化：流式 JSON 序列化，避免一次内存过大
- **验证方式**: 性能基准测试：所有指标达标（toggle<150ms, list<200ms, search<100ms, load<500ms）
- **预计时间**: 2 hr

#### T022 [INT]: 完整测试覆盖

- **FR 来源**: All FRs + NFRs
- **依赖**: T019, T020, T021
- **目标**: 单元 + 组件 + 集成 + 性能 + 可访问性测试全覆盖
- **任务内容**:
  1. Selectors 单元测试：筛选/排序/统计正确
  2. Session DB Service 单元测试：CRUD + FTS 搜索正确
  3. useSessionPlayback hook 单元测试
  4. 所有 8 个组件测试（Sidebar/ListItem/List/Search/TagManager/Playback/Export/Delete）
  5. 集成测试：fork 端到端、导出→导入 roundtrip、搜索 100 会话
  6. 性能基准测试（7 项指标全部达标）
  7. axe-core 可访问性零错误
  8. 核心覆盖率 ≥90%
- **验证方式**: vitest 所有测试通过
- **预计时间**: 3 hr

---

## 开发顺序与依赖图

```
Phase 1 (完全并行):
  A1: T001 (types)
  A2: T002 (DB migration)
  A3: T003 (DB service)
  A4: T004 (zustand slice)
  A5: T005 (selectors)

Phase 2 (完全并行):
  B1: T006 (Sidebar container + drag)
  B2: T007 (SessionListItem)
  B3: T008 (SessionList + virtual scroll)
  B4: T009 (SearchFilter)
  B5: T010 (TagManager)

Phase 3 (依赖 A+B):
  C1: T011 (SessionDetailPanel)
  C2: T012 (useSessionPlayback hook + slice)
  C3: T013 (PlaybackControls)
  C4: T014 (PlaybackTimeline)

Phase 4 (依赖 A):
  D1: T015 (Export/Import)
  D2: T016 (Delete + Undo)
  D3: T017 (Session Fork)
  D4: T018 (TitleEdit)

Phase 5 (串行，依赖所有前置):
  E1: T019 (Main Chat Panel integration)
  E2: T020 (Accessibility + Responsive)
  E3: T021 (Performance optimization)
  E4: T022 (Full test coverage)
```

---

## 验收标准

- ✅ 所有 22 个任务完成
- ✅ TypeScript strict mode 编译零错误
- ✅ 单元测试 + 组件测试全部通过，核心覆盖率 ≥ 90%
- ✅ 侧边栏开关 <150ms，100 会话列表渲染 <200ms
- ✅ 全文搜索 100 会话 <100ms，100 条消息会话加载 <500ms
- ✅ 播放帧率 ≥30fps，动画流畅无 jank
- ✅ 导出/导入 10 会话 <1s
- ✅ 5 种状态单个/批量删除 + 5s Undo 窗口工作
- ✅ Fork from any message index 正确复制消息 + 维护关系
- ✅ 标签管理：添加/删除/筛选，点击标签过滤会话
- ✅ 播放控制：Play/Pause/Step/Show All + 1x/2x/4x 速度
- ✅ 时间线滑块点击跳转 + scrubber 预览
- ✅ 响应式：<768px 自动 overlay 模式
- ✅ WCAG AA 可访问性：键盘全操作，屏幕阅读器友好
- ✅ 所有颜色对比度 ≥4.5:1
- ✅ 深色主题样式与整体 UI 协调统一
- ✅ 导出→导入 roundtrip 内容 100% 一致
- ✅ FTS5 搜索结果高亮匹配片段

---

**Tasks Version**: v1.0
**Created**: 2026-06-19
**Task Count**: 22
**Next Step**: Proceed to implementation, or continue to next feature

---

## Feature 032 完成！

**✅ 032-web-session-history-sidebar 文档四步全部完成：**
1. `spec.md` - 规格说明
2. `checklists/requirements.md` - 质量检查清单
3. `plan.md` - 实现计划
4. `tasks.md` - 22 个任务分解

---

## PRD Must-have Features 进度总结

| 序号 | Feature | 状态 |
|-----|---------|------|
| 029 | web-diff-display | ✅ 已完成 |
| 030 | web-terminal-color-output | ✅ 已完成 |
| 031 | web-parallel-tool-grid | ✅ 已完成 |
| 032 | web-session-history-sidebar | ✅ 已完成 |

**🎉 所有 4 个 PRD Must-have 前端功能的规格文档已全部完成！**

接下来可以：
1. 进入实现阶段，开始逐个 feature 的编码工作
2. 继续完善后端功能的文档
3. 开始 code review 和优化建议
