# SuperAgent · CLAUDE.md

> 模型自由、MIT 开源的 CLI 编码 Agent

## 1 · 项目是什么 (WHAT)

SuperAgent 是一个终端内的 AI 编码助手：读代码→理解→改 bug→跑测试→验证，全链路自主完成。入口是 CLI REPL（非 IDE 插件、非 Web），目标用户是独立开发者与开源维护者。核心理念：模型自由——默认走 DeepSeek V4 Pro（成本为 Claude Code 的 1/17），不绑定单一模型厂商。

完整业务需求见：@specs/prd.md

## 2 · 项目目的 (WHY)

Claude Code/OpenClaw/Codex 证明了 CLI Agent 可行，但都绑定高价国外模型且代码封闭。国内开发者要么月付 $200+，要么用只能聊天不能干活的国产工具。SuperAgent 用 DeepSeek 定价 + MIT 开源，把生产级编码 Agent 的月成本压到 $5 以内。

北极星指标：首次成功修复率（First Fix Success Rate）MVP ≥ 50%。
详细目标见：@specs/prd.md §2 / §11

## 3 · 开发工作流

每个 feature 跑 4 步文档循环，再写代码：

```
/speckit.specify → spec.md    (What & Why，禁止技术选型)
/speckit.clarify → 更新 spec   (扫描 MV P边界/API/数据/集成 4 类模糊点)
/speckit.plan    → plan.md    (文件结构+mermaid数据流+依赖+风险)
/speckit.tasks   → tasks.md   (12-16条任务，串行/并行分组标注)
```

- 启动 feature 前：读 `@specs/prd.md` 对应功能节 + `@specs/research/05-决策汇总.md`
- feature 跑完一轮完整 4 步 → 停下来确认 → 下一 feature
- tasks 每条标注 `[FR-X 来源] [依赖任务] [验证方式]`，可独立测试
- 测试纪律：每个模块写完立即跑单元测试，不要攒到 feature 末尾
- 节奏：先基础（config → runtime）→ 并行组同时铺 → 顺序组串联

## 4 · 技术栈

项目为 greenfield（无 package.json）。锁定决策见：@specs/research/05-决策汇总.md

| 层 | 决策 | 来源 |
|----|------|------|
| 语言/运行时 | TypeScript (strict) · Bun / Node.js 22+ | 05-决策汇总 §4.1 |
| CLI/TUI | Ink 5.x (React for terminal) | 05-决策汇总 §4.2 |
| AI SDK | @anthropic-ai/sdk + openai SDK | 05-决策汇总 §3.2 |
| Schema 校验 | zod | 05-决策汇总 §3.2 |
| 数据库 | better-sqlite3 (本地会话持久化) | 05-决策汇总 §3.2 |
| MCP | @modelcontextprotocol/sdk | 05-决策汇总 §3.2 |
| 日志 | pino (结构化 JSON) | 05-决策汇总 §3.2 |
| 终端 | node-pty (Bash tool PTY) | 05-决策汇总 §3.2 |
| 测试 | vitest | 05-决策汇总 §3.2 |
| 模型主力 | DeepSeek V4 Pro ($0.435/$0.87 per MTok) | 05-决策汇总 §2 |
| 模型兜底 | DeepSeek V4 Flash ($0.14/$0.28 per MTok) | 05-决策汇总 §2 |

M1 执行 `npm init` 后，由 /init 自动从 package.json 同步真实版本。

## 5 · 命令清单

待 M1 启动后从 package.json scripts 自动补全。预期骨架：

```bash
pnpm dev            # 开发模式（tsx watch）
pnpm build          # tsc 构建
pnpm test           # vitest 跑全部测试
pnpm test -- <path> # 跑单个测试文件
pnpm lint           # biome lint
pnpm typecheck      # tsc --noEmit
```

## 6 · Anti-Patterns（禁止）

- ❌ 不要在 /speckit.specify 阶段写技术选型——留给 /plan *(来源: 硬约束)*
- ❌ 不要让 Agent 静默大面积修改（>3 个文件）——必须先展示范围 + 等批准 *(来源: PRD AC2.4)*
- ❌ 不要自动创建目录/自动安装依赖——Bash/Write 默认 require ask *(来源: PRD §6-F5)*
- ❌ 不要跳过 /clarify——每个 spec 必须扫 MVP 边界/API/数据/集成 4 类模糊点 *(来源: 硬约束)*
- ❌ 不要让 .env/.credentials 进 git——API Key 脱敏率 100% *(来源: PRD §7.4)*
- ❌ 不要让危险命令 auto-approve——deny > auto-approve，黑名单不可覆盖 *(来源: PRD §6-F5)*
- ❌ 不要引入 PRD Out-of-Scope 能力（MCP/多Agent/浏览器/桌面控制） *(来源: PRD §5.2)*
- ❌ 不要在上下文压缩中丢失"修改了哪些文件"和"当前目标" *(来源: PRD AC-CTX-04)*

## 7 · Behavioral Guidelines (Karpathy-Inspired)

以下 4 条原则适用于全项目所有 task 实现期，目的是减少 AI 编码的常见失误。

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---
**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 8 · 关键文件导航

| 文件 | 作用 | 何时读 |
|------|------|--------|
| @specs/prd.md | 14 章产品需求文档 | 业务边界/优先级/验收标准不清时 |
| @specs/research/05-决策汇总.md | 技术选型基线裁决 | 引入新依赖/质疑技术方向时 |
| @specs/research/01-产品形态.md | 20 产品竞品分析 | 产品方向讨论时 |
| @specs/research/03-开源项目.md | 17 个开源项目盘点 | 引入开源方案时 |
| @specs/research/04-实现方案.md | 模块方案对比 + 成本估算 | 实现方案设计时 |
| specs/00X-<feature>/spec.md | feature What/Why + AC + 边界条件 | feature 开始前 |
| specs/00X-<feature>/plan.md | 文件结构 + 数据流 + 依赖 + 风险 | feature 开始前 |
| specs/00X-<feature>/tasks.md | 12-16 条可执行任务 | 写代码时逐条执行 |
| src/config/ | 001 配置系统 | 读配置相关 |
| src/runtime/ | 002 核心运行时 | Agent 主循环 |
| src/models/ | 003 模型 fallback | 模型 API 调用 |
| src/tools/ | 004 内置工具（8 个） | 工具实现 |
| src/scheduling/ | 005 工具调度 | 并发/串行执行 |
| src/permissions/ | 006 权限系统 | 三级权限拦截 |
| src/context/ | 007 上下文管理 | Prompt 拼装+压缩 |
| src/cli/ | 008 CLI REPL | 终端交互 |
| src/persistence/ | 009 会话持久化 | SQLite 存储 |
| src/observability/ | 010 可观测性 | 日志+成本追踪 |
