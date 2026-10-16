# TaskDoor P0 复核 · 以正式项目为准

更新日期：2026-10-14。依据本地正式项目 `/Users/yxzuji/Documents/ChatGPT/taskdoor` 的产品路由与服务端源码复核原 20 个 P0。demo 差异不再作为正式项目待开发任务。当前未修改正式项目、未运行测试或核验线上部署。

**前三项无需重复开发：完成标准没有调序入口；层级默认 10 层、绝对上限 20 且已有校验；子任务目标已有独立编辑。** 原清单把 demo 状态、正式已有能力与假设混在一起，以下结论替代此前的笼统“待实施”表述。

## 原 20 项的当前结论

| 编号 | 正式项目事实／决定 | 当前处理 |
| --- | --- | --- |
| NAV-1 | 前次已在 demo 处理，并有正式项目 issue #44 跟进记录 | 保留既有记录；本轮不重新开项或判断该 issue 的线上完成状态 |
| CRE-2 | 新建为空白、卸载取消生成已有；不同离开出口缺统一丢弃确认，有内容会话仍保存 | demo 已按 PRD-0167 实现有未提交内容离开的确认与清理；正式项目仍待统一出口接入。撤去“旧方案必然自动出现”的推断 |
| DET-1 | 正式名称／目标已有真实失焦保存、失败 Toast 和版本冲突重试，不存在 demo 那种吞掉写入错误的同一问题 | 收窄为失败保留输入与明确重试体验；普通失败重挂载恢复服务端值需在实施时验证。成功反馈已确定为字段旁“已保存”，demo 已按 PRD-0165 实现；正式项目待跟进 |
| CRT-1 | 没有拖动／调序入口；正式标准已有稳定 ID | 原重排提案撤掉，不新增调序或重复开发标准身份机制 |
| SUB-1 | 正式服务按完整深度和团队配额校验创建、批量创建、移动、恢复；默认 10、绝对上限 20 | 正式已有，移出待改；本轮不把 demo 对齐列为待开发 |
| SUB-2 | 正式与 demo 均已有独立目标编辑，可保留与父目标相同的文字 | 正式已有，移出待改，不新增编辑入口或不同文字限制 |
| DIS-2 | 当前正式候选／发送要求对方已有任务访问，尚未因 @ 自动加入参与者 | demo 已按 PRD-0166 实现；正式项目仍待同步：能发讨论即可 @ 同团队有效成员，发布成功时自动加入，不另设加人角色门槛 |
| FIL-1 | 普通附件打开最新并注明引用与当前版本；旧版文件批注真实读取指定版本并可查看最新 | 已符合目前方向，撤去“一律打开引用旧版”的原提案，沿现状保留 |
| OUT-2 | 正式保存不可变逐文件版本，含文件 ID、版本、内容指纹和说明；没有任务级“本次成果提交”总对象 | 撤去“正式项目只存文件名／没有快照”的错误判断。独立多文件交付记录如需新增，另作产品选择 |
| ANA-1 | 产品重新分析仍委托模拟，终态仅刷新 | 保留已确认修改：点击重新触发当前任务分析 Skill 与真实 AI，校验并保存结果后成功，失败保留原结果；产品接入仍待实施 |
| ANA-2 | 用户决定保留分析结论，不新增来源列表或逐句来源跳转 | 原新增展示提案撤掉，内部上下文及版本保护保留 |
| ACT-1 | 活动前端丢原文件 ID、优先取当前名称；版本创建事件也缺当时名称 | 保留已确认修改：活动显示当时快照，保留文件／版本 ID 以定位同一文件；补齐事件当时名称 |
| AI-1 | 正式连接 AI 已没有开发者目录默认值，只有明确提供才带路径 | 正式已有，移出待改；demo 默认目录不混入正式任务 |
| AI-4 | 当前预览保存打开时快照，复制时不再读取；已有失权事件重读与详情卸载 | 预览版本策略需用户选择；失权竞态归技术验证，不按已复现漏洞立项 |
| MEM-1 | 定向和通用邀请可以共存；正式目前只有邮箱定向，demo 才有通用链接 | 原“两种天然冲突所以移除通用”提案撤掉。正式是否新增通用邀请另需确认 |
| GOV-1 | 正式前端等待真实 API；后端事务保存成员／负责人、原因、活动和通知事件 | 正式已有，移出“假保存／未保存”待办 |
| DEL-1 | 正式文件唯一归属任务，无跨任务共享关联解除模型；删除可回收和恢复 | 原“只能解除共享关联”不适用。是否保留正式已有文件恢复，需与旧不可恢复 PRD 统一 |
| SYS-1 | 正式已有团队时区、业务日与日期筛选机制 | 正式已有，移出待开发；demo 的已完成时区修正保持单独记录 |
| SYS-2 | 正式任务和文件服务已有后端验权 | 不重复设计或立泛化缺陷；新增 @ 行为按已确认讨论资格实现，具体竞态归技术验证 |
| SYS-6 | 正式创建、讨论、治理等已有操作标识、事务防重复与未知结果处理 | 撤去笼统“超时假成功／重复创建”缺陷判断；具体异常路径由技术验证后再提出 |

