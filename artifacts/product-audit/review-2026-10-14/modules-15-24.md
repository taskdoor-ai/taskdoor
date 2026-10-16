# 24 模块复核：15–24（2026-10-14）

本报告按 `skills/agentdoor-task-design/SKILL.md` 的先问题、减法、复用和事实／建议区分原则复核。覆盖原审查的 10 个模块；编号是原审查编号，不是当前 25 个 PRD 文件编号。

证据范围：当前 PM demo 源码、相关 PRD、交互基线及实现矩阵；正式本地 `/Users/yxzuji/Documents/ChatGPT/taskdoor` 的 `sand` 分支 `50fdb495baab2f0d550f08aa4455f25c55191693` 只读源码。未运行页面、模型、正式服务或测试，不能把“代码存在”写成部署完成，也不能把 demo 模拟写成正式服务缺陷。本轮没有改应用、PRD 或正式仓库。

本组未发现有足够证据新增 P0。下列 P1 是确定的接入差异或会改变恢复／权限结果的规则差异，实施仍待整轮收口；P2 是可后置的体验建议。已有决定（@ 自动加入、真实分析 Skill、10／20 层、目标独立编辑）不重新提问。

## 15 · 账号、登录、注册与首次进入

**保留／移出旧误判。** 正式已有注册验证、Google 登录入口、首次设置与邀请续接，不因 demo 的固定验证码判正式没有认证服务。正式 [RegistrationFlow.tsx:169](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RegistrationFlow.tsx:169) 调用真实验证码接口；[AuthExperience.tsx:51](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AuthExperience.tsx:51) 从服务返回的 provider 选择 Google；[router.tsx:155](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/app/router.tsx:155) 约束首次设置；[SetupPage.tsx:61](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/app/SetupPage.tsx:61) 保存用户明确填写的姓名和团队名，携邀请只填姓名。不重复安排 AUTH-3 的正式认证重建；Google 补密码等服务配置与实际部署仍需专门验收，不凭静态代码称全流程已验证。

### AUTH-1 · demo 首次进入应呈现已有正式流程

- **P1 · demo 对齐，既定目标。** 新用户完成认证后，应明确创建何团队。demo [onboarding-preview.ts:265](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/auth/lib/onboarding-preview.ts:265) 的 `simplifyOnboardingEntry` 仍按邮箱推姓名并自动生成 personal 团队；与模块 03 的用户填写团队名、不得暗中代建不同。正式此能力已有，不给正式项目新增同名开发任务。
- **最小方案：** demo 复用现有首次设置／创建表单；邀请分支只补姓名并确认受邀团队，不另造 onboarding 仪表盘。模拟验证码属于演示边界，可在预览说明中记录，不把开发细节加入正式产品流程。
- **验收：** 自行注册明确填写团队名；受邀者不多建团队；已有账号沿原团队；无团队显示明确入口；切语言保留输入和邀请来源。

## 16 · 个人资料与设置

**已有。** 正式姓名真实保存、邮箱只读、失败保留输入：[AccountProfilePanel.tsx:76](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AccountProfilePanel.tsx:76)、[AccountProfilePanel.tsx:129](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AccountProfilePanel.tsx:129)。旧 ME-1 只指 demo，不是正式缺陷。设置分组已具备，不新增第二套设置首页。

### ME-1 · demo 邮箱只读

- **P2 · demo 对齐，既定目标。** demo [PersonalInfoDialog.tsx:183](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/app/workspace/components/PersonalInfoDialog.tsx:183) 仍允许编辑邮箱，而 PRD 和正式都只读。用户会把本地资料修改误认为登录邮箱变更。
- **最小方案／验收：** 改只读展示，继续保留姓名和头像编辑；鼠标、键盘与保存均不能改身份邮箱，团队成员匹配不受影响。

### ME-2 · 普通设置表单离开时保护未保存内容

