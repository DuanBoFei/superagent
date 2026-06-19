# Implementation Plan: Web 服务启动

**Feature**: 025-web-server-start  
**Based on**: spec.md  
**Status**: Draft  

---

## 1. Project File Structure

```
src/cli/
├── web.ts           # web 子命令入口，参数解析 + 服务启动流程 (NEW)
├── repl.ts          # 现有 REPL，增加 web 命令分支 (MODIFY)
└── input.ts         # 现有输入处理，无需修改

src/server/
├── index.ts         # HTTP 服务器核心封装 (NEW)
├── static.ts        # 静态文件服务中间件 (NEW)
├── health.ts        # /api/health 端点处理 (NEW)
└── logger.ts        # 终端日志格式化输出 (NEW)

src/utils/
└── browser.ts       # 跨平台浏览器启动 + 失败降级 (NEW)

tests/
├── cli/web.test.ts  # web 命令单元测试 (NEW)
└── server/
    ├── index.test.ts    # 服务器启动/关闭测试 (NEW)
    ├── health.test.ts   # 健康检查端点测试 (NEW)
    └── static.test.ts   # 静态文件服务测试 (NEW)
```

### 文件职责说明

| 文件 | 核心职责 |
|------|---------|
| `src/cli/web.ts` | `web` 子命令入口，解析 --port / --verbose / --no-open 参数，协调 Server + Browser + Logger |
| `src/cli/repl.ts` | 现有 REPL 入口，增加 `web` 命令分支判断，调用 web.ts |
| `src/server/index.ts` | WebServer 类封装：端口检测 + 递增重试 + 启动/关闭 + 超时设置 + CORS + 请求体限制 |
| `src/server/static.ts` | 静态文件服务中间件，为后续 Next.js 集成预留 |
| `src/server/health.ts` | /api/health 端点实现，返回 status + uptime |
| `src/server/logger.ts` | 彩色日志输出：INFO / WARN / ERROR / DEBUG 级别 + 时间戳 + 滚动缓冲 |
| `src/utils/browser.ts` | BrowserLauncher 类，跨平台启动默认浏览器，无头环境检测 + 失败降级 |

---

## 2. Data Flow

```mermaid
sequenceDiagram
    participant User as 用户终端
    participant CLI as src/cli/web.ts
    participant Server as src/server/index.ts
    participant Browser as src/utils/browser.ts
    participant Logger as src/server/logger.ts

    User->>CLI: superagent web [--port 3456] [--verbose] [--no-open]
    CLI->>CLI: 解析参数，设置默认值

    alt 端口检测循环
        loop 最多 10 次
            CLI->>Server: tryBind(port)
            alt 端口可用
                Server-->>CLI: success
                break
            else 端口占用
                Server-->>CLI: EADDRINUSE
                CLI->>CLI: port++
            end
        end
    end

    alt 10 次均失败
        CLI->>User: 输出错误 + exit(1)
    end

    CLI->>Server: start()
    Server->>Server: 配置超时(30s) + CORS + 请求体限制(10MB)
    Server->>Server: 挂载 /api/health + static 中间件
    Server->>Server: 监听 127.0.0.1:port
    Server-->>CLI: 启动成功，返回 { port, pid }

    par
        CLI->>Logger: 输出服务状态 + 访问地址 + PID
    and
        alt --no-open 未设置
            CLI->>Browser: open(url)
            alt 无头环境或启动失败
                Browser-->>CLI: failed
                CLI->>Logger: 输出手动访问提示
            else 启动成功
                Browser-->>CLI: success
            end
        end
    end

    Note over Server,Logger: 服务运行中...

    User->>Server: GET /api/health
    Server->>Logger: 记录请求日志
    Server-->>User: { status: "ok", uptime: ms }

    User->>Server: Ctrl+C (SIGINT)
    CLI->>Server: shutdown()
    Server->>Server: 关闭所有连接，1秒超时强制退出
    Server-->>CLI: closed
    CLI->>User: 输出再见消息 + exit(0)
```

---

## 3. Dependencies

### 3.1 Language & Runtime

- **Node.js**: ≥ 18.0.0（与项目现有要求一致）
- **TypeScript**: ~5.4（与项目现有版本一致）

### 3.2 Third-Party Libraries

**复用已有依赖（不新增）**：

| 库 | 用途 | 项目中已存在位置 |
|----|------|-----------------|
| `node:http` | Node.js 内置 HTTP 模块 | - |
| `node:child_process` | 内置，用于启动浏览器 | - |
| `node:process` | 内置，信号处理 + PID | - |
| `chalk` (或项目现有颜色库) | 终端彩色输出 | 查看 CLI 现有实现 |
| `commander` / `yargs` | CLI 参数解析 | 项目现有 CLI 已使用 |

**结论：本 Feature 零新增 npm 依赖，完全使用 Node.js 内置模块 + 项目已有依赖。**

---

## 4. Integration Points with Existing System

### 4.1 复用模块

