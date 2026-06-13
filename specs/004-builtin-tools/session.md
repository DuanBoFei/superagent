# Session · 004 Built-in Tools

## 状态
✅ 已完成

## 范围
- T01: 定义 tool 接口 + 注册表类型
- T02-T09: 实现 8 个内置工具（Read/Write/Edit/Bash/Grep/Glob/Task/WebSearch）
- T10-T15: 单元测试覆盖对接
- T16: 全工具注册 + runtime stub 集成

## 验证
- `tests/tools/` · 47 passed (9 files)
- `tests/` · 177 passed, 1 skipped (33 files)
- `tsc --noEmit` · passed

## 提交
共 9 个 commit（1ff714d → 61ebb69），无未提交变更。

## 部署
本地 merge。Tag: `v0.1.0-004-builtin-tools`。

## Spec 冻结
本 spec 目录冻结，需求变更开新编号。