- **P1 · 新建议，未确认。** 用户上传头像／改姓名后关闭设置或切模块，会失去草稿。demo 的离开保护只检查职责 dirty：[PersonalInfoDialog.tsx:104](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/app/workspace/components/PersonalInfoDialog.tsx:104)；正式同样只检查职责：[PersonalInfoDialog.tsx:131](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/PersonalInfoDialog.tsx:131)，姓名表单自己的 draft 未报告给父层。
- **最小方案：** 复用已有“继续编辑／丢弃”确认，只覆盖有手动保存按钮的姓名、头像、团队名等表单，不改为全设置自动保存；无改动无需确认。
- **验收：** 关闭／切模块取消时保留输入；丢弃回已保存值；保存失败不失草稿；完成保存后不再弹。

### ME-4（新）· 正式个人头像编辑尚未接入

- **P2 · 生产接入，既定 PRD 目标。** demo 已有本地上传和删除；正式 [AccountProfilePanel.tsx:56](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AccountProfilePanel.tsx:56) 明确当前只展示身份提供商头像，实际 UI 无上传／删除入口。用户不能在正式页面完成 demo 已展示的账号头像维护。
- **最小方案／验收：** 复用 demo 的图片选择与删除交互，接账号头像存储后统一保存；失败保留旧头像，跨团队同一账号同步，删除恢复首字母。不推测现有身份提供商头像字段等同可写上传接口。

## 17 · 我的职责与人员推荐依据

**已有。** 正式职责正文已 PATCH 到成员资料，并有 ETag 冲突处理：[RoutedResponsibility.tsx:92](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/members/RoutedResponsibility.tsx:92)。demo 已有编辑暂停、版本保护、逐条建议，不重做这些机制。建议不是绩效、能力、忙闲或本人已接受的任务分工。

### RESP-2 · 正式服务接入已有职责分析 Skill 与自动更新配置

- **P1 · 生产接入，既定目标。** 用户开启自动更新，却没有后端分析或可保存配置。正式 [RoutedResponsibility.tsx:36](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/members/RoutedResponsibility.tsx:36) 明确 switch 仅组件 state；[同文件:78](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/members/RoutedResponsibility.tsx:78) 用该 state 构造 UI，`observedClaims=[]`。demo 的真实边界是本地合成建议，不能证明每天分析已上线。
- **已有 Skill：** `agentdoor-responsibility-advisor` 已定义每日检查、主动重新分析、自动更新配置、编辑暂停和真实写入回执。本轮是后端服务接入，不是缺少职责 Skill 或需要另写一套规则。
- **最小方案：** 先接本人／团队自动更新配置、调用已有职责 Skill 并绑定版本，再复用已有建议审阅和保存面板。接入完成前开关不能显示为已成功启用自动服务。已保存有效职责才用于人员匹配，关闭时须人确认，未知配置只保留建议。
- **验收：** 重新打开与跨设备保持配置；无变化不重复生成／提醒；编辑期间暂停；旧建议不覆盖手改；无权来源停用；临时帮助不写成长久责任；保存失败不用于推荐。
- **后置：** RESP-1 的精确来源定位、RESP-3 的建议差异短句可随真实输出复用现有 evidence 区完成，不先增加职责版本中心或常驻更新卡片。

## 18 · 团队创建、切换与我的团队

**已有。** 正式建团队已经调用服务、同一次提交沿用幂等 key、成功后路由切入：[CreateTeamDialog.tsx:49](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/CreateTeamDialog.tsx:49)、[同文件:65](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/CreateTeamDialog.tsx:65)。不以 demo 刷整页推断正式也刷整页。团队下拉加搜索的 TEAM-2 暂无规模证据，后置。

### TEAM-1 · demo 创建团队多对象保存需保持完整结果

- **P1 · demo 对齐，新建议。** demo [CreateTeamDialog.tsx:28](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/workspaces/components/CreateTeamDialog.tsx:28) 依次写目录、会话、onboarding 状态后刷新，后续写失败可能已留下团队但界面仍报失败；用户重试会以为未创建。不把该本地存储问题外推为正式创建事务缺陷。
- **最小方案：** 复用本地已有恢复日志成组保存，全部成功后切现有工作区；若仅后续导航失败，明确团队已创建并提供进入，不再新建。
- **验收：** 各写点失败不会留下无法进入的半套结果；重试不多创建；保留名字；正式现有额度、幂等与时区逻辑保持。

