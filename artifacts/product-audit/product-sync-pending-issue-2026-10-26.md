# 正式项目交付归档 · 2026-10-26

状态：2026-11-05 已发布，共10项。按正式 `sand-v0.1.45` 和 `dev` 源码核对。远程交付见[正式 issue #73](https://github.com/nocoly/taskdoor/issues/73)和 [PM Demo PR #21](https://github.com/taskdoor-ai/taskdoor/pull/21)。

---

## 1. 同步工作区导航与任务列表排版

将正式版「全局顶栏＋窄任务列表／详情并排」改为「左分类导航＋右侧完整主区」：

- **整体排版**：移除64px顶栏；分类导航默认236px，可调200～360px并保存，900px及以下用抽屉。桌面右侧白面板上下及右侧留8px、20px圆角；列表工具栏与正文共用阅读宽度及左右起点。
- **入口位置**：团队、任务范围、回收站、状态与筛选／排序放左侧，连接AI和账号／通知放底部。列表顶部为无框搜索、直接列表／层级切换及最右新建；范围不显示数量，状态零数量隐藏数字。排序统一「最近更新／最新创建」及 `Recently updated / Newest created`，移除置顶入口与分区。
- **列表节奏**：行高由40px调整为最小56px，标题由13px／450字重改为15px／400字重、24px行高；工具栏最小60px。桌面负责人使用128px独立列显示头像＋姓名，窄屏隐藏姓名、控件可折行。
- **列表与详情**：明确打开任务才切详情，返回恢复搜索、筛选、排序、层级开合及滚动；首次进入、返回和排序不自动打开首条。搜索／筛选失配或失权回列表。新增层级视图，名称旁显示可访问直属子任务完成数／总数及小圆环，不计孙级；无子任务隐藏，平铺不显示。

**验收**：桌面／窄屏的外框、留白、行密度和入口与当前Demo一致；列表／详情往返不丢上下文，长标题与键盘操作可达。保留正式分页、路由、权限及保存机制。

**Demo源码**：[导航与切换](../../src/app/App.tsx) · [分类导航](../../src/app/workspace/components/WorkspaceNavigation.tsx) · [外框排版](../../src/app/workspace/styles/workspace-shell.css) · [列表](../../src/features/tasks/components/TaskWorkspaceList.tsx) · [列表排版](../../src/features/tasks/styles/task-workspace-list.css) · [层级投影](../../src/features/tasks/lib/task-list-hierarchy.ts)。

**正式对照**：[全局顶栏与工作区](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/apps/web/src/app/workspace/WorkspaceShell.tsx#L141) · [并排列表／详情](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/apps/web/src/features/tasks/components/TaskWorkspace.tsx#L234) · [现有列表](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/apps/web/src/features/tasks/components/TaskWorkspaceList.tsx#L513)。

---

## 2. 重排任务详情页与人员属性

正式版默认「基本信息」，目标、完成标准、子任务和标签集中在该页签，状态／人员／日期在标题下。调整为：

- **常驻内容与页签**：名称下常驻目标和完成标准，取消基本信息页签；下方为讨论、文件、子任务、活动、分析，默认讨论，分析按有效依据显示。完成标准超过正文4行时展开／收起，编辑和保存使用完整内容；子任务名称最多两行并保留完整title。讨论／文件数量为0时隐藏数字，未知不补0。
- **右侧属性**：详情容器达到960px时，状态、负责人、参与者、截止日期和标签放右侧260px栏，窄屏回主区。共用标签／内容列，列间距10px、内容左留白10px，日期左右内边距各10px；标签全部换行，不再折为＋N，新增用加号。
- **人员呈现**：复用正式已有头像和选人能力，参与者从「前4头像＋弹出名单」改为按宽度收纳的头像摘要与原位完整姓名／职责名单。零／一人不展开，两人以上可展开并收起，减至一人后恢复摘要。圆形加号收起时在头像下方，展开时在参与人数标题同行右侧、名单上方；长名单可滚动，只读不提供维护入口。
- **路径与吸顶**：真实祖先路径放名称上方，无祖先隐藏，移除旧详情顶层路径工具行。复用已有吸顶机制，将摘要从「名称／状态／负责人／日期」改为真实路径、紧凑名称及状态图形，不重复右侧属性；切页签保留草稿和文件选择，短内容不残留旧吸顶。

**验收**：宽窄屏结构、默认页和页签顺序正确；人员零／一／多人及两态加号位置正确，菜单关闭与名单收起回焦正常；标准折叠、路径和吸顶不遮挡内容，原人员权限、保存及草稿保持。

**Demo源码**：[详情结构](../../src/features/tasks/components/TaskDetail.tsx) · [详情属性排版](../../src/features/tasks/styles/task-detail-properties.css) · [人员名单](../../src/features/members/components/MemberSelector.tsx) · [标准折叠](../../src/features/tasks/components/TaskCompletionCriteria.tsx) · [吸顶摘要](../../src/features/tasks/components/TaskDetailStickySummary.tsx)。

**正式对照**：[基本信息与页签](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/apps/web/src/features/tasks/components/TaskDetail.tsx#L987) · [标题下属性](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/apps/web/src/features/tasks/components/TaskDetail.tsx#L1143) · [现有吸顶](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/apps/web/src/features/tasks/components/TaskDetailStickySummary.tsx#L86)。

---

## 3. 统一讨论附件缩略图的名称与封面展示

任务讨论中已发布消息及回复的文件附件卡片统一以下规则：

- **名称**：复用正式版的两行名称规则，超出省略，保留完整文件名title；不显示格式、大小或版本元信息行。图片封面铺满卡片，复用悬停／键盘聚焦显示名称、触屏常显的规则；非图片名称固定显示在缩略图下方，无封面回退图标时名称仍可读。
- **封面**：沿用 [#60 的引用版本封面规则](https://github.com/nocoly/taskdoor/issues/60)，图片用原图，PDF／PPT用首页，视频按第5项跳过空白片头。无封面或加载失败时显示类型图标。
- **历史与失效引用**：按引用原文件名及可靠类型保留对应布局，缺来源警告单独显示；失效附件不能打开，文件改名或更新后仍按原引用呈现。

**验收**：图片、文档、视频及无封面文件的名称与封面符合上述规则；主消息／回复、鼠标／键盘／触屏一致，旧引用不串版本，失效卡片仍可辨识。

**Demo源码**：[附件内容](../../src/features/tasks/discussion/components/DiscussionAttachmentContent.tsx) · [附件引用与打开](../../src/features/tasks/discussion/components/DiscussionAttachmentGallery.tsx) · [真实封面与回退](../../src/features/tasks/files/components/TaskFileThumbnail.tsx) · [主讨论样式](../../src/features/tasks/styles/task-discussion-feed.css) · [兼容样式](../../src/features/tasks/styles/discussion-messages.css)。

---

## 4. 收紧文件删除权限

在正式现有文件写权限和软删除／恢复流程上，增加原始创建／上传者与当前任务负责人校验。创建、上传及讨论附件记录原始身份，后续编辑、改名、移动或再次引用不改变归属；有效任务成员中，上传者仅可删本人内容，当前负责人可删本任务全部内容，未知来源历史文件仅负责人可删。目录连带删除须校验全部后代，确认和提交均按最新资格复查，失败保持原文件。

**验收**：参与者不能删除他人或未知来源文件，任务创建者／管理身份不额外授权；交接、退出及目录操作不能绕过校验。沿用正式现有删除与恢复入口。

**Demo源码**：[删除判定](../../src/features/tasks/files/lib/task-file-deletion.ts) · [文件操作](../../src/features/tasks/files/components/TaskFileExplorer.tsx) · [身份保存](../../src/features/tasks/lib/task-collaboration.ts)。

**正式对照**：[文件写能力与删除入口](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/services/file-collaboration-service/src/main/java/com/taskdoor/nodes/application/NodeOperationUseCases.java#L160)。

---

## 5. 视频封面进一步跳过白色及近纯色片头

正式封面服务已按版本取帧并跳过黑帧；在此基础上增加白色、浅色及近纯色空白识别，继续尝试后续画面，保留有内容的浅底文字与暗底主体。复用正式封面管线并处理旧空白缓存；原件缺失、全程空白或解码失败回退类型图标，不播放声音、不新增换封面入口。

**验收**：黑／白／浅色片头后能显示真实内容帧，全空或不可读时显示图标；原件、引用版本与正常播放保持。

**Demo源码**：[空白判定与缓存](../../src/features/tasks/files/lib/task-file-cover.ts) · [取帧参考](../../src/features/tasks/files/lib/render-task-file-cover.ts) · [封面回退](../../src/features/tasks/files/components/TaskFileThumbnail.tsx)。

**正式对照**：[现有按亮度跳黑帧逻辑](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/services/derived-content-worker/src/main/java/com/taskdoor/preview/CoverRenderer.java#L208)。

---

## 6. 增加负责人和参与者筛选

在正式已有状态／标签／日期筛选上，增加可搜索、多选的负责人／参与者；同角色取并集，跨角色及范围、状态、关键词、标签、日期取交集。支持「暂不分配」「无参与者」，只按正式关系匹配。选中项计入徽标，可逐项、按角色或全部清除；不可用成员保留原条件供清除。返回列表保留条件与排序，状态候选数量保留人员条件、忽略当前状态条件。

**验收**：多选、空值及组合结果准确，徽标与数量同步，平铺／层级及键盘可用，不改变任务分工或访问权。

**Demo源码**：[筛选界面](../../src/features/tasks/components/TaskListFilterPanel.tsx) · [匹配规则](../../src/features/tasks/components/task-list-filters.ts) · [数量投影](../../src/features/tasks/lib/task-list-projection.ts)。

---

## 7. 统一人员名称与用词规范

将正式仍使用的任务负责人 `Owner` 改为 `Assignee`，中文「参与人／未分配」统一为「参与者／暂不分配」，英文任务范围改为 `Assigned to me / Collaborating`。现有 `Collaborators / Unassigned` 保留并统一复用；详情中文标题简写「负责／参与」，团队拥有者仍用 `Owner`。创建、筛选、子任务及活动同步同一角色文案，兼容旧预览标签。

**验收**：各入口及无障碍名称一致，英文完整可读，切换语言不改变人员、任务或用户内容。

**Demo源码**：[人员词条](../../src/shared/i18n/detail-messages.ts) · [创建词条](../../src/shared/i18n/creation-messages.ts) · [任务范围](../../src/shared/i18n/messages.ts) · [活动词条](../../src/shared/i18n/module-messages.ts)。

---

## 8. 增加语言选项上下留白

为账户语言菜单的English／简体中文选项统一最小36px、上下内边距各8px，与自动翻译行等高；窄屏或触屏最小44px，沿用现有语言切换和自动翻译保存规则。

**验收**：选项留白、文字及选中标记完整，键盘可选，窄屏不越界。

**Demo源码**：[语言菜单样式](../../src/shared/styles/language-switcher.css) · [语言菜单](../../src/shared/ui/LanguageSwitcher.tsx)。

---

## 9. 两个子任务入口接入真实 AI

正式后端为两个入口调用真实 AI，执行同一个 `taskdoor-discussion-subtask` Skill，均提供父任务名称、目标和任务完成标准。

- **子任务列表（`prompt`）** 提交一行需求，生成一个直属子任务的名称、目标及至少一条任务完成标准。生成时显示可取消的详情骨架，校验后保存并打开新详情。
- **从讨论创建（`discussion`）** 根据所选消息、所回复的原消息及同段相关回复生成可编辑草稿。生成时在名称和目标处显示骨架，省去额外提示文案和标签入口。用户确认后保存并保留消息关联。

**验收** 在正式环境分别触发两个入口，核对实际模型返回的草稿和保存结果。保存前校验权限、层级及重复提交，取消或失败保留输入，讨论表单可继续手填。

[最新 Skill](../../skills/taskdoor-discussion-subtask/SKILL.md) · [输入输出契约](../../skills/taskdoor-discussion-subtask/references/output-contract.md) · [Skill PR #12](https://github.com/nocoly/taskdoor-skills/pull/12) · [Demo 生成服务](../../server/discussionSubtaskDraft.ts) · [列表创建](../../src/app/App.tsx) · [讨论表单](../../src/features/tasks/components/DiscussionSubtaskCreateForm.tsx)

---

## 10. 调整默认头像配色与字重

沿用正式已接入的Avvvatars字符头像及图片优先／失败回退，仅将默认头像改为Demo固定10色板、白字400字重。颜色优先用稳定成员ID、缺ID用姓名，按码点计算 `hash = (hash * 31 + codePoint) >>> 0` 后对10色取模；圆形及37%字号保持。姓名取字、日韩姓名和空名地址回退继续沿正式现有规则，不用Demo简化规则覆盖其兼容性。

色板顺序为 `#849BD1`、`#67B49A`、`#DF8793`、`#D39A66`、`#6CB6C9`、`#AD92D3`、`#8DB56D`、`#CF8DAF`、`#79AABD`、`#B9AC70`。

**验收**：同ID在各入口、刷新和语言切换后同色；普通中文／英文及正式已有姓名兼容保持，自定义图片、加载回退和邀请状态保持。

**Demo源码**：[色板与种子](../../src/shared/ui/PersonAvatar.tsx) · [默认头像样式](../../src/shared/styles/pm-global-tail.css)。

**正式对照**：[已有头像库与回退](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/apps/web/src/shared/ui/PersonAvatar.tsx) · [姓名兼容规则](https://github.com/nocoly/taskdoor/blob/444aabe2efdf800bb0c262e2a0d2309d8b87ffd1/apps/web/src/shared/lib/person-initials.ts)。

---

本地交付索引（不属于issue正文）：前两项优先写工作区排版和详情页，合并原排序、属性对齐及人员布局，连续编号为10项。正式基线为 sand `444aabe2`（sand-v0.1.45）与 dev `e0ceb658`。对照时已完整读取正式 README 和 AGENTS。

正式已具备默认AI工具与偏好、Avvvatars库／图片回退、吸顶及人员名单基础，不重复立项；讨论生成提示的删除仅属当前Demo，正式未接同一表单，不要求先实现生成再删提示。任务读取合同边界、156px未接线弹层、失权保稿、暂缓标注／AI交接等继续留在[核对记录](local-delivery-audit-summary-2026-11-05.md)。图片名称以当前两行实现为准，不沿用过时单行描述。

已先发布 [Demo PR #21](https://github.com/taskdoor-ai/taskdoor/pull/21)及[提交 f0add11a](https://github.com/taskdoor-ai/taskdoor/commit/f0add11ad6f2574d5c280db149ff7db45c9b5c1f)，再提交[正式 issue #73](https://github.com/nocoly/taskdoor/issues/73)，远程正文含固定源码及最新 Skill 链接。历史 [Demo PR #19](https://github.com/taskdoor-ai/taskdoor/pull/19)／[正式 #60](https://github.com/nocoly/taskdoor/issues/60)、[Demo PR #20](https://github.com/taskdoor-ai/taskdoor/pull/20)／[#61](https://github.com/nocoly/taskdoor/issues/61)保留归档。对照基线及范围见[核对记录](local-delivery-audit-summary-2026-11-05.md)。
