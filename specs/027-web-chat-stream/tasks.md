# Implementation Tasks: Web Chat Stream Rendering

**Feature**: 027-web-chat-stream  
**Total Tasks**: 16  
**Parallel Groups**: 4  

**Design Sources for all [FE] tasks**:
- Root `DESIGN.md` sections: Brand & Style, Typography, Layout & Spacing, Components, Terminal Output
- Visual samples: `specs/design-reference/stitch-export/claude_style_chat_workspace/` and `specs/design-reference/stitch-export/claude_humanist_editorial/`
- Component baseline: React + project Web UI components; markdown/prose/code rendering must follow the readable technical-content hierarchy from root `DESIGN.md`

---

## Task List

### 并行组 A: 基础类型与配置 (4 任务，可并行)

#### [x] T001 [BE]: 创建 Markdown 类型定义

- **FR 来源**: FR-MD-01 ~ FR-MD-12
- **依赖**: 无
- **目标**: 完整的 TypeScript 类型定义
- **任务内容**:
  1. 创建 `packages/web/src/types/markdown.ts`
  2. 定义 `MarkdownNodeType` 枚举：所有支持的节点类型
  3. 定义 `MarkdownNode` 接口及其子类型（带 discriminant）
  4. 定义 `StreamState` 接口：rawContent, ast, partialStructure
  5. 定义 `SanitizeConfig` 接口：白名单标签、属性等
- **验证方式**: TypeScript 编译无错误，类型覆盖完整
- **预计时间**: 30 min

#### [x] T002 [BE]: 配置 Markdown 解析器 (marked + GFM)

- **FR 来源**: FR-MD-01 ~ FR-MD-12
- **依赖**: T001
- **目标**: GFM 兼容的 Markdown 解析器
- **任务内容**:
  1. 创建 `packages/web/src/lib/markdown/parser.ts`
  2. 配置 marked 使用 GFM 插件（表格、任务列表、删除线）
  3. 实现 `parseMarkdown()`：raw string → MarkdownNode[]
  4. 实现 `parsePartial()`：增量解析接口
  5. 实现 `detectPartialStructure()`：检测打开的代码块/表格/列表
- **验证方式**: 单元测试：CommonMark 测试用例解析正确
- **预计时间**: 2 hr

#### [x] T003 [BE]: 配置 DOMPurify Markdown 白名单 (B+ 策略)

- **FR 来源**: FR-XSS-01 ~ FR-XSS-05
- **依赖**: T001
- **目标**: 安全的 HTML 标签白名单净化
- **任务内容**:
  1. 修改 `packages/web/src/utils/dompurify.ts`
  2. 导出 `sanitizeMarkdown()` 独立函数（不影响原 `sanitizeHtml()`）
  3. 配置 B+ 白名单标签（18 种安全标签）
  4. 自动给所有 `<a>` 添加 `target="_blank"` 和 `rel="noopener noreferrer"`
  5. 禁止内联事件属性、javascript: URI
- **验证方式**: 单元测试：注入 XSS payload 验证被正确过滤
- **预计时间**: 1.5 hr

#### [x] T004 [BE]: 配置 Shiki 语法高亮 (20+ 语言)

- **FR 来源**: FR-HL-01
- **依赖**: 无
- **目标**: 高质量语法高亮配置
- **任务内容**:
  1. 创建 `packages/web/src/lib/markdown/syntax-highlight.ts`
  2. 配置 Shiki：深色主题（如 github-dark / dracula）
  3. 预加载 20+ 常用语言（JS/TS/Python/Java/Go/Rust/C++ 等）
  4. 实现 `highlightCode(code, lang)` 函数
  5. 实现 `getLanguageName(lang)`：友好显示语言名
  6. **备选方案**: 如果 Shiki bundle 过大，降级到 highlight.js
- **验证方式**: 单元测试：各语言语法高亮输出正确
- **预计时间**: 2 hr

---

### 并行组 B: 核心组件 (6 任务，可并行)

#### [x] T005 [FE]: 基础 Markdown 元素组件

- **FR 来源**: FR-MD-02, FR-MD-03, FR-MD-04, FR-MD-06, FR-MD-08, FR-MD-11, FR-MD-12
- **依赖**: T001
- **目标**: 常用 Markdown 元素组件
- **任务内容**:
  1. `Heading.tsx`: h1-h6，适当的字体大小和间距
  2. `InlineCode.tsx`: 内联代码样式，monospace 字体
  3. `List.tsx`: 有序/无序列表 + 任务列表（checkbox + 删除线）
  4. `Blockquote.tsx`: 引用块（左边框 + 缩进 + 灰色背景）
  5. `HorizontalRule.tsx`: 分割线组件
- **验证方式**: 组件测试：各元素渲染正确，样式符合设计
- **预计时间**: 2 hr

#### [x] T006 [FE]: Link 组件 (安全属性)

