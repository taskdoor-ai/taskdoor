# TaskDoor × Promptfoo

测试运行使用 Promptfoo 0.123.1（MIT）。团队、成员职责、Skill 版本与用例继续在 TaskDoor 管理。
上游：https://github.com/promptfoo/promptfoo

## 启动

需要 Node >=22.22。启动器优先使用 EVALUATION_NODE 指定的 Node、当前 Node，最后尝试 Codex 自带的 Node。安装依赖时也应使用相同 Node 版本，以保证 better-sqlite3 的二进制兼容。

```sh
npm install --prefix tools/evaluation
npm run eval:view  # 独立终端，本机 15500
npm run dev       # 独立终端，TaskDoor 5173
npm run eval:ui   # 独立终端，融合平台 15501（首次准备见下文）
```

从 http://127.0.0.1:15501/setup 创建运行，依次选择团队、成员、Skill、用例和模型。批次获得原生评测 ID 后，可在同一平台打开模型对比报告。运行进度来自真实服务端状态，不猜测生成百分比。

## 执行与结果

1. TaskDoor 校验用例权限和前置条件，冻结团队、操作人、用例、Skill 版本及执行时点。
2. 每批启动独立 Promptfoo 执行进程。Promptfoo 按用例 × 模型调度自定义 provider，禁用缓存，最多两组并行，每个组合只执行一次。
3. Provider 通过本机进程 IPC 调用 TaskDoor 的业务适配器。原有权限过滤、成员职责、步骤事件、多轮前序输出、结构校验和业务断言继续执行。模型凭据不进入 Promptfoo 配置或 IPC。
4. TaskDoor 每步保存实际请求、模型原文、Token、耗时、Skill 哈希及业务检查。Promptfoo 保存原生评测结果；一行是一条完整用例，一列是一个模型，多轮结果在同一单元格依次显示。
5. Promptfoo 完成组合落库后同步报告进度。TaskDoor 的排队、活动、取消、失败来自执行状态，不从示例数据推算。取消尚未执行的组合不调用模型；活动取消中止本地请求；重复提交与 provider 重入不会重复调用模型。

结果摘要由真实 JSON 确定性格式化。单元格详情的 `metadata.steps` 包含完整逐步输入、输出与业务检查，`metadata.teamSnapshot` / `caseSnapshot` 保留本次上下文，`metadata.originalResult` 返回本平台执行记录详情。

Promptfoo 的 Pass 仅表示结构及全部自动断言通过。无断言、未知断言、失败、中断和取消不标记自动通过。人工验收在本平台的执行记录详情中完成；Promptfoo 自身评分和评语不回写 TaskDoor，也不会改变正式业务任务。重新执行请从本平台新建评测，以重新校验当前团队和 Skill。

Promptfoo 子进程异常时，未结束组合标记中断，保留已完成步骤并展示引擎错误；服务重启不会自动重试付费请求。

## 长上下文与调用预算

生成请求直接发送普通 JSON，不要求模型解码字典引用；原始输入、模型输出和历史记录保持完整。DeepSeek V4 系列使用 low 推理强度，其他模型继续使用 medium。核对请求保留可还原压缩，并合并可确定还原的重复视图；去重后仍超过本地 200,000 字符限制时拒绝发送，不截断材料。上游模型仍有独立的上下文限制。

默认生成等待上限为 600 秒、输出上限为 16,000 Token，核对等待上限为 120 秒。可通过服务端环境变量 `TEST_LAB_TIMEOUT_MS`、`TEST_LAB_MAX_OUTPUT_TOKENS`、`TEST_LAB_JUDGE_TIMEOUT_MS` 覆盖；两个等待上限最多 600 秒，输出上限最多 32,000 Token。输出预算同时包含推理与正文，并非全部用于最终 JSON；错误会显示实际输出用量及上游提供的推理用量。更高的输出预算允许更长回复，也可能增加耗时与费用。失败不会自动重试；已有失败记录保持原样，新运行使用新设置。

## 历史结果

```sh
npm run eval:import -- <批次ID>
```

历史导入不调用模型，每次导入为独立快照，按用例步骤 × 模型对齐，与新原生执行分开。不要通过历史快照的重新运行功能发起测试。

数据保存在 `data/test-lab/state.json` 和 `data/test-lab/promptfoo`；历史导入文件在 `data/test-lab/promptfoo-imports`，均不进入 Git。执行器官方包独立安装；前端基于固定上游提交维护补丁，见下文。查看器通过 `local-only.mjs` 限定本机监听，禁用遥测和更新检查。

## 最小验证

```sh
npm run typecheck:lab
node --import tsx --test server/testLabPromptfoo.test.ts server/testLabRunner.test.ts server/testLabFreshCreation.test.ts server/testLabRunCenter.test.ts
node --test tools/evaluation/bridge.test.mjs
```

