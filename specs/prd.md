# SuperAgent · 产品需求文档

## 1. 文档信息

| 项 | 值 |
|---|---|
| 文档名称 | SuperAgent · 产品需求文档 |
| 版本 | v1.0 |
| 状态 | Approved |
| 作者 | PM (基于 brainstorming 11 问收敛) |
| 创建日期 | 2026-06-12 |
| 最后更新 | 2026-06-12 |
| 上游依赖 | specs/research/01~05 调研 + brainstorming 11 问 |
| 下游文档 | TRD (技术方案) → Spec-Kit /plan → /tasks → /implement |

---

## 2. 项目背景与目标

### 2.1 背景

2026 年 AI 编码 Agent 已从"能不能用"进入"能不能用得起"阶段。Claude Code、OpenClaw、Codex CLI 等产品验证了 CLI 形态的 Agent 产品可行性，但它们有两个共同缺陷：

1. **模型绑定**：Claude Code 绑死 Anthropic API（$15/MTok），Codex CLI 绑 OpenAI。无国产模型选项。
2. **代码封闭**：Claude Code 源码可见但专有许可，开发者无法在自有项目中信任不可审计的代码修改工具。

国内独立开发者当前选择：要么付 Anthropic 高价（月 $200-400+），要么用国产"聊天式"工具（通义灵码等）——它们能补全代码行，但不能自主完成"读代码→定位→修 bug→跑测试"闭环。

DeepSeek V4 Pro 促销价 $0.435/$0.87 per MTok 的出现，让成本结构质变成为可能——同等任务 1/17 成本。

### 2.2 业务目标

打造一个**模型自由、MIT 开源**的生产级 CLI 编码 Agent，让国内开发者以 1/17 成本获得 Claude Code 级体验，建成国内 AI 编码 Agent 的首选开源项目。

### 2.3 产品目标

| # | 目标 | 衡量方式 |
|---|------|---------|
| P1 | 用户可在终端内完成"读代码→理解→改 bug→验证"闭环 | 对 3 个真实开源项目成功提交 fix PR |
| P2 | 模型成本 ≤ Claude Code 的 10% | Token 统计页对比 |
| P3 | 单次会话 50 轮不掉上下文、不重复犯错 | 手工测试脚本 |

### 2.4 非目标 (Non-Goals)

- 不做模型训练/微调——只消费 API
- 不做多 Agent 协作（Orchestrator + Worker）
- 不做 Computer Use / 桌面控制 / 浏览器操作
- 不做消息平台集成（微信/钉钉/Slack）
- 不做 IDE 插件（VS Code / JetBrains）
- 不做 Web Dashboard / Desktop App GUI
- 不做多语言 i18n（英文 CLI 输出）
- 不做插件市场 / 发布系统
- 不做云端沙箱

---

## 3. 目标用户与画像

### 3.1 主要画像 P1：独立开发者 / 小团队后端工程师

| 维度 | 描述 |
|------|------|
| 背景 | 全栈/后端，一个人或 2-5 人团队，日常写业务代码 |
| 现状工具 | VS Code + GitHub Copilot（行级补全），想用 Agent 做架构级任务 |
| 核心痛点 | ① Copilot 只补行不做事 ② Claude Code 太贵 ③ 国内工具只能聊天不能干活 |
| 使用频次 | 每天 10-30 次 Agent 交互 |
| 终端环境 | Linux/macOS 终端原住民，Git 熟练 |
| 技术栈 | TypeScript/Python/Go，命令行是主战场 |
| 决策权重 | 成本敏感 > 稳定性 > 功能丰富度 |
| 支付意愿 | 希望月成本 < $5（API 费用），工具本身开源免费 |

### 3.2 次要画像 P2：开源项目维护者

| 维度 | 描述 |
|------|------|
| 背景 | 维护 1-3 个开源项目，issue/PR 积压严重 |
| 现状工具 | 周末手动做 issue triage、review PR、修重复性 bug |
| 核心痛点 | ① 没时间逐一 review 新人 PR ② 低级 issue 占满通知 ③ CI 挂了定位慢 |
| 使用频次 | 周末集中使用，每次 3-5 个会话 |
| 终端环境 | Linux/macOS，CI/CD 熟悉 |
| 决策权重 | 自动化深度 > 成本 > 响应速度 |

### 3.3 反画像（明确不服务）

| 画像 | 原因 |
|------|------|
| 非技术用户（产品经理/设计师/运营） | MVP 是 CLI only，无 GUI |
| 大型企业/合规重度团队 | 无 SSO/审计/合规/私有部署 |
| 数据科学家 / ML 研究员 | 需要 Jupyter 生态深度集成 |
| 纯 Windows 用户 | CLI 体验在 Unix-like 环境验证，Windows 不保证 |

---

## 4. 用户故事

### US-1: 代码理解与依赖分析

作为独立开发者，当我接手一个陌生代码库时，我可以向 Agent 描述我想理解的功能，然后看到它自动跨文件追踪调用链、梳理数据流、标出副作用点，最终给出一份结构化的分析报告。