## 已明确的修改方向

1. **CRE-2**：确认创建前的输入与预览尚未保存为任务，返回或离开时提示丢弃；取消保留、确认清理。demo 已按 PRD-0167 实现，正式项目待同步。确认创建后该保存的字段仍须保存，两者不能混为同一缺口。
2. **DET-1（收窄）**：保留失焦保存；失败输入保留、清楚反馈并可重试。成功反馈已确定为字段旁短暂“已保存”，demo 已实现；失败仍无一键重试入口，不将本轮标为整项完成。
3. **DIS-2**：@ 同团队有效成员自动加入参与者，发消息与加人同次保存，不增加单独角色权限。demo 已实现，正式项目待同步。
4. **ANA-1**：产品按钮重新触发真实任务分析 Skill，使用最新已保存内容，校验并保存结果后成功；已记录本批 issue 草稿，实际接入待实施。
5. **ACT-1**：历史文件活动保存并展示当时信息，用原 ID 定位。

demo 已完成 DET-1 的名称／目标成功反馈（PRD-0165）、DIS-2 的 @ 自动加人（PRD-0166）以及 CRE-2 的未保存离开确认（PRD-0167）。分析 Skill 接入、文件活动定位及正式项目同步仍待处理。本批进度集中见 [待提交 issue 草稿](taskdoor-p0-batch-issue-draft-2026-10-14.md)，不将 demo 实现称为正式项目完成。

## DIS-2 · 正式项目跟进补充（2026-10-14）