### TEAM-3 · 正式“我的团队／删除后恢复”前端未接现有服务

- **P1 · 生产接入，既定目标。** demo [MyTeamsPanel.tsx:18](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/members/components/MyTeamsPanel.tsx:18) 有已删团队 30 天恢复；正式设置 module union [PersonalInfoDialog.tsx:46](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/PersonalInfoDialog.tsx:46) 没 `myTeams`，Web workspace API 未接 delete/list-deleted/restore。正式后端这些接口已有：[WorkspaceController.java:141](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/tenant-service/src/main/java/com/taskdoor/tenant/api/WorkspaceController.java:141)、[同文件:161](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/tenant-service/src/main/java/com/taskdoor/tenant/api/WorkspaceController.java:161)、[同文件:172](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/tenant-service/src/main/java/com/taskdoor/tenant/api/WorkspaceController.java:172)。当前正式“删除团队”UI 实际是归档：[WorkspaceSettingsPanel.tsx:169](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/WorkspaceSettingsPanel.tsx:169)。删除／归档语义和恢复入口因此未形成一致路径。
- **最小方案：** 复用 demo “我的团队”列表接已有删除服务；归档仍独立处理，不用同一标签冒充删除。正式是否展示普通原成员的已删团队行，需要按现有 owner-only API 调整摘要规则，不能让前端推导未授权数据。
- **验收：** 只有拥有者可删除／恢复；30 天由服务期限决定；恢复不重建账号或别团队；无有效团队仍可进入本人可恢复团队入口；成功后实际目录同步。
- **demo 小项：** `MyTeamsPanel.tsx:22` 固定 now，不随打开时间推移重算，可沿任务回收站的定时更新修正；可恢复与否仍在提交检查。属于低优先展示修正，不是恢复服务漏洞。

## 19 · 团队信息、所有权与成员交接

**已有。** demo 已有转让和任务交接面板、分页、保留已选、过期核对；正式后端也有转让和退出交接，不重建后端模型。logo 即时保存与姓名手动保存本身不必强制统一，关键是结果是否明确。

### LIFE-2 · 正式拥有者被提示先转让，却缺可完成的转让入口

- **P1 · 生产接入，既定目标。** 正式 [WorkspaceSettingsPanel.tsx:224](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/WorkspaceSettingsPanel.tsx:224) 退出遭拒只提示拥有者须先转让；[WorkspaceMembersPanel.tsx:532](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/WorkspaceMembersPanel.tsx:532) 固定显示 Owner 并注明 transfer 未在 PM 绘制。现有后台 [MembershipController.java:132](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/tenant-service/src/main/java/com/taskdoor/tenant/api/MembershipController.java:132) 已有转让 API；Web members API 未接该调用。拥有者无法通过当前正式 UI 完成退出前置步骤。
- **最小方案：** 复用 demo 当前转让确认，调用既有 API；成功后提示可继续任务交接和离开，退出仍独立确认，不自动退出。
- **验收：** 当前拥有者再次校验；候选仅有效成员；新拥有者唯一、旧拥有者管理员；失败保留选择和原关系；无候选可回邀请后继续；任务分工不变。

### LIFE-1 · 团队标志正式只有展示

- **P2 · 生产接入，既定目标。** demo 已可上传／删除团队标志；正式 [WorkspaceSettingsPanel.tsx:260](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/WorkspaceSettingsPanel.tsx:260) 只有 TeamLogo，名称／时区是服务保存。头像与团队标志上传属于同一批媒体存储接入，可一起复用，避免分开建设。
- **验收：** 与模块 22 图片类型及 2 MB 限制一致，失败保留旧标志；删除恢复默认；团队切换和设置同步，不把预览视为保存完成。

### LIFE-5（新）· 正式团队信息编辑尚未对齐拥有者独占规则

