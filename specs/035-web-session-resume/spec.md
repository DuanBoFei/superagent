# 035-web-session-resume · 功能规格

## 1. 文档信息

| 项 | 值 |
|---|---|
| 文档名称 | 会话恢复后继续对话 · 功能规格 |
| 版本 | v1.0 |
| 状态 | Approved |
| 创建日期 | 2026-06-21 |
| 上游依赖 | 034-web-e2e-connectivity (Socket.io + RuntimeBridge + ChatPage 打通) |
| 关联文档 | specs/web-prd.md §F7, specs/034-web-e2e-connectivity/spec.md §2.3 |

## 2. 背景与目标

### 2.1 当前状态

034 完成后，用户可以从侧边栏选择历史会话并查看消息。但两个关键能力缺失：

1. **不能继续对话** — 历史会话只是"查看"模式，发送消息会创建新 session，而非在已有上下文中继续
2. **没有会话生命周期管理** — 没有新建会话、重命名、删除功能

AgentRuntime 已有 `resumeSession(sessionId)` 方法（加载历史 SessionState + 恢复 messages 数组），但 RuntimeBridge 未暴露。

### 2.2 目标

- 用户点击侧边栏历史会话 → 聊天区加载历史消息 → 可以继续发消息 → Agent 在历史上下文基础上回复
- 支持完整会话生命周期：新建、重命名、删除
- 多 session 并发：切换会话时后台的流式不中断，切回来不丢

### 2.3 非目标

- 不做 LLM 自动摘要标题（保持现有 50 字符截断）
- 不做会话 fork
- 不做会话导出/导入（已在 032 中实现）

## 3. 核心设计决策

### 3.1 协议：统一 `client_send`，不拆事件

"新会话"和"恢复会话"不是两个操作。session 是持久化对象，turn 是 session 内的一个回合。区别只在于：session 已存在还是未存在。

```
client_send({ sessionId, content })  // 始终同一个事件

RuntimeBridge.routeToRuntime(msg):
  handle = handles.get(msg.sessionId)
  if (!handle):
    handle = createRuntime({ loadSession: db.loadSession })
    handles.set(msg.sessionId, handle)
  handle.startTurn(msg.content)
```

### 3.2 RuntimeBridge 多句柄模型

从单一 `runtime: RuntimeHandle` 变为 `Map<sessionId, HandleEntry>`：

```typescript
interface HandleEntry {
  handle: RuntimeHandle;
  isStreaming: boolean;
  sessionId: string;
}

class RuntimeBridge {
  private handles = new Map<string, HandleEntry>();

  async *routeToRuntime(msg: ClientMessageEvent): AsyncGenerator<RuntimeEvent>;

  closeSession(sessionId: string): void;
  abortTurn(sessionId: string): void;
}
```

### 3.3 前端 per-session 消息缓存

chatStore 从单一 `messages: Message[]` 变为：

```typescript
sessionMessages: Map<string, Message[]>;  // per-session 缓存
activeSessionId: string | null;           // 当前显示的 session
streamingSessionIds: Set<string>;         // 有活跃 turn 的 session

// 切换会话 = 改 activeSessionId，不动 sessionMessages
// InputBox 只检查 streamingSessionIds.has(activeSessionId)
```

## 4. 功能需求

### FR-1: 恢复会话后续聊 [P0]

**Given** 用户点击侧边栏历史会话
**When** 加载完成，用户在输入框输入新消息并发送
**Then**
- `client_send` 携带该 sessionId 发送到后端
- RuntimeBridge 发现 handles 中无此 sessionId → createRuntime + loadSession → startTurn
- Agent 在历史上下文基础上回复
- 回复结束后，侧边栏的 message_count 更新
- `get_sessions` 自动触发，侧边栏排序更新

**边界**:
- session 不存在（DB 中被删除但仍显示在列表）→ 后端返回空 → 前端视为新空会话
- `loadSession` 返回 null（session 存在但无消息）→ 视为新建会话

### FR-2: 多 Session 并发 [P0]

