# Implementation Tasks: Web 服务启动

**Feature**: 025-web-server-start  
**Total Tasks**: 15  
**Parallel Groups**: 3  

---

## Task List

### 并行组 A：基础框架（可并行开发）

#### T001: 创建 src/cli/web.ts 命令入口骨架 ✅

- **FR 来源**: FR-WS-01
- **依赖**: 无
- **目标**: web 子命令的入口文件结构
- **任务内容**:
  1. 创建 `src/cli/web.ts`
  2. 导出 `startWebCommand()` 函数签名
  3. 定义 WebCommandOptions 类型（port, verbose, noOpen）
  4. 添加基本的错误处理框架
- **验证方式**: TypeScript 编译通过，无类型错误
- **预计时间**: 2 min

#### T002: 在 src/cli/repl.ts 中添加 web 命令分支 ✅

- **FR 来源**: FR-WS-01
- **依赖**: T001
- **目标**: REPL 能识别 `web` 子命令并调用
- **任务内容**:
  1. 修改 `src/cli/repl.ts` 的命令解析逻辑
  2. 匹配 `web` 命令时调用 `startWebCommand()`
  3. 传递命令行参数（--port / --verbose / --no-open）
- **验证方式**: 运行 `superagent web --help` 能正确识别命令
- **预计时间**: 3 min

#### T003: 创建 WebServer 类基础骨架 ✅

- **FR 来源**: FR-WS-02
- **依赖**: 无
- **目标**: WebServer 的类结构和基本接口
- **任务内容**:
  1. 创建 `src/server/index.ts`
  2. 定义 `WebServer` 类
  3. 声明 constructor(options) / start() / shutdown() / getHttpServer() / use() 方法签名
  4. 定义 ServerOptions 类型
- **验证方式**: TypeScript 编译通过，无类型错误
- **预计时间**: 2 min

---

### 并行组 B：核心功能（可并行开发）

#### T004: 实现端口检测与自动递增逻辑 ✅

- **FR 来源**: FR-WS-04
- **依赖**: T003
- **目标**: 端口占用时自动递增，最多 10 次，失败退出
- **任务内容**:
  1. 在 WebServer 类中实现 `tryBind(port)` 私有方法
  2. 实现端口循环重试逻辑（3456 → 3457 → ... → 3466）
  3. 10 次失败时抛出错误，设置 exit code = 1
  4. 仅绑定 127.0.0.1，不绑定 0.0.0.0
- **验证方式**: 单元测试：先占用端口，验证服务自动尝试下一个
- **预计时间**: 4 min

#### T005: 实现 HTTP 服务器启动与优雅关闭 ✅

- **FR 来源**: FR-WS-02, FR-WS-05, FR-WS-16
- **依赖**: T004
- **目标**: 服务正常启动，Ctrl+C 1 秒内关闭
- **任务内容**:
  1. 使用 `node:http` 创建服务器
  2. 设置请求超时 30s，连接超时 10s
  3. 实现 `shutdown()` 方法，关闭所有活跃连接
  4. 1 秒超时后强制 `process.exit()`
  5. 监听 SIGINT 信号触发 shutdown
- **验证方式**: 集成测试：启动 → 发送请求 → 关闭，验证端口释放
- **预计时间**: 5 min

#### T006: 实现 /api/health 健康检查端点 ✅

- **FR 来源**: FR-WS-14
- **依赖**: T003
- **目标**: GET /api/health 返回正确的 JSON
- **任务内容**:
  1. 创建 `src/server/health.ts`
  2. 实现健康检查处理函数
  3. 返回格式: `{ status: "ok", uptime: number }`
  4. 在 WebServer 中挂载路由
- **验证方式**: curl http://localhost:3456/api/health 返回正确 JSON
- **预计时间**: 3 min

#### T007: 实现静态文件服务中间件 ✅

- **FR 来源**: FR-WS-15
- **依赖**: T003
- **目标**: 基础的静态文件服务，为 Next.js 预留
- **任务内容**:
  1. 创建 `src/server/static.ts`
  2. 使用 `node:fs` 实现简单的静态文件读取
  3. 处理 404（文件不存在）
  4. 设置正确的 Content-Type
  5. 在 WebServer 中挂载
- **验证方式**: 放置测试静态文件，curl 能正确获取内容
- **预计时间**: 4 min

#### T008: 实现 CORS 同源策略与请求体大小限制 ✅

- **FR 来源**: FR-WS-17, FR-WS-18
- **依赖**: T003
- **目标**: 拒绝跨域请求，限制请求体 10MB
- **任务内容**:
  1. 实现 CORS 中间件，检查 Origin 头，非 localhost 同源返回 403
  2. 实现请求体解析，设置 10MB 限制
  3. 超限返回 413 Payload Too Large
  4. 在 WebServer 中全局挂载这两个中间件
- **验证方式**: 单元测试：跨域请求返回 403；大于 10MB 请求体返回 413
- **预计时间**: 4 min

#### T009: 实现跨平台浏览器启动器 BrowserLauncher ✅

- **FR 来源**: FR-WS-03, FR-WS-08
- **依赖**: 无
- **目标**: 自动打开浏览器，失败降级
- **任务内容**:
  1. 创建 `src/utils/browser.ts`
  2. 实现 `open(url)` 函数：
     - macOS: `open` 命令
     - Windows: `start` 命令
     - Linux: `xdg-open` 命令
  3. 检测无头环境（CI），跳过浏览器打开
  4. 启动失败时返回失败标记，不抛出异常
- **验证方式**: 单元测试：无头环境检测正确；失败降级不抛出
- **预计时间**: 4 min

