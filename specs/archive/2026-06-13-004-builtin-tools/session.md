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

## 收尾补测 (2026-06-13)
- test-routing-advisor 判定: 单后端，命中 1 个结构性缺口
- 🔧 韧性/故障注入 → WebSearch AbortController 30s 超时路径无专项测试
- 补测: `tests/tools/web-search.test.ts` +1 test（fake timers + hanging fetch → abort → graceful degradation）
- 结果: 178 passed, 0 failed（实现已正确处理，仅缺覆盖，补后即绿）

## Spec 冻结
本 spec 目录冻结，需求变更开新编号。
