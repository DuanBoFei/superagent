# Feature Specification: Web 流式消息输入

**Feature Branch**: `026-web-message-input`  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: Web UI 底部的消息输入框，支持多行、粘贴、快捷发送，通过 Socket.io 实时流式传输给后端。

---

## 1. What & Why

### 1.1 What

本 Feature 实现 Web UI 的消息输入与流式输出基础链路：
- 底部固定的消息输入框组件
- 用户输入消息后按 Enter 发送（Shift+Enter 换行）
- 消息通过 Socket.io 实时发送到后端
- 模型响应以 Token 流的形式逐字显示在聊天界面
- 基础的消息列表渲染（用户消息右对齐、Assistant 消息左对齐）

### 1.2 Why

这是 Web UI 的核心交互链路，没有消息输入输出就无法使用 Agent 的任何功能。是后续所有 Web 功能的基础前置条件。

### 1.3 Goals

- 输入体验接近 Claude Code / ChatGPT：流畅、响应快、支持多行
- 流式输出延迟 < 100ms（从收到 Token 到显示在屏幕）
- 消息发送状态清晰可见（发送中/已发送/失败）
- 输入历史支持上下键切换（类似终端）

### 1.4 Non-Goals（明确不做）

- ❌ 文件上传 / 附件功能（后续 feature）
- ❌ 代码高亮 / Markdown 高级渲染（后续 027 feature）
- ❌ 消息编辑 / 重新生成
- ❌ 对话分支 / 多会话切换（后续 032 feature）
- ❌ 快捷键自定义
- ❌ 输入自动补全 / AI 建议
- ❌ 拖拽上传

---

## 2. User Scenarios & Testing

### User Story 1 - 发送消息并看到流式响应（Priority: P0）

As a developer, I type a question in the input box and press Enter, then see the assistant's response appear word-by-word in real-time.

**Why this priority**: 这是 Web UI 的核心功能，MVP 必须首先打通的链路。

**Independent Test**: E2E 测试：输入消息 → 发送 → 验证流式输出正确显示。

**Acceptance Scenarios**:

1. **Given** Web UI 已加载，**When** 我输入 "Hello" 按 Enter，**Then** 我的消息立即出现在聊天区右侧，输入框清空，随后看到 Assistant 的消息逐字流式输出。
2. **Given** 消息正在流式输出中，**When** 我再次输入新消息并发送，**Then** 上一条流被中断，新消息立即发送。
3. **Given** 网络断开，**When** 我发送消息，**Then** 显示"发送失败，点击重试"提示。

---

### User Story 2 - 多行输入支持（Priority: P0）

As a developer, I want to write multi-line messages (code, long questions) without accidentally sending them.

**Why this priority**: 开发者经常需要粘贴代码或写长问题，多行支持是刚需。

**Independent Test**: 输入多行文本，验证换行和发送行为正确。

**Acceptance Scenarios**:

1. **Given** 输入框为空，**When** 按 Shift+Enter，**Then** 光标换行，不发送消息。
2. **Given** 输入框中有多行文本，**When** 按 Enter，**Then** 整个文本作为一条消息发送。
3. **Given** 我从剪贴板粘贴多行代码，**When** 粘贴到输入框，**Then** 换行保留正确。

---

### User Story 3 - 输入历史与快捷键（Priority: P1）

As a developer, I want to use arrow keys to cycle through my message history like a terminal.

**Why this priority**: 提升效率的常用功能，但不影响核心链路。

**Independent Test**: 发送多条消息后，按上下键验证历史切换正确。

**Acceptance Scenarios**:

1. **Given** 我已发送 3 条消息，**When** 输入框为空时按 ↑，**Then** 依次显示第 3 条、第 2 条、第 1 条消息。
2. **Given** 我正在浏览历史消息，**When** 按 ↓ 回到最新位置，**Then** 输入框变空。
3. **Given** 输入框有未发送的文本，**When** 按 Esc，**Then** 输入框清空。

---

### User Story 4 - 发送状态与错误反馈（Priority: P1）

As a developer, I want clear visual feedback when my message is sending or has failed.

**Why this priority**: 状态透明是好 UX 的基础，失败时知道发生了什么。

**Independent Test**: 模拟网络错误，验证错误提示和重试功能。

**Acceptance Scenarios**:

