# Skilly：Agent / MCP 运行治理核验

核验日期：2026-09-14。对象：`scalefocus/skilly` v1.151.0，固定提交 `225eeeb6f076c8f726a2e47f2c7b389b9e49b400`。结论基于该提交的完整公开源码、官方规格，以及实际执行的局部模块检查。未部署公司环境，未使用公司身份或任何真实模型凭据。

## 可直接写入报告的结论

**Skilly 适合企业 Skill 发布、分发与权限治理，不能作为 Agent 和第三方 MCP 服务的统一运行治理平台。** 它提供自有 MCP 接口，让已获授权的 Agent 检索、读取、安装或提交 Skill；并没有因此获得托管其他 MCP 服务、部署 Agent 或观察其实际执行的能力。将“有 MCP 接口”计作“可统一治理 MCP 服务”会高估产品。

以下六项均以**外部 Agent / 第三方 MCP 服务**作为治理对象。满足度填写“不满足”，不再写“待验证”；Skilly 自身已有的功能在说明中保留。

| 需求 | 满足度 | 已确认的功能边界 |
| --- | --- | --- |
| Agent / MCP 统一登记与发现 | 不满足 | 目录登记的是 Skill。`tool_harness` 是 Skill 的目标客户端标签，`oauth_clients` 是访问 Skilly 的 OAuth 客户端授权记录；都不是可运行 Agent 或 MCP 服务目录。自身 MCP 暴露固定 24 个 Skill 相关工具和 Skill 文件资源。 |
| Agent 部署运行 | 不满足 | `install_skill` 返回安装命令，由外部 Agent 的 shell 执行。Skilly 不负责模型调用、Agent 进程启动、任务执行、持续运行或实例生命周期。部署配置部署的是 Skilly 自身。 |
| 第三方 MCP 托管与统一调用 | 不满足 | 自身 `/mcp` 对固定工具进行本地分发；未知工具明确拒绝。没有供管理员登记任意上游 MCP endpoint、启动其服务并统一代理调用的现成功能。 |
| 运行权限与凭据 | 不满足 | 具备访问 Skilly 自有 MCP 的 OAuth、用户权限、授权撤销、客户端封禁及 Skill 安装令牌；这些凭据不负责向第三方 MCP / Agent 注入密钥、管理其服务身份或控制其业务执行权限。自身 MCP v1 也没有 client-credentials 机器授权路径。 |
| 运行状态与日志 | 不满足 | `/healthz`、`/readyz` 和 Prometheus 指标观察的是 Skilly worker / 数据库及自身请求；不是第三方 MCP 服务的健康状态、Agent 实例状态或执行日志。 |
| 调用审计与用量 | 不满足 | 具备自身 MCP 工具调用计数、部分写操作审计、鉴权/限流失败记录及每用户/客户端限流；不覆盖第三方 MCP 的调用链、Agent 模型 token / 成本或业务执行用量。不能承诺每次 Skill 读取均有逐请求审计。 |

若另设“Agent 通过 MCP 使用 Skill”这一行，可写：**满足——已具备自有 MCP 服务，提供 Skill 检索、内容读取、安装命令及提案功能，并带权限控制和限流。** 该行不能替代上述运行治理需求。

## 一手证据与明确边界