- **I**ndependent: 只依赖代码文件和搜索工具
- **N**egotiable: 分析深度可调（文件级 → 函数级 → 副作用级）
- **V**aluable: "有 AI 之前"最耗时的工作
- **E**stimable: 3-5 人天
- **S**mall: 一个 session 内完成
- **T**estable: 3 个测试 repo → 预期分析结果验证

### US-2: Bug 修复闭环

作为独立开发者，当我描述一个 bug（附错误日志或复现步骤）时，Agent 可以自己定位出错代码、理解根因、给出修复方案、等我批准后写入文件，然后自动跑相关测试验证没有引入回归。

- **I**ndependent: 依赖读/写/执行工具
- **N**egotiable: 修复范围可限（只改一个文件 vs 允许跨文件）
- **V**aluable: "开发者买 Agent"的核心动机
- **E**stimable: 5-7 人天
- **S**mall: 一次一个 bug
- **T**estable: 已知 bug repo + 预期 diff + 通过测试

### US-3: 配置文件与规则控制

作为开源项目维护者，我可以在项目根目录放一个 `CLAUDE.md`（或 `.superagent/` 目录），定义项目专属的代码规则、禁用的工具和自动批准的权限模式。团队成员 clone 后 Agent 自动遵守这些规则。

- **I**ndependent: 依赖文件系统和配置加载
- **N**egotiable: 规则复杂度从"只有 style guide"到"完整定制"
- **V**aluable: 团队一致性的前提
- **E**stimable: 3-4 人天
- **S**mall: 一个配置文件格式 + 一个加载器
- **T**estable: 不同配置 → 不同 Agent 行为的场景测试

### US-4: 交互式权限控制

作为开发者，当 Agent 要执行危险操作时必须看到警告和确认提示。我可以对常用操作模式设置白名单自动批准，让 Agent 在安全边界内高效工作。

- **I**ndependent: 在工具调度层挂载
- **N**egotiable: 三级 vs 五级、模式匹配 vs 正则
- **V**aluable: 安全是"敢用"的前提
- **E**stimable: 3-5 人天
- **S**mall: 工具调用前的一个拦截层
- **T**estable: 危险命令列表 → 预期行为矩阵

---

## 5. 功能列表与范围

### 5.1 In-Scope (MVP v1.0)

#### Must（MVP 不做完不能发布）

| ID | 功能 | 一句话描述 | 关联故事 | 优先级 |
|----|------|-----------|---------|:---:|
| F1 | Agent Core Runtime | while-loop + State Machine + 流式输出的消息循环 | US-1, US-2 | P0 |
| F2 | 8 个内置工具 | Read/Write/Edit/Bash/Grep/Glob/Task/WebSearch | US-1, US-2 | P0 |
| F3 | 工具智能分区调度 | 并发只读工具 / 串行写入工具 | US-1, US-2 | P0 |
| F4 | 上下文分层拼装 + Auto Compact | 静态前缀 + 动态注入 + 溢出自动压缩 | US-1, US-2 | P0 |
| F5 | 三级权限系统 + 危险命令黑名单 | auto-approve / ask / deny 三级 + 模式匹配 | US-4 | P0 |
| F6 | 模型两层 Fallback | V4 Pro → V4 Flash 自动切换 | US-1, US-2 | P0 |
| F7 | CLI REPL + Diff 预览 + 流式输出 | 终端输入框 + 文件修改 diff 展示 + 实时文本流 | US-2 | P0 |
| F8 | 分层 JSON 配置系统 | 全局 → 项目 → 环境变量三层覆盖 | US-3 | P0 |
| F9 | 会话持久化 | SQLite 自动保存 + --resume 恢复 | US-1, US-2 | P0 |
| F10 | 结构化日志 + 成本追踪 | JSON log + Session/Turn/Token 三级成本 | ALL | P0 |

#### Should（MVP 有，实在赶不上可延后）

| ID | 功能 | 一句话描述 | 关联故事 |
|----|------|-----------|---------|
| F11 | 显式 Todo List | 参考 Claude Code Task 系统，可视化任务进度 | US-1, US-2 |
| F12 | CLAUDE.md 规则加载 | 项目根目录 Markdown 规则文件自动注入 System Prompt | US-3 |
| F13 | 权限模式匹配白名单 | 正则匹配自动批准（如 `Read:*` 全部自动批准） | US-4 |
| F14 | --verbose 调试模式 | 打印完整 Model Request/Response | ALL |
| F15 | Edit 精确字符串替换工具 | 非 Write 的全量覆盖，而是精确 diff 替换 | US-2 |
| F16 | WebSearch 工具 | 搜索最新文档/API 参考（API 调用，非浏览器） | US-1, US-2 |
| F17 | Session 结束摘要 | 变更文件列表 + 工具调用统计 + 总耗时 + 总费用 | ALL |

#### Could（有更好，延后无痛）

| ID | 功能 | 一句话描述 |
|----|------|-----------|
| F18 | /plan 命令 | Plan-and-Execute 模式，先出计划批准后执行 |
| F19 | Task 子任务系统完整实现 | 创建/更新/完成子任务，面板内拖拽 |
| F20 | Token 精确估算 | 模型未返回 usage 时的 fallback 估算 |

### 5.2 Out-of-Scope (MVP v1.0 不做)

