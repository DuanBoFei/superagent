# 02 - API 与模型服务调研

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| **目标** | 为生产级通用桌面 AI Agent 选型主力模型 Provider 及备份方案，输出多 Provider 对照、价格对比、API 网关方案与推荐策略 |
| **调研日期** | 2026-06-12 |
| **信源覆盖** | WebSearch（偏海外、英文、GitHub）+ 针对性中文社区搜索 |
| **信源标注** | `[WebSearch]` = Claude 内置网络搜索确认；`[双路 ✅]` = 多来源交叉验证；`[单源 ⚠️]` = 仅单一来源 |
| **价格时效** | 所有价格数据查询于 2026 年 6 月，以各 Provider 官方定价页为准 |

> 备注：muyu-search-mcp 工具在当前会话中不可用，本调研以 WebSearch 为主要信源，中文社区数据通过 WebSearch 搜索中文关键词获取。

---

## 2. Provider 对照大表（8 家）

### 2.1 总体对照

| 维度 | Anthropic (Claude) | OpenAI | Google (Gemini) | DeepSeek | 通义千问 (Qwen) | 智谱 (GLM) | Moonshot (Kimi) | xAI (Grok) |
|------|-------------------|--------|-----------------|----------|----------------|-----------|----------------|------------|
| **旗舰模型** | Opus 4.7 [WebSearch] | GPT-5 [WebSearch] | Gemini 2.5 Pro [WebSearch] | V4 Pro [WebSearch] | Qwen3.7-Max [WebSearch] | GLM-5.1 [WebSearch] | K2.6 [WebSearch] | Grok 4.3 [WebSearch] |
| **主力推荐** | Sonnet 4.6 [WebSearch] | GPT-4.1 [WebSearch] | Gemini 2.5 Flash [WebSearch] | V4 Flash [WebSearch] | Qwen3-max / 3.5-Plus [WebSearch] | GLM-4.7 [WebSearch] | K2.5 [WebSearch] | Grok-Build-0.1 [WebSearch] |
| **最便宜** | Haiku 4.5 [WebSearch] | GPT-4.1 Nano [WebSearch] | Flash-Lite (免费) [WebSearch] | V4 Flash [WebSearch] | Qwen-Flash [WebSearch] | GLM-4-Flash (免费) [WebSearch] | 无廉价档 [WebSearch] | Grok-Build-0.1 [WebSearch] |
| **上下文窗口** | Opus/Sonnet 1M；Haiku 200K [WebSearch] | GPT-4.1 1M；GPT-5 128K [WebSearch] | 2.5 Pro/Flash 1M [WebSearch] | 1M [WebSearch] | Qwen3-Max 256K [WebSearch] | GLM-5.1 200K [WebSearch] | 262K [WebSearch] | Grok 4.3 1M；4.20-MA 2M [WebSearch] |
| **OpenAI SDK兼容** | 社区代理兼容 [单源 ⚠️] | 原生标准 [WebSearch] | 通过LiteLLM兼容 [WebSearch] | 原生兼容 [WebSearch] | 原生兼容 [WebSearch] | 原生兼容 [WebSearch] | 原生兼容 [WebSearch] | 原生兼容 [WebSearch] |
| **国内直连** | 需代理 [WebSearch] | 需代理 [WebSearch] | 需代理 [WebSearch] | 直连 [双路 ✅] | 直连 [双路 ✅] | 直连 [双路 ✅] | 直连 [双路 ✅] | 需代理 [WebSearch] |
| **Prompt Cache** | 是，命中也 90% off [WebSearch] | 是，GPT-5 90% off / GPT-4.1 75% off [WebSearch] | 是，约10%输入费率+存储费 [WebSearch] | 是，命中也 ~1/10 输入价 [WebSearch] | 是，仅输入Token享有折扣 [WebSearch] | 未明确 [单源 ⚠️] | 是，K2.6 命中 $0.07/MTok [WebSearch] | 是，缓存输入 $0.20/MTok [WebSearch] |
| **Batch折扣** | 50% off [WebSearch] | 50% off [WebSearch] | 50% off [WebSearch] | 75% off (峰谷) [WebSearch] | 50% off [WebSearch] | 未明确 [单源 ⚠️] | 未明确 [单源 ⚠️] | 未明确 [单源 ⚠️] |

