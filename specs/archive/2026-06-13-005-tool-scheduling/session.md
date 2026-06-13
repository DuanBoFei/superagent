# Session · Tool Scheduling (005)

## 概要

实现 F3：工具智能分区调度（Tool Intelligent Scheduling）。将模型的工具调用按 `isConcurrencySafe()` 分区为并发组与串行组，并发工具批量执行（每批最多 5 个），串行工具按声明顺序执行并在首次失败时停止后续工具。

## 提交记录（5 commits）

| Commit | 描述 |
|--------|------|
| `20626dd` | feat(T01): define scheduling types |
| `33a9078` | feat(T02): implement partitioner with unit tests |
| `e8f8d3f` | feat(T03,T06): implement executor with concurrency-safe batching |
| `01571b8` | feat(T04,T07): implement scheduler public API with integration tests |
| `235d276` | feat(T08,T09): wire real scheduler to runtime, update dispatcher tests |

## 新增文件

| 文件 | 职责 |
|------|------|
| `src/scheduling/types.ts` | `ToolCall`, `ToolResult`, `BatchPlan`, `PermissionSystem` |
| `src/scheduling/partitioner.ts` | 按 `isConcurrencySafe()` 分区 |
| `src/scheduling/executor.ts` | 并发批量执行 + 串行顺序执行（首次失败停止） |
| `src/scheduling/scheduler.ts` | 公共 API，验证 batch ≤ 8 |
| `tests/scheduling/partitioner.test.ts` | 5 个单测 |
| `tests/scheduling/executor.test.ts` | 7 个单测 |
| `tests/scheduling/scheduler.test.ts` | 3 个集成测试 |

## 修改文件

| 文件 | 变更 |
|------|------|
| `src/runtime/tool-dispatcher.ts` | 移除 stub，接入真实 scheduler |
| `src/runtime/stubs/tools.ts` | 同上 |
| `tests/runtime/tool-dispatcher.test.ts` | 重写为真实工具测试（5 个） |

## 关键设计决策

1. **Partitioner 安全默认**：`registry` 中不存在的工具 → 归入 serial 组，不假设安全
2. **Executor 首次失败停止**：serial 组中任一工具失败 → 后续工具标记 `Skipped`，已成功的保留
3. **并发批量 5**：`MAX_CONCURRENCY = 5`，由 spec 定义
4. **类型映射层**：runtime 的 `ToolCall`（无 `id` 字段）与 scheduling 的 `ToolCall`（含 `id`）在 `dispatchTools` 入口做映射
5. **PermissionSystem stub**：当前 always-allow，待 006 实现后替换

## 测试路由报告摘要

- **判类**：纯单后端
- **TDD 覆盖**：并发原子性、串行失败传播、顺序保证、batch 限制、错误捕获
- **待 006 补**：`PermissionSystem` 跨模块契约（deny 优先、超时 deny、模式匹配）

## 合并信息

- **合并方式**：Fast-forward merge（master 无分叉）
- **标签**：`v0.1.0-005-tool-scheduling` @ `235d276`
- **日期**：2026-06-13
