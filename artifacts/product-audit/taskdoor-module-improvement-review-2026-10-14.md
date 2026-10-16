# TaskDoor 24 模块整体复核 · 2026-10-14

本轮按此前 24 个产品审计模块重新核对当前产出、PM demo 和本地正式项目。产品取舍只按 [任务设计原则](../../skills/agentdoor-task-design/SKILL.md)，保留已确认规则，优先补已有能力的接线，不为了丰富界面新增卡片、证据中心、交接工作台或新的审批流程。

这是复核及建议材料，不是新增 PRD 或整批实施授权。旧 2026-10-13 报告与 106 项原清单保留追溯；当前结论以本报告、最新实现矩阵和已确认 P0 决策为准，不能照旧 P0 数量安排重复开发。审计的 24 个模块与当前 25 个 PRD 文件是两套分组。

证据基线：demo 为 `codex/ai-context-handoff-2026-10-13`，HEAD `57ecc9f50da60b6e57165589d2b78b7ff926196f` 加当前未提交工作树，含 PRD-0165～0168 的最新应用变化；正式项目为 `/Users/yxzuji/Documents/ChatGPT/taskdoor` 的 `sand`，HEAD `50fdb495baab2f0d550f08aa4455f25c55191693`。正式项目只有源码核对，未核验远端新提交或线上部署。本轮复核及后续确认只修改审计材料、待提交 issue 草稿与规划 Skill 的未分配措辞，不改应用、PRD 或正式项目，不调用模型，不运行全量测试或双重审查。

## 已纳入当前待提交 issue

用户已再次确认将创建未保存内容的离开弹窗纳入 [本批 issue 草稿](taskdoor-p0-batch-issue-draft-2026-10-14.md)。草稿集中保留五项：demo 已实现的字段成功反馈、@ 自动加入参与者、创建离开确认，以及正式服务待接入的真实任务分析 Skill、已有职责分析 Skill。用户已授权提交后 @ 后端陈佳豪跟进两类服务，具体账号发布时核对，不猜测。demo 通知消费按用户决定移出本轮待办。正式同步状态与 demo 完成状态分别记录，本批 PR 链接仍待补，不使用旧 PR 冒充。

本次复核的新建议先在这里评审，不自动扩进该 issue 的实施范围。已有 issue #40 的讨论／依赖等改动、issue #44 的列表导航规则沿原事项核对，不重复开相同任务。

## 这轮最重要的结论

最优先仍是三个已有方向：**AI 创建完整保存 → 真实分析 Skill 执行并保存 → 文件活动保留当时信息及稳定 ID**。它们决定用户看到的方案、结论与历史是否对应真实已保存的任务内容。

新查出的重点主要是正式前端尚未接已有服务，或者局部交互误述了结果；不是整个正式项目缺后台。以下排序是处理建议，不替用户批准实施。

| 顺序／编号 | 具体问题 | 最小建议与范围 |
| --- | --- | --- |
| 1 · CRE-8／CRE-9 | 正式 AI 方案确认创建只提交部分字段，空负责人被此环节拦截；demo 清掉初始估算 | 复用已有创建、标准、人员和估算能力，完整保存已审阅方案；空负责人允许，已选但失效才拒绝。创建前预览未保存与确认创建后的真实保存分别处理 |
| 2 · ANA-1 | 产品重新分析仍是模拟，终态只重读却提示成功 | 接当前任务分析 Skill、真实 AI、输入版本校验与结果保存；先主动入口，后沿既定事件表接自动分析 |
| 3 · ACT-1 | 文件活动用当前名称、按名字寻找对象 | 当时名称与文件／版本 ID 贯穿保存和展示；改名、同名、删除时不猜另一份文件 |
| 4 · LIFE-2 | 正式拥有者退出被要求先转让，却无 Web 转让入口 | 复用 demo 转让确认接现有转让接口；成功后再继续既有交接与退出 |
| 5 · TEAM-3 | 正式“删除团队”实际调用归档，删除／恢复接口已有但未接界面 | 对齐真实删除和 30 天恢复路径；归档与删除分清，不重建后台 |
| 6 · RESP-2 | 职责 Skill 已有，正式“自动更新”开关仍只有页面状态 | 后端接已有职责 Skill、配置持久化和真实更新；接入前不让开关表示自动服务已启用 |
| 7 · DIS-2 | @ 自动加入在 demo 已做，正式仍待同步 | 合并关系与消息保存，复用正式通知源并定位消息；demo 通知消费不纳入待办，不给 @ 新增加人审批 |
| 8 · ANA-4 | 正式旧展示把 AI 原始 0% 填一格、75%～99% 填四格；两边把子任务汇总标为 AI 预测 | 按现行 AI 分档：0 空、99 三格、100 四格；AI 100% 仍独立于人工确认和任务状态；不新增常驻百分比 |
| 9 · DET-4 | 只读截止日期仍可改页面显示，刷新又回原值 | 把只读资格传到日期控件，有写资格时才允许修改并确认保存；不外推为后端越权 |
| 10 · CRT-1a | demo 删除 A 后，未改 B/C 的人工确认被清掉 | 仅对齐稳定条目身份，不新增调序；本次已用内存纯函数复现，正式基础能力已有 |
| 11 · FIL-2 | 本地修改后的文件从 Web 上传会成为另一编号文件 | “上传新版本”是待取舍入口方案，可复用已有 baseVersionId 协议，普通上传仍新增，不能按同名默默替换 |

正式讨论的单一倒序消息流、禁编辑任务消息、移除前置依赖入口，以及全标准确认后的状态联动，也有明确接线差异；沿已确认规则／原跟进事项处理。只读日期、标准身份和分档这三类问题值得先补事实准确性，头像、图标、搜索扩展等可后置。

## 仍要明确的产品取舍

| 项目 | 需要决定的边界 | 建议 |
| --- | --- | --- |
| DEL-1 文件删除 | 正式可回收恢复、demo 立即撤销、PRD 不可恢复，三处口径不齐 | 优先沿正式已有恢复能力统一，不因旧 PRD 删除成熟能力 |
| AI-4 预览更新 | 打开预览后来源变化，复制最新还是打开时快照 | 有变化先刷新预览，使用户看到的与实际带出一致；失权竞态另外技术验证 |
| OUT-1～4 独立成果交付 | 是逐文件提交，还是一次固定多个文件版本的交付总记录 | 先沿已有逐文件版本，确有一组文件共同验收需求再增加总对象；不是“正式无快照” |
| MEM-1／MEM-3 邀请 | 是否新增通用链接；正式已有普通成员邀请、可配置审批、姓名必填等政策与当前 PRD 不同 | 先核对这些正式既有决定的适用范围，再同步；任务内 @ 规则已定，不混成团队邀请审批 |
| ME-2 设置未保存保护 | 普通手动保存表单关闭／换页时，是否复用创建页丢弃提示 | 只覆盖确有未保存改动的表单，不改成所有设置自动保存或每次退出都确认 |

已确认的拥有者独占编辑团队信息、任务原父不存在恢复顶层、失效负责人恢复前指定新人，归正式对齐事项；除非用户有新的替代决定，不要求重新设计整套权限或恢复规则。上传新版本、最近工具重进预览／仅复制等具体入口仍是建议。

## 24 模块覆盖总览