用户再次明确要求记录到[正式项目 nocoly/taskdoor](https://github.com/nocoly/taskdoor)的跟进范围：**允许 @ 同团队的有效成员；讨论发布成功时，将尚非当前任务负责人或参与者的被提及者自动加入当前任务，身份为参与者。** 复用现有 [PRD-0164 的讨论规则](../../docs/prd/modules/10-discussion-notifications-activity.md#31-讨论与引用)，不新增一套需求或重复变更编号。

- 当前限制的准确口径：被提及者须已有当前任务访问权，不仅限直接任务成员。本地正式项目 `sand` 分支、提交 `50fdb495baab2f0d550f08aa4455f25c55191693` 中，`TaskCommentUseCases.resolveMentions` 和 `mentionCandidates` 均按 `seeingRole` 检查；本次未核验远端最新代码或线上部署。
- 改动应同时覆盖候选查询与发布校验；操作者具备当前任务讨论发布资格即可，不额外要求管理员或单独加人审批。被提及者加入当前任务，不因此变更团队角色或当前任务负责人。
- 仅选中 @、未发送、取消或发布失败不加人；已有负责人／参与者不重复加入。消息与新增参与关系同次保存，活动及通知遵循现有合并与重试去重规则。
- 跟进状态：已确认待实施；本次仅补充记录，未修改应用或正式项目源码。尚未获准向 GitHub 提交本条 issue，关联实现 PR 在实施后补充。

**后续本地实施：**用户随后要求先实现当前 PM demo，现已按 [PRD-0166](../../docs/prd/current-implementation-matrix.md) 接入消息与参与者的成组保存；任务讨论、回复和文件讨论共用，27 项定向功能检查通过。页面核验选择 @ 时不加人、发送成功后加入、活动记录和刷新保留。正式项目仍待跟进，尚未创建 GitHub issue 或实现 PR。

## 真正需要用户决定的 4 个产品选择

| 编号 | 要确认的选择 | 建议／当前默认 |
| --- | --- | --- |
| OUT-2 | “提交成果”沿用现有逐文件提交，还是新增一份组合文件版本和说明的独立交付记录？ | 建议先沿用已有逐文件版本；后者是新增需求，不能当现有漏保存 |
| DEL-1 | 文件删除沿用正式回收站可恢复，还是改成确认后永久删除？ | 建议保留正式已有恢复；原跨任务关联删除方案不适用 |
| AI-4 | 带出 AI 前刷新最新已保存内容，还是保留打开预览时的快照？ | 建议带出前核对并刷新预览；失权清理另由技术核验 |
| MEM-1 | 正式项目是否新增通用团队邀请链接，与已有邮箱定向邀请并存？ | 两种不冲突；新增通用入口及其有效期／撤销规则需单独明确 |

不把“现有接口是否保存、是否验权、是否防重复”交给用户凭感觉判断；这些事实由代码和针对性验证确认。

## 本轮新增的正式代码证据

- [创建关闭出口](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskWorkspace.tsx:191)、[名称目标真实保存及失败处理](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskDetail.tsx:571)。
- [普通附件最新与引用版本提示](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/task-files/TaskFileExplorer.tsx:1360)、[旧版批注读取](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/task-files/TaskFileExplorer.tsx:433)。
- [逐文件版本](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/file-collaboration-service/src/main/java/com/taskdoor/versions/domain/FileVersion.java:18)、[没有任务级总提交的领域决定](/Users/yxzuji/Documents/ChatGPT/taskdoor/docs/adr/0007-task-centric-model-and-per-file-versioning.md:82)。
- [活动丢 ID 的适配](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/activity.ts:272)、[版本创建事件缺当时名称](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/file-collaboration-service/src/main/java/com/taskdoor/drafts/application/CommitDraftUseCases.java:161)。
- [真实治理事务](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/GovernanceUseCases.java:190)、[预览使用打开时快照](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AiConnectionDialog.tsx:198)。
- [文件软删除和恢复](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/file-collaboration-service/src/main/java/com/taskdoor/nodes/application/NodeOperationUseCases.java:170)、[失权事件重读](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/live/liveUpdates.ts:121)。

<details>
<summary>此前的审计记录与原始建议（仅供追溯）</summary>

## 此前复核记录（含 demo 差异，仅供追溯）

正式项目核对范围为本地 `/Users/yxzuji/Documents/ChatGPT/taskdoor` 的 `sand` 分支代码；没有修改该仓库、触发真实模型或核验线上部署。PM demo 与正式项目的事实分别记录。

| 编号 | 本轮结论／方向 | 状态与边界 |
| --- | --- | --- |
| CRE-2 | 有未提交内容离开时提示继续编辑或丢弃；确认丢弃后清理旧方案及旧请求，空白无提示 | 用户确认弹窗方向；本轮尚未实施 |
| DET-1 | 保留失焦保存，实际保存成功才反馈；失败保留输入并提供重试 | 当前 demo 确认存在先更新页面、存储失败不反馈的问题；成功使用字段反馈或 Toast 仍待用户取舍 |
| CRT-1 | 去掉原提案：完成标准没有拖动／上移／下移调序入口，不为重排新增功能 | 本项已评审。逐条人工确认与既有稳定身份规则保留；不新增排序开发待办 |
| SUB-1 | 调整后采纳：层级沿实际团队配额，默认 10 层、绝对上限 20 层 | 本项已评审，PRD-0164。正式后端已有完整深度校验；demo 的创建／恢复配额对齐尚待实施。未查询当前运行团队配额 |
| SUB-2 | 保留已有能力，去掉新增能力提案：子任务可复用父目标并独立编辑，不要求文字不同 | 本项已评审。demo 和正式项目已具备目标编辑，不新增入口或限制；规则已澄清为 PRD-0164 |
| DIS-2 | 调整后采纳：能在任务发布讨论的人可 @ 同团队有效成员，发布成功时将非负责人／参与者加入参与者 | 本项已评审，PRD-0164。不设单独加人角色门槛；仅保留讨论资格、有效团队身份及任务存在校验。消息和关系同次保存，失败不加人，通知与重试去重。当前尚未接入 |
| FIL-1 | 建议普通文件入口默认打开最新版本；活动／正式提交保留当时快照，需要回看指定旧版本时明确切换 | 用户仍在征询意见，尚未把该建议作为正式决定。明确标称 v1 的阅读／下载不能无提示替成 v2 |
| OUT-2 | 提交记录应保存文件 ID、版本 ID、当时名称及说明快照；可引用保留的版本，无需重复复制整份文件 | 用户认可版本快照方向。原 Review 的“仅文件名”指 demo 提交记录，不表示正式文件服务只有文件名；正式服务已有文件版本 |
| ANA-1 | 采纳：点击重新分析须真实调用任务分析 Prompt 与 AI 机制，校验并保存结果后才报成功 | 本项已评审，PRD-0164。当前产品链路仍模拟，真实服务、任务上下文及结果保存待接入；失败保留旧结果，终态也能分析内容但不自动重开 |
| ANA-2 | 保留分析结论，不新增来源列表或逐句来源跳转入口 | 用户明确不展示依据；内部分析所用内容及版本保护仍保留。原“每个判断加来源链接”提案不再沿用 |
| ACT-1 | 活动展示当时文件名称与版本快照，定位使用文件 ID，不随最新名称改写 | 用户明确方向。正式后端活动有目标 ID，但前端适配仍转成文件名并按名称找当前文件，需保持 ID 传递 |
| AI-1 | 未选设备目录时不自动带入开发者目录 | demo 当前仍有作者本机路径默认值；正式项目已移除默认目录，只有请求明确给路径才携带 |
| AI-4 | 风险场景是预览打开后，源内容变更、删除或用户失权；带出前重查版本及资格 | 属风险与后续规则核对，不是本轮已复现的新故障；不是指所有正常预览都会失效 |
| MEM-1 | 通用链接和邮箱定向链接可以并存，原建议不能以“两种链接天然冲突”为依据删除通用入口 | 用户指出的概念纠正。demo 有两种；正式项目当前仅发现邮箱定向邀请。通用链接的有效期、撤销、默认角色及加入去重需定义，加入团队不自动取得全部任务正文 |
| SYS-1 | 今天、日期筛选、逾期、创建及截止校验使用同一团队日历；纯日历日期不漂移 | 用户授权的 demo 日期调用链已修正，PRD-0163，37 项必要日期检查、结构及应用类型检查通过。旧无字段团队继续上海兼容；时区设置、提醒调度、正式 API／CLI 未由本轮接入。正式项目已有团队日历，本轮未逐页运行 |
| SYS-2 | 服务器每次读写须验权，隐藏按钮只是界面呈现 | 正式项目已有集中服务端验权与文件访问检查；不应误报为整层缺失。新 @ 自动加人需遵守同一权限 |
| SYS-6 | 网络超时可能只是回执未到，界面应表达结果未知，同一操作重试避免生成重复对象 | 通用可靠性要求，不是本轮已复现故障；正式项目创建任务与文件写入已见幂等标识，未逐操作运行核验 |

关键代码依据：

- [正式项目标准身份与确认](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskDefinitionUseCases.java:145)、[深度配额](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/domain/TaskQuota.java:25)。
- [重新分析路由](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskDetail.tsx:985)、[实际 AI adapter](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/ai/index.ts:188)。
- [提及发送检查](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskCommentUseCases.java:249)、[任务权限继承](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskAuthorization.java:18)。
- [文件活动适配](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/activity.ts:260)、[正式项目无默认目录](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AiConnectionDialog.tsx:211)。
- [正式项目团队日历](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/team-day.ts:43)、[幂等请求标识](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/api/idempotency.ts:3)。

## 已处理 · 1 项

### NAV-1 · 统一列表和详情所在的范围

**P0 · 调整后采纳，2026-10-13。** 采用最新 PRD-0161，替代旧 PRD-0160 的筛选变化强制选择首条规则。

**最终规则：**用户主动打开搜索或筛选结果中的任务时正常展示该选择；切换团队、任务范围或调整搜索、状态、标签、日期后，当前任务仍匹配则保留，仅没有选择或原选择不匹配时打开实际列表第一条，置顶优先；无结果清空详情。排序与数据刷新沿用同一规则。自动选择保留当前控件焦点，窄屏筛选停留列表；未提交内容仍归原任务，不带到新任务。

**验收记录：**原待办决策记录已登记选择保留、首条兜底、无结果清空、焦点及中文空说明的定向实操与最小检查通过。

**实施记录：**PM demo [PR #14](https://github.com/taskdoor-ai/taskdoor/pull/14)，提交 b5e8f9e；正式项目跟进 [issue #44](https://github.com/nocoly/taskdoor/issues/44)。此处仅复用已有记录，不判定正式项目已实现。

依据：[最新变更记录](/Users/yxzuji/Documents/ChatGPT/agentdoor2/docs/prd/CHANGELOG.md:8)、[当前任务列表规则](/Users/yxzuji/Documents/ChatGPT/agentdoor2/docs/prd/modules/06-task-list.md:44)、[原待办决策记录](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:20)。原待办部分正文仍停在 PRD-0160，本视图以 PRD-0161 为准。

## 原始建议 · 19 项（仅供追溯，已撤掉或调整的项不再按原文实施）

### CRE-2 · 所有离开出口遵守同一会话生命周期

**P0 · 落实。** 点击列表任务、切区、切团队和显式关闭，目前没有完全走同一销毁路径，隐藏历史入口后仍写localStorage。建议有真实未提交内容才提示丢弃；取消保留，确认清理当前方案并取消旧请求。当前对话内前后步骤仍保留。

**验收：**空会话离开无弹窗；有方案取消不丢；确认离开再新建为空白；晚返回结果不能复活旧会话；已发出的团队邀请作为独立对象保留。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:153)。

### DET-1 · 所有字段的保存结果必须可信

**P0 · 落实。** 标准使用事务保存，而名称、目标等先改内存再effect写入，通用持久化吞掉失败。建议复用已存在的可靠写入路径，成功后短暂反馈，失败在字段旁显示“未保存，输入已保留 · 重试”。

**验收：**容量不足或写入失败不假成功；当前输入不丢；原已保存记录不变；字段与活动一起成功或失败；刷新后与成功回执一致。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:285)。