1. **Given** 消息已发送但未收到响应，**When** 等待中，**Then** 消息旁显示"发送中..."指示器。
2. **Given** 消息发送失败（网络错误），**When** 失败发生，**Then** 消息显示红色背景 + 错误信息 + "重试"按钮。
3. **Given** 点击重试按钮，**When** 网络恢复，**Then** 消息重新发送成功。

---

### User Story 5 - 输入框自动高度（Priority: P1）

As a developer writing long messages, I want the input box to grow with my content up to a maximum height.

**Why this priority**: 长文本阅读体验，避免被压缩在小框里。

**Independent Test**: 输入多行文本，验证输入框高度正确增长和限制。

**Acceptance Scenarios**:

1. **Given** 输入短文本，**When** 文本不超过 1 行，**Then** 输入框保持最小高度。
2. **Given** 输入超过 1 行的文本，**When** 继续输入，**Then** 输入框高度自动增长。
3. **Given** 输入超过 10 行的长文本，**When** 继续输入，**Then** 输入框停止增长，出现垂直滚动条。

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-MI-01 | Web UI SHALL have a fixed-bottom text input box. |
| FR-MI-02 | Pressing Enter SHALL send the message (if not empty). |
| FR-MI-03 | Pressing Shift+Enter SHALL insert a newline, NOT send. |
| FR-MI-04 | Input box SHALL auto-grow with content, max 30% viewport height. |
| FR-MI-05 | Empty input + Enter SHALL be ignored (no empty messages). |
| FR-MI-06 | Messages SHALL be sent via Socket.io `client_message` event. |
| FR-MI-07 | Assistant responses SHALL be received via Socket.io `stream_token` event. |
| FR-MI-08 | Streaming tokens SHALL be rendered incrementally, < 100ms latency. |
| FR-MI-09 | User messages SHALL be right-aligned, assistant messages left-aligned. |
| FR-MI-10 | Sending state indicator SHALL be displayed while waiting for first token. |
| FR-MI-11 | Network errors SHALL display a retry button, not crash the UI. |
| FR-MI-12 | Up/Down arrow keys (when input focused + empty) SHALL cycle input history. |
| FR-MI-13 | Esc key SHALL clear current input (when not empty). |
| FR-MI-14 | Paste SHALL preserve line breaks and formatting. |
| FR-MI-15 | Message list SHALL auto-scroll to bottom on new content. |
| FR-MI-16 | User SHALL be able to scroll up and view history while streaming. |
| FR-MI-17 | Sending message during active streaming SHALL cancel the previous stream. |
| FR-MI-18 | Message list SHALL implement virtual scrolling for smooth performance with >100 messages. |
| FR-MI-19 | Frontend message queue SHALL hold max 5 pending messages, showing warning when full. |
| FR-MI-20 | Input SHALL enforce max 50,000 character limit, with clear warning when exceeded. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-MI-01 | End-to-end latency (Enter pressed → first token displayed) target: < 2 seconds. |
| NFR-MI-02 | Stream render latency (token received → displayed) target: < 100ms. |
| NFR-MI-03 | Input must not freeze or lag during streaming (60fps target). |
| NFR-MI-04 | Message history must persist across browser refresh (via backend SQLite). |
| NFR-MI-05 | Mobile viewport is NOT required; desktop-only for MVP. |
| NFR-MI-06 | Input must support up to 50,000 characters without lag. |
| NFR-MI-07 | Socket reconnection must resume in-flight messages transparently. |
| NFR-MI-08 | Virtual scrolling MUST maintain 60fps with 500+ messages. |
| NFR-MI-09 | Socket reconnection uses exponential backoff: 1s → 2s → 4s → 8s, max 10 attempts. |

### 3.3 Key Entities

- **Message**: id (前端 UUID), role (user/assistant), content, timestamp, status (pending/sending/streaming/sent/error/cancelled)
- **InputHistory**: 内存数组存储用户已发送的消息文本，最多 50 条
- **SocketConnection**: 连接状态 + 事件监听器 + 指数退避重连逻辑（1s→2s→4s→8s，最多 10 次）
- **ChatStore**: Zustand store 管理消息列表、输入状态、连接状态、消息队列
- **VirtualScroll**: 虚拟滚动管理器，处理可视区域渲染

### Socket 协议