- **FR 来源**: FR-MD-07
- **依赖**: T003 (sanitizeMarkdown)
- **目标**: 安全的链接渲染
- **任务内容**:
  1. 创建 `Link.tsx`
  2. 自动添加 `target="_blank"`
  3. 自动添加 `rel="noopener noreferrer"`
  4. hover 样式和 focus 状态
  5. javascript: URI 过滤验证（通过 DOMPurify）
- **验证方式**: 组件测试：安全属性存在；点击在新标签页打开
- **预计时间**: 45 min

#### [x] T007 [FE]: Image 组件 (懒加载 + skeleton)

- **FR 来源**: FR-MD-10
- **依赖**: 无
- **目标**: 图片加载优化
- **任务内容**:
  1. 创建 `Image.tsx`
  2. 原生 `loading="lazy"` 懒加载
  3. 灰色 skeleton 占位符（aspect-ratio 保持）
  4. 加载失败回退显示（破损图标 + alt 文本）
  5. max-width 限制在容器内
  6. 点击图片在新标签页打开原图
- **验证方式**: 组件测试：懒加载生效；加载失败显示回退
- **预计时间**: 1 hr

#### [x] T008 [FE]: Table 组件 (样式 + 可访问性)

- **FR 来源**: FR-MD-09
- **依赖**: 无
- **目标**: 美观易用的表格
- **任务内容**:
  1. 创建 `Table.tsx` 及子组件 (THead/TBody/TR/TH/TD)
  2. 表头样式区分
  3. 边框和斑马纹
  4. 内容对齐（左对齐）
  5. 滚动溢出处理（overflow-x: auto）
  6. aria-label 和 role 等可访问性属性
- **验证方式**: 组件测试：渲染正确；可访问性属性存在
- **预计时间**: 1 hr

#### [x] T009 [FE]: CodeBlock 核心组件 (语法高亮 + 行号)

- **FR 来源**: FR-HL-01, FR-HL-02, FR-HL-06
- **依赖**: T004 (Shiki), T001
- **目标**: 代码块核心渲染
- **任务内容**:
  1. 创建 `CodeBlock.tsx`
  2. 集成 Shiki 语法高亮
  3. 头部显示语言名
  4. 左侧行号显示（纯视觉，不影响选择复制）
  5. monospace 字体和行高
  6. overflow-x 横向滚动
- **验证方式**: 组件测试：20+ 语言高亮正确；行号显示正确
- **预计时间**: 2 hr

#### [x] T010 [FE]: CodeBlock 高级功能 (复制 + 折叠)

- **FR 来源**: FR-HL-03, FR-HL-04, FR-HL-05
- **依赖**: T009
- **目标**: 代码块交互功能
- **任务内容**:
  1. 右上角复制按钮
  2. 点击后显示 "Copied!" 提示 2 秒
  3. 复制内容不含行号
  4. 超过 30 行自动显示折叠按钮
  5. 折叠状态显示前 10 行 + "点击展开"
  6. 展开/折叠状态动画过渡
- **验证方式**: 组件测试：点击复制剪贴板内容正确；折叠/展开工作
- **预计时间**: 1.5 hr

---

### 并行组 C: 流式渲染集成 (3 任务，串行依赖)

#### [x] T011 [FE]: 实现 useCopyToClipboard hook

