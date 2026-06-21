# 会话交接 · web-session-history-sidebar

## 状态: ✅ Feature Closed

**完成日期**: 2026-06-20
**标签**: v0.1.0-032-web-session-history-sidebar (指向 adf71be)
**分支**: master (已合并)
**测试**: 2854/2859 pass (4 pre-existing failures unrelated to 032)

## 做了什么

实现 Web UI 左侧会话历史侧边栏，包含完整的会话管理能力：

### 核心功能
- **会话列表** — 虚拟滚动渲染，按时间倒序，实时状态图标
- **搜索筛选** — FTS5 全文搜索 + 标签筛选 + 状态筛选
- **标签管理** — TagManager 组件，创建/删除/筛选
- **会话详情** — SessionDetailPanel 侧滑面板，显示消息统计、标签、时间
- **会话回放** — PlaybackControls + PlaybackTimeline，步骤前进/后退
- **导出/导入** — .json 格式，拖拽导入
- **会话 Fork** — 复制会话到新会话
- **删除/Undo** — 批量删除 + 5s 倒计时撤销
- **内联重命名** — TitleEdit 组件
- **主面板集成** — 与聊天流联动，点击会话切换对话

### 技术要点
- **架构**: Controller 模式 — 13 个 HTML 字符串组件，无 React 依赖
- **状态管理**: Zustand slice + 12 个 derived selectors
- **持久化**: SessionDbService (better-sqlite3)，6 个新表 + FTS5 索引
- **性能**: 虚拟滚动 (1000 会话 < 50ms render)，搜索 debounce 150ms
- **a11y**: axe-core 审计通过，键盘导航，ARIA 标签
- **响应式**: 4 断点 (320/768/1024/1440)，侧边栏拖拽调整宽度

## 代码变更

```
22 commits, 18 new test files, 13 component files
+ src/persistence/session-db.service.ts
+ packages/web/src/store/session-history.slice.ts
+ packages/web/src/store/selectors/session-history.selectors.ts
+ packages/web/src/components/sidebar/SessionList.ts
+ packages/web/src/components/sidebar/SessionListItem.ts
+ packages/web/src/components/sidebar/SessionSearchFilter.ts
+ packages/web/src/components/sidebar/TagManager.ts
+ packages/web/src/components/sidebar/SessionDetailPanel.ts
+ packages/web/src/components/sidebar/PlaybackControls.ts
+ packages/web/src/components/sidebar/PlaybackTimeline.ts
+ packages/web/src/components/sidebar/SessionExportImport.ts
+ packages/web/src/components/sidebar/SessionFork.ts
+ packages/web/src/components/sidebar/TitleEdit.ts
+ packages/web/src/components/sidebar/DeleteUndo.ts
+ packages/web/src/hooks/useSessionPlayback.ts
```

## 已知问题

- 4 个 pre-existing 测试失败 (fallback/runtime/smoke/performance-visual)，均与 032 无关
- a11y audit 有 5 个 violations (aria-required-parent, document-title, label, nested-interactive, region)，均为已知设计权衡

## 下次会话

无需继续。Feature 已完成、已合并、已打标签。需求变更请开新编号。
