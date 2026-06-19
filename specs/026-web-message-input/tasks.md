# Implementation Tasks: Web 流式消息输入

**Feature**: 026-web-message-input  
**Total Tasks**: 16  
**Parallel Groups**: 4  

**Design Sources for all [FE] tasks**:
- Root `DESIGN.md` sections: Brand & Style, Typography, Layout & Spacing, Elevation & Depth, Components
- Visual samples: `specs/design-reference/stitch-export/claude_style_chat_workspace/` and `specs/design-reference/stitch-export/obsidian_command/`
- Component baseline: React + project Web UI components; message stream and input surfaces must preserve the compact terminal-first hierarchy from root `DESIGN.md`

---

## Task List

### 并行组 A：类型与基础工具（可并行）

#### T001 [BE]: 创建 Message 类型与 Socket 协议定义 ✅

- **FR 来源**: FR-MI-06, FR-MI-07
- **依赖**: 无
- **目标**: 完整的 TypeScript 类型定义
- **任务内容**:
  1. 创建 `packages/web/src/types/message.ts`
  2. 定义 `MessageRole` 枚举: `'user' | 'assistant'`
  3. 定义 `MessageStatus` 枚举: `'pending' | 'sending' | 'streaming' | 'sent' | 'error' | 'cancelled'`
  4. 定义 `Message` 接口 (id, role, content, timestamp, status, error?)
  5. 定义所有 Socket 事件的 payload 类型 (ClientMessageEvent, StreamTokenEvent, 等)
- **验证方式**: TypeScript 编译无错误，类型覆盖完整
- **预计时间**: 2 min

#### T002 [BE]: 创建 DOMPurify 封装与 UUID 工具 ✅

- **FR 来源**: FR-MI-07 (XSS 防护隐含)
- **依赖**: 无
- **目标**: 安全的 HTML 转义和 ID 生成
- **任务内容**:
  1. 创建 `packages/web/src/utils/dompurify.ts`
  2. 配置 DOMPurify，设置安全的白名单标签/属性
  3. 导出 `sanitizeHtml()` 函数
  4. 创建 `packages/web/src/utils/uuid.ts`
  5. 封装 `crypto.randomUUID()`，降级方案（如不支持）
- **验证方式**: 单元测试：注入 `<script>alert(1)</script>` 验证被转义
- **预计时间**: 2 min

#### T003 [BE]: 在 WebServer 挂载 Socket.io 服务端

- **FR 来源**: FR-MI-06, FR-MI-07
- **依赖**: 025 Feature 的 WebServer
- **目标**: Socket.io 服务端正确挂载
- **任务内容**:
  1. 修改 `src/server/index.ts`，增加 `attachSocketIO()` 方法
  2. 初始化 Socket.io，配置 CORS 为 localhost 同源
  3. 在 `start()` 中自动调用 `attachSocketIO()`
  4. 暴露 `getIO()` 方法获取 io 实例
- **验证方式**: 启动服务，客户端能成功连接 Socket
- **预计时间**: 3 min

---

### 并行组 B：状态管理与 Socket 层（可并行）

#### T004 [BE]: 创建 Zustand Chat Store 基础

- **FR 来源**: FR-MI-09, FR-MI-10, FR-MI-11
- **依赖**: T001
- **目标**: 消息状态管理核心
- **任务内容**:
  1. 创建 `packages/web/src/store/chat.ts`
  2. 定义 Store state: messages 数组、currentSessionId、isConnected、streamingMessageId
  3. 定义基础 actions: 
     - `addMessage(message)`
     - `updateMessage(id, updates)`
     - `appendToken(id, token)`
     - `markComplete(id, stats)`
     - `markError(id, error)`
  4. 导出 `useChatStore()` hook
- **验证方式**: 单元测试：dispatch action 后 state 更新正确
- **预计时间**: 4 min

#### T005 [BE]: 实现前端消息排队逻辑

- **FR 来源**: FR-MI-19
- **依赖**: T004
- **目标**: FIFO 队列，最多 5 条 pending
- **任务内容**:
  1. 在 Store 中增加 `pendingQueue` 数组
  2. 实现 `enqueueMessage()`：队列未满加入，超过限制则 reject
  3. 实现 `processNextMessage()`：队首出队并发送
  4. 实现 `dequeueMessage(id)`：收到 complete 后处理下一条
- **验证方式**: 单元测试：快速入队 6 条，第 6 条被拒绝
- **预计时间**: 3 min

#### T006 [INT]: 实现 useSocket hook（含指数退避重连）