- **FR 来源**: FR-HL-03, FR-HL-04, NFR-MD-05
- **依赖**: 无
- **目标**: 跨浏览器可靠的剪贴板 hook
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-copy-to-clipboard.ts`
  2. 使用 navigator.clipboard.writeText API
  3. 错误处理（权限拒绝等）
  4. 支持成功回调和错误回调
  5. 2 秒后自动 reset copied 状态
  6. 测试 Firefox/Chrome/Safari 兼容性
- **验证方式**: 单元测试：hook API 正确；在三种浏览器中手动验证
- **预计时间**: 45 min

#### [x] T012 [FE]: 实现 useMarkdownStream hook (流式解析核心)

- **FR 来源**: FR-ST-01, FR-ST-02, FR-ST-03, FR-ST-04, NFR-MD-01, NFR-MD-04
- **依赖**: T002 (parser), T001
- **目标**: 增量式流式 Markdown 解析
- **任务内容**:
  1. 创建 `packages/web/src/hooks/use-markdown-stream.ts`
  2. 实现 `appendToken(token)`：增量追加，不重解析已解析内容
  3. 实现 Claude.ai 策略：代码块开始后立即进入高亮模式
  4. partialStructure 状态管理（inCodeBlock / inTable / inList）
  5. 消息完成时触发完整 re-parse 校正
  6. useDeferredValue 优化，保持 60fps 不阻塞 UI
- **验证方式**: 单元测试：快速追加 tokens，AST 正确增长；流式过程无闪烁
- **预计时间**: 3 hr

#### [x] T013 [INT]: 扩展 Zustand store 并集成到 MessageBubble

- **FR 来源**: FR-ST-05
- **依赖**: T012, T001, 026 Feature
- **目标**: 端到端流式渲染集成
- **任务内容**:
  1. 扩展 `packages/web/src/store/chat.ts` 中的 Message 类型
  2. 添加 `ast` 和 `partialStructure` 字段
  3. 创建 `MarkdownRenderer.tsx` 主组件：递归渲染 MarkdownNode AST
  4. 修改 `MessageBubble.tsx`：集成 MarkdownRenderer
  5. 连接 Socket stream_token 事件 → useMarkdownStream.appendToken
- **验证方式**: 集成测试：发送消息 → 流式接收 → 增量渲染正确，最终格式完美
- **预计时间**: 2 hr

---

### 并行组 D: 优化与测试 (3 任务，串行依赖)

#### T014 [FE]: 性能优化与样式精调

- **FR 来源**: NFR-MD-01, NFR-MD-02, NFR-MD-07, NFR-MD-09
- **依赖**: T013
- **目标**: 流畅的性能和精美的样式
- **任务内容**:
  1. React.memo 包装所有 Markdown 组件，避免不必要重渲染
  2. 使用 useDeferredValue 优先响应用户输入
  3. Tailwind typography prose 插件配置精调
  4. 深色主题适配所有元素颜色
  5. WCAG AA 对比度验证
  6. 流式渲染时预留最小高度防跳动
  7. 长代码块虚拟滚动集成（复用 026 的 useVirtualScroll）
- **验证方式**: 性能测试：1000 token 消息渲染 < 100ms；滚动保持 60fps
- **预计时间**: 2 hr

#### T015 [INT]: 编写核心单元测试与组件测试

- **依赖**: 所有组件完成
- **目标**: 测试覆盖核心逻辑
- **任务内容**:
  1. parser 单元测试：CommonMark 测试套件
  2. sanitize 单元测试：100+ XSS payloads 测试
  3. useMarkdownStream hook 测试：流式增量解析
  4. CodeBlock 组件测试：复制、折叠、高亮
  5. MarkdownRenderer 组件测试：所有元素渲染快照
- **验证方式**: vitest 所有测试通过
- **预计时间**: 3 hr

#### T016 [INT]: 端到端集成与验收测试

- **依赖**: T015
- **目标**: 完整功能验收
- **任务内容**:
  1. 端到端流式渲染测试：发送消息 → 流式输出 → 最终格式正确
  2. 大代码块测试：1000 行代码流畅滚动和复制
  3. 安全测试：XSS payload 全部被过滤
  4. 浏览器兼容性测试：Chrome / Firefox / Safari
  5. 性能基准测试：token 渲染延迟 < 16ms
  6. 最终视觉验收：与 Claude.ai 体验对比
- **验证方式**: 所有验收标准通过
- **预计时间**: 2 hr

---

## 开发顺序与依赖图

```
Phase 1 (完全并行):
  A1: T001 (类型定义)
  A2: T002 (Markdown 解析器)
  A3: T003 (DOMPurify 白名单)
  A4: T004 (Shiki 语法高亮)

Phase 2 (并行，依赖 A1):
  B1: T005 (基础元素组件)
  B2: T006 (Link 组件)
  B3: T007 (Image 组件)
  B4: T008 (Table 组件)
  B5: T009 (CodeBlock 核心)
  B6: T010 (CodeBlock 高级功能)

Phase 3 (串行，依赖 A1-A4 + B1-B6):
  C1: T011 (useCopyToClipboard)
  C2: T012 (useMarkdownStream 核心 hook)
  C3: T013 (Store 扩展 + MessageBubble 集成)

Phase 4 (串行，依赖所有 Phase 1-3):
  D1: T014 (性能优化 + 样式精调)
  D2: T015 (单元/组件测试)
  D3: T016 (E2E 集成与验收测试)
```

---

## 验收标准

- ✅ 所有 16 个任务完成
- ✅ TypeScript strict mode 编译零错误
- ✅ 单元测试 + 组件测试全部通过
- ✅ CommonMark 规范测试套件 100% 通过
- ✅ 流式渲染 token 延迟 < 16ms (60fps)
- ✅ 1000 行代码块重渲染 < 100ms
- ✅ 100+ XSS payloads 全部被正确过滤
- ✅ 代码块复制功能工作正常，不含行号
- ✅ 20+ 编程语言语法高亮正确
- ✅ 所有 Markdown 元素渲染正确
- ✅ Chrome/Firefox/Safari 三大浏览器兼容
- ✅ WCAG AA 对比度标准达标
- ✅ 流式过程无视觉闪烁，最终格式完美

---

**Tasks Version**: v1.0  
**Created**: 2026-06-18  
**Task Count**: 16  
**Next Step**: Proceed to implementation
