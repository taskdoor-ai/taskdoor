# 常驻助手组件选型与视觉适配

日期：2026-09-08。用户要求在 21st.dev 查找更好看的组件，应用于已开发的右侧助手。

本轮对象是助手面板、会话消息、输入和待确认操作。目标是让任务上下文易识别、对话易读、确认区与普通回复清晰区分；沿用现有查询与写入合同。

## 本次核实的参考

| 组件 | 来源与证据 | 取舍 |
| --- | --- | --- |
| AI Message · Edu Calvo / SmoothUI | [21st 页面](https://21st.dev/@educalvolpz/components/ai-message)，已查看实际预览；左右消息区分，支持 reduced motion；页面列出 lucide-react。项目已有 `AIMessage` | 复用已有组件，以浅蓝用户气泡和开放式助手正文适配窄侧栏；保留来源说明，不加入本轮没有数据支持的评分、时间戳 |
| Prompt Input with Actions · Julien Thibeaut / Prompt Kit | [21st 页面](https://21st.dev/@ibelick/components/promt-input-with-actions/prompt-input-with-suggestions)，已查看预览及页面展示的使用代码；圆角输入表面、工具栏、圆形发送和建议入口，依赖 lucide-react | 适配视觉结构，输入仍由当前助手控制；保留文本文件限制、停止、中文组合输入，新增输入高度随内容变化。未整段复制外部源码 |
| AI Approval · Edu Calvo / SmoothUI | [21st 页面](https://21st.dev/@educalvolpz/components/ai-approval)，已查看实际预览；页面标注 MIT，依赖 lucide-react / framer-motion | 适配独立确认区、已处理状态与明确操作；保留 TaskDoor 可编辑方案、单次确认和过期校验，不引入新动效依赖 |
| Agent Chat · 21st Agent Elements | [21st 页面](https://21st.dev/@21st/components/agent-chat/empty-centered)，公开说明覆盖消息列表、输入、错误、附件和空状态 | 作为布局比较。现有助手已有会话与事务管理，继续复用当前组合，不替换业务引擎 |

检索了 21st 的 AI Chat 分类并实看以上三个交互预览；可访问页面没有可靠使用量，不记录推测的收藏／使用数字。新发布不代表已验证成熟。现有 Base UI Button、TaskIcon、21st 适配的 TaskStatusBadge 与 AgentActivityIndicator 提供项目内的行为基础，本轮没有新增依赖或导入外部整段源码。

## TaskDoor 适配

- 桌面侧栏采用 420px 宽的圆角白色面板，顶部和右侧留边；标题使用浅蓝表面与助手标识，当前任务保持独立上下文栏。
- 空状态保留原有三个快捷动作，用图标、简短标题与说明表达用途。用户消息右对齐浅蓝气泡，助手消息左对齐；正文保留来源及完整依据展开入口。
- 查询结果复用 TaskIcon 和 TaskStatusBadge；操作方案采用浅蓝标题、操作类型和数量、可编辑字段及底部确认区。移除草稿项用关闭图标，删除任务仍使用危险语义。
- 输入采用一体式圆角表面、附件入口、圆形发送／停止按钮；自动增高最高 160px，继续支持 Enter、Shift+Enter 与中文输入法。
- 色彩沿用 `--ad-route`、`--ad-route-soft`、`--ad-surface`、`--ad-border-*` 和既有标签色。响应样式限定在助手内部，不影响旧消息页面。
- 窄屏全宽，保留输入和收起入口；支持 Escape 与 reduced motion。查询和任务写入逻辑不变。

## 验证范围

运行生产构建、检查桌面／窄屏、实际查询回复、已存在草稿的可读性、消息输入及键盘收起。此次为可逆视觉调整，不新增业务测试或运行全量测试，不执行浏览器任务写入。

验证结果：前端 TypeScript 检查 `npx tsc -p tsconfig.app.json` 和 `npx vite build` 通过，`git diff --check` 通过。已实看 1440 × 900 桌面与 390 × 844 窄屏，检查现有待确认草稿、实际情况汇报及任务结果；窄屏无横向溢出，Shift+Enter 保留换行，Escape 返回入口焦点。整项目构建首轮通过，末轮因同一工作区同时新增的 `onboardingPreview.ts` 未加入 `tsconfig.node.json` 而报 TS6307；未改动该并行工作，以前端专项检查验证本轮变更。构建仍有现有大包体积和 Vite native 配置提示。
