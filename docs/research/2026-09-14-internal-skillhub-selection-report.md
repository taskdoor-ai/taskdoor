# 企业内部 SkillHub 技术选型报告

日期：2026 年 9 月 14 日  
评估范围：公司内部技能管理、身份接入与分发

**一、建设目标**

建设一个面向公司内部员工的 SkillHub，集中管理 mingdao-design、brand-design 等 AI 技能，使员工能够使用明道云身份访问平台，免去独立注册，方便地获取公司认可的技能与版本。

平台需要实现以下目标：

1. **统一使用入口。** 员工从公司工作入口进入技能中心，查找、安装和使用正式发布的 Skill。
2. **统一身份。** 复用明道云或公司现有统一身份体系，员工使用公司身份即可访问，无需另行注册或设置密码。
3. **免 VPN 使用。** 员工无需连接 VPN，即可直接下载、安装和使用 Skill；日常获取和更新不要求访问原始私有 GitLab。
4. **统一版本与质量。** 建立正式发布、审核、版本追踪和回退机制，减少技能副本分散、版本不一致和重复维护。
5. **保护内部资产。** 身份认证与访问权限覆盖网页、搜索、接口和文件下载；员工离职或权限变化后，及时停止后续访问。
6. **保留后续整合能力。** 使用标准技能目录、接口与可导出的版本数据，便于后续接入现有工具和平台。

预期形成的使用流程是：**员工通过公司身份进入 → 找到所需技能 → 安装到指定 AI 工具 → 使用并按需更新；维护者提交版本 → 负责人审核 → 统一发布。**

**二、选型结论：iFlytek SkillHub**

**推荐选择 iFlytek SkillHub，建设公司内部技能平台。**

