# Feature Specification: Web 服务启动

**Feature Branch**: `025-web-server-start`  
**Created**: 2026-06-18  
**Status**: Draft  
**Input**: 用户在终端运行 `superagent web` 命令，一键启动 Web 服务并自动打开浏览器。

---

## 1. What & Why

### 1.1 What

本 Feature 实现 `superagent web` 命令，让用户在项目目录下通过一条命令即可：
- 启动 Web UI 服务（默认端口 3456）
- 自动调用系统默认浏览器打开服务地址
- 在终端输出服务状态和访问日志

### 1.2 Why

SuperAgent CLI 形态虽然功能完整，但终端界面有天然限制：
- 纯文本代码阅读体验差
- 长输出滚动困难
- 缺少图形化 Diff 对比
- 并行工具进度展示不直观

通过 Web UI 可以大幅提升开发者交互体验，同时保留 CLI 的所有核心能力。

### 1.3 Goals

- 零配置启动：用户无需安装额外依赖，一条命令即可使用
- 本地优先：仅限 localhost 访问，不暴露到公网
- 体验流畅：服务启动后浏览器自动打开，无需手动输入地址

### 1.4 Non-Goals（明确不做）

- ❌ 不支持公网访问 / 远程部署
- ❌ 不做 HTTPS / SSL 证书
- ❌ 不做用户认证 / 登录
- ❌ 不支持多实例并发（单用户单会话）
- ❌ 不做 Docker 容器化部署

---

## 2. User Scenarios & Testing

### User Story 1 - 一键启动 Web 服务（Priority: P0）

As a developer, when I run `superagent web` in my project directory, the service starts automatically on port 3456 and my default browser opens to the Web UI.

**Why this priority**: 这是 Web UI 的入口功能，是所有其他 Web 功能的前置条件。

**Independent Test**: 编写集成测试，模拟命令执行，验证服务启动、端口监听、进程管理。

**Acceptance Scenarios**:

1. **Given** 用户已安装 superagent，**When** 运行 `superagent web`，**Then** 服务在 2 秒内启动，终端显示访问地址和 PID，浏览器自动打开 `http://localhost:3456`。
2. **Given** 3456 端口已被占用，**When** 运行 `superagent web`，**Then** 自动尝试 3457，依次递增，直到找到可用端口。
3. **Given** 服务正常运行中，**When** 用户按 Ctrl+C，**Then** 服务优雅关闭，所有子进程终止，终端返回到命令提示符。

---

### User Story 2 - 浏览器启动失败降级（Priority: P1）

As a developer, when the browser fails to open automatically, I see a clear message telling me to manually visit the URL.

**Why this priority**: 边缘场景但会严重影响用户体验，需要优雅降级。

**Independent Test**: 模拟浏览器启动失败环境，验证降级提示正确显示。

**Acceptance Scenarios**:

1. **Given** 无头环境或浏览器启动失败，**When** 服务启动完成，**Then** 终端显示清晰的手动访问提示，包含完整 URL。
2. **Given** 用户指定了自定义端口，**When** 服务启动，**Then** 浏览器打开用户指定的端口而非默认端口。

---

### User Story 3 - 服务状态与日志输出（Priority: P1）

As a developer, I want to see real-time service logs in my terminal so I can debug issues if the Web UI misbehaves.

**Why this priority**: 开发调试和问题排查必备。

**Independent Test**: 验证日志输出格式、级别过滤、错误信息清晰。

**Acceptance Scenarios**:

1. **Given** 服务运行中，**When** 有请求或错误发生，**Then** 终端输出带时间戳的日志，区分 INFO / WARN / ERROR 级别。
2. **Given** 服务启动过程中发生错误，**When** 依赖缺失或端口绑定失败，**Then** 显示具体错误原因和修复建议，进程正常退出。
3. **Given** 用户使用 `--verbose` 标志，**When** 服务运行，**Then** 输出更详细的调试日志（包括 Socket 事件、模型调用详情）。

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-WS-01 | CLI SHALL support a new `web` subcommand implemented in `src/cli/web.ts`. |
| FR-WS-02 | The command SHALL start an HTTP server on default port 3456. |
| FR-WS-03 | The command SHALL automatically open the system default browser to the service URL. |
| FR-WS-04 | Port auto-increment SHALL be implemented if 3456 is occupied, up to 10 attempts. After 10 failures, exit with code 1 and helpful message. |
| FR-WS-05 | Ctrl+C SHALL trigger graceful shutdown of server and all child processes within 1 second. |
| FR-WS-06 | Terminal SHALL display server status, access URL, and PID on startup. |
| FR-WS-07 | Terminal SHALL display real-time logs with timestamps and log levels, color-coded for readability. |
| FR-WS-08 | Browser open failure SHALL display manual access instructions as fallback. |
| FR-WS-09 | Custom port SHALL be supported via `--port` flag. |
| FR-WS-10 | Server SHALL bind only to `127.0.0.1` (localhost), NOT to `0.0.0.0` or public interfaces. |
| FR-WS-11 | Service startup time target SHALL be ≤ 2 seconds. |
| FR-WS-12 | `--verbose` flag SHALL enable detailed debug logging. |
| FR-WS-13 | `--no-open` flag SHALL disable automatic browser opening. |
| FR-WS-14 | Server SHALL implement `/api/health` endpoint returning { status: "ok", uptime: number }. |
| FR-WS-15 | Server SHALL include static file serving capability for subsequent Next.js integration. |
| FR-WS-16 | HTTP request timeout SHALL be 30 seconds, connection timeout 10 seconds. |
| FR-WS-17 | Request body size limit SHALL be 10MB by default. |
| FR-WS-18 | CORS policy SHALL allow only localhost same-origin requests, rejecting cross-domain calls. |
| FR-WS-19 | Error responses SHALL use consistent JSON format. |
| FR-WS-20 | Terminal log output SHALL buffer up to 1000 lines, scrolling thereafter. |