- **FR 来源**: NFR-MI-09
- **依赖**: T003 (服务端)
- **目标**: 稳定的 Socket 连接管理
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-socket.ts`
  2. 实现 connect() / disconnect() 方法
  3. 实现指数退避重连逻辑：1s → 2s → 4s → 8s，最多 10 次
  4. 实现事件监听器注册/自动清理（useEffect）
  5. 连接状态同步到 Store (isConnected)
- **验证方式**: 单元测试：断开后重连，重试间隔符合指数增长
- **预计时间**: 5 min

#### T007 [BE]: 实现 Socket 服务端事件处理器

- **FR 来源**: FR-MI-06, FR-MI-07
- **依赖**: T003
- **目标**: 服务端接收消息并调用 Runtime
- **任务内容**:
  1. 创建 `src/server/socket-handlers.ts`
  2. 实现 `registerClientMessageHandler(io, runtime)`
  3. 收到 `client_message` 后调用 `runtime.startTurn()`
  4. 订阅 runtime 的 text delta 事件，转发 `stream_token` 到客户端
  5. 订阅 runtime 的 turn_end 事件，转发 `message_complete`
  6. 捕获错误，转发 `error` 事件
- **验证方式**: 集成测试：发消息 → 收到 stream_token → 收到 message_complete
- **预计时间**: 5 min

#### T008 [INT]: 完善 RuntimeBridge 完整实现

- **FR 来源**: 所有
- **依赖**: T007
- **目标**: Socket 与 Runtime 的完整桥接
- **任务内容**:
  1. 修改 `src/server/runtime-bridge.ts`
  2. 实现 `routeToRuntime(messageId, sessionId, content)` 方法
  3. 实现 `abortTurn(messageId)` 方法支持中断
  4. 会话持久化：从 SQLite 加载/保存会话
  5. 正确映射所有 runtime 事件到 Socket 事件
- **验证方式**: 集成测试：完整端到端消息流
- **预计时间**: 4 min

---

### 并行组 C：UI 组件（可并行，依赖 A）

#### T009 [FE]: 创建 MessageBubble 消息气泡组件

- **FR 来源**: FR-MI-09, FR-MI-10, FR-MI-11
- **依赖**: T001
- **目标**: 各种状态下的消息渲染
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/message-bubble.tsx`
  2. 实现 user 消息（右对齐，深色背景）
  3. 实现 assistant 消息（左对齐，浅色背景）
  4. 实现所有状态的指示器：pending/sending/streaming/sent/error/cancelled
  5. error 状态显示错误信息和重试按钮
  6. 使用 DOMPurify 转义消息内容
- **验证方式**: 组件测试：渲染各种 role/status 组合，视觉正确
- **预计时间**: 4 min

#### T010 [FE]: 创建 InputBox 底部输入框组件

- **FR 来源**: FR-MI-01 ~ FR-MI-05, FR-MI-12, FR-MI-13, FR-MI-14, FR-MI-20
- **依赖**: T002 (UUID)
- **目标**: 功能完整的多行输入框
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/input-box.tsx`
  2. 原生 textarea，实现自动高度增长（max-height: 30vh）
  3. Enter 发送，Shift+Enter 换行
  4. Esc 清空输入
  5. 50,000 字符限制，超过显示警告并禁用发送
  6. 粘贴保留换行格式
  7. 生成 messageId，调用 Store 的发送方法
- **验证方式**: 组件测试：Enter/Shift+Enter/Esc 行为正确；粘贴换行保留；超过 50k 字符被拦截
- **预计时间**: 5 min

#### T011 [FE]: 实现 useInputHistory 输入历史 hook

- **FR 来源**: FR-MI-12
- **依赖**: 无
- **目标**: ↑↓ 键导航历史
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-input-history.ts`
  2. 维护历史数组（最多 50 条）
  3. 实现 `addHistoryItem(text)` - 发送后加入历史
  4. 实现 `navigateUp()` / `navigateDown()` - 返回对应文本
  5. 边界处理：第一条/最后一条停止
- **验证方式**: 单元测试：加入 3 条，navigateUp 3 次验证返回正确文本
- **预计时间**: 3 min

#### T012 [FE]: 实现 useVirtualScroll 虚拟滚动 hook