GitHub 仓库：[iFlytek SkillHub](https://github.com/iflytek/skillhub)。

选择 iFlytek 的理由：

1. **员工免注册的使用流程符合需求。** 已有统一身份登录、首次登录自动建号和默认成员权限，完成明道云身份适配后，员工即可使用公司身份进入技能平台，无需另行注册或设置密码。明道云接入属于“二开可满足”，自动建号能力可以直接复用。
2. **能够统一分发公司技能，解决源仓库的 VPN 依赖。** 平台自行保存并分发技能，支持文档、脚本、图片、样式和字体等设计、品牌素材。部署在员工日常网络可达的入口后，员工可直接下载安装和更新，无需访问原始私有仓库。
3. **具备内部技能管理所需的权限和版本能力。** 支持按团队或成员限制访问、负责人审核、正式发布、版本追溯及恢复旧版，能够管理公司认可的技能及其使用范围。
4. **后续定制有明确的复用基础。** 已提供身份扩展、成员管理和个人凭据接口，可在现有账户、权限及技能业务上接入明道云，并补充 CLI 自动授权和组织同步。二开有明确入口，适合由熟悉 Java / Spring Boot 和 React 的团队维护。

5. **开源社区与维护基础较扎实。** 截至 2026-09-14，iFlytek 已有 5,095 Star、834 Fork 和多个贡献账号，并持续发布版本。较广的社区关注和可查的维护记录，为后续问题跟进、版本升级及二开维护提供了选择依据。

其他方案的取舍：

候选以“管理企业内部 Skill”为前提：具备内部技能目录与托管分发、员工身份与权限、发布及版本管理基础，再比较接入成本和社区成熟度。iFlytek 与 Skilly 是直接对应这一定位的产品；Observal 有内部 Skill 管理能力，作为相关的综合平台候选。公共技能市场和单独的安装工具不列为同类备选。

- **[Observal](https://github.com/Observal/Observal)：具备内部 Skill 管理能力的综合平台。** 有独立的 Skill 提交、审核、目录、安装和维护流程，并提供员工身份、角色及人员同步能力，业务定位与我们有关。首次登录自动建号及 CLI 浏览器授权已有实现。多文件技能可完整获取，但当前仍由员工电脑读取源 Git；平台直接分发只覆盖技能正文与辅助脚本，免 VPN 获取完整品牌素材需扩展平台托管。恢复旧版还需补文件清理。它是相关备选，但当前分发方式与我们的免源仓库 VPN 需求仍有差距。
- **Skilly 是企业内部 Skill 管理的同类备选。** 核心技能分发、权限和版本管理同样满足，人员与用户组同步基础更完整。它当前围绕微软 Entra 登录，接入明道云需适配身份并预先同步员工账户；iFlytek 则可在身份接通后通过首次登录自动建号，更贴近当前免注册使用的重点。两者的明道云接入均需二开，Skilly 的组织同步仍需补明道云数据源适配。若部门同步成为首要要求，或团队以 TypeScript / Next.js 为主，可优先考虑 Skilly。

  开源社区方面，截至 2026-09-14，Skilly 为 6 Star、0 Fork，iFlytek 为 5,095 Star、834 Fork；GitHub 贡献记录分别包含 3 个和 36 个非机器人账号。两者近期都在发布版本，但 iFlytek 仓库创建更早、社区关注和贡献范围更大，因此在开源社区与维护基础上相对更成熟，是优先选择它的另一项依据。

  使用方式上，Skilly 通过通用安装工具和网页生成的授权命令分发技能；iFlytek 提供自有 CLI，含字体的包由维护者在网页确认发布。两者要实现 CLI 自动授权都还需二开，现有依据不能证明哪一种总改造成本更低。
- **kms9/skillhub：已排除的轻量方案。** 可以在现有基础上二开，但内容访问保护、品牌素材支持、发布审批和 CLI 授权均需开发或修复，改造范围较广。
- **Agent Registry：已排除的分发架构方案。** 能够获取完整技能文件，但下载安装仍依赖原始 Git 仓库，不能解决当前的 VPN 依赖；员工身份与权限体系也需要新增。

**不纳入同类备选：** ClawHub 主要是公共技能注册中心；Vercel Skills、OpenSkills 主要是技能安装和加载工具。它们与技能生态相关，但不是本次要选择的企业内部 Skill 管理平台。

**选型结论：现阶段首选 iFlytek SkillHub。** 它具备员工免注册、技能集中分发、权限保护和版本管理的主要基础，也有较好的开源社区与维护积累。推荐依据是当前需求下的身份、技能分发、权限与版本能力，以及可查的社区维护记录。明道云接入需完成二开，公司环境尚未完成联调。

**三、需求与满足度**

下表按同一组需求比较五款产品：产品顺序为 iFlytek、Observal、kms9、Agent Registry、Skilly；kms9 和 Agent Registry 保留用于说明排除原因。比较对象均为第四章固定版本的开源代码，商业版能力不计入。Observal 的判断依据为官方源码及安装函数检查，未进行整套服务或公司身份环境联调。

判定口径：满足＝所需能力已具备，使用现有功能或常规配置即可完成；二开可满足＝已有可复用基础，但仍需编写适配代码、补充功能或修复问题；不满足＝缺少核心机制，需另建基础能力或改变方案。凡需要改代码的对应需求，均不标为“满足”。二开可满足是技术可行性判断，不表示改造已经完成。

所有产品采用相同口径：SSO 按接入明道云评价，通用 SSO 支持不等于明道云已接入；免注册按身份接通后是否还需开发额外的账户预置或启用流程评价；部门同步按能否接入明道云人员变动评价。网页发布确认、权限配置和选择合适的打包格式，属于现成功能的使用方式。

Star 数查询于 2026-09-14（北京时间 19:20），用于参考社区关注度。

| 需求 | 优先级 | 目标 | iFlytek SkillHub（★ 5,095） | Observal（★ 2,361） | kms9/skillhub（★ 7） | Agent Registry 开源版（★ 488） | Skilly（★ 6） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 明道云 SSO | 必须满足 | 复用明道云员工身份登录技能平台 | **二开可满足**：已有通用 SSO、身份绑定和账户管理；直接接入明道云仍需开发身份适配，不能仅配置现有开关即可完成。 | **二开可满足**：已有通用 SSO、身份绑定和首次登录建号；直接使用明道云员工身份，仍需开发用户信息映射与登录适配。 | **二开可满足**：已有外部账号登录及身份接入扩展；需开发明道云登录适配，接入现有授权与用户信息获取流程。 | **不满足**：开源版没有现成的员工身份登录流程，需要新建认证能力；商业版的单点登录不计入本次评价。 | **二开可满足**：已有微软 Entra 单点登录；接入明道云需开发对应登录适配，并调整账号映射与登录处理。 |
| 员工免注册 | 必须满足 | 员工通过公司身份登录，无需手工注册或单独设置密码 | **满足**：身份接入完成后，首次登录自动建立平台账户并赋予默认成员权限，无需另行开发建号流程；员工不必注册或设置密码。 | **满足**：身份接入完成后，首次登录自动建立员工账户并赋予普通用户角色；员工无需手工注册，也不必预先同步账户才能登录。 | **二开可满足**：已有外部身份首次登录自动建号；明道云员工直接可用还需补自动启用与默认权限处理，现有逻辑未覆盖该身份来源。 | **不满足**：没有现成的员工账户和自动建号流程，需要先建设身份体系；任何人直接访问不能代替员工免注册登录。 | **二开可满足**：已有用户同步建号，员工无需手工注册；使用明道云身份前还需开发用户来源适配，预先同步账户。当前登录流程不会自动创建新员工账户。 |
| 免 VPN 下载安装使用 | 必须满足 | 员工无需连接 VPN，即可直接下载、安装和使用 Skill | **满足**：员工直接从平台下载安装和更新技能，无需访问原始私有仓库；平台入口需在员工日常网络可达。 | **二开可满足**：正文和辅助脚本可直接从平台获取；包含图片、字体等素材的多文件技能仍需访问源 Git。需扩展平台托管和下载，才能免去源仓库 VPN。 | **满足**：技能由平台存储并提供下载，员工安装时无需连接原始私有仓库；平台入口需在日常网络可达。 | **不满足**：安装时仍需从员工电脑访问原始 Git 仓库；原仓库要求 VPN 时，员工仍然需要连接 VPN。 | **满足**：平台自行保存并分发技能，员工可直接下载或安装，无需访问维护者使用的原始仓库。 |
| 内部内容隔离 | 必须满足 | 未授权用户无法通过网页或接口取得内部技能内容 | **满足**：已有权限隔离能力，可将内部技能限定为指定团队或成员访问。未授权者不能下载，账户停用后不能继续访问；使用时需配置内部可见范围与员工准入。 | **满足**：可关闭公开访问，并将内部技能限制为指定团队或成员可见；浏览、详情和安装均有权限检查。采用 Git 分发时，源仓库也需配置对应访问权限。 | **二开可满足**：已有员工账号与访问凭据，但当前技能浏览和下载公开。需统一补上员工身份检查，以及账户停用后的访问拦截，才能保护内部内容。 | **不满足**：开源版默认允许访问，没有现成的员工内容隔离机制；需要新增身份认证及访问权限体系。 | **满足**：可按员工和团队限制技能访问，未登录或没有权限的人不能下载；账户停用后停止访问。使用时配置对应成员与可见范围即可。 |
| 完整技能包分发 | 必须满足 | SKILL.md、脚本、参考文档及实际使用的素材完整传递 | **满足**：技能文档、脚本、图片、样式和字体可以完整分发。含字体时由发布者在网页确认发布，员工正常下载安装；原生 CLI 暂不支持这类确认发布。 | **满足**：通过 Git 分发可完整获取文档、脚本、图片、字体和样式；平台直接分发目前仅支持正文与辅助脚本。完整包是否免 VPN，见“免 VPN 下载安装使用”一项。 | **二开可满足**：已有技能文件上传、存储和下载流程；需补齐图片、字体及样式文件的上传支持，当前版本会漏掉或拒绝这些素材。 | **满足**：随包提交的文档、图片、字体和脚本可以完整获取。素材须以实际文件纳入包内；通过文件系统链接引用的素材，需要先一并打包。 | **满足**：技能文档、脚本、图片、字体和样式可完整分发。需要保留脚本直接执行权限时，维护者采用 TGZ 格式打包即可。 |
| 版本与发布管理 | 必须满足 | 正式版本有负责人，提交可审核，历史版本可追溯和回退 | **满足**：支持负责人审核、正式发布、版本更新和恢复指定旧版；团队共享发布需启用项目配套的安全扫描服务。 | **二开可满足**：已有提交审核、版本记录和指定版本安装；恢复旧版时会残留新版新增文件，需补文件清理，才能可靠地恢复原版本。 | **二开可满足**：已有版本历史、更新和旧版恢复；需增加发布审批，并修复发布成功后安装工具仍提示失败的问题。 | **二开可满足**：已有版本标记和指定版本获取；需补发布审批及恢复旧版时的文件清理，避免新版文件残留。审批还需依赖员工身份与权限体系。 | **满足**：支持版本审批、正式发布、安装指定版本及恢复旧版；已发布的版本号不能被直接覆盖，便于追溯。 |
| CLI 自动完成授权 | 体验优化 | 员工完成浏览器登录后，CLI 自动获取并保存个人凭据 | **二开可满足**：已能按登录员工身份签发 CLI 凭据；需补上 CLI 发起浏览器登录、接收并保存凭据的流程，才能免去手工复制。 | **满足**：已有 CLI 发起浏览器登录、员工确认授权、自动领取并保存个人凭据的完整流程；无需手工复制访问令牌。 | **二开可满足**：已有浏览器登录和凭据回传流程，但网页与 CLI 交接存在已定位的错误；修复后可实现自动授权，当前版本仍会失败。 | **不满足**：开源版没有现成的浏览器登录与自动授权流程；需要先建设员工身份和凭据签发能力，再开发 CLI 登录。 | **二开可满足**：网页登录后可生成带个人授权的安装命令，目前需要手动复制。可复用现有授权能力，二开增加自动登录与安装衔接工具。 |
| 部门级权限与自动同步 | 按实际需要扩展 | 按部门分配技能访问权限，随入职、调岗、离职自动更新 | **二开可满足**：已有团队空间、成员权限和账户停用接口；需开发明道云组织同步，将入职、调岗、离职更新到成员权限。当前没有现成的组织架构自动同步模块。 | **二开可满足**：已有人员同步、账户停用和团队权限基础；需开发明道云部门及成员映射，将入职、调岗和离职变化同步到技能访问权限。 | **不满足**：缺少部门权限和组织同步机制，需要先完善内部内容保护，再建设部门分组、权限分配与人员变动同步。 | **不满足**：没有现成的员工部门权限和组织同步，需要新建角色、部门分组及人员变动处理机制。 | **二开可满足**：已有用户、用户组、成员关系及停用同步机制，可将部门映射为权限组；仍需开发明道云数据源适配，才能随公司人员变动自动更新。 |

**免 VPN 的判定范围：** iFlytek、Skilly 和 kms9 可从平台直接分发；Observal 的多文件技能及 Agent Registry 安装仍会读取源 Git。表中“完整技能包分发”评价文件是否齐全，“免 VPN”另行评价是否依赖受限源仓库，两项不能互相代替。平台、身份入口和技能调用的服务需在员工日常网络可达；本次未进行公司网络验收。

**对照解读：** iFlytek、Skilly 和 Observal 均有企业内部 Skill 管理基础。iFlytek 同时具备首次登录自动建号与平台直接分发；Skilly 已有较完整的人员、用户组同步机制；Observal 已有 CLI 自动授权，但完整素材分发与可靠回退仍需补充。三者直接接入明道云均需二开。

**四、评估版本与依据**

评估日期为 2026 年 9 月 14 日。结论绑定以下固定版本，并以实际运行记录和官方源码为依据；不把商业版文档、未执行的流程或其他版本的能力计入运行结果。

| 项目 | 评估版本 | 固定代码与发布记录 |
| --- | --- | --- |
| iFlytek SkillHub | v0.2.20；CLI 0.1.12；运行官方同版本镜像 | [36de541](https://github.com/iflytek/skillhub/tree/36de54157bff59c18c5eff255d2c158df45a3e2a)，[v0.2.20 发布](https://github.com/iflytek/skillhub/releases/tag/v0.2.20) |
| Observal | main 固定提交；官方源码核查及实际安装函数检查 | [28fd855](https://github.com/Observal/Observal/tree/28fd855236405cc9ca83e7b357b1362b323c801a) |
| kms9/skillhub | master 固定提交 | [228c46e](https://github.com/kms9/skillhub/tree/228c46e1d3eeee3b7464d0f1d77b4f019a602f14) |
| Agent Registry | 开源 v0.4.0 | [aef6563](https://github.com/agentregistry-dev/agentregistry/tree/aef65635f1dd71ecb279218a04b948801a801f84)，[v0.4.0 发布](https://github.com/agentregistry-dev/agentregistry/releases/tag/v0.4.0) |
| Skilly | v1.151.0；外部安装工具 skills 1.5.10 | [225eeeb](https://github.com/scalefocus/skilly/tree/225eeeb6f076c8f726a2e47f2c7b389b9e49b400)，[v1.151.0 发布](https://github.com/scalefocus/skilly/releases/tag/v1.151.0) |

关键依据：

- **Observal：** [八项需求判断与源码依据](skillhub-verification/observal-assessment.md)、[安装与回退检查记录](skillhub-verification/observal-installer-results.json)、[首次登录建号](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal-server/api/routes/auth.py#L737)、[私有目录权限](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal-server/api/deps.py#L173)、[技能分发与安装](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal_cli/cmd_skill.py#L560)、[CLI 自动授权](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal_cli/cmd_auth.py#L973)、[人员同步](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal-server/api/routes/scim.py)。
- **本表 Star 快照：** [2026-09-14 五款产品最新查询记录](skillhub-verification/matrix-community-snapshot.json)，数值对应 GitHub 仓库公开 API。
- **候选范围补充：** [检索范围、候选分类与推荐边界](skillhub-verification/candidate-scope-review.md)，记录高关注平台和安装工具的纳入理由；新增候选不沿用原有产品的运行结论。
- **社区与维护依据（2026-09-14）：** [iFlytek 仓库](https://github.com/iflytek/skillhub)、[Skilly 仓库](https://github.com/scalefocus/skilly)、[iFlytek 发布记录](https://github.com/iflytek/skillhub/releases)、[Skilly 发布记录](https://github.com/scalefocus/skilly/releases)、[指标快照与判断说明](skillhub-verification/community-assessment.md)。Star、Fork 与贡献账号用于评价社区和维护基础，不直接代表生产稳定性。
- **两款主候选的差异依据：** [iFlytek 身份绑定与首次建号](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/identity/IdentityBindingService.java)、[Skilly 身份体系、技术栈及通用安装方式](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/README.md)、[Skilly 人员与用户组同步](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/scim/router.ts)、[Skilly 成员与停用处理](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/scim/store.ts)。
- **统一判定口径：** [统一判定说明](skillhub-verification/unified-assessment.md)，说明已有能力、常规接入与二开工作的区别。
- **SSO 接入依据：** [明道云单点登录协议文档](https://docs-pd.mingdao.com/faq/sso/)、[明道云 OIDC 接入说明](https://docs-pd.mingdao.com/faq/sso/oidc/)、[明道账号登录第三方应用指南](https://open.mingdao.com/DevGuid)、[HAP OAuth 应用说明](https://help.mingdao.com/org/thirdapp/)、[SSO 判定依据与接入边界](skillhub-verification/mingdao-sso-assessment.md)。
- **iFlytek：** [OIDC 用户映射](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/oauth/CustomOidcUserService.java#L87)、[首次建号与身份绑定](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/identity/IdentityBindingService.java#L81)、[实际分发与回退记录](skillhub-verification/iflytek-runtime-results.json)、[OIDC 集成记录](skillhub-verification/iflytek-oidc-results.json)、[权限与停用记录](skillhub-verification/iflytek-lifecycle-results.json)。
- **kms9：** [公开读取路由](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/handler/routes.go#L51)、[Web 授权回调参数](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/src/routes/cli/auth.tsx#L54)、[CLI 回调读取方式](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/browserAuth.ts#L142)、[分发与发布校验记录](skillhub-verification/kms9-cli-results.json)、[自动授权复现记录](skillhub-verification/kms9-browser-auth-results.json)。
- **Skilly：** [登录仅更新已有用户](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/web/src/lib/auth.ts#L30)、[ZIP 文件模式处理](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/git/bundle.ts#L74)、[资源、版本与安装记录](skillhub-verification/skilly-runtime-results.json)。
- **Agent Registry：** [客户端读取源 Git](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/cli/declarative/pull.go#L86)、[文件复制实现](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/cli/common/gitutil/gitutil.go#L333)、[默认授权实现](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/registry/auth/authz.go#L50)、[原始测试日志](skillhub-verification/agent-registry-test-results.txt)。

- **二开能力：** [官方认证扩展与私有 SSO 说明](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/docs/11-auth-extensibility-and-private-sso.md)、[身份适配接口](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/oauth/OAuthClaimsExtractor.java)、[后端模块划分](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/pom.xml)、[前端技术栈](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/web/package.json)。

- **CLI 身份授权：** [令牌绑定当前登录用户](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-app/src/main/java/com/iflytek/skillhub/controller/TokenController.java#L38)、[网页签发并回传 CLI 令牌](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/web/src/pages/cli-auth.tsx#L112)、[设备授权与领取](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/device/DeviceAuthService.java#L74)、[原生 CLI 当前登录入口](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/cli/src/services/auth-service.ts#L13)。

根仓库许可证分别为 [iFlytek Apache-2.0](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/LICENSE)、[kms9 MIT](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/LICENSE)、[Skilly Apache-2.0](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/LICENSE)、[Agent Registry Apache-2.0](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/LICENSE)。第三方依赖、商业服务及技能包素材按各自许可管理。