### 2.2 免费额度

| Provider | 免费内容 | 限制 |
|----------|---------|------|
| **Anthropic** | 无明显免费额度 | 需预充值 [WebSearch] |
| **OpenAI** | 无明显免费额度 | 需预充值 [WebSearch] |
| **Google** | Gemini 2.5 Flash-Lite (15 RPM, 1.5K RPD)；Flash (15 RPM, 1.5K RPD) | 数据可能被用于训练；Pro 模型2026年4月起不再免费 [WebSearch] |
| **DeepSeek** | 新用户 500万 token | 30天内有效 [WebSearch] |
| **通义千问** | 开通百炼 90天内每模型各 100万 Token | 合计约 7000万 Token [WebSearch] |
| **智谱** | GLM-4-Flash 永久免费 | 不限量 [WebSearch] |
| **Moonshot** | 新用户 500万 token | 限时 [WebSearch] |
| **xAI** | 曾提供 $150/月 API 额度（数据共享计划） | 需验证当前状态 [单源 ⚠️] |

---

## 3. 模型能力对比

### 3.1 代码能力

| 模型 | 关键基准 | 数据来源 |
|------|---------|---------|
| **GPT-5 Codex** | SWE-bench Verified **74.9%** | [WebSearch] |
| **Claude Opus 4.7** | SWE-bench Verified ~70s% | [WebSearch] |
| **Gemini 3 Pro** | SWE-bench ~71% | [WebSearch] |
| **GPT-4.1** | SWE-bench Verified 54.6%，Code-diff 52.9% | [WebSearch] |
| **DeepSeek V4 Flash** | HumanEval / LiveCodeBench **93.5%** | [WebSearch] |
| **Kimi K2.7 Code** | 专为编程优化，Token消耗减少30% | [WebSearch] |
| **Qwen3-Coder** | MCPMark: 24.8% pass@1（多步工具调用） | [WebSearch] |

关键发现 `[WebSearch]`：
- GPT-5 Codex 在 SWE-bench 上遥遥领先（74.9% vs GPT-4.1 的 54.6%），但延迟偏高（GPT-5.2-Pro 版本达 17.4s）。
- DeepSeek V4 Flash 在 HumanEval/LiveCodeBench 得分极高（93.5%），性价比最优。
- Claude Opus 4.7 在代码重构、多文件编辑类任务中可靠性最高。
- Kimi K2.7 Code（2026-06-12 开源）专为长上下文编程场景打造，6倍高速版 6月15日上线。

### 3.2 Function Calling / Tool Use 质量

| 模型 | BFCL 总分 | MCPMark Pass@1 | 特点 | 数据来源 |
|------|----------|----------------|------|---------|
| **Claude Opus 4.1** | 70.36% | 29.9% | 格式准确性最高 | [WebSearch] |
| **Claude Sonnet 4** | 70.29% | 28.1% | 综合最强FC | [WebSearch] |
| **GLM-4.5 (FC)** | **70.85%** | N/A | BFCL第一，中文场景强 | [WebSearch] |
| **GPT-5** | 59.22% | **52.6%** | 复杂多步Agent最强 | [WebSearch] |
| **Gemini 2.5 Pro** | N/A | N/A | 多工具选择最优（66.2%） | [WebSearch] |
| **DeepSeek V3.2** | N/A | N/A | 结构化API调用：60.8%精度，11倍更低成本 | [WebSearch] |

关键发现 `[WebSearch]`：
- BFCL（单次函数调用精度）：Claude 和 GLM 领先。GLM-4.5 FC 以 70.85% 位居榜首。
- MCPMark（复杂多步 Agent 工作流）：GPT-5 Medium 以 52.6% pass@1 远超第二名（Claude Opus 4.1 的 29.9%），优势达 1.8 倍。
- 多工具选择场景：Gemini 2.5 Pro 最优（66.2%），Claude 3.7 Sonnet 紧随其后（53.4%）。
- **对 Agent 的启示**：简单 tool call 用 Claude/GLM；复杂多步 Agent 工作流优先 GPT-5；多工具协同场景可考虑 Gemini。

