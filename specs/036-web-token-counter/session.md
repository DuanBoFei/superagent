# 会话交接 · web-token-counter

## 状态: ✅ Feature Complete

**完成日期**: 2026-06-21
**分支**: worktree-feat-036-web-token-counter

## 做了什么

实现桌面端 Header 组件，实时显示当前会话的 Token 使用量和估算费用。

### 数据层

- **chatStore 扩展** — 新增 `sessionStats: Record<string, SessionStats>` 状态，`markComplete` 不再丢弃 stats 而是累积到会话级统计，`estimateOutputToken` 在流式期间按字符估算
- **模型定价表** — `lib/model-pricing.ts`：覆盖 Claude Sonnet/Opus/Haiku + DeepSeek V4 + GPT-4o + _default 回退，`computeCost(model, inputTokens, outputTokens)` 返回 USD 费用

### UI 层

- **Header 组件** — `components/layout/header.tsx`：三区域布局（左侧 token 计数 | 中间费用 | 右侧连接状态指示器）
  - 流式期间输出 token 数斜体 + `(estimating...)` 标记
  - 无活跃会话时显示 `--` 占位符
  - 费用四舍五入到 $0.00
- **AppShell 集成** — 桌面端 (`lg:block`) 显示完整 Header，移动端保持汉堡栏

### 数据流

```
stream_token → estimateOutputToken(sessionId, token.length)
message_complete { stats } → markComplete(id, stats, sessionId) → 累加 sessionStats
Header → 读取 sessionStats[activeSessionId] → computeCost() → 渲染
```

## 测试结果

| 层 | 通过 | 
|----|:---:|
| chatStore | 34/34 |
| model-pricing | 8/8 |
| header component | 6/6 |
| chat-page | 10/10 |
| **总计** | **58/58** |

## 架构要点

- **sessionStats** 与 sessionMessages 并存于 chatStore，按 sessionId 索引，reset 时清空
- **Token 估算**: `Math.ceil(charCount / 4)`，完成时被服务器精确值替换
- **模型定价**: 静态表，键为模型 ID 字符串，未知模型回退 `_default` ($1.00/$5.00)
- **费用计算**: `(inputTokens / 1e6 * inputPerMTok) + (outputTokens / 1e6 * outputPerMTok)`，Math.round 到分

## 已知限制

- 流式 token 估算对 CJK 字符偏高约 30%
- 模型定价为静态数据，需手动更新
- 仅显示当前会话统计，不跨会话汇总
- 未添加 E2E Playwright 测试（036+ 补）

## 下次会话

036 完成。建议下一步：
- M6.4 主题切换（暗/亮 + 系统偏好）
- M6.5 键盘快捷键系统化

---

> **完成日期**: 2026-06-21 · **分支**: worktree-feat-036-web-token-counter