| 不做的事 | 目标阶段 |
|----------|---------|
| 多 Agent 协作（Orchestrator + Worker） | P1 |
| MCP Server 集成（stdio + Streamable HTTP） | P1 |
| Playwright 浏览器工具 | P1 |
| Hooks 系统完整实现 | P1 |
| Docker 沙箱 | P1 |
| Computer Use / 桌面控制 | P2 |
| 消息平台集成（微信/钉钉/Slack） | 阶段 2 |
| IDE 插件（VS Code / JetBrains） | 阶段 3 |
| Desktop App (Tauri) | 阶段 3 |
| 插件市场 / 发布系统 | Won't |
| 云端沙箱 | Won't |
| 多语言 i18n | Won't |
| 语音输入/输出 | Won't |

### 5.3 优先级定义

- **P0 (Must)**: MVP 不做完不能发布——缺了它用户无法完成核心闭环
- **P1 (Should)**: 显著提升体验，但 P0 能跑通核心链路
- **P2 (Could)**: 锦上添花，延后无用户感知影响

---

## 6. 详细功能描述

### F1: Agent Core Runtime

**触发**: 用户在 REPL 输入消息并按 Enter，或 Agent 从工具结果返回后自动继续

**核心流程**:
1. 用户输入 → 拼装上下文（System Prompt + 对话历史 + 工具结果）
2. 发送给模型 → AsyncGenerator 流式接收 token
3. 解析响应：文本输出（直接流到终端）vs 工具调用（进入调度器）
4. 工具执行 → 结果注入上下文 → 回到步骤 2（while-loop）
5. 遇到 stop_reason 或 maxTurns → 结束 turn，输出摘要

**输出**:
- 流式文本 tokens → 终端实时渲染
- 工具调用请求 → 调度器（F3）
- Turn 结束信号 → 会话保存（F9）

**边界条件**:
- 模型返回空响应 → 自动重试 1 次，仍空则终止并提示用户
- 单 turn 超时 (120s, 可配置) → 走 fallback 模型重试
- maxTurns 耗尽 → 输出"已达最大轮次"，保存状态，展示完成/未完成项
- 用户 Ctrl+C → 当前工具立即终止，保存状态，提示可 --resume
- AsyncGenerator 异常 → 捕获后输出最后已知状态，写 error log，不静默退出

**性能要求**: TTFB ≤ 2s | 流式输出 ≥ 30 tokens/s

---

### F2: 8 个内置工具

#### Read — 读文件

| 项 | 内容 |
|----|------|
| 触发 | 模型请求读取文件内容 |
| 输入 | `file_path` (必填), `offset` (选填), `limit` (选填) |
| 输出 | 文件内容 + 行号 |
| 文件不存在 | 返回 "File not found: {path}"，不猜测 |
| 读取目录 | 返回目录文件列表（≤ 100 个），超过截断 |
| 文件 > 1MB | 返回前 2000 行 + 提示使用 offset/limit |

#### Write — 写/覆盖文件

| 项 | 内容 |
|----|------|
| 触发 | 模型请求写入/覆盖文件 |
| 输入 | `file_path` (必填), `content` (必填) |
| 输出 | 文件大小 + 写入行数 |
| 父目录不存在 | 返回错误，不自动创建（安全考虑） |
| 文件已存在 | 先展示 Read 原内容，再在 diff 中对比 |

#### Edit — 精确字符串替换

| 项 | 内容 |
|----|------|
| 触发 | 模型请求精确替换文件片段 |
| 输入 | `file_path`, `old_string`, `new_string`, `replace_all` (选填) |
| 输出 | 替换位置行号 + 变更行数 |
| old_string 匹配不到 | 返回错误 + 建议用 Read 确认当前内容 |
| old_string 多处匹配 | 返回错误 + 所有匹配位置，要求更多上下文 |

#### Bash — 执行 Shell 命令

| 项 | 内容 |
|----|------|
| 触发 | 模型请求执行系统命令 |
| 输入 | `command` (必填) |
| 输出 | stdout + stderr + exit code |
| 执行时间 > 120s | 终止进程，返回已产生部分 |
| 非 0 退出码 | 返回完整输出 + exit code |
| 被 deny | 返回 "Permission denied by user" |
| 危险模式 | `rm -rf /`, `curl | bash`, `eval`, `sudo` 等默认拦截 |

#### Grep — 正则搜索

| 项 | 内容 |
|----|------|
| 触发 | 模型请求搜索代码 |
| 输入 | `pattern` (必填), `path` (选填), `glob` (选填) |
| 输出 | 匹配文件路径 + 行号 + 内容 |
| 无匹配 | "No matches found" |
| 正则语法错误 | 返回错误位置 + 修正建议 |

#### Glob — 文件模式匹配

| 项 | 内容 |
|----|------|
| 触发 | 模型请求查找文件 |
| 输入 | `pattern` (必填), `path` (选填) |
| 输出 | 匹配文件路径列表（按修改时间排序） |
| 无匹配 | "No files matched" |

#### Task — 子任务管理

| 项 | 内容 |
|----|------|
| 触发 | 模型请求创建/更新子任务 |
| 输入 | `subject`, `description`, `status` |
| 输出 | 当前 Todo 列表状态 |
| 子任务 > 20 | 警告"任务过多，建议合并" |

