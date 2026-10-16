# 同步本地已确认改动：任务创建、讨论与文件协作

> 已提交为 [nocoly/taskdoor#55](https://github.com/nocoly/taskdoor/issues/55)，本文件保留为提交归档。PM demo 对应 [PR #13](https://github.com/taskdoor-ai/taskdoor/pull/13) 和 [更新提交 323522ed](https://github.com/taskdoor-ai/taskdoor/commit/323522edf476a41934d009ec292fb51e50b792a2)。

按以下 7 项已确认、PM demo 已完成的改法同步正式项目，样式与交互参照对应代码。独立子任务拆解本次仅更新 Skill，UI 还需单独设计。

对应更新：[PM demo PR #13](https://github.com/taskdoor-ai/taskdoor/pull/13) · [本次提交 323522ed](https://github.com/taskdoor-ai/taskdoor/commit/323522edf476a41934d009ec292fb51e50b792a2) · [PRD 阅读页源文件](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/public/prd/index.html)。

本次不含此前的临时文件标注、讨论附件与 AI 交接事项。

## 1. 创建任务：右上角入口、三栏渐进呈现

对应实现：[创建页](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/components/TaskCreationPage.tsx) · [平滑呈现](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/components/TaskCreationPlanSurface.tsx)。

- 将「新建任务」固定在全局顶栏右上角、连接 AI 之前，移除列表搜索旁的重复入口；窄屏保留加号入口。
- 点击创建并发送需求后，保留左侧任务列表，打开右侧对话展示 loading；中间立即展示方案骨架，再依次填入名称与目标、任务完成标准、人员与日期。
- 骨架与真实字段使用一致的排布、标签和控件尺寸，内容到达时平滑衔接，避免底部操作区突然跳动或邀请按钮闪现；生成结束后正常编辑，减少动效模式下直接呈现。
- 对话展开时隐藏「创建对话」唤起按钮，收起后再显示；收展保留对话及生成内容，收起不中止生成。
- 移除创建标注和创建流程中的子任务拆解。生成中的人工编辑不被后续内容覆盖；停止或失败保留已到内容，方案完整并校验后才允许确认创建。

## 2. 创建 Skill：真实目标、任务完成标准、截止日期

对应实现：[创建 Skill](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/skills/agentdoor-task-planner/SKILL.md)。

- 更新创建 Skill 的独立目标、标准与排期规范。按 OKR 的结果导向整理任务：标题说明做什么，目标说明为什么做、服务谁、希望解决什么问题或改变什么状态，不能把标题或交付物换个说法当目标。目的不清且影响范围或验收时先补问。
- 完成标准写成可核查的结果、交付和质量要求，保留用户明确的数量、规格、排除项、业务指标口径与时间窗口。没有依据不编 KPI，不把执行步骤或笼统的「完成／优化」当标准，也不承诺任务范围外的业务效果。
- 用户明确的日期优先；范围可判断的有限交付，未给日期时可建议截止时间并说明假设。持续工作、无自然结束点或关键外部等待未知时可留空，不强加日期。保留人工改期和清空，不因改名或改人员重新排期。
- 创建一次只生成当前一个任务，不输出子任务；相关物料各自的数量、规格与日期要求保留。按团队正式职责建议人员，依据不足可未分配；只生成可审阅方案，由用户确认后创建。

Skill 源文件：[创建 Skill](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/skills/agentdoor-task-planner/SKILL.md)、[目标与标准](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/skills/agentdoor-task-planner/references/goal-and-criteria.md)、[排期规范](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/skills/agentdoor-task-planner/references/task-scheduling.md)。

## 3. 独立的子任务拆解 Skill

对应实现：[独立拆解 Skill](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/skills/taskdoor-decompose-task/SKILL.md)。

**范围：本次仅更新 Skill；UI 还需要单独设计，不包含界面与交互流程实现。**

- 使用独立的 `taskdoor-decompose-task` Skill，与创建 Skill 分开。
- 针对一个已保存任务，读取目标、完成标准、已有子任务、相关讨论与直接回复、有效文件正文及团队正式职责。不能只凭标题、文件名或元数据拆解；读取不完整时说明缺口，必要时先补问。
- 只建议下一层剩余的独立交付，不生成孙任务，不重复已有工作，不把每条标准或普通步骤机械拆成任务；单一交付可以不拆。
- 建议包含自身目标、可核查标准、建议人员及职责依据、日期或留空理由。子任务承接父目标的局部贡献，不把父业务指标复制为每个子任务的承诺。Skill 仅返回建议，不直接创建任务、分配人员或修改父任务。

Skill 源文件：[独立拆解 Skill](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/skills/taskdoor-decompose-task/SKILL.md)。

## 4. 统一任务讨论与就地回复

对应实现：[讨论回复](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/components/TaskDiscussion.tsx)。

- 移除文件内独立讨论区、气泡、计数与入口，统一到任务讨论；旧消息保留作者、时间、回复关系和文件来源，不重复出现。
- 普通发言框停靠详情底部。点击回复，在对应消息下方展开回复框，同时隐藏底部普通输入框及占位。
- 回复取消统一放在输入框操作区，移除框上方重复的「回复某人」和独立关闭叉；取消后收起并恢复原回复入口焦点。
- 普通发言、回复不同消息的正文、附件和 @ 草稿分别保留。成功只清本次草稿并恢复普通输入，不强制跳到最新；失败保留原输入。回复对象删除或失去讨论权限时保留草稿并禁止发送，仍可取消，不转成普通发言。

## 5. 区域自动已读、顶层路径、负责人移除、阻塞图标

对应实现：[通知已读](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/notifications/components/GlobalNotifications.tsx) · [任务详情](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/components/TaskDetail.tsx)。

- 实际打开并成功呈现某讨论区后，将本次已呈现内容对应的同区通知自动已读；点击通知或手动进入遵循相同规则。不清除其他任务、其他区域或尚未呈现的新通知，打开通知面板或概览不算阅读讨论。
- 顶层任务不显示重复面包屑或空白路径行；子任务展示真实可访问祖先与当前任务，保留返回和侧栏入口。
- 移除负责人不再填写原因，保存成功显示未分配；失败保留原值，刷新后保持实际保存结果。
- 已阻塞统一使用警告三角图标，覆盖任务标题、状态选择、列表与吸附摘要。

## 6. 文件预览、编辑、下载与上传范围

对应实现：[文件能力表](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/files/lib/task-file-capabilities.ts) · [预览入口](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/files/components/TaskFileViewer.tsx)。

- 上传范围按实际可预览能力开放，任务文件与讨论附件使用相同校验，并在上传处说明预览样式、标注方式及是否可编辑。不支持的文件在生成文件或附件草稿前提示；混合批次包含不支持格式时整批拒绝。
- 本地已完成的格式范围如下，正式项目已有的可预览格式继续保留。

| 格式 | 预览 | 正文编辑 |
| --- | --- | --- |
| PDF | 原版式分页 | 不允许 |
| PPT／PPTX | 逐页静态预览 | 不允许 |
| PNG／JPG／JPEG／GIF／WebP／SVG | 图片预览 | 不允许 |
| MD | Markdown 阅读 | 允许 |
| TXT／LOG | 原文阅读 | 允许 |
| HTML／HTM | 静态页面／源码 | 允许编辑源码 |
| JSON | 保留缩进、空白和行号的源码 | 允许 |
| XML | 保留缩进、空白和行号的源码 | 允许 |

- PDF／PPT 保留页码、缩放、适宽及默认收起的页缩略图浮层，可展开、固定和跳页；PPT 只做静态预览。
- 编辑保存生成新版本；文本下载当前查看的已保存版本，保留原文和扩展名。PDF／PPT／图片下载对应版本原件，预览和标注不回写原件。全屏入口前置，可退出或按 Esc 返回原文件上下文。
- 移除上传网站、网站预览及网页截取流程，保留本地静态 HTML 文件。仅移出未经维护且无修改记录或草稿的不支持内置样例，保留用户文件、原件、版本与历史引用。

## 7. 文件树与列表展开／收起

对应实现：[文件树](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/files/components/TaskFileTree.tsx) · [列表开合](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/files/components/TaskFileExplorer.tsx)。

- 文件树改为紧凑单行，文件夹使用中性色，文件按类型显示图形，长名称保留扩展名。文件夹只展开／收起子项，右侧保持当前文件，不进入独立目录卡片或文件表格。
- 普通进入默认显示有效树顺序的首个未归档文件；明确文件目标优先。窄屏先显示树，点击文件进入预览，返回保留选择；上传／新建默认沿当前文件父目录。
- 保留方向键、Enter／Space、Home／End操作及可辨的当前项和焦点；展开箭头不单独占普通键盘焦点。重命名、移动到、删除归为同组菜单，操作菜单不误打开文件。
- 列表开合只保留预览工具栏左侧一个双态图标，移除常驻文字、底部整行操作栏及留白；悬停提示当前动作，保留键盘切换。仅工具栏吸附，树自然移动，分隔线延伸到详情底部。
- 收展保留当前文件、编辑／标注会话、文件夹状态、树滚动位置与宽度偏好，隐藏树不可聚焦；保留既有拖动调宽和额外拖动收起。
