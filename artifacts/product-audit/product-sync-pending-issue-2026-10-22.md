# 正式项目已提交汇总 · 2026-10-22

2026-10-23 经用户授权提交，归档对应正式项目 [issue #60](https://github.com/nocoly/taskdoor/issues/60)。本批共 10 项，正文及固定源文件链接见下。已提交归档不再追加新改动。

- PM Demo：[PR #19](https://github.com/taskdoor-ai/taskdoor/pull/19)，目标分支 `main`，已推送、待合并。
- 实现提交：[`ef963ed4`](https://github.com/taskdoor-ai/taskdoor/commit/ef963ed41333f40835611458741e3663986ae049)。
- TaskDoor：父任务“TaskDoor 产品修订意见跟进”下的[同步输入保存、讨论附件与文件交互优化](https://sand.taskdoor.com/w/taskdoor-srctw7/tasks/cfbd5ba8-869c-47e7-adbe-d44c2bf07eff/overview)。
- 子任务 UI／Skill、新增标注与 AI 交接、页面资源恢复及排序增量保留本地，本批未发布。

---

按以下 10 项同步正式产品，沿用正式项目现有持久化、格式支持与 PDF／Office 预览能力。

PM Demo：[PR #19](https://github.com/taskdoor-ai/taskdoor/pull/19) · [实现提交 ef963ed4](https://github.com/taskdoor-ai/taskdoor/commit/ef963ed41333f40835611458741e3663986ae049)。下方源文件均固定到该提交。

本批范围不含子任务拆解 UI／Skill、新增标注与 AI 交接、页面资源恢复及排序调整。

## 1. 文字输入统一小圆角，标题与完成标准增加留白

文字输入统一使用 **6px 圆角**，覆盖搜索、任务名称／目标／完成标准、创建与 AI 调整、讨论／回复、文件表单、登录及设置；按钮、菜单、卡片沿用各自样式，代码和 Markdown 正文保留原无框编辑方式。

任务标题输入左右内边距统一为 **12px**，聚焦与未聚焦使用相同留白，保持单行及原高度。完成标准输入左右内边距 **12px**、上下 2px；移除详情页将水平内边距覆盖为 0 的样式。悬停显示浅边界，聚焦显示清楚边界，禁用态不显示可编辑提示。

**验收**：输入圆角一致；标题文字不贴框，聚焦前后不跳动，长标题保持单行；完成标准正文不贴边，多行自然增高、不截字，序号保持对齐。

**Demo 源文件**：[样式变量](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/shared/styles/tokens.css) · [共享输入](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/shared/ui/input.tsx) · [完成标准样式](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/styles/task-criteria-fields.css) · [详情布局](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/styles/task-detail-split.css)。

## 2. 优化失焦保存响应，保护中文输入和连续编辑

完成标准直接多行编辑，Enter 换行；离开整个标准组后保存最终输入。中文组词未结束时等待输入法完成，组内切换、添加、删除不提前提交，也不能吞掉按钮操作。

保存期间仍可输入和增删。回执只确认提交快照，不覆盖后续草稿；后续修改已经离组时继续顺序保存。失败保留最新草稿和原保存值供重试，切换任务后隔离旧回执及保存队列。

减少保存链路的同步开销：跳过未变化的持久化、复用未变化的存储结果，避免保存触发任务列表和日期格式器重复计算；沿用正式项目持久化方式，不将 Demo 本地存储方案直接搬入服务端。

**验收**：组词不误存，连续输入和增删不丢失、不被旧回执覆盖；失败可重试，任务之间不串稿；无变化不重复写入，保存成功后及时反馈，不提前报成功。

**Demo 源文件**：[标准组输入](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/components/TaskCriteriaFields.tsx) · [文本编辑](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/components/TaskCreationEditableText.tsx) · [标准保存](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/components/TaskCriteriaEditor.tsx) · [本地存储优化](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/lib/task-ai-adjustment-storage.ts) · [任务列表](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/components/TaskWorkspaceList.tsx) · [日期格式复用](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/shared/lib/date-time-format.ts)。

## 3. 保存成功统一轻量 Toast，并统一全局样式与时效

名称、目标与完成标准有效修改并保存成功后，通过现有全局 Toast 显示 **“已保存”**，移除字段旁、标准组下方及“添加”行的成功文案。

全局普通成功／信息提示在无补充说明或操作时，统一为**内容宽度自适应的紧凑白底轻提示**：40px 高、8px 圆角、14px 字、轻阴影，无关闭按钮或关闭占位；成功使用鲜绿色 **`#389e0d`** 实心圆勾。显示 **1.5 秒**后自动消失。错误、带补充说明或撤销等操作的提示保留 **5 秒**，保留关闭及相应操作入口、44px 操作热区。

同标识连续结果复用一条并重新计时，不堆叠；鼠标悬停、键盘聚焦或窗口失焦时暂停，恢复后继续，不抢焦点。不更换现有 Toast 组件库，应用及 PRD 阅读页共用同一实现。

未修改、保存失败、旧回执失效或仍有后续未保存草稿时不提示成功；失败仍在对应编辑区提示并保留输入。本项替代 #49 中这三类字段的就地成功反馈及普通 Toast 的旧时效／关闭规则。

**验收**：真实保存成功只显示一条紧凑绿色勾提示，无 X，未暂停时约 1.5 秒消失；连续成功不堆叠，窄屏无关闭空列或溢出；错误及带说明／操作提示仍有 5 秒阅读时间且可关闭或操作。失败不误报、不清稿，原就地成功提示消失。

**Demo 源文件**：[名称与目标反馈](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/lib/useTaskTextSaveFeedback.ts) · [任务详情](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/components/TaskDetail.tsx) · [标准保存](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/components/TaskCriteriaEditor.tsx) · [共享 Toast](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/shared/ui/toast.tsx) · [提示样式](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/shared/styles/toast.css) · [统一规则](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/docs/prd/modules/15-permissions-errors-nfr.md#35-操作提示停留时间)。

## 4. 普通讨论和回复支持直接输入 Markdown

普通发言和回复直接输入 Markdown，发布后渲染标题、强调、列表、引用、链接、代码块、表格、删除线、任务清单及正常换行；编辑与草稿保留原始 Markdown，不增加发布前预览、模式切换或说明栏。

原始 HTML 不执行，Markdown 远程图片不自动加载；普通文本、代码或链接里的 `@` 不转成真实提及，提及仍使用明确选择的身份。

**验收**：普通发言和回复发布、刷新后格式正确；宽表格和代码块在正文内滚动，不撑宽页面；原有草稿、提及及引用保持。

**Demo 源文件**：[Markdown 渲染](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/discussion/components/DiscussionMarkdown.tsx) · [发言与回复输入](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/discussion/components/DiscussionComposer.tsx) · [消息呈现](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/discussion/components/TaskDiscussionMessage.tsx) · [正文样式](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/styles/discussion-markdown.css)。

## 5. 讨论上传附件自动收纳，并在讨论原位预览

新发布的普通发言和回复，其本地上传附件在发布成功后自动归入任务根目录的 **“讨论”** 文件夹；复用有效的既有中英文同义目录，没有则创建。同名不覆盖，重试不重复归档；不迁移历史附件，引用已有任务文件只保存固定版本引用、不复制或移动原件。草稿、取消和失败附件不进入正式文件列表。

已发布附件及普通／回复草稿附件共用大型预览，关闭或 Esc 回到讨论原位置及附件焦点，保留输入，不切换文件 Tab。图片卡片显示真实封面和名称，其他附件显示封面／类型图标及名称，去掉卡片重复的格式、大小、版本说明；原件缺失明确提示。

**验收**：发布成功后文件页“讨论”内可找到附件，失败和重复重试不产生多份；已有文件引用不移动；普通发言、回复、草稿均可原位查看，关闭后不丢稿、不跳页；历史引用仍打开原版本。

**Demo 源文件**：[归档与固定引用](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/lib/task-collaboration.ts) · [讨论入口](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/components/TaskDiscussion.tsx) · [附件列表](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/discussion/components/DiscussionAttachmentGallery.tsx) · [附件内容](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/discussion/components/DiscussionAttachmentContent.tsx) · [共享文件预览](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileExplorer.tsx)。

## 6. 文件页改为当前页面展开的紧凑树列表

文件页初始文件夹收起，不自动打开首个文件；多个文件夹可独立展开，无文件夹图标，保留展开箭头和层级引导线。文件点击打开大型预览，关闭回到原列表。替代 #55 中侧栏树加右侧正文、默认首个文件的布局。

工具栏只保留左侧搜索、右侧 **“＋新建”**，同排对齐；按钮不带下拉箭头，菜单为 **“文件夹／文件”**，文件项进入上传。搜索占位为 **“搜索”**，白底、边框、圆角、字体字号和高度与左侧任务搜索一致；新建按钮字体字号与顶栏新建任务一致。移除额外标题和路径行，避免展开后跳动；新建／上传弹窗明确实际目标目录。

桌面文件与文件夹统一 **每行 40px，行间不另加间隙**，与任务行密度一致；触屏 48px。文件夹的有效直接子项数紧跟名称，更多操作仍在最右；缩略图桌面 28px、窄屏 24px，图文间距 6px／4px，层级缩进 16px／12px，文件名 14px。

搜索覆盖当前任务折叠目录内的文件，保留命中项祖先，清除后恢复原展开状态；仅名称实际命中计入结果。键盘导航不自动打开文件，更多菜单不误触展开；折叠当前目录祖先后，新建目标回到有效父级。

**验收**：无额外路径行及布局跳动；行高、数量、搜索和按钮符合上述呈现；深层搜索、清除、独立展开及预览返回正常，长文件名和窄屏可用。

**Demo 源文件**：[文件页与工具栏](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileBrowser.tsx) · [树列表](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileTree.tsx) · [搜索与层级](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/task-file-tree.ts) · [列表样式](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/styles/task-file-browser.css) · [任务搜索样式](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/styles/task-workspace-list.css)。

## 7. 移动文件使用可搜索目录树，文件弹窗统一遮罩

移动弹窗显示 **“移动〈名称〉到…”**、目录搜索、当前任务根及有效文件夹树、选中目标路径、取消和 **“移动到此处”**；不出现个人／团队空间，不使用单选卡片逐级罗列。搜索保留匹配目录及祖先，选中目标被搜索隐藏时底部仍保留路径；展开箭头只展开，确认按钮才执行移动。

真实当前位置与选中目的地区分；同位置、文件夹自身及后代、已归档或失效目标不可提交，执行时再次校验。失败保留选择和错误，不能悄悄移动到根目录；取消或 Esc 返回触发点。

新建、上传、移动弹窗复用设置弹窗的全屏遮罩：**黑色 10% 透明度＋4px 背景模糊**。嵌套菜单打开弹窗时遮罩仍完整显示，关闭后彻底移除，不残留或叠加多层。

**验收**：仅当前任务内可移动目录可选，搜索和层级正确；无效目标禁用、失败不丢选择；各文件弹窗遮罩和模糊一致，开关及焦点返回正常。

**Demo 源文件**：[移动弹窗](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileMoveDialog.tsx) · [其他文件弹窗](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileDialogs.tsx) · [移动校验](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/task-file-action-options.ts) · [移动样式](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/styles/task-file-move-dialog.css) · [共享弹窗](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/shared/ui/dialog.tsx)。

## 8. 普通文件上传显示 1GB，大小单位统一 KB／MB

普通任务文件单个上限显示 **1GB**，实际校验沿正式项目既有 **1,073,741,824 字节**；选择、拖拽和批量上传均在读取／暂存前检查。讨论附件仍沿既有 20MiB 限制，预览／转换内部阈值不作为普通文件上传上限。

文件大小从真实字节数按 **1000 进位显示 B／KB／MB／GB**，不再显示 KiB／MiB；缺少字节数据时保留已有可用标记，不伪造 0。大文本／HTML 保留原件，超过内联预览能力时提供下载，不提前全文读取、截断后覆盖或塞入本地文本快照。

正式项目普通文件原本已是 1GiB，本项只对齐文案、客户端检查与大文件回退；保留正式项目现有文件格式策略及已支持的 Office 格式，不移植 Demo 的格式白名单。

**验收**：超限在处理前明确阻止，未超限不因小预览阈值被拒；单位由真实字节正确换算；大文本可保留和下载原件；讨论及转换规则不被误改。

**Demo 源文件**：[普通文件上传](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/task-file-upload.ts) · [讨论附件限制](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/discussion-uploads.ts) · [大小格式化](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/shared/lib/file-size.ts) · [预览回退](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileViewer.tsx) · [上传接线](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileExplorer.tsx)。

## 9. 统一可见下载、真实封面与媒体预览

文件、讨论及草稿预览使用同一可见下载入口，更多菜单不重复提供；下载准确对应当前保存版本或所选历史快照。图片下载原字节，缺少原件时禁用并说明，不把摘要或当前新版冒充原件。

共用同版本真实封面：图片原图、MP4 非黑画面、PDF 首页、PPT 内嵌／缓存首页或复用已有转换生成首页，无需先打开 PPT 才显示。文本／音频使用类型图标，HTML／Markdown 仅复用已有有效图像封面；生成失败及旧版本缺图正常回退，不串用新版本图。

MP3／MP4 手动播放、暂停、定位、时间、音量／静音及视频全屏，打开不自动播放，关闭／切换停止。预览充分使用窗口空间、保持比例；PDF／PPT 页区正常滚动、缩放，缩略图默认收起且展开不挤压正文，源码保留空白与换行。

**验收**：三种入口下载内容一致且版本准确；封面来自对应原件，失败有回退；媒体关闭即停止；图片、分页文件和源码在桌面及窄屏可阅读。沿用正式项目已实现的 PDF／Office 预览，只补齐上述差异。

**Demo 源文件**：[预览分派](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileViewer.tsx) · [下载入口](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileDownload.tsx) · [下载取值](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/task-file-download.ts) · [封面](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskFileThumbnail.tsx) · [封面生成](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/render-task-file-cover.ts) · [媒体播放](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskMediaViewer.tsx) · [分页舞台](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/styles/task-file-preview-stage.css)。

## 10. Markdown 双模式编辑与固定版本引用

Markdown 使用可视／源码两种模式共享同一草稿，支持常用格式；遇到无法安全往返的表格、图片、脚注、原始 HTML 等结构，保留完整源码并说明可视编辑限制，不能切模式后丢格式或生成多余空段落。

每次上传都是独立文件，同名生成副本名称，不因重复上传覆盖或生成版本。只有支持在线编辑的文本类文件保存产生版本；非编辑格式隐藏版本操作，内部固定引用仍保留。

讨论附件绑定发布时版本：文件更新后，旧讨论仍显示并下载完整旧版，只读；显式切换最新版本才可按能力编辑。历史原件缺失明确提示，不用当前正文代替。

**验收**：常用格式往返、保存和刷新不变；不支持结构原文精确保留；同名上传不覆盖；发布引用 v1 后保存 v2，旧引用展示及下载仍是 v1。

**Demo 源文件**：[Markdown 编辑器](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/components/TaskMarkdownEditor.tsx) · [模式转换](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/task-markdown-editing.ts) · [格式能力](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/task-file-capabilities.ts) · [编辑保存](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/task-file-editing.ts) · [独立上传](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/files/lib/task-file-upload.ts) · [引用版本](https://github.com/taskdoor-ai/taskdoor/blob/ef963ed41333f40835611458741e3663986ae049/src/features/tasks/lib/task-collaboration.ts)。