#### T010: 实现彩色日志系统 Logger ✅

- **FR 来源**: FR-WS-06, FR-WS-07, FR-WS-12, FR-WS-20
- **依赖**: 无
- **目标**: 多级别彩色日志，滚动缓冲 1000 行
- **任务内容**:
  1. 创建 `src/server/logger.ts`
  2. 实现 info() / warn() / error() / debug() 方法
  3. 使用 chalk（或项目已有颜色库）输出不同级别颜色
  4. 每条日志带时间戳
  5. 实现 1000 行滚动缓冲，超出时旧日志丢弃
  6. --verbose 控制 debug 级别输出
- **验证方式**: 调用各级别方法，终端颜色正确，缓冲超出时日志滚动
- **预计时间**: 4 min

---

### 并行组 C：集成与测试（串行，依赖 A + B 完成）

#### T011: 集成所有模块，实现完整的 startWebCommand 流程 ✅

- **FR 来源**: FR-WS-01 ~ FR-WS-20
- **依赖**: T002, T005, T006, T007, T008, T009, T010
- **目标**: 完整的命令流程：参数解析 → 启动服务 → 打开浏览器 → 输出日志 → 等待 Ctrl+C
- **任务内容**:
  1. 在 `src/cli/web.ts` 中实现完整的 `startWebCommand()`
  2. 解析命令行参数，设置默认值（port=3456, verbose=false, noOpen=false）
  3. 实例化 WebServer，调用 start()
  4. 实例化 Logger，输出服务状态 + 访问地址 + PID
  5. 根据 --no-open flag 决定是否调用 BrowserLauncher.open()
  6. 浏览器失败时输出手动访问提示
  7. 等待 SIGINT，调用 shutdown()
  8. 输出再见消息，exit(0)
- **验证方式**: 运行 `superagent web`，终端输出正确，浏览器自动打开，Ctrl+C 正常退出
- **预计时间**: 5 min

#### T012: 统一错误格式与异常处理 ✅

- **FR 来源**: FR-WS-19
- **依赖**: T011
- **目标**: 所有 HTTP 错误使用统一的 JSON 格式
- **任务内容**:
  1. 定义统一错误响应格式: `{ error: { code: string, message: string, details?: object } }`
  2. 实现全局错误处理中间件
  3. 400 / 403 / 404 / 413 / 500 / 504 等错误码统一处理
  4. 未捕获异常也返回标准格式，不崩溃
- **验证方式**: 访问不存在的路径返回 404 + 标准 JSON；触发各种错误码验证格式
- **预计时间**: 3 min

#### T013: 编写 WebServer 单元测试 ✅

- **依赖**: T005, T006, T007, T008
- **目标**: WebServer 核心功能单元测试覆盖
- **任务内容**:
  1. 创建 `tests/server/index.test.ts`
  2. 测试端口自动递增
  3. 测试启动 / 关闭流程
  4. 测试 CORS 跨域拒绝
  5. 测试请求体 10MB 限制
- **验证方式**: vitest 运行所有测试通过
- **预计时间**: 4 min

#### T014: 编写健康检查与静态文件服务单元测试 ✅

- **依赖**: T006, T007
- **目标**: 测试 health 端点和静态文件服务
- **任务内容**:
  1. 创建 `tests/server/health.test.ts`
  2. 测试 GET /api/health 返回正确格式和 uptime
  3. 创建 `tests/server/static.test.ts`
  4. 测试静态文件读取和 404 处理
- **验证方式**: vitest 运行所有测试通过
- **预计时间**: 3 min

#### T015: 编写 CLI web 命令集成测试 ✅

- **依赖**: T011, T012
- **目标**: 端到端集成测试
- **任务内容**:
  1. 创建 `tests/cli/web.test.ts`
  2. 测试完整命令流程：启动 → 请求健康检查 → 关闭
  3. 测试自定义端口参数
  4. 测试 --no-open 标志
  5. 测试 --verbose 日志
- **验证方式**: vitest 运行所有集成测试通过
- **预计时间**: 4 min

---

## 开发顺序与依赖图

```
Phase 1 (并行):
  A1: T001 (web.ts 骨架)
  A2: T002 (repl.ts 分支)
  A3: T003 (WebServer 骨架)
  B1: T009 (BrowserLauncher)
  B2: T010 (Logger)

Phase 2 (并行，依赖 A3):
  B3: T004 (端口递增)
  B4: T006 (health endpoint)
  B5: T007 (static 服务)
  B6: T008 (CORS + 大小限制)
  B7: T005 (启动 + 关闭，依赖 B3)

Phase 3 (串行，依赖所有 Phase 1+2):
  C1: T011 (完整集成)
  C2: T012 (错误格式)
  C3: T013 (WebServer 单元测试)
  C4: T014 (health + static 测试)
  C5: T015 (CLI 集成测试)
```

---

## 验收标准

- ✅ 所有 15 个任务完成
- ✅ 所有单元测试和集成测试通过（vitest）
- ✅ TypeScript 编译无错误，strict mode 下通过
- ✅ 手动测试三个平台：macOS / Windows / Linux
- ✅ 服务启动时间 ≤ 2 秒
- ✅ Ctrl+C 关闭时间 ≤ 1 秒
- ✅ 端口占用时自动递增正确
- ✅ CORS 跨域请求被拒绝
- ✅ >10MB 请求体返回 413
- ✅ 浏览器启动失败时降级提示正确

---

> **Tasks Version**: v1.0 | **Created**: 2026-06-18 | **Task Count**: 15