### 3.3 上下文窗口

| 区间 | 模型 | 数据来源 |
|------|------|---------|
| **2M tokens** | Grok 4.20 Multi-Agent, Gemini 3 Pro | [WebSearch] |
| **1M tokens** | Claude Opus/Sonnet, GPT-4.1 全家, DeepSeek V4, Grok 4.3, Gemini 2.5 Pro/Flash | [WebSearch] |
| **262K tokens** | Kimi K2.5/K2.6/K2.7 | [WebSearch] |
| **200K tokens** | Claude Haiku 4.5, o4-mini, o3, GLM-5.1 | [WebSearch] |
| **128K tokens** | GPT-5, GPT-4o, GLM-5, GLM-4.7, Qwen3-Max, Gemini 3 Flash | [WebSearch] |

关键发现 `[WebSearch]`：
- 2026年主流旗舰模型上下文窗口普遍进入 1M 时代。
- GPT-5 的 128K 是短板（相比 GPT-4.1 的 1M），专业长上下文场景建议用 GPT-4.1 或 Claude Sonnet 4.6。
- DeepSeek V4 支持 1M + 384K 最大输出，长上下文代码场景极具性价比。
- Kimi 262K 是专为长文档阅读优化的窗口尺寸。

---

## 4. 价格对比总表

> 所有价格单位为美元/百万 Token（$ / 1M tokens），查询日期 2026-06-12。
> 国产模型同时标注人民币价格（¥ / 1M tokens，按 1 USD ≈ 7.2 CNY 估算）。
> 价格随时变动，以各 Provider 官方定价页为准。

### 4.1 旗舰模型价格

| Provider | 模型 | 输入 $/MTok | 输出 $/MTok | 缓存命中输入 $/MTok | 上下文 |
|----------|------|------------|-------------|-------------------|--------|
| **Anthropic** | Opus 4.7 | $5.00 | $25.00 | $0.50 (90% off) | 1M |
| **Anthropic** | Sonnet 4.6 | $3.00 | $15.00 | $0.30 (90% off) | 1M |
| **OpenAI** | GPT-5 | $1.25 | $10.00 | $0.125 (90% off) | 128K |
| **OpenAI** | GPT-4.1 | $2.00 | $8.00 | $0.50 (75% off) | 1M |
| **OpenAI** | o4-mini | $1.10 | $4.40 | $0.275 (50% off) | 200K |
| **Google** | Gemini 2.5 Pro | $1.25 (≤200K) | $10.00 | ~10%输入费率 | 1M |
| **DeepSeek** | V4 Pro | $1.74 ($0.435 促销) | $3.48 ($0.87 促销) | $0.0145 | 1M |
| **通义千问** | Qwen3.7-Max | $2.50 (¥12) | $7.50 (¥36) | 支持(仅输入折扣) | 256K |
| **智谱** | GLM-5.1 | $0.83 (¥6) | $3.33 (¥24) | 官方定义 | 200K |
| **Moonshot** | Kimi K2.6 | $0.90 (¥6.5) | $3.75 (¥27) | $0.07 (极低) | 262K |
| **xAI** | Grok 4.3 | $1.25 | $2.50 | $0.20 | 1M |

### 4.2 主力/经济模型价格