**Given** 用户在 Session-A 中，Agent 正在流式回复
**When** 用户点击 Session-B
**Then**
- 聊天区立即切换到 Session-B 的消息
- Session-A 的流式在后台继续
- 侧边栏 Session-A 项显示"进行中"指示器
- 用户在 Session-B 可以正常发消息（InputBox 只看 B 是否有 active turn）
- Session-A 流式结束后，侧边栏指示器消失，`sessionMessages["A"]` 保留完整内容

### FR-3: 新建会话 [P0]

**Given** 用户点击侧边栏"新建会话"按钮
**When** 触发
**Then**
- 聊天区清空，`activeSessionId` 设为 null
- 用户输入消息 → `client_send` 使用新生成的 sessionId
- 第一次 `client_send` 时 RuntimeBridge 惰性创建 session（DB 写入 + createRuntime）

### FR-4: 重命名会话 [P1]

**Given** 用户右键侧边栏会话项
**When** 选择"重命名" → inline 编辑标题 → 确认
**Then**
- socket.emit("rename_session", { sessionId, title })
- 后端 SessionDataProvider.renameSession(id, title) 写 SQLite
- 重新 emit "session_list" 广播更新（复用已有事件）

### FR-5: 删除会话 [P1]

**Given** 用户右键侧边栏会话项
**When** 选择"删除" → 确认弹窗 → 确认
**Then**
- socket.emit("delete_session", { sessionId })
- 如果该 session 正在 streaming → RuntimeBridge aborts turn → closeSession
- 后端 SessionDataProvider.deleteSession(id) 删 SQLite 记录
- emit "session_list" 广播
- 如果被删的是当前 activeSessionId → UI 自动切到最近会话或空白

## 5. 新增 Socket 事件

| 事件 | 方向 | payload | 用途 |
|------|------|---------|------|
| `rename_session` | client → server | `{ sessionId: string, title: string }` | 重命名会话 |
| `delete_session` | client → server | `{ sessionId: string }` | 删除会话 |

服务端处理后广播 `session_list`（已有事件）刷新所有客户端。

## 6. 改动清单

| 文件 | 改动 | 体积 |
|------|------|:--:|
| `src/server/runtime-bridge.ts` | Map<sessionId, HandleEntry> 多句柄 + routeToRuntime 按 sessionId 路由 + closeSession | 大 |
| `src/server/socket-handlers.ts` | 新增 rename_session / delete_session handler；registerSessionHandlers 注册 | 小 |
| `src/server/socket-hub.ts` | registerHandlers 注册新事件 | 小 |
| `src/server/socket-types.ts` | 新增 rename_session / delete_session 类型 | 小 |
| `packages/web/src/types/message.ts` | ClientToServerEvents 新增 rename_session / delete_session | 小 |
| `packages/web/src/store/chat.ts` | messages → sessionMessages: Map; isStreaming → streamingSessionIds: Set; activeSessionId | 大 |
| `packages/web/src/components/chat/chat-page.tsx` | wire session_loaded → loadMessages + setSessionId; socket 事件写入按 sessionId | 中 |
| `packages/web/src/components/chat/input-box.tsx` | isStreaming 检查改为 per-session | 小 |
| `packages/web/src/hooks/useSocket.ts` | 无改动（已有 loadSession） | - |
| `packages/web/src/store/session-history.ts` | 无改动（已有 selectSession / updateSessionTitle / removeSession） | - |
| `tests/server/socket-handlers.test.ts` | 新增 rename/delete 测试 | 中 |
| `tests/web/chat-store.test.ts` | per-session 状态测试 | 中 |

## 7. 测试要求

- RuntimeBridge 多句柄单元测试：创建、路由、关闭
- chatStore per-session 状态测试：切换会话、多 session 流式
- Socket 集成测试：rename_session / delete_session 事件
- E2E: 选会话→发消息→Agent 在上下文中回复

## 8. 已知局限

- 不做 LLM 自动摘要标题（036+）
- 同一 session 不支持并发多个 turn（AgentRuntime 设计限制，不需要改）
- 新会话的自动标题仍是简单截断 50 字符