#### WebSearch — 网络搜索

| 项 | 内容 |
|----|------|
| 触发 | 模型请求搜索最新信息 |
| 输入 | `query` (必填) |
| 输出 | 搜索结果摘要（标题 + URL + 片段） |
| API 超时/不可用 | 静默返回空 + 标注"搜索暂时不可用" |
| 结果 > 50KB | 截断 + 提示 |

---

### F3: 工具智能分区调度

**触发**: Agent Runtime 解析到工具调用请求列表

**核心流程**:
1. 接收工具调用列表 → 按 `isConcurrencySafe()` 分区
2. 只读工具 (Read/Grep/Glob) → 并发执行，最大并行数 5
3. 写入工具 (Write/Edit/Bash) → 串行队列，按声明顺序执行
4. 每工具执行结果 → 裁剪（防止撑爆上下文）→ 返回 Runtime

**边界条件**:
- 并发只读工具任一失败 → 不影响其他，失败结果标注 error
- 串行队列前一个失败 → 后续写入终止，已成功的保留
- 同文件并发写入冲突 → 串行化保证不冲突
- 模型请求 10+ 个工具 → 只执行前 8 个，其余标注 skipped

**性能要求**: 工具调用启动延迟 ≤ 200ms | 并发工具 ≥ 3 个真正并行

---

### F4: 上下文分层拼装 + Auto Compact

**触发**: 每次模型调用前拼装上下文 / 上下文窗口剩余 < 20% 时自动触发压缩

**核心流程**:
1. 拼装：静态 System Prompt（缓存稳定）→ CLAUDE.md 规则 → 工具定义 → 对话历史 → 当前消息
2. 监控：每次 API 调用后检查 token usage
3. 剩余 < 20% → Auto Compact：压缩历史消息为结构化摘要
4. 压缩后仍溢出 → 删除最老非系统消息，每批 10 条

**边界条件**:
- CLAUDE.md 不存在 → 静默跳过
- Token 计数不可用 → 用字符/4 估算，标注 "estimated"
- 压缩延迟 ≤ 3s（100 轮历史）| 触发到恢复 ≤ 5s

---

### F5: 三级权限系统

**触发**: 工具调度器准备执行任何一个工具调用

**核心流程**:
1. 检查 deny 规则 → 匹配则直接拒绝
2. 检查 auto-approve 规则 → 匹配则直接执行
3. 都不匹配 → 弹出 ask 交互（终端内 Yes/No/Always）
4. 超时 30s 无响应 → 自动 deny

**边界条件**:
- 权限规则冲突（auto-approve 和 deny 同时匹配）→ deny 优先
- 危险命令黑名单（`rm -rf /`, `curl | bash`, `eval`, `sudo`, `git push --force`）→ 即使规则允许也额外 warning + ask
- API Key 泄露防护 → 日志输出前 regex 过滤 `sk-` / `api_key=` 模式

**安全目标**: 危险命令拦截率 = 100% | API Key 脱敏率 = 100% | 代码不上传第三方 = 0 泄漏

---

### F6: 模型两层 Fallback

**触发**: 每次模型 API 调用

**核心流程**:
1. 请求 V4 Pro → 成功则返回
2. 超时/5xx/429 → 等待/重试（最多 1 次）
3. 仍失败 → 自动切换 V4 Flash
4. V4 Flash 也失败 → 提示用户检查网络/API Key，保存会话

**边界条件**:
- 429 限流 → 等待 Retry-After 秒数，最多 3 次
- 5xx → 等 2s 重试，仍失败走 fallback
- 全部不可用 → 不无限重试，提示用户并保存
- 切换延迟 ≤ 3s

**性能要求**: 模型 API 可用率（二层 fallback 后）≥ 99%

---

### F7: CLI REPL + Diff 预览 + 流式输出

**触发**: 用户启动 `superagent` 命令

**核心流程**:
1. 启动 → 加载配置 → 初始化 Agent Runtime → 显示 READY 提示
2. 用户输入消息 → 流式输出模型回复文本（实时 token 渲染）
3. 遇到工具调用 → 显示调用摘要（如 "[Read] src/file.ts"）
4. Write/Edit 执行前 → 展示终端 diff（+, - 行）
5. 权限 ask 时 → 终端颜色高亮 + 等待键盘输入

**边界条件**:
- 启动时间 ≤ 500ms（到 REPL 就绪）
- 80 列终端输出不换行/不错位
- 权限审批超时 30s → 自动 deny

---

### F8: 分层 JSON 配置系统

**触发**: Agent 启动时加载

**核心流程**:
1. 加载默认值（内置）
2. 合并 `~/.superagent/settings.json`（全局）
3. 合并 `.superagent/settings.json`（项目）
4. 合并环境变量（`SUPERAGENT_*`）
5. 后加载的覆盖先加载的（项目 > 全局 > 默认）

**关键配置项**: API Key、Base URL、Model 选择、maxTurns (默认 50)、权限规则、CLAUDE.md 路径

