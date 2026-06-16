# 012 Hooks 生命周期系统 · Session 总结

## 目标

为 SuperAgent 增加 Hooks 生命周期系统，覆盖配置契约、本地命令执行、hook manager 语义、runtime/tool dispatcher wiring、observability 与端到端 lifecycle 回归。

## 完成内容

- 完成 hooks 配置 schema 与契约测试。
- 完成 HookEvent / HookResult / HookConfig 等领域类型。
- 完成 SessionStart、UserPromptSubmit、PreToolUse、PostToolUse、PostToolUseFailure、PreCompact、Stop 事件构造器。
- 完成 hook matcher，支持事件、工具名与命令模式匹配。
- 完成 hook error normalization 与 secret redaction。
- 完成本地命令 hook executor，支持事件 JSON stdin、stdout JSON result、stderr/stdout 截断脱敏、timeout 与非零退出隔离。
- 完成 hook manager，保证配置顺序执行、blocking event 阻断、observe-only event 不改变主流程。
- 完成 runtime wiring：SessionStart、UserPromptSubmit、PreCompact、Stop。
- 完成 tool dispatcher wiring：PreToolUse、PostToolUse、PostToolUseFailure。
- 完成 hook observability：hook:start、hook:end、hook:failure、hook:block。
- 新增 `tests/hooks/integration.test.ts` 端到端生命周期覆盖。

## TDD 与缺陷固化

- T014 integration test 先暴露 UserPromptSubmit block message 对终端输出泄露 `api_key=SECRET123` 的问题。
- 随后在 `src/runtime/query-loop.ts` 对 prompt hook block message 应用 `redactHookSecrets`。
- 回归确认终端-facing error 与 hook:block observability 均输出 `api_key=[REDACTED]`。

## 测试路由结论

- 主类：单后端。
- 次类：跨模块契约。
- 完整功能链路：未补全新的跨 feature A→B→C 用户旅程，不路由 full-chain。
- 后端结构性补测执行器已验证当前 hooks/config/runtime 覆盖，无新增结构性缺口。

## 验证命令

```bash
D:/a-workflow-agent/superAgent/.claude/worktrees/feat-011-mcp-server-integration/node_modules/.bin/vitest run tests/config/hooks-config.test.ts tests/hooks/types.test.ts tests/hooks/events.test.ts tests/hooks/matcher.test.ts tests/hooks/errors.test.ts tests/hooks/executor.test.ts tests/hooks/manager.test.ts tests/hooks/integration.test.ts tests/runtime/hooks-prompt.test.ts tests/runtime/tool-dispatcher.test.ts tests/runtime/query-loop.test.ts tests/runtime/runtime.test.ts --root D:/a-workflow-agent/superAgent/.claude/worktrees/feat-012-hooks-lifecycle-system
```

结果：12 files passed / 73 tests passed。

## 关键提交

- `91fa043 feat(012-T012): wire lifecycle hooks into runtime`
- `8b1eb80 feat(012-T013): emit hook observability events`
- `6bb409e feat(012-T014): add hook lifecycle integration coverage`

## 收尾状态

Feature 012 已完成并全绿。`specs/012-hooks-lifecycle-system/` 保留冻结；后续需求变更开新编号 feature。