| 模块 | 当前保留／修正 | 本轮最值得处理的方向 |
| --- | --- | --- |
| 01 工作区导航 | demo 已对齐 0161；不再强制每次筛选选首条 | 正式沿 issue #44 接入；创建入口试排口径后置确认 |
| 02 创建与草案 | demo 0167 离开确认已做；默认主任务、主动才拆 | AI 创建完整保存、允许未分配、正式离开确认 |
| 03 列表筛选排序 | 范围、标签、日期、排序、个人置顶已有 | 日期反向区间就地校验、已有行菜单支持键盘置顶 |
| 04 概览原位编辑 | demo 0165 成功反馈已做；正式真实保存已有 | 正式反馈／失败继续操作、只读日期、demo 空白名称 |
| 05 标准确认状态 | 正式稳定 ID 已有，无调序入口 | demo 删除标准保确认；正式全确认状态联动；只读评估可读 |
| 06 子任务归属 | 正式 10／20 层和独立目标已有 | 正式移除旧前置依赖维护；不重复开发层数或目标编辑 |
| 07 讨论与提及 | demo 0166 自动加人已做，草稿 Map 不是永久丢稿 | 正式 @ 同步、讨论列表／禁编辑对齐；回复输入切换规则 |
| 08 文件上传版本 | demo 0168 浏览、落点、移动、版本差异已做；正式版本服务已有 | 上传新版本入口待选，重用现有协议 |
| 09 文件批注修订 | 正式旧批注原版阅读已有 | demo 原版阅读对齐，批注标记键盘阅读后置 |
| 10 成果回填提交 | 正式逐文件不可变版本已有 | 独立多文件交付记录待选，不冒充存储缺失 |
| 11 分析进度图 | Skill／真实评测成果已有，产品未接 | 真实 Skill 闭环；分档与来源准确；省掉无内容的核对套话 |
| 12 活动追溯 | 正式真实审计保存已有 | 当时快照与原 ID，改名／同名不误跳 |
| 13 AI／CLI／MCP | 正式无作者路径默认值、复制失败保护已有 | demo 目录对齐；预览刷新策略；重进预览／仅复制待选 |
| 14 通知 | 正式通知、已读及具体来源定位已有 | 以正式为准，demo 通知消费及排序不纳入本轮待办 |
| 15 账号首次进入 | 正式真实认证／首次设置已有 | demo 首次设置不要暗中代建团队；不重建正式认证 |
| 16 个人设置 | 正式邮箱只读、姓名保存已有 | demo 邮箱只读；未保存表单保护待选；头像正式接入后置 |
| 17 职责与推荐 | 职责 Skill、正式正文保存及冲突处理已有 | 正式服务调用已有 Skill，持久化自动更新配置 |
| 18 团队与我的团队 | 正式团队创建服务已有、demo 我的团队已有 | 正式删除／恢复接线；demo 多对象保存完整性 |
| 19 所有权交接 | 后端转让与交接已有 | 正式转让入口、拥有者独占基本信息；标志上传后置 |
| 20 邀请任务选人 | 邮箱定向管理服务已有；两类链接不冲突 | 正式既有邀请政策核对、通用新增入口待选 |
| 21 访问令牌 | 正式签发、一次密钥、近期认证与续接已有 | 无新高优先缺口，不增加重复确认页或重建密钥服务 |
| 22 治理行为日志 | 正式事务保存／后端验权已有 | 正式日志任务上下文；demo 治理不要只有成功提示 |
| 23 删除恢复 | 正式任务配额校验和文件恢复已有 | 文件恢复性待选；任务恢复位置、负责人、资格对齐 |
| 24 语言时区异常 | 团队日历、正式验权、幂等已有 | 真实讨论翻译接入；具体断网／失权场景再核验，不泛化 P0 |

## 分模块证据与最小验收

下文沿原审计模块完整保留可核对场景、当前能力、建议分类、代码证据和最小验收。详细证据也分组保存在 [01–07](review-2026-10-14/modules-01-07.md)、[08–14](review-2026-10-14/modules-08-14.md)、[15–24](review-2026-10-14/modules-15-24.md)。本报告为集中阅读入口。

# 24 模块复盘：01–07 · 2026-10-14

> 本轮是产品复盘，所有新建议均待取舍，不构成实施授权。按当前 PM demo 工作树与本地正式项目 `taskdoor` 的实际路由读取；两处均有其他会话的工作，代码存在不等于线上已发布。本报告只新增审计材料，不改源码、正式项目或 PRD，不运行模型、全量测试或双重审查。

依据已完整读取的 [任务设计原则](/Users/yxzuji/Documents/ChatGPT/agentdoor2/skills/agentdoor-task-design/SKILL.md)、[当前交互基线](/Users/yxzuji/Documents/ChatGPT/agentdoor2/docs/task-design-kit/11-task-workspace-detail-interaction-baseline.md)，及 PRD 模块 04、06、07、08、10 和最新实现矩阵 PRD-0165/0166/0167。以下沿原审计编号；后缀编号表示缩小或修正原问题范围，不复活已撤销方案。

结论优先顺序：先完整保存 AI 创建方案、正式接入离开确认与 @ 新规则；然后补保存失败后的保留和重试、纠正只读日期；再处理筛选与讨论的正式对齐和 demo 删除标准后的确认保留。没有新的安全漏洞或泛化 P0 结论。

## 01 · 工作区、导航与信息架构

保留能力：demo 已按 PRD-0161 保留仍匹配的当前选择，不匹配才取实际首条，空结果清详情；自动选择不抢搜索焦点，窄屏没有详情时保持列表。正式项目已有列表错误 Toast 和重试，不再列“加载失败一律伪装为空”为确定缺陷。

### NAV-1 · 正式项目跟进已确认的列表详情同步

- **级别／类型**：P1 · 正式接入（已确认规则，有已有 issue #44，不新建重复项）。
- **触发／事实**：打开任务后切搜索或范围，正式工作区仍保留已打开的筛选外详情；这和当前 demo/PRD 的同一结果集规则不同。正式有分页，不能仅因已加载窗口缺少任务就判筛选排除。
- **最小建议**：沿既有接入任务更新选择策略；正式服务先判当前任务是否匹配完整查询，匹配保留，不匹配兜底置顶优先的实际首条，真空结果清详情；分页窗口不能错误替换深链接任务。
- **验收**：非首条手选任务仍匹配时保持；排除时切首条；空结果清详情；搜索焦点和窄屏列表保持；分页深链接不被首屏数据误判。
- **两边状态**：demo 已实现；正式当前源码仍旧规则，线上未核验。
- **证据**：[demo 选择策略](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskWorkspace.tsx:82)；[正式筛选外保留分支](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskWorkspace.tsx:115)；[正式列表失败重试](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskWorkspace.tsx:136)。

### NAV-2 · 创建入口位置仍需统一当前口径

- **级别／类型**：P2 · 待取舍／文档对齐，不是新增功能要求。
- **触发／事实**：现行导航 PRD 写顶栏主入口，当前 demo 列表搜索旁有加号，最新实现矩阵另保留 10 月 13 日入口试排；原审计不能把试排自动升级成已采纳设计。
- **最小建议**：主代理先核用户已确认的最新入口决定，有决定就只整理现行口径；没有决定才比较列表入口和顶栏入口，先不挪动布局、不增加同等级按钮。
- **验收**：侧栏展开/收起、窄屏、详情与空工作区都能可预测地新建；当前 PRD 与最终采用布局一致。
- **两边状态**：demo 有搜索旁入口；正式也有相应列表入口；当前视觉位置需单独对照，不代表创建能力缺失。
- **证据**：[demo 列表加号](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskWorkspaceList.tsx:209)；[导航现行规则](/Users/yxzuji/Documents/ChatGPT/agentdoor2/docs/prd/modules/04-workspace-navigation.md:31)；[试排记录](/Users/yxzuji/Documents/ChatGPT/agentdoor2/docs/prd/current-implementation-matrix.md:433)。

