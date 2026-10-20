# Issue #58 当前正文 · 2026-10-20

> 已同步到 [nocoly/taskdoor#58](https://github.com/nocoly/taskdoor/issues/58)。初次提交的两项正文继续保留在 [原归档](product-sync-pending-issue-2026-10-20.md)，本文件保存补齐后的五项正文。

对应 PM Demo：[PR #18](https://github.com/taskdoor-ai/taskdoor/pull/18) · [固定提交 8f49f62e](https://github.com/taskdoor-ai/taskdoor/commit/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2)。

## 1. 任务详情上滑吸顶

作为 [#55](https://github.com/nocoly/taskdoor/issues/55) 的验收补齐：标题、属性和正文整体滚动；完整标题滚出后显示紧凑名称、状态、负责人和截止时间，页签吸附在下面；回顶恢复完整头部。紧凑栏只读，顶层任务保留 11px 顶部间距。

**修改位置**：正式仓库 `apps/web/src/features/tasks/components/TaskDetail.tsx` 和 `styles/task-detail-split.css`，改为详情外层滚动，解除正文层固定高度和独立滚动；`TaskDiscussion.tsx`、`files/components/TaskFileExplorer.tsx` 同步适配定位及底部输入框。

**Demo 参考**：[紧凑标题栏](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/components/TaskDetailStickySummary.tsx) · [详情接入](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/components/TaskDetail.tsx) · [滚动与吸附样式](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/styles/task-detail-split.css)。

**验收**：桌面、窄屏上滑收紧、回顶恢复，无跳动或遮挡；切任务回顶、切页签重判吸顶；讨论和文件定位正常，草稿、版本及预览内部交互保留。原立项中“吸附摘要不纳入”的假设按本条修正。

## 2. 人员选择列表与参与人名单改造

**人员选择列表**：

- 人员行保留头像、姓名和选中勾；“暂不分配”和姓名统一为 14px、400 常规字重。前方图标在左侧两行区域居中，并与人员头像列对齐。去掉匹配度／推荐等级星标和原因浮层，保留推荐排序、搜索、单选／多选与人数上下限。
- 移除底部整行邀请按钮，在“暂不分配”下显示“邀请更多同事进来协作”和独立“立即邀请”；无“暂不分配”选项时放在人员列表上方。复用现有邀请表单，点击邀请不清空选择，取消后保留原选择；讨论 @ 列表不新增邀请入口。

**参与人完整名单**：

- 默认显示前 4 个头像，折叠时显示“＋N”和下拉箭头；1～4 人也保留箭头。点击后显示全部参与人、总人数、头像和完整姓名，长名单可滚动；关闭回焦入口，切任务不保留旧名单。
- 保留头像右上角原小叉，完整名单每行也可移除，两处复用同一保存和活动逻辑。名单叉用 12px、1.6 描边浅灰图形，悬停无块状底色；桌面悬停／聚焦行时显示、触屏常显，点击区分别 28px／44px。
- 移除同步更新名单、总人数和头像；最后一人移除后保留添加“＋”并回焦。只读可查看、不显示移除；沿用最少人数限制，不改变负责人和团队身份。完整名单只在任务详情启用。

**修改位置**：正式仓库对应的人员选择器、头像组与任务详情接入。Demo 源文件：[PersonPicker](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/members/components/PersonPicker.tsx) · [列表样式](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/members/styles/person-picker.css) · [MemberSelector](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/members/components/MemberSelector.tsx) · [PersonAvatar](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/shared/ui/PersonAvatar.tsx) · [名单样式](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/shared/styles/pm-global.css) · [双语文案](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/shared/i18n/detail-messages.ts)／[入口文案](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/shared/i18n/globalUiMessages.json)。

**验收**：桌面、窄屏和键盘操作下，邀请与清空选择互不触发；1 人、4 人和超过 4 人均能查看完整名单；两处移除结果一致，最后一人移除后可继续添加，只读及人数限制有效。

## 3. 讨论附件改为缩略图卡片

- 图片默认只显示真实缩略图，悬停或键盘聚焦时显示名称、类型、大小和引用版本；触屏常显信息。非图片采用上方彩色类型图标、下方文件名和信息，多附件并排换行。
- 主讨论与兼容消息共用 React Aria `GridList/GridListItem` 管理网格焦点、方向键及打开动作；文件图标复用 Material Icon Theme 官方 SVG，与文件列表一致。
- 点击打开附件所引用的文件和版本。历史缩略图不可用时不能拿新版图片或大小代替；文件删除／不可用时保留名称、版本及提示，禁用打开。

**修改位置**：正式仓库 `apps/web/src/features/tasks/discussion/components/TaskDiscussionMessage.tsx`、`DiscussionMessages.tsx` 的附件展示抽成共享组件，并接入对应附件样式。Demo 参考：[附件 Gallery](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/discussion/components/DiscussionAttachmentGallery.tsx) · [图块内容](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/discussion/components/DiscussionAttachmentContent.tsx) · [附件样式](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/styles/task-discussion-feed.css) · [共享文件图标](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/files/components/TaskFileGlyph.tsx)。

**验收**：图片默认不重复占位展示名称，hover／焦点可读、触屏可读；其他类型图标与名称上下排列；桌面和窄屏正常换行，键盘可打开有效附件，旧版本与失效引用不误开。

## 4. 文件列表与大预览改造

- 文件页默认浏览目录，支持列表／缩略图切换；图片显示真实缩略图，其他文件显示同一套彩色类型图标。保留搜索、路径导航、返回上级、上传、新建文件夹和管理菜单。搜索覆盖当前任务文件，显示结果来源路径；上传和新建沿当前目录处理。
- 点击文件后打开独立的大预览弹层，预览内不再放文件树。文件名只显示一次，与标注、更多、关闭合并为一行；关闭后保留目录并回焦原文件入口，来源定位仍打开指定文件和引用版本。
- 复用现有 Base UI Dialog；普通图片用 `yet-another-react-lightbox` 的 Inline／Zoom／Fullscreen 插件阅读、缩放及单一全屏入口，浏览器不允许全屏时明确提示。标注继续使用原文字／区域标注流程，版本、编辑和下载能力保留。
- 有未保存编辑或未交付标注时先确认，可继续查看；明确关闭后保留编辑草稿，丢弃标注须明确选择。不自动保存、生成新版本或发布内容。

**修改位置**：正式仓库 `apps/web/src/features/tasks/files/components/TaskFileExplorer.tsx` 将目录浏览与预览弹层分开；复用原文件操作和版本状态。Demo 参考：[文件列表／缩略图](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/files/components/TaskFileBrowser.tsx) · [弹层、单标题与关闭保护](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/files/components/TaskFileExplorer.tsx) · [图片阅读组件](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/files/components/TaskImageViewer.tsx) · [列表与预览样式](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/styles/task-file-browser.css)。

**验收**：列表／缩略图切换和进出目录不误开文件；上传位置正确；预览只有一行标题，无左侧文件树；图片阅读与标注可切换，关闭保护、目录回焦和固定版本定位正确，窄屏不横向溢出。

## 5. 最近更新排序将已完成任务后置

“最近更新”在置顶、非置顶两组内分别把已完成任务排在其他任务之后，各组仍按更新时间倒序；保留置顶边界，已取消不额外后置。任务重开后回到原状态分组；“最新创建”保持纯创建时间排序。

**修改位置／Demo 参考**：[task-list-projection.ts](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/lib/task-list-projection.ts)，在原时间比较前增加完成状态比较，不改变筛选或当前任务选择逻辑。

**验收**：刚完成的任务不会因更新时间最新占据未完成任务前列；筛选与置顶仍有效，切到最新创建时排序规则不变。
