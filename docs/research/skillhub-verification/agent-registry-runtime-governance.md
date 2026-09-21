# Agent Registry：Agent / MCP 运行治理核验

日期：2026-09-14。评估对象：开源 v0.4.0，固定提交 `aef65635f1dd71ecb279218a04b948801a801f84`。本轮复用已取得的固定源码；已加载并沿用 web-access 工作流，通过公开官方页面交叉核对商业版边界。

## 面向选型的判断

**Agent Registry 应提升为 Agent / MCP 管理组件候选，但不能代替当前推荐的技能中心，也不能以其开源版单独覆盖完整运行治理。**

它的实际优势是统一资源目录、版本引用和部署生命周期：登记 Agent/MCP，选择版本与运行环境，创建或撤下部署，接入外部执行环境。员工 SSO、内部 Skill 免 VPN 分发的问题并未因此解决。运行权限、集中凭据、调用审计和用量控制也不是开源版开箱即有的完整能力。

建议报告的结论表述：**iFlytek SkillHub 继续作为技能中心首选；Agent Registry 进入 Agent/MCP 组件候选。若同时要求技能分发与完整 Agent/MCP 运行治理，目前这四款开源产品不能由其中一款单独满足全部要求。** 本记录只对 Agent Registry 作证，其他三款的缺口应引用各自核验。

## 按报告的六行需求给出的满足度

| 需求 | 满足度 | 可直接使用的说明 |
| --- | --- | --- |
| Agent/MCP 统一登记发现 | 满足 | 已有 Agent、MCPServer 统一目录、标签版本、列表/标签筛选、CLI/API/Web 管理及 MCP Registry 兼容接口。这里是目录中的登记与发现，不等于自动发现各云中的所有运行实例。 |
| Agent 部署与运行 | 部分满足 | 已实现部署、更新目标版本和撤下流程；内置 Local Docker Compose、Kubernetes 适配器。实际执行依赖 Docker 或已安装 kagent/kmcp 的集群；不能把登记成功或 Apply 返回 Progressing 当作已经健康运行。 |
| 第三方 MCP 托管与统一调用 | 部分满足 | 可登记 npm/PyPI/OCI MCP 包并交给运行环境启动，也可登记已运行的远程 MCP。本地模式已有 agentgateway 聚合 `/mcp` 及 Agent 路由；带统一权限策略的企业 virtual gateway 不计入 OSS 现成能力。登记远程地址不代表接管远程服务生命周期。 |
| 运行权限与凭据 | 部分满足 | Kubernetes MCP 部署可引用运行环境中的 Secret；本地适配器明确拒绝 envFrom。OSS 认证/授权默认开放，未自带员工身份与运行调用权限闭环；Model 的 SecretRef 仅保存/校验引用而不解析密钥。需配置外部身份、网关策略和凭据组件。 |
| 运行状态与故障日志 | 部分满足 | 已有 Deployment 状态、错误、观察代次与生命周期记录；默认适配器 Apply 返回 Progressing。Local 和 Kubernetes 的 Logs 函数明确未实现并返回关闭通道，不能列为已具备统一故障日志；持续健康检查应由运行环境补足。 |
| 调用审计与用量控制 | 不满足 | OSS 的 Auditor 默认为空实现，事件是资源版本创建；默认指标是 Registry HTTP 请求与服务健康。没有现成的调用级审计、按员工/部门配额与成本闭环；需外接调用网关及观测/计量系统，或另评企业产品。 |

## 已确认的实现与精确证据

### 1. 统一目录与版本

