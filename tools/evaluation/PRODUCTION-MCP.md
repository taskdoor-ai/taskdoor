# 真实 TaskDoor MCP 评测接入

此版本通过 MCP `tools/list` 获取正式工具定义，经模型 function calls 执行，再用 `get_task` 回读。运行环境 Node.js 22.22+，在仓库根目录执行 `npm ci`。不使用本项目 `mcp/` 下的演示任务服务冒充正式系统。

## 配置

在仓库根目录 `.env.local` 或启动进程环境设置以下变量（不要使用 VITE_ 前缀）：

```dotenv
TASKDOOR_MCP_URL=https://你的服务/mcp
TASKDOOR_MCP_TOKEN=本机配置的令牌
TASKDOOR_MCP_WORKSPACE_ID=真实测试工作区ID
PPIO_API_KEY=本机配置的模型令牌
PPIO_MODEL=deepseek/deepseek-v4.1-flash
TEST_LAB_JUDGE_MODEL=qwen/qwen3.6-plus
```

MCP 当前使用 Streamable HTTP + Bearer token，支持 HTTPS 或本机 HTTP。仅支持任务创建评测，授权账号必须具有工作区读取、创建权限。令牌不会进入模型输入、浏览器配置或报告。

## 开发者直接运行

将真实创建需求写入 `request.txt`，包含任务名称、目标、真实成员名称、完成标准和需要的截止日期；不要填沙箱人员 ID。未给定的信息由 Skill 判断，当前 MCP 必填负责人，不会伪造一个未分配负责人。

```sh
npm run eval:mcp -- ./request.txt
```

返回本地报告路径、状态和实际创建 ID。`created_and_read_back` 只表示创建与回读完成，不等同业务验收通过。完整工具参数、原始 MCP 回执、用量及任务记录保存在 `data/mcp-evaluations/<runId>.json`。任务层级沿用真实 `parentTaskId`，日期只用 `dueDate`。报告可能包含业务资料。

同一运行、同一创建动作的幂等键稳定；重新执行 CLI 会产生新运行，可能创建新任务。若取消、超时或断线，先按报告中的 ID、幂等键和 pending 调用核查，不能无条件重跑。程序不会自动删除已创建任务。

## 评测界面

启动现有服务 `npm run dev -- --host 127.0.0.1`、`npm run eval:view`、`npm run eval:ui`，打开 http://127.0.0.1:15501/setup 。配置变更后重启服务。

新建评测直接通过真实 MCP 创建并回读任务。采用单步骤 `agentdoor-task-planner` 创建用例，原文引用真实成员；用人工验收条件描述目标结果。该模式不接受沙箱任务 ID、事件、负荷、前序输出、夹具检查或旧 JSON 路径断言。沙箱团队快照仅用于保留用例归属，不作为真实成员或任务上下文发给执行模型。

选择多少个用例、版本和生成模型，就产生多少组真实创建。每次工具请求发送前和收到回执后都保存记录。中断不自动恢复或重试，写操作仅限本次运行创建的任务、配置的工作区，禁止删除及修改已有任务。

## 判断模型

可选 `qwen/qwen3.6-plus`、`pa/claude-sonnet-4-6`、`deepseek/deepseek-v4.1-flash`，以及已配置的 Jev。Jev 因上下文超限失败时改用默认 Qwen；若与生成模型相同，自动选择另一模型。其他认证/限流错误不自动切换。可直接选择替代模型而不经过 Jev。

替代模型逐项返回 met / unmet / insufficient 和依据，不伪造 Jev 的概率。界面记录实际模型与切换原因。材料超过本地 4 MB 保护上限时提示拆分，不截断资料。模型服务自身的上下文或输出预算仍可能限制请求；不会无限重试。

模型目录和官方标称长上下文仅代表候选能力，网关是否支持必须以实际请求为准。针对本机网关的连接冒烟结果保存在 `data/mcp-evaluations/judge-smoke.json`；这不是长上下文质量评测。

## 集成接口与契约

- `server/test-lab/mcp-execution.ts` 导出 `executeMcpEvaluation`，可嵌入研发服务；`onTrace` 接收执行记录与真实 ID，必须可靠持久化。
- `POST /api/test-lab/runs` 的 `selection.executionMode="mcp"` 启用真实执行；界面负责正常 CSRF 请求流程。
- 工具名称、版本字段、成员 ID、分页、批量原子范围及错误处理见 `skills/shared/production-mcp-contract.md`，基于正式仓库提交 `3dd01c2c42292a168ba6ecb69bf78044070b1125`。
- 任务规划 Skill 及依赖通过 `skills/registry.json` 加载；最终参数始终使用服务端实际 `tools/list` schema。

发布验收必须在指定真实工作区至少完成一次根任务、子任务、完成标准的创建和回读，检查返回 ID、负责人、dueDate 与层级。未配置 MCP 连接时只能完成本地适配测试，不能宣称正式联调已通过。

## MCP 调试模块

打开 `/mcp`（侧栏“MCP 调试”），点击“连接并刷新工具”读取所有分页的 `tools/list`。选中工具可查看描述、必填字段、完整嵌套 inputSchema、outputSchema 和 annotations；填入 JSON 参数后可直接调用，不经过模型。

调试器与真实评测使用同一组 TASKDOOR_MCP_* 配置。参数按最新工具 Schema 校验，工作区限定为配置值。工作区外无范围的写工具不可调用；工作区内操作按真实账号权限执行，可操作已有任务。调用按钮会实际执行选定工具，不是模拟。

每次调用先保存 pending 记录，再发送到 MCP；结果保存在 `data/mcp-debug/<requestId>.json`。重复的同一请求 ID 返回原记录，不重发；失联标记 uncertain，需要核查实际状态。重置参数开始新调用时生成新请求 ID，以及工具支持时的新幂等键。

### 在页面配置 Token

左侧连接区展开“Token 配置”，输入新令牌并保存，无需重启服务；然后刷新工具列表验证。默认使用 `.env.local` / 进程环境的 `TASKDOOR_MCP_TOKEN`（当前已配置值）。留空保留现有值，“恢复默认配置”移除自定义覆盖。

自定义值仅保存在已忽略提交的 `data/mcp-debug/config.json`，文件权限 0600；页面和状态接口只返回是否配置及 default/custom 来源，不回传令牌。调试、真实评测和 `eval:mcp` CLI 使用同一配置。进行中的 MCP 请求和已排队/运行的真实评测结束后才能切换。
