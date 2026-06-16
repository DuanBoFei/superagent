# 012 Hooks 生命周期系统 · 状态

| 项目 | 内容 |
|------|------|
| Feature | 012-hooks-lifecycle-system |
| 状态 | Completed |
| 完成日期 | 2026-06-16 |
| 分支 | worktree-feat-012-hooks-lifecycle-system |
| 收尾验证 | 12 files / 73 tests passed |

## 完成范围

- Hooks 配置契约与校验完成。
- Hook lifecycle event builders 完成。
- Hook matcher、错误标准化、secret redaction 完成。
- 本地命令 hook executor 完成，支持 stdin event、stdout JSON result、timeout、非零退出隔离。
- Hook manager 完成顺序执行、匹配、阻塞事件、observe-only 事件归一化。
- Runtime 完成 SessionStart、UserPromptSubmit、PreCompact、Stop wiring。
- Tool dispatcher 完成 PreToolUse、PostToolUse、PostToolUseFailure wiring。
- Hook observability 完成 hook:start、hook:end、hook:failure、hook:block 事件。
- End-to-end lifecycle integration coverage 完成。

## 验证

```bash
vitest run tests/config/hooks-config.test.ts tests/hooks/types.test.ts tests/hooks/events.test.ts tests/hooks/matcher.test.ts tests/hooks/errors.test.ts tests/hooks/executor.test.ts tests/hooks/manager.test.ts tests/hooks/integration.test.ts tests/runtime/hooks-prompt.test.ts tests/runtime/tool-dispatcher.test.ts tests/runtime/query-loop.test.ts tests/runtime/runtime.test.ts
```

结果：12 files passed / 73 tests passed。

## 归档约束

- `specs/012-hooks-lifecycle-system/` 冻结保留，不删除。
- 后续需求变更开新编号 feature，不在本 feature 内追加范围。