### 3.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-WS-01 | No additional npm dependencies beyond what's already used by the CLI. |
| NFR-WS-02 | Server must not crash on unhandled requests or invalid inputs. |
| NFR-WS-03 | Shutdown must complete within 1 second of Ctrl+C. |
| NFR-WS-04 | Log output must be color-coded for readability. |
| NFR-WS-05 | Must work cross-platform: macOS, Windows, Linux. |

### 3.3 Key Entities

- **WebServer**: 封装 HTTP 服务的启动、停止、端口管理
- **BrowserLauncher**: 跨平台浏览器启动逻辑，含失败降级
- **LogOutput**: 终端日志格式化输出，支持多级别和颜色
- **CommandArgs**: `web` 子命令的参数解析（--port, --verbose, --no-open）

### 3.4 Edge Cases

- 端口被占用 → 自动递增重试，最多尝试 10 次，超过则 exit code=1，提示"无法找到可用端口，请手动指定 --port"
- 浏览器启动失败 → 降级为手动访问提示，不影响服务运行
- 无头环境（CI / 服务器）→ 跳过浏览器打开，仅显示访问地址
- 强制终止（kill -9）→ 下次启动正常运行，无需手动清理（不写 PID 文件，靠操作系统进程管理）
- 同时运行多个 `superagent web` → 端口不同，互不干扰
- 网络断开（Socket 连接断开）→ 服务继续运行，支持客户端重连
- 大文件上传 / 下载 → 请求体限制 10MB，超过返回 413 Payload Too Large
- CORS 跨域请求 → 拒绝跨域调用，返回 403 Forbidden
- 请求超时 → 30 秒超时返回 504 Gateway Timeout
- 404 页面 → 返回统一 JSON 格式错误响应
- 日志缓冲区满 → 保留最近 1000 行，旧日志滚动丢弃

---

## 4. Feature Boundaries

### 4.1 MVP Scope

- ✅ `superagent web` 命令启动服务，代码位于 `src/cli/web.ts`
- ✅ 默认端口 3456，端口占用自动递增（最多 10 次），失败 exit code=1
- ✅ 浏览器自动打开，支持 `--no-open` 禁止自动打开
- ✅ Ctrl+C 优雅关闭，1 秒内完成所有子进程终止
- ✅ 终端彩色日志输出，带时间戳和级别，缓冲 1000 行
- ✅ 仅绑定 localhost (127.0.0.1)，禁止公网访问
- ✅ --port 自定义端口
- ✅ --verbose 调试日志
- ✅ /api/health 健康检查端点
- ✅ 静态文件服务（为后续 Next.js 准备）
- ✅ HTTP 超时设置：请求 30s，连接 10s
- ✅ 请求体大小限制 10MB
- ✅ CORS 同源策略，拒绝跨域请求
- ✅ 统一 JSON 格式错误响应

### 4.2 Out of Scope（本 Feature 不做，后续版本考虑）

- ❌ 配置文件持久化端口设置 → CLI flag 足够
- ❌ 多项目并行管理 → 单用户单项目为主
- ❌ 后台守护进程（--daemon）→ MVP 前台运行
- ❌ 热重载 / 自动重启 → MVP 手动重启即可
- ❌ 访问日志持久化到文件 → 终端输出足够
- ❌ 性能监控面板 → MVP 不需要
- ❌ REST API 文档 / Swagger → 内部使用不需要

---

## 5. Environment Constraints

### 5.1 Runtime Environment

- Node.js ≥ 18（与 CLI 保持一致）
- 支持平台：macOS, Windows, Linux
- 默认浏览器检测：各平台系统默认
- 终端环境：支持 ANSI 颜色输出

### 5.2 Integration Points

- 复用现有 CLI 的参数解析框架
- 复用现有 Config 系统读取设置
- 复用现有 Logger 系统
- 后续 feature 将在此基础上挂载 Socket.io 和 Next.js