Promptfoo 集成测试运行真实引擎与临时 SQLite 数据库，只替换付费模型边界，不写入用户运行列表。测试样本不能当成真实模型评测结果。

## 融合后的中文前端（推荐入口）

入口：`http://127.0.0.1:15501/`。这是基于固定版本 Promptfoo 源码构建的定制前端，保留 Promptfoo 原生 PageShell、评测列表与结果表。团队、Skill、用例、模型和创建评测为框架内的扩展页面，使用其原生组件与主题；不挂载旧 TestLabApp 或导入旧工作台 CSS。

```sh
# 首次还原前端源码：需要访问 GitHub 官方仓库
node tools/evaluation/fork/prepare.mjs
npm ci --prefix tools/evaluation/upstream/src/app --ignore-scripts
# 三个终端分别保持运行（前两个已有运行时无需重复启动）
npm run dev
npm run eval:view
npm run eval:ui
# 编译验证
npm run eval:ui:build
```

- 用户入口只有 15501；5173 提供现有业务管理 API，15500 提供 Promptfoo API 和结果数据库。所有服务限本机，前端代理保留 TaskDoor 的 CSRF 校验。
- 上游固定为 tag `0.123.1`，commit `34f74d34e140b5e17d23770dfb2340057b1936b8`。生成源码目录 `upstream` 与构建产物 `ui-dist` 被 Git 忽略；可维护改造保存在 `fork`，并保留 MIT 许可证与依赖锁文件。不修改安装后的 npm 包。
- `fork/App.tsx` 是裁剪后的入口：只保留团队、用例、Skill 文件包、模型管理、测试运行与原生报告。原 Prompt 管理、红队配置、云登录、营销、分享及通用重跑入口不再提供。
- `fork/customize.mjs` 对源代码应用定制；`fork/zh-CN.json` 翻译控件文本。不会通过 DOM 替换翻译用户输入或模型返回。技术标识、模型名称和原始 JSON 保留。
- 报告的自动通过率包含运行错误的分母；人工验收仍按 TaskDoor 记录判定。
- Skill 支持目录导入、逐文件查看/编辑、不可变版本和 ZIP 导出。当前文件包支持 UTF-8 文档、JSON 与脚本源码；不执行脚本，不接受二进制资源，不自动安装依赖。导入创建当前 Skill 的新版本，不覆盖原工作区文件。
- 模型页的历史统计来自现有运行；跨用例、跨版本数据不作公平排名，同批报告才用于横向比较。

查看已构建版本（避免开发热更新干扰）：`npm run eval:ui:build` 后执行 `npm run eval:ui -- --preview`，同样使用 15501 端口；不要与开发前端同时启动。

前端扩展类型检查：`./node_modules/.bin/tsc -p tools/evaluation/fork/tsconfig.extensions.json`。实施边界见 `fork/IMPLEMENTATION.md`。

## 团队与模型开关

- 团队详情 `/teams/:teamId` 下管理成员（仅名称和责任）与当前团队用例，移除独立用例库导航。删除有任务、证据、用例或前置检查引用的成员时提示先调整引用，历史运行快照不随成员改动。
- 模型页自动读取配置服务的完整目录。`state.models` 是新评测允许选择的生成模型集合，空数组表示全部关闭；关闭后的手动模型仍保留在 `modelCatalog`。保存采用修订校验，服务端拒绝未启用模型的新运行。
- `judgeEnabled` 控制 Jev 是否可选。新建评测显式选择 `judgeModel` 后，在生成结束后通过 TypeSafe 独立核对；结果存入 `jevReviews`，状态/错误独立记录，不修改原始输出或人工结论。重启不重试判断调用。
- 最小回归：`node --import tsx --test server/testLabTeamModelControls.test.ts server/testLabRunner.test.ts server/testLabManagement.test.ts`；这些测试使用临时数据和替代模型边界，不调用付费模型。

### MCP 参数表单

MCP 调试页复用官方 MCP Inspector 的 SchemaForm，固定源码版本 `0d2bc1d91ce177ea8d497ee3efe91bcc59e40a1c`。源码及上游授权声明保存在 `fork/extensions/inspector`，本地适配说明见该目录 README。依赖固定在 fork/package.json 与 package-lock.json；prepare/customize 会复制组件，不依赖开发时下载。表单使用真实 tools/list 的 inputSchema，调用仍由现有服务端 SDK 执行，Token 不进入浏览器。

MCP 响应使用 `@uiw/react-json-view` 展示只读 JSON 树。优先展示 structuredContent；仅一个 text 块且可解析时展示解析后的 JSON，否则保留文本或完整内容块。原始回执始终可展开，避免遗漏协议信息。