原 NAV-3 返回阅读位置、NAV-4 各类空态保留为后续必要运行验证，不凭没有显式锚点代码就扩成高优先缺陷。

## 02 · 任务创建与草案修订

保留／纠错：当前创建仍允许主动拆解，用户明确要求拆解时不重复询问；此前 CRE-1 “一律移到创建后拆解”只是旧建议，不能覆盖当前 PRD。CRE-2 的 demo 未保存离开确认、取消保留、丢弃停止生成与空白重入已按 PRD-0167 落实，不再报 demo 缺失。初始预计投入必须保存，只隐藏展示；隐藏不等于可以清掉。

### CRE-8 · AI 创建必须完整保存已审阅内容和初始估算

- **级别／类型**：P1 · 现有缺口／正式接入；用户已确认必须保存。
- **触发／事实**：生成的方案带完成标准、参与者和初始估算，确认创建后应能继续按同一范围分析。demo 的审阅简化函数直接清空估算；正式 AI proposal 适配把标准、参与者、估算列成 unsaved，输出的创建请求只带名称、目标、负责人和日期。正式手工创建适配已会保存标准、参与者和叶子投入，API 也接受创建估算，所以不能说“正式后台完全没有存储”。
- **最小建议**：demo 隐藏估算但传递有效估算、范围签名与创建基线；正式 AI 创建复用现有手工创建/定义/成员接线，不重做后台。需要保留已完成步骤、失败重试回执，不以半套方案全部成功结算。
- **验收**：确认后名称、目标、每条标准、人员与初始 AI 估算均与审阅方案一致，刷新及真实详情读取一致；估算不自动变成人工确认；未知估算不补零，其他未审阅隐藏字段不当成人工事实写入；失败明确哪些已保存和哪些未完成，重试不重复任务。
- **两边状态**：demo 底层创建能存估算，但审阅入口清掉；正式底层能力存在，AI 确认适配未完整使用。
- **证据**：[demo 清空估算](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/lib/task-creation-review.ts:5)；[demo 底层保存估算和基线](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/lib/workspace-task-creation.ts:49)；[正式 unsaved 字段](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/ai-proposal.ts:48)；[正式 AI 创建输出](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/ai-proposal.ts:138)；[正式可复用手工接线](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/manual-create.ts:117)；[正式估算请求字段](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/api.ts:30)。

### CRE-2 · 将 demo 已完成的离开确认接入正式所有出口

- **级别／类型**：P1 · 正式接入；已确认且本批 issue 草稿已有。
- **触发／事实**：用户在输入或预览阶段返回、开其他任务、切团队/模块。demo 统一延后动作并确认；正式 closeCreation 直接清内存，尚无同等统一确认。
- **最小建议**：移植 PRD-0167 会话判定与统一离开控制，不加自动恢复草稿；确认丢弃才执行原离开动作。
- **验收**：非空输入/对话/预览离开弹窗；继续编辑、关闭弹窗均保留；丢弃取消请求且旧回执不恢复方案；空白、内部步骤与成功创建不弹；浏览器刷新采用原生能力而非承诺必然弹窗。
- **两边状态**：demo 已实现及有限运行验证；正式当前还需接入，不声明线上缺陷已复现。
- **证据**：[demo 统一入口](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/app/App.tsx:370)；[demo 未提交历史不持续保存](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskCreationPage.tsx:153)；[正式直接关闭](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskWorkspace.tsx:191)。

### CRE-9 · AI 创建不应重新强制分配负责人

- **级别／类型**：P1 · 正式适配对齐；现行规则已允许未分配，不是新产品选项。
- **触发／事实**：需求明确但还未选负责人，正式 AI proposalProblems 把空 owner 判错；同仓库手工创建发送 null，后端允许未分配。
- **最小建议**：正式 AI 创建允许空负责人，仅拒绝已选但失效的人；沿当前创建者默认参与者及可在审阅移除的规则，不为通过校验强塞负责人。
- **验收**：未分配可创建；失效/跨团队的已选负责人拒绝；人工选择原文和方案保留；创建后正确显示未分配。
- **两边状态**：demo 允许空 owner；正式手工和后台允许，只有 AI 方案确认创建适配仍强制，不是整个创建服务都要求负责人。确认按钮会因空值校验而禁用，提交空值也应与手工路径一致转为 null。
- **Skill 核对**：当前规划 Schema 和运行校验已允许 null，预览契约也允许用户暂不分配时 ready；本轮只澄清规划 Skill 正文遗漏的用户暂不分配／主动清空例外，保留用户选择，不重做 Schema。
- **证据**：[demo 只检查已选人员](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/lib/task-creation-form.ts:115)；[正式 AI 强制 owner](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/ai-proposal.ts:128)；[正式手工 null](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/manual-create.ts:134)；[正式后端已选才检查](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskUseCases.java:325)。

CRE-3 错误定位、CRE-4 减少补问、CRE-6 日期文本输入、CRE-7 增量修改仍是候选体验建议；当前没有新证据要求抢在完整保存之前。

## 03 · 任务列表、搜索、筛选与排序

保留能力：当前两边都有范围、状态、标签、日期、排序与个人置顶；demo 日期已使用团队日历，正式真实查询也不是仅前端设备日期，原时区泛化缺陷撤销。紧凑条件 Chip 已在筛选弹层中，不重复为“丰富列表”加常驻卡片。

### LIS-2 · 反向日期区间应在筛选处明确说明

- **级别／类型**：P1 · 现有缺口。
- **触发／事实**：自定义从 10 月 20 日到 10 月 10 日，两边日期表单都直接应用，没有 from/to 顺序校验；demo 匹配函数要求同时大于下界小于上界，得到空结果。
- **最小建议**：在现有日期区就地报错并保留输入，禁止应用反向区间；不新增复杂日期编辑页。
- **验收**：反向范围不改变列表；纠正后可用；单端范围仍可用；取消回原已应用筛选；错误能被键盘和辅助技术读到。
- **两边状态**：demo 和正式前端均无顺序校验；正式服务最终响应未运行核验，不称错误写入数据。
- **证据**：[demo 直接应用](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskListFilterPanel.tsx:81)；[demo 区间交集](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/task-list-filters.ts:117)；[正式直接应用](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskListFilterPanel.tsx:185)。

### LIS-5 · 用已有行菜单补键盘置顶

- **级别／类型**：P1 · 现有可访问性缺口。
- **触发／事实**：键盘用户能打开任务行菜单，但两边置顶独立按钮为 tabIndex=-1，菜单没有置顶项。
- **最小建议**：已有更多菜单加置顶/取消置顶；鼠标原快捷入口保留，不增加常驻按钮。
- **验收**：仅键盘能置顶和取消，焦点稳定；个人/团队隔离保持；正式失败按真实回执反馈，demo 设备保存受限明确仅会话有效。
- **两边状态**：demo 与正式都有鼠标置顶；键盘缺入口。
- **证据**：[demo pin 与菜单](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskWorkspaceList.tsx:185)；[正式 pin 与菜单](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskWorkspaceList.tsx:349)。

LIS-3 ID/已知链接检索、LIS-4 同名路径、LIS-6 快速撤销完成仍是待取舍，未以静态代码证明真实用户频率，不列本批必做。

## 04 · 任务概览与原位编辑

