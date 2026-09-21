# SkillHub 技术选型验证记录

本轮矩阵更新：Skilly、Observal 已列在 iFlytek 后方；Observal 八项需求采用同一判定口径，依据见 [Observal 核查](observal-assessment.md)。安装函数检查与整套服务运行核验分别记录；五款产品的最新 Star 见 [矩阵快照](matrix-community-snapshot.json)。

候选范围补充：以企业内部 Skill 管理为前提，iFlytek 与 Skilly 为直接同类产品；Observal 的独立 Skill 管理部分保留为相关综合平台候选。ClawHub 与单独安装工具不列入主要备选，见[候选范围复核](candidate-scope-review.md)。原有功能结果保留，不把资料筛选视为完整运行核验。

验证日期：2026-09-14。对应[技术选型报告](../2026-09-14-internal-skillhub-selection-report.html)。

结论：推荐 iFlytek SkillHub 作为内部技能平台。本报告聚焦 Skill 的身份接入、管理、分发、版本与权限能力，以下记录提供相应的验证依据。

技能中心的通用 OIDC、首次建号、独立分发、版本切换及私有包访问拒绝有正式服务运行证据；真实明道云接入和公司场景验收尚未执行。

SSO 项按“接入明道云员工身份”评价：已有通用 SSO 但仍需编写明道云适配代码的，统一标为“二开可满足”。iFlytek、kms9、Skilly 均适用，不能因已有其他身份源的登录就标为“满足”。官方文档、接入方向及各产品判断见[明道云 SSO 接入能力判定](mingdao-sso-assessment.md)。

四款产品现已按同一套“满足 / 二开可满足 / 不满足”口径评价，具体调整与依据见[统一判定说明](unified-assessment.md)。各产品原始笔记保留原版运行现象和缺陷；当前需求定义与最终判断以主报告及统一判定说明为准。

iFlytek 与 Skilly 的核心技能分发、权限和版本能力都满足。当前倾向 iFlytek 的依据是通用身份接入后的自动建号流程，较少依赖预先同步员工目录；Skilly 已有用户与权限组同步，组织同步基础更完整。推荐基于当前需求优先级，不代表 iFlytek 全面更强，也不是经过实际适配后得出的成本结论。若组织同步成为首要要求，或维护团队主要使用 TypeScript，则优先考虑 Skilly。

## 验证方式与边界

| 项目 | 固定版本 | 本次实际执行 |
| --- | --- | --- |
| iFlytek | v0.2.20 / 36de541；CLI 0.1.12 | 正式服务 Docker 镜像 + PostgreSQL 16 + Redis 7 + 本地存储；标准测试 OIDC 身份源；实际 CLI 安装与升级模块 |
| kms9 | 228c46e | 实际 CLI 连接隔离 HTTP Registry；原始上传筛选、回调页面及发布响应校验器；后端路径读取固定源码 |
| Skilly | v1.151.0 / 225eeeb | 实际归档提取、Git 分发及授权函数；真实 skills 1.5.10 安装工具；用户、存储依赖使用测试数据 |
| Agent Registry | v0.4.0 / aef6563 | 原始 Go 拉取、复制函数与真实本地 Git；6 个顶层定向测试；服务端默认权限读取固定源码 |

所有样本身份和技能包均为测试构造，不包含真实员工、公司凭据或内部品牌资产。安装输出写入临时目录，没有安装到日常个人 Skills 目录。仅运行与选型问题直接相关的检查，未运行各仓库全量测试。

JSON 中的 passed=true 表示预设断言成立；其中包含“应拒绝的请求确实被拒绝”及“已复现缺陷”的断言，不表示产品所有能力均通过。各产品验证深度不同，不能把协议测试或函数运行称为整套产品部署验收。

## iFlytek：正式服务结果

实际镜像：ghcr.io/iflytek/skillhub-server:v0.2.20。

镜像 digest：sha256:987475c5bb767572f01671bdd826361da32a84b013f4e4578f0a2c7561bc6677。

镜像 OCI revision：36de54157bff59c18c5eff255d2c158df45a3e2a，与报告固定源码一致。测试服务只在本机 127.0.0.1:18880 提供入口，数据库及 Redis 未暴露宿主端口。