| Provider | 模型 | 输入 $/MTok | 输出 $/MTok | 备注 |
|----------|------|------------|-------------|------|
| **Anthropic** | Haiku 4.5 | $1.00 | $5.00 | 200K上下文 |
| **OpenAI** | GPT-4.1 Mini | $0.40 | $1.60 | 1M上下文 |
| **OpenAI** | GPT-4.1 Nano | $0.10 | $0.40 | 1M上下文，极低价格 |
| **Google** | Gemini 2.5 Flash | $0.30 | $2.50 | 有免费额度 |
| **Google** | Gemini 2.5 Flash-Lite | $0.10 | $0.40 | 免费额度较大 |
| **DeepSeek** | V4 Flash | $0.14 | $0.28 | 融合V3+R1，1M上下文 |
| **通义千问** | Qwen3.5-Plus | $0.11 (¥0.8) | $0.67 (¥4.8) | ≤128K |
| **通义千问** | Qwen-Flash | $0.08 (¥0.6) | $0.08 (¥0.6) | 输入=输出同价 |
| **智谱** | GLM-4.7 | $0.28 (¥2) | $1.11 (¥8) | 128K上下文 |
| **智谱** | GLM-4-Flash | 免费 | 免费 | 永久免费 |
| **Moonshot** | K2.5 | $0.60 | $3.00 | 262K上下文 |
| **xAI** | Grok-Build-0.1 | $1.00 | $2.00 | 256K，代码Agent专长 |

### 4.3 价格分层策略分析

`[WebSearch]` 基于 2026 年 Q2 数据：

- **超低成本层（<$0.15/MTok 输入）**：DeepSeek V4 Flash ($0.14)、GPT-4.1 Nano ($0.10)、Gemini Flash-Lite ($0.10)、Qwen-Flash (¥0.6)
- **性价比层（$0.15-$1.00/MTok 输入）**：GPT-4.1 Mini ($0.40)、Gemini 2.5 Flash ($0.30)、Qwen3.5-Plus (¥0.8)、GLM-4.7 (¥2)
- **主力层（$1.00-$3.00/MTok 输入）**：GPT-5 ($1.25)、GPT-4.1 ($2.00)、Gemini 2.5 Pro ($1.25)、Sonnet 4.6 ($3.00)、Grok 4.3 ($1.25)
- **高端层（>$3.00/MTok 输入）**：Opus 4.7 ($5.00)、Qwen3.7-Max ($2.50)

### 4.4 DeepSeek 价格陷阱警示

`[WebSearch]` 多篇中文社区文章指出：低 Token 单价不等于低使用成本。DeepSeek V4 Flash 的 Tokenizer 可能导致相同语义文本产生更多 Token。中文社区实测数据：
- 某标准中文测试集：DeepSeek 产生 Token 数比 GLM-4 多约 30-50%
- 实际有效成本需考虑 Tokenizer 差异、重试次数、错误率
- 建议：以 **成功完成任务的实际花费** 而非单位 Token 价格来比较成本

---

## 5. API 网关/路由方案

### 5.1 方案对比

| 方案 | 语言 | Stars (2026) | 协议 | 适合场景 | 国产模型支持 |
|------|------|-------------|------|---------|------------|
| **LiteLLM** [WebSearch] | Python | 41.8k | MIT | 技术团队、国际模型、企业级 | 需自行配置 |
| **One API** [WebSearch] | Go | 31.3k | MIT | 国内团队、国产模型、轻量部署 | 开箱即用 |
| **OpenRouter** [WebSearch] | 闭源 | N/A | - | 探索400+模型、一个账户 | 支持DeepSeek/GLM/Kimi |
| **Portkey** [WebSearch] | 闭源/OSS | - | MIT | 护栏+提示管理+网关 | 中等 |
| **SiliconFlow (硅基流动)** [WebSearch] | 闭源 | - | - | 国产模型聚合、多模态 | 6家国产+开源模型 |
| **Cloudflare AI Gateway** [WebSearch] | 闭源 | - | - | 边缘缓存、免费10万 req/天 | 国际模型为主 |
| **Helicone** [WebSearch] | 开源 | - | Apache 2.0 | 可观测性为主的网关 | 中等 |

### 5.2 LiteLLM vs One API 详细对比

| 维度 | LiteLLM [WebSearch] | One API [WebSearch] |
|------|---------------------|---------------------|
| **智能路由** | 完整：最低成本、最低延迟、负载均衡、故障转移+熔断 | 基础：渠道权重/优先级 |
| **成本追踪** | 细粒度仪表盘，按团队/项目分摊 | 基础 Token 消耗统计 |
| **企业管理** | 企业版：SSO/JWT、RBAC、审计日志 | 多用户 Token 分发、兑换码系统 |
| **Web 管理** | 基础 | 完善的中文后台管理面板 |
| **中文生态** | 偏英文 | 中文文档完善、社区活跃 |
| **部署** | 中等（Python 生态依赖） | 极轻量（Go 二进制、Docker 单命令） |
| **国产模型** | 需自行配置 Provider | 文心/通义/星火/智谱/豆包/百川/Kimi 等开箱即用 |