**边界条件**:
- JSON 语法错误 → 明确指出错误行号 + "使用默认配置"，不静默
- 无配置文件 → 正常启动，使用默认值
- API Key 缺失 → 启动时提示配置

---

### F9: 会话持久化

**触发**: 每次 turn 结束后自动保存，用户 Ctrl+C 时紧急保存

**核心流程**:
1. 每次 turn 结束 → 序列化消息列表 + 工具执行记录 → 写 SQLite
2. 存储 checkpoint：上次已完成 turn 的完整状态
3. `--resume` 启动 → 读最近 checkpoint → 恢复会话

**边界条件**:
- SQLite 写入失败（磁盘满）→ 警告 + 降级为内存模式，本次会话结果正常交付
- 保存成功率 ≥ 99.9%
- --resume 恢复成功率 ≥ 95%
- 会话加载 ≤ 1s

---

### F10: 结构化日志 + 成本追踪

**触发**: 全链路自动记录

**核心流程**:
1. 每次 turn: 记录 turn_id, 输入 token 数, 输出 token 数, 耗时, 模型名
2. 每次工具调用: 记录工具名, 参数摘要, 耗时, 成功/失败
3. 实时成本换算: token × 模型单价 → $
4. 会话结束: 输出总摘要（变更文件 + 工具统计 + 总耗时 + 总费用）

**边界条件**:
- 日志文件 > 50MB → 轮转，保留最近 3 个
- 模型价格未配置 → 标注 "Unknown"
- --verbose 模式下 → API Key 脱敏（显示前 4 后 4）
- 单文件磁盘 ≤ 100MB/会话

---

## 7. 非功能需求

### 7.1 性能

| 指标 | 目标值 |
|------|--------|
| TTFB（首次响应延迟） | ≤ 2s |
| 流式输出速率 | ≥ 30 tokens/s |
| 上下文压缩延迟（100 轮） | ≤ 3s |
| Auto Compact 触发到恢复 | ≤ 5s |
| 会话加载（--resume） | ≤ 1s |
| 工具调用启动延迟 | ≤ 200ms |
| 启动时间（CLI 到 REPL 就绪） | ≤ 500ms |
| Fallback 切换延迟 | ≤ 3s |

### 7.2 可用性

| 指标 | 目标值 |
|------|--------|
| 模型 API 可用率（二层 fallback 后） | ≥ 99% |
| 会话崩溃率 | ≤ 1 次/100 次会话 |
| --resume 恢复成功率 | ≥ 95% |
| 权限审批超时 | 30s（无响应 = 自动 deny） |
| 80 列终端输出 | 不换行/不错位 |

### 7.3 资源消耗

| 指标 | 目标值 |
|------|--------|
| 空闲内存 | ≤ 150MB（REPL 等待输入时） |
| 峰值内存 | ≤ 500MB（200 turns 后） |
| 磁盘占用 | ≤ 100MB/会话（SQLite + 日志） |
| 启动时间 | ≤ 500ms |
| 单次 API 调用带宽 | ≤ 500KB |

### 7.4 安全

| 指标 | 目标值 |
|------|--------|
| 危险命令拦截率 | 100%（黑名单命令不可能 auto-approve） |
| API Key 日志脱敏率 | 100%（`sk-` / `api_key=` 模式绝不出现于日志） |
| 网络外传代码 | 0（代码/文件内容永远不发给第三方非模型 Provider 服务器） |

### 7.5 成本

| 指标 | 目标值 |
|------|--------|
| 单次 Bug Fix 成本 | ≤ $0.05 |
| 月成本 / 日常使用 | ≤ $5（日均 50 次调用） |
| 模型成本占 Claude Code 比例 | ≤ 10% |

### 7.6 合规

- 数据全本地存储，不上传代码到第三方
- MCP 仅通过 localhost/stdio
- MIT 开源协议，无专利/许可风险
- 无数据出境问题（DeepSeek API 国内直连）

---

## 8. UI / 交互说明

**注**: MVP 是 CLI 终端应用，非 GUI。本章描述终端内交互模式。

### 8.1 信息架构

```
superagent (CLI entry)
├── REPL 输入区（用户输入消息）
├── 消息流渲染区（AI 文本 + 工具调用摘要）
│   ├── 流式文本（实时 token）
│   ├── 工具调用 Card（工具名 + 参数 + 状态）
│   └── 错误/警告消息
├── Diff 预览区（Write/Edit 前弹出）
├── 权限审批区（Yes/No/Always 交互）
└── Todo 面板（侧边，当前任务进度）
```

### 8.2 关键交互流程

**Bug 修复流程**:
```
用户描述 bug → 流式显示 Agent 思考 → [Grep] 搜索相关代码 →
[Read] 读取文件 → Agent 分析根因 → 展示 diff 预览 →
[Ask] "批准此修改?" → 用户 Yes → [Write] 写入文件 →
[Bash] 运行测试 → 展示结果 → 完成摘要
```

**权限交互流程**:
```
Agent: [Bash] rm -rf ./build
终端: ⚠️  DANGER: rm -rf ./build  [Y]es [N]o [A]lways allow this pattern
用户: N
Agent: 已取消。需要我换种方式清理构建产物吗？
```

---

## 9. 验收标准

