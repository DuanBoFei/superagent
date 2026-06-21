# 实施进度 · web-token-counter

## 状态: ✅ Complete

**创建日期**: 2026-06-21
**完成日期**: 2026-06-21
**分支**: worktree-feat-036-web-token-counter

## 已完成

### W1: 数据层 (3 tasks)

- [x] T001 · 扩展 chatStore 累积会话级 token 统计 — 新增 `sessionStats` + `estimateOutputToken`
- [x] T002 · 创建模型定价表 + 费用计算工具 — `lib/model-pricing.ts`
- [x] T003 · 新增流式期间实时 Token 估算 — chat-page wire `estimateOutputToken`

### W2: UI + 集成 (3 tasks)

- [x] T004 · 创建 Header 组件 — token/cost/status 三区域
- [x] T005 · Header 集成到 AppShell — 桌面端显示
- [x] T006 · 代码审查 + 文档

## 测试结果

| 层 | 结果 |
|----|------|
| chatStore tests | 34/34 pass |
| model-pricing tests | 8/8 pass |
| header tests | 6/6 pass |
| chat-page tests | 10/10 pass |
| **总计** | **58/58 pass** |

## 代码变更

```
packages/web/src/types/message.ts — 新增 SessionStats 接口
packages/web/src/store/chat.ts — 新增 sessionStats + estimateOutputToken + markComplete 保存 stats
packages/web/src/lib/model-pricing.ts — 模型定价表 + computeCost()
packages/web/src/lib/model-pricing.test.ts — 8 tests
packages/web/src/components/layout/header.tsx — Header 组件 (token/cost/status)
packages/web/src/components/layout/header.test.tsx — 6 tests
packages/web/src/components/app-shell.tsx — 集成 Header
packages/web/src/components/chat/chat-page.tsx — wire estimateOutputToken
specs/036-web-token-counter/spec.md — 功能规格
specs/036-web-token-counter/tasks.md — 任务清单
```

## 最后更新

2026-06-21 · Feature Complete