### 5.3 推荐网关架构

`[WebSearch]` 国内团队主流实践：

```
应用层 (Claude Code / 自研Agent / LobeChat)
  ↓
One API (前端分发层：统一 API Key、多用户管理、中文界面)
  ↓
├── 国产模型请求 → SiliconFlow / 阿里百炼 / 火山引擎（直连低延迟）
└── 国际模型请求 → LiteLLM Proxy / OpenRouter / 直连官方 API（需代理）
```

或更简单的方案：

```
应用层
  ↓
LiteLLM Proxy (单层) → 100+ Provider 统一路由
  ├── 路由策略：成本最低 / 延迟最低 / 指定模型
  └── Fallback: primary → secondary → tertiary
```

---

## 6. 推荐方案

### 6.1 主方案 + 备份方案

| 场景 | 主力模型 | 备份/Failover | 理由 |
|------|---------|---------------|------|
| **代码生成/Agent** | **DeepSeek V4 Flash** [双路 ✅] | Claude Sonnet 4.6 / GPT-4.1 | V4 Flash 1M上下文、OpenAI兼容、极低价格；备份用国际顶级模型兜底质量 |
| **复杂推理** | **DeepSeek V4 Pro** (促销价) [双路 ✅] | GPT-5 / o4-mini | V4 Pro 促销价 $0.435/$0.87 极低，质量接近顶级 |
| **中文内容** | **GLM-5.1 或 Kimi K2.6** [双路 ✅] | Qwen3-Max | GLM 中文最优；Kimi 长上下文+推理强 |
| **Agent工具调用** | **Claude Sonnet 4.6** [WebSearch] | GPT-5 | Claude BFCL 排名高，工具调用格式最准确 |
| **预算/原型** | **DeepSeek V4 Flash + GLM-4-Flash(免费)** [双路 ✅] | Gemini Flash-Lite(免费) | 组合极致性价比 |
| **国内网络优先** | **DeepSeek V4 Flash** [双路 ✅] | 通义千问 Qwen3.5-Plus | 均直连、低延迟、OpenAI兼容 |

### 6.2 推荐组合策略（针对本项目个人开发者场景）

**三层模型调度架构：**

```
Layer 1 (默认主力): DeepSeek V4 Flash
  - 日常代码、对话、简单工具调用
  - 成本: $0.14/$0.28 per MTok, OpenAI 兼容
  - 国内直连低延迟

Layer 2 (升级/复杂任务): DeepSeek V4 Pro (促销期) 或 Claude Sonnet 4.6
  - 复杂推理、多步规划、需要高可靠性时
  - 通过 LiteLLM/One API 自动路由升级

Layer 3 (Failover 兜底): GLM-4-Flash (免费) 或 GPT-4.1 Nano
  - DeepSeek 服务不可用时自动切换
  - 或任务极其简单时直接走免费层
```

### 6.3 成本优化策略

| 策略 | 预期节省 | 说明 | 数据来源 |
|------|---------|------|---------|
| **Prompt Cache** | 70-95% | 系统提示词 + 重复文档放入 Cache；Claude 90% off, GPT-5 90% off | [WebSearch] |
| **分层路由** | 40-70% | 简单任务走经济模型（V4 Flash / GLM-4-Flash），复杂任务升级到主力 | [WebSearch] |
| **Batch API** | 50% | 批量评估、数据集构建等离线任务走 Batch | [WebSearch] |
| **峰谷调度** | 50-75% | DeepSeek 支持峰谷折扣 (16:30-00:30 GMT)，延时业务可错峰 | [WebSearch] |
| **免费模型兜底** | 100%（基础任务） | GLM-4-Flash 永久免费 + Gemini Flash-Lite 免费额度处理最简单的意图分类、路由 | [WebSearch] |
| **多 Provider 比价路由** | 10-30% | LiteLLM/One API 按 cost-based routing 自动选择最便宜的可用模型 | [WebSearch] |