保留／纠错：demo PRD-0165 名称/目标已等保存完成才给字段旁“已保存”，无变化不提示，失败显示未保存；正式本来就有真实失焦保存、412 重试与错误 Toast。原“正式保存被吞、无回执”撤销；真正缺的是成功反馈同步和普通失败输入保留/显式重试。

### DET-1 · 正式同步就地反馈，并补失败后的继续操作

- **级别／类型**：P1 · 正式接入／现有缺口；成功形式已确认，失败重试是最小建议。
- **触发／事实**：正式保存冲突多次失败会抛回字段保留文本，但普通拒绝走 refused，刷新并增加 revision 重挂详情，旧输入可能回到服务器值；demo/正式错误处都缺一个不必重新编辑的显式重试操作。
- **最小建议**：正式接入已完成的名称/目标独立就地成功反馈；失败保留本次文本，提供字段重试和取消，重试前核对当前任务身份与保存基线。
- **验收**：失败不报成功、不清输入；重试成功只反馈对应字段；切任务或再次编辑旧回执不提示；原值未变不提示；明确权限拒绝时只保留供复制而不持续自动重发。
- **两边状态**：demo 成功反馈已实现，不称完整故障重试已完成；正式已有真实写入，尚需反馈及错误保持接线。
- **证据**：[demo 反馈 hook](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/lib/useTaskTextSaveFeedback.ts:25)；[正式通用失败重挂](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskDetail.tsx:540)；[正式文本冲突区别处理](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskDetail.tsx:571)；[正式字段保持逻辑](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskDetail.tsx:397)。

### DET-3 · demo 不应保存纯空白名称

- **级别／类型**：P1 · demo 对齐；正式已有标题校验，不新增完整编辑弹窗。
- **触发／事实**：demo 名称改为空格失焦，applyCurrentTaskTextField 原样保存且产生活动。正式标题空白提前回原值，服务端有标题约束。
- **最小建议**：demo 字段旁最小校验，保留可修改输入；列表继续显示原保存名称；可取消本次编辑。
- **验收**：空白不入库、不产生活动、不显示已保存；合法长文/特殊字符按已定限制可用；可重新输入或取消。
- **两边状态**：demo 缺空白约束；正式拒绝空白，错误提示形式可与 DET-1 一起补。
- **证据**：[demo 原样写入](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/lib/task-text-editing.ts:11)；[demo 失焦路径](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskDetail.tsx:550)；[正式拒绝空标题](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskDetail.tsx:1109)。

### DET-4 · 无写权限的截止日期不能只改本地显示

- **级别／类型**：P1 · 现有界面缺口；不是后端权限漏洞。
- **触发／事实**：详情把可选 onTaskPeriodChange 包成始终存在的函数传给日期选择器；选择器无 editable/disabled 判断，apply 调完可空的外部回调后更新自身 value。没有写回调时仍能假改日期，刷新恢复原值。正式服务端依旧验权，不由这个 UI 缺口推断越权。
- **最小建议**：只读能力直接传到日期字段，展示已保存日期；有写权时确认回执再改持久显示，错误保留日期草稿。
- **验收**：只读不能打开修改/确认；可写失败不伪装已更新；权限中途改变停止后续写入并保留可复制信息；后端规则保持。
- **两边状态**：demo 与正式同样包装回调，均需界面对齐。
- **证据**：[demo 包装可空回调](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskDetail.tsx:558)；[demo 日期自行改 value](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskDueDatePicker.tsx:147)；[正式相同包装](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskDetail.tsx:1059)。

## 05 · 完成标准、人工确认与状态

保留／纠错：两边没有拖动或上下移调序入口，原 CRT-1 新增调序提案撤销；正式后端已有稳定 criterion ID、正文变化清确认、相同正文保确认。人工确认不等于 AI 达成，不由任务状态反填进度。不要求每条标准必须不同文字。

### CRT-1a · demo 删除前面一条，不应清掉后面未改标准的确认

- **级别／类型**：P1 · demo 对齐；是实际删除动作，不是调序假设。
- **触发／事实**：A/B/C 三条，B/C 已确认，删除 A 保存。demo 以新数组 index 对旧正文/index 配对，B/C 下标变化，确认被清掉。通过只读内存调用当前 applyCurrentTaskCriteria 已复现：返回 `[{text:"B"},{text:"C"}]`。正式 criteriaAfter 对不同正文保留原 ID，后端保留对应确认，已有正确基础。
- **最小建议**：demo 用稳定条目身份处理编辑和删除；实质改写只清该条，不加调序入口。正式同文重复标准的删除身份另做一项定向技术核验：当前前端按第一项匹配正文，后端稳定 ID 本身无此缺陷，不作为已复现正式问题。
- **验收**：删除第一/中间项，不影响其他条确认人/时间/AI 快照；新增不转移确认；相同文字两个标准仍独立；改一条仅对应确认失效。
- **两边状态**：demo 真缺口已纯函数复现；正式不同文字条目正确，同文删除需定向核验。
- **证据**：[demo 按位置保留](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/lib/task-criteria-editing.ts:51)；[真实删除入口](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskCriteriaFields.tsx:59)；[正式正文匹配 ID](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/ai-adjustment.ts:184)；[正式后端稳定 ID](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskDefinitionUseCases.java:145)。

### CRT-2 · 只读用户仍应能用键盘读标准评估提示

- **级别／类型**：P2 · 现有可访问性缺口。
- **触发／事实**：没有确认回调时，两边标准圆环直接 disabled，不能键盘聚焦；评估提示依附此入口。它阻断查看而非只阻断写入。
- **最小建议**：保留可聚焦评估提示，只禁人工确认操作；提示文案清楚说明只读，不增加依据来源列表。
- **验收**：只读键盘/触屏可读当前评估和必要说明，不能确认；保存中禁止重复写；未知不补百分比。
- **两边状态**：demo 与正式均 disabled 整个入口。
- **证据**：[demo disabled](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskCriterionIndicator.tsx:46)；[正式 disabled](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskCriterionIndicator.tsx:69)。

### CRT-4a · 最后一条确认后的状态行为正式还未对齐

- **级别／类型**：P1 · 正式接入；既有交互基线，不新设审批。
- **触发／事实**：demo 确认最后一条后调用任务完成，撤销时恢复；正式 TaskCompletionCriteria 没有 onTaskComplete 或 completed 输入，服务端 setConfirmation 只保存标准及记录，不改变状态。当前正式自动完成规则缺接线，不应再说标准确认本身没保存。
- **最小建议**：沿已确认“全确认自动完成、撤销恢复前状态”的交互补正式接线，同时分别处理已保存的确认与状态回执，避免假称两项都成功。原直接改为已完成仍不被标准/文件/子任务阻断。
- **验收**：最后一条确认后状态同步；部分确认不改状态；状态保存失败保留真实确认并提示可重试；撤销恢复完成前状态且不改 AI 评估；手工直接完成继续可用。
- **两边状态**：demo 有后续状态调用；正式只保存确认，后续状态联动没有。
- **证据**：[demo 两步调用](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskCompletionCriteria.tsx:24)；[正式标准回调](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskCompletionCriteria.tsx:35)；[正式确认保存](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskDefinitionUseCases.java:197)。

CRT-3 确认署名提示、CRT-5 冲突就地对照仍可后置；不新增全任务合并工作台。

## 06 · 子任务与父子归属

