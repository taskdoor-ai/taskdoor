# Agent、MCP 管理与运行治理：专项核验

日期：2026-09-14。版本沿用主报告中的四个固定提交，仅比较开源版。对应[选型报告](../2026-09-14-internal-skillhub-selection-report.html)。

## 扩展能力参考

本记录保留产品扩展能力的核验事实，Agent、MCP 运行治理不属于本次建设要求，不参与技能平台必需项判断。iFlytek SkillHub 仍为内部技能平台的推荐方案。它不执行 Agent、不托管第三方 MCP，也不记录实际工具调用过程。kms9 同样没有运行治理能力；Skilly 提供自身技能功能的 MCP 接口，但不管理第三方 Agent/MCP 服务。

Agent Registry 的开源版具有真正的 Agent/MCP 资源模型、版本目录和部署适配器，可作为了解产品扩展能力的参考。其日志、运行权限、调用审计和配额仍不完整，不能直接认定为企业运行治理平台。

本次选型围绕公司技能管理与分发，继续推荐 iFlytek。下表对比的是产品额外能力，不代表公司需要建设对应运行平台，也不构成新增组件推荐。

## 需求满足度

| 需求 | iFlytek | kms9 | Skilly | Agent Registry OSS |
| --- | --- | --- | --- | --- |
| Agent/MCP 统一登记与发现 | 不满足 | 不满足 | 不满足：自身技能 MCP 不是第三方目录 | 满足：资源目录、版本与引用 |
| Agent 部署与运行 | 不满足 | 不满足 | 不满足 | 部分满足：本地容器、Kubernetes 适配，执行依赖外部环境 |
| 第三方 MCP 托管与统一调用 | 不满足 | 不满足 | 不满足：仅提供自身技能工具 | 部分满足：包部署、远程登记、本地网关聚合 |
| 运行权限与凭据 | 不满足 | 不满足 | 不满足：不能覆盖外部 Agent/MCP | 部分满足：可引用部分外部 Secret，员工及工具权限不完整 |
| 运行状态与故障日志 | 不满足 | 不满足 | 不满足：只有自身服务监控 | 部分满足：有状态模型，内置适配器日志未实现 |
| 调用审计与用量控制 | 不满足 | 不满足 | 不满足：仅自身 MCP 访问治理 | 不满足：缺调用级审计、团队配额与成本管理 |

“不满足”针对表中指定的外部 Agent/MCP 管理范围，不否定各平台已有的技能权限、技能工具或自身 HTTP 日志。“满足”也不表示已完成公司运行环境验收。

## 四款产品的证据边界

**iFlytek：** 官方 Runtime 契约明确：平台维护技能包与版本，实际执行、模型与工具调用、执行 trace 属于外部运行平台。资源发现接口只处理 Skill 与 Suite；健康、指标、审计服务覆盖技能平台自身。因此不能从“Agent 安装目录”“支持审计”“提供运行时部署脚本”等名称推导出 Agent 运行治理。

详细记录：[iFlytek 核验与固定源码](iflytek-runtime-governance.md)。关键来源：[官方职责边界](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/docs/skillhub/guide/runtime-integration.md#L3)。

**kms9：** 核对原始文件、全部 Go 路由、程序入口、模型、数据库与部署配置后，确认没有 Agent/MCP 资源、执行器或网关。Web proxy 转发的是固定 SkillHub 后端；Undici Agent 是 HTTP 网络客户端；健康端点返回平台存活状态。历史 Convex 审计与限流不是当前 Go 服务的 Agent/MCP 治理实现。

详细记录：[kms9 核验与固定源码](kms9-runtime-governance.md)、[原始检索与路由范围](kms9-runtime-governance-evidence.json)。关键来源：[运行服务入口](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/cmd/server/main.go#L49)、[实际路由](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/handler/routes.go#L18)。

**Skilly：** 自带 MCP 对外暴露的是技能目录、读取、安装和提案工具。OAuth 客户端记录代表谁可以接入 Skilly，而不是由它托管的第三方 MCP 服务。自带 MCP 的权限、访问记录和限流有实际实现，但不构成跨 Agent/MCP 服务的运行治理。

实际执行其 MCP 共享协议与鉴权、限流局部检查，17 项通过；这些测试只覆盖自身技能 MCP，不代表第三方运行治理。

详细记录：[Skilly 核验与固定源码](skilly-runtime-governance.md)、[17 项原始测试输出](skilly-runtime-governance-test-results.txt)。

**Agent Registry：** Agent、MCPServer、Deployment、Runtime 是实际资源类型。内置 Local Docker Compose 与 Kubernetes 适配器，有应用及撤下部署、本地网关聚合和远程 MCP 地址登记。远程登记不会接管第三方服务生命周期；容器或集群负责真实执行。默认认证/授权开放，Secret 引用不等于内置凭据仓库，适配器返回 Progressing 不等于业务已就绪。

两种内置适配器的 Logs 方法均明确未实现，默认 Auditor 为空，基础指标是 Registry HTTP 请求。企业版的受控网关、运行权限、集中追踪和审计不能计入本次 OSS。

详细记录：[Agent Registry 核验与固定源码](agent-registry-runtime-governance.md)。关键来源：[资源与部署模型](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/deployment.go#L43)、[本地部署与未实现的日志](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/local/adapter.go#L43)、[本地网关配置](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/local/runtime.go#L409)、[官方 OSS 与企业版边界](https://docs.solo.io/agentregistry/latest/about/oss-enterprise/)。

## 验证层级

本轮完成固定源码的具体执行路径核查与官方资料交叉确认；各项是否具备实现已有明确判断。没有在公司环境部署 Agent 或第三方 MCP，没有执行模型任务或外部业务操作。此前 Skill 下载、脚本、版本切换测试不被复用为 Agent/MCP 运行成功证据。

源码明确没有实现的日志或调用审计，可以直接判为缺口；源码中存在部署适配器，可以确认其产品基础，但不能据此宣称实际部署已完成运行验收。专项模块检查的具体范围见各产品记录。
