# 035-web-session-resume · 技术实施计划

## 1. 文档信息

| 项 | 值 |
|---|---|
| 版本 | v1.0 |
| 创建日期 | 2026-06-21 |
| 上游依赖 | spec.md |

## 2. 架构总图

```
┌──────────────────────────────────────────────────────────────────────┐
│                          packages/web/ (Next.js)                      │
│  ┌─────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ ChatPage                    │  │ Sidebar                        │  │
│  │ ┌─────────────────────────┐ │  │ ┌────────────────────────────┐ │  │
│  │ │ MessageList             │ │  │ │ SessionListItem            │ │  │
│  │ │ (activeSessionId 驱动)   │ │  │ │ streamingSessions 指示器    │ │  │
│  │ └─────────────────────────┘ │  │ │ (读 chatStore)              │ │  │
│  │ ┌─────────────────────────┐ │  │ │                            │ │  │
│  │ │ InputBox                │ │  │ │ + 新建 / 重命名 / 删除       │ │  │
│  │ │ disabled = activeId in   │ │  │ └────────────────────────────┘ │  │
│  │ │   streamingSessionIds    │ │  │                                │  │
│  │ └─────────────────────────┘ │  └────────────────────────────────┘  │
│  │                             │                                       │
│  │ chatStore (Zustand)        │  sessionHistoryStore (Zustand)        │
│  │ sessionMessages: Map<id,M[]>│  sessions[] / activeSessionId        │
│  │ activeSessionId: string|null│  selectSession / removeSession       │
│  │ streamingSessionIds: Set   │                                       │
│  └──────────────┬──────────────┘                                       │
│                 │ socket.io-client                                    │
└─────────────────┼────────────────────────────────────────────────────┘
                  │ localhost:3456
┌─────────────────┼────────────────────────────────────────────────────┐
│  src/server/    │                                                    │
│  ┌──────────────┴──────────────┐                                     │
│  │ SocketHub                   │                                     │
│  │ client_send → registerHandler│                                    │
│  │ rename_session → new handler │                                    │
│  │ delete_session → new handler │                                    │
│  │ get_sessions / load_session  │ (已有)                              │
│  └──────────────┬──────────────┘                                     │
│                 ▼                                                    │
│  ┌─────────────────────────────┐                                     │
│  │ RuntimeBridge (NEW)         │                                     │
│  │ handles: Map<id, Entry>     │                                     │
│  │ routeToRuntime(msg)         │                                     │
│  │   → get/create handle       │                                     │
│  │   → loadHistory if needed   │                                     │
│  │   → startTurn(content)      │                                     │
│  │ closeSession(id)            │                                     │
│  └──────────────┬──────────────┘                                     │
│                 ▼                                                    │
│  ┌─────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ AgentRuntime                │  │ stubs/session.ts (已有)         │ │
│  │ loadHistory(id) → NEW ~10行  │  │ saveSession(state) → SQLite    │ │
│  │ startTurn(msg) → 已有       │  │ loadSession(id) → SessionState │ │
│  │ resumeSession(id) → 保留不变 │  │ listSessions() → SessionEntry[]│ │
│  └─────────────────────────────┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## 3. 数据流

### 3.1 恢复会话 + 续聊

```
用户点击侧边栏 Session-B
  → socket.emit("load_session", { sessionId: "B" })
  → chatStore.sessionMessages["B"] = messages  (历史消息加载到缓存)
  → chatStore.activeSessionId = "B"
  → 聊天区显示历史消息

用户输入 "fix the bug"
  → socket.emit("client_send", { sessionId: "B", content: "fix the bug" })
  → SocketHub → runtimeBridge.routeToRuntime(msg)
      → handles.get("B") === undefined  (首次激活此 session)
      → handle = createRuntime({ loadSession, saveSession })
      → loadSession("B") 返回完整 SessionState → handle.loadHistory("B")
      → handle.startTurn("fix the bug")
          → session.messages 已有历史 → push user message → query loop
  → stream_token / message_complete → ChatPage
  → query loop 结束时 saveSession(session) 写回 SQLite
```

### 3.2 多 Session 并发切换

```
Session-A 正在 streaming
  → streamingSessionIds = {"A"}
  → 侧边栏 A 项显示 ● 进行中

用户点击 Session-B
  → activeSessionId = "B"  (只改指针)
  → streamingSessionIds.has("B") === false  → InputBox 可用
  → socket.emit("load_session", { sessionId: "B" })
  → 聊天区显示 B 的消息

Session-A stream_token 继续到达
  → onToken({ sessionId: "A", token })
  → chatStore.sessionMessages["A"] 追加 token
  → 不影响当前 UI

Session-A message_complete
  → streamingSessionIds.delete("A")
  → 侧边栏 A 项 ● 消失
  → saveSession(Session-A) 写 SQLite