1. **产品自身界定的是 Skill registry。** 官方规格 §29 说明 MCP 用于 Agent 消费注册中心，安装动作由外部 Agent 执行；既不是 CLI，也不是通用 API 网关。[规格说明](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/SKILLY_SPEC.md#L3073)。实际初始化响应同样将自身描述为 Skill registry；工具调用在固定清单中校验名称后才执行本地 `callTool`，未知名称返回错误。[server.ts 第 120–193 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/mcp/server.ts#L120)。

2. **“Agent 列表”和“MCP 客户端列表”不能误当服务资产目录。** Agent 数据结构只有 slug 与 label，明确用于 `npx skills add --agent` 安装目标；没有 Agent 镜像、模型、启动命令、实例状态等运行对象。[agents.ts 第 1–21 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/shared/src/agents.ts#L1)。`oauth_clients` 保存客户端标识、名称、回调地址、封禁和最近使用时间，注释明确属于访问本服务的 OAuth Dynamic Client Registration；不是被托管的 MCP server 配置。[数据库迁移第 19–81 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/db/migrations/0063_mcp_oauth.sql#L19)。

3. **可调用能力封闭在 Skill 业务内。** 24 个工具由读 6、安装 4、提案 9、互动 5 构成；资源模板只有 `skilly://skill/...`，不是任意上游服务或 Agent 资源。[mcp.ts 工具清单](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/shared/src/mcp.ts#L22)、[服务资源处理](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/mcp/server.ts#L197)。这些是读取完整接口与数据模型后的边界判断，并非仅凭关键词搜索未命中。

4. **安装不等于 Agent 运行。** `mintInstall` 生成 Skill 范围令牌并返回 `buildInstallCommand(...)` 字符串，不启动客户端，不执行 Agent。[installs.ts 第 54–89 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/mcp/installs.ts#L54)。源码里的 tool/harness 是目标客户端枚举，不能当成生产 Agent runtime；任何 Skill 验证、扫描、示例或测试脚本也不构成实例运行治理。

5. **权限功能真实存在，但作用域是本平台。** `authenticate` 检查令牌哈希、授权撤销、客户端封禁、用户活跃状态和令牌过期，再读取当前用户组权限；角色映射默认有 30 秒缓存。[auth.ts 第 66–151 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/mcp/auth.ts#L66)。官方明确自身 MCP v1 没有 client-credentials / 无浏览器机器路径，headless 使用的是另外的系统 Skill 安装路径。[规格第 3150 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/SKILLY_SPEC.md#L3150)。不应将此写成第三方运行服务密钥管理。

6. **监控对象是 Skilly。** `/healthz` 直接返回 ok，`/readyz` 执行数据库 `select 1`；`/metrics` 输出平台指标。[index.ts 第 418–435 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/index.ts#L418)。MCP 指标是本服务工具调用、读取、授权、拒绝和安装令牌生成等计数。[metrics.ts 第 16–25 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/metrics.ts#L16)。

7. **审计与限流不能扩大解释。** 写操作有带 MCP 来源的审计插入。[writes.ts 第 52 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/mcp/writes.ts#L52)。实际 `recordMcpAdoption` 只由 SKILL.md 读取调用，Bundle 文件读取不走此记录；SQL 发现此前已经采用该 Skill 就直接返回，首次采用才插入 `access_log`。因此不能声称“每一次读取都有完整请求审计”。[content.ts 第 142–159 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/mcp/content.ts#L142)、[SQL 第 95–115 行](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/db/migrations/0063_mcp_oauth.sql#L95)。限流是本进程内存固定窗口，以用户及用户×客户端为键，安装工具为每分钟 30 次；多实例没有共享计数存储。[rateLimit.ts](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/mcp/rateLimit.ts#L1)。

## 已实际执行的验证

使用 Node.js v24.19.0 与 esbuild，将固定版本原始 TypeScript 直接编译后执行；未改动产品源码，没有完整部署和全量测试。

```sh
cd /private/tmp/skillhub-verification/skilly/verification-runtime
/Users/yxzuji/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node build-governance.cjs
/Users/yxzuji/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test runtime-governance.test.mjs mcp-original.test.mjs
```

结果：**17 项通过，0 项失败**，约 115 ms。包括原项目 9 个 MCP 共享协议测试与新增 8 个核验用例：

- 实际工具清单长度 24；只接受 Skill 资源 URI，不接受 HTTPS 上游 MCP URI 或 `skilly://agent/...`。
- 原始鉴权函数接受合成的有效用户；SQL 查询参数使用令牌哈希。缺少令牌、过期、撤销、客户端封禁、用户停用五类拒绝均通过。
- 原始限流函数允许 30 次安装，第 31 次拒绝；同一用户换客户端仍被拒绝，其他用户不受该用户额度影响。

局部鉴权测试采用项目自带 fakePool 注入合成数据库记录，验证的是实际鉴权分支；未声称完成 Entra 登录、数据库端到端或多副本压力测试。17 项测试不证明第三方运行治理存在，恰好确认的是已声明的自有 MCP 边界。

可复核文件：

- `verification-runtime/runtime-governance.test.ts`：8 个局部核验用例。
- `verification-runtime/build-governance.cjs`：编译命令。
- `verification-runtime/runtime-governance-test-result.txt`：完整执行输出。
- `packages/shared/src/mcp.test.ts`：实际运行的 9 个原项目测试。

## 验证层级与剩余条件

上述“是否具有外部 Agent / MCP 运行治理”已经能够依据产品实现给出明确结论，不需要公司登录或真实环境才能判断。公司环境中的身份适配、域名可达和部署验收属于采用该平台后的集成验证，不能将不存在的运行治理功能笼统写成等待这些条件验证。若建设目标同时要求 SkillHub 和统一运行治理，Skilly 单独不满足全部选型目标，需另选具备运行平台能力的产品或明确组合架构。
