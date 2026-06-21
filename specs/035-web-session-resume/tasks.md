# 035-web-session-resume · 任务清单

## 分组概览

| 组 | 任务 | 类型 | 说明 |
|----|------|------|------|
| W1 | T001–T003 | [BE] Runtime 层 | loadHistory + RuntimeBridge 多句柄 |
| W2 | T004–T006 | [BE] 服务端事件 | rename/delete handler + 持久化 |
| W3 | T007–T010 | [FE] 前端 | per-session 状态 + ChatPage + 侧边栏 |
| W4 | T011–T013 | [INT] E2E | 端到端测试 + 代码审查 |

---

## W1: Runtime 层 [BE]

### T001 · 新增 RuntimeHandle.loadHistory 方法

**标签**: `[BE]` **依赖**: 无 **预计**: 10 min

**输入**: `src/runtime/runtime.ts` (createRuntime, RuntimeHandle)
**输出**: RuntimeHandle 新增 `loadHistory(sessionId: string): void` 方法

**内容**:
1. 在 RuntimeHandle interface 新增 `loadHistory(sessionId: string): void`
2. 实现：调 `resolvedDeps.loadSession?.(sessionId)` 获取完整 SessionState
3. 若命中 → `session = loaded` + `session.interruptFlag = false`
4. 若未命中 → `session = createFreshSession({ sessionId })`
5. **不 push "Continue where you left off"，不启动 query loop**

**验证**: `tsc --noEmit` 无类型错误；现有 1885 测试 pass

---

### T002 · RuntimeBridge 多句柄模型

**标签**: `[BE]` **依赖**: T001 **预计**: 30 min

**输入**: `src/server/runtime-bridge.ts` (当前: 单个 RuntimeBridgeHandle + routeToRuntime)
**输出**: Map<sessionId, HandleEntry> + routeToRuntime 重写 + closeSession

**内容**:
1. 定义 `HandleEntry` interface (handle, isStreaming, sessionId)
2. RuntimeBridge 内部 `handles = new Map<string, HandleEntry>()`
3. `routeToRuntime(msg)`:
   - `handles.get(msg.sessionId)` → 未命中则 createRuntime + loadHistory
   - 设 `entry.isStreaming = true`
   - `handle.startTurn(msg.content)` → yield token/complete
   - finally: `entry.isStreaming = false`
4. `closeSession(sessionId)`: 从 handles map 移除
5. 移除旧的 `abortTurn(messageId)` — 改为 closeSession

**验证**: `pnpm typecheck` 通过；现有 socket 测试 pass

---

### T003 · RuntimeBridge 单元测试

**标签**: `[BE]` **依赖**: T002 **预计**: 15 min

**内容**:
1. 多句柄创建测试（2 个不同 sessionId → 2 个独立 handle）
2. routeToRuntime 路由测试（sessionId 命中 → 复用 handle）
3. closeSession 后 handles map 移除测试
4. loadHistory 未命中时 startTurn 正常创建新 session 测试

**验证**: `pnpm test -- tests/server/runtime-bridge.test.ts` green

---

## W2: 服务端事件 [BE]

### T004 · SocketHub + socket-handlers 注册 rename/delete 事件

**标签**: `[BE]` **依赖**: 无 **预计**: 10 min

**输入**: `src/server/socket-hub.ts`, `src/server/socket-handlers.ts`
**输出**: rename_session / delete_session handler 注册

**内容**:
1. `socket-hub.ts`: registerHandlers 中注册 `rename_session` / `delete_session` 事件
2. `socket-handlers.ts`: 新增 `registerSessionMutationHandlers(socket, provider)`:
   - `rename_session({ sessionId, title })` → provider.renameSession → emit "session_list"
   - `delete_session({ sessionId })` → provider.deleteSession → emit "session_list"
3. `socket-types.ts`: 新增 `RenameSessionEvent` / `DeleteSessionEvent` 类型

**验证**: `pnpm typecheck` 通过

---

### T005 · SessionDataProvider 新增 rename/delete 方法

**标签**: `[BE]` **依赖**: 无 **预计**: 15 min

**输入**: `src/persistence/session-manager.ts` (SessionManager interface)
**输出**: SessionManager 新增 `renameSession` / `deleteSession` 方法

**内容**:
1. `SessionManager` interface 新增: `renameSession(id: string, title: string): void`
2. `SessionManager` interface 新增: `deleteSession(id: string): void`
3. 磁盘实现: SQLite UPDATE/DELETE
4. Memory store: map.set / map.delete

**验证**: 单测: rename 后 list 中 title 改变；delete 后 list 中该项消失

---

### T006 · socket-handlers 集成测试

**标签**: `[BE]` **依赖**: T004, T005 **预计**: 15 min

**内容**:
1. rename_session → session_list 中 title 更新
2. delete_session → session_list 中移除
3. rename 不存在的 sessionId → session_list 不变
4. delete 不存在的 sessionId → session_list 不变

**验证**: `pnpm test -- tests/server/socket-handlers.test.ts` green

---

## W3: 前端 [FE]

### T007 · chatStore per-session 状态改造

**标签**: `[FE]` **依赖**: 无 **预计**: 25 min