### CRT-1 · 稳定条目身份，重排不丢确认

**P0 · 落实。** 当前按数组位置和文本保留review，纯排序会丢确认。建议稳定标准ID，正文版本改变才使对应确认失效；排序只改顺序。行菜单提供上移/下移，拖动仅为补充。

**验收：**纯排序保留确认人、时间、依据；插入不影响其它项；同文两项不串联；只改一条只使该条确认失效。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:331)。

### SUB-1 · 四层按绝对父链深度校验

**P0 · 落实。** 当前主要检循环和父引用，四层限制已在实现矩阵登记未完全落实。建议入口、候选审阅和提交共用绝对深度判断，挂到已保存父任务时把父链算入。

**验收：**第三层可加一层，第四层不能加深；API/CLI同样拒绝第五层；并发父链变化重校验；超限整份不提交，保留输入。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:387)。

### SUB-2 · 每个子任务有自己的目标

**P0 · 落实。** 当前校验主要只看主目标，示例子任务有复用父目标情况。建议自身目标解释该子任务贡献，父上下文作为引用，人员推荐读取自身目标。

**验收：**空子目标可定位；改父目标不覆盖子目标；独立打开子任务有清楚工作边界；不复制父全部正文。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:397)。

### DIS-2 · @候选必须能读当前任务