### 6.4 成本估算示例

`[WebSearch]` 以典型桌面 Agent 日活场景预估（假设日均 500 次调用，平均每次 5K input + 1K output tokens）：

| 方案 | 日均成本 | 月均成本 | 年成本 |
|------|---------|---------|--------|
| **全用 DeepSeek V4 Flash** | ~$0.001/次 × 500 = $0.50 | ~$15 | ~$180 |
| **全用 Claude Sonnet 4.6** | ~$0.03/次 × 500 = $15 | ~$450 | ~$5,400 |
| **全用 GPT-5** | ~$0.016/次 × 500 = $8 | ~$240 | ~$2,880 |
| **分层策略(推荐)** | 80% DFS Flash + 15% Sonnet + 5% GLM Free | ~$100 | ~$1,200 |

> 分层策略相比全用国际顶级模型可节省 75-80%，同时保证关键场景的质量。

---

## 7. 国内网络环境最佳实践

### 7.1 网络可达性总结

| Provider | 国内直连 | 延迟 | 稳定性 | 备注 |
|----------|---------|------|--------|------|
| **DeepSeek** | 是 | 低（~50-100ms） | 较好，偶有波动 [双路 ✅] | 中国公司，国内服务器 |
| **通义千问 (阿里云)** | 是 | 极低（~10-30ms） | 高 [双路 ✅] | 阿里云基础设施 |
| **智谱** | 是 | 低（~30-50ms） | 较好 [双路 ✅] | 中国公司，OpenAI 兼容 |
| **Moonshot (Kimi)** | 是 | 低（~30-50ms） | 较好 [双路 ✅] | 中国公司 |
| **OpenAI** | 需代理 | 高（通过代理 150-300ms） | 取决于代理质量 [WebSearch] | 无官方中国服务 |
| **Anthropic** | 需代理 | 高（通过代理 150-300ms） | 取决于代理质量 [WebSearch] | 无官方中国服务 |
| **Google** | 需代理 | 高（通过代理 150-300ms） | 取决于代理质量 [WebSearch] | 官方 API 被墙 |
| **xAI** | 需代理 | 高 | 取决于代理质量 [WebSearch] | 2026 年新进入者 |

### 7.2 推荐实践

1. **主链路走国产模型（直连）** `[双路 ✅]`
   - DeepSeek V4 Flash 作为代码/推理主力
   - GLM-4.7/GLM-5.1 作为中文内容补充
   - 通义千问 Qwen3.5-Plus 作为阿里云生态备选

2. **国际模型通过 API 网关间接接入** `[WebSearch]`
   - 方案 A：自建 LiteLLM Proxy + 代理（灵活但需运维）
   - 方案 B：使用 OpenRouter（一个账户覆盖 400+ 模型，但中文模型覆盖有限）
   - 方案 C：使用国内聚合平台（SiliconFlow/七牛云）间接接入部分国际模型

3. **代理配置建议** `[单源 ⚠️]`
   - 桌面 Agent 应在设置中允许用户配置 HTTP/SOCKS5 代理 URL
   - 默认不强制代理，国内模型直连优先
   - 当用户启用国际模型时，提示配置代理或聚合平台 API Key

4. **容错与降级** `[WebSearch]`
   - 所有外部 API 调用均需设置超时（建议 30-60s）
   - 实现自动重试（exponential backoff with jitter）
   - 优先级降级链：国内主力 → 国产备份 → 免费模型兜底

---

## 8. 风险与注意事项

### 8.1 价格变动风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| **DeepSeek 涨价** | 中 | 高 | 保持 GLM-4-Flash 免费备份；LiteLLM 支持动态切换 Provider |
| **智谱持续涨价** | 高 `[WebSearch]` | 中 | GLM 已涨价 83%（2026上半年），需监控趋势，勿过度依赖单一国产 Provider |
| **促销到期** | 高 | 中 | DeepSeek V4 Pro 当前 75% off 是促销价，正式商用前需确认长期价格 |
| **免费额度取消** | 中 | 低 | Google Pro 模型已从免费层移除（2026.04），Flash 可能跟随 |