- [Agent 类型与 AgentSpec](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/agent.go#L3-L55)：Agent 注册为目录资源，可引用 MCP 等资源。
- [MCPServer 的 package / remote 两种来源](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/mcpserver.go#L15-L54)：Remote 明确是已存在的服务，不由 registry 部署；package 是可运行发行物。
- [MCP 包来源类型](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/mcpserver.go#L67-L114)：npm、PyPI、OCI，并分别有版本输入。
- [ObjectMeta.Tag](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/object.go#L65-L81) 与 [ResourceRef.Tag](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/ref.go#L3-L16)：目录版本与引用存在；省略 tag 时解析 latest。
- [统一 API 的列表条件](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/registry/resource/handler.go#L266-L276)：namespace、label、tag、分页、latest。
- [MCP Registry 兼容接口](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/api/router/v0.go#L141-L162)：将 MCPServer 目录转换为标准 `/v0.1/servers` 读取接口。

### 2. 部署启停与外部运行时

- [默认注册的两个运行适配器](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/registry_app.go#L94-L109)：Local 和 Kubernetes；其他类型需要扩展适配器，不能把企业 AWS/Azure 能力套入。
- [Deployment 的 deployed / undeployed 状态与目标/运行时引用](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/deployment.go#L43-L81)：支持显式生命周期意图，targetRef 可带版本；这里的“停”是撤下 workload，不是冻结一个内存会话后恢复。
- [Controller 调用真实 Apply/Remove](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/controller/reconciler.go#L76-L156)：解析目标与运行环境、比对配置指纹、下发与持久化结果。
- [Local Apply / Remove](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/local/adapter.go#L43-L124)：产生 Compose 配置并调用实际 Compose 上下线逻辑。
- [Kubernetes Apply / Remove](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/kubernetes/adapter.go#L16-L117)：转换/应用 kagent/kmcp CRD，撤下时按部署标记删除相应资源。
- [Kubernetes Agent 实际生成 kagent BYOAgentSpec](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/kubernetes/runtime.go#L327-L354)。这是对外部 kagent 的适配，不是 Registry 进程直接执行 Agent。

### 3. 统一代理的准确边界

- [本地 gateway 生成逻辑](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/local/runtime.go#L409-L513)：将 remote/local MCP 组成同一路由的 targets；Agent 路由使用 `/agents/...` 和 A2A 配置；监听默认 HTTP。
- [单一 `/mcp` 路由及 targets](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/local/runtime.go#L484-L513)：基本聚合代理有实际配置生成实现。
- [gateway 容器的独立镜像和配置卷](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/local/runtime.go#L296-L315)：执行调用的是外部 agentgateway 进程。
- [Policy 类型包含 JWT、外部授权、限流等字段](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/types/agentgateway_types.go#L67-L85)，但默认生成 MCP 路由未配置这些策略。**有数据结构可承载策略，不等于已有公司用户策略编排和执行闭环。**
- 当前[官方 OSS/Enterprise 对照](https://docs.solo.io/agentregistry/latest/about/oss-enterprise/)将受控 virtual gateway、运行权限及 MCP traffic policies 列为企业版能力。这与 OSS 本地基础聚合不矛盾：两者的权限治理范围不同。

### 4. 权限、密钥与审批

- [默认 Authn 空、Authz 使用 Public](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/registry_app.go#L62-L72)；[Public 授权所有动作](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/registry/auth/authz.go#L50-L66)。
- [运行环境 Secret 引用的定义](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/deployment.go#L104-L115)：是 Kubernetes namespace 中的 Secret，不是 Registry 自带凭据仓库。
- [Local 明确拒绝 envFrom](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/local/adapter.go#L57-L65)；[Kubernetes MCP 把 EnvFrom 下传到运行配置](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/kubernetes/adapter.go#L142-L156)。
- [Model SecretRef 仅保存结构，不解析](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/model.go#L59-L90)。
- [OSS ProductionAdmission 直接写入正式 Store](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/registry/resource/core.go#L130-L176)；扩展 Admission 不等于自带审批队列。
- [企业版访问控制说明](https://docs.solo.io/agentregistry/latest/security/overview/)与[企业版审批说明](https://docs.solo.io/agentregistry/latest/security/approval/)可佐证身份/策略/审批的发行版边界；本轮没有企业版运行验证。

### 5. 状态、健康与日志

- [Local Apply 返回 Progressing](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/local/adapter.go#L78-L96)；[Kubernetes Apply 返回 Progressing](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/kubernetes/adapter.go#L66-L84)。不能从这里宣称 Running/Ready。
- [Controller 保存适配器返回的状态](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/controller/reconciler.go#L297-L315)：有模型和记录，不自动证明真实运行实例健康。
- [Local Logs 未实现，直接关闭通道](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/local/adapter.go#L127-L133)。
- [Kubernetes Logs 未实现，直接关闭通道](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/runtimes/kubernetes/adapter.go#L119-L125)。
- [运行实例 discovery 是可选适配器接口](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/controller/discovery.go#L104-L117)：不是目录列出一个资源就自动具备外部实例健康探测。

### 6. 调用审计、限流、配额、成本

- [Auditor 接口及默认 Noop](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/types/types.go#L147-L168)：这里只有 ResourceTagCreated，并非每次 Agent/MCP 工具调用记录。
- [默认 Metrics 的全部四项](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/telemetry/metrics.go#L23-L81)：Registry HTTP 请求数/耗时/错误数/服务健康，不是模型 token、工具调用、用户配额或成本账单。
- [Runtime telemetryEndpoint 仅下发 OTLP 地址](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/runtime.go#L29-L38)：可衔接观测后端，但不是已经配置的调用链存储、查询或计费。
- [官方企业版 tracing](https://docs.solo.io/agentregistry/latest/observability/tracing/)说明配套 OTel Collector、ClickHouse、UI trace 查询。这是另一产品发行版能力，需要额外部署且依赖工作负载埋点。
- [官方企业 MCP gateway 限流示例](https://docs.solo.io/agentregistry/latest/quickstart/mcp-gateway/)明确要求 Solo Enterprise for agentregistry + Solo Enterprise for agentgateway，策略下发到网关，不能据此把 OSS Registry 判为开箱支持。
- 成本/配额不能由“支持 Prometheus/OTel”推出。此固定 OSS 的原生接口/状态/默认计量范围不能形成调用级用量与成本闭环；这项判不满足，无需写成模糊待验证。

## 验证层级与未做事项

本轮为 **固定版本源码路径核验 + 官方当前文档交叉佐证**：检查了服务实际注册的运行适配器、目录路由、生命周期控制器、配置生成、状态持久化、日志函数、凭据引用、审计默认实现和指标定义。不是只根据 README 营销描述判断。

没有运行 Docker/Kubernetes 服务，没有实际部署第三方 Agent/MCP，没有调用模型、产生业务费用或修改任何外部系统；也没有把替身运行环境或静态状态当作运行成功。缺少此类端到端测试不影响“适配器已有实现”“日志明确未实现”“默认审计为 Noop”等确定判断，但不应在报告中写“已完成 Agent/MCP 运行验收”。本轮不新增镜像拉取或全量测试，避免为前期预研启动不必要的基础设施。

前一轮普通文件复制和固定 commit 的真实 Git 局部测试已记录在 `verification-findings.md` / `test-results.txt`；这些测试不覆盖本轮 Agent/MCP 的运行生命周期，不得混用验证层级。