**P0 · 落实/生产接入。** 当前候选来自全体有效团队成员，正式规则只有任务负责人/参与者可读正文。建议候选按当前任务访问关系过滤，发送前重查；提及不隐式加入任务。

**验收：**输入时失去资格的提及明确不可用但保留输入；需要邀请加入时复用参与者入口；不能因提及扩大权限。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:443)。

### FIL-1 · 引用v1必须真正读到v1

**P0 · 落实。** 当前记录referenceVersion，但viewer读selected最新正文，仅提示“引用v1，当前v2”。建议按fileId+version读取历史只读正文，提供主动“查看最新”。

**验收：**v1/v2/v3引用分别对应各自内容和下载字节；旧版缺失明确不可用，不能用最新版填补；历史版不能保存编辑。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:489)。

### OUT-2 · 提交是不可改写的固定证据

**P0 · 正式提交开放前落实。** 当前TaskCommitMock只有文件名数组，不能代表生产引用合同。提交保存ID、固定版本、当时名称和说明快照。

**验收：**后续改名/升版不改变旧提交；同名不误连；旧版本不可用明确显示；重试不重复提交。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:601)。

### ANA-1 · 成功提示必须代表实际分析

**P0 · 落实。** 已完成/取消任务当前只reload，却仍提示“已重新分析”。建议内容分析与未来预测分开；终态仍可评估新增内容和标准，不画执行中预测，不自动重开。

**验收：**只重读不能报分析成功；终态新增内容可重新评估；失败保留旧结果；状态不被分析改写。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:637)。

### ANA-2 · 每个判断能一跳核对来源

**P0 · 落实。** 模型有reference、详情有定位函数，但当前情况组件拼成纯段落且未使用回调。建议句尾来源链接直达正确讨论、子任务、文件及版本。