- **P1 · 正式对齐，已确认目标，尚未安排实施。** PRD-0064 / 模块 22 及交互基线只有拥有者可编辑；本组未找到明确替代这条已确认决定的新记录。demo [team-membership-lifecycle.ts:13](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/members/lib/team-membership-lifecycle.ts:13) 沿拥有者；正式 [WorkspaceSettingsPanel.tsx:99](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/WorkspaceSettingsPanel.tsx:99) 与后端 [WorkspaceAuthorizationService.java:59](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/tenant-service/src/main/java/com/taskdoor/tenant/application/WorkspaceAuthorizationService.java:59) 允许 Owner/Admin，是目标与实现差异，不要求用户重新设计整套权限。
- **最小建议／验收：** 按已定拥有者独占规则同步团队基本信息的 UI/API/CLI；成员管理资格独立保持，管理员只读团队信息。实施前可核对是否有正式项目后续替代决定，找到才调整目标；不凭源码能力自动覆盖 PRD。此项与“能讨论即可 @ 同团队成员”无关，不给 @ 加审批。

## 20 · 成员、邀请与任务选人

**已有／移出。** 通用与邮箱定向邀请可并存，不天然冲突，撤销原 MEM-1 “必须移除通用链接”的 P0 判断。正式已有有效／待加入视图、重发、撤销、邀请到期与人数校验：[WorkspaceMembersPanel.tsx:160](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/WorkspaceMembersPanel.tsx:160)、[invitations/api.ts:58](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/invitations/api.ts:58)；不重复提 MEM-2 后台重建。@ demo 已实现，正式同步属任务讨论组，加入团队不自动授所有任务正文访问。

### MEM-3 · 邀请规则与正式既有政策差异须先统一

- **P1 · 待用户取舍。** 正式有效普通成员也可发定向邀请，可由团队配置审批；管理员可邀请管理员；名称必填。证据：[WorkspaceAuthorizationService.java:55](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/tenant-service/src/main/java/com/taskdoor/tenant/application/WorkspaceAuthorizationService.java:55)、[MembershipUseCases.java:328](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/tenant-service/src/main/java/com/taskdoor/tenant/application/MembershipUseCases.java:328)、[WorkspaceInvitationForm.tsx:55](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/WorkspaceInvitationForm.tsx:55)、[同文件:184](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/WorkspaceInvitationForm.tsx:184)。domain 对管理资格说明也明确管理员可互相管理（`Workspace.java:250`）。当前 PRD09 仍姓名可选、Owner/Admin 才邀请、Admin 只能邀成员。若照旧报告直接“修正式权限”，会改变既有产品政策。
- **最小建议／验收：** 把三处取舍作为一组规则确认，默认优先核对正式已承载的决定后同步 demo/PRD。对待加入、审批等待、已加入分别表述；邀请不是正式任务读取资格，实际同团队有效身份和已有任务分工规则保持。

### MEM-1 · 是否在正式新增通用团队邀请

- **P2 · 待用户取舍，新入口。** demo [PersonalCenterPage.tsx:160](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/members/components/PersonalCenterPage.tsx:160) 有多人通用链接；正式现有 API 为邮箱定向。用户已明确两者不冲突，但未明确正式新增通用入口及其有效期、撤销、默认角色政策。
- **最小建议／验收：** 若仍有多人入团场景，沿现有成员邀请区加独立入口；通用只授团队关系，不授全任务访问；角色和名额校验不绕过正式限制。暂不以“安全收口”删除 demo 已有通用能力，也不自动加入正式待开发批次。

## 21 · 访问令牌

**保留／无新高优先问题。** 正式有真实签发、撤销、scope/任务/团队限制、近期认证及表单续接、一次显示密钥与结果未知重试：[AccessTokensPanel.tsx:146](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AccessTokensPanel.tsx:146)、[同文件:175](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AccessTokensPanel.tsx:175)、[同文件:206](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AccessTokensPanel.tsx:206)、[同文件:393](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AccessTokensPanel.tsx:393)。每个技术 scope 已有用户文案 `[同文件:474]`；因此 TOK-1 的额外摘要只是可后置小改善，不以“丰富说明”增加重复确认页。TOK-2 旧“正式没有近期认证”移出。

