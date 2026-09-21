# kms9/skillhub：Agent 与 MCP 运行治理核验

评估提交：`228c46e1d3eeee3b7464d0f1d77b4f019a602f14`。

**结论：不满足本次新增的 Agent、MCP 运行治理要求。该版本是技能文件注册与分发平台，没有 Agent/MCP 资源模型、部署执行器或调用网关。若要承载这些要求，需新增独立运行平台，不能视为现有功能的简单配置。**

## 需求满足度（可直接写入老板报告）

| 需求 | 结论 | 已核实的实际情况 |
|---|---|---|
| Agent 资源登记、目录与发现 | 不满足 | 现有目录登记 Skill 文件、版本和所有者；没有 Agent 端点、运行实例、Agent Card 或执行任务模型。把 Agent 配置写成 Skill 文档不构成 Agent 管理。[1][2][3] |
| 任意第三方 MCP 服务登记与工具发现 | 不满足 | 没有 MCP 服务注册模型，没有接收第三方 MCP URL/启动参数、连接服务、获取 tools/list 的业务链路。[2][3][4] |
| Agent/MCP 部署、启动、停止、重启 | 不满足 | 后端启动的服务是技能、ZIP、账户和 GitLab 导入服务；没有进程/容器编排器、运行实例生命周期 API。Compose 部署的是 SkillHub 自己的前端、后端和数据库。[5][6] |
| Agent/MCP 统一调用入口与代理 | 不满足 | 现有 Web 代理只把 /api/v1、登录及 discovery 请求转发到固定 SkillHub 后端；没有任意 MCP/Agent 目标路由、协议转换或工具调用代理。[7] |
| 按用户/团队控制运行与工具调用权限 | 不满足 | 已有的用户身份和平台角色用于 SkillHub 的技能发布与账户管理；没有 Agent/MCP 资源、工具级授权及运行凭据 scope。现有 API token 只属于 SkillHub 用户。[2][8] |
| 第三方服务密钥托管、注入与轮换 | 不满足 | 当前配置保存 SkillHub 自己的 OAuth、存储和导入凭据。技能“所需环境变量”只是展示元数据，不负责保存每个 MCP 的秘密、按身份注入运行环境或自动轮换。[9][10] |
| Agent/MCP 健康检查与运行状态 | 不满足 | /api/v1/health 直接返回 {status: ok}，检查的是平台 HTTP 端点；没有目标 MCP 探测、工具就绪检查或 Agent 运行状态采集。[11] |
| 工具调用审计、用量与追踪 | 不满足 | Go 服务有一般 HTTP/应用日志和 Skill 下载/安装统计；没有第三方调用执行链路，自然也没有请求级工具调用、运行结果、消耗及调用者审计。历史 Convex auditLogs 不等同于当前 Go 服务的调用治理。[3][5][12] |
| 按用户/服务限流、配额与熔断 | 不满足 | CLI 读取上游 429 和 Retry-After 后退避重试，属于客户端行为；未见当前 Go 服务按 Agent/MCP/工具执行限流或配额。历史 Convex rateLimits 也不是运行网关。[5][12][13] |

## 容易误读的功能名称

- **“Agent Skill Registry”中的 Agent 修饰 Skill**：作者介绍明确定位为文本技能包的发布、搜索、安装和版本管理，不代表它是可运行 Agent 的注册中心。[1]
- **没有核实到平台自己的 MCP 服务接口**：当前固定源码的运行入口与路由也没有 `/mcp` 或其他 MCP 协议实现。因此，这里不仅是“不管理第三方 MCP”，也不能宣称“已通过自带 MCP 对 AI 客户端提供访问”。仅有 HTTP API、CLI 和技能文件。
- **Web API proxy**：目标是单一 `BACKEND_URL`，代理平台自己的接口；不是可登记第三方目标的 MCP Gateway。[7]
- **CLI 代码中的 `Agent` / `EnvHttpProxyAgent`**：这是 Undici HTTP 连接/网络代理客户端，不能作为 AI Agent 执行器证据。[14]
- **运行要求、环境变量和依赖**：界面显示了技能要求的命令、环境变量名称和安装提示，没有实际分配运行环境、注入密钥或持续管理进程。[9]
- **health**：只返回固定 JSON，不检查任何已登记的第三方服务。[11]
- **auditLogs / rateLimits**：出现在作者标为“历史 / 兼容代码”的 `convex/` 目录。当前 Compose 启动 Go 后端，其入口没有装载 Convex 作为运行控制平面；即便考虑历史逻辑，也没有 MCP/Agent 调用链可供审计和限流。[1][5][6][12]

## 验证层级与范围

**层级：固定版本源码核验，已完成。不是企业运行环境端到端测试。**

本次直接复用原始 GitHub 固定提交压缩包，扫描并核对 457 个原始源码/配置/文档文件，排除了前序验证安装的 node_modules、生成 dist 与本地测试脚本。随后逐项阅读：

1. Go 程序启动入口与注入服务；
2. 全部 61 条 Go 路由声明（包括账户、技能、导入及健康检查）；
3. Go 模型及 PostgreSQL 表/迁移；
4. 前端 SSR 代理、CLI 命令和技能元数据界面；
5. Docker Compose 实际启动拓扑；
6. 容易混淆的历史 Convex 审计/限流代码。

原始业务源码中 MCP / Model Context Protocol / tools/list / tools/call / JSON-RPC 等协议检索为 0 命中；Agent/MCP 运行生命周期关键词为 0 命中。**判断依据同时包括完整运行路径与数据模型核查，不只依靠关键词未命中。** 原始文件清单搜索、命中证据与路由清单保存在同目录 `runtime-governance-evidence.json`。

这些功能在该版本没有产品实现，继续搭建数据库或使用企业账号不能验证出不存在的模块。因此应写“未实现 / 不满足”，无须留成“待验证”。前序实际 CLI 安装、更新、回退验证证明的是技能文件分发，不扩展为 Agent/MCP 运行能力。

## 对选型的影响

新增运行治理后，kms9/skillhub 更不适合作为统一平台候选。它既有前序核验确认的私有内容保护、品牌素材分发和 CLI 协议问题，也没有本轮新增运行控制能力。若保留该候选，其定位只能是技能文件目录原型；不宜再描述为“可快速二开成为 Agent/MCP 统一治理平台”。

## 一手源码与文档（固定提交）

[1]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/README.zh-CN.md#L5-L12
[2]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/handler/routes.go#L18-L108
[3]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/model/skill.go#L11-L48
[4]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/handler/wellknown.go#L12-L26
[5]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/cmd/server/main.go#L49-L99
[6]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/docker-compose.yml#L1-L66
[7]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/server/middleware/api-proxy.ts#L13-L63
[8]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/model/user.go#L56-L63
[9]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/src/components/SkillInstallCard.tsx#L10-L98
[10]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/config/config.go#L32-L83
[11]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/handler/wellknown.go#L58-L61
[12]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/convex/schema.ts#L484-L533
[13]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/http.ts#L237-L269
[14]: https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/http.ts#L31-L48

历史目录说明另见：[README 仓库结构](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/README.zh-CN.md#L64-L74)。