### US-1: 代码理解与依赖分析

**AC1.1: 跨文件调用链追踪**
> **Given** 一个包含 3+ 文件的多模块项目，用户输入"分析 `src/api/users.ts` 的 `createUser` 函数的完整调用链"
> **When** Agent 执行 Read + Grep 工具组合
> **Then** 输出包含：① 所有调用者文件+行号 ② 被调用者列表 ③ 数据流方向标注。每个结论附带引用位置，不存在"我猜"或"可能"。

**AC1.2: 不存在的代码不应编造**
> **Given** 用户询问一个不存在的文件或函数
> **When** Agent 用 Glob/Grep 搜索无结果
> **Then** 明确回复"未找到 {target}"，不编造任何代码路径或文件名。

**AC1.3: 大文件范围分析**
> **Given** 用户要求分析的函数所在文件 > 2000 行
> **When** Agent 先用 Grep 定位函数位置，再用 Read offset/limit 精确读取片段
> **Then** 分析结果基于真实读取的代码行，不对未读取部分做推测。

### US-2: Bug 修复闭环

**AC2.1: 完整修复闭环 (Golden Path)**
> **Given** 一个包含已知 bug 的测试项目（如空指针/类型错误/逻辑反转），附带失败测试
> **When** 用户描述 bug 症状 + 错误日志
> **Then** ① diff 包含 ≤ 3 个文件的修改 ② 所有相关测试通过 ③ 没有引入新 lint 错误 ④ Agent 输出修改摘要。

**AC2.2: 定位失败时主动承认**
> **Given** bug 描述模糊且错误日志不完整
> **When** Agent 搜索后无法定位根因
> **Then** 明确说"我无法定位根因"，列出已检查位置和需要补充的信息，不随意修改代码。

**AC2.3: 修复被拒绝后不残留变更**
> **Given** Agent 提出了一个修复方案
> **When** 用户拒绝
> **Then** 不写入任何文件。Agent 询问"需要我尝试不同的修复方式吗？"

**AC2.4: 破坏性修复被拦截**
> **Given** Agent 修复方案涉及 5+ 个文件的修改
> **When** 修改范围超过 3 个文件预期
> **Then** Agent 先展示修改范围概述 + 风险评估，再等用户批准。不允许静默大面积修改。

### US-3: 配置文件与规则控制

**AC3.1: CLAUDE.md 规则生效**
> **Given** 项目根目录存在 `CLAUDE.md` 包含 `You must use 4 spaces for indentation`
> **When** Agent 执行 Write/Edit 输出代码
> **Then** 生成代码使用 4 空格缩进。

**AC3.2: 多层配置覆盖**
> **Given** 全局 settings `maxTurns: 30`，项目 settings `maxTurns: 50`
> **When** Agent 在项目目录内启动
> **Then** maxTurns 实际值为 50（项目 > 全局 > 默认）。

**AC3.3: 配置文件语法错误不静默**
> **Given** settings.json 包含 JSON 语法错误
> **When** Agent 启动
> **Then** 输出明确错误行号 + "配置文件解析失败，使用默认配置"。

**AC3.4: 无配置文件正常启动**
> **Given** 项目目录下不存在任何配置文件
> **When** Agent 启动
> **Then** 正常进入 REPL，不报错。

### US-4: 交互式权限控制

**AC4.1: 危险命令触发拦截**
> **Given** Agent 尝试执行 `rm -rf /some/dir`
> **When** 命令匹配黑名单模式
> **Then** 终端显示警告 + 命令完整内容 + Yes/No/Always 选项。

**AC4.2: 自动批准模式生效**
> **Given** settings 配置 `autoApprove: ["Read", "Grep", "Glob"]`
> **When** Agent 调用 Read 工具
> **Then** 无需交互直接执行，日志记录 `[AUTO-APPROVE] Read: file.ts`。

**AC4.3: Deny 规则优先**
> **Given** autoApprove 包含 `Bash:*` 但 deny 包含 `Bash:rm *`
> **When** Agent 尝试执行 `rm file.txt`
> **Then** 触发 ask 模式（deny 匹配优先于 auto-approve）。

**AC4.4: 超时默认 Deny**
> **Given** Agent 弹出审批提示
> **When** 用户在 30 秒内无响应
> **Then** 自动拒绝，Agent 收到 "Permission denied (timeout)"。

### NFR 验收

**AC-NFR-01: TTFB 性能**
> **Given** 用户输入消息并按 Enter
> **When** 消息被处理并发送给模型
> **Then** 第一个 token 出现在终端 ≤ 2s。

**AC-NFR-02: 会话稳定性**
> **Given** Agent 已运行 50+ 轮对话
> **When** 用户请求执行复杂多步任务
> **Then** Agent 不掉上下文、不重复已完成操作、不出错信息遗漏。

---

## 10. 优先级 / MVP 范围

### 10.1 MVP 范围 (v1.0)

**10 个 Must 功能**（其他都暂缓）:
1. F1 Agent Core Runtime
2. F2 8 个内置工具
3. F3 工具智能分区调度
4. F4 上下文管理 + Auto Compact
5. F5 三级权限系统
6. F6 模型两层 Fallback
7. F7 CLI REPL + Diff + 流式输出
8. F8 分层配置系统
9. F9 会话持久化 + --resume
10. F10 日志 + 成本追踪