demo [AccessTokensPanel.tsx:176](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/credentials/components/AccessTokensPanel.tsx:176) 的令牌仅组件 state 和 sample secret，是 PM 演示边界。无需为此在 demo 实现真实密钥服务；正式 last-used 有实际验证写入（`PersonalAccessTokenUseCases.java:159`），不把样本时间外推为正式虚构事实。

## 22 · 团队任务治理与行为日志

**已有／移出旧 P0。** 正式 [GovernanceTasksPanel.tsx:317](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/GovernanceTasksPanel.tsx:317) 等真实 API 成功后提示，后端 [GovernanceUseCases.java:190](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/GovernanceUseCases.java:190) 保存人员、活动、原因、事件。后端验权及事务已有，GOV-1 不能再称正式假保存。正式日志操作人候选包括历史成员 `[AuditLogPanel.tsx:43]`，不再称离开者一律无法筛选。

### GOV-1 · demo 治理成功提示尚未产生任务事实

- **P1 · demo 对齐，新建议。** 管理人员在 demo 指定负责人后普通详情／刷新不一致；加入任务只报成功。证据：[GovernanceTasksPanel.tsx:178](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/members/governance/components/GovernanceTasksPanel.tsx:178) 更新组件 rows；[同文件:190](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/members/governance/components/GovernanceTasksPanel.tsx:190) 只有 toast；原因参数未落业务。建议完整本地闭环或明确为不可提交的预览，不能保留假的成功写入。
- **最小方案／验收：** 复用已有 App 任务更新／恢复日志保存入口，连同原因和活动一起写；只成功后 toast，关重开／普通详情一致，失败输入保留；加入才获得当前任务访问，不因治理角色直接读正文。

### GOV-4 · 正式日志缺任务／对象上下文，已有关联可复用

- **P1 · 生产接入，既定模块 25 目标。** 正式日志 UI 只有动作、时间、操作人：[AuditLogPanel.tsx:133](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AuditLogPanel.tsx:133)，既有审计结构包含 task/node/version 等 correlations：[AuditEvent.java:57](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/audit-notification-service/src/main/java/com/taskdoor/audit/domain/AuditEvent.java:57)。管理员调查“谁改了哪项任务／为什么治理”需另去找对象，demo 已有任务列。
- **最小方案：** 复用任务列与按需原因展示，优先服务返回允许的摘要及稳定 ID；无正文资格只展示允许摘要，不用日志链接扩大读取权。历史姓名冻结是另一个可后置取舍，当前成员 ID 仍稳定，不能说改名一定误指他人。
- **验收：** 可读任务可打开；不可用对象不点；失权仍保护内容；无任务对象显示“—”；原因及对象只有实际存在才显示，不增加审计报告中心。

## 23 · 删除、回收站与恢复

**已有。** 两边任务分支回收站和期限校验已有，正式层数沿团队配额：[TaskUseCases.java:1969](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskUseCases.java:1969)。demo 仍有旧四层恢复代码只是实现差异；用户本轮已说前三项不重复改，不重新把正式层数能力列为缺失。原“跨任务共享文件只解除关联”模型不适用正式文件唯一任务归属，应移出。

### DEL-1 · 文件删除恢复性仍待统一

- **P1 · 待用户取舍。** 正式文件有软删除／恢复；demo 文件删除即时撤销；PRD13 写不可恢复。用户已有文件 ID／历史快照决定，不等于已决定删除后是否可恢复。
- **最小建议：** 沿正式已有可恢复处理，同步 PRD／demo；如果明确永久删除，应单独设计影响确认和清理，不能为旧 PRD 直接移除正式恢复。既有文件操作 PRD-0168 并未替用户决定此口径，本报告不据旧截图判当前文件布局。
- **验收：** 取消无写入；删除／恢复／永久删除各自含义与权限一致；历史引用保留当时版号和同一文件 ID，不作为暗中恢复入口。