**输入**: `packages/web/src/store/chat.ts`
**输出**: sessionMessages Map + streamingSessionIds Set + activeSessionId

**内容**:
1. 新增 `sessionMessages: Map<string, Message[]>`
2. 新增 `streamingSessionIds: Set<string>`
3. `isStreaming` 改为 derived: `streamingSessionIds.size > 0`
4. `activeSessionId` 保留
5. 所有 action 加 sessionId 维度:
   - `addMessage(sessionId, msg)` → sessionMessages[sid].push
   - `appendToken(sessionId, id, token)` → sessionMessages[sid] 中查找+追加
   - `markComplete(sessionId, id)` → streamingSessionIds.delete(sid)
   - `setActiveSession(sessionId)` / `clearActiveSession()`
6. 向后兼容：无 sessionId 的调用使用 activeSessionId 作为默认值

**验证**: `pnpm test -- tests/web/chat-store.test.ts` green

---

### T008 · ChatPage wire session_loaded + per-session 事件

**标签**: `[FE]` **依赖**: T002, T007 **预计**: 20 min

**输入**: `packages/web/src/components/chat/chat-page.tsx`
**输出**: session_loaded 接入 + socket 事件按 sessionId 写入

**内容**:
1. `useSocket` 的 `onSessionLoaded` callback: 
   - `chatStore.loadMessages(sessionId, messages)`
   - `chatStore.setActiveSession(sessionId)` (如果当前 activeSessionId 为空)
2. socket 事件处理加 sessionId:
   - `stream_token`: `appendToken(payload.sessionId, payload.messageId, payload.token)`
   - `message_complete`: `markComplete(payload.sessionId, payload.messageId, payload.stats)`
   - `message_error`: `markError(payload.sessionId, payload.messageId, payload.message)`
3. `handleSend` 使用 `activeSessionId ?? crypto.randomUUID()` 作为 sessionId

**验证**: 组件测试: session_loaded 后 chatStore.sessionMessages 已填充

---

### T009 · 侧边栏：新建按钮 + 重命名/删除

**标签**: `[FE]` **依赖**: T004, T008 **预计**: 25 min

**内容**:
1. 侧边栏顶部/底部新增 "+ 新建会话" 按钮 → chatStore.reset()
2. SessionListItem 右键菜单 wire:
   - "重命名" → inline 编辑 → socket.emit("rename_session")
   - "删除" → 确认弹窗 → socket.emit("delete_session")
3. SessionListItem 显示 streaming 指示器: `useChatStore(s => s.streamingSessionIds.has(session.id))`
4. 删除的是当前 active session → chatStore.clearActiveSession() → 显示空白

**验证**: 组件测试: 点击新建 → store 清空；重命名 → socket emit 触发

---

### T010 · chatStore + InputBox 测试

**标签**: `[FE]` **依赖**: T007 **预计**: 15 min

**内容**:
1. per-session isStreaming: A streaming → InputBox disabled; 切到 B → InputBox enabled
2. 切换会话后消息正确保留
3. streamingSessionIds 正确增删（start → add, complete → delete）
4. loadMessages 写入 sessionMessages[active]

**验证**: `pnpm test -- tests/web/chat-store.test.ts tests/web/input-box.test.ts` green

---

## W4: E2E 与收尾 [INT]

### T011 · E2E: 选会话 → 续聊

**标签**: `[INT]` **依赖**: T008, T009 **预计**: 20 min

**内容**:
1. 创建并加载含历史消息的会话
2. 用户在聊天区输入新消息 → 发送
3. Agent 在历史上下文基础上回复（验证回复与历史相关）
4. 侧边栏 message_count 更新

**验证**: `npx playwright test tests/web/e2e-session-resume.pwtest.ts` green

---

### T012 · E2E: 多 session 切换 + 生命周期

**标签**: `[INT]` **依赖**: T009 **预计**: 20 min

**内容**:
1. Session-A 正在 streaming → 切到 Session-B → A 后台完成
2. 新建会话 → 发送消息 → 侧边栏出现新项
3. 重命名会话 → 侧边栏标题更新
4. 删除会话 → 侧边栏移除该项

**验证**: `npx playwright test tests/web/e2e-session-lifecycle.pwtest.ts` green

---

### T013 · 代码审查 + state/session 更新

**标签**: `[INT]` **依赖**: T011, T012 **预计**: 15 min

**内容**:
1. 代码审查：扫描 035 所有改动文件的韧性/一致性/防御性
2. 更新 `state.md` 标记完成
3. 写 `session.md` 会话交接

**验证**: review checklist 0 issues；state/session docs 写入

---

## 任务依赖图

```
T001 ──→ T002 ──→ T003
                  │
                  ├──→ T008 ──→ T009 ──→ T011 ──→ T013
                  │              │         │
T004 ──→ T006 ────┘              │         └──→ T012 ──→ T013
T005 ──→ T006                    │
                                 │
T007 ──→ T010 ───────────────────┘
```

## 统计

| Wave | Tasks | 预计总时间 |
|------|:-----:|:---------:|
| W1 | T001–T003 | 55 min |
| W2 | T004–T006 | 40 min |
| W3 | T007–T010 | 85 min |
| W4 | T011–T013 | 55 min |
| **总计** | **13 tasks** | **~4 hours** |