### 10.2 依赖链（Must 内部开发顺序）

```
F1 (Core Loop) ───────────── 第一步
 ├─ F2 (内置工具)
 │   └─ F3 (工具调度) ───── 依赖 F2
 ├─ F4 (上下文管理) ─────── 可与 F1 并行
 ├─ F5 (权限系统) ───────── 挂 F3，先于 F2 写操作上线
 ├─ F8 (配置系统) ───────── 独立，第一时间开发
 ├─ F6 (两层 Fallback) ──── 挂 F1 Model Adapter
 ├─ F9 (会话持久化) ─────── 依赖 F1 有状态可保存
 └─ F10 (日志+成本) ─────── 贯穿，与其他同步
```

### 10.3 MVP 验证假设

通过 MVP 要验证：
- **假设 1**: 独立开发者愿意为 1/17 成本切换终端 Agent 工具
- **假设 2**: 模型两层 Fallback 在真实场景下可用率 ≥ 99%
- **假设 3**: CLI-only 形态在国内开发者的接受度足够（无需 IDE 插件）

### 10.4 v1.1 计划（MVP 之后）

- MCP Server 集成（社区工具即插即用）
- Playwright 浏览器工具
- Hooks 系统完整实现
- Docker 沙箱

---

## 11. 度量指标

### 11.1 北极星指标

**首次成功修复率 (First Fix Success Rate)**

> 用户描述 bug → Agent 定位 → 修复 → 测试通过，整个链路一次性走通的比例。
>
> **分子**: 用户确认修复成功的会话数
> **分母**: 用户要求 Agent 修复 bug 的总会话数
>
> **MVP 目标**: ≥ 50% | **P1 目标**: ≥ 75%

### 11.2 辅助指标

| 指标 | MVP 目标 | 用途 |
|------|---------|------|
| NPS-lite（单次会话 1-5 分评价） | ≥ 3.5 平均分 | 每次会话结束后一行提示 |
| 周活跃会话数 | 先定基线（发布 4 周后） | 判断有人用 |
| 平均单次会话轮数 | ≥ 15 轮 | < 15 轮说明 Agent 没做事就停了 |

### 11.3 反指标

| 反指标 | 阈值 | 说明 |
|--------|------|------|
| 权限审批全部 auto-approve | 不允许 | 发现即改——安全底线 |
| 单用户日均会话 < 1 | 发布 4 周后关注 | 说明没黏性 |
| Token 消耗中 fallback 模型 > 50% | 检查主模型可用性 | 说明 V4 Pro 没选对或不可用 |

### 11.4 关停线

如果 MVP 发布 **3 个月**后，同时满足以下**任意两条**，则重新评估方向或 pivot：

1. **周活跃用户 < 20**（无 traction）
2. **首次成功修复率 < 30%**（产品不 work）
3. **核心用户访谈 5 人中 ≥ 3 人说"我用回 Copilot/Cursor 了"**

单条不触发关停。

---

## 12. 依赖与约束

### 12.1 外部依赖

| 依赖项 | 提供方 | 影响范围 | 风险等级 |
|--------|--------|---------|:---:|
| DeepSeek V4 Pro API | DeepSeek | 全部 Agent 能力 | 高 |
| DeepSeek V4 Flash API (fallback) | DeepSeek | 故障时可用性 | 中 |
| V4 Pro 定价策略 | DeepSeek | 成本结构（促销价可能涨） | 中 |
| WebSearch API | 待定 | Should 功能，非核心链路 | 低 |
| npm 包名 `superagent` 已被占用 | npm registry | 需确认可用包名 | 中 |

### 12.2 技术约束

| 约束 | 说明 |
|------|------|
| 运行时环境 | Unix-like (macOS/Linux) 为主，Windows Git Bash 不保证 |
| 网络要求 | 需访问 DeepSeek API（国内直连，无需代理） |
| 本地存储 | SQLite 本地文件，无分布式/云端同步 |

### 12.3 资源约束

| 约束 | 说明 |
|------|------|
| 开发人力 | 单人开发，37 人天 P0 最小集（~6-7 周） |
| API 预算 | 开发期间月 ≤ $60（V4 Pro 主力，日均 500 次调用估算） |
| 测试覆盖 | 无多平台硬件矩阵，仅 macOS/Linux |

### 12.4 合规约束

- 国内 ICP 备案：MVP 无 Web 服务，不触发备案
- 模型数据合规：DeepSeek API 国内直连，无数据出境
- MIT 协议无专利/许可风险
- 包名确认：需找到未被占用的 npm 包名（`superagent` 已被 HTTP 库占用）

---

## 13. 风险与开放问题

### 13.1 风险登记