| 验证内容 | 结果 | 原始记录 |
| --- | --- | --- |
| 标准 OIDC 首次登录 | 授权码流程完成，HTTP 200；新建 1 个 ACTIVE 用户，默认 USER / global MEMBER，自动创建个人空间；无本地密码记录 | [OIDC 结果](iflytek-oidc-results.json) |
| 重复登录与昵称变化 | 相同 provider + sub 对应相同用户；用户、绑定仍各 1 条；昵称更新，权限保留 | [OIDC 方法与源码](iflytek-oidc-notes.md) |
| 含字体包发布 | 原生 CLI 返回“警告需要确认”；网页发布接口传 confirmWarnings=true 后成功。实际只验证网页对应 API，没有进行网页点击流程 | [运行结果](iflytek-runtime-results.json) |
| 完整包安装 | SKILL.md、参考 MD、PNG、SVG、真实 WOFF2、CSS、Python、manifest 共 8 个文件；三类客户端目录均逐文件 SHA-256 一致 | [文件清单与摘要](iflytek-runtime-results.json) |
| 脚本及相对引用 | 安装后的 Python 脚本执行退出 0，输出 brand-assets-ok | [运行结果](iflytek-runtime-results.json) |
| 版本更新与回退 | 实际 UpgradeService 从 1.0.0 到 2.0.0，文件 8→9；强制指定 1.0.0 重装回退，文件 9→8，新增文件被删除 | [运行结果](iflytek-runtime-results.json) |
| 私有包访问控制 | 匿名、已登录非所有者下载均 403 | [权限记录](iflytek-lifecycle-results.json) |
| 平台停用用户 | 停用前旧令牌访问 200，管理接口将用户设为 DISABLED 后，同一令牌访问 401 | [停用记录](iflytek-lifecycle-results.json) |
| 注册入口 | 默认本地注册 API 返回 200，说明公司部署需要明确限制准入 | [注册记录](iflytek-lifecycle-results.json) |

安装验证直接调用固定源码中的 InstallService、UpgradeService、ResolveInstallTargets 和 SkillHubClient，连接正式 Spring 服务；没有把手工复制文件当作 CLI 安装成功，也没有声称整个 CLI 命令入口已逐项测试。归档使用自建样例技能包；客户端验证覆盖文件安装及样例脚本，没有启动 AI 模型执行真实设计任务。