保留／纠错：正式 TaskQuota 已 default=10/cap=20，创建等路径按父链和分支校验；无需再开发。两边目标已有独立修改，允许复用父目标与相同文本；不再提 SUB-2 独立目标新增。demo 创建深度/恢复旧四层是已知演示差异，用户本轮未授权对齐，不当作正式新缺陷安排开发。

### SUB-5 · 正式详情仍有前置依赖维护入口

- **级别／类型**：P1 · 正式对齐；PRD-0162 已明确任务只保留父子归属。
- **触发／事实**：正式可编辑任务概览仍渲染 dependencies 区并提供保存回调；demo 当前概览已移除。保留历史后端关系能力不等于产品应该继续给入口。
- **最小建议**：正式界面和当前创建/分析契约停止提供前置依赖维护，材料与交付次序留正文；已有历史记录不需破坏性删除，也不重新引入图谱。
- **验收**：概览、创建、AI 调整均不产生新依赖字段或入口；父子归属/深度/日期/投入校验正常；历史关系不生成当前产品依赖提示。
- **两边状态**：demo 界面已按现行基线简化；正式仍有区块和真实写入回调。
- **证据**：[demo 子任务及标签相邻](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskDetail.tsx:600)；[正式依赖区](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskDetail.tsx:1333)；[正式依赖保存](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskDetail.tsx:1045)；[正式既有层级配额](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/domain/TaskQuota.java:25)。

SUB-3 名称打开与 summary 展开已有原生独立行为，是否触屏/键盘误触须运行验证，不能仅因箭头是图标判功能没实现。SUB-4 父上下文属于真实 AI 创建接入契约的核验，当前 mock 不能证明会读正式父任务全文，归创建 Skill 接入时处理，不新增默认整个团队历史。

## 07 · 任务讨论、回复与提及

保留／纠错：demo PRD-0166 已支持有效同团队候选及发送成功自动加参与者，草稿/失败不加人，同次保存关系及事件，重复重试保留消息 ID。原 DIS-2 “只能 @ 已有任务成员、提及不能扩展关系”彻底撤销；用户已明确不加角色门槛或审批。正式目前仍按任务可见名单提及，需接已确认规则。

### DIS-2 · 正式接入自动加参与者，复用正式通知能力

- **级别／类型**：P1 · 正式接入；不是已复现安全漏洞。用户已明确本轮不补 demo 通知中心。
- **触发／事实**：负责人/参与者发布消息 @ 同团队尚未参与者。demo 已保存新增关系和提及通知事件，通知展示差异仅保留为事实，不列待办；正式 useMentionCandidates 仍只给当前能看任务的人。
- **最小建议**：正式发布成功同次加入参与者，复用已有任务成员关系、业务事务与正式通知服务；加入提醒和提及合一条，不补单独加人审批。通知失败不回滚消息与关系。
- **验收**：草稿/取消/失败不加人；成功后刷新与另一端可见；同成员重复 @、失败重试不重复消息/关系/通知；有效团队成员筛选正确；任务主消息/回复/文件讨论一致；被加入者收到一条可定位提醒。
- **两边状态**：demo 关系实现、通知事件保存已有，通知中心按用户决定不跟进；正式新规则未接，已有访问边界、成员和通知能力可复用。
- **证据**：[demo 发布统一入口](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/app/App.tsx:993)；[demo 最新实现边界](/Users/yxzuji/Documents/ChatGPT/agentdoor2/docs/prd/current-implementation-matrix.md:42)；[正式候选](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/RoutedTaskDetail.tsx:375)；[正式候选 API](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/comments.ts:116)。

### DIS-1 · 正式讨论阅读与回复同步现行单列表规则；demo 当前输入别随对象切换

- **级别／类型**：P1 · 正式对齐／demo 交互对齐；草稿并未被永久删除。
- **触发／事实**：当前规则主消息和回复倒序同一列表、共用底部输入区、发布后不可编辑。正式仍嵌套同串，行内回复并有本人编辑按钮；demo 已采用同一底部输入，但 draftKey 按 replyId 切，composer 在 Map 中保存各对象草稿。普通消息写了一段后选回复 A，看到的是 A 的独立草稿；切回原对象能恢复，不能声称丢稿。
- **最小建议**：正式复用 demo 已确认消息流布局与回复上下文；demo 当前任务使用稳定输入会话，回复对象独立，选 A/B/取消只改变回复目标，正文/提及/附件继续。文件内讨论按现行规则保留线程，不一刀切扁平化。
- **验收**：任务主消息和回复各一次、倒序；普通→回复 A→B→取消保持当前正文/提及/附件；发送清当前稿，失败保留；任务消息不编辑、作者可删；原消息删除时不泄露正文；文件线程不回归。
- **两边状态**：demo 主布局符合，当前输入切对象需对齐；正式任务讨论布局及编辑规则仍旧，不等于正式发布保存失败。
- **证据**：[demo replyKey](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskDiscussion.tsx:109)；[demo Map 恢复证明不是真丢稿](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/discussion/components/DiscussionComposer.tsx:149)；[正式嵌套讨论](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskDiscussion.tsx:109)；[正式行内编辑/回复](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/discussion/DiscussionMessages.tsx:477)。

DIS-3 原失败保持、冲突重载已存在，是否需要局部“重读后重试”可合并到上述输入保持验收；DIS-4 新消息阅读锚点须按真实同步方式运行验证，DIS-5 长 Agent 文本折叠需规模依据，不在本轮新增复杂消息卡片。

## 覆盖与验证边界

| 原审计模块 | 覆盖 |
| --- | --- |
| 01 工作区/导航 | demo 选择策略、正式分页/筛选外分支、错误重试、新建入口口径 |
| 02 创建/草案 | 0167 离开确认、AI proposal 与手工正式适配、估算/标准/人员保存、未分配、层级规则 |
| 03 列表/筛选 | 查询与范围、状态数、标签/日期表单、排序、置顶、键盘入口 |
| 04 详情编辑 | 0165 回执与提示、正式真实保存/412、普通失败重挂、标题约束、只读日期 |
| 05 标准/确认/状态 | 正式稳定 ID、demo 删除确认保留、只读提示、全确认状态联动 |
| 06 子任务/归属 | 正式 10/20、独立目标、前置依赖入口、原生打开/展开及父上下文边界 |
| 07 讨论/回复/@ | 0166 事务式本地发布、正式候选 API、通知未接边界、任务消息布局、按对象草稿 Map |

只做一项有必要的内存验证：直接调用 demo 当前 `applyCurrentTaskCriteria`，删除 A 后 B/C 既有 confirmation 消失。没有写浏览器/应用存储，没有新建任务或发布讨论。正式同文条目删除没有运行验证；尝试使用正式项目自身 `tsx` 加载器时不存在，因此明确保留为技术核验项，未安装依赖或修改正式目录。未进行全量测试、模型调用、外部写入或 UI 破坏性操作。

# 24 模块复盘 · 08–14

> 2026-10-14，只读复核与建议，不是新增 PRD 或实施授权。已读任务设计原则、现行交互基线及 PRD-0162–0168 的实现记录。PM demo 为当前有大量并行未提交调整的工作树；正式项目只读核对 `/Users/yxzuji/Documents/ChatGPT/taskdoor` 的 `sand`，HEAD `50fdb495baab2f0d550f08aa4455f25c55191693`。本文件不证明线上部署完成，也不把静态代码存在等同实际页面验证；未改应用／正式代码、运行测试、调用模型或连接外部客户端。