| 复用点 | 现有模块 | 集成方式 |
|--------|---------|---------|
| CLI 参数解析框架 | `src/cli/repl.ts` / `src/cli/input.ts` | 在 repl.ts 中添加 `web` 命令分支，匹配到后调用 web.ts 的启动函数 |
| Config 系统 | `src/config/` | MVP 不深度集成，仅读取默认配置，端口等设置通过 CLI flag 传入 |
| Logger 系统 | `src/utils/logger.ts`（如果存在） | 复用现有 Logger 接口，如不存在则新建简化版 |
| 错误处理 | 现有 CLI 错误处理机制 | 统一错误格式和 exit code |

### 4.2 新建模块

| 模块 | 说明 | 对现有系统的影响 |
|------|------|-----------------|
| `WebServer` class | 新建于 `src/server/index.ts` | 独立封装，不影响现有 CLI 运行 |
| `BrowserLauncher` class | 新建于 `src/utils/browser.ts` | 纯工具函数，无副作用 |
| 静态文件服务 | `src/server/static.ts` | 为后续 Next.js feature 预留扩展点 |

### 4.3 扩展点设计

为后续 feature 挂载 Socket.io / Next.js 预留：

```typescript
// WebServer 类暴露扩展方法
class WebServer {
  // 获取原生 http server 实例，供后续 Socket.io 挂载
  getHttpServer(): http.Server;

  // 获取 Express app 实例（如使用 Express）
  getApp(): Express.Application;

  // 挂载自定义路由
  use(path: string, handler: Handler): void;

  // 注册启动后钩子
  onStart(callback: () => void): void;

  // 注册关闭前钩子
  onShutdown(callback: () => void): void;
}
```

**设计原则**：不做过度设计，仅暴露必要的扩展接口。后续 feature 直接调用上述方法挂载，无需修改本 Feature 代码。

---

## 5. Risks & Mitigations

### 5.1 Technical Risks

| ID | 风险描述 | 严重度 | 概率 | 缓解方案 |
|----|---------|:-----:|:----|---------|
| R-WS-01 | 跨平台浏览器启动失败（Windows / macOS / Linux 命令不同） | 中 | 中 | 使用 `open` 包的逻辑（但不安装依赖，直接实现核心逻辑），失败降级为手动提示 |
| R-WS-02 | 端口检测竞态条件（检测后绑定前被其他进程占用） | 低 | 低 | 绑定失败时重试，不在检测阶段做端口占用判断，直接尝试 bind |
| R-WS-03 | 优雅关闭时连接泄漏（未完成的请求阻塞关闭） | 中 | 低 | 设置 1 秒超时，超时后强制 `process.exit()`，使用 `server.closeAllConnections()` |
| R-WS-04 | 静态文件服务路径解析错误（不同工作目录） | 中 | 中 | 使用 `__dirname` 相对路径 + 运行时验证文件存在，启动时检查资源目录 |
| R-WS-05 | Windows 上端口检测不准确（某些系统进程占用不返回 EADDRINUSE） | 低 | 低 | 增加启动后自检：发起本地 HTTP 请求验证服务实际可用 |

### 5.2 Integration Risks

| ID | 风险描述 | 严重度 | 概率 | 缓解方案 |
|----|---------|:-----:|:----|---------|
| R-WS-06 | 与现有 CLI REPL 的事件循环冲突 | 中 | 低 | Web 命令启动后不进入 REPL 循环，独立运行自己的事件循环 |
| R-WS-07 | 日志系统格式不统一 | 低 | 低 | 对齐现有 CLI 日志格式和颜色方案，保持一致的用户体验 |
| R-WS-08 | 后续 feature（Socket.io / Next.js）挂载时需要大量重构 | 中 | 低 | 本 Feature 设计时暴露清晰的扩展接口（见 §4.3），后续挂载无需重构核心 |

### 5.3 UX Risks

| ID | 风险描述 | 严重度 | 概率 | 缓解方案 |
|----|---------|:-----:|:----|---------|
| R-WS-09 | 服务启动慢（>2s 目标） | 中 | 低 | 延迟加载非必须模块，启动关键路径最小化，使用 Node.js 内置模块而非第三方库 |
| R-WS-10 | 端口递增到非预期的高端口 | 低 | 低 | 最多尝试 10 次（到 3466），超过则报错让用户手动指定 |
| R-WS-11 | 用户忘记终端运行着服务，直接关闭终端导致服务终止 | 低 | 低 | 终端显示清晰的"按 Ctrl+C 停止服务"提示，MVP 不做后台守护进程 |

---

## 6. Testing Strategy

### 6.1 Unit Tests

- WebServer 类：端口绑定、递增重试、启动关闭、超时设置
- BrowserLauncher：无头环境检测、失败降级逻辑
- Logger：日志级别、颜色输出、缓冲区滚动
- Health endpoint：响应格式正确性

### 6.2 Integration Tests

- 完整命令流程：`superagent web --port XXXX` → 服务启动 → 请求健康检查 → Ctrl+C 关闭
- 端口占用场景：先启动一个服务，再启动第二个，验证自动递增
- CORS 跨域请求拒绝验证
- 请求体大小限制验证（>10MB 返回 413）

### 6.3 Manual Tests

- 三个平台手动验证：macOS / Windows / Linux
- 浏览器自动打开功能
- Ctrl+C 优雅关闭
- --verbose 日志输出

---

> **Plan Version**: v1.0 | **Created**: 2026-06-18 | **Next Step**: Generate tasks.md