### 8.2 服务可用性风险

| 风险 | 说明 | 数据来源 |
|------|------|---------|
| **DeepSeek 偶发过载** | 国内开发者大量依赖 DeepSeek，高峰期可能排队 | [单源 ⚠️] |
| **API 弃用/重定向** | DeepSeek V3/R1 将于 2026-07-24 废弃；xAI 今年已废弃 8 个旧模型 | [WebSearch] |
| **国内合规突袭** | 大模型 API 需备案，政策可能变动 | [单源 ⚠️] |

### 8.3 技术债务风险

| 风险 | 说明 |
|------|------|
| **OpenAI SDK 兼容性差异** | 虽然国产模型声称 "OpenAI 兼容"，但 tool calling 格式、streaming 行为、error code 可能存在微妙差异 [WebSearch] |
| **Function Calling 行为不一致** | 同一 prompt 路由到不同模型可能产生不同的 tool call 格式（LiteLLM 归一化可能丢失字段）[WebSearch] |
| **Tokenizer 差异** | 相同的 prompt 在不同 Provider 产生不同的 token 数，影响成本预估和上下文窗口管理 [WebSearch] |

### 8.4 数据安全与合规

| 事项 | 建议 |
|------|------|
| **用户代码/数据** | 确认各 Provider 的 API 数据使用条款（是否用于训练） |
| **Google 免费层** | 明确声明数据可能被用于改进产品 [WebSearch] |
| **国内合规** | 通义千问、智谱、Kimi 均已在国内完成大模型备案 |
| **敏感代码** | 建议支持用户配置私有化部署（Ollama/vLLM）作为最终兜底 |

### 8.5 Tokenizer 成本陷阱

`[WebSearch]` 特别警示：DeepSeek V4 使用了新的 tokenizer，可能导致相同文本的 token 数比旧版多 30-50%。在对比 Provider 成本时，应使用**实际业务语料进行 token 数实测**而非简单比较 unit price。建议在项目中记录以下指标：
- 每次请求的实际 token 消耗
- 成功完成任务的 token 效率（总消耗 / 成功任务数）
- 重试率（影响实际成本）

---

## 9. 总结与行动建议

### 9.1 立即行动

1. 注册 DeepSeek API（国内直连、最便宜、OpenAI 兼容）并获取 API Key
2. 注册智谱开放平台（GLM-4-Flash 永久免费作为兜底）
3. 在项目中集成 LiteLLM 或 One API 作为统一 API 层
4. 设计 Prompt Cache 策略（固定系统提示词 + 函数定义放前缀）

### 9.2 建议配置

```yaml
# 推荐 LiteLLM Proxy 初始配置
model_list:
  # Layer 1: 主力（国内直连）
  - model_name: agent-default
    litellm_params:
      model: deepseek/deepseek-v4-flash
      api_base: https://api.deepseek.com/v1
      
  # Layer 2: 升级（复杂推理）
  - model_name: agent-pro
    litellm_params:
      model: deepseek/deepseek-v4-pro
      api_base: https://api.deepseek.com/v1
      
  # Layer 3: 免费兜底
  - model_name: agent-fallback
    litellm_params:
      model: openai/glm-4-flash
      api_base: https://open.bigmodel.cn/api/paas/v4

router_settings:
  routing_strategy: usage-based-routing
  enable_pre_call_checks: true
  fallbacks:
    - agent-default: ["agent-pro", "agent-fallback"]
    
general_settings:
  set_verbose: true
  request_timeout: 60
```

### 9.3 待跟踪事项

- [ ] DeepSeek V4 Pro 促销结束后的正式定价
- [ ] 智谱 GLM 价格走势（是否继续涨价）
- [ ] Grok 5 发布计划
- [ ] OpenAI GPT-5 是否扩大上下文窗口至 1M
- [ ] 国内大模型备案政策变动

---

> **文档版本**: v1.0 | **作者**: AI Agent 调研 | **最后更新**: 2026-06-12
