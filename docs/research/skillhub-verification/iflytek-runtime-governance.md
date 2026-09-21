# iFlytek SkillHub：Agent / MCP 运行治理核验

日期：2026-09-14。固定版本 v0.2.20，提交 36de54157bff59c18c5eff255d2c158df45a3e2a。

## 需求结论

**单独承担 Agent / MCP 运行治理：不满足。** iFlytek SkillHub 可以向运行平台提供受管理的技能包与版本信息，但不运行 Agent，不托管第三方 MCP 服务，不接管工具调用链路。将这项需求纳入后，原来的推荐只能适用于技能中心，不能扩大为整个 Agent / MCP 平台的推荐。

| 需求 | 判断 | 已核实事实 |
| --- | --- | --- |
| Agent / MCP 服务登记、搜索与版本 | 不满足 | 当前资源发现接口处理 Skill 和 Skill Suite；Agent profile 是客户端技能安装目录，不是运行中的 Agent 服务注册 |
| Agent 部署、启停与任务运行 | 不满足 | 官方契约把实际技能执行、输入输出、模型调用与工具调用交给外部 Agent Runtime |
| 第三方 MCP 服务托管与统一调用 | 不满足 | 固定版本没有 MCP 服务管理或 MCP 调用代理实现；现有接口服务于 Skill 包的搜索、下载和发布 |
| 运行权限与凭据管理 | 不满足 | 员工身份、命名空间、令牌管理用于访问技能平台；不构成 Agent 调用外部系统、MCP 工具的统一授权与凭据管理 |
| 运行状态、健康监控 | 不满足 | 自身健康接口及指标覆盖 SkillHub 服务、登录、技能发布下载等，不是所托管 Agent/MCP 的运行状态 |
| 调用审计、执行追踪与配额 | 不满足 | 审计记录为技能发布、审核和管理动作；官方明确模型输入输出、工具调用、执行 trace 由 Runtime 负责。现有接口限流不能计为 Agent/MCP 运行配额 |

## 验证方法

本轮读取固定源码和官方 Runtime 集成契约，核对实际控制器、资源查询、审计、指标及 CLI 的调用范围；重新从 GitHub 固定提交获取 Runtime 文档确认边界。未搭建外部 Agent Runtime，未执行真实 Agent 任务或第三方 MCP 工具调用。明确不在产品职责内的能力，以官方契约与实际代码边界判为缺口，不通过重复部署技能服务替代验证。

固定源码证据：

1. [Runtime 职责边界](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/docs/skillhub/guide/runtime-integration.md#L3)：SkillHub 管技能包、版本、合规声明与审核下载；运行平台负责执行、模型、工具及 trace。
2. [资源发现控制器](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/controller/portal/ResourceDiscoveryController.java#L19)：明确服务 Skills 与 Suites，现有搜索限流作用于资源读取。
3. [资源结果映射](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/service/ResourceDiscoveryAppService.java#L31)：映射至 Skill 或 Suite 页面。
4. [平台健康接口](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/controller/HealthController.java#L10)：返回平台存活状态。
5. [平台指标范围](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/metrics/SkillHubMetrics.java#L18)：登录、发布、下载、存储等。
6. [管理审计记录](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-domain/src/main/java/com/iflytek/skillhub/domain/audit/AuditLogService.java#L9)：行政与安全管理操作的记录服务。
7. [运行证据由外部记录](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/docs/skillhub/guide/runtime-integration.md#L70)：平台可用精确技能版本关联外部 trace，但自身不保存执行过程。

README 中提到的 astron-agent、Hermes 等是外部使用方或生态项目；其运行能力不能计入本次 SkillHub 开源版。