| ID | 风险 | 严重 | 概率 | 对策 |
|----|------|:--:|:--:|------|
| R-01 | DeepSeek V4 Pro 促销价结束涨价 | 高 | 中 | 月度定价追踪；架构支持快速增加新 Provider |
| R-02 | DeepSeek Tokenizer 多消耗 30-50% token | 中 | 中 | 第一行代码实测；基于实际成本调整营销话术 |
| R-03 | DeepSeek API 服务不可用 | 高 | 低 | 两层 Fallback 自动切换；未来可加第三个 Provider |
| R-04 | CLI-only 国内接受度低于预期 | 中 | 中 | 发布前做 5 人终端使用习惯访谈；影响 P1 优先级 |
| R-05 | 开源社区冷启动困难 | 中 | 高 | MIT 协议降低门槛，不靠品牌靠成本数字 |
| R-06 | Agent 自信改错但用户未发现 | 高 | 低 | 默认 deny Bash、必须人工批准写入、diff 预览 |
| R-07 | Prompt Cache 命中率低导致成本超预期 | 中 | 中 | 严格 System Prompt 前缀稳定性；cache hit rate 监控 |
| R-08 | 会话超长（> 200 turns）渲染性能下降 | 中 | 低 | 虚拟滚动、增量渲染；参考 Claude Code 优化策略 |

### 13.2 开放问题

- [ ] **OQ-01**: DeepSeek V4 Pro Tokenizer 实际 token 膨胀率 vs Anthropic？——实测验证，影响"成本差 17 倍"话术
- [ ] **OQ-02**: CLI-only 在国内独立开发者中的实际接受度？——发布前 5 人终端使用习惯半结构化访谈
- [ ] **OQ-03**: MIT 协议 + 个人开发者品牌冷启动，如何获得第一个外部 Issue/PR？——发布后 4 周观察
- [ ] **OQ-04**: 当"全能 Agent"名号被用户误解（预期 desktop/computer use 但 MVP 只有代码）时的 messaging 策略？——README 第一屏明确说明
- [ ] **OQ-05**: npm 包名 `superagent` 已占用，替代包名方案？——`@superagent/cli` vs 另起名
- [ ] **OQ-06**: DeepSeek V3/R1 将于 2026-07-24 废弃，V4 长期定价何时公布？

### 13.3 决策记录

- **DR-01**: 技术栈选型 —— TypeScript/Bun + Ink TUI。裁决依据：05-决策汇总.md（Claude Code/OpenClaw/Codex 三个最成功 Agent 均 TS）
- **DR-02**: 模型策略 —— V4 Pro 主力 + V4 Flash 兜底。裁决依据：brainstorming Q2 用户选择成本优先
- **DR-03**: 开源协议 —— MIT。裁决依据：brainstorming Q4 用户选择最大化社区采用
- **DR-04**: 多 Agent 时机 —— MVP 不实现，架构预留 AgentTool 接口。裁决依据：05-决策汇总
- **DR-05**: Harness 完成度 —— MVP 做 6 层（上下文/工具调度/任务规划/可观测/错误处理/安全）。裁决依据：brainstorming Q2
- **DR-06**: MVP 首要场景 —— 纯代码助手，不掺桌面和网页。裁决依据：brainstorming Q1

---

## 14. 里程碑

### 14.1 关键节点

| 里程碑 | 目标日期 | 交付物 |
|--------|---------|--------|
| M1 PRD Approved | 2026-06-12 | 本文档 v1.0 |
| M2 技术方案完成 (TRD) | 2026-06-16 | TRD + 架构图 |
| M3 P0 开发完成 | 2026-07-25 | 可演示 CLI Agent（10 个 Must 功能） |
| M4 内部测试 | 2026-07-30 | 对 3 个真实开源项目成功提交 fix PR |
| M5 公开发布 | 2026-08-01 | GitHub + npm 发布 |

### 14.2 6 周节奏

| 周 | 内容 |
|----|------|
| 第 1 周 | F1 Core Loop + F8 配置系统（最小可跑 REPL） |
| 第 2 周 | F2 内置工具（Read/Write/Bash/Grep/Glob） |
| 第 3 周 | F3 工具调度 + F5 权限系统 |
| 第 4 周 | F4 上下文管理 + Auto Compact + F6 Fallback |
| 第 5 周 | F9 会话持久化 + F10 日志/成本 + F7 CLI 完善 |
| 第 6 周 | 集成测试 + 3 个真实项目验证 + Bug 修复 |

### 14.3 风险缓冲

预留 1 周 buffer（2026-08-01 ~ 08-08），应对：
- DeepSeek API 实测 token 膨胀超预期导致调度逻辑调整
- 权限/安全逻辑在真实代码库上发现的漏报/误报

---

## 下一步

本 PRD 已完成。按 5 段链路推进：

```
✅ 调研 (5 份 specs/research/)  →  ✅ Brainstorming (11 问)  →  ✅ PRD (本文件)
→ ⏳ TRD / 技术方案设计  →  ⏳ Spec-Kit /plan → /tasks → /implement
```

- 使用 Spec-kit `/speckit.plan` 命令基于本 PRD 生成技术方案 (plan.md)
- 或者使用 writing-plans skill 生成实现计划
- 关注点：架构 / 上下文管理 / 工具调度 / 权限系统的代码结构设计
- 每个 Must 功能拆条跑 `/speckit.specify → /speckit.plan → /speckit.tasks → /speckit.implement`

---

> **文档版本**: v1.0 | **最后更新**: 2026-06-12 | **状态**: Approved
