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
