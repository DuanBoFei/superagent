# 036-web-token-counter · 功能规格

## 1. 文档信息

| 项 | 值 |
|----|----|
| **文档名称** | Web Token 计数器 + 费用显示 · 功能规格 |
| **版本** | v1.0 |
| **状态** | Approved |
| **创建日期** | 2026-06-21 |
| **上游依赖** | 035-web-session-resume（Socket.io + chatStore per-session 状态） |
| **关联文档** | specs/tasks-web-ui.md T043, specs/web-plan.md M6.3 |

## 2. 背景与目标

### 2.1 当前状态

035 完成后，Web UI 已打通完整会话链路：输入消息 → 流式回复 → 工具卡片 → 会话侧边栏。`message_complete` 事件已携带 `TokenUsageStats { inputTokens, outputTokens, durationMs }`，但 `chatStore.markComplete` 将其丢弃（参数名前缀 `_stats`）。桌面端无持久化头部栏，用户无法感知当前会话的 Token 消耗和费用。

### 2.2 目标

- 在聊天区域顶部显示当前会话的实时 Token 使用量和估算费用
- 流式输出期间实时估算 Token 数，消息完成时替换为精确值
- 基于模型 ID 自动选取对应单价计算费用
- 头部栏同时显示 WebSocket 连接状态

### 2.3 非目标

- 不做完整历史成本统计仪表板（036+）
- 不做多模型价格实时查询 API（价格表内嵌为静态数据）
- 不做 Token 预算 / 上限告警（037+）

## 3. 核心设计

### 3.1 数据模型

```typescript
// TokenUsageStats 扩展（types/message.ts）
export interface TokenUsageStats {
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

// SessionStats 扩展（store/chat.ts）
interface SessionStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedOutputTokens: number; // 流式期间的临时估算
  cost: number;  // USD，客户端计算
}
```

### 3.2 模型定价表（lib/model-pricing.ts）

```typescript
const MODEL_PRICING: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  "claude-sonnet-4-6":    { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  "claude-opus-4-7":      { inputPerMTok: 15.00, outputPerMTok: 75.00 },
  "claude-haiku-4-5":     { inputPerMTok: 0.80, outputPerMTok: 4.00 },
  "deepseek-v4-pro":      { inputPerMTok: 0.27, outputPerMTok: 1.10 },
  "gpt-4o":               { inputPerMTok: 2.50, outputPerMTok: 10.00 },
  _default:               { inputPerMTok: 1.00, outputPerMTok: 5.00 },
};

function computeCost(model: string, inputTokens: number, outputTokens: number): number;
```

### 3.3 数据流

```
socket: stream_token
  → chatStore.estimateToken(sessionId)
  → increment estimatedOutputTokens (chars.length / 4)

socket: message_complete { stats }
  → chatStore.markComplete(id, stats, sessionId)
  → save actual inputTokens/outputTokens, reset estimatedOutputTokens

Header component
  → reads sessionStats[activeSessionId]
  → computeCost(model, input, output + estimated)
  → renders: "📊 12.5k tokens | ~$0.18 | ● Connected"
```

## 4. 功能需求

### FR-1: 实时 Token 计数 [P0]

**Given** 用户正在当前会话中发送消息
**When** 服务器流式返回 token
**Then**
- Header 显示实时累计 token 数（估算值 + 斜体表示进行中）
- 消息完成时估算值切换为精确值

**边界**:
- 长消息 → 估算值持续递增，不会溢出
- 无活跃流式 → 显示最后一次精确统计

### FR-2: 费用显示 [P0]

**Given** 当前会话已有 token 消耗
**When** 用户查看 Header
**Then**
- 显示基于模型单价的估算费用（USD）
- 费用四舍五入到分（$0.00 格式）

**边界**:
- 模型 ID 不在定价表中 → 使用 _default 定价
- token 数为 0 → 显示 "$0.00"

### FR-3: 连接状态 [P1]

**Given** WebSocket 连接状态变化
**When** 连接断开/重连
**Then**
- Header 右侧显示连接状态指示器（绿点 Connected / 红点 Disconnected）

**边界**:
- 初始状态为 "Connecting..."
- 断连 5s 后显示 "Reconnecting..."

## 5. 变更清单

| 文件 | 改动 | 体积 |
|------|------|:--:|
| `packages/web/src/store/chat.ts` | 新增 sessionStats + 动作 | 中 |
| `packages/web/src/types/message.ts` | TokenUsageStats 扩展 | 小 |
| `packages/web/src/lib/model-pricing.ts` | 模型定价表 + 计算函数 | 小 |
| `packages/web/src/components/layout/header.tsx` | 头部组件 | 中 |
| `packages/web/src/components/app-shell.tsx` | 集成 Header | 小 |
| `packages/web/src/components/chat/chat-page.tsx` | wire estimateTokens | 小 |

## 6. 测试需求

- 单元测试: model-pricing 计算正确性
- 组件测试: Header 各状态渲染（有数据/无数据/估算中/完成）
- 集成测试: chatStore markComplete 正确累积 stats
- E2E: 发送消息 → 看 Header token 递增 → 消息完成后数字稳定

## 7. 已知限制

- 流式期间的 token 估算是字符数/4，对非拉丁字符（CJK）偏高约 30%
- 模型定价为静态数据，手动维护，不实时同步官方价格
- 当前只显示当前会话的 token，不跨会话汇总