**验收：**同名不误跳；删除/失权来源不可用且不显示缓存正文；返回分析恢复阅读位置；查看不改状态。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:647)。

### ACT-1 · 历史文件链接不能按名字猜

**P0 · 落实。** 当前活动按name.find找当前文件，改名或同名会错。建议保存fileId+固定版本+当时名称；旧记录不能唯一定位时显示不可用。

**验收：**改名仍打开原对象，v1活动仍读v1；同名不替代；原记录不随最新名称改写。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:703)。

### AI-1 · 删除开发者本机目录默认值

**P0 · 落实。** 当前无workspacePath时fallback到作者本机绝对路径。建议仅明确设备目录映射存在才带路径，否则只带任务上下文。目录是设备偏好，不进入团队共享正文。

**验收：**陌生设备无开发者路径；清映射后不继续携带；任务归属不被目录改变。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:749)。

### AI-4 · 带出前核对当前保存版本和资格

**P0 · 生产接入/建议。** 打开预览后原消息可能被删除或用户失权。绑定保存版本，启动前检查；变更刷新预览，失权禁止复制旧正文。

**验收：**不混旧目标与新消息；不可用来源沿用缺口规则；重试保留工具但重新核对源。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:779)。

### MEM-1 · 移除多人通用邀请，统一定向邀请

**P0 · 落实。** 成员页展示多人链接，认证getPreviewInvitation也接受sharedTeam token，与现行邮箱定向规则冲突。建议复用既有邮箱邀请表单和专属链接，按账号/团队/角色绑定。

**验收：**错邮箱不能加入；旧通用链路不能绕过；重发成功旧链接失效、失败保留旧有效链接；最多50人含有效待加入邀请。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:1063)。

### GOV-1 · 管理操作必须有真实保存结果

**P0 · 生产接入/落实。** 当前治理指定负责人仅改组件state，加入任务只toast，原因未持久化到业务/日志。作为demo需清楚边界；正式接入必须同一次事务保存人员变化、必要活动、原因和通知。

**验收：**成功后普通任务页/日志一致；关重开仍保持；失败保留原因及选择，不报成功；管理身份不自动读正文。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:1145)。

### DEL-1 · 文件删除和解除关联明确分开

**P0 · 落实。** 当前文件有撤销，而正式规则不可恢复。删除前核对当前用户有权看到的引用和版本影响；没有全部受影响任务编辑权时只允许解除本任务关联。

**验收：**取消不改；确认后无恢复；共享文件不被解除关联连删；引用范围变化重确认；历史正式提交保留必要固定证据不成为恢复入口。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:1191)。

### SYS-1 · 团队“今天”只有一套算法

**P0 · 落实。** 创建/排期硬编码Asia/Shanghai，列表用浏览器本地日。团队时区用于今天、逾期、日期筛选和提醒；时间点按用户设备显示，纯截止日始终同一天。

**验收：**不同时区同团队得到同一今天/逾期结果；夏令时按当地日历；改团队时区不改历史时间点、不重复提醒；异常历史日期不猜测补齐。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:1237)。

### SYS-2 · 权限不是按钮隐藏

**P0 · 生产接入。** Demo局部宽松编辑不能等同于正式ACL完成。Web、CLI/API每次提交重验团队身份、任务关系和对象存在；失权清缓存，通知/译文/预览不能继续给旧正文。

**验收：**负责人/参与者/其他成员和撤权中的旧页结果一致；管理者仅有必要摘要；同一动作所有入口同权。验证应围绕变更风险覆盖必要身份，不自动全量测试。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:1247)。

### SYS-6 · 结果未知不报成功，重试不重复对象

**P0 · 落实/生产接入。** 保存、正式提交、批量恢复、交接、团队创建/删除都应有操作ID；超时查原结果再重试。授权、复制、尝试唤起、任务读取、成果保存分别表述。

**验收：**超时后不重复任务、版本、通知、提交；业务失败不生成成功活动；失败保留输入；本地Mock回执不冒充外部服务回执。

证据：task-schedule.ts:3–12；task-list-filters.ts:95–120；模块02-internationalization、15-permissions-errors-nfr；当前实现矩阵。

来源：[原始待办](/Users/yxzuji/Documents/ChatGPT/agentdoor2/artifacts/product-audit/taskdoor-improvement-todo-2026-10-13.md:1287)。

</details>
