# 会话总结 · Model Fallback

## 状态
✅ feature 已完成并通过验证。

## 完成范围
- 定义模型层契约：`Prompt`、`TokenChunk`、`ModelConfig`、`ModelError`。
- 实现 OpenAI-compatible SSE 流解析，支持 text、tool call、usage/end、分块读取和坏 JSON 跳过。
- 实现模型调用重试策略：429、5xx、timeout 与不可重试错误分流。
- 实现两层 fallback 编排：primary → secondary，含 fallback event、双失败错误聚合、连续 timeout 后跳过 primary。
- 实现 `sendMessage(prompt)` provider API，读取配置并发起 `/chat/completions` 流式请求。
- 添加 mock HTTP provider 集成测试与默认跳过的真实 API smoke test。
- 将 runtime 002 的 model stub 接入真实 provider，并保留 runtime token 兼容适配。
- 重跑 runtime 002 集成测试，确认未破坏核心 runtime。

## 验证结果
- `tests/runtime/`：51 passed。
- `tests/models tests/runtime`：69 passed，1 skipped。
- `tsc --noEmit`：passed。
- 最终工作区：clean。

## 收尾决策
- 当前仓库未配置 remote，无法创建 PR，因此走本地 merge 收尾。
- tag 约定：`v0.1.0-003-model-fallback`。
- `specs/003-model-fallback/` 冻结保留，后续需求变更新开 spec 编号，不修改已完成范围。

## 后续结构性缺口
- 真实 API smoke 仍需带真实 `SUPERAGENT_API_KEY` 手工启用执行。
- 更细的 OpenAI-compatible tool call 分段 arguments fixture 可作为后续后端补测。
- provider 错误进入 runtime 的用户可见行为可在后续 runtime hardening 中补测。