### DEL-2／DEL-3 · 正式任务恢复尚未对齐已定位置与负责人规则

- **P1 · 正式对齐，已确认目标，非后端漏验。** PRD13 / demo 由拥有者处理全队，其余按实际删除人；原父不存在提示恢复顶层，旧负责人离开必须先指定新负责人。正式则用当前有效根负责人／治理资格，不依赖旧删除人（[TaskUseCases.java:2019](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskUseCases.java:2019)）；原父不存在报冲突并允许指定父（[同文件:1943](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskUseCases.java:1943)）；恢复后释放离开者负责关系（[同文件:1980](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskUseCases.java:1980)）。Web 当前 `restoreTask` 未传目标父（[subtree.ts:133](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/subtree.ts:133)）。用户遇到原父失效时只能看到恢复失败，不能完成重新选位置。
- **最小建议：** 沿当前模块 13 目标在原恢复确认核对顶层回退及有效新负责人，不新增恢复向导；逐任务指定复用交接现有逐项／本页批量，不用一个替代人无意覆盖整支。实施前请用户确认仍沿已定恢复规则即可；若决定采用正式当前政策，则明确登记替代范围，不把所有规则重新列为未确定。恢复权限不同需单独比对正式后续决定，不以旧删除人授予已失效团队资格。
- **验收：** 原父失效有可执行处理；不暗中换归属；当前资格、期限、完整分支高度提交重查；离开参与者不复活；失效负责人按已定规则处理；失败整支保持回收站。保留期显示统一为低优先 DEL-4，不抢恢复事实对齐。

## 24 · 语言、时区、权限、响应与服务事实

**保留／移出旧 P0。** 团队业务日已在 demo PRD-0163 对齐，正式团队时区、前后端资格、幂等和 unknown 状态已有；不重复给 SYS-1／SYS-2／SYS-6 安排整套重建。静态检查不证明所有断网／失权竞态无问题，但泛风险不得列已复现 P0；真实异常需要具体场景与回执再定级。键盘／窄屏／减少动态效果沿现有组件验证，不新增通用检查仪表板。

### SYS-3 · 任意新讨论消息的真实翻译尚未接入

- **P1 · 生产接入，既定模块 02 目标。** 两边当前 AI translation 仍查种子目录，正式 [ai/index.ts:274](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/ai/index.ts:274) 明确 mock lookup，导出 MockDataProvider；未知新消息只能原文／无译文。UI 语言已有不代表任意消息翻译服务已有。
- **最小方案：** 只接讨论正文翻译，沿现有每条原文切换和词条复用；缓存按原文版本＋目标语言，真实消息资格必须同步检查。不翻任务标题／目标／完成标准，不新增整任务翻译入口。
- **验收：** 同版本／目标语言复用，修改原文失效；失败原文保留且可重试；不把无译文标已翻译；失权停止展示；金额、身份、附件与原始引用不改写。

## 本组建议收口顺序

1. **正式服务已有、Web 操作未完成：** LIFE-2 所有权转让，TEAM-3 团队删除与恢复；避免拥有者遇到提示后无路可走。
2. **宣称有效但实际未接的能力：** RESP-2 正式职责自动更新，SYS-3 真实消息翻译；前者开关可能让用户误以为后台在工作，后者优先级可按实际跨语言需要下调。
3. **已定目标与实现对齐：** LIFE-5 拥有者独占编辑、DEL-2／3 恢复位置与失效负责人沿当前 PRD；若正式另有后续替代决定，核实后再替代。MEM-3 正式注明过既有邀请／审批决定，须和本项目口径核对；DEL-1 文件恢复性仍是用户本轮未决定的取舍。
4. **demo 对齐：** AUTH-1 首次设置、ME-1 邮箱只读、GOV-1 治理保存事实；ME-2 表单离开保护属于新建议，头像／logo及更多搜索后置。

本报告列建议不等于加入已同意的正式 issue 实施范围；本批已确认事项应保留在唯一待提交 issue 草稿，其余待本轮用户选择后再合并。