- **FR 来源**: FR-MI-18, NFR-MI-08
- **依赖**: 无
- **目标**: 高性能虚拟滚动
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-virtual-scroll.ts`
  2. 使用 `@tanstack/react-virtual` 或类似实现
  3. 计算可视区域起始/结束索引
  4. 计算每条消息的高度（固定或估算）
  5. 渲染窗口外的消息用占位符撑开高度
- **验证方式**: 组件测试：500 条消息，只渲染可视区域数量（~20 条）
- **预计时间**: 4 min

#### T013 [FE]: 创建 MessageList 消息列表组件

- **FR 来源**: FR-MI-15, FR-MI-16, FR-MI-18
- **依赖**: T009, T012
- **目标**: 集成虚拟滚动和自动滚动
- **任务内容**:
  1. 创建 `packages/web/src/components/chat/message-list.tsx`
  2. 集成 useVirtualScroll hook
  3. 渲染 MessageBubble 数组
  4. 实现智能自动滚动：只在用户在底部时才自动滚动
  5. 用户向上滚动后停止自动滚动，显示"回到最新"按钮
- **验证方式**: 组件测试：新消息到来时自动滚动；向上滚动后不自动滚动
- **预计时间**: 4 min

#### T014 [INT]: 集成会话 ID localStorage 持久化

- **FR 来源**: (spec 集成点)
- **依赖**: 无
- **目标**: 刷新页面会话不丢失
- **任务内容**:
  1. 在 Store 初始化时从 localStorage 读取 sessionId
  2. 不存在则生成新的 UUID 并保存
  3. 实现"新建会话"功能：生成新 sessionId，清空消息
  4. 页面加载时根据 sessionId 从后端拉取历史消息
- **验证方式**: E2E：发送消息 → 刷新 → 消息依然存在
- **预计时间**: 3 min

---

### 并行组 D：集成与测试（串行，依赖 B + C）

#### T015 [INT]: 组装完整 Chat 页面 + 端到端联调

- **依赖**: T008 (Backend), T010 (Input), T013 (List)
- **目标**: 完整链路跑通
- **任务内容**:
  1. 修改 `packages/web/app/page.tsx`
  2. 组装 MessageList + InputBox
  3. 配置 Socket 连接和事件监听
  4. 连接 Store action 到 Socket 事件
  5. 手动端到端测试：发送消息 → 收到流式响应
- **验证方式**: 手动测试完整流程正常工作
- **预计时间**: 5 min

#### T016 [INT]: 编写核心单元测试和集成测试

- **依赖**: 所有
- **目标**: 测试覆盖核心逻辑
- **任务内容**:
  1. Store 单元测试 (`tests/store/chat.test.ts`)
  2. MessageBubble + InputBox 组件测试
  3. Socket 消息流集成测试
  4. XSS 安全测试
  5. 重连场景测试
- **验证方式**: vitest 所有测试通过
- **预计时间**: 4 min

---

## 开发顺序与依赖图

```
Phase 1 (完全并行):
  A1: T001 (类型定义)
  A2: T002 (DOMPurify + UUID)
  A3: T003 (服务端 Socket.io 挂载)

Phase 2 (并行，B 依赖 A3，C 依赖 A1/A2):
  B1: T004 (Zustand Store 基础)
  B2: T005 (消息排队)
  B3: T006 (useSocket hook + 重连)
  B4: T007 (服务端事件处理器)
  B5: T008 (RuntimeBridge 完整实现)
  
  C1: T009 (MessageBubble 组件)
  C2: T010 (InputBox 组件)
  C3: T011 (useInputHistory hook)
  C4: T012 (useVirtualScroll hook)
  C5: T013 (MessageList 组件)
  C6: T014 (sessionId localStorage)

Phase 3 (串行，依赖所有 Phase 2):
  D1: T015 (完整页面组装 + 联调)
  D2: T016 (测试)
```

---

## 验收标准

- ✅ 所有 16 个任务完成
- ✅ TypeScript strict mode 编译零错误
- ✅ 单元测试 + 集成测试全部通过
- ✅ 手动端到端测试：发送消息 → 流式逐字显示 → 完成标记
- ✅ 流式输出中发送新消息，上一条被正确中断
- ✅ 500 条消息滚动保持 60fps（虚拟滚动生效）
- ✅ XSS 攻击向量被正确转义，无安全漏洞
- ✅ Socket 断开后自动重连，排队消息自动发送
- ✅ 刷新页面，会话历史不丢失
- ✅ Enter/Shift+Enter/Esc/↑↓ 快捷键行为全部正确
- ✅ 50,000 字符限制生效，超过被拦截

---

> **Tasks Version**: v1.0 | **Created**: 2026-06-18 | **Task Count**: 16
