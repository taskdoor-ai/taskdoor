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