```

### 3.3 会话生命周期

```
新建:
  侧边栏 "+" 按钮 → chatStore.reset() → activeSessionId = null
  → 用户输入 → 新 sessionId="X" → client_send → RuntimeBridge 创建 handle → DB 新建记录
  → message_complete 后 emit "get_sessions" → 侧边栏刷新

重命名:
  右键 → 编辑 → socket.emit("rename_session", { sessionId, title })
  → backend renameSession(id, title) → SQLite → emit "session_list"

删除:
  右键 → 确认 → socket.emit("delete_session", { sessionId })
  → RuntimeBridge.closeSession(id)  (abort + remove handle)
  → backend deleteSession(id) → SQLite → emit "session_list"
  → 侧边栏移除该项
```

## 4. 依赖与风险

### 4.1 上游依赖

| 依赖 | 状态 | 说明 |
|------|:--:|------|
| 034-web-e2e-connectivity | ✅ 完成 | Socket.io + RuntimeBridge + ChatPage 链路已通 |
| 032-web-session-history-sidebar | ✅ 完成 | 侧边栏 UI + SessionListItem + 右键菜单 |
| stubs/session.ts | ✅ 已有 | saveSession / loadSession / listSessions |
| AgentRuntime | ✅ 已有 | startTurn / resumeSession，需新增 loadHistory |

### 4.2 风险

| 风险 | 严重度 | 概率 | 对策 |
|------|:--:|:--:|------|
| loadHistory + startTurn 的 session 变量覆盖 | 低 | 低 | loadHistory 直接赋值 `session = loaded`，startTurn 读同一变量，TS 保证同一 RuntimeHandle 内串行 |
| 多 handle 内存增长 | 低 | 低 | idle handle 不占 CPU，内存由 SessionState.messages[] 决定；后期可加 LRU 淘汰 |
| saveSession 在 closeSession 时可能未完成 | 中 | 低 | query loop 每次 turn 结束时已调 saveSession（已有机制），closeSession 时数据已落盘 |

## 5. 任务分组

总共 13 个 task，分 4 个 wave：

### Wave 1: Runtime 层 (T001-T003)

| Task | 描述 | 标签 | 依赖 |
|------|------|:--:|------|
| T001 | RuntimeHandle 新增 loadHistory 方法 | [BE] | - |
| T002 | RuntimeBridge 多句柄：Map + routeToRuntime + closeSession | [BE] | T001 |
| T003 | RuntimeBridge 单元测试 | [BE] | T002 |

### Wave 2: 服务端事件 (T004-T006)

| Task | 描述 | 标签 | 依赖 |
|------|------|:--:|------|
| T004 | SocketHub 注册 rename_session / delete_session handler | [BE] | - |
| T005 | SessionDataProvider 新增 renameSession / deleteSession | [BE] | - |
| T006 | socket-handlers 集成测试 | [BE] | T004, T005 |

### Wave 3: 前端状态与连通 (T007-T010)

| Task | 描述 | 标签 | 依赖 |
|------|------|:--:|------|
| T007 | chatStore 改造：sessionMessages / streamingSessionIds / activeSessionId | [FE] | - |
| T008 | ChatPage wire session_loaded + per-session socket 事件写入 | [FE] | T002, T007 |
| T009 | 侧边栏：新建按钮 + 重命名/删除 wire socket 事件 | [FE] | T004, T008 |
| T010 | chatStore + InputBox 测试 | [FE] | T007 |

### Wave 4: E2E 与收尾 (T011-T013)

| Task | 描述 | 标签 | 依赖 |
|------|------|:--:|------|
| T011 | E2E 测试：选会话→续聊→Agent 在上下文中回复 | [INT] | T008, T009 |
| T012 | E2E 测试：多 session 切换 + 后台 streaming + 新建/重命名/删除 | [INT] | T009 |
| T013 | 代码审查 + 文档更新 | [INT] | T011, T012 |

## 6. 关键文件改动

| 文件 | 改动 | 体积 |
|------|------|:--:|
| `src/runtime/runtime.ts` | RuntimeHandle 新增 loadHistory (~10 行) | 小 |
| `src/server/runtime-bridge.ts` | handles Map + routeToRuntime 重写 + closeSession | 大 |
| `src/server/socket-handlers.ts` | rename_session / delete_session handler | 小 |
| `src/server/socket-hub.ts` | registerHandlers 注册新事件 | 小 |
| `src/server/socket-types.ts` | 新增事件类型 | 小 |
| `src/persistence/session-manager.ts` | renameSession / deleteSession 方法 | 中 |
| `packages/web/src/store/chat.ts` | sessionMessages Map + streamingSessionIds Set | 大 |
| `packages/web/src/components/chat/chat-page.tsx` | wire session_loaded + per-session 事件 | 中 |
| `packages/web/src/components/chat/input-box.tsx` | isStreaming → per-session check | 小 |
| `packages/web/src/components/sidebar/` | 新建按钮 + 重命名/删除 emit | 中 |