补充源码核对：网页发布页会识别发布警告并弹出确认窗口，确认按钮调用 publishSkill(true)。因此“网页确认发布”同时有前端实现和服务接口测试依据；本次仍未进行网页点击测试。[网页确认逻辑](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/web/src/pages/dashboard/publish.tsx#L128)、[确认按钮](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/web/src/pages/dashboard/publish.tsx#L282)。

本次技能可见性为 PRIVATE，扫描服务关闭。共享的 PUBLIC / NAMESPACE_ONLY 发布在源码中要求扫描服务开启，因此私有包测试不能替代共享扫描、审批和完整组织权限流程。审核能力来自源码核验，本轮未执行共享发布全流程、备份恢复或性能测试。

固定源码依据：

- [文件扩展警告](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-domain/src/main/java/com/iflytek/skillhub/domain/skill/validation/SkillPackageValidator.java#L90)
- [发布警告确认及扫描条件](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-domain/src/main/java/com/iflytek/skillhub/domain/skill/service/SkillPublishService.java#L389)
- [共享可见性的扫描要求](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-domain/src/main/java/com/iflytek/skillhub/domain/skill/service/SkillPublishService.java#L632)
- [网页发布 API 的确认参数](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/controller/portal/SkillPublishController.java#L50)
- [CLI 发布传入不确认警告](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/service/cli/CliSkillAppService.java#L175)
- [CLI 实际安装与替换目录](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/cli/src/services/install-service.ts#L112)
- [CLI 登录依赖已有令牌](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/cli/src/services/auth-service.ts#L13)

## 其他候选的确定结果

**kms9：** 指定版本安装、更新、回退及文本资源传输通过。实际上传筛选丢弃 PNG / WOFF2，后端还限制 SVG / CSS。Web 授权将 token 写入 query，CLI 回调仅读取 fragment，原始回调页运行失败，fragment 正向对照成功。后端发布成功字段为字符串 true，CLI 校验器要求布尔 true，已复现拒绝。公开读取和停用检查缺口由源码确认。

- [方法、缺陷与固定源码定位](kms9-notes.md)
- [安装、文件及发布响应记录](kms9-cli-results.json)
- [自动授权故障及正向对照](kms9-browser-auth-results.json)

**Skilly：** ZIP / TGZ 经 Web、Worker 实际提取的 4 种组合均保留 7 文件及内容摘要。真实安装工具从带认证的本地 Git 服务完成三类客户端安装、版本更新和指定旧版重装。匿名请求 401，22 项授权定向测试通过。用户预置模式和安装命令授权方式由源码确认。带外层目录 ZIP 的 Python 可执行位丢失已复现；同内容 TGZ 保留。

- [方法、限制与固定源码定位](skilly-notes.md)
- [归档、安装、版本及 HTTP 记录](skilly-runtime-results.json)

**Agent Registry：** 原始函数真实执行 git clone / fetch / checkout，9 项普通文件字节与脚本权限保留，固定提交取回旧内容。符号链接被跳过；原地回退后新版本独有文件仍存在。客户端下载源 Git 和服务默认开放访问由源码确认。

- [方法、限制与固定源码定位](agent-registry-notes.md)
- [6 个顶层定向测试原始日志](agent-registry-test-results.txt)

## SSO 身份用于 CLI 授权

判断：**可基于 SSO 登录后的平台用户签发 CLI 凭据；原生 CLI 的完整自动登录体验需接通。** 主报告明确标为“二开可满足”：自动领取与保存流程需要开发，已有用户身份与令牌能力可以复用。

固定源码中，TokenController 使用经过认证的 PlatformPrincipal.userId() 创建令牌；不会从请求里接受任意用户 ID 作为签发身份。SSO 用户经过已验证的身份绑定流程成为平台用户后，可使用同一令牌接口。令牌属于该员工，调用同时受令牌范围与用户访问权限约束。

网页 /cli/auth 已实现读取当前登录用户、创建个人令牌，并通过 URL fragment 回传到受限本机回调地址。后端还提供设备码申请、登录用户授权及 CLI 轮询换取令牌的接口。这些能力均有实际源码，但原生 CLI 的 AuthService.login 目前仍要求传入已有令牌，没有自行发起浏览器授权和接收凭据的完整流程。

可以基于这些能力实现“CLI 发起登录 → 浏览器复用员工 SSO 身份 → 签发该用户凭据 → CLI 接收并保存 → 按员工权限使用技能”。这属于已有能力的客户端衔接，不需要重新建设用户账户体系，也不是为每个员工分别生成一个 CLI 程序。

本次补充为固定源码核验；此前正式服务测试已经验证个人令牌可访问平台、用户停用后旧令牌被拒绝。本次没有宣称已跑通原生 CLI 的自动 SSO 登录，也没有把明道云停用同步视为现成能力。设备码模式的默认验证地址与独立设备授权页面仍需在接入时正确衔接。

依据：[当前用户创建令牌](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/controller/TokenController.java#L38)、[网页登录身份与回调](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/web/src/pages/cli-auth.tsx#L69)、[设备授权绑定当前用户](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/controller/DeviceAuthWebController.java#L40)、[设备令牌兑换](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/device/DeviceAuthService.java#L109)、[原生 CLI 现状](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/cli/src/services/auth-service.ts#L13)。

## 内部隔离、完整分发与组织同步的判定说明

内部内容隔离判为“满足”。私有技能拒绝匿名及无权用户下载、停用后拒绝旧令牌，均有原有运行证据。固定源码中的 VisibilityChecker 另按团队空间成员限制 NAMESPACE_ONLY 内容。使用时要选择对应的内部可见范围并配置成员准入；PUBLIC 内容本来就是公开内容。默认允许本地注册，并不意味着注册者可以越权读取指定团队或私有技能，因此不能仅凭注册开放就判定权限隔离能力不足。本次没有新增全套团队发布、审批和所有读取路由的运行测试。

完整技能包分发判为“满足”。已核验样例包含技能文档、图片、字体、样式和脚本，下载、安装后的文件完整性通过。字体触发的警告由发布者通过网页对应接口确认，员工安装无需再次确认。原生 CLI 暂不能完成这类确认发布，属于发布渠道限制；本项需求没有要求所有发布渠道都支持同一套操作，因此该限制不否定已具备的完整分发能力。结论仍限定于已核验文件类型，不扩展为任何格式都能发布。

部门级权限与自动同步判为“二开可满足”。iFlytek 已有团队空间、成员批量添加与移除、角色修改、用户停用等接口，可供同步程序调用。对本次固定版本的服务端与文档复核，未找到现成的组织架构同步任务或 SCIM 服务实现；产品方向文档提及兼容外部身份，不作为已实现同步的证据。现有 Namespace 是团队空间模型，也不能直接等同于多层组织架构。明道云部门和成员的读取、身份映射、入职调岗离职变更处理及同步触发，需要在接入时开发。

上述“二开可满足”是基于已核实接口和复用路径的可行性判断，不是同步程序已经开发、上线或完成联调的声明。

依据：[技能可见范围判断](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-domain/src/main/java/com/iflytek/skillhub/domain/skill/VisibilityChecker.java)、[团队空间与成员接口](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/controller/portal/NamespaceController.java#L170)、[用户角色与停用接口](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/controller/admin/UserManagementController.java)、[团队空间模型](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-domain/src/main/java/com/iflytek/skillhub/domain/namespace/Namespace.java)、[原有分发记录](iflytek-runtime-results.json)、[原有权限记录](iflytek-lifecycle-results.json)。

## 二开便利度判断

针对明道云身份接入与内部技能分发，本报告判断 iFlytek 的二开便利度较好。依据是实际存在的认证扩展接口及可复用的账户、会话、准入策略和技能业务模块；该判断不是具体开发工期承诺，也不代表已完成明道云适配。

- OAuthClaimsExtractor 可把外部用户信息映射为统一身份数据；标准 OIDC 已实际接通并复用自动建号流程。私有认证另有 DirectAuthProvider 与 PassiveSessionAuthenticator 接口，共用平台会话服务。
- AccessPolicy 定义准入判断接口；默认工厂提供若干内置策略。新增公司的组织规则仍需要编写实现并完成装配，不能理解成现成明道云开关。
- 后端使用 Java 21 / Spring Boot 的多模块工程，前端使用 React / TypeScript。对熟悉这两类技术的团队更容易接手；现有开发入口与模块测试命令可复用。后续仍需维护定制代码及升级兼容。
- 本次没有为论证便利度而实现一个虚构明道云连接器。正式接入方式与工作量取决于实际租户提供的身份协议、用户信息及组织接口。

依据：[官方私有 SSO 扩展说明](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/docs/11-auth-extensibility-and-private-sso.md)、[身份适配接口](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/oauth/OAuthClaimsExtractor.java)、[准入策略工厂](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/policy/AccessPolicyFactory.java)、[后端模块](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/pom.xml)、[前端依赖](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/web/package.json)。

## 客户端与公司场景边界

[官方客户端目录核验](client-directories.md)记录了 Claude Code、Codex、Cursor 的当前官方路径。iFlytek 验证的是个人 .codex/skills、.claude/skills、.cursor/skills；Codex 项目目录建议显式配置 .agents/skills。Skilly 安装器已实际写入项目 .claude/skills 与 .agents/skills。

以下没有运行证据，报告明确保留边界：

1. 真实明道云租户的协议、组织准入及停用同步。通用 OIDC 的成功不能替代真实公司身份接入。
2. 公司最终域名和员工日常网络。前三款平台可以独立托管技能，不要求客户端连接原始 Git；本地 HTTP 成功不能替代公网 HTTPS、身份入口和业务 API 的实际可达性。
3. 公司实际 design / brand 技能及指定 AI 客户端的任务执行。完整文件和样例脚本通过不能替代真实模型任务效果。

原始方法说明中的临时路径用于追踪本次执行现场；本目录已保留主要结果与源码定位，临时服务在核验完成后清理。建议随 HTML 一并保留此 evidence 目录，维持报告中的证据链接可用。