复核原则：先确认谁在什么场景受影响，优先复用现有入口；事实、用户已确认规则、新建议、待验证分别记录。原审计编号沿用，原先未经核实的 P0 判断不直接继承。本组最重要的是实际分析接入、历史文件定位和 @ 通知闭环；其他项目不应抢在这三项之前扩大功能。

## 08 · 文件、上传、预览与版本

### 当前能力与旧建议处理

- PRD-0168 当前 demo 已接入根／目录浏览、固定上传落点、处理计数、失效目标阻止添加、等待期间文件树合并、移动层级与同位置保护，以及版本作者／时间／前后差异。当前代码与实现矩阵一致，本次不重复列为待开发；其他会话仍在补运行验证，不替它宣称已验收。
- 正式项目已有真实上传会话、逐文件版本、失败后完成重试和保存冲突处理。不可变版本见 [FileVersion.java](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/file-collaboration-service/src/main/java/com/taskdoor/versions/domain/FileVersion.java:18)，上传恢复见 [TaskFileExplorer.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/task-files/TaskFileExplorer.tsx:674)。不再把 demo 文件名数组视为正式服务没有快照。
- **FIL-1 原一律打开引用旧版的提案撤销**：用户已确认普通文件／附件入口默认最新，明确查看旧批注才读对应历史版本。正式项目已有这两条分支；旧批注历史读取见 [TaskFileExplorer.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/task-files/TaskFileExplorer.tsx:433)，普通附件最新提示见 [TaskFileExplorer.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/task-files/TaskFileExplorer.tsx:1360)。demo 的明确旧批注缺口归 ANN-1，不要求把所有普通附件切成旧版。
- FIL-3 批量按条目重试属于另一个取舍。0168 本轮已定全部准备成功才添加整批，不能又把这个选择当作实现错误。FIL-4 原格式回写限于实际支持的格式，不凭示例 PDF／表格投影判断正式原字节错误。FIL-5 删除个性化图标未经用户确认，不重提；当前图形网格改善属于已做呈现精简。

### FIL-2 · 给既有文件补一个“上传新版本”入口

**P1 · 现有缺口／正式接入，新入口方案待取舍。** Agent 在本地改完原文件，再上传会得到另一个同名编号文件；原批注和引用仍在旧对象上，成员不能沿同一个文件查看迭代。

代码事实：demo 上传统一新增节点及同级编号，见 [TaskFileExplorer.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/files/components/TaskFileExplorer.tsx:147) 和 [task-file-upload.ts](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/files/lib/task-file-upload.ts:1)；正式 Web 也先取新编号并上传，见 [TaskFileExplorer.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/task-files/TaskFileExplorer.tsx:693) 及 [source.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/files/source.ts:357)。正式上传协议已经有 `baseVersionId`，见 [upload.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/files/upload.ts:25)，不是重建版本服务。

最小建议：从已选文件现有菜单明确选择“上传新版本”，沿用同一 ID；普通上传继续新增，不新增每次同名都必须选择的弹窗。

最小验收：v2 仍是原文件 ID，v1 与旧批注保留；失败保持 v1；并发出现 v2 时不无声覆盖；同次重试不再生成一版。此处只建议复用已具备协议，不证明具体服务部署支持已验证。

## 09 · 文件批注与成果修订

### 当前能力与旧建议处理

- 两边都有文本选区、线程、回复、解决／重开，且只在同版与唯一匹配的原文上高亮。保护重复句子和旧版选区的做法保留，不自动把 v1 选区贴到 v2。
- 正式已有旧批注读旧版和“查看最新版本”，因此 ANN-1 只作为 demo 对齐，不交给正式项目重复开发。
- ANN-2 未解决筛选可以等真实线程规模需要再加；ANN-4 新增 AI 局部文件修改器需要独立价值和取舍，本轮不把它包装为必要缺陷。

### ANN-1 · demo 的旧批注要能查看原版正文

**P1 · demo 对齐。** 批注针对 v1，但文件已经 v2；现在 demo 只能读保留的引用片段，无法对照当时上下文，不能把版本差异视为完整历史正文。

代码事实：demo 源按钮仅 `onLocate(thread.id)`，旧版文案只说明已保留原文，见 [FileDiscussionPanel.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/files/components/FileDiscussionPanel.tsx:36)。viewer 仍用当前 `currentContent`，见 [TaskFileExplorer.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/files/components/TaskFileExplorer.tsx:323)。正式已有 `pastVersion` 的独立历史内容读取及切回最新，见 [TaskFileExplorer.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/task-files/TaskFileExplorer.tsx:433) 与 [TaskFileExplorer.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/task-files/TaskFileExplorer.tsx:1342)。

最小建议：复用正式原版／最新切换，在旧批注来源处增加明确的原版阅读；不用改普通文件入口默认最新。

最小验收：v1 批注打开 v1 的完整只读正文，选区只落在 v1；版本不可读明确显示，不回退成 v2；主动“查看最新”才切回 v2，不改变批注来源。

### ANN-3 · 批注标记补齐键盘阅读

**P2 · 现有缺口，窄屏布局另待运行验证。** 无鼠标用户可从侧栏读线程，但无法从正文中的标记直接打开对应批注，造成阅读与回应分离。

代码事实：两边 Lexical 标记只监听 `click` 打开线程，没有为每个标记赋予可聚焦语义或 Enter 激活；demo 见 [LexicalFileDocument.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/files/components/LexicalFileDocument.tsx:109)，正式见 [LexicalFileDocument.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/task-files/LexicalFileDocument.tsx:200)。`keyup` 现用于捕获文本选区，不等于批注标记键盘操作。

最小建议：仅补正文标记的可聚焦语义、Enter 打开、关闭还原焦点；复用现有线程，不增加一套批注导航。

最小验收：不使用鼠标可从标记读到正确线程、回复、关闭并回到标记；重叠批注不静默只选错一个；移动端溢出及减少动态效果须实操再判定，不先当作已复现缺陷。

## 10 · 产出回填与正式提交

### 当前能力与旧建议处理

正式项目已有逐文件草稿、提交、冲突保护、不可变版本和提交说明。多文件各自提交及部分成功是正式模型的明确产品事实，不是技术漏做；见 [ADR 0007](/Users/yxzuji/Documents/ChatGPT/taskdoor/docs/adr/0007-task-centric-model-and-per-file-versioning.md:82)。原 OUT-2“仅保存文件名、没有快照”对正式项目不成立；不重建已有能力。

### OUT-1–4 · 是否需要独立的多文件成果提交

**待取舍 · 新产品概念，不计为 P0／现有 bug。** 如果用户需要一次固定“这一轮交付包括三个文件的哪些版本与说明”，现有逐文件历史缺少这份总记录；若需求只是上传并保存各文件版本，现有正式模型已满足。

代码事实：demo `TaskCommitMock` 为展示记录，活动按文件名渲染，见 [TaskActivityLog.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskActivityLog.tsx:87)。正式文件活动也被适配成这些演示记录，见 [activity.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/activity.ts:256)。这不能反推出正式存储只有名字。正式 ADR 明确不引入草稿集，真有共同生效需求再单独立项。

最小建议：先沿用逐文件保存和版本。用户若确认必须有独立交付总记录，再定义对象、固定版本引用、说明和更正关系；OUT-3 提交草稿恢复、OUT-4 替代提交都依赖这个选择，不先实施。

决定后的最小验收：如果沿现状，不显示误导性的整批提交总成功；如果新增交付记录，后续改名／升版不改旧引用，部分文件失败不产生假完整交付，更正新增记录而不重写原记录。无需为本轮重新询问逐文件是否保存版本，用户已经明确需要，正式已保存。

