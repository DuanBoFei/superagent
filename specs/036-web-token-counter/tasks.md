# 036-web-token-counter · 任务清单

| 组 | 任务 | 类型 | 说明 |
|----|------|------|------|
| W1 | T001–T003 | 数据层 | chatStore 扩展 + 模型定价 + 实时估算 |
| W2 | T004–T006 | UI + 集成 | Header 组件 + AppShell 集成 + E2E |

---

## W1: 数据层

### T001 · 扩展 chatStore 累积会话级 token 统计

**标签**: `[BE]` **依赖**: 无 **预计**: 20 min

**输入**: `store/chat.ts:111` — `markComplete` 接收 stats 但丢弃（`_stats`）
**输出**: chatStore 新增 `sessionStats` 状态 + `markComplete` 保存 stats

**内容**:
1. 在 `TokenUsageStats` 接口中新增 `totalCost` 可选字段
2. 在 `ChatStore` 接口中新增 `sessionStats: Record<string, TokenUsageStats>`
3. 修改 `markComplete` 实现：不再丢弃 stats，而是累加进 `sessionStats[sid]`
4. 在 `reset` 中清空 `sessionStats`

**验证**: `pnpm test -- tests/web/store/chat.test.ts` pass

### T002 · 创建模型定价表 + 费用计算工具

**标签**: `[FE]` **依赖**: 无 **预计**: 15 min

**输入**: 无现有实现
**输出**: `lib/model-pricing.ts` + 测试

**内容**:
1. 创建 `MODEL_PRICING` 表，覆盖 Claude Sonnet/Opus/Haiku + DeepSeek V4 + GPT-4o + `_default`
2. 实现 `computeCost(model, inputTokens, outputTokens): number` 函数
3. 创建 `lib/model-pricing.test.ts`：验证各模型计算、未知模型回退 _default、零 token、边界值

**验证**: `pnpm test -- tests/web/lib/model-pricing.test.ts` pass

### T003 · 新增流式期间实时 Token 估算

**标签**: `[FE]` **依赖**: T001 **预计**: 15 min

**输入**: `chat-page.tsx:34` — `onToken` 仅调用 `appendToken`
**输出**: chatStore 新增 `estimateOutputToken` 动作，chat-page wire 到 `stream_token`

**内容**:
1. 在 chatStore 中新增 `estimateOutputToken(sessionId, charCount)` 动作
2. 估算公式：`estimatedOutputTokens = Math.ceil(charCount / 4)`
3. 在 `chat-page.tsx` 的 `onToken` 中联调 `estimateOutputToken(token.length)`
4. 在 `markComplete` 中重置 `estimatedOutputTokens` 为 0（替换为精确值）

**验证**: `pnpm test -- tests/web/store/chat.test.ts` pass（含估算逻辑测试）

---

## W2: UI + 集成

### T004 · 创建 Header 组件

**标签**: `[FE]` **依赖**: T002, T003 **预计**: 20 min

**输入**: 无 header 组件，AppShell 仅有移动端汉堡栏
**输出**: `components/layout/header.tsx`

**内容**:
1. 创建 `Header` 组件，从 chatStore 读取 `sessionStats[activeSessionId]`
2. 渲染三个区域：左侧 token 计数、中间费用估算、右侧连接状态
3. 流式期间 token 数用斜体 + `(estimating...)` 标记
4. 无活跃会话时显示 `--` 占位符
5. 创建 `header.test.tsx`：覆盖有数据 / 估算中 / 无会话 / 断连四种状态

**验证**: `pnpm test -- tests/web/components/layout/header.test.tsx` pass

### T005 · Header 集成到 AppShell

**标签**: `[INT]` **依赖**: T004 **预计**: 10 min

**输入**: `app-shell.tsx:47` — 移动端汉堡栏（`lg:hidden`）
**输出**: Header 在桌面端可见

**内容**:
1. 在 AppShell main content 顶部插入 `<Header />`
2. 移除移动端汉堡栏的 `lg:hidden` 改为 `lg:flex`，桌面端显示完整 Header
3. 移动端保持汉堡 + 标题简版

**验证**: `pnpm test -- tests/web/integration/app-shell.integration.test.tsx` pass

### T006 · E2E 验证 + 代码审查

**标签**: `[INT]` **依赖**: T005 **预计**: 20 min

**输入**: 全链路已通
**输出**: E2E 测试 + spec 文档更新

**内容**:
1. 创建 `tests/web/token-counter-e2e.pwtest.ts`：发送消息 → 验证 Header 出现 token 数 → 等待完成 → 验证费用出现
2. 代码审查：扫描是否遗漏空态、模型 fallback、连接状态同步
3. 更新 `state.md` 标记完成
4. 更新 `session.md` 写最终总结

**验证**: `npx playwright test -- tests/web/token-counter-e2e.pwtest.ts` pass, typecheck pass

---

```
T001 ──→ T003 ──→ T004 ──→ T005 ──→ T006
T002 ────────────↗
```

| Wave | Tasks | 预计总时间 |
|------|:-----:|:---------:|
| W1 | T001–T003 | 50 min |
| W2 | T004–T006 | 50 min |
| **总计** | **6 tasks** | **~1.7 hours** |