```typescript
// Client → Server
interface ClientMessageEvent {
  type: 'client_message'
  payload: {
    messageId: string    // 前端生成 UUID
    sessionId: string    // localStorage 存储，刷新复用
    content: string
    timestamp: number
  }
}

// Server → Client
interface StreamTokenEvent {
  type: 'stream_token'
  payload: {
    messageId: string
    token: string
    role: 'assistant'
    timestamp: number
  }
}

interface MessageStartEvent {
  type: 'message_start'
  payload: {
    messageId: string
    model: string
  }
}

interface MessageCompleteEvent {
  type: 'message_complete'
  payload: {
    messageId: string
    tokenUsage: { input: number; output: number }
    durationMs: number
  }
}

interface ErrorEvent {
  type: 'error'
  payload: {
    messageId?: string
    code: string
    message: string
    retryable: boolean
  }
}
```

### 3.4 Edge Cases

- 空消息发送 → 忽略，不触发请求
- 全空白字符（空格/换行）→ 视为空消息忽略
- 超长消息（>50,000 字符）→ 前端拦截，提示"消息过长，请缩短"
- 网络中断后重连 → 指数退避（1s→2s→4s→8s），最多 10 次；断线期间发送的消息排队，重连后自动发送
- 消息排队已满 → 最多排队 5 条，超过提示"排队已满，请等待连接恢复后再发送"
- 流式输出中刷新页面 → 重新加载会话历史，已输出的内容不丢失（后端 SQLite 持久化）
- 快速连续发送多条消息 → 前端 FIFO 排队，前一条收到 message_complete 后再发下一条
- 模型返回空响应 → 显示"模型返回空响应"提示
- Socket 连接未建立时发送 → 加入 pending 队列，连接建立后自动发送
- 流式输出中用户发送新消息 → 取消上一条流，开始新消息处理
- XSS 攻击 → 所有流式输出经过 DOMPurify 转义，防止脚本注入
- 消息数量 > 500 条 → 虚拟滚动保持 60fps 性能

---

## 4. Feature Boundaries

### 4.1 MVP Scope

- ✅ 底部固定输入框
- ✅ Enter 发送，Shift+Enter 换行
- ✅ 自动增长高度，最大 30% 视口高度
- ✅ Socket.io `client_message` 发送事件
- ✅ Socket.io `stream_token` / `message_start` / `message_complete` / `error` 接收事件
- ✅ 流式 Token 逐字渲染
- ✅ 消息气泡左右对齐
- ✅ 发送中状态指示器（pending/sending/streaming/sent/error/cancelled）
- ✅ 网络错误显示 + 重试按钮
- ✅ 上下键浏览输入历史（内存存储，最多 50 条）
- ✅ Esc 清空输入
- ✅ 粘贴保留格式
- ✅ 新消息自动滚动到底部
- ✅ 流式输出中可中断发送新消息
- ✅ 前端 FIFO 消息排队，最多 5 条
- ✅ 50,000 字符长度限制
- ✅ DOMPurify XSS 防护
- ✅ 虚拟滚动，支持 500+ 条消息流畅滚动
- ✅ Socket 指数退避重连（1s→2s→4s→8s，最多 10 次）
- ✅ sessionId localStorage 持久化，刷新复用

### 4.2 Out of Scope（本 Feature 不做）

- ❌ 文件/图片附件上传 → 后续 feature
- ❌ Markdown 渲染 / 代码高亮 → 027 聊天流渲染
- ❌ 工具调用卡片 → 028
- ❌ 会话切换 / 历史列表 → 032
- ❌ 消息编辑 / 删除 / 重新生成 → 后续
- ❌ 拖拽上传 → 后续
- ❌ 输入联想 / AI 自动补全 → 后续
- ❌ 快捷键自定义 → 后续
- ❌ 深色 / 浅色主题 → 后续
- ❌ 移动端适配 → 永远不做（MVP 桌面优先）

---

## 5. Integration Points

### 5.1 前置依赖

- **025-web-server-start**: 必须先完成 HTTP 服务和 Socket.io 基础框架
- **现有 Runtime**: 复用 CLI 的 Agent Runtime，通过 Bridge 层连接到 Socket

### 5.2 后续依赖

- **027-web-chat-stream**: 本 Feature 是其基础（聊天流渲染、Markdown、代码高亮）
- **028-web-tool-cards**: 依赖本 Feature 的消息列表框架
- **032-web-session-history**: 依赖本 Feature 的消息数据结构

### 5.3 与现有系统的集成

- 复用 CLI 的 `AgentRuntime.startTurn()` 方法
- 复用 CLI 的 SQLite 会话持久化
- 复用 CLI 的模型 Provider 和 Token 计数
- 复用 CLI 的权限系统（工具调用时的审批流程在 Web 中实现新 UI，但后端逻辑复用）
