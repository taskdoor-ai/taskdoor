# AgentDoor HTML PRD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已确认的文字简版 PRD 细化为一份可独立打开、易搜索、易导航、适合产品和研发共同阅读的 HTML 页面。

**Architecture:** 新建一个自包含的静态 HTML，内容以七个真实模块为主轴。CSS 与少量原生 JavaScript 内嵌，避免新增构建依赖；测试只校验页面结构、关键规则和交互契约，视觉质量通过浏览器截图检查。

**Tech Stack:** HTML5、CSS、原生 JavaScript、Node.js `node:test`。

---

### Task 1: 固定页面契约

**Files:**
- Create: `server/agentdoorHtmlPrd.test.ts`
- Test: `server/agentdoorHtmlPrd.test.ts`

- [ ] **Step 1: 写失败测试**

测试读取 `public/agentdoor-prd.html`，要求页面包含七个稳定章节 ID、左侧导航、搜索输入、移动端目录按钮、折叠规则、打印按钮、两个 Skill 名称，以及团队邀请、任务创建、标签、EWD、优先排序、任务详情五个页签和研发底线。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test server/agentdoorHtmlPrd.test.ts`

Expected: 因 `public/agentdoor-prd.html` 尚不存在而失败。

### Task 2: 实现 HTML PRD

**Files:**
- Create: `public/agentdoor-prd.html`
- Source: `docs/product-v2/PRD-AgentDoor-协作任务全流程.md`

- [ ] **Step 1: 建立页面骨架**

使用 `header + aside + main` 语义结构；七个章节依次为 `flow`、`team`、`create`、`task-list`、`my-work`、`task-detail`、`guardrails`。

- [ ] **Step 2: 建立视觉系统**

复用 AgentDoor 的蓝色路由色、白色内容面和灰色边界。使用连续“流程轨道”作为唯一视觉签名；其余区域采用标题、分隔线、紧凑表格和少量浅色提示块，不做卡片墙。

- [ ] **Step 3: 写入细化内容**

每个模块只包含：用户流程、页面内容、AI/Skill 职责、关键规则、异常或验收。补充内容必须能直接对应现有产品决定，不增加市场、价值和愿景段落。

- [ ] **Step 4: 添加交互**

实现章节搜索、搜索结果计数、目录当前章节高亮、移动端目录开关、全部展开/收起、复制当前章节链接和打印。所有控件支持键盘，折叠使用原生 `details`。

- [ ] **Step 5: 运行测试并确认通过**

Run: `npx tsx --test server/agentdoorHtmlPrd.test.ts`

Expected: 全部通过。

### Task 3: 视觉与响应式检查

**Files:**
- Verify: `public/agentdoor-prd.html`

- [ ] **Step 1: 启动本地静态服务**

Run: `python3 -m http.server 4179 --directory public`

- [ ] **Step 2: 获取桌面截图**

使用 1440×1100 浏览器打开 `http://127.0.0.1:4179/agentdoor-prd.html`，检查首屏层级、流程轨道、正文宽度、导航和折叠控件。

- [ ] **Step 3: 获取移动端截图**

使用窄屏检查目录切换、表格横向容器、按钮触控尺寸和正文无溢出。

- [ ] **Step 4: 最终验证**

Run: `npx tsx --test server/agentdoorHtmlPrd.test.ts`

Expected: 0 个失败。

