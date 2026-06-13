# 实施进度 · CLI REPL

## 当前状态
✅ 全部 14 个 task 已完成 + 4 个结构性缺口已修复

## 已完成
- [x] T01 · Define CLI types + renderer dispatch
- [x] T02 · Implement text renderer
- [x] T03 · Implement tool renderer
- [x] T04 · Implement diff renderer
- [x] T05 · Implement permission prompt
- [x] T06 · Implement todo panel
- [x] T07 · Implement summary line
- [x] T08 · Implement input handler
- [x] T09 · Implement REPL main loop
- [x] T10 · Unit tests — text renderer (6 tests)
- [x] T11 · Unit tests — diff renderer (6 tests)
- [x] T12 · Unit tests — permission prompt (6 tests)
- [x] T13 · Integration test — REPL (14 tests)
- [x] T14 · Update index.ts to use full REPL (+ fix smoke tests)

## 结构性缺口修复 (test-routing-advisor 报告)
- [x] GAP-1 · Unicode display width — 新增 wcwidth.ts + text-renderer 改用 stringWidth
- [x] GAP-2 · ANSI escape code width interference — todo-panel.ts 分离 ANSI 前缀与内容宽度计算
- [x] GAP-3 · 跨终端宽度测试 — text-renderer.test.ts 从 6 个扩展到 21 个测试
- [x] GAP-4 · 真实 Runtime 集成测试 — 新增 runtime-integration.test.ts (4 tests)

## 测试结果
306 passed · 1 skipped · 0 failed

## 阻塞项
（无）

## 最后更新
2026-06-13