## 11 · 分析、进度与燃起图

### 当前能力与旧建议处理

- 现行 Skill、Prompt、输出校验及严格回归产出已有，但工作台测试成功不代表产品重新分析或自动调度已接入。
- **ANA-2 来源清单／逐句跳转撤销**。用户明确只展示结论与必要说明；内部版本和分析输入仍记录，不加新证据区。
- 状态、人工确认与 AI 判断保持独立；有效历史投影和未知保护已有，不能凭“状态已完成”补出进度或预测。ANA-6 触屏节点固定态仍须实际交互证据，没有新证据不列为高优先缺陷。

### ANA-1（含 ANA-3）· 产品真正调用分析 Skill 后再报告成功

**已确认高优先 · 正式接入／demo 接入。** 用户点击重新分析，需要以当前保存资料重新判断；现在终态只刷新资料、其他任务只是本地重算，却提示已重新分析，用户无法确认新文件／讨论已被纳入。

代码事实：demo [TaskDetail.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskDetail.tsx:269) 在已完成／取消时跳过分析；[App.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/app/App.tsx:244) 调用本地 `recalculateTaskProgressPrediction`；[TaskProgressRefresh.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskProgressRefresh.tsx:15) 成功提示不区分是否执行了分析。正式相同终态分支见 [TaskDetail.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskDetail.tsx:495)，[ai/index.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/ai/index.ts:188) 委托 mock 重算。

现有 Skill 已覆盖用户再次确认的五个维度：任务整体四段进度、逐条完成标准进度、当前情况、下一步建议、燃起图。接入应一次校验并保存这些同版本结果，整体原始工作量与分档展示分别保留，不只更新一个进度数字，不改人工确认或任务状态。

最小建议：产品按钮与保存后事件沿同一个 `agentdoor-task-status-analyzer` 接入点，读取当前已保存且有权资料，执行 Skill／Prompt、调用 AI、校验并保存后成功。连续保存合并，结果自身更新不循环触发。先完成主动入口闭环再按既定事件表接入，不另设计一套模型规则。

最小验收：真实执行一次而非单纯 reload；结果相同也可算成功，但必须执行、校验并保存；失败保留旧结果；旧输入版本晚回不得覆盖最新；已完成／取消可重评内容但不自动重开或生成执行中预测。初始估算读取并保留已有 Skill 结果，不能因 UI 隐藏字段而丢弃。

### ANA-4 · 进度入口沿同一个现行分档与真实来源

**P1 · 正式对齐／demo 细节缺口。** 正式旧分档将 AI 原始 0% 填一格、75%～99% 填四格，与现行展示分档不一致；子任务汇总被标为 AI 预测，把已汇总的当前事实与未来预测混淆。此前“未完成也满格”表述不准确：AI 判断为 100% 时，即使任务仍进行中、标准未人工确认，四格全亮也合法。

代码事实：正式 [progressBand.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/lib/progressBand.ts:8) 仍为 `0–<25% => 1`、`75–100% => 4`，与现行 0／25／50／75／100 内部分档不同；[TaskProgressStage.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskProgressStage.tsx:34) 调用旧函数且把子任务汇总改名。demo 已调用当前分档，但 [TaskProgressStage.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskProgressStage.tsx:25) 仍改名。详情分析确实沿 compact `TaskWorkloadSummary` 使用该入口，见 [TaskDetail.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskDetail.tsx:621)。

最小建议：复用现行分档函数与来源字段，保持用户已确认不常驻百分比。提示究竟用阶段词还是数字，不在本次复盘替用户追加决定：模块08:61 对标题圆环明确阶段词且不展示百分比，模块12:40／59 与基线:139 则写分析分档百分比／四格数字提示，应先按具体表面区分，必要时澄清文档；不把阶段词本身判为确定 bug。

最小验收：有证据的 AI 0% 四格均不亮，未知不能显示成 0%；AI 50% 亮两格，80%／99% 分档显示 75% 亮三格，只有 AI 有效 100% 亮四格；单条标准与整体同一规则。AI 100% 不自动人工确认或修改任务状态；子任务汇总仍标汇总，预测标预测。

### ANA-5 · 有效人工确认后不要强塞“仍需核对”套话

**P2 · 建议，宜随真实 Skill 接入收口。** 已确认全部标准且没有新的内容变化时，固定要求再核对会让确认失去意义，用户无法判断到底有新差距还是模板。

代码事实：demo [task-situation.ts](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/lib/task-situation.ts:143) 无关注项也必补“交付结果与完成标准尚待核对”，终态还补固定核对项，且不接入逐条人工确认；当前情况组件将这些内容拼成正文，见 [TaskCurrentSituation.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskCurrentSituation.tsx:25)。正式也有相同段落投影，不宣称这已经是真模型判断。

最小建议：真实分析有具体新增差距才展示；没有行动省略下一步，不增“全部已验收”结论或强制审批。

最小验收：有效确认且无变化不重复要求同一次核对；新增标准或成果变化提出具体缺口；确认条数不生成完成比例。

## 12 · 活动与历史追溯

### 当前能力与旧建议处理

demo 已有类型及稳定人员筛选、时间信息和原消息跳转。正式已有服务端业务活动，并非只有静态示例；文件提交活动与版本保存同事务，见 [CommitDraftUseCases.java](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/file-collaboration-service/src/main/java/com/taskdoor/drafts/application/CommitDraftUseCases.java:149)。不凭 demo 活动断言正式没有审计。

ACT-2 同任务保留阅读条件可后续复用；ACT-3 条目差异摘要无需先扩出版本中心；ACT-4 分页需规模依据，均不抢在当前误跳转前。

### ACT-1 · 文件活动显示当时信息并按原 ID 定位

**已确认高优先 · 现有缺口，两边均需。** 文件后来改名，旧记录跟着变名；同名对象可能让旧活动打开另一份文件。用户不能核对当时交付了什么。

代码事实：demo [TaskActivityLog.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/components/TaskActivityLog.tsx:111) 按当前 `name.find`；正式 [activity.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/tasks/activity.ts:272) 优先当前名称，适配时未保留原 `targetId`，正式 [TaskActivityLog.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/TaskActivityLog.tsx:171) 又按名字找。正式版本创建活动只记 versionId／number，没有当时名称，见 [CommitDraftUseCases.java](/Users/yxzuji/Documents/ChatGPT/taskdoor/services/file-collaboration-service/src/main/java/com/taskdoor/drafts/application/CommitDraftUseCases.java:161)。

最小建议：保存并穿透文件 ID、当时名称、涉及版本 ID／号；列表文字读取当时快照，点击按原 ID。明确查看某个历史版本再读那个版本，普通文件入口继续沿用户已定最新策略；旧数据不可唯一定位则显示不可用。

最小验收：先上传 A、改名 B，再上传另一份 A，旧活动仍显示原 A 且定位原文件 ID；明确版本来源保持对应版；删除后不猜同名替代；文件版本已有，不因补活动快照新造第二套版本服务。

## 13 · AI 上下文、本地工具、CLI／MCP

### 当前能力与旧建议处理

两边已有复制失败不唤起、尝试打开不假称已启动、取消和手动粘贴提示；任务／消息导出范围按 PRD-0157 保持，不扩大为任务全文。AI-5 安装后实际读任务可通过既有 CLI 步骤核验，不先新增连接仪表板；AI-6 深链长度等外部客户端边界需要实测，未测不宣称失败。

