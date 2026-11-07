# 统一任务创建、人员协作与工作区交互（16项）

已于 2026-11-07 提交为 [nocoly/taskdoor#77](https://github.com/nocoly/taskdoor/issues/77)，共 16 项。以下为已发布正文归档。

本批记录正式项目的 16 项产品调整，依据 PM Demo 本地已完成的最终改法，说明改什么、怎么改及如何验收。

本批重点是将新建任务统一为列表内单行创建，并同步人员、通知、筛选、讨论引用及草稿预填的最终交互。正式项目复用既有权限、生成及保存服务，参考本批源码迁移。

PM Demo 实现：[PR #23](https://github.com/taskdoor-ai/taskdoor/pull/23) · [固定提交 19f1a135](https://github.com/taskdoor-ai/taskdoor/commit/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5)。下方源码链接均指向本批实现提交，供正式项目迁移参考；权限、生成及保存继续复用正式服务。

## 1. 头像菜单及其子菜单向上展开

左下角头像主菜单从头像上方打开。语言、强调色和自定义强调色子菜单仍在各自触发项侧边打开，底边贴近触发项底边并向上展开。靠近窗口边缘时沿用现有菜单的自动避让。

**验收**　打开左下角头像菜单，依次检查语言、强调色和强调色里的自定义选项。空间充足时，三个子菜单都从对应触发项的底边向上展开。鼠标和键盘均可操作，贴近窗口边缘时仍可访问选项。

**PM Demo 源码**　[头像主菜单](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/app/workspace/components/WorkspaceNavigation.tsx) · [语言子菜单](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/shared/ui/LanguageSwitcher.tsx) ·[ 强调色及自定义子菜单](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/me/components/AccentColorSetting.tsx)

## 2. 统一新建任务入口与子任务创建输入

- 左侧团队名下的「新建任务」使用加号图标，与列表右上入口展开当前团队列表中的同一输入行。从详情、回收站等其他页面点击左侧入口，沿用既有离开保护，自动回列表、展开并聚焦。重复点击任一入口只聚焦当前输入；窄屏触发后关闭导航抽屉。
- 两个新建入口和子任务页签的「添加子任务」复用单行输入样式，提示「描述你要完成的任务…」，右侧仅保留「取消」「创建」。空白禁用创建，回车提交，Esc或取消收起并回焦可见入口。列表与详情间导航保留当前页面内的草稿，按账号和团队隔离；切换账号或团队重建输入，不跨团队带入。
- 提交后进入可取消的详情加载态，阻止重复提交。主任务保存到当前团队；直接添加子任务时，结合本次需求及父任务名称、目标、任务完成标准生成一个直属子任务。生成和保存成功后打开新任务详情；取消或失败回到原输入并保留需求，不新增任务。

**改法与原因**　两个新建入口共用列表的一份创建状态和提交动作，左侧入口只负责切回列表并请求聚焦。详情已有常驻入口，可一步完成返回和新建，无需再维护独立对话创建页。正式项目将该入口接入既有生成、权限及保存服务；首任务引导继续沿用原流程。

**验收**　分别从列表两个入口、详情及回收站触发，均只展开同一行；重复点击保留输入。核对账号／团队隔离、窄屏抽屉关闭和聚焦、空白禁用、回车／Esc、生成取消、失败保留及成功详情跳转。主任务归属当前团队，子任务只归属当前父任务；取消或失败不产生任务。

**PM Demo 源码**　[左侧导航](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/app/workspace/components/WorkspaceNavigation.tsx) · [工作区列表切换](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskWorkspace.tsx) · [列表入口](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskWorkspaceList.tsx) · [子任务入口](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskSubtasksPane.tsx) ·[ 共用输入行](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskInlineCreateForm.tsx) · [加载与取消](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskDetailLoading.tsx) · [生成和保存](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/app/App.tsx)

## 3. 在右侧主区展示任务回收站

- 点击左侧「回收站」后，在右侧主区展示当前团队的回收站，左侧高亮当前入口。窄屏从导航抽屉进入，打开页面后收起抽屉并聚焦页标题。
- 有结果时，表格、结果计数和分页共用浅边框。计数紧跟最后一行，结果只有一页时仅显示计数。删除时间单行显示，操作列右对齐。窄屏仅表格区域横向滚动。
- 回收站为空或搜索无匹配时，卡片最小高度为 208 px，使用 24 px 循环箭头回收站图标。图标和对应提示居中，隐藏底部计数和分页栏。
- 搜索、按页勾选、批量操作和权限沿用回收站现有规则。恢复与彻底删除各自使用原确认流程。

**验收**　桌面和窄屏均可从左侧进入右侧回收站，再返回任务列表。空回收站和搜索无匹配时，带循环箭头的回收站图标与提示居中可见，卡片底部无「共 0 项」和分隔线。单条记录下方紧接计数，多页结果可翻页。恢复和彻底删除的确认可正常打开和取消。

**PM Demo 源码**　[左侧入口](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/app/workspace/components/WorkspaceNavigation.tsx) · [主区切换](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/app/App.tsx) ·[ 回收站页面](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskRecycleBinPage.tsx) · [表格与窄屏样式](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/styles/task-recycle-bin.css)

## 4. 统一通知筛选并修正任务筛选浮层位置

- 通知的事件文案不重复任务名，在事件说明之后显示可点击的纯文字任务名，名称前不加装饰图标；时间行显示时间和所属团队。点击或用键盘激活任务名，按通知来源切换团队并打开准确任务；讨论提及继续定位原消息，来源删除或失权时沿用不可用提示。
- 通知筛选直接显示两栏：左列「已读状态」「所属团队」，右列显示当前分类的选项，切换分类时浮层位置与大小固定。状态单选全部／未读／已读，团队支持搜索及按稳定ID单选，默认全部团队；两项取交集，状态数量随所选团队更新。
- 选值后保持展开，清除仅恢复当前维度，保留另一项条件；清除后焦点落到当前维度的默认选项。左右方向键切换分类和选项，Escape关闭并回焦。铃铛未读数和「全部标为已读」始终作用全局，不随筛选缩小。
- 左侧任务高级筛选固定分类列起点，桌面二级选项向右展开，初始、切换及收起均不跳位。按可用高度限制浮层并内部滚动；空间不足时在原浮层内切换单列选项，并提供返回分类入口。
- 漏斗按钮悬停使用中性浅底，菜单展开或已有筛选条件时使用当前主题强调色。

**验收**　通知两分类切换不跳位；团队与未读组合只展示交集，清除一项保留另一项，全局未读数与全部已读范围保持。任务筛选展开负责人、切换参与者及收起时分类列起点稳定，长内容可滚动，窄屏可返回分类。跨团队通知任务链接及键盘跳转准确，正文后任务名无图标，时间行只有时间和团队，失效来源不误跳。

**PM Demo 源码**　[通知分类筛选](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/notifications/components/NotificationFilter.tsx) · [通知与团队计数](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/notifications/components/GlobalNotifications.tsx) · [通知样式](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/notifications/styles/notifications.css) · [任务筛选](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskListFilterPanel.tsx) · [任务浮层样式](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/styles/task-filter-panel.css) · [来源团队与任务跳转](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/app/App.tsx)

## 5. 在独立页面管理个人标签

- 从任务筛选或任务标签选择器进入同一个「我的标签」页面。点「新建标签」在列表最前面加入一条紧凑编辑行，输入名称后按回车或确认保存，新标签排在最前；取消或按 Esc 收起。返回恢复原任务列表、详情或创建草稿。
- 列表按可用空间排成双列，窄屏单列。每行保留拖动手柄、带标签配色的独立图标、可整段点击的名称和删除入口；新建行也可通过图标浮层选择外观。
- 鼠标或触屏拖动手柄调整顺序，宽屏可跨列移动，松手保存；拖出列表或按 Esc 取消。键盘聚焦手柄后用方向键移动。顺序按当前账号保存，刷新或重新进入后保留；取消拖动或保存失败保留原顺序。
- 点击名称在原行改名，按回车或离开输入框保存，按 Esc 取消。点击图标，在旁边的浮层选图标和底色，原行图标即时预览，点「保存更改」提交，按 Esc 或点击浮层外撤销预览。删除经行内确认后移除个人库条目。
- 管理页、任务详情及标签选择器共用标签图标和配色。带主题图标的标签显示所选图标，通用标签显示默认标签图标。

**验收**　从两个入口进入同一页面。新建只占列表顶部一行，保存后居首，空名称和重复名称无法保存，取消不留空标签，失败保留输入。宽屏跨列拖动、窄屏单列拖动及键盘排序后刷新，顺序保持；取消或写入失败不改变原顺序。改名、外观保存与取消、删除确认均可用，长名称无横向溢出。返回保留原筛选、任务或草稿，排序不改任务标签，已关联任务仍可识别从个人库移除的标签。

**PM Demo 源码**　[标签管理页](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/me/components/TagManagementPage.tsx) ·[ 拖动与键盘排序](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/me/lib/useTagReorder.ts) ·[ 顺序维护](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/me/lib/tag-order.ts) · [外观选择器](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/me/components/TagAppearancePicker.tsx) · [标签样式](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/me/styles/tag-management.css) · [标签显示](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/shared/ui/TagBadge.tsx) · [入口及返回](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/app/App.tsx)

## 6. 为任务创建与编辑 Skill 增加标签分类规范

- 使用产品已有的 12 个图标和 10 种颜色。图标表达主题，颜色区分分组，例如盾牌配绿表示合规审核，配红表示安全门禁。优先复用已有标签的名称、图标和配色。
- 编辑任务时只变更用户指定的标签。移除任务标签只解除该任务的关联。个人标签库的改名、删除或外观变更须来自用户明确要求。
- 正式创建预览 `taskdoor.task-preview.v1` 通过摘要提供用户要求的标签建议。支持标签字段的入口使用 `labels` 写入任务标签，个人库实际变更使用 `tagOperations`，由应用在确认保存时处理。

**验收**　Skill 列出的图标和颜色键与界面一致。已有同义标签时复用原样式，新标签按主题和分组选择组合。正式预览输出通过现有 Schema 校验，支持写入的入口按确认范围提交。

**PM Demo 源码**　[创建与编辑 Skill](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/skills/agentdoor-task-planner/SKILL.md) · [图标、色板与用法](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/skills/agentdoor-task-planner/references/task-planning.md) · [预览协议](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/skills/agentdoor-task-planner/references/task-preview.md)

## 7. 在子任务页签展示并逐条处理 AI 建议

- 在已保存子任务及快捷创建区下方渲染有效候选集合，每条显示名称、建议负责人及「添加」「忽略」。子任务页签直接添加，不经过创建表单或二次确认；成功后留在当前页签。讨论入口与子任务页签共用同一候选身份和处理记录。
- 「添加」前复核最新来源、已有承接、可选人员、权限、日期及父链，再保存一个直属子任务和对应处理记录；同一来源事项不得重复创建。「忽略」持久移出该建议，失败保留。相关来源讨论或同串回复变化后停用旧候选，无关讨论不影响其他候选。
- 复用现有建议列表、来源校验及添加／忽略回调。添加成功前，候选不计入正式任务、责任分配、活动或进度；无权限时只读。

**验收**　给定有效候选，可逐条添加或忽略；点击前不新增任务，成功后刷新仍可查，重复点击或重新进入不重复创建。相关讨论变化阻止旧候选保存，无关候选保持可操作；失败保留候选，操作不连带处理其他项。

**PM Demo 源码**　[详情接入](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskDetail.tsx) ·[ 建议列表与操作](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskSubtaskSuggestions.tsx) ·[ 演示数据](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/ai/mock/lib/subtaskSuggestions.ts) ·[ 触发规则](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/skills/taskdoor-decompose-task/references/scope-and-triggers.md)

## 8. 显示已保存的点名 @ 和直接回复通知

通知中心读取发给当前账号的点名 @、全体 @ 和直接回复。点名及全体 @ 显示「讨论提及」，直接回复显示「讨论回复」。保留收件人、团队、任务访问权和来源校验，点击任务链接定位到原消息。

**验收**　另一成员点名 @ 当前账号，或直接回复当前账号且未额外 @ 时，各显示对应类型的一条通知。同一消息同时回复和 @ 时沿用已有去重。自己的通知、来源已删除或任务已失权的记录不显示。

**PM Demo 源码**　[通知读取与来源](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/app/workspace/lib/discussion-notifications.ts) · [通知呈现](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/notifications/components/GlobalNotifications.tsx) · [类型文案](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/ai/mock/data/notificationExamples.ts)

## 9. 精简任务详情的编号入口

主任务和子任务的标题旁显示「ID」按钮。悬停或键盘聚焦时提示具体编号及复制动作。点击或按键激活后复制纯数字，并显示复制结果。

**验收**　按钮默认只显示「ID」。鼠标和键盘均可查看提示、复制当前任务编号。剪贴板只包含数字，复制成功后显示反馈。

**PM Demo 源码**　[任务详情](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskDetail.tsx)

## 10. 左对齐平铺任务列表的截止日期

平铺列表的截止日期使用等宽列并左对齐。中文直接显示日期，未设置时显示「不设截止时间」，英文显示「No due date」。窄屏在任务名称下方左对齐。

**验收**　同屏显示「9月5日」「10月12日」和「不设截止时间」，三行文字从同一位置开始。缩窄窗口后，文字左边缘与任务名称对齐。

**PM Demo 源码**　[任务列表](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskWorkspaceList.tsx) · [任务列表样式](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/styles/task-workspace-list.css)

## 11. 在讨论中用 # 引用任务

- 普通发言和回复中单独输入 `#`，在输入框上方展示当前团队可读任务列表；候选只显示名称。继续输入纯数字时按编号精确匹配，例如 `#226` 不命中编号2261；输入标题时按名称查找。
- 点选或回车后，草稿及已发布正文均高亮显示任务当前名称，名称前无装饰图标，常态和悬停均无下划线。已发布引用保存稳定任务身份，鼠标或键盘激活名称打开准确详情；旧引用同样读取当前名称，删除或失权时仅显示编号和不可用提示。
- `@` 仍用于成员提及；普通数字及Markdown标题不触发任务候选。翻译判断忽略引用中隐藏的链接目标，仅含任务引用和数字的消息不显示「暂无译文」。

**验收**　普通发言与回复均可用 `#`、精确编号和标题查找任务，候选完整显示于输入框上方。选中、恢复草稿和发布后均显示当前任务名，无图标和下划线；名称可按原身份跳转，目标失效不泄露旧信息或误跳。普通数字、Markdown标题及 `@` 不误触发，引用加数字不出现翻译占位。

**PM Demo 源码**　[讨论编辑器](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/discussion/components/DiscussionComposer.tsx) ·[ 任务候选](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/discussion/components/DiscussionTaskReferenceMenu.tsx) ·[ 任务查询规则](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/discussion/lib/discussion-task-reference.ts) ·[ 草稿引用](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/discussion/components/DiscussionTaskReferenceNode.tsx) · [发布后的引用](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/discussion/components/DiscussionMarkdown.tsx) · [翻译状态判断](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/ai/mock/i18n/contentReading.ts) · [讨论样式](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/styles/discussion-markdown.css)

## 12. 统一任务选人与参与者布局、排序

- 两人及以上在参与人数行最右侧提供固定的展开／收起箭头，零人或一人不展开。圆形加号单独一行：收起时在头像摘要下方并对齐头像列，展开时在名单下方并对齐名单左缘；使用原人员选择菜单。
- 任务方案、详情、新建子任务、讨论草稿和生成后的人工调整，均可选当前团队已加入及待加入人员。候选先已加入、后待加入，各组保留原推荐优先级及稳定顺序；点击候选头像与整行都执行选择／取消，悬停资料仍可查看。人员筛选也保留尚未被任务引用的待加入人员。
- 摘要与展开名单统一按已加入在前、待加入在后显示，各组沿任务已保存的参与者ID顺序。接受邀请后按最新身份重新归组；只调整展示，不改保存数组。任务详情展开参与者名单及其提示中的待加入人员不展示角色，「待加入」标签按内容宽度显示。
- 新子任务及建议保存前按最新团队目录校验所选人员，允许已加入及待加入人员并保留原ID；创建者资格仍单独要求已加入，已离队或其他团队人选拒绝保存。待加入人员保持空人像及状态，接受前不获得任务访问权；AI自动推荐和讨论 `@` 只使用已加入成员。
- 摘要与共享头像组使用 `box-shadow: 0 0 0 2px var(--ad-surface)` 绘制外侧分隔圈，头像尺寸和内部色块不缩小。默认各头像 `z-index: 0`，后一个覆盖前一个；悬停当前头像 `z-index: 2` 显示完整外圈，键盘焦点清晰。普通与待加入头像使用同一堆叠规则。

**验收**

- 检查零／一／多人、展开／收起和加号位置；所有人工选人入口可选待加入人员，保存及刷新后ID、空人像和状态保持，待加入身份不因此获得访问或创建权限，离队及跨团队人选不能保存。
- 保存顺序为已加入甲、待加入乙、已加入丙、待加入丁时，摘要和名单显示甲、丙、乙、丁；乙接受后显示甲、乙、丙、丁。候选仍按组内原推荐排序；任务详情名单的待加入角色隐藏，邀请角色设置和成员管理页保持原规则。
- 点击候选头像可选中及取消，未引用的待加入人员可搜索并勾选为筛选条件；零结果、清除、Escape与键盘操作可用。混合堆叠外圈、覆盖和尺寸一致，人员资料卡与焦点可见。

**PM Demo 源码**　[参与人布局与排序](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/members/components/MemberSelector.tsx) · [人员选择器](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/members/components/PersonPicker.tsx) · [子任务表单](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskSubtaskCreateForm.tsx) · [保存校验](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/app/App.tsx) ·[ 建议创建](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/lib/task-subtask-suggestions.ts) · [候选排序](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/ai/mock/lib/taskMemberRecommendations.ts) · [列表筛选](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskNavigationTools.tsx) · [共享头像](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/shared/ui/PersonAvatar.tsx) · [堆叠样式](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/styles/task-detail-properties.css)

## 13. 通过邮箱批量邀请团队成员

- 团队成员页、任务创建和任务详情共用邀请表单。每行填写一个邮箱，可添加或移除行，空白行跳过；单行多个邮箱视为无效，不自动拆行。提示为「每行填写一个邮箱，并选择角色。」。
- 每行邮箱右侧始终显示角色下拉，默认成员。团队拥有者和管理员可逐行选择成员或管理员；普通成员只能选择成员，管理员选项禁用并提示「仅团队拥有者和管理员可邀请管理员。」。邮箱去空格并忽略大小写，同邮箱同角色只生成一份邀请，角色冲突时提示修改。
- 已加入或已有邀请记录的邮箱跳过，补发沿用单独的重新发送操作，拥有者和管理员均可重新发送管理员邀请。每个新邮箱生成独立邀请。有单行多邮箱、无效邮箱、角色冲突或超出剩余名额时，保留输入，整批不创建邀请。任免已有管理员仍仅限拥有者。
- 新邀请在待加入时显示邮箱，接受后显示账号名称。从任务人员选择器邀请单个邮箱时可直接选用该人，批量邀请后由用户另行选择负责人或参与者。

**验收**　分别从团队成员页和任务内打开表单，桌面、窄屏和键盘操作下每行邮箱与角色保持同行，新增行默认成员。拥有者和管理员各将两行分别选为成员与管理员后提交，并重新发送一份管理员邀请，核对各自角色；普通成员不能选择或重新邀请管理员，且可读取限制说明。单行填写或粘贴半角、全角逗号分隔的多个邮箱时不拆行，显示错误并且整批不新增，其他行和角色保留。重复地址只邀请一次，已有地址跳过；无效地址、同邮箱角色冲突或超出名额时整批不新增。任务批量邀请后原人员选择保留。

**PM Demo 源码**　[共用邀请表单](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/members/components/MemberInvitations.tsx) · [同行布局](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/members/styles/member-invitations.css) · [角色文案](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/shared/i18n/module-messages.ts) · [批量邀请逻辑](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/members/lib/team-invitations.ts) · [团队成员页](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/members/components/PersonalCenterPage.tsx)

## 14. 修正讨论创建任务表单的负责人头像文字

负责人头像内的文字按实际 20px 直径等比缩放，使用与通用头像一致的 0.37 字号比例，替换固定 11px 字号；备用头像文字采用相同比例。

**验收**　从讨论展开创建任务表单，选择中文双字姓名时，头像内文字居中完整显示，不贴边或裁切；切换负责人及暂不分配均可用，人员菜单中的正常尺寸头像保持原样。桌面与窄屏均可读。

**PM Demo 源码**　[表单头像样式](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/styles/task-subtask-editing.css) · [创建表单](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskSubtaskCreateForm.tsx)

## 15. 精简任务详情分隔线并统一留白

移除右侧标签区上方的横线和子任务内容区顶部的重复横线。详情仅在 Tab 下方保留一条分隔线，两端按正文内容边距内缩，桌面各 24px、窄屏各 16px，与 Tab 和正文左右对齐。子任务标题上方保留单次 24px 间距。

**验收**　切换讨论、文件、子任务和活动页签，Tab 下方均只有一条分隔线，横线两端与正文对齐且不贴近详情边缘。子任务空态和有数据时都无第二条顶部横线，右侧标签上方无横线。窄屏保持内缩，无横向溢出。

**PM Demo 源码**　[任务详情样式](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/styles/task-detail-split.css) · [详情布局](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskDetail.tsx) · [子任务内容](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskSubtasksPane.tsx)

## 16. 从简略讨论预填可编辑子任务草稿

- 用户主动点击「从讨论创建任务」后，成功结果始终提供可编辑草稿。结合选中及同串可读讨论、实际引用且可读任务的名称／目标／任务完成标准、当前父任务事实预填；纯引用、数字、寒暄或零散信息也使用已有内容整理。空草稿、无效成功结构及占位名称转为已有信息草稿，不显示拒绝说明或空白占位。
- 不编造人员、日期、标签、商业数值或承诺，不把完成、撤回或暂缓事项改成重新待办。用户操作后的迟到结果不覆盖表单；原讨论或使用的引用任务定义变化、失效或失权时，拒绝按旧上下文保存并保留输入。真实调用、网络、取消、权限及来源错误沿原流程处理，明确保存前不创建任务。

**改法**　同步调整共用单项Skill的讨论分支、生成请求与结果校验、表单渲染。请求仅带同串消息实际引用且当前可读的任务定义，原来源正文和消息身份不改；生成上下文补齐与旧空结果兼容一起完成。

**验收**　引用加数字、寒暄及零散内容均可根据已有事实预填；旧空草稿及占位结果不再留下拒绝行和空表单。人工编辑不被覆盖，来源及引用定义变化时旧稿拒绝保存，未知字段和完成／撤回事实保持。真实错误仍可处理，取消或未确认创建不新增任务。

**PM Demo 源码**　[讨论上下文与结果校验](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/lib/discussion-subtask-draft.ts) · [引用目录接线](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/TaskDetail.tsx) · [讨论创建表单](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/src/features/tasks/components/DiscussionSubtaskCreateForm.tsx) · [生成服务](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/server/discussionSubtaskDraft.ts) · [生成Skill](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/skills/taskdoor-discussion-subtask/SKILL.md) · [字段契约](https://github.com/taskdoor-ai/taskdoor/blob/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5/skills/taskdoor-discussion-subtask/references/output-contract.md)

---

本地交付索引（不属于 issue 正文）。

- 本批已于 2026-11-07 提交为 [nocoly/taskdoor#77](https://github.com/nocoly/taskdoor/issues/77)，共 16 项；上方正文与远程 issue 一致，保留归档，后续不追加。
- PM Demo 已同步交付：[PR #23](https://github.com/taskdoor-ai/taskdoor/pull/23) · [实现提交 19f1a135](https://github.com/taskdoor-ai/taskdoor/commit/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5)。源码均链接到本批固定提交，交付说明见[发布记录](product-sync-published-2026-11-07.md)。
- 已提交的 [#73归档](product-sync-pending-issue-2026-10-26.md)和[#74归档](product-sync-pending-issue-2026-11-05.md)保持。
- 尚未接通的完整上下文、主任务生成 Skill 和动态 AI 建议链路，见[生成链路后续待办](task-generation-followup-2026-11-07.md)，不进入上述完成事项正文。
- 后续已完成改动记录到[新的待提交汇总](product-sync-pending-issue-2026-11-07.md)，新一批从 1 连续编号。
