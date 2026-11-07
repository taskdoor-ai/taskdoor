# 正式项目调整待提交汇总（2026-11-07）

目标仓库 `nocoly/taskdoor`。本批 Demo 已创建 [PR #24](https://github.com/taskdoor-ai/taskdoor/pull/24)，合入 `main` 后提交正式 issue。本地待提交草稿，仅记录正式项目需要调整、且本地已完成的最终改法，并附源码、PM Demo 提交和 PR 及验收要求。新的事项从 1 连续编号；同一事项更新原条目。Demo 内部改动、未完成方案和验证过程不进入提交正文。

## 1. 讨论中的 @ 提及和任务引用去掉底色并加粗

- 普通发言、回复及输入框中的个人提及和「@全体成员」统一保留文字颜色并加粗（`font-weight: 600`），去掉提及底色、圆角及标签内边距，使连续多人提及与正文自然衔接。
- 普通发言、回复及输入框中的任务引用同样去掉底色、圆角及标签内边距，保留高亮文字并使用 600 字重；不可用引用保留原灰色提示，无底色。
- 保留原有提及选择、成员资料、通知和删除行为，以及任务引用的选择、点击打开和键盘焦点提示。

**验收**　已发布消息与输入框内的个人／全体成员提及及任务引用均保留文字颜色、字重为 600，无底色和额外留白；连续内容自然换行，任务引用仍可准确打开，选择和发布提醒行为保持。

**PM Demo**　[本批实现 `5e840f00`](https://github.com/taskdoor-ai/taskdoor/commit/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41) · [PR #24](https://github.com/taskdoor-ai/taskdoor/pull/24)。

**源码**　[输入框提及与任务引用](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/discussion-composer.css#L12)、[已发布提及](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/discussion-messages.css#L35)、[已发布任务引用](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/discussion-markdown.css#L20)。

## 2. 讨论消息的子任务数量紧跟发布时间

- 讨论消息底部按「时间 → 子任务图标及数量 → 从讨论创建任务」排列；没有已创建子任务时不显示数量入口。

**验收**　创建按钮在未悬停时隐藏，子任务图标及数量仍紧跟时间；原有子任务展开／收起和从讨论创建任务行为保持。

**PM Demo**　[本批实现 `5e840f00`](https://github.com/taskdoor-ai/taskdoor/commit/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41) · [PR #24](https://github.com/taskdoor-ai/taskdoor/pull/24)。

**源码**　[讨论消息底部操作](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/discussion/components/TaskDiscussionMessage.tsx#L79)。

## 3. 新讨论附件仅随消息保存，历史已收纳文件保留

- 普通发言和回复中新上传的附件只随消息持久保存，不自动进入任务文件列表、文件搜索及文件数量，也不自动创建或写入「讨论」文件夹。刷新后仍可从原消息读取附件，失败和同次重试不产生多份。
- 保留讨论原位预览、下载、标注及按格式支持的编辑和版本能力；编辑后原消息仍引用当时版本，明确查看最新版本后才操作新版。收纳范围与编辑能力分别判断，不因附件退出文件列表而变成不可编辑材料；讨论连接 AI 继续携带原附件身份与固定版本。
- 已有任务文件被引用到讨论时保留原位置和固定版本，不复制或移动。历史已经收纳的文件与目录保留，继续按原范围展示和计数；不批量迁移、隐藏或删除。文件页主动上传沿原规则，不新增转存入口。

**验收**　普通发言、回复及仅附件消息发布并刷新后均可回读，新附件不增加文件、搜索结果或数量，不创建收纳目录；预览、下载、标注、文本编辑和历史版本仍可用，目录整理不丢失讨论附件；已有引用和历史收纳文件保持。

**PM Demo**　[本批实现 `5e840f00`](https://github.com/taskdoor-ai/taskdoor/commit/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41) · [PR #24](https://github.com/taskdoor-ai/taskdoor/pull/24)。

**源码**　[附件保存与文件投影](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/lib/task-collaboration.ts)、[文件计数](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/lib/task-content-indicators.ts)、[任务详情接线](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/components/TaskDetail.tsx)、[附件预览与编辑](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/files/components/TaskFileExplorer.tsx)、[文件模型](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/shared/model/task-model.ts)。产品规则见 [PRD-0369](../../docs/prd/CHANGELOG.md)。

## 4. 讨论翻译默认关闭并支持逐条手动翻译

- 未保存设备偏好或读取失败时，「自动翻译讨论内容」默认关闭；用户可手动开启或关闭，沿用已有设备偏好，不重置已保存选择。
- 每条消息分别比较正文原文与当前界面语言：仅异语消息提供「翻译」。该按钮与「从讨论创建任务」一样，桌面在消息悬停或键盘焦点进入后显示，平时隐藏；触屏直接显示。点击只处理该条消息，不开启自动翻译或处理其他消息。翻译及原文／译文切换使用普通文字颜色，悬停不跟随主题强调色。
- 手动与自动翻译共用按原文版本、目标语言保存的译文词条。已有译文直接展示，缺少时仅生成本次目标语言并保存；成功取得译文后常显「已翻译／原文」及对应切换，切换复用结果，自动翻译已显示译文时不重复提供翻译按钮。未取得译文仅保留原文，不显示「暂无译文」等状态占位或原文／译文切换；原文、目标语言隔离及引用、附件内容保持。

**验收**　无偏好及读取失败时自动翻译未勾选，已有选择刷新后保持；异语消息的翻译入口在桌面默认隐藏、悬停或键盘进入后显示，触屏可直接操作，同语消息无入口。手动操作只影响选中消息且不改偏好；取得译文后切换入口持续可见并复用词条，未取得译文仅保留原文、无状态占位或切换，重复触发不重复生成。

**PM Demo**　[本批实现 `5e840f00`](https://github.com/taskdoor-ai/taskdoor/commit/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41) · [PR #24](https://github.com/taskdoor-ai/taskdoor/pull/24)。

**源码**　[翻译偏好](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/shared/i18n/I18nProvider.tsx)、[语言菜单](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/shared/ui/LanguageSwitcher.tsx)、[共用阅读状态](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/ai/discussion-reading.ts)、[讨论消息](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/discussion/components/TaskDiscussionMessage.tsx)、[消息操作样式](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/task-discussion-feed.css)、[中英文文案](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/shared/i18n/globalUiMessages.json)。产品规则见 [PRD-0370／0371／0372](../../docs/prd/CHANGELOG.md)。

## 5. 文件打开时使用居中加载反馈

- 原文件读取、PDF／演示文稿／音视频预览组件加载，以及 HTML 原文件读取时，统一在预览区域中央显示 28px 转圈动画和「正在读取附件…」，替换左上角的纯文字。沿用中英文提示，减少动态效果时停止旋转。
- 加载区和图片、视频的预览背景统一跟随界面主题：浅色模式为白色，深色模式为深色，动画及提示同步适配。图片查看工具沿用主题色，视频底部控件保留画面上的对比度；音频沿用紧凑窗口。读取完成后直接展示内容，原失败提示及重试行为保持。

**验收**　桌面和窄屏等待期间均居中显示动画及提示，无额外横向滚动；浅色模式加载区及图片、视频预览底色为白色，深色模式使用深色，文字与控件清晰可辨；音频窗口有完整加载区域；读取完成后展示准确文件，失败仍可重试。

**PM Demo**　[本批实现 `5e840f00`](https://github.com/taskdoor-ai/taskdoor/commit/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41) · [PR #24](https://github.com/taskdoor-ai/taskdoor/pull/24)。

**源码**　[统一加载组件](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/files/components/TaskFileLoading.tsx)、[加载样式](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/task-file-loading.css)、[文件预览](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/files/components/TaskFileViewer.tsx)、[HTML 原文件读取](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/files/components/TaskHtmlAnnotations.tsx)、[预览区布局](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/task-file-preview-stage.css)、[图片主题样式](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/task-image-viewer.css)、[视频主题样式](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/task-media-viewer.css)。

## 6. 详情与讨论的分隔线统一对齐

- 吸顶标题下方的分隔线沿用详情正文的左右留白，与 Tab 下方分隔线保持相同起止位置和宽度。桌面及窄屏共用当前布局的留白值，保留吸顶背景、标题布局、测量高度和右侧属性栏范围。
- 讨论消息之间的分隔线保留虚线，覆盖整条消息行，从头像左侧延伸至正文右边界，与上述两条实线左右对齐。头像、正文的位置及消息间距保持。

**验收**　详情上滑进入吸顶状态后，吸顶实线、Tab 实线及讨论消息虚线的左右边缘一致，虚线包含头像列；调整窗口宽度后仍对齐，消息排版、Tab 切换和吸顶位置保持。

**PM Demo**　[本批实现 `5e840f00`](https://github.com/taskdoor-ai/taskdoor/commit/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41) · [PR #24](https://github.com/taskdoor-ai/taskdoor/pull/24)。

**源码**　[吸顶分隔线样式](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/task-detail-split.css#L18)、[讨论消息虚线](https://github.com/taskdoor-ai/taskdoor/blob/5e840f00da4eb7f4bcf97b9ca41b8786f1996e41/src/features/tasks/styles/task-discussion-feed.css#L5)。

---

上一批 16 项已提交为 [nocoly/taskdoor#77](https://github.com/nocoly/taskdoor/issues/77)，见[已提交归档](product-sync-pending-issue-2026-11-05-02.md)。

本地建议待办：[视频封面加载优化 issue 草稿](video-cover-loading-optimization-issue-draft-2026-11-07.md)。尚未实施，用户要求暂不提交，后续统一处理；不计入上述已完成改动的提交正文。