**AI-4 仍待取舍而非已证实权限漏洞**：两边弹窗保留打开时请求快照。用户需要决定复制前刷新最新已保存内容，还是保留打开时内容；建议先刷新预览，让实际带出与用户看到的一致。正式已有失权重读及卸载路径，不把 race 假设泛化成“被移出仍持续可复制”；具体删除／失权同时发生的竞态由技术验证。

### AI-1 · demo 移除作者目录默认值

**P1 · demo 对齐，正式已有无需改。** 陌生设备打开客户端时可能带入作者本机目录，不能让任务 ID 与设备工作目录混为一件事。

代码事实：demo [AiConnectionDialog.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/ai-connection/components/AiConnectionDialog.tsx:46) 定义固定目录，[AiConnectionDialog.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/ai-connection/components/AiConnectionDialog.tsx:179) 没有明确映射时仍使用它。正式 [AiConnectionDialog.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AiConnectionDialog.tsx:212) 已仅用显式 `workspacePath`，没有该默认值。

最小建议与验收：沿正式现状，没有明确设备映射就只带任务上下文；新设备和清除映射后都不产生作者目录；不新增团队共享路径配置。

### AI-2 · 工具状态文案可再精简

**P2 · 文案建议，非已证实连接功能缺陷。** 任务弹窗永远显示“未连接”，可能让已配置客户端的用户误以为需要再安装或授权；但网页尚未建立持久连接也可能是这句话的准确含义，不能凭唤起工具就断言应该显示已连接。

代码事实：demo [AiConnectionDialog.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/ai-connection/components/AiConnectionDialog.tsx:383) 与正式 [AiConnectionDialog.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AiConnectionDialog.tsx:545) 均硬写该状态；旁注明确启动不建立已确认连接。模块05:89 对连接页要求无回执不判断，这是否应同样约束任务工具选择弹窗，应按本次带出动作的目的收口，不作为必需修成功状态的缺陷。

最小建议与验收：可省略无助本次选择的状态行，保留工具选择和已经发生的复制／打开尝试回执；复制、启动尝试、最近使用都不生成持久连接状态；不为修文案新做客户端探测。

### AI-3 · 最近工具仍可进入预览／仅复制

**P1 · 新建议，待取舍。** 第一次可以核对上下文，一旦已有最近工具，主按钮和下拉都直接启动，用户无法再核对这次带出的内容，也不能在不唤起工具时仅复制。

代码事实：demo [AiConnectionButton.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/ai-connection/components/AiConnectionButton.tsx:73) 主按钮直接 launch，下拉仅工具按钮；正式 [AiConnectionButton.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/components/AiConnectionButton.tsx:153) 同样只有工具 launch。

最小建议：主按钮保持一键打开，在既有下拉增加“查看带入内容”和“仅复制”；不强制每次确认，不增加第二个连接页面。用户如果不需要仅复制，至少保留重进已有预览的入口。

最小验收：已有最近工具后仍能重进预览；预览与直接启动同一模板和范围；仅复制不唤起；失败可重试，关闭返回原消息和焦点。此为建议，不能因本轮复盘自动实施。

## 14 · 通知

### 当前能力与旧建议处理

正式已接真实通知 feed、已读 API、来源访问结果、讨论／标准／文件 ID 定位及统一时间排序，见 [feed.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/notifications/feed.ts:304)、[RoutedNotifications.tsx](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/notifications/RoutedNotifications.tsx:25)、[feed.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/notifications/feed.ts:537)。原 NOT-1“正式只有 taskId”不成立，NOT-3 类型固定置顶只是 demo 差异。普通文件通知默认最新的现状沿用户已定规则，不重提一律历史版。

PRD 已明确回复／@／加参与者同事件合并、AI 分析不提醒；NOT-4 不需要再加类型 Tab 或新通知规则。用户本轮明确以正式通知为主，以下 demo 差异不纳入待提交 issue，也不安排本轮优化。

### NOT-1 · @ 事件真正进入 demo 通知中心并定位消息

**已移出本轮待办 · demo 实现差异。** demo @ 后已加入参与者，但被 @ 的人看通知中心收不到这一条，也无法点回原讨论；业务关系成功不等于提醒闭环成功。

代码事实：协作快照已经保存 recipientId、messageId、actor、createdAt，见 [task-collaboration.ts](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/lib/task-collaboration.ts:35) 及 [task-collaboration.ts](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/tasks/lib/task-collaboration.ts:209)。[GlobalNotifications.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/notifications/components/GlobalNotifications.tsx:30) 只初始化演示通知，[GlobalNotifications.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/notifications/components/GlobalNotifications.tsx:45) 只读取 handoff，回调也只有 taskId。正式已有 MENTIONED／REPLIED 的 comment 目标，见 [feed.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/notifications/feed.ts:117)；正式本次要同步的是新的 @ 加参与规则及其合并，不重建整个通知服务。

处理决定：本轮不接 demo 通知消费；正式 @ 规则更新复用既有通知与消息定位，不重建通知服务。

最小验收：发一条同时回复、@、加参与者的消息，接收人只见一条；失败不发，重试不重复；点击到具体已保存消息；删除或失权不暴露旧正文；已读不改任务状态或人员。

### NOT-2 · demo 的交接汇总可核对全部接手项

**仅保留观察 · 本轮不优化 demo，正式对应交接范围待验证。** 提醒写接手 N 项却只打开第一项，用户无法按这次交接核对其余任务。

代码事实：demo [GlobalNotifications.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/notifications/components/GlobalNotifications.tsx:51) 从 `taskIds` 仅取 `[0]`。正式一般多任务通知有计数和单个 source 入口，但本轮未证明正式交接通知也使用同一投影，不扩写成正式确定缺陷。

最小建议与验收：在现有通知条目展开短清单或跳既有本人任务范围并限定本批 ID；N 项可逐项核对，一项不可用不吞掉其他项，已读不等于处理完成，不新建交接工作台。

### NOT-3 · demo 不因通知类型改变时间顺序

**已移出本轮待办 · 正式已具备。** 一条旧交接始终排在今天的新提及之前，会降低新提醒可见性。

代码事实：demo [GlobalNotifications.tsx](/Users/yxzuji/Documents/ChatGPT/agentdoor2/src/features/notifications/components/GlobalNotifications.tsx:52) 直接拼接 handoffs + examples；正式 [feed.ts](/Users/yxzuji/Documents/ChatGPT/taskdoor/apps/web/src/notifications/feed.ts:502) 统一按 createdAt 倒序。

处理决定：正式已有统一排序，本轮不补 demo。原建议仅作差异追溯，不与 @ 正式接入捆绑实施。

## 本组未新增的产品概念与验证边界

- 不新增分析来源清单、证据中心、AI 文件修改器、文件回滚、通知类型 Tab 或交接工作台。
- 不把正式逐文件版本与独立多文件成果记录混为同一个缺陷；OUT-1–4 仍待决定。
- AI-4 复制前最新／打开时快照仍待决定；失权竞态、真实客户端长 URL、触屏图表和线程规模由后续技术或实际使用验证，不转成假确定 P0。
- 普通附件最新、明确旧批注原版的用户决定应在模块11措辞中区分；本次只记录冲突，不改 PRD。文件删除／恢复另由对应模块复盘统一，不在文件0168的旧不可恢复句子上再次替用户拍板。
- 正式能力一律为本地源码核验，不证明已上线、跨端实际状态、真实通知消费或具体模型运行。demo PRD-0168 的运行页面验证由并行实施会话补记，本文件不越权宣称通过。

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
