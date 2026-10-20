# PRD 来源映射

## 人员选择器字号与对齐视觉同步（2026-10-20，非语义）

本轮仅调整[PersonPicker样式](../../src/features/members/styles/person-picker.css)：姓名与“暂不分配”同为14px、400字重；未分配图标与头像使用同一左列，带邀请说明的两行卡片中图标按整张卡片垂直居中，单行项保持原布局。选人、暂不分配、立即邀请、权限与保存规则均不变，不新增语义变更ID，不改模块last_change／version或语义日志。

[真实运行记录](../../artifacts/person-picker-alignment-2026-10-20/verification.json)来自主5173完整App的「新品发布会筹备」新增参与人：桌面姓名／暂不分配均14px／400，图标与头像中心x=696，图标及两行卡片中心y=250；390px桌面浏览器窄视口body.scrollWidth=390、选项高44，图标与头像中心x=44，图标及卡片中心y=308。文档代理目视核对[完整页面](../../artifacts/person-picker-alignment-2026-10-20/after-desktop.jpg)与[选择器局部](../../artifacts/person-picker-alignment-2026-10-20/after-detail.jpg)。Vite前端构建及限定文件格式检查通过；未改变人员选择、发送邀请或编辑任务，未重测邀请流程，也未运行全量测试或双重审查。

当前成员与创建模块正文没有需要新增的选择器截图；既有“未分配负责人提示”图已pending，不重复处理。现行模块14的交接批量选人图`assets/membership-account-exit/handoff-batch-picker-zh.png`（fig-exit-002）仍含旧较粗姓名，[TeamLifecycle](../../src/features/members/components/TeamLifecycle.tsx)实际复用同一PersonPicker，故该图受本轮样式影响，已转pending并撤出模块14当前正文，原图与当时采集记录保留；本轮不新增截图。本批PRD生成25个模块成功，模块索引及截图清单JSON有效；发布前23项相关定向检查、应用类型、结构门及格式检查通过，未运行全量测试或双重审查。

## 文件预览单行标题视觉同步（2026-10-20，非语义）

本轮仅合并browserMode文件预览中重复的外层标题和内层文件路径显示：[TaskFileExplorer](../../src/features/tasks/files/components/TaskFileExplorer.tsx)在原文件工具栏中使用唯一可访问DialogTitle，并将关闭放在同一工具栏；外层重复header移除。非browserMode保留原路径。长标题单行省略且保留title属性，弹层窄屏不再强制标题／操作分成两行，规则见[文件浏览样式](../../src/features/tasks/styles/task-file-browser.css)。文件、版本、阅读、标注、菜单及关闭保护不变；不新增变更ID，不改模块last_change／version或语义日志。

[本轮验证记录](../../artifacts/file-preview-single-heading-2026-10-20/verification.json)来自主5173完整App的「新品发布会筹备」→文件→image.png：顶部由49px外标题加54px工具栏合并为54px，文件名只出现一次，DialogTitle仅1个且aria-labelledby对应，关闭按钮仅1个。关闭回原文件入口，Enter重开后初始焦点在关闭；更多菜单仍有版本记录、下载和移动，标注进入／退出维持单标题与原区域标注器。390px桌面浏览器窄视口下body.scrollWidth=390、弹层宽378px，标题、操作及关闭同一行；未写入任务、讨论、文件或标注。长标题省略规则由代码支持，不把本次短文件名页面登记为专门长标题实测，也不扩大为真实手机或全部格式复验。

FIG-FILES-090仍含旧两行重复标题，转pending并撤当前正文；原图及当时图片阅读／标注切换验证保留历史。新FIG-FILES-091位于`assets/files-local-commits/image-preview-single-heading-zh.jpg`，为根代理在上述主5173完整App采集的真实页面。文档代理逐图目视并用PIL核实JPEG／1440×778，登记captured current-page并用于文件模块正文。COLLAB-012附件图块及FILES-015确认局部不受影响，既有pending图不重复变更；截图只证明当前静态标题呈现，不证明成功原生全屏、保存或生产权限。

最终应用类型、结构门与Vite前端构建均exit 0；PRD生成页与模块索引已重建，生成页包含FIG-FILES-091及与新图原字节一致的内嵌JPEG，截图清单与模块索引JSON可解析，git diff --check通过。未运行全量测试或双重审查。

## 文件类型图标视觉同步（2026-10-20，非语义）

本轮仅将共享文件类型图标替换为Material Icon Theme 5.39.0的官方SVG；文件识别与支持范围、真实图片缩略图、附件图块、目录整理、固定版本打开、图片查看和标注交互不变。不新增PRD编号，不改模块last_change／version，不改写既有语义日志。

当前代码入口为[TaskFileGlyph](../../src/features/tasks/files/components/TaskFileGlyph.tsx)及[图标样式](../../src/features/tasks/styles/task-file-list.css)。只将12份所需SVG随代码保存，总计4055字节，覆盖文件夹关闭／展开、PDF、JSON、XML、Markdown、HTML、演示文稿、Word、表格、图片和通用文档回退；不加载整套扩展运行时。固定上游来源、原包内路径及SHA-256见[素材说明](../../src/features/tasks/files/assets/material-icon-theme/README.md)、[清单](../../src/features/tasks/files/assets/material-icon-theme/manifest.json)与[完整MIT许可](../../src/features/tasks/files/assets/material-icon-theme/LICENSE)。SVG按上游原字节保留，外层仅控制显示尺寸。

FIG-COLLAB-011及FIG-FILES-087／088包含旧线框图标，转pending并撤出当前正文；原图和当时交互结果保留历史，不能继续作为当前图标呈现。FIG-FILES-090的普通图片阅读画面没有本轮更换的类型图形，保持captured current-page。新FIG-COLLAB-012位于`assets/discussion-notifications-activity/attachment-material-icons-zh.jpg`，由根代理在主5173当前工作区临时真实DiscussionAttachmentGallery组件页采集，fixture为`artifacts/file-icon-refresh-2026-10-20`。文档代理逐图目视并用PIL核实JPEG／1440×778后，登记captured current-component并嵌讨论模块正文；不是完整App，收尾删除临时页面不改变来源分类。画面为真实图片及PDF／JSON／XML／MD／HTML／PPTX／TXT／未知类型共9卡，全部8个图标img实际加载成功、naturalWidth>0且56×56，无旧线框叠字底壳，名称与引用版本保持。不补采新目录图，不把图标替换登记为文件预览能力增加。

本轮[文件能力显示定向](../../server/taskFileCodeAffordances.test.ts)3／3通过，最终应用类型、结构门及Vite前端构建均exit 0；主5173完整App的「新品发布会筹备」文件根目录另核实两个文件夹图标均加载成功且显示为36px，名称和真实图片缩略图保持。证据见[验证记录](../../artifacts/file-icon-refresh-2026-10-20/verification.json)。PRD生成页及模块索引已重建，截图清单与模块索引JSON可解析，生成页含FIG-COLLAB-012及与新图原字节一致的内嵌JPEG，git diff --check通过。未运行全量测试或双重审查，不扩大为全部文件交互或生产验收。

## PRD-0239：讨论附件图块、键盘浏览与普通图片阅读（2026-10-20）

来源为用户以参考图确认的最终附件展示，并明确要求复用成熟开源组件：图片默认只留缩略图，悬停／聚焦读取名称和元信息，其他文件以类型图标与下方名称辨认；触屏信息可达，不新增下载或更多入口。普通图片复用现有大型文件弹层，提供缩放、平移及浏览器允许时的原生全屏；标注／区域定位、固定引用和保存边界保持。本节替代PRD-0238的横向附件卡及普通图片查看呈现，其文件目录浏览、排序和历史记录保持。

- **附件浏览**：[DiscussionAttachmentGallery](../../src/features/tasks/discussion/components/DiscussionAttachmentGallery.tsx)通过React Aria GridList／GridListItem承载真实主消息与兼容消息两个入口，使用layout=grid、selectionMode=none、disabledBehavior=all及onAction；失效项禁用，行内没有额外嵌套打开按钮。[DiscussionAttachmentContent](../../src/features/tasks/discussion/components/DiscussionAttachmentContent.tsx)保留图片／类型区分与旧版本守卫，图像来自[TaskFileThumbnail](../../src/features/tasks/files/components/TaskFileThumbnail.tsx)；[主消息样式](../../src/features/tasks/styles/task-discussion-feed.css)与[兼容消息样式](../../src/features/tasks/styles/discussion-messages.css)提供悬停、聚焦及粗指针／无悬停信息呈现，失败仍可辨认来源。
- **普通图片**：[TaskImageViewer](../../src/features/tasks/files/components/TaskImageViewer.tsx)使用YARL 3.32.2的Inline、Zoom、Fullscreen官方插件，不再套第二个模态框；[TaskFileViewer](../../src/features/tasks/files/components/TaskFileViewer.tsx)的原Blob路径与无Blob的image预览均接入，URL读取及回收仍归原useFileUrl。usesTaskImageViewer共享分流给[TaskFileExplorer](../../src/features/tasks/files/components/TaskFileExplorer.tsx)，普通图不重复外层全屏；标注模式、当前版本区域标记或区域草稿继续使用原FileImageAnnotations，HTML内图片未替换。单图无切图按钮，无新增下载。
- **失败反馈**：图片读取失败可重试；原生fullscreenerror仅在事件目标位于本查看器时显示未获全屏许可的轻量status，普通查看继续，成功enterFullscreen或切换资源时清除。仍由官方Fullscreen插件负责进入／退出，没有另造全屏替代层。

[主消息交互](../../server/taskDiscussionFeedInteraction.test.ts)与[兼容消息交互](../../server/taskDiscussionInteraction.test.ts)合计6条Gallery定向用例通过；[文件交互](../../server/taskFileDiscussionInteraction.test.ts)15条通过，覆盖普通图片分流、当前／旧版本区域标注和唯一全屏入口。最终全屏失败反馈补丁及图标样式依赖修正后，集中应用类型、结构门及Vite前端构建均exit 0；未运行全量测试或双重审查，不扩大为完整项目的全部后端构建通过。运行事实见[本轮记录](../../artifacts/attachment-gallery-ui-2026-10-20/verification.json)。

根代理实际在主5173完整App的新品任务8条讨论中，对新image.png附件行按Enter打开大型文件弹层并呈现新图片查看器。同一主App交付成果目录的JPG普通阅读仅有1个全屏按钮；切到文件标注后显示原区域工具、“正在标注0”及原外层全屏，内嵌普通图片查看器退出；结束标注后恢复普通图片查看器，未新增意见、保存或发布。当前主Vite提供的临时真实组件页另验证：ArrowRight到JSON、ArrowLeft回图片、Home到首项、End到最后有效PDF并跳过失效附件；Enter打开json:v1及image:v1，Esc关闭后焦点返回原附件行。图片信息默认opacity=0、聚焦后为1；放大后图变大且缩小按钮可用。390×844桌面浏览器窄视口下body.scrollWidth=390，附件216px单列，图片弹层边界x12至378、y84至760，可正常关闭；不扩大为真机触屏或软键盘验收。

全屏成功未通过本轮UI验收：临时原生探针已确认插件发出requestFullscreen，页面visible、用户activation=true，但原生Promise拒绝TypeError: not granted。此证据说明浏览器未授予请求，不能把普通弹层或按钮存在记为成功全屏；随后根代理已实际确认拒绝后显示“浏览器未允许全屏，可以继续在此查看图片。”，普通图片仍在原处可查看；这验证失败反馈，不登记原生全屏成功。

FIG-COLLAB-010是旧横向HTML附件卡，保持pending并撤正文；FIG-FILES-089仍是旧普通图片查看器，转pending并撤正文，原资产及当时行为结果保留历史。新FIG-COLLAB-011位于`assets/discussion-notifications-activity/attachment-preview-tiles-zh.jpg`，为2026-10-20当前工作区主Vite临时真实组件页截图，属于current-component，非完整App；根代理采集，文档代理逐图目视并核实JPEG／1440×722后登记captured。最终重采图中图片无聚焦边框、默认不显信息，JSON／XML／PDF保留类型和名称，失效附件保持提示。fixture来自`artifacts/attachment-gallery-ui-2026-10-20`，临时页面收尾删除不改变截图来源分类；静态图不证明键盘、全屏、上传发布保存或生产权限。

新FIG-FILES-090为主5173完整App既有秋季精华任务的交付成果JPG大型弹层，路径`assets/files-local-commits/image-lightbox-zh.jpg`；根代理采集，文档代理逐图目视并用PIL核实JPEG／1054×770，登记captured current-page。图片展示当前普通阅读画面、缩放和单一全屏入口，不能由此认定原生全屏成功，亦不以普通阅读截图代证标注切换。未新增COLLAB-012重复登记。

产品和模块版本保持，同一PRD-0239收束本轮最终方案；PRD生成25模块成功，生成页、模块索引、截图清单与格式检查通过。

## PRD-0238：文件主区浏览、讨论附件卡与已完成任务排序（2026-10-20）

来源为用户授权优化当前PM Demo的本轮最终方案：任务文件主区采用List／Grid目录浏览，打开文件使用大型无文件树预览弹层；已发布讨论消息显示真实图片缩略图或明确的类型附件卡；默认／最近更新排序将已完成任务置底，最新创建与个人置顶分组保留各自规则。此节是上述事项的当前证据入口，替代PRD-0222及后续图标精简记录中的文件主区树／正文并列布局与默认首个文件规则；原阅读器、编辑、版本、标注和权限边界继续沿各自规则，历史记录不改写。

- **文件浏览和预览**：[TaskFileBrowser](../../src/features/tasks/files/components/TaskFileBrowser.tsx)提供目录导航、搜索、List／Grid切换、上传及新建文件夹，文件与目录使用原管理菜单；[TaskFileExplorer](../../src/features/tasks/files/components/TaskFileExplorer.tsx)在任务主区启用browserMode，普通进入先浏览根目录，有效明确文件目标打开对应文件及其目录。文件打开复用原预览、编辑、下载、历史和标注引擎，通过[独立样式](../../src/features/tasks/styles/task-file-browser.css)呈现大型弹层，弹层不显示文件树和开合入口。关闭保留当前目录；存在编辑草稿或未交付标注时走现有确认边界，焦点回触发文件或可用目录入口。List／Grid为当前挂载会话状态，不登记为刷新持久偏好。
- **讨论附件**：[TaskDiscussionMessage](../../src/features/tasks/discussion/components/TaskDiscussionMessage.tsx)与[DiscussionMessages](../../src/features/tasks/discussion/components/DiscussionMessages.tsx)均接入[DiscussionAttachmentContent](../../src/features/tasks/discussion/components/DiscussionAttachmentContent.tsx)，展示缩略图、文件名称、类型、可用大小与引用版本。[TaskFileThumbnail](../../src/features/tasks/files/components/TaskFileThumbnail.tsx)从图片原Blob或已有image预览读取，失败回退类型图形；异步结果按文件／版本隔离并回收对象URL。固定旧引用与当前节点版本不一致时只显示引用名称／类型／版本，不使用当前图片或大小冒充旧材料；点击仍传原文件ID和版本。当前PDF／PPT模型没有现成栅格首屏缓存，使用类型封面，不在列表自动转换；若已有image预览可直接复用。Composer、正文、@、草稿、inline回复、标注附件保存范围和原附件打开／下载流程保持。
- **任务排序**：[task-list-projection](../../src/features/tasks/lib/task-list-projection.ts)仅在sort不是created时，先将状态为已完成的任务放到其他任务之后，两组内继续使用既有更新时间比较；最新创建仍按原创建时间比较。个人置顶仍独立分组，不因完成后置跨过置顶边界；搜索、筛选、当前匹配选择与重开后的分组规则沿原逻辑。只后置已完成，不将已取消或归档合并为新分组。

讨论附件本轮主消息／标注材料25项和兼容消息附件2项定向通过，最后固定版本保护调整后的3项针对复查通过；[主讨论交互](../../server/taskDiscussionFeedInteraction.test.ts)、[兼容消息交互](../../server/taskDiscussionInteraction.test.ts)与[标注材料保存](../../server/taskDiscussionAttachmentPlacement.test.ts)保留具体用例。兼容文件既有中文Provider下断言英文完整时间的用例失败，不登记整文件／全项目通过。列表代理提供4项目标回归通过、既有25项样例投影为20项非已完成加5项已完成；相关54项中52项通过，另两项旧断言分别涉及拟负责人迁移和待开始状态，未扩修。证据见[列表呈现](../../server/taskListPresentation.test.ts)与[列表投影](../../server/taskListProjection.test.ts)。根代理集中完成[文件交互](../../server/taskFileDiscussionInteraction.test.ts)12／12、应用类型、结构门及Vite前端构建exit0；不扩大为完整项目构建、全量测试或全部格式复验，文档代理不重复运行产品检查。

根代理在主5173完整App实际进入交付成果目录，List／Grid切换正常，10项文件铺满主区；Grid中的JPG、PNG、WebP和SVG为真实图片，其他文件保留明确类型卡。JPG打开大型无树弹层，Esc关闭回原JPG触发按钮且focus恢复；TXT更多菜单打开版本记录嵌套弹层并正常关闭。主讨论既有HTML标注附件卡可打开固定v1。本地9条讨论没有图片消息，因此讨论图片缩略图仅有定向测试与共享组件在文件Grid的图片证据，不记录讨论图片页面实测。搜索“发布会”得到5项，置顶“新品发布会筹备”独立，普通区域3项未完成后1项已完成；最新创建及重开仍以定向检查为据。

最终补充：主5173完整App在390×844浏览器viewport走通List→Grid→JPG弹层→Esc返回，body.scrollWidth为390，弹层边界x6至384、y6至838，关闭入口和工具栏可见；随后已恢复默认viewport。该结果是桌面浏览器窄视口，不扩大为真机触屏或软键盘验收；临时截图仅留`/tmp/phil-file-preview-mobile.jpg`，不新增FIG或PRD资产。MD编辑加入临时段落后关闭触发确认，选择继续查看时内容仍在；再次关闭选择保留草稿，重开后仍在编辑同一段落，草稿保护实际通过。临时内容最终恢复原段，未保存、生成新版本或发布。既有取消按钮的window.confirm自动化交互曾超时，最终恢复原文后正常无确认关闭完成清理，不记录原取消流程通过。未交付标注关闭确认仅有代码及定向检查，本轮未新增标注作页面实测，不扩大原版本／交接验收范围。

FIG-FILES-085／086的树与正文并列画面转pending；逐图目视确认FIG-COLLAB-008仍含旧式已发布附件链接，也转pending。原资产、采集时间及当时的功能结果保留；FIG-FILES-077原生全屏与015局部确认仅保留原未受影响范围。新FIG-FILES-087～089、FIG-COLLAB-010及FIG-LIST-008为2026-10-20主工作区5173完整App、Chrome真实1440×778 JPEG，文档代理逐图目视并核实格式／尺寸，清单标captured current-page；COLLAB-010只呈现HTML类型附件卡。静态图与上述运行交互、代码及测试分别登记，不据静态图证明保存、全屏或生产能力。产品和模块版本保持；模块、基线、日志及最终PRD构建由根代理统一同步，本代理只维护来源、矩阵和截图清单，不操作生成页、远程或issue。

本轮最终治理校验：PRD生成25个模块成功，生成页包含PRD-0238、三项规则与五个新图号，模块索引及截图清单JSON有效，工作区格式检查通过；未运行全量测试或双重审查。

## PRD-0237：完整参与人名单与团队邀请权限（2026-10-20）

来源为用户在本轮逐项确认的最终人员交互：任务详情保留头像摘要，展开查看全部参与人；头像小叉保留，名单行尾增加同一移除操作，只读不提供移除。人员选择保留推荐排序，移除匹配度标识及原因浮层；暂不分配下保留简短邀请说明与独立立即邀请。用户随后明确“立即邀请大家都有权限”，因此所有有效团队成员可邀请和重邀普通成员，仅拥有者可邀请、重邀管理员；角色任免、成员移除、团队信息编辑、通用邀请链接重置和团队删除的原限制不变。替代PRD-0058普通成员邀请权限及原推荐等级／原因展示要求，历史日志与版本保留。

实现证据为[TaskDetail](../../src/features/tasks/components/TaskDetail.tsx)、[MemberSelector](../../src/features/members/components/MemberSelector.tsx)和[PersonAvatar](../../src/shared/ui/PersonAvatar.tsx)：可选完整名单、全部姓名／人数、两处共用移除回调，保留disabled／min及最后一人移除后回到新增入口。[人员样式](../../src/shared/styles/pm-global.css)使名单叉桌面悬停／聚焦显示、触屏常显，图形12px、描边1.6，点击区28px／44px；尺寸仅为当前呈现证据。[PersonPicker](../../src/features/members/components/PersonPicker.tsx)保留推荐排序和勾选，移除星标／原因Tooltip；邀请说明与独立按钮不触发清空选择，[紧凑样式](../../src/features/members/styles/person-picker.css)和[双语文案](../../src/shared/i18n/detail-messages.ts)对应最终呈现。

[team-invitations](../../src/features/members/lib/team-invitations.ts)按有效成员资格授予普通邀请，传入成员ID时按ID确认身份，不受资料邮箱与成员邮箱不一致影响；未传ID的旧调用保留邮箱兼容。创建与重邀均复核请求和已有邀请角色。[MemberInvitations](../../src/features/members/components/MemberInvitations.tsx)共享canInvite／canInviteAdmins，[成员页](../../src/features/members/components/PersonalCenterPage.tsx)入口及普通重邀沿同一资格，仅拥有者可选管理员；原管理操作保持。

根代理本轮提供邀请逻辑14项及团队容量2项定向通过，应用TypeScript和结构门通过。当前主工作区立即邀请enabled=true、rgb(71,99,197)；真实Provider＋Picker＋TeamMembersPanel隔离fixture使用普通成员且资料邮箱与成员邮箱不同，两处入口可用，普通重邀1处／管理员重邀0处，可打开真实表单，实际角色菜单仅“成员”。取消后名单仍打开、原选择保持；focusIsSearch核对未通过，额外重验遇proxy空响应，本轮未修改原焦点逻辑，不写焦点恢复或完整UI流程全过。此前同会话名单、触屏／只读和邀请说明区65px核对保留原范围，不累加为本轮新增数量。未真实发送、验证邮件或生产鉴权，未操作正式项目／远程，未将本次新增权限写入待提交issue。

文档代理目视FIG-DETAIL-023／024／025，均含缺少新名单入口的旧参与人区域，转pending并撤出08／09正文，原资产与原功能验证保留。FIG-MEMBERS-001展示管理员，本次不改变该图入口状态，保留原范围，不据此证明普通成员权限；旧邀请表单维持原superseded／pending。本轮不采新图。08／09／15、基线、日志和矩阵同步，版本保持；文档只执行PRD构建、生成内容和范围格式核验，不重跑产品测试或双重审查。

## PRD-0236：顶层路径间距与失效回复禁用边界（2026-10-20）

来源为用户对照正式项目后明确确认的两项本地调整。模块08保留顶层任务不显示面包屑内容的规则，同时路径区域与标题之间保留11px底部间距；模块10明确回复对象删除、不可用或失去讨论权限时，保留对应草稿及提示，编辑、发送和取消均禁用，不转换为普通发言。此条分别替代PRD-0221的空路径区域完全隐藏、PRD-0218的失效回复仍可取消边界；其他路径导航、有效回复取消及正常发送失败保稿保持。JSON／XML已有全屏支持不受本轮调整影响。

当前代码证据为[详情样式](../../src/features/tasks/styles/task-detail-split.css)的`.task-detail-kicker`保留`display:flex`及`margin-bottom:11px`，移除`.task-detail-kicker:not(:has(.task-detail-path, .task-workspace-sidebar-toggle-wrap))`的`display:none`规则；[讨论编辑器](../../src/features/tasks/discussion/components/DiscussionComposer.tsx)的`unavailable = disabled || submitting`同时控制编辑、发送和取消按钮。[任务讨论](../../src/features/tasks/components/TaskDiscussion.tsx)的`targetAvailable`只检查对象存在及`deletedAt`，在目标删除或消失时保持原回复草稿键、必要提示及禁用状态，不把草稿改挂到普通输入；这不构成权限撤销后禁用链路已实现或已验证的证据。

根代理在主工作区当前浏览器核对顶层空kicker为`display:flex`、高度0且底部间距11px；目标删除／消失时实际取消按钮禁用、有效对象取消后恢复普通草稿的相关回归与结构检查通过。本轮只验证目标删除／消失，权限变化后的禁用链路未作验证。初次直接执行受CSS加载方式影响，使用临时加载适配后相关断言通过；同批文件全屏旧PDF样式断言仍失败，与本次两处改动无关，不写为整批或完整项目测试通过。文档代理未重跑产品测试或页面操作，不将既有JSON／XML支持扩称本轮全屏实测。

FIG-DETAIL-022仍是旧的空路径区域完全隐藏状态，本轮转pending并撤出模块08正文，保留原资产及当时采集描述；不采集新截图，也不改变未受影响的子任务路径图。产品和模块版本保持；模块08／10、交互基线、来源／矩阵及日志同步，旧日志与已提交issue归档不改，不写待提交issue，不发布版本。文档只运行PRD构建、生成内容及范围格式核验。

## 创建方案骨架与内容平滑衔接（2026-10-16，非语义）

来源为用户对创建页底部骨架切换不顺畅的反馈。本轮修复既有PRD-0225渐进呈现的布局与绘制时序：属性骨架复用实际人员／日期网格、标签和控件占位，完成标准保留同一字段外壳；新增[TaskCreationPlanSurface](../../src/features/tasks/components/TaskCreationPlanSurface.tsx)在生成期间测量自然内容高度，以220ms高度过渡和180ms局部淡入衔接内容块，末块到达后240ms恢复自然高度。已完成方案的人工编辑不延迟；文本在首帧绘制前测高，人员属性尚未到达时不提前显示邀请结果。减少动态效果时关闭上述动画。此项不改变内容到达、停止／重试、人工编辑保护、生成校验、权限或最终确认边界，按纯呈现修复处理，不新增语义日志或版本；模块07正文、version及last_change=PRD-0230保持。

本轮QA使用主工作区当前源码的5189完整App，实际1440×900、390×844及减少动态效果三种条件：属性骨架／真实行分别为107→107px、167→167px，末块替换不再产生原有属性区高度突变，邀请入口全程0；正常动效的高度过渡为0.22s，稳定后height回到auto、transition为0s，减少动态效果为0s。桌面及窄屏生成中改名后，后续块保留人工内容且textarea节点不重建；生成完成后连续4个requestAnimationFrame中人工编辑的外层高度等于内容高度，无额外布局动画。日期改为10月17日、负责人改为林洁均可操作，任务数76→76，未确认创建。无pageerror、错误覆盖层、业务API调用或横向溢出；减少动效只有Motion的正常提示。运行记录中的相邻采样位移受33／60ms采样间隔影响，不作为帧率或通用性能保证；窄窗口不代表真机触屏／软键盘验收，仍是本地Mock逐块交付，不是真实模型流式生成或生产保存。

根代理最终复验渐进7、日期7、退出9，共3个定向文件23／23通过，应用tsconfig.app类型检查exit0，结构门无新增违反或例外；最后骨架日期与CSS调整后的Vite前端打包exit0、5.51秒，保留已有配置兼容及大包提示，不将该前端构建写为项目级tsc-b／完整npm build通过。文档代理读取本轮final-desktop／mobile／reduced及final-interactions运行JSON核对范围，未重跑产品、全量测试或双重审查。动画本身不以静态截图证明，不新增FIG或复制临时QA图；036／037／039原pending和038原收起审阅证据保持，不改截图清单或已提交归档；根代理随后经用户明确确认更新当前待提交草稿第16条，未操作远程。PRD生成与范围格式核验在本轮最小文档收尾执行，不操作正式项目、远程或发布。

补充已在正常主服务5173的1440×900完整页面走通同一创建流程：当前平滑容器生效，属性骨架／真实均107px，末块到达时创建按钮位置变化0px，完成后恢复auto；任务数76→76、未确认创建，页面内容完整且无错误覆盖、页面错误、HTTP错误或业务API调用。详细桌面／窄屏／减少动效对照仍归前述5189验证；临时5189已关闭，主5173保留。

## 文件列表开合入口图标精简（2026-10-16，非语义）

用户要求文件列表的展开／收起不要文字，并进一步精简界面。本轮同一双态图标始终位于预览工具栏，展开和收起不改变DOM位置、不占树搜索行，保留title、aria-label、controls／expanded及同一ref；移除底部整行footer和44px预留。只有预览工具栏吸附，树保持原自然移动和内部滚动，不固定整棵树；没有选中文件的收起状态仍保留展开入口。能力、操作结果与原宽度／偏好／焦点／会话规则保持，按纯视觉处理，不新增CHANGELOG ID，模块11 last_change=PRD-0233、产品及模块版本保持，旧0204等日志不改。

[本轮独立记录](../../artifacts/file-sidebar-icon-toggle-2026-10-16/verification.json)由根代理真实5173完整主任务页及工具结果整理：唯一30×30图标、按钮无可见文字、footer0；长文字滚动后入口top182仍可见，sidebar-content计算position为static。Enter收起后焦点在展开按钮，再Enter展开焦点回收起，选中文件一致，4个文件夹展开状态保持，treeScroll86→86，宽度248→248，最终树scroll恢复0。只有既有fileSidebarState3项、应用TypeScript、Vite生产构建及4代码文件范围格式检查在本轮通过，未把0233旧54项当新检查，文档代理未重跑产品验证。

两张图均从主工作区5173当前完整任务采集，current-page，真实JPEG1280×720；文档代理逐图目视、文件头／MIME／尺寸核实后原字节复制。085展开78%、086收起109%适宽，均回到执行手册第1／5页后采集，正文仅085。旧081—084含底部文字入口，转pending并撤正文；原资产及原轮标注／上传行为结果保留，能力报告将旧图归入历史布局。077全屏与015确认仅保留未受影响原范围，不大规模清查其他历史。截图展示两态，持续可达及键盘状态以运行记录为据。

浏览器曾因HMR的createRoot／removeChild短暂白屏，完整刷新恢复；日志保留11:44:06—11:44:18的5条历史错误／警告，最终检查无新增、内容完整且无错误覆盖，不写全程console无错。原PDF自适宽resize曾3→2，本轮不改阅读器、不宣称PDF页码或正文滚动位置保持，仅确认选中文件、树状态及宽度；不扩大为窄屏／触屏或全套标注重验。本轮不改代码／issue或远程，不运行全量测试／双重审查。正式模块、基线、来源／矩阵和清单按视觉同步，最终生成与最小静态结果见[文档校验](../../artifacts/file-sidebar-icon-toggle-2026-10-16/document-validation.json)。

## PRD-0233：PDF与演示文稿页内区域标注（2026-10-16）

来源为用户进一步确认并授权：PDF、PPT／PPTX无文字页面也需区域截图标注，有文字仍可选字，也可主动切为框选图表。开启标注后轻量切换选字／区域，无可选文字页自动区域；区域固定文件版本、页码、相对页面的归一化矩形与局部截图，点击标记或从本次列表定位返回同页区域，缩放／适宽不漂移。截图失败如实提示，不以占位或其他页面截图冒充成功；无OCR，不编辑或回写原件。支持范围、下载和临时跨文件／讨论／AI交接沿0232与原规则，本节替代无文字页只阅读边界，不合并前轮验证数量。

当前`TaskPdfViewer`与`pdf-region-selection.ts`已接选字／区域、页面过滤和真实canvas裁剪；PPT沿转换后的PDF页面共用。区域数据与来源回看／材料导出保留页码、矩形及固定版本，不再当作文本选区，不补造quote或文字偏移。实际验收中发现非全屏portal目标为null导致输入浮层未挂载，根代理修复为默认body并补回归；原生全屏仍在fullscreen viewer内部显示浮层与工具条。上述实现和材料边界据[本轮独立验收](../../artifacts/pdf-page-region-2026-10-16/verification.json)，文档代理未另行代码审查或产品测试。

本轮54项定向通过：区域锚点／回看／导出33、几何／模式／页过滤6、原选字回归6、Explorer及全屏／非全屏浮层9。这是0233的独立组合，不能与0232旧54累加或混称同一轮。前两组保留代理精确命令与工具输出，未为补日志重复跑；选字、UI、应用TypeScript、结构门和最终App＋组件页Vite生产构建有同目录日志，均exit0，保留既有配置／分包提示。没有运行全量测试或双重审查，既有server测试类型阻断不在本轮处理，不声明项目级完整build通过。

浏览器验收来自4183同一主工作区构建的[组件页](http://127.0.0.1:4183/artifacts/pdf-page-region-2026-10-16/validation.html)，实际TaskFileExplorer、TaskPdfViewer、TaskPresentationViewer和真实材料，类型为current-component、runtime为current-workspace-build。5173开发依赖优化期间反复重载，本轮不写成5173当前任务截图或完整主任务／上传流程验收，也没有持久修改主任务13文件。两页扫描验证PDF嵌入现有合成商品图，pypdf确认两页文字均空；开启标注自动区域、选字禁用，实际裁剪与意见页1／v1对应。两页各添1条且每页仅1个marker；从页2的列表点页1意见返回页1。103%→95%→适宽103%后矩形style逐字相同：left64.0244%、top18.0492%、width20.935%、height28.9973%。原生1440×900全屏在第2页真实框选、截图、填写及添加成功，浮层位于fullscreen viewer内，工具条可见。

现有真实8页PPTX第2页默认选字可用，主动切区域后框出3,297及总／剩余投入数据排版，截图与页2／v1可核对，添加后本次数量3（含两条PDF）。随后切回选字并实际拖选任务完成标题，文字工具条与text草稿正常、region草稿0。最后3条临时意见及空文字草稿均用既有控件清理，未发布讨论、启动AI或写任务树。稳定组件页console error／warn为空只涵盖该次检查，不掩盖5173此前重载；移动端、触屏、键盘绘制、强制canvas失败、AI／讨论交接、旧二进制PPT转换及全部浏览器未实测。失败提示／原件缺失守卫按实现与材料回归记录，不虚写浏览器强制失败通过。

083／084均真实JPEG1280×720、4183 current-component，逐图目视与文件头／MIME／尺寸核实后原字节复制。083为扫描PDF页1意见输入、本次数量0；084为PPT第2页数据排版意见输入、本次数量2，不能据截图声称当前意见已添加。对应添加结果来自运行记录。正文只嵌083，084留清单和报告；额外1440×900全屏图仅存报告、不占新PRD图号。081／082继续只保留原阅读／上传证据，不扩大为新区域能力。

模块11 last_change=PRD-0233，日志、基线、来源／矩阵与能力HTML／JSON／README同步，产品与模块版本保持，保留并行0231及其他模块。区域能力与0232白名单、0229源码历史结果分别登记。最终PRD生成与静态治理结果见[本轮文档校验](../../artifacts/file-capability-audit-2026-10-16/page-region-report-validation.json)；文档代理不改代码／issue或远程，不重跑产品、全量测试或双重审查。

## PRD-0232：按真实预览能力收敛上传与文件操作（2026-10-16）

来源为用户明确要求：以真正可预览的格式作为上传支持清单，逐类给出预览样式、具体标注操作、编辑许可及下载内容，并从任务文件中移出不支持格式。本轮确认16个扩展名、8组能力：PDF；PPT／PPTX；PNG／JPG／JPEG／GIF／WebP／SVG；MD；TXT／LOG；HTML／HTM；JSON；XML。MDX、DOC／DOCX、XLS／XLSX／CSV／TSV、ICS、音视频、压缩包、其他源码与专业格式不接受新上传。仅MD、TXT／LOG、HTML源码、JSON／XML可编辑；HTML按元素／区域、图片按矩形标注，演示文稿静态转换且无可选文字时不选字，不把预置文档／表格正文计入原件预览支持。

本轮`task-file-capabilities.ts`统一上传与编辑范围，任务文件选择／拖入、讨论选择／拖入／粘贴及底层`prepareDiscussionUpload`沿同一守卫；不支持后缀不能借通用MIME绕过，同批含不支持项时在创建节点或草稿附件前整批拒绝。根代理5173真实chooser同时选`preview-check.json`与内置`serum-launch-creative-brief.docx`，提示不支持DOCX，两份均未新增，文件页签仍13。文件选择accept与支持提示对应清单，不据accept属性代替底层拦截证明。

当前任务模板出口仅列支持格式。已有主任务从21→13：仅原模板完全一致、未被用户修改且没有编辑记录／草稿的两份DOCX及XLSX、CSV、ICS、MP3、MP4、ZIP共8项以`retiredBuiltin`投影隐藏，不物理删除blob，不复用附件专用标记破坏历史版本匹配。用户自建／上传、改名／移动／正文或版本变化、已保存修改、草稿和历史引用材料保留；旧讨论仍按原关联读取及下载，旧合成活动文字可能保留而不对应新的当前文件节点。主代理5173整页刷新后实测树13项均在支持范围，包含TXT、PPTX、SVG、HTML、JPG、PNG、WebP、MD、XML、PDF、JSON；这不等于本轮逐一重传全部16后缀。

PDF工具栏实际只有标注／全屏、编辑按钮0，执行手册按真实原件读取5页，缩略图初始收起。新上传PDF按原件预览，不再开放预置文本编辑；旧历史PDF文本版本仍保留原读取分支，仅为只读历史摘要，不计真实原版式预览或上传支持，本轮没有重构历史Viewer或统一替换缺件分支。JSON实际源码可见且仍有编辑按钮。JSON／XML完整任意上传、标注、保存和字节级下载保留[0229验证](../../artifacts/file-capability-audit-2026-10-16/implementation-verification.json)原场景，不说成本轮全量重验。PPT／PPTX仍依赖本地LibreOffice转换，转换后的文字层决定能否选字；不承诺动画、幻灯片编辑或扫描OCR。

[本轮独立验收](../../artifacts/file-capability-audit-2026-10-16/support-whitelist-verification.json)登记54项定向通过（能力／源码25、模板／原件16、团队相关7、UI回归6），末次应用TypeScript、结构门与Vite前端构建均exit0；UI6与构建检查日志同目录`support-whitelist-*.log`；其余3组在验收JSON登记精确命令及代理工具输出，没有独立日志，不为补日志重复运行。保留既有配置／分包提示。团队夹具另一个既有诊断冲突断言与当前返回空数组逻辑不一致，该失败保留，未修改无关诊断；前轮项目级`npm run build`被既有server测试类型错误阻断，本轮不声明整体构建或全量测试通过。开发服务期间曾重新加载／空白，主代理换新验收tab后完成上述页面检查，不宣称全程无错。文档代理未重复运行产品检查，未全量测试、双重审查、改issue或远程操作。

081／082为5173主工作区当前运行时两张真实JPEG1280×720：081呈现文件13及PDF第1／5页只读阅读，082呈现混合批次不支持提示、文件仍13；文档代理逐图目视并核实文件头／MIME／尺寸，按原字节复制，不重编码。正文仅081，082清单留存；截图不代替上传／迁移保护的定向和实际操作记录。含旧数量或不支持项的061／062／063／071／076／078／079／080转pending并撤正文，保留原资产和历史描述；077全屏不含树／数量，015只保留确认组件范围，不扩称新的支持清单证据。

模块11 last_change=PRD-0232，格式表、日志、交互基线与实现矩阵同步，产品及模块版本保持。[HTML清单](../../artifacts/file-capability-audit-2026-10-16/index.html)、[机器清单](../../artifacts/file-capability-audit-2026-10-16/capabilities.json)与[文字说明](../../artifacts/file-capability-audit-2026-10-16/README.md)以当前支持范围为主，旧17种素材报告及原始证据归为历史，不覆盖0229记录。PRD最终构建成功生成25模块，生成页包含0232与支持格式表，081内嵌JPEG逐字节匹配正式资产；日志编号唯一、版本保持、截图／模块索引JSON、报告8行五列／16扩展名／两图及本地链接核验通过，保留并行0231／0230。文档静态结果见[报告校验](../../artifacts/file-capability-audit-2026-10-16/support-whitelist-report-validation.json)，本轮范围格式检查通过。

## PRD-0231：已保存任务的一层子任务建议规范与独立Skill（2026-10-16）

来源为用户明确要求独立Skill：分析当前任务真实目标、任务完成标准、已有子任务、讨论及直接回复语境、有效版本文件正文与团队正式职责，只给当前任务下一层的剩余交付建议。本轮细化模块08的PRD-0225目标，不递归、不重复、不机械拆普通步骤，已覆盖或原子交付可无需拆分；材料缺失如实标记，关键冲突先补问，推荐人员不成为正式分派，生成不写任务或职责。模块08 last_change=PRD-0231，交互基线同步，产品与模块版本保持。

本地独立源为`skills/taskdoor-decompose-task/SKILL.md`、当前版本`2026-10-16-v2`，输出协议`taskdoor.subtask-suggestions.v1`，引用契约、Schema、目标／标准、日期和上下文读取资料；[当前独立包](../../artifacts/subtask-skill-2026-10-16/taskdoor-decompose-task-v2.zip)与[文件清单](../../artifacts/subtask-skill-2026-10-16/package-manifest.json)保留。运行资料属于自身目录，不借创建Skill输出递归树或把建议状态当确认。本机`/Users/yxzuji/.agents/skills/taskdoor-decompose-task`已安装清单内8个文件；独立ZIP及清单同目录保存，不发布远程Skill仓库。38项新增定向检查（adapter21、fixture10、runner5、实际平铺摘要2）及22项创建／包兼容检查（创建preview／recovery18、包4）通过；实验室和实际fork扩展类型检查、fork生产构建通过。浏览器连接不可用，本轮未点击或复测窄屏、未采截图，不把静态平铺渲染检查扩成浏览器操作通过。

测试平台通过`server/test-lab/subtask-suggestions.ts`构造授权范围内的当前任务、可见直属子任务、来源正文／读取状态／版本、直接回复及替代关系、正式职责独立版本和覆盖缺口；只有文件元数据或不可读内容时不注入伪正文。动态协议绑定当前父任务、有效成员与真实来源，校验候选平铺、查重、无需拆分、缺口及层级／硬截止边界；精确交付查重不冒充完整语义查重。`subtask-generation.ts`、独立`subtasks`运行分支和`src/test-lab/output-summary.tsx`仅承载隔离建议及展示，不执行任务、人员或通知写入；这属于内部评测接入，不成为新的产品功能模块。真实外部资料只读取数、任意文件解析或跨端权限不能由隔离快照证明。

首轮六个新PPIO用例的[独立只读批次](../../artifacts/subtask-skill-2026-10-16/ppio-v1.json)`b637ed29-9dcd-4d0a-bc89-2944a29fa67e`已完成，生成`pa/mercury-5.5`、裁判`qwen/qwen3.7-plus`；[首轮汇总](../../artifacts/subtask-skill-2026-10-16/ppio-v1.summary.json)为6／6结构与自动业务通过。直属子任务续页缺失一例首次输出`partial`但含关键问题，已被本地关系校验拦截，经一次结构修正为`needs_clarification`后通过；原始尝试及总Token均保留，不写成零修正全过。

根代理核对实际输出：已有文案不重复，单一脚本不强拆；直接回复与新版本文件的1080规格及确认截止10月21日被采用；职责缺失保持未分配、未知外部等待日期留空；续页缺失保留关键确认，实际层级配额用尽时无候选。自动裁判结果与业务核对分别记录，保留`manualAcceptanceWritten=false`，不回填用户review或真实写入。

据首轮结果，v2明确来源可引用当前任务、已有子任务、成员正式职责和正文来源四类输入目录，并明确关键问题非空优先补问状态；Schema保持。v2已本机安装并生成8文件一致的ZIP，v1包、冻结运行与清单保留历史。v2冻结版本`b313f0ae-c305-4591-b0b4-b118c98c4394`已对“已有文案只补商城图”和“直属子任务续页缺失”两例完成[定向复测](../../artifacts/subtask-skill-2026-10-16/ppio-v2.json)，[汇总](../../artifacts/subtask-skill-2026-10-16/ppio-v2.summary.json)2／2结构与自动业务通过，均首轮输出通过、无结构修正；[两例精确核对](../../artifacts/subtask-skill-2026-10-16/ppio-v2.precise-checks.json)也通过，包含状态、真实目标、来源、日期、正式职责推荐与夹具保持，不冒充六例全部重新生成。v1六份输出另经[精确核对](../../artifacts/subtask-skill-2026-10-16/ppio-v1.precise-checks.json)，按当前协议关系及场景事实6／6通过、夹具未变且无MCP写入，这不是v2重新生成证据。两批仍保留`manualAcceptanceWritten=false`及`needs_review`，不写为用户验收。

部分历史用例的期望元数据曾指定首位视觉成员`lin`，实际输出按另一位有效成员`jage`的已保存视觉职责推荐，根代理核对职责语义成立；本轮自动通过不表示精确命中旧ID。用例发现源现已改用正式职责语义，不固定首位视觉成员，并新增成员目录逆序回归，fixture最终10／10通过；[最终状态核对](../../artifacts/subtask-skill-2026-10-16/final-state.json)确认实际两条用例元数据均由版本1更新为2，独立拆解默认冻结版本设为v2（`b313f0ae-c305-4591-b0b4-b118c98c4394`），创建Skill的v17默认（`5b9c72be-3d25-4e56-99cf-677eb3a63738`）保持；8份历史运行完整JSON哈希不变，未写人工review。这只更新实验室选版与用例元数据，不证明TaskDetail产品接线或真实业务写入。问题与历史范围见[交付报告](../../artifacts/subtask-skill-2026-10-16/REPORT.md)，历史冻结输入及裁判记录保持，不能改写历史以消除差异。源、本机安装和v2压缩包8文件一致，源与安装基础校验、十处内部引用及协议示例校验通过，嵌套`children`被结构拒绝；不据本批代表例承诺通用稳定性或性能。R03仅部分推进：独立Skill与只读评测接入已建立，产品详情中的批量候选会话、审阅／版本复核和统一创建仍未实现，不将既有单项新增入口当完成，待办保持10／15且R03未勾选。主产品页面未变化，无新正式截图，不调整截图清单或用评测摘要证明TaskDetail入口可用。

本轮不写本地待提交issue：最新AGENTS要求用户先确认，本轮尚无该确认；不操作正式项目、独立远程Skill仓库或远程issue，不发布版本。PRD成功构建25模块，生成页包含PRD-0231、一层剩余交付与无需拆分规则；本次编号唯一、模块08四区块及原版本、索引／截图JSON、实际两批6＋2汇总及R03未勾／10项完成状态、范围格式检查均通过。不运行全量测试或双重审查。

## PRD-0230：真实目标与截止建议的实际评测修正（2026-10-16）

来源为用户要求更新R04／R05测试用例的完成标准、融入目标与结果证据判断，并使用已配置PPIO自动运行、按实际结果修复。本轮细化模块07既有规则：用途前缀加产物质量仍不等于真实目标；用途须能说明有依据的具体理解、判断、后续工作能力或状态改变。范围明确的有限任务仅缺普通可补规格时仍给有条件的初始截止建议；时间未知的关键外部等待或整体范围无法判断时才留空。保留人工日期与清空、既有范围／指标及生产协议边界。

`server/test-lab/creation-outcome-criteria.ts`为74个已有启用创建用例补六类检查，并新增10个边界用例；当前84／84覆盖加强目标与新日期判断。迁移只精确替换已知旧规则、保留同ID自定义内容、原输入及历史运行；覆盖数不是模型实际运行数。评测以本机Skill必要7文件和生产Schema冻结快照，PPIO生成`pa/mercury-5.5`、裁判`qwen/qwen3.7-plus`，preview模式不执行MCP任务写入；脚本保存请求ID并按原请求查询，结构、自动业务判断与人工核对分别表达。

前置批次完整保留：[v15首轮16例](../../artifacts/okr-evaluation-2026-10-16/baseline-v15.summary.json)自动均通过，但根代理逐份核对发现“为新品宣传提供准确清晰的脚本”仍偏产物换称；中间v16四例运行的冻结标准未真正升级，不能算加强版验收。修复旧文本精确迁移后，v16强标准四例自动通过，人工又发现无指标单图因未提供尺寸而取消截止建议，自动裁判同样漏判。本轮据这些实际输出收紧生成与评测规则，不把任何自动全通过倒写为人工验收。原运行、冻结输入／Skill、尝试与裁判结果保留于[评测目录](../../artifacts/okr-evaluation-2026-10-16/README.md)，最终边界由同目录REPORT说明。

本机`/Users/yxzuji/.agents/skills/taskdoor-create-task`已安装`TASK-PREVIEW-2026-10-16-v17`，保留v16目标规则并补可补规格与关键等待的日期区分。[v17安装包](../../artifacts/skill-release-2026-10-16/taskdoor-create-task-v17.zip)与[清单](../../artifacts/skill-release-2026-10-16/taskdoor-create-task-v17-manifest.json)恰含7个运行文件，安装／ZIP逐字节一致、21本地链接有效；生产Schema SHA256仍为`3742426ddf277de4f7ed87fe2290023ab3d8e9c830de68a81d248c8cbf74fd2d`。项目研究v14与生产协议各自保留，不发布远程Skill仓库。

最终v17批次`d6fafeb3-5e03-4b7b-b093-7439677252db`选择六例、八个生成步骤，已全部完成：[运行汇总](../../artifacts/okr-evaluation-2026-10-16/retest-v17.summary.json)为6／6结构与自动业务通过，[六份冻结用例核对](../../artifacts/okr-evaluation-2026-10-16/retest-v17.criteria-verification.json)均含强目标与新日期标准，[精确结果检查](../../artifacts/okr-evaluation-2026-10-16/retest-v17.date-inspection.json)11／11通过。实际缺尺寸单图与有限纪要均建议2026-10-19并说明前提假设；持续FAQ及供应商未知外部等待保持null；清空后仅改名三步日期为2026-11-06→null→null，其余字段保持。旧脚本目标说明宣传使用方用于后续制作／发布准备的具体用途，不强迫添加销量KPI。

根代理逐份阅读最终输出，供应商例连接超时后恢复成功，原始失败与重试证据保留；不将个例时长作为性能承诺。运行仍保留`manualAcceptanceWritten=false`，没有回填人工验收或写入真实任务；最终六例结果不抹去前置自动漏判，也不作为全部84例模型实测或创建页已接入证明。实验室默认创建Skill已从旧v12切至本轮冻结并实测的v17，见[默认版本变更](../../artifacts/okr-evaluation-2026-10-16/default-version.json)；该默认设置只代表实验室后续选版，不等于产品创建页已加载。完整结论见[评测报告](../../artifacts/okr-evaluation-2026-10-16/REPORT.md)，本轮38项定向软件检查及实验室类型通过，未运行全量测试。

模块07 last_change=PRD-0230，交互基线、日志及矩阵同步，产品／模块版本保持。没有页面表现变化或新截图，不调整截图清单；保留并行JSON／XML的0229与模块11。R04／R05仍按自用Skill范围完成、todo10／15，评测结果不变更为用户review通过；R03、R06、R09／R13及R15范围不变。不写本地待提交issue，不操作正式仓库或远程，不运行全量测试／双重审查。最终证据补齐后PRD已重新构建成功25模块，生成页含0230、新目标与日期边界，模块索引／截图清单JSON、日志编号唯一及本轮范围格式检查通过。

## PRD-0229：JSON与XML源码阅读、编辑及下载（2026-10-16）

来源为本轮用户明确要求支持JSON与XML，范围为真实本地上传后的等宽源码阅读、保留空白／缩进／换行、复用选字临时标注、源码编辑保存及下载当前查看版本内容。JSON／XML语法未完成仍可读原文；不执行内容，不解析XML外部实体。语法校验、结构树、自动格式化及折叠不在本轮确认范围，不能由显示源码推定已实现。文件、版本、权限及临时标注／讨论交接沿既有规则，不新增独立沟通区，不扩大到其他文件类型。

当前代码已接线：`task-file-tree.ts`识别JSON／XML扩展名与相应MIME，`discussion-uploads.ts`用实际上传文件的`file.text()`保存文本；`LexicalFileDocument.tsx`的source模式将整份原文保存在同一文本块，`FileSourceLineNumbers.tsx`提供独立行号，`TaskFileViewer.tsx`按整段源码编辑，并从当前正文生成UTF-8的JSON／XML下载，不回退到旧blob。上述处理不解析或执行内容，原有SVG／HTML等明确格式仍沿原路径。行号是当前视觉呈现，不扩大为结构折叠或语法检查能力。

本轮最终组合运行6个定向文件32／32通过：`taskFileSourcePreview`、`taskFileStructuredUpload`、`taskFileTree`、`taskFileCodeAffordances`、`taskFileAnnotationBundle`与`taskFileTextAnnotation`，不将各子批次数量累加。末次前端`tsc -p tsconfig.app.json`与结构门exit0，最后源码hover样式修正后的`npx vite build --logLevel warn`也exit0，过程日志为`/tmp/taskdoor-json-xml-vite-build.log`，保留既有配置导入与分包体积提示。标准`npm run build`虽通过结构门，随后被工作区既有server测试类型错误阻断，包括`aiConnectionContextPreview.test.ts:99`，本轮未修无关测试，不记录整体构建通过。具体命令、结果及范围见[本轮实现验证](../../artifacts/file-capability-audit-2026-10-16/implementation-verification.json)，文档代理不运行产品测试或双重审查。

4183同一主工作区构建完整App中，主代理真实新上传`preview-check.json`与`preview-check.xml`，全文缩进、空行及尾换行保留，源码中的字面`<script>`没有生成DOM脚本节点。两份文件分别把“待核对”修改为“已核对”并保存v2，再实际下载；下载目录中的文件再次以`read_bytes`与期望UTF-8字节对比均一致，没有返回首次上传旧内容。JSON拖选源码后填写并添加意见，高亮只覆盖准确选文、完整源码未改变，点击标记可打开对应意见列表；XML也实际添加意见，仅`<title>XML 预览验证</title>`高亮、点击标记打开正确意见，局部截图可读，两份临时意见已清理。没有发布到讨论或发送AI，不把既有交接逻辑说成本轮重新运行。此前5173直接打开当前JSON的读取与浮层结果只保留其原范围，不代替本次任意上传／保存／下载实测；语法校验、折叠或正式项目能力不由这些结果推定。

FIG-FILES-079／080为5173主工作区当前运行时最终样式的JSON意见输入与XML阅读，两图均已逐图目视并核实实际JPEG／1280×720，按原字节复制为`.jpg`，不重编码；临时源以`.png`命名但字节为JPEG，正式后缀及MIME以实际核验为准。079内嵌正文，080保留清单。JSON图是输入待添加状态、本次数量仍为0，不据图宣称已添加、发布或保存下载；4183动态操作证据按上段分别记录。最终源码取消整块hover底色，仅实际选区高亮。5173补采前曾在并行HMR期间出现removeChild／createRoot白屏，主动整页刷新恢复后才采正式图；4183验收时`console=[]`只说明该次检查，不记为全轮没有历史控制台错误，上述4183流程未出现JSON／XML功能错误。

模块11 last_change=PRD-0229，交互基线、日志与实现矩阵同步，产品／模块版本保持，既有其他类型截图只保留其原范围，不宣称正式项目接入。文档代理不写本地issue或远程记录，主代理统一记录最终实现验证状态，保留并行PRD-0230及其他模块。

PRD构建成功生成25模块，生成页已核验PRD-0229、JSON／XML规则及079内嵌JPEG；模块索引／截图清单JSON、0229唯一及本轮范围格式检查通过。主代理另记录本地待提交第61项，文档代理未改该草稿、不进行远程操作或发布新版本。

## 文件阅读器视觉细化（2026-10-16，非语义）

用户反馈缩略图预览侧栏过宽，本轮沿既有浮动工具胶囊与轻量皮肤，仅以CSS收窄覆盖浮层、压缩编号及内边距，保留页导航、固定、选文标注、全屏与文件业务。沿PRD-0226纯视觉调整，不新增CHANGELOG编号，模块11 last_change=PRD-0226、产品及模块版本保持；正文只替换当前界面图，不写入视觉尺寸细则。下方0226及前轮功能验收历史保留，当前浮层宽度以本节新证据为准。

4183同一主工作区最终5.01秒构建完整App实测普通面板180px／纸面约127.98px、真实1440×900全屏面板192px／纸面140px、390×844窄视口面板160px／纸面108px。三模式面板内部clientWidth=scrollWidth分别为178／190／158px；窄视口document.scrollWidth=innerWidth=390，普通reader仍为730px，无横向溢出。默认收起、hover未固定展开、点击第3页后input／current均3、Esc关闭且焦点归入口均经实操，测后viewport已恢复；新截图均为第1页，不冒充第3页结果或真实触屏设备验收。

本轮仅调整宽度／边距／编号，保留前轮224×318按页面比例渲染的清晰度基准。PPT／PPTX沿共用CSS，但本轮未重跑PPT转换或视觉，不以旧075证明收窄后的演示文稿呈现；既有本机转换及页导航证据保留其原范围。本轮仅Vite5.01秒通过，未重跑应用TypeScript、结构门或测试，不把前轮通过及0226既有37项当作本轮新验证，未全量测试或双重审查。

076～078分别为普通PDF展开、真实全屏与390px窄视口，均来自4183最终构建完整App的真实JPEG，已逐图目视并核实尺寸／MIME；正文仅076。072～075含旧宽面板，转pending并保留原资产／历史；071收起态不受本次宽度影响，保留原范围，068～070维持pending。[本轮前端构建日志](../../artifacts/reader-narrow-thumbnails-2026-10-16/frontend-build.log)留存末次结果；只更新本地未提交第60项，不占61、不改并行内容。文档代理未改代码、运行测试或构建；本轮PRD构建成功生成25模块，生成页已核验076内嵌JPEG并保留0226，截图清单／模块索引JSON及本轮范围格式检查通过。

## PRD-0228：目标与日期Skill本机交付范围（2026-10-16）

用户明确R04／R05只交付自己使用的Skill更新，已有研究由其他会话完成，不把创建页真实模型接入作为这两项完成门槛。当前产品目标／标准语义沿PRD-0217，有限任务有依据日期建议、持续工作例外及用户修改／清空保留沿PRD-0215；模块07仅将last_change更新为PRD-0228，正文规则及版本保持，安装状态只登记在证据层。

本机`/Users/yxzuji/.agents/skills/taskdoor-create-task`已交付`TASK-PREVIEW-2026-10-16-v15`：以安装v12生产协议为基础，局部合入项目研究v14的独立目标／标准规范、精简管理判断及日期模块。两套Schema不同，不整份覆盖；项目`skills/agentdoor-task-planner`的v14协议与版本保持。原生产Schema SHA256为`3742426ddf277de4f7ed87fe2290023ab3d8e9c830de68a81d248c8cbf74fd2d`，与更新前ZIP逐字节一致；6段其他会话生产规则逐字保留，没有借知识同步改写人员、语言、估算、层级或确认协议。

交付恰含7个必要运行文件，系统`quick_validate`通过；沿独立仓库README的`check-skills.mjs`在隔离目录核对7文件内部引用通过，安装版21个本地链接有效。[v15安装包](../../artifacts/skill-release-2026-10-16/taskdoor-create-task-v15.zip)与安装目录7文件逐字节一致，[清单与哈希](../../artifacts/skill-release-2026-10-16/taskdoor-create-task-v15-manifest.json)留在包外，原v12备份同目录保留；没有修改或发布远程仓库。

3份新独立本地代理完整读取安装v15后输出，均通过保留的生产Schema：一页报销说明的目标写真实用途，有限交付建议2026-10-19并说明周一至周五、未核实日历与人员容量的假设；持续FAQ不设整体截止、整体工时未知；修改旧方案只改名，保留dueDate为null及其余字段。输出见[演练样例](../../artifacts/skill-release-2026-10-16/behavior-examples.json)，结果见[演练校验](../../artifacts/skill-release-2026-10-16/behavior-validation.json)，交付边界见[记录](../../artifacts/skill-release-2026-10-16/README.md)。这是新版本的本地行为演练，不是外部模型API、生产性能或创建页接入证明。

本次交付不表示创建页已加载该安装Skill、通用模型效果已验收或正式项目已接入；这些为独立后续。历史v14样例、Mock页面及前轮31项检查只保留原范围。R04／R05按用户明确的Skill交付范围完成，todo更新为10／15；不将完成标记扩大到应用模型接线。模块07原正文与产品／模块版本保持，本阶段不改截图、issue、远程仓库或项目v14源，保留0227／0226历史。最终PRD构建成功生成25模块，阅读页已核验PRD-0228及本机Skill交付日志，模块索引JSON与本轮范围格式检查通过。

## PRD-0227：创建对话入口仅收起时显示（2026-10-16）

来源为用户对R01当前截图中“创建对话”入口的进一步调整：侧栏已展开时入口隐藏，收起动作由侧栏头部承担，收起后才显示入口，重开再次隐藏，关闭焦点归还可见入口。本条仅细化PRD-0225同一R01的入口状态与键盘边界，不新增业务概念，不改生成／普通修改／最终创建、独立拆解、文件标注或日期语义，不变更todo完成数量。

当前`TaskCreationPage.tsx`已将入口条件改为`!showDescribe && !aiOpen`，点击只展开；收起后沿现有受控焦点标记与effect定位重新出现的`.task-ai-adjust-trigger`，侧栏头部收起保持。根代理本轮应用类型检查exit0。浏览器绑定持续20秒超时，本轮UI未重测、没有新截图，不把0225前轮4176焦点结果或原31项检查算作本轮新入口已验；类型通过也不替代运行证据。仅执行本次必要类型检查，不新增镜像测试、全量测试或双重审查。

FIG-CREATE-036／037在展开侧栏时仍显示页面“创建对话”入口，转pending并撤模块07图片与图注；039也清楚包含同一旧展开入口，虽未内嵌仍同步pending。038为收起后的窄屏审阅，仅保留原范围，不用于证明新展开状态。图号、原资产和0225历史事实保留，待主工作区提供新截图后另登记当前证据，不能把旧图改名当新图。

模块07 last_change=PRD-0227，基线、日志、来源／矩阵与截图清单同步，产品／模块版本保持。本阶段不构建生成页，不写本地待提交issue或远程操作；并行0226及模块11、0225历史保留，R01完成计数保持。

## PRD-0226：页缩略图浮层与演示文稿预览（2026-10-16）

用户要求PDF与PPT页缩略图默认收起，并以短线入口参考明确：悬停弹出圆角白色面板，移开收起，不挤正文；顶部总页数与固定操作、当前页浅蓝标识和点击跳页，同时保留点击、键盘与触屏可达。目标正文仅维护开合、固定、跳页与正文／标注保持，不把尺寸、色值或实现组件写成业务规则。PPT／PPTX此前无完整预览，本轮新增逐页静态阅读、处理状态／失败重试及原件下载，不承诺动画、放映、编辑或回写。

PM本地同源转换服务已接入LibreOffice／soffice，把旧PPT及PPTX转换为预览PDF，`TaskPresentationViewer.tsx`复用真实页面渲染／缩略图，原件和版本保持，原件仍沿下载流程、不转为可编辑文本。首次实际较大PPTX请求在45秒上限返回504后，服务上限调整至120秒，以独立spawn进程组清理取消／超时；真实子进程取消验证本组终止、无关进程仍存活。早轮HTTP200虽得到8页及文字项，随后发现macOS headless缺少字体发现配置，不能把该输出当作正确中文预览；作业内显式指向现成本机字体，未修改源文稿或安装字体。最终同一1,970,379字节briefing.pptx在4183 HTTP200，约44.5秒产776,193字节、8页PDF，完整中文提取及独立渲染正常。[早轮HTTP记录](../../artifacts/presentation-preview-2026-10-16/briefing-http-verification.json)与[最终字体／HTTP验证](../../artifacts/presentation-preview-2026-10-16/briefing-font-http-verification.json)保留诊断分界；单份本机样本不构成耗时或通用格式／字体兼容性保证。

PDF导航已接入默认短线、悬停覆盖浮层、固定／Esc／点击跳页及按需canvas释放。同一主工作区当前dist的4183完整App、1280×720实测默认aria-expanded=false且缩略图canvas为0，悬停打开5页真实缩略图、未固定；前4页渲染而第5页离视口不渲染，阅读viewport宽度前后均696px。点击第3页后页码及当前页均为3、内部滚动1929；移到适宽按钮后浮层关闭、canvas为0。Tab打开并聚焦固定按钮、Enter固定，Esc关闭且焦点回到“页面缩略图”。打开时外层滚动位置有变化，不据宽度保持推断滚动位置完全不变；这些是4183当前构建实操，不冒充5173或真实触屏。

4183最终9.22秒构建的真实App已显示该8页PPTX的正常中文封面，默认关闭且缩略图canvas为0；悬停未固定打开8张真实横向缩略图（canvas208×116），阅读viewport前后仍为696px。最终比例布局的单行高度约78.49px，多余留白已修正，重验点击第2页后页码／current均为2，再回第1页采集070。旧PPT的本轮证据仍限转换夹具，未扩大为真实App全部格式验收；PPT标注会话、窄屏／触屏本轮未验。

转换服务8／8（含真实取消与字体配置）、格式／原件不可文本编辑等29项合计37项定向通过，server及应用TypeScript、结构门通过。较小PPTX／旧PPT各得到2页、每页7文字项，[PPTX检测](../../artifacts/presentation-preview-2026-10-16/pptx-inspection.json)及[PPT检测](../../artifacts/presentation-preview-2026-10-16/ppt-inspection.json)保留。早轮并行元数据缺失已补齐，最终横向比例布局修正后的应用TypeScript及Vite构建通过（9.22秒），结构无新例外；不将前端打包称为整项目标准build。本机soffice不代表正式服务、部署、权限／字体或生产兼容性已接入，PPT选文标注不从转换路线推定。

模块11 last_change=PRD-0226，日志与基线同步，产品／模块版本保持。068／069／070来自4183同主工作区当前构建完整App的真实JPEG1280×720，分别呈现PDF收起／展开与PPTX最终横向缩略图，文档代理逐图目视并核实尺寸／MIME；正文使用069，068／070保留清单，来源明确为构建预览。064～067继续pending且原资产／0223历史保留，其他旧图及并行025不改。[本轮记录](../../artifacts/page-thumbnails-2026-10-16/README.md)与[结构化结果](../../artifacts/page-thumbnails-2026-10-16/validation.json)区分PDF、PPTX、转换夹具及未验证范围；该预览只加载本地文件转换服务，不证明其他后端已接入。本地第60项已完成37项与上述必要页面验收；PRD构建成功生成25模块，生成页含0226、页导航规则及069内嵌JPEG，截图清单与模块索引JSON有效，本轮范围格式检查通过。59留创建线程；PR待补，文档代理不改实现／依赖或构建，不全量测试／双重审查，不远程操作或发版。

## PRD-0225：创建三栏渐进方案与独立拆解边界（2026-10-16）

来源为用户在继续review待办时明确排除R09／R13，并进一步说明R01：“点击创建后，loading不在中间，侧滑对话打开展示loading，中间开始渲染骨架和填充内容”。结合此前“子任务拆解单独步骤，不在创建流程”及去掉创建标注的要求，正式目标为左任务列表／中任务方案／右创建对话，同一会话按有效内容块呈现。模块07去除卡片标注及创建内继续拆解，保留直接编辑、普通修改差异预览／应用与最终确认；模块08记录已保存任务从概览独立发起AI拆解，确认前不新增、不顺带重写父任务。模块01核心流程只作交叉引用修正，不改账号、注册或连接规则；R15仍留在[本地设计稿](../../artifacts/product-audit/review-remaining-design-2026-10-16.md)，本轮不将拟议连接协议升为正式能力。

目标替代PRD-0209及相关创建标注、创建内拆解与整页等待范围；文件标注、人员直接生效、父子归属／层级配额、离开确认和用户确认边界保持。日期规则继续沿PRD-0215，真实目标及标准继续沿PRD-0217，不新增日期语义或指标字段。交互基线同步“三屏”含义及取消创建标注／内拆解，并将原多层级夹具与当前创建入口区分，不覆写历史日志。

本轮本地接线为：`TaskCreationPage.tsx`发送时打开对话，`TaskCreationGenerationSidebar.tsx`承载过程，`TaskCreationSkeleton.tsx`及PlanEditor按可见内容块显示；`task-creation-progress.ts`逐块合并以保留已到字段编辑。`src/ai/mock/lib/taskCreationStream.ts`仍是先取得本地候选再按块交付的演示适配器，不是实际模型流式生成或SSE；`taskCreationDeadline.ts`补有限交付／持续工作案例及日期依据。创建页面只审阅当前主任务，不再挂载标注输入／列表或传入标注入口，也不提供继续拆解；底层兼容组件和历史夹具保留不等于入口仍可用。

根代理在主工作区5173、1440×900实际验证：发送后右侧generation-sidebar内loading为1、中间loading为0；名称／目标首块到达时其余两块仍为骨架。点击停止后目标保留且创建禁用，手动将名称改为“会议决定与行动项纪要”，重试完成其余块后仍保留该名称；完整方案中创建标注与继续拆解按钮均为0，普通AI修改保留。清空建议日期后对应提示消失，再通过普通AI修改目标、明确应用成功，仍无截止且日期建议提示为0。现有团队任务仍为76，没有为验证提交新任务。

同一主工作区5173的390×844窗口先从空白页加载完成当前代码，再实际完成活动示例的两次补问：补问自动可见，最后自动收起侧栏回审阅，`document.scrollWidth=390`且创建可用。对话关闭／重开保持草稿，Escape可隐藏。该窄窗口不扩称真实触屏或软键盘验收；关系确认、真实模型与生产保存不由这些页面证据自动推定。

最后焦点修复在当前静态构建的临时预览`http://127.0.0.1:4176/`单独验证，界面为英文：实际生成持续FAQ任务且无截止日期；Escape关闭修改侧栏后，焦点回到`aria-label="Toggle creation conversation"`的可见入口，侧栏数为0、任务名称保留，页面宽度与scrollWidth同为1280。证据为[当前构建焦点截图](../../artifacts/creation-progressive-2026-10-16/stable-escape-focus.jpg)，仅留运行材料，不新增正式图号或把该结果写成5173实操；生成FAQ只停留草案，没有提交任务。

四个本轮定向文件31／31通过，其中渐进7、日期7、估算8、退出保护9，见[本轮日志](../../artifacts/creation-progressive-2026-10-16/tests.log)。额外旧适配器14项中13通过、1失败，失败为已保存任务预期“待开始”与现行“进行中”冲突；保留原断言与[日志](../../artifacts/creation-progressive-2026-10-16/adjustment-adapters.log)，不扩改旧行为、不并入全通过结论。最终应用类型exit0；Vite前端构建包含最后焦点修复，根代理已在静态bundle核对对应ref与effect，本轮构建1分41秒，保留既有配置兼容／分包提示，结构门无新增例外。未运行全量测试／双重审查，不写成完整标准npm构建通过。

独立AI拆解仅为已确认设计；相关Skill拆解入口协议、批量候选、去重与确认写入尚待实际接线，不能勾R03整体完成。日期仅为有限Mock及依据提示，不证明通用真实模型排期或正式保存；R04／R05真实模型效果仍需后续验证，正式项目未改。

旧创建图中涉及标注、继续拆解、整页等待及相关审阅布局的项保持／恢复pending，补记0225失效范围并保留资产、图号和采集历史；035及以前不恢复captured，模块00没有对应旧创建图引用。

新增FIG-CREATE-036／037／038／039均为本轮主工作区5173当前页面，根代理及文档代理逐图目视核验；036三栏生成、037改名重试后的完整主任务、039停止后首块保留均为真实JPEG1280×720，038补问完成后窄屏审阅为JPEG390×844。原`artifacts/creation-progressive-2026-10-16/*.png`文件实际已经是JPEG，本轮原字节复制为`.jpg`、不缩放或重编码；如实记录图像像素，不将前述运行DOM视口测量1440×900称为图片尺寸。036／037内嵌模块07，038／039只保留清单；037仅显示当时折叠日期依据，未显示后续清空／AI应用，不用其证明后续焦点行为。后续窄屏自动收起与焦点接线调整的实际证据分别按上文记录，正式截图不冒充这些动态行为证明。

根代理PRD构建exit0，生成25个模块；当前阅读页已核对包含PRD-0225与FIG-CREATE-036／037。本次最终证据文字补录后由根代理再次生成，禁止手改产物。模块01／07／08 last_change=PRD-0225，版本保持，文档代理未写待提交issue或远程操作；并行PRD-0226及模块11保持原文。

## PRD-0224：阻塞任务标题使用警告三角（2026-10-16）

用户在当前任务截图中指出：已阻塞任务的状态菜单是警告三角，标题仍为四段AI进度环，明确要求统一。模块08及交互基线以该决定替代PRD-0145及现行“阻塞标题仍保留AI圆环”的范围：标题默认用警告三角，AI阶段／依据仍在提示读取，完成和撤销入口保持，撤销恢复阻塞三角；进行中圆环、完成勾、取消叉以及原进度、标准确认、权限和保存语义不变。

`src/features/tasks/components/TaskCompletionIndicator.tsx`直接复用`src/shared/ui/TaskStatusBadge.tsx`的TaskStatusIcon，completed优先为已完成，否则沿当前状态，并传原progressRatio；阻塞分支取得与菜单相同的TriangleAlert。`task-detail-split.css`只将该三角描边保持2px并在悬停确认时保留外三角轮廓；未改任务状态、进度评估、人工标准确认或完成回调。菜单、列表及吸附摘要原已为三角，不扩改其业务。

根代理在主工作区5173原生629×804页面实际核对“完成直播间彩排与场控清单”：标题与已阻塞菜单的SVG逐条path完全相同，标题28px、描边2px；aria-checkbox仍false，原AI分析“少量完成”提示仍在。未点击修改状态或写入任务数据，不把保留回调代码说成本轮实际重走了完成／撤销保存。键盘聚焦后外三角path的opacity为1，完成勾提示渐显，提示实际含原AI阶段、评估依据及点击确认说明；checked始终false。应用TypeScript、结构门（无新增例外）、范围内差异格式检查及Vite打包（4.08秒）通过，保留既有chunk体积提示；本次可逆局部图形调整未新增镜像测试、不跑全量测试或双重审查。

新增FIG-DETAIL-025为该原生页面629×804真实JPEG，根代理与文档代理均已目视，文件尺寸与MIME核实后放入模块08。FIG-COLLAB-009显示阻塞标题旧进度环，恢复pending并从模块10正文撤下，资产及区域已读历史验证保留；模块10规则与last_change保持。其他当前截图为进行中任务或未显示受影响标题，保留原范围，不因本次局部改动全部作废。

模块08 last_change=PRD-0224，来源、矩阵、基线和日志同步，产品／模块版本保持，不覆盖并行PDF的0223或既有0221。用户已确认记录，已补入[本地待提交汇总](../../artifacts/product-audit/product-sync-pending-issue-2026-10-15.md)第58项，不远程操作或发版。本轮PRD构建成功生成25个模块，生成页已核验PRD-0224、新阻塞标题规则及FIG-DETAIL-025，旧009已撤下。截图清单与模块索引JSON有效，新图号唯一、JPEG核验及范围内差异格式检查通过；0221与0223历史保持，本次仅写入本地草稿，未提交远程。


## PRD-0223：PDF原版式阅读与选文标注（2026-10-16）

用户要求PDF能像文档一样直接选中文字提出标注，并将浏览器原生黑色阅读工具栏改为浅色内嵌界面。本项扩展原PDF内嵌及抽取正文路线，复用当前标注浮层、临时意见、编号与原文回定位；绑定固定版本、页码和页内位置。一次支持同页跨行选文，跨页拒绝并提示同页重选；无OCR，不直接编辑原PDF页面或写回批注，不新增评论／持久化体系。已有文本编辑版本仍按其实际正文显示，不能称为修改后的PDF原件。模块11 last_change=PRD-0223，日志及基线同步，产品／模块版本保持。

`TaskPdfViewer.tsx`使用PDF.js画布及透明文字层替代原生PDF iframe，运行库按需加载，worker／字体／字符映射／WASM随本地构建提供；页码、页内快照和UTF-16偏移关联选区，缩放后重算高亮，接入既有选文、局部截图、输入／列表及标记。重复点击同一意见通过focusSequence重新触发来源定位，不只监听意见ID变化。当前v1按原PDF字节统一阅读／标注，已有v>1文本编辑版本仍走其对应文本，避免旧原件覆盖当前版本；没有预先提取previewData的真实PDF也可读取并标注。上述实现术语仅登记在证据层，不成为用户操作要求。

主工作区5173、1280×720当前任务“完成秋季抗老精华首发闭环”实测原版式5页PDF，选择“执行”后填写意见、添加编号与蓝色高亮，原文可定位，缩放74%→85%后仍对应选文；翻到第5页再次点击同一意见来源，正确回到第1页，进入及退出全屏可用。用户原生629×804页签以Shift+Down扩展两行，打开浮层后有两条精确草稿高亮及完整选文截图，无横向溢出；最终keyup监听调整后已重验。这里是精细指针原生窗口，不当作真实触屏／软键盘验收。

独立4173当前构建预览实际上传没有previewData的PDF后可选文并添加编号；扫描夹具经PDF文字检测为0，保留真实图像并显示无可选文字。损坏PDF显示错误和重试，重试仍失败，不生成替代正文，错误状态不显示全屏入口。此类上传／异常是隔离构建预览证据，不冒充5173原任务或正式上传服务；该临时页面及服务已关闭。未验证加密PDF、外部AI发送、生产权限／持久化或跨端共享，不以既有Word／HTML／图片标注保留代码宣称这些链路本轮均重新运行。

四个定向文件共29／29通过；初次直接tsx运行因Node不识别CSS导入失败，使用本轮专用`node-assets.mjs`适配CSS／SVG后通过，未修改共享测试配置。最终keyup修正后应用TypeScript与Vite打包再次通过，结构门无新增例外，既有配置兼容及大包提示保留；未运行整项目标准build、全量测试或双重审查。[本轮记录](../../artifacts/pdf-text-annotations-2026-10-16/README.md)及[结构化结果](../../artifacts/pdf-text-annotations-2026-10-16/validation.json)区分主工作区、原生窄窗口、隔离异常和未验证范围。

FIG-FILES-064～067均来自5173当前实际页面JPEG，前三张1280×720、067为用户原生629×804同页跨行选文浮层；四图由文档代理逐图目视并核实尺寸／MIME，正文使用064阅读器及066已添加意见／编号／高亮，065／067保留清单。历史PDF图继续原失效状态，061～063只保留未改HTML／文件树证据。本地第57项已实现并完成上述必要验证，PR待补；文档代理不改代码／依赖或构建，不远程操作或发版，本轮PRD构建成功生成25个模块，生成页已核验PRD-0223及064／066内嵌JPEG，模块索引／截图清单JSON有效，范围内差异格式检查通过。

## 创建入口移回全局右上角（2026-10-16，非语义）

来源为用户本轮截图及明确要求“创建按钮还是移到右上角吧”。2026-10-13的左侧创建仅为待确认本地试排，正式模块04／06及交互基线第3节仍规定全局顶栏创建。本轮从搜索旁移回右上角、连接AI之前，列表展开或收起时均可使用，属于恢复现行目标及非语义呈现修正，不新增语义变更ID，不修改版本、last_change或历史日志。框内高级筛选与内缩底色继续保留为本地试排，不由本次创建位置决定推定正式采用；当前决定与历史分界见[试排交接](intake/2026-10-13-task-list-entry-layout-preview.md)。

当前代码去除workspace-shell.css中按侧栏可见性隐藏顶栏创建的规则，TaskWorkspaceList移除搜索旁创建按钮，task-workspace-list.css移除专属按钮样式并将搜索布局改为单列；原顶栏创建回调及响应式名称保持。主工作区127.0.0.1:5173的1280×720真实页面确认创建按钮x964.5／y13.5、100×36，位于连接AI左侧，旧列表创建按钮数0，搜索占满列，无Vite错误遮罩且error／warn日志为空；Enter打开同一新建面板并聚焦需求描述。390×844详情及列表均有44×44入口和完整无障碍名称“新建任务”，页面无横向溢出，列表点击进入同一面板；未提交创建。Vite前端打包通过（2.22秒），三个代码文件差异格式检查通过；标准npm run build结构门通过，但整体TypeScript被本次未修改的TaskFileExplorer及server测试类型错误阻断，不记完整build成功，不运行全量测试或双重审查。

已逐图目视，FIG-CREATE-005／006／031～035共七张current-page清楚含旧左侧创建及无顶栏创建，转pending并撤下模块07对应图片与图注；FIG-PREVIEW-029／030复用前两图，同步pending，模块00当前已无对应引用。原文件及局部业务历史保留，不证明当前入口布局。FIG-COLLAB-008已有窄屏顶栏创建且未见侧栏，保留原证据范围；FIG-LIST-006／007及其他已pending图保持。CLI与设置弹窗的模糊背景不作为入口证据，不扩大失效范围。[本轮桌面运行材料](../../artifacts/taskdoor-create-topright-desktop-2026-10-16.png)和[390px列表运行材料](../../artifacts/taskdoor-create-topright-mobile-2026-10-16.png)已逐图目视，保留在artifacts且不新增正式FIG。PRD构建成功生成25个模块，生成页已撤下本次7张旧图，模块索引与截图清单JSON有效，范围内差异格式检查通过；PM demo PR待补，正式项目同步PR待补，已追加本地未提交汇总第56项，不远程issue／PR或发布。

## PRD-0222：文件夹仅收展与文件预览保持（2026-10-16）

用户明确选中文件夹不需要右侧单独目录列表，点击仅展开／收起。本项替代PRD-0220的首次根目录、文件夹卡片／文件列表浏览及目录工具栏范围：文件夹不进入文件选中态，右侧保持当前预览；任务文件标题及路径只说明位置，新建文件夹不切换右侧。普通进入默认树顺序首个未归档文件，无有效文件沿空态，有效明确目标优先、切页签保留文件；删除当前文件后回其他有效文件或空态。窄屏初始展示树，打开文件才进入预览，返回树保留当前文件。

上传／新建默认使用当前预览文件的父目录，无当前文件则根目录；点击、聚焦或收展文件夹不改变默认落点，新建窗口已有目录选择器可明确改选，不新增目录上下文。轻量树、预览／编辑／临时标注、管理菜单及设备宽度偏好保持，任务左列表不在本轮范围。模块11 last_change=PRD-0222，基线及日志同步，产品／模块版本保持。

当前实现已移除`TaskFileDirectory.tsx`及目录卡片／文件表专属样式，Explorer右侧仅为文件预览或无文件空态；Tree的文件夹激活只收展，文件选择不接受目录。默认及回退选择按有效树的深度优先顺序，跳过归档分支与孤立文件，有效明确文件目标优先。默认上传／新建位置从当前文件父目录取得，无文件为根，新建后保留文件选择；这些写入操作未在本轮真实执行。

主工作区`http://127.0.0.1:5173/`、1280×720当前任务“完成秋季抗老精华首发闭环”实测普通进入默认DOCX，打开HTML后整行点击“交付成果”使展开状态false／true，右侧均保持同一HTML，目录组件数为0。用户原生629×804页签普通进入先树，默认DOCX在隐藏预览状态中；文件夹收展不离树，点击HTML进入预览，返回树保留HTML，再点已选HTML可重新打开，document.scrollWidth=629。

并行开发使5173频繁自动刷新，稳定键盘／会话检查改用同一主工作区当前构建的`http://127.0.0.1:4173/`：Enter／Space／ArrowLeft／ArrowRight依次false／true／false／true且同HTML；搜索后可收展匹配祖先并用箭头再展开。编辑中收展和Tab／Enter／Escape菜单操作保持编辑及目录状态，退出无修改编辑后，标注模式收展仍为同HTML和标注模式；退出无标注会话，概览→文件仍保留HTML。此处明确为当前构建预览，不冒充5173实操，不证明真实触屏或含未保存内容的写入／交接。

两条选择回归先失败再通过，三个定向文件共16／16通过，覆盖有效明确目标、树顺序、归档／孤立项、仅目录无文件及删除当前文件不回退为目录；删除是回归检查，未执行真实删除。应用TypeScript、结构门无新增例外及Vite打包通过，保留既有体积提示；未运行整项目标准build、全量测试或双重审查。[本轮记录](../../artifacts/file-tree-toggle-2026-10-16/README.md)与[结构化结果](../../artifacts/file-tree-toggle-2026-10-16/validation.json)留存，不沿用旧默认目录的通过结果。

FIG-FILES-061／062为5173当前1280×720收起／展开文件夹且同HTML的JPEG，063为5173用户原生629×804单栏树；三图由文档代理逐图目视并核实尺寸／MIME，061内嵌正文，062／063保留清单。056／057／058继续superseded，059／060沿并行0221继续pending，原资产与历史保持。本地未提交汇总第55项已实现并完成上述必要验证，PR待补，不远程操作或发版；本轮PRD构建成功生成25个模块，生成页已核验PRD-0222及061嵌入JPEG；模块索引／截图清单JSON与范围内差异格式检查通过。

## PRD-0221：顶层路径、负责人移除与讨论区域已读（2026-10-16）

来源为用户明确要求在当前本地 demo 实施 R11、R12、R10，需求记录见[review 待办](../../artifacts/product-audit/taskdoor-review-todo-2026-10-15.md)。目标正文归模块08的真实任务路径、模块09的人员维护、模块10的讨论区域自动已读；交互基线同步，产品／模块版本保持，不发布版本。

`src/features/tasks/lib/task-detail-path.ts`仅在当前任务与真实父任务的路径匹配时返回真实任务链，过滤合成workspace-root；`TaskDetail.tsx`按结果展示路径，顶层不留空路径行且独立导航控件保留。主工作区5173实际打开顶层“新品发布会筹备”，任务路径nav数0、kicker为display:none且高度0；子任务“定稿发布会主视觉”路径为“新品发布会筹备 / 宣传物料制作 / 定稿发布会主视觉”。不据此扩大为生产ACL或所有长链及窄屏均已实测。

`TaskDetail.tsx`保留人员选择器直接移除、不填写原因，等待同步或异步回调成功后才更新当前负责人；拒绝时保留原值并反馈错误，过期回执不写入新任务。实测发现旧的`src/ai/mock/data/workspaceNodes.ts`读取校验拒绝内置任务的空owner，导致刷新后记录被过滤；本轮修正为空字符串是有效未分配值，`App.tsx`迁移也优先保留显式清空，不被历史提议重新指定。7／7任务直接分配回归通过，覆盖内置任务持久化往返保留、历史提议不覆盖清空、缺失记录不自动复活及其他必要字段校验。实际移除后刷新保持未分配，当前团队76任务完整；随后原负责人林洁已恢复，操作活动保留。此次误过滤的示例仅依据保留种子及可重放的名称／目标活动保守恢复并备份，临时恢复代码已删除；不把该处理包装为通用恢复能力。底层通用本地存储故障回滚、生产权限和服务端人员保存未在本轮实现或运行验收。

`src/features/tasks/discussion/lib/discussion-read.ts`与`TaskDiscussion.tsx`在当前可见、可读面板实际呈现后报告活动ID及读取时点，依内容ID稳定依赖，避免重复回执循环；`TaskDetail.tsx`、`App.tsx`及顶栏传递任务与通知目标。`src/features/notifications/lib/notification-read-state.ts`限定本人／团队／任务／discussion、有效时间及已呈现消息ID，`GlobalNotifications.tsx`仅将本次匹配的通知ID持久化，回执处理即结束，不保存会吞掉后到通知的永久区域水位。没有具体消息目标的同区通知可随进入处理，有目标但未呈现的不清；通知入口直接打开讨论，手动进入同规则，单条／全部已读保留，本地readIds按用户和团队隔离。

主工作区真实页面：初始3未读，仅打开通知面板或任务概览仍为3；点击fragrance-live讨论通知后展示真实讨论，3→2，成员加入及另一任务邀请保持未读。刷新多次仍为2，重复点击当前讨论通知可正常跳转且保持2，无卡顿。仅证明本地示例及当前账号结果，不证明生产投递、跨端同步、服务端加载失败／失权或磁盘故障已端到端验收；这些边界由定向检查及后续正式接入分别处理。六个定向文件40／40与独立回执重渲染稳定性1／1通过，共41项；[定向日志](../../artifacts/product-audit/review-r10-r11-r12-tests-2026-10-16.log)及[稳定性日志](../../artifacts/product-audit/review-r10-r11-r12-stability-2026-10-16.log)留存。应用TypeScript、结构门（无新增违规）与Vite打包通过，既有chunk体积提示保持；未运行整项目标准build、全量测试或双重审查。额外unassignedOwnerInvitation的4条旧文案／邀请域断言未通过，未计入41项通过或扩大修改。完整[验收记录](../../artifacts/product-audit/review-r10-r11-r12-verification-2026-10-16.json)区分页面实测、定向覆盖与未验证生产边界。

新增FIG-DETAIL-022／023／024与FIG-COLLAB-009，均为5173当前页面1280×720真实JPEG，已逐图目视并核实尺寸／MIME；分别展示顶层、真实子路径、移除后未分配和同区阅读后的通知。022／023放模块08，024放模块09，009放模块10。FIG-COLLAB-007保持pending，文件056／057／058被后续PRD-0222转superseded，059／060保持pending，原资产与历史证据保留；FIG-COLLAB-008不含旧路径，继续保留其原局部证据范围。R10／R11／R12完成必要本地验证并勾选，共4／15；正式项目未改，PR待补，只追加本地未提交汇总第54项，不远程操作或发布。

本轮PRD构建成功生成25个模块，生成页包含PRD-0221、新规则及四张当前图号；截图清单／模块索引JSON有效，本次0221日志唯一，待办4／15及本地issue54唯一检查、范围内差异格式检查通过。

## 文件树视觉密度调整（2026-10-16，非语义）

用户对照参考图指出当前文件树占据过多空间，要求改为轻量呈现。本轮仅收紧树行、类型图标、标题、搜索与底部收起入口的视觉密度，保留名称／扩展名辨识和完整名称读取。目录卡片与文件表、默认定位、键盘与菜单、预览／标注业务及宽度偏好契约沿PRD-0220及既有规则；当前已保存的较宽侧栏可经既有调整控件收窄，不重置或改写偏好。正文与交互基线移除“两行”的具体排版约束，属于呈现调整，模块11 last_change=PRD-0220、版本及CHANGELOG历史保持。

`TaskFileTree.tsx`仅去除树名称的multiline呈现类；树样式改为桌面32px单行、16px细线类型图标、白底与浅灰选中，收紧标题／搜索及底部按钮。底部外框仍44px，触屏样式保留44px行与40px操作，不把样式接入当作真机触屏验收。目录卡片／文件表及宽度处理代码未改。

主代理在当前5173实际页面、任务“完成秋季抗老精华首发闭环”完成桌面1280×720验收：文件夹可收起／展开，搜索“执行总览”可过滤后清空；ArrowDown打开PNG并显示2px焦点，Tab进入当前行更多、Enter打开菜单、Escape关闭，随后恢复HTML文件。底部收起后焦点转到展开按钮，再展开仍为同一HTML；现有248px宽度偏好保持。用户现有原生629×804页签进入同任务并返回文件结构，单栏树为32px单行／16px图标，document.scrollWidth=629，无横向溢出；该IAB使用精细指针，不将其称为真实触屏设备。应用TypeScript、结构门和Vite打包通过，保留现有分包体积提示；不据此声明整项目标准build或全部业务链路通过，未运行全量测试或双重审查。

FIG-FILES-058／059为本轮1280×720当前页面JPEG，分别呈现根目录3个文件夹／0文件及“秋季精华首发执行总览.html”预览，两图进入正文；060为用户原生629×804页签的单栏树，保留清单而不重复内嵌。三图由文档代理逐图目视并核实尺寸／MIME。054／055含旧大图标双行树，转superseded并保留原资产；056／057仅展示未改目录，保持原证据范围，056为避免重复展示不再内嵌正文。不沿用下方0220旧视觉及验证结果证明本轮已通过。本轮[验证记录](../../artifacts/file-tree-light-2026-10-16/README.md)与[结构化结果](../../artifacts/file-tree-light-2026-10-16/validation.json)留存；本地未提交汇总第53项更新为已实现、桌面及629px已验，PR待补，不远程操作或发版。本轮PRD构建成功，生成25个模块；生成页已核验058／059嵌入JPEG、PRD-0220保留，截图清单与模块索引JSON及范围内差异格式检查通过。

## PRD-0220：根目录默认浏览与文件夹／文件分组（2026-10-15）

用户明确拒绝PRD-0219完成后仍近似原界面的视觉结果，要求文件区实质重做。本轮已确认：同一任务首次普通进入文件页签先打开根目录，显式通知／活动／附件文件目标仍直达，切换页签保留当前目录或文件；文件夹用独立分组卡片、文件用列表，名称、格式图形、版本与更新时间分层可辨，文件树两行名称配合格式标识。React Aria GridList／Table／Tree属于实现选择，不新增任务管理概念；仅文件区在本轮授权内，任务左列表仍沿原设计。

当前代码已完成：`TaskDetail.tsx`无明确文件目标时初始选择为空；`TaskFileExplorer.tsx`无focusedFileId时使用根目录、窄屏初始也展示目录，保留返回树入口，有focusedFileId时仍打开目标。桌面根目录不渲染空路径工具栏，目录主标题列出真实文件夹／文件数；`TaskFileDirectory.tsx`使用React Aria GridList的grid布局展示文件夹，文件Table仅保留名称、更新时间及更多三列，格式与版本移到名称辅助行。新增`TaskFileGlyph.tsx`按扩展名／MIME显示格式图形，文件树名称两行，当前聚焦行的菜单进入Tab顺序，其余菜单不进入。原预览引擎、标注与菜单业务保留，本轮未改任务左列表。

主代理在当前主工作区`http://127.0.0.1:5173/`的原任务“定稿发布会主视觉”→文件实际验证：用户原生当前629×804页签先显示根目录3个文件夹卡片及1个文件，进入“证据与记录”后显示1个子文件夹及1个文件，页面clientWidth等于scrollWidth；1280×720页面普通首次打开也显示根目录。文件夹更多只打开菜单、目录仍为任务文件；ArrowRight从“交付成果”只移焦到“需求与规则”，Enter才进入，文件Table的Enter可打开PDF；概览→文件仍保留PDF；文件树Tab进入PDF更多且仅1个菜单tabIndex为0。390×700同运行时iframe根目录两列各174px、起点x16／200，无横向溢出；单击“需求与规则”显示PDF v3列表，更新时间列隐藏。

FIG-FILES-054／055为1280×720主工作区current-page，056为用户原生629×804当前页签current-page，057为390×700同运行时iframe current-component；四张JPEG已由主代理及文档代理逐图目视，尺寸与MIME核对为真实JPEG。054与056进入正文，055保留原PDF提取正文预览及新树的呈现证据，不将其说成新增PDF渲染引擎；057不称真机或原生设备模拟。050～053继续superseded并保留原资产，未用旧图覆盖新证据。

本轮重新执行三个定向文件15／15通过，[日志](../../artifacts/react-aria-file-browser-visual-2026-10-15/targeted-tests.log)保留；真实Explorer与zh-CN Provider的[两项静态渲染检查](../../artifacts/react-aria-file-browser-visual-2026-10-15/initial-location-check.log)验证默认根目录与显式文件直达，仅在本次Node渲染略去CSS／SVG资产，未修改公共测试配置。应用TypeScript、[结构门](../../artifacts/react-aria-file-browser-visual-2026-10-15/structure-check.log)及[Vite生产打包](../../artifacts/react-aria-file-browser-visual-2026-10-15/frontend-build.log)通过，无新增结构例外，保留现有大包提示；未重跑此前被既有server测试类型错误阻挡的标准`npm run build`，不声明其本轮通过。未逐一运行真实通知／活动／附件入口、上传、移动、删除、标注发布、AI交接或真机触屏／软键盘，不将源代码保留、静态渲染或局部导航扩大为端到端已验收。

模块11的last_change为PRD-0220，产品及模块版本保持；交互基线、实现矩阵、截图清单及本地未提交汇总第52项同步。PM demo和正式项目PR待补，不远程issue／PR、不发版；PRD构建由主代理最后统一执行并补录结果。

## PRD-0219：文件目录与树的键盘操作及入口收敛（2026-10-15）

用户在文件预览／标注及列表框架选型后明确授权用React Aria改造当前文件列表。本次已确认的产品规则归模块11的3.1：目录整行打开、键盘激活、菜单操作与打开隔离，文件树键盘移动焦点及展开／收起层级，文件名缩略保留扩展名；目录当前位置由面包屑说明，同名目录标题只保留无障碍语义；桌面浏览目录仅保留目录工具栏的一组上传／新建入口，空目录复用，文件预览时侧栏保留两项入口，窄屏树侧栏始终保留两项入口以确保可达。React Aria受控树与Table是实现选择，不写成新增业务能力。

主工作区已接入`react-aria-components`的受控Tree与Table：`TaskFileTree.tsx`维护展开和当前选择，键盘由React Aria处理，公开`onPress`补足指针再次打开已选项；`TaskFileDirectory.tsx`使用行操作回调；`TaskFileNodeMenu`继续复用BaseUI菜单并隔离指针与键盘事件。新增`TaskFileName.tsx`将主体与扩展名分开呈现；`TaskFileExplorer.tsx`按桌面／窄屏及目录／文件状态显示创建入口，`task-file-list.css`由既有编辑样式入口导入。上传、重命名／移动／删除、预览及临时标注继续沿原业务处理，不新增独立文件评论系统。

主代理在主工作区当前`http://127.0.0.1:5173/`、任务“定稿发布会主视觉”→文件实际核验：桌面1280×720下树行40px／文字13px、目录行48px；5个文件的.md／.pdf／.docx扩展名完整且有非零宽度。桌面根目录上传与新建各1处，文件预览侧栏各1处。点击“需求与规则”的更新时间“2天前”打开该目录；目录ArrowDown只移动焦点，Enter打开；树ArrowLeft折叠后8行、ArrowRight展开后9行，ArrowDown选中并打开PDF。Tab进入更多后Enter打开菜单而位置路径不变，目录更多菜单的重命名对话可实际打开。搜索“核对”保留匹配docx／md及祖先“证据与记录”，侧栏可收起并恢复。

空目录用应用JSX配置与zh-CN I18nProvider渲染真实`TaskFileDirectory`的空files状态，静态HTML统计上传1处、新建1处且含“暂无文件”，检查通过；`TaskFileExplorer`空树no-results分支已删除额外上传按钮，保留说明与搜索清除入口，按源码核对登记。整个空任务Explorer的辅助Node渲染因既有资产／JSX及默认locale配置未形成有效证据，不作为空任务浏览器已实测结论。

窄屏证据来自同一当前运行时、`http://127.0.0.1:5173/artifacts/react-aria-file-list-2026-10-15/mobile.html`中的390×700 iframe，不是原生设备模拟或真机。返回树后，390px iframe内单击已选PDF可重新打开；页面clientWidth与scrollWidth均390，目录表宽366，更新时间列实际隐藏为0宽，树标题单行。FIG-FILES-050／051为桌面current-page，052／053为该iframe的current-component，四张JPEG由主代理及文档代理逐图目视；正文内嵌050／051，窄屏图保留布局证据。图片只证明对应静态呈现，键盘与菜单以本轮实际操作记录为据，不证明真实手机触屏／手势、软键盘或生产服务；onPress接入触摸事件不等同真机验收。

三个定向文件`taskFileTree`、`fileSidebarState`、`taskFileActionOptions`共15／15通过；结构门通过，末次应用`tsc -p tsconfig.app.json --noEmit`与`vite build`复跑通过，现有大包提示保留，[前端构建日志](../../artifacts/react-aria-file-list-2026-10-15/frontend-build.log)记录本轮结果。标准`npm run build`仍被现有server测试类型错误阻断，未扩修或计通过；未运行全量测试或双重审查。本轮未重新执行真实上传、移动、删除、标注发布或本地AI交接，不用代码保留或局部导航验证替代这些链路的完整运行验收。

模块11的`last_change`为PRD-0219，产品及模块版本保持；FIG-FILES-001保持pending及原资产，不将旧整页图恢复为当前证据。实现矩阵及10月15日本地未提交汇总第51项同步；PM demo与正式项目PR待补，不创建远程issue、不发布版本，PRD构建由主代理最后统一执行，结果待补。

## PRD-0218：讨论就地回复与独立草稿切换（2026-10-15）

用户在今日review中补充回复框应跟随内容、底部固定框可隐藏，并在收到R14具体方案后明确要求“设计更新在我本地的demo”。该直接授权确认本地实施范围：普通发言仍停靠底部，回复在对应消息正文与操作下方展开唯一编辑器并聚焦，回复时隐藏底部输入及占位；取消、切换、成功、失败和目标失效按模块10维护的独立草稿规则处理。此项仅替代PRD-0201及基线4.3／4.5中发布与回复共用底部输入的回复范围，消息倒序平铺、详情整体滚动、唯一讨论区与已有权限及附件／@规则保持。

模块08维护输入布局、可读空间与响应式规则，模块10维护草稿隔离、取消焦点、发送结果与失效边界，两处last_change为PRD-0218，产品与模块版本保持。主任务`TaskDiscussion.tsx`与`TaskDiscussionMessage.tsx`接入唯一行内回复，复用`DiscussionComposer.tsx`按draftKey保存的会话及既有附件／提及；草稿键直接来自所选消息ID，原消息删除或消失不回退为new。相关输入样式与可视区域响应同步。通用`DiscussionMessages.tsx`旧路径不作为主任务完成证据，0201固定底部回复的历史通过结论不沿用。

主工作区当前`http://127.0.0.1:5173/`、原有用户任务`ccx-serum-launch`实际运行：就地输入1处、底部普通输入0处，展开后焦点为contenteditable；A→B→A各自正文恢复，A的1个附件和1个真实@节点经切换及概览→讨论保持；取消后恢复普通草稿、焦点回原reply按钮。390×844长35行输入的clientHeight208／scrollHeight906、overflowY=auto，发送按钮y755～799位于844px视口内，无横向溢出。所有验证草稿和临时引用已用真实键盘清空，未发送测试消息。真实手机软键盘未实机验证；代码监听visualViewport resize不等于真机验收。

最终`discussionComposer`、`discussionDraftInsertion`及`taskDiscussionFeedInteraction`三个定向文件30／30通过，包含富文本Lexical会话成功清空、同步／异步失败保留、@及附件、重复提交、行内位置、唯一输入、回复ID、草稿作用域、取消及原目标删除／消失后不降级，日志见[本轮定向结果](../../artifacts/product-audit/inline-reply-2026-10-15-tests.log)。使用仅本次命令级的CSS／SVG忽略loader解决Node harness加载既有附件预览CSS的问题，未改公共测试配置；早期17项通过及追加回归中CSS加载失败保留为过程，不作为当前功能失败。额外`taskDiscussionWiring`的活动入口旧class断言仍与当前实现不符，未扩修或计通过。应用类型`tsc -p tsconfig.app.json`、结构门与Vite生产打包通过；整项目`tsc -b`仍受server测试类型错误阻断，不声明完整`npm run build`通过。未运行全量测试或双重审查，未把定向模拟发布或本地页面结果写成正式服务、跨端权限或真实消息保存验收。

FIG-COLLAB-007／008来自上述主工作区当前完整页面，分别为1440×722／390×844真实JPEG，根代理与文档代理逐图目视确认原文下唯一回复框、底部无重复及发送可达；007用于模块10正文，008保留窄屏布局证据。FIG-COLLAB-001／004／006、FIG-DETAIL-003及FIG-PREVIEW-012原已pending，追加本轮失效范围并保留旧资产；其他通知、活动及文件标注局部图保持。用户示意图不作为实现证据。

运行与验证汇总见[本轮证据](../../artifacts/product-audit/inline-reply-verification-2026-10-15.json)。R14按本地demo完成必要验证登记，本地待提交汇总追加；正式项目未改，PM demo与正式项目PR待补，不操作远程issue或发布版本。PRD成功构建25模块，生成页含PRD-0218、就地回复规则与FIG-COLLAB-007；本次日志编号唯一、模块索引与截图清单JSON、两张本地图及相关格式检查通过。

## PRD-0217：真实目标与完成标准独立生成规范（2026-10-15）

用户明确本轮资料主要服务任务拆解、目标和标准，目标须表达真实目的，不能是标题换称；要求在Skill中单独详细规范。基于该直接决定，新建`goal-and-criteria.md`集中维护字段分工、目的依据与未知处理、目标语义检查、标准充分性及适用范围、业务效果与可控交付、父子贡献和正反例。当前`task-preview.md`中四处“交付某资料”的目标示例已改成相应的使用价值；标题及产物清单仍由各自字段承担。

本地入口为`TASK-PREVIEW-2026-10-15-v14`，`management-playbook.md`收拢到直接相关方法，旧12类来源表从运行清单移出并保留归档，独立目标规范纳入当前7文件包。运行资料不再承载团队心理安全、制造现场、组织吞吐量等宽泛管理知识；既有日期、成员ID、按意图拆解及只生成预览的边界保留。旧v13独立包和验证记录保留为当时材料，不视为当前v14效果证据。

本次不改创建界面、业务Schema、真实模型服务或正式项目；无新截图，不用旧截图证明新语义已在页面生效。定向样例、包与文档检查见[本轮记录](../../artifacts/product-audit/task-planner-goals-2026-10-15/report.md)。模块07、基线、实现矩阵及本地待提交汇总同步，产品／模块版本保持，PR待补，不操作远程issue或发布版本。

## PRD-0216：保留文本旧版本恢复为编辑草稿（2026-10-15）

用户明确确认“这个恢复可以保留”，指任务详情→文件→文本文件版本记录中，选中非当前版本后使用“恢复此版本”。本轮将其记录为已确认保留，不再列为待拍板。模块11的3.2及功能验收同步：只将旧正文生成新编辑草稿，核对保存后按普通编辑规则形成新版本；历史记录和正式固定引用保持，已有未保存修改先处理，失败不覆盖原内容。范围限可编辑文本，不扩到图片、PDF或已删除文件恢复；模块last_change更新为PRD-0216，产品与模块版本保持。

正式项目源码证据已按`sand`提交`7b5439a42bd288a1a90852656b00444dd7ef3298`本地读取核对：`apps/web/src/features/tasks/files/components/TaskFileHistory.tsx`仅在有恢复能力且选中非当前版本时显示右侧历史栏底部入口；`TaskFileExplorer.tsx`仅在`edit && showsText(selected)`时提供`onRestore`，`restoreOlder`阻止覆盖已有本人草稿，将返回草稿放入编辑器，并提示保存后成为新版本；`apps/web/src/features/tasks/files/source.ts`的`edit.restore`调用`restoreVersion`并读取草稿正文，返回`ServerDraft`。同名隔离工作树`/Users/yxzuji/.codex/worktrees/taskdoor-localized-date-time`中的相关实现与这一流程一致。上述为源码存在证据，本轮没有运行正式恢复／保存链路验收，不据此宣称线上可用性已验收。

PM demo的`TaskFileHistory.tsx`与`TaskFileExplorer.tsx`没有该恢复入口与回调，本轮不新增按钮、后端或接入，只同步最终产品决定和实现边界。没有采集截图或发布版本，既有截图状态保持；本地待提交汇总由主代理同步，不操作远程issue。

## PRD-0215：管理知识提炼与有条件的截止建议（2026-10-15）

用户在今日 review 后明确要求先提炼 OKR 与企业高效管理资料并写入生成 Skill。以作者、官方机构与出版社的一手公开资料整理12类来源、60条带适用边界的规则，来源及未核实范围见[知识来源](../../skills/agentdoor-task-planner/references/management-sources.md)；不声称读过付费全书，不把管理案例或营销比例作为用户事实。《高产出管理》本轮只核验书目介绍，Grove部分规则来自Intel保存的作者1998年演讲，未用二手摘要充作原书阅读证据。

`agentdoor-task-planner`本地入口更新为`TASK-PREVIEW-2026-10-15-v13`，新增`management-playbook.md`、`management-sources.md`与`task-scheduling.md`；生产文件清单纳入三个引用，使本地加载及冻结快照能够带上规则。预览协议仍为`taskdoor.task-preview.v1`，Schema未扩字段。日期候选使用现有`dueDate`，`warnings`说明对应任务和假设；未给日期的有限任务可有建议，持续、无自然结束点或关键等待未知时留空，保留人工日期、清空与已有编辑。

此项替代旧Skill未给日期一律留空的规则，目标产品规则同步模块07与交互基线。只修改本地规则与资料，不改创建页面、模型服务、正式项目或已保存历史快照，不自动发布Skill／产品版本。当前PM demo的精确案例Mock不因此获得通用规划能力；日期来源展示与正式保存仍待应用接入核验。本轮没有页面变动或新截图，原创建截图仅保留原展示证据，不证明新规则的真实模型效果。

定向行为基线和后续验证记录在[提炼与验证记录](../../artifacts/product-audit/task-planner-management-2026-10-15/report.md)，以该记录的实际结果为准，不沿用历史全量评测结论。本地待提交汇总追加，PM demo与正式项目PR待补，不操作远程issue。

## PRD-0214：日期时间格式跟随界面语言（2026-10-15）

用户指出中文版截止日期仍使用英文格式，明确要求同时全局检查PM demo与`nocoly/taskdoor`正式项目。本轮以该决定替代PRD-0142／0146中「中英文绝对格式相同」的约束：中文使用中文月日与24小时制，英文保留月份缩写与AM/PM；同年／跨年、完整提示、日历日期、时间点、相对切换及不完整历史信息的既有语义保持，界面语言不决定时区，也不改写协议、保存值或排序。下方旧格式及旧通过记录仅保留当时历史，不证明本轮语言格式已通过。

模块02为唯一规则归属，`last_change`更新为PRD-0214，交互基线同步引用；产品及模块版本保持。PM demo的`src/shared/lib/date-time.ts`及`src/shared/i18n/core.ts`按locale生成日期、时刻、月份、相对时间与完整提示；38个展示或辅助源码文件的104个`formatDisplay`调用均显式传递当前locale。旧英文日期文案可切回中文，缺少年份时不补造年份；纯日历值保持原日，时间点保持原始值。任务、创建、讨论、通知、活动、文件、图表、筛选、设置及测试工作台共用该入口，协议、排序与业务原文保持。

主工作区`http://127.0.0.1:5180/`实际通过语言菜单切换中英文：截止日由`9月15日`变为`Sep 15`，完整提示含2026；日历标题由`2026年9月`变为`Sep 2026`；讨论与活动由`9月14日 17:30`变为`Sep 14, 5:30 PM`，通知和完整时间提示同步切换。两语的`dateTime`值一致，页面错误为空。桌面1440及390px窄屏画面经主代理目视核验；文件与分析面板本场景没有时间节点，不据此声明这两处已逐项运行验收。记录与两语截图见[浏览器验证](../../artifacts/date-localization-2026-10-15/browser-verification.json)及同目录资产。

正式项目在最新`sand`基线的隔离工作树`/Users/yxzuji/.codex/worktrees/taskdoor-localized-date-time`完成语言格式修复，原正式项目检出未改动。交付为[Draft PR #53](https://github.com/nocoly/taskdoor/pull/53)，base=`sand`、head=`codex/localized-date-time`，提交`d47c621043854c97516d8221f23fcb13c18ad730`；主代理核验PR为OPEN、Draft且head提交一致。12个定向测试文件107项、TypeScript、改动范围ESLint／Prettier、Vite生产构建及`validate_all`通过。PR尚未合并或部署，PM demo运行画面不替代正式项目运行验收。

截图逐项按可见时间核对：FIG-FILES-044中文界面仍显示`Oct 20`及`Oct 15, 4:01 PM`，恢复pending并撤下文件模块正文；已pending的FIG-COLLAB-004追加同轮语言格式失效原因，不恢复历史资产。创建031～035没有绝对日期，职责图只有「刚刚」，成员图没有日期，不扩大失效范围；其余既有pending／superseded状态保持。上述浏览器验证资产保留为本轮运行证据，不冒充这两张失效图的重采或恢复。

**本轮验证状态：** 共享日期9项、i18n7项、讨论日期2项及界面定向48项，共66项日期相关检查通过；部分既有组件测试通过临时globalReact／CSS加载器执行，未更改项目测试配置。应用TypeScript、结构门与Vite生产打包通过；整项目`tsc -b`仍被既有server测试类型错误阻断，不声明`npm run build`整体通过。PRD成功生成25模块，生成页包含0214及两语格式，失效044已撤出；日志编号唯一，模块索引／截图JSON及本轮定向格式检查通过。未运行全量测试、双重审查或版本发布。

## PRD-0213：文件区移除网站能力（2026-10-15）

用户明确要求去掉“文件”里的上传／添加网站与预览网站，并允许删除相关专用实现。本轮以该决定替代PRD-0203／0207的网站能力范围；下方网站章节、截图采集及运行验证记录仅保留当时历史，不再证明当前产品支持网站。

`TaskFileDialogs.tsx`、`TaskFileExplorer.tsx`及`TaskFileViewer.tsx`已移除网站创建表单、入口、提交回调、专用预览与相关定位分支，`TaskWebsitePreview.tsx`及专用样式退役；普通本地文件上传、文件版本、静态HTML预览、文字／图片／HTML标注和讨论／AI材料继续使用各自既有流程。`task-file-website.ts`、`capture-task-website.ts`和专用网站测试已删除，预览类型、上传解析、标注元数据、报告／修订包专用分支及16条无用文案完成清理；网址附件回退为普通文件，不再启动网站浏览。未用历史0203／0207的通过结果代替本轮验证。

模块11更新操作元数据、流程与功能验收，last_change为PRD-0213，交互基线同步撤下在线网站规则；产品与模块版本保持。FIG-FILES-047撤出正文并转superseded，035～037原superseded及历史资产保留；其余截图不扩大证据范围。只追加仍未提交的10月15日本地汇总第44项，PM demo与正式项目PR待补，不操作远程issue或发布版本。

**本轮验证状态：** 9个定向文件共50项通过，覆盖文件类型／图标、上传落点、整理、全屏下载、PDF选区及通用标注／报告／修订包。组件测试使用应用JSX配置及临时样式／图片加载器，未修改项目测试配置。应用TypeScript、结构门与Vite生产打包通过；项目级`npm run build`仍被其他server测试文件类型错误阻断，未计通过。PRD成功生成25模块，生成页含0213且文件模块无网站能力，模块索引及截图JSON、相关差异格式通过；网站功能代码无残余引用，未运行全量测试或双重审查。

## 子任务标题文案精简（2026-10-15，非语义）

`TaskCreationPlanEditor.tsx`移除普通子任务标题旁的“共同完成主任务目标”，保留标题和实际数量；多层方案既有层级提示沿原逻辑。只调整显示文案，不改变任务目标、归属、标注、展开编辑或创建流程。5180当前1440×960页面DOM标题为“子任务2”，创建页不包含被移除文案；标注列表／历史、主／子任务标注输入可打开，控制台warning／error为空。

FIG-CREATE-031～035按同名当前JPEG重采并逐图目视。本轮不新增测试或运行全量测试、双重审查；属于非语义文案修正，无新增PRD编号，模块07 last_change=PRD-0212与版本保持。PRD构建成功生成25模块，5张当前图片已内嵌，模块索引解析及本轮格式检查通过，本地未提交汇总追加，PR待补。

## PRD-0212：创建审阅移除手动添加子任务（2026-10-15）

`TaskCreationPlanEditor.tsx`移除有子任务列表时的手动添加按钮，以及列表为空时的手动新增入口，并清理对应的Plus／newCreationTask导入。AI继续拆解、已有任务卡、展开字段编辑、标注、移除与统一确认保持；本轮不改未接入当前Page的历史探索组件。列表为空入口按删除的渲染分支核验，不将其写成已执行浏览器空列表用例。

应用TypeScript及结构门通过。5180进程cwd核实为主工作区，技术检查确认当前服务模块已无addSubtask／newCreationTask。旧验证草案页面未热更新，清理本代理生成的未提交演示草案后重新加载当前代码，再实际生成主任务并AI拆解为2项子任务：创建页手动添加按钮数量0，子任务2项保留；展开后目标可编辑、移除入口存在，标注及连续标注保持侧栏。实际发送2条标注生成两处目标候选，未应用或创建，控制台warning／error为空。没有新增镜像源码测试，未运行全量测试或双重审查。

FIG-CREATE-031～035从本轮当前1440×960页面按同名JPEG重采并逐图目视，均不再显示已移除入口，旧资产不作为当前界面证据。模块07 last_change为PRD-0212，模块／产品版本保持；本地未提交汇总追加，PR待补，不操作远程issue。PRD构建成功生成25模块，生成页包含0212及5张当前无手动新增入口的截图，模块索引解析、编号唯一性及本轮格式检查通过。

## PRD-0211：AI概括标注修改主题（2026-10-15）

用户指出截短选文仍不是标题，要求独立概括、便于浏览。`task-file-annotation-titles.ts` 只将标注ID、选文、原意见、位置与类型交给标题接口，校验对应关系、完整性、字数并拒绝选文摘抄或截断。`server/annotationTitles.ts` 复用现有PPIO模型调用，提示生成修改动作与对象、保留原始材料且不执行其中指令；本机同源POST、JSON、请求大小、单请求和超时受控，服务端读取现有配置，未更改Key、模型配置或测试工作台状态。Vite注册开发／预览接口；本期是本地服务链路，正式项目仍需接入其模型服务。

Explorer仅在用户准备讨论附件或AI材料时生成标题，无后台自动外传。等待期间防重复，失败保留意见供重试；同批内容复用同一HTML快照，修改／未确认输入或退出后取消旧请求，不将迟到结果交接。文件生成器接收独立标题，缺失时使用中性“内容修订”，不再摘选文、文件名或DOM标签；实际UI在成功得到摘要前不准备附件。原文折叠、位置、原始意见及固定来源继续保留。

4个定向文件21／21通过；应用类型、标题服务及测试的限定类型、结构门、当前组件生产构建通过。项目级node类型检查仍受其他既有服务／测试错误阻断，本轮未扩修或记为通过。隔离浏览器使用明确受控的本地API响应，核验生成摘要替换标题、原文保留且折叠、失败无附件且标注保持、重试成功、同批复用、等待防重复、退出取消、390px不溢出，pageerror=[]。浏览器受控响应不是实际AI生成质量证据；[本轮记录](../../artifacts/product-audit/annotation-summary-title-verification-2026-10-15.json)记录modelCalls=0，未发布讨论、启动本地客户端或运行全量测试／双重审查。

实际PPIO模型验证被自动审批拒绝：示例选文及意见可能属于敏感文件内容，尚无向该模型目的地发送具体载荷的明确授权。没有重试或绕过，真实模型效果及延迟待用户批准后验证，不能写为已通过。旧FIG048／049仍呈现原文片段标题，恢复pending并撤正文；受控UI截图只作本地排查，不作为真实模型效果的正式截图。模块11、基线4.6、唯一日志0211、矩阵及未提交汇总同步，产品／模块版本保持。

0211收尾：正式PRD成功生成25模块，生成页含0211及AI概括主题规则；唯一日志、模块索引／截图JSON和本轮格式检查通过。隔离浏览器关闭、临时根目录夹具已清理；真实模型验证仍等待外传授权。

## PRD-0210：标注原文按需展开与短标题（2026-10-15）

用户确认有截图时减少完整选文的重复铺陈，仍保留可查看、复制及供本地AI读取的原文；无截图直接展示。当前 `task-file-annotation-document.ts` 用原生details／summary默认收起有截图条目的原文，没有截图时沿普通文字块显示。标题取所选文字首个短片段并按语言截短，不调用AI编造摘要；完整选文、位置及意见仍写入同一个HTML，转义和换行保持。讨论和AI沿既有共享生成器，旧已生成／发布附件不改写，未新增全文来源展开或自动保存。

3个定向文件17／17检查通过，新增有图折叠／无图直显、标题、转义、完整文本及中英文检查先失败后通过；应用类型和结构门通过。隔离浏览器以当前生成器实际输出置于空sandbox iframe验证：默认收起、点击展开、Enter收起、Space展开、可选取完整原文复制、无图选文直接可见、中英文入口、390px无横向溢出，pageerror=[]。源PNG由受控段落真实截图生成，未注入图片占位；[本轮记录](../../artifacts/product-audit/annotation-original-disclosure-verification-2026-10-15.json)。复制只验证可完整选择，未申请系统剪贴板权限；未发布讨论或启动AI，不声称客户端已读取。未运行全量测试或双重审查。

FIG-FILES-048／049按同名资产重采并由主代理逐图检查，分别为1440×960和390×844的current-component报告；048入正文，049仅窄屏证据。不是完整任务或已发布附件页，047网站、044讨论草稿及其他截图范围保持。模块11、基线4.6、唯一日志0210、矩阵、截图清单及本地待提交汇总同步，产品和模块版本保持。

0210收尾：PRD成功生成25模块，生成页含0210、查看原文和FIG048；唯一日志、模块索引／截图JSON、当前图文件及相关格式检查通过。隔离浏览器已关闭，验证源文件仅位于临时目录，未改变现有预览服务。

## 创建标注按钮数量角标（2026-10-15，纯视觉）

主任务、子任务及AI帮你改按钮的数量移至右上角绝对定位的蓝色小角标；零数量不显示，真实数量和原按钮语义保持。卡片按钮不再由有标注样式改为自动宽度，桌面0／1数量均28×28px，AI按钮为94.02px且数量不占行内布局；角标不截获指针操作。只修改两处CSS，不改变收集、继续标注、统一发送、手动收起或应用流程，不新增测试、全量测试或双重审查。

当前主工作区5180桌面1440×960页面实际核验角标position=absolute，主／子任务按钮宽度一致、标注输入／侧栏／列表可打开，连续编辑保留侧栏，控制台warning／error为空。发送时已有演示补充文字不符合当前Mock格式，保留原内容并给出格式提示；清空该演示补充输入后生成两处目标候选，未应用或创建。此记录不证明真实模型。FIG-CREATE-031～035按同名资产重采为当前1440×960 JPEG并逐图目视，035呈现继续编辑已有标注。

本轮为纯视觉修正，不新增PRD编号，模块07 last_change=PRD-0209及版本保持；当前PRD构建成功生成25模块，生成页内5张角标截图已同步，模块索引解析及本轮格式检查通过。本地未提交汇总追加，PR待补，不操作远程issue。

## PRD-0209：连续标注保持创建对话展开（2026-10-15）

`TaskCreationPage.tsx`移除打开标注时自动关闭对话的状态更新；保持卡片锚点，窄屏编辑已收集项时以可见数量入口为锚点。`TaskAiAdjustmentPopover.tsx`的列表继续标注只返回可见卡片或对话输入焦点，不再调用dismiss。右侧对话及输入保持，手动收起及退出／重置会话原有生命周期保持，关闭标注输入只关闭输入。

新增定向回归先复现继续标注触发onOpenChange(false)，修复后创建标注UI12／12通过；应用TypeScript与结构门通过。主工作区5180实际页面验证：保存首条后1条标注、1轮；1440×960继续填写子任务时侧栏仍在，保存后2条且仍1轮，补充输入保持，列表编辑／继续标注均不收起。672×720窄屏列表继续与编辑保持侧栏，可见锚点及输入焦点正确；桌面手动收起后重开保留2条与输入。目标原文未改变，没有发送调整、应用候选或创建任务。相关控制台warning／error为空。

FIG-CREATE-035从当前页面采集真实1440×960 JPEG并目视核验，呈现继续填写子任务与已展开对话；此前031～034沿原静态呈现范围保留，不用静态图证明全部流程。仅新增这一状态证据及本地未提交汇总，版本保持，PR待补；不使用子代理、不运行全量测试或双重审查。PRD构建成功生成25模块，生成页包含0209及035当前截图，模块索引及本轮格式检查通过。

## PRD-0207／0208：独立网站截取与精简标注文件（2026-10-15）

用户报告实际网址不能嵌入，并明确选择“支持任意网站：改走独立浏览器打开并标注的方案”。实际GET `https://sand.taskdoor.com/` 返回200，同时设置 `X-Frame-Options: DENY` 与 `frame-ancestors 'none'`；这会阻止iframe展示，并非文件内容为空。依据：[MDN X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)、[MDN getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)。没有更改源站或正式项目配置，不通过代理剥离安全响应头。

`TaskWebsitePreview.tsx` 改为独立标签页入口，`capture-task-website.ts` 通过真实getDisplayMedia明确选择外部浏览器标签页后读取单帧；排除屏幕／窗口，及时停止全部轨道，支持取消／失败和上传截图回退。`task-file-website.ts`、`task-file-annotations.ts` 保留external-tab来源，过滤不适合展示的内部流标识，并明确API不返回所选URL，须用户核对。已有固定画面、区域标注、定位及临时会话沿原规则，不声称能标注受保护画面、自动识别URL、登录任意网站或保存整站。

用户另要求移除报告的“来源与固定版本内容”、将文件名版本置于公共区域、条目按选文命名。`task-file-annotation-document.ts` 已复用同一生成器：单源公共标题，多源按文件／版本分组；每条为选文首行标题、位置、局部截图、完整选文、意见。无选文用位置，长标题截短，正文保留换行并转义；原锚点及修订包材料保持，旧已生成HTML不改写，正文与本地AI均使用新格式。

[本轮验证](../../artifacts/product-audit/website-external-report-verification-2026-10-15.json)：3个定向文件16／16检查通过，应用类型、结构门及当前组件生产构建通过。隔离Chrome打开真实网站公开登录页、原生截取1440×872画面并生成区域意见文件；同一MD v3两条文字标注验证公共来源只出现一次、选文标题、2张实际局部截图、无details，390px报告无横向溢出，pageerror=[]。测试选择器自动选外部标签页，未替换截图API；未登录网站、发布讨论、启动外部AI或证明正式共享权限。初次QA的localStorage注入误在sandbox报告iframe运行，限制顶层后复验通过，未放宽产品沙箱。未运行全量测试或双重审查。

新FIG-FILES-047／048／049为当前源码隔离组件及其报告实际PNG，主代理逐图目视，047／048入正文，049作窄屏布局证据；不冒充完整任务页、线上存储或真实手机系统权限。035～037旧嵌入图与045旧报告转superseded，043／046旧AI样式恢复pending；044普通草稿和015确认保留原局部范围。模块11、交互基线4.6、唯一日志0207／0208与本地待提交汇总同步，产品／模块版本保持。

## 标注工具条 AI 按钮同款样式（非语义，2026-10-15）

按最新截图，底部按钮复用任务标题同一个 `AiConnectionButton`。`task-file-annotations.css` 移除专用白底／边框覆盖，并将工具条通用按钮选择器限定直接子项，避免污染嵌套AI主按钮与下拉按钮。隔离浏览器以相同props比较共享组件与工具条的背景、圆角、边框、阴影、按钮尺寸、图标及分隔线，全部一致；不改变连接、默认工具、菜单或禁用条件。纯视觉修正不新增语义ID，随本轮PRD重新构建。


收尾：正式PRD已成功生成25模块；生成页含0207／0208、FIG047／048及公共来源与独立网站流程，唯一日志、索引／截图清单JSON、当前图文件和相关格式检查通过。隔离浏览器已关闭，临时QA源文件已清理，用户现有5173服务保持。

## PRD-0206：工具条叉号结束并清空本次标注（2026-10-15）

用户指明标注工具条最右叉号，要求关闭后清空。`TaskFileExplorer.tsx` 的退出按钮改为调用既有annotationExit.discard：清除本批跨文件review、未确认输入、列表编辑、来源／选区／当前标记及交接签名，关闭AI预览并复位拖动位置；网站固定画面通过预览序列重置。没有标注时不挂载列表，避免上批未确认编辑保留在列表内部。仅关闭列表继续沿原收起行为，原文件、已准备的独立讨论附件及已发布材料不经过删除流程；没有新增自动保存或二次确认。

主工作区当前源码的Vite静态构建隔离组件实测：MD文字及PNG区域两条跨文件标注，列表关闭保留；先准备讨论附件，再编辑意见未确认、叉掉工具条，全部标记及pending清除。重新开启计数0、列表禁用；重新创建、叉掉未添加输入后再次选区输入为空，仍能新增标注。清空后的beforeunload不preventDefault，原两文件与已准备附件HTML逐字保持，pageerror=[]。验证记录为 `artifacts/product-audit/annotation-close-clear-verification-2026-10-15.json`。初次断言把退出动画中短暂保留的浮层DOM计为失败，等待浮层隐藏后复验真实输入及pending通过，不将该首次检查记通过。

应用TypeScript及当前组件生产构建通过；本轮未运行全量测试、双重审查或完整项目构建，也未调用外部AI或发布讨论。图片形态未变，现有043／045只证明静态工具条，退出清空由本轮运行记录证明；不以静态截图或历史验证代替行为证据。网站复位及真实已发布讨论保持为代码路径核对，本轮浏览器实测范围是文本／图片及已准备讨论附件，不扩展成全部浏览器、文件格式或正式服务权限证明。

模块11、基线4.6、唯一日志0206、实现矩阵、截图清单说明与仍未提交本地issue同步，PR待补，不操作远程issue，不发布版本。


收尾：正式PRD成功生成25模块，阅读页包含0206和叉号清空规则，模块索引／截图清单JSON、0206唯一性及格式检查通过。隔离浏览器关闭，临时QA源文件清理，用户5173服务保持。

## 文件操作菜单精简（非语义，2026-10-15）

按用户截图要求，`TaskFileTree.tsx` 的共享 `TaskFileNodeMenu` 将重命名、移动到及删除放在同组，移除删除前分割线；文件和文件夹的菜单文案统一为“删除”，复用已有中英文词条。主工作区5173实际页面打开文件菜单，三项文案正确，DOM中分割线为0；结构门及本轮源码格式检查通过。本轮只调整呈现与措辞，不新增PRD变更ID、不改模块11正文、last_change或版本；现有局部截图范围保持。

## PRD-0205：标注讨论附件与同文件 AI 交接（2026-10-15）

用户明确授权将标注工具条收敛为发送到讨论区与连接AI：没有独立生成文件／保存目录，发送到讨论区从本次本人已确认标注生成临时文件，只加入讨论草稿附件，使用普通上传附件样式；原正文和附件保持，不自动追加意见摘要。明确发布成功后，标注文件仅随讨论保存并可回读，不进入任务文件列表或文件数量；附件可预览／移除，失败保留。连接AI以同一格式的标注文件作为材料，文件准备与实际传递结果分别反馈，不把复制提示词或打开客户端视为已经传文件。

`TaskFileExplorer.tsx` 去掉独立生成与目录保存，使用同一annotationMaterial HTML供发送到讨论区和AI连接。`createFileAnnotationDiscussionDraft` 产生空正文及带attachmentOnly标识的附件，草稿复用普通FileCard，已发布消息复用普通附件入口，不覆盖原主草稿、回复草稿或上传附件。`TaskDetail.tsx` 区分allFiles与公开getTaskFiles，`DiscussionAttachmentPreview.tsx` 专门预览及下载；snapshot.files保留专用材料，文件树替换时保护该材料，持久化后可回读，任务文件列表及数量过滤讨论专属附件。普通任务文件及旧消息不删除。

AI前端的prepareLocalAgentFile调用本机 `POST /api/local-agents/handoff`；`server/localAgentHandoff.ts` 生成0600权限的真实HTML临时文件，不接受用户指定输出路径。AiConnectionDialog先准备文件，再复制短路径提示，最后尝试打开工具。Codex／Claude Code用短路径提示，Cursor使用本地file URI，WorkBuddy明确要求粘贴或手工附加；只打开预览不准备文件，不将完整HTML塞入启动URL，也不宣称自动附加或客户端读取成功。

根代理本轮两组目标检查34＋70共104／104通过，范围含标注文件、文件数量、附件放置、草稿合并、composer、拖动、文件入口，以及原任务讨论、下载、AI交接／弹窗和协作保存；应用TypeScript及结构门通过，无新增例外。不复用0202历史58项作为本轮通过结论，未运行全量测试或双重审查。

浏览器在主工作区当前源码 `http://127.0.0.1:5192/annotation-discussion-qa.html` 的实际TaskDetail及真实子组件隔离合成props页完成1440×960与390×844：正文独立、原草稿及附件保留、保存失败后内容保留、明确发布与纯附件发布、任务文件数量在发布前后及刷新后均排除专用附件、已发布材料预览及逐字节下载、鼠标／真实触屏事件／方向键拖动均通过，pageErrors=[]。AI实际通过本机POST生成文件，字节与该标注HTML一致，prepare→copy短路径→open顺序核验；open使用注入记录器，没有启动任何外部客户端，无法确认客户端读取。[真实运行记录](../../artifacts/product-audit/annotation-attachment-verification-2026-10-15.json)已归档，结论限当前本地组件与服务，不证明生产共享保存、跨端权限或真实客户端接收。

新FIG-FILES-043／044／045／046依次为两动作工具条、讨论草稿、发布后附件预览和手机工具条，前三张1440×960、手机390×844，真实PNG且由根代理与文档代理逐图目视核验，登记current-component；043～045就近入模块11，046用于窄屏证据。旧040／041／042及033／034保持superseded，035／036旧工具条图pending，015丢弃确认只沿局部范围，037实时网站图与网站／树的并行状态保持。统一沟通、拖动与临时标注继续适用，模块11／10／05／08、日志、基线、矩阵和本地汇总第31项同步，版本保持。本轮PRD构建成功生成25个模块，阅读页包含PRD-0205及FIG-FILES-043／044／045，模块索引有效，相关格式检查通过，PR待补，不操作远程issue。

另在390px当前TaskDetail验证普通本地TXT上传、点击附件名称预览及关闭，限定该链路的控制台warning／error均0；独立检查页初次favicon404补data图标后干净通过。其他流程仍只登记pageErrors=[]，不扩大为全部控制台断言。共享附件预览的previewAttachment词条已补中／英文，未据此宣称全部英文页面重测。

最终核对原5173服务返回的Explorer／TaskDetail模块为新源码，空无效POST返回400，确认本地handoff路由已注册；该核对没有生成文件或唤起客户端，也不代替前述有效材料测试。临时QA根目录两文件已删除、备份留在临时目录，本次5192轻量预览与隔离Chrome已关闭；用户原5173／5180进程保留。


## PRD-0203：在线网站嵌入与固定画面标注（2026-10-15）

**历史范围：本节记录0203当时的实现；交接流程已由0205替代，嵌入与当前TaskDoor页裁剪已由0207替代，以下运行记录仅保留历史证据。**

用户要求从任务文件打开他人已发布网站并标注。上传窗口复用添加网站，HTTP／HTTPS入口保存为普通`.url`任务文件，目标位置及同名编号沿现有文件流程；网站正文不作为可编辑本地文件或版本快照。TaskWebsitePreview使用隔离iframe实时浏览，固定当前可见画面后复用FileImageAnnotations框选、列表编辑删除与既有生成／AI／任务讨论动作。网页入口地址、截图、尺寸、来源和时间保存在标注中；上传截图的时间明确为添加时间，内部导航后的真实URL不可读取，不伪造。定位恢复对应固定截图，返回实时网站不显示旧标记。

`getDisplayMedia`必须由用户点击触发并通过浏览器选择；Capture Handle核对当前TaskDoor标签页与origin后才裁剪iframe可见区域，实际PNG帧读取后立即停止全部track；不支持、取消、选错来源、超限或失败可上传截图。PNG／JPEG输入实际解码、限制2MiB及像素规模；iframe禁止顶层导航，采用opaque sandbox以隔离脚本与TaskDoor，无代理抓取或绕过站点限制。iframe的load不能证明加载成功，保留新窗口／截图回退。依据[MDN iframe同源与事件行为](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)、[MDN屏幕截取授权](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)、[Chrome Capture Handle](https://developer.chrome.com/docs/web-platform/capture-handle)及[frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)；跨站元素／文字及网站是否允许嵌入均不保证。

14／14定向网站、生成文件及修订包检查通过，目录5／5检查通过；应用TypeScript及结构门通过。主工作区5173源码先实测，开发热更新干扰后，以同一当前源码静态构建隔离组件完成最终全流程：真实跨站iframe点击、真实native tab capture（隔离Chromium自动选择当前页、未注入截图或capture API）、区域意见、返回实时无旧标记、定位恢复、实际parentId保存、CSP禁止嵌入的上传截图回退及390×844手机框选。手机工具条x36/y513/width318/height79，在文件区域内完整两行，pageerror=[]。修复了工具条宽度只按视口而超出较窄文件区域的裁切，网站截图移除多余最小高度空白。核验记录为 `artifacts/product-audit/website-annotation-verification-2026-10-15.json`。首次上传选择器匹配两个入口、页面加载时间及热更新中断均保留为验证过程，不能伪称所有首次尝试均通过。

生产Vite前端打包通过（12.97s），应用类型检查再次通过。标准npm run build在既有node/test类型校验失败，共60条诊断，网站新增文件0条；未改其他领域测试。额外旧fullscreen/download测试因Node不识别组件CSS导入未进入断言，不计为通过；本轮真实浏览器与新定向检查覆盖网站流程，不把工具链限制当产品成功。没有全量测试、双重审查、子代理或外部AI交接。

FIG-FILES-035／036为主工作区当前源码的current-component、主代理逐图检查，正文只展示桌面35，手机36登记运行证据；不以受控网站证明所有公网网站、真实手机系统权限、线上共享、登录或客户端接收。模块11、基线、唯一日志0203、来源、矩阵、截图清单及仍未提交issue同步；0204并行文件布局修改及其last_change保持，不发布版本。正式项目须接入网址文件保存、共享权限、生产CSP与浏览器能力；PM demo及正式项目PR待补，不操作远程issue。


最终补验：返回实时网站后重复定位同一条标注、先隐藏标记再定位均恢复原截图及可见高亮（repeatLocateAfterHidden=true），无旧标记叠加。网站4／4针对性复验、应用类型检查通过；当前源码组件生产构建通过。正式PRD重新构建25模块，生成页包含0203、在线网站与FIG035，截图清单JSON及图文件有效，格式检查通过。

0205并行目标调整后，网站章节沿其统一标注交接规则；035／036因旧工具条恢复pending并撤下正文，0203浏览器验证只保留当次代码范围，不能证明0205交接。新增逐图检查的037仅呈现网站实时嵌入浏览，不涉及交接按钮；正式正文使用037。当前网址添加、网站预览、capture元数据与重复定位代码保留，未覆盖其他对话的变更。

## PRD-0204：文件分隔线延伸与底部双态入口（2026-10-15）

用户要求文件整体滚动时，文件树／正文分隔线延伸到详情底部，收起／展开按钮改为底部吸附。模块11明确桌面唯一双态入口：展开时在列表对应左下方，收起后同一按钮在正文左下方，两态保留底部空间、不覆盖末尾，顶部无重复入口。树外框与文件区同高，分隔线贯穿剩余空白至可视底边；树内容随详情自然移动并保留必要内部滚动。

仅替代0197的顶部入口位置及分隔线呈现，默认200px、180px至现有有效上限、额外80px／Home收起、最后有效宽度恢复、设备偏好、焦点与搜索／目录／树滚动／版本／编辑／讨论草稿／标注会话保持，窄屏目录／正文单栏及返回目录保持；0202统一讨论、0203在线网站和0193／0201滚动各自范围保留。

主代理已在 `TaskFileExplorer.tsx` 移除树标题和正文顶部两处toggle，添加唯一footer双态按钮；沿同一toggleRef与useFileSidebar保持键盘、焦点及状态，按钮位于sidebar外，不受隐藏树inert影响。`task-file-editor.css` 将footer放在网格第2行、sticky bottom0及44px高，仅左列接收pointer；`task-detail-split.css` 使桌面文件区至少覆盖可视文件区域、aside拉伸，::after竖线贯穿全文，树内仍保持必要滚动边界。

当前5187真实产品任务Files4首屏外层scrollTop0时，footer bottom720与详情底边720一致，toggle数量1、顶部0；外层滚到360.5时底部仍720，空白竖线高1238.59px。末尾scrollTop823.5／最大824，aside bottom676.09与footer top676相接，PDF末页bottom644低于footer top676，无末尾覆盖。点击收起后当前PDF保持且焦点在Show，Enter展开焦点在Hide；从200px拖到原始候选100px收起，搜索“规则”保持，展开恢复200px。PDF第1页临时未保存文字经过收／展保留、Save仍可用，随后恢复原文并Cancel，未保存新版本；Home拖动柄收起且焦点交接底部Show。

390×844实测desktop=false、footer数量0、无横向溢出，即使设备偏好collapsed=true，Back to file structure仍可返回可见目录；视口已重置，浏览器error日志为空。3项现有fileSidebarState检查、应用类型、结构门及Vite生产构建通过，未新增测试、运行全量或双重审查。未逐项重测标注、全屏及全部文件格式，相关状态组件保持挂载，不据此扩展为这些流程全部运行通过。临时 `/private/tmp/file-sidebar-bottom-toggle.png` 已由主代理目视核验，仅为运行证据，不新增正式图。旧含树／顶部入口pending图补0204说明，015确认、033／034保存位置及流程示意保持局部范围，superseded历史图不恢复。

写前复核0203已由并行在线网站使用，本轮采用未用0204，保留网站与0202正文；模块11last_change为0204，产品／模块版本保持。正式模块、日志、基线、来源、矩阵、清单与仍未提交的10月15日本地汇总第29项同步，基线保留0197显式兼容锚点，历史日志链接不改。本轮文档、清单JSON、编号及草稿格式检查通过；主代理PRD构建成功生成25个模块，阅读页包含0204、唯一双态入口及竖线贯穿空白规则，文件模块索引指向模块11、0204日志仅1行，相关3个源码、PRD、基线、生成文件及issue格式检查通过。临时浏览器页签及5187服务已关闭，视口恢复，文件侧栏恢复验证前collapsed=true偏好。PR待补，不操作远程issue或发布版本。

## 详情原状态控件覆盖吸附摘要修复（非语义，2026-10-15）

用户截图指出文件页签吸附后，原顶部可编辑状态覆盖摘要名称，摘要右侧同时仍有只读状态。此现象违反模块08与PRD-0193已确认的完整顶部滚走、摘要只读及名称可读要求，本轮仅修复实现，不新增产品范围、语义变更ID、模块last_change或版本。PRD-0193及0201既有验证记录保留其历史范围；此前“摘要内可编辑控件0”仅检查摘要内部，未覆盖来自原header的外部叠层，不能作为本轮遮挡已验证的证据。

主代理在主工作区5187真实任务“新品发布会筹备”的Files4页签复现：详情外层scrollTop95、摘要collapsed=true时，原可编辑状态边界62～90，摘要名称区域的elementFromPoint命中原header控件，与用户截图一致。根因为共享 `.task-status-control` 使用position:relative及z-index35，摘要slot为20，原header为position:relative且z-index:auto，原状态控件越过所属header叠层。

最小修复仅在 `task-detail-split.css` 的 `.task-detail-split > .task-detail-header` 添加 `isolation:isolate`，将原顶部所有本地子控件限定在原header叠层；共享状态徽标、弹出到独立层的状态菜单及既有编辑行为保持。

主代理在当前主工作区构建5187复验同一任务Files4：外层scrollTop93.5、collapsed=true，原状态边界63.5～91.5仍在几何上与摘要相交，但相同点elementFromPoint命中摘要标题，headerLeaks=false、headerIsolation=isolate，摘要可编辑控件为0。点击旧状态坐标476／80未打开菜单；回顶点击原状态可正常打开1个菜单及4个状态选项，Esc关闭，未选择状态或修改任务。文件树展开后相同边界仍正常。首次菜单快照取得过早未呈现，后续实际快照确认菜单和4项，不把早期快照当作菜单失败或最终通过证据。

390×844窄屏摘要top64／height67、页签top131，摘要内采样不命中原header、可编辑控件0，页面无横向溢出。`/private/tmp/sticky-header-overlap-fixed.png` 仅作运行验证，不登记为正式PRD图。本轮Vite生产构建、结构门通过；CSS-only未新增自动化测试，也未运行应用类型、全量测试或双重审查。修复前复现与0193历史证据保留，当前命中及菜单结果为本轮单独验证，不重记旧结果为通过。

当前没有captured的任务详情整页／摘要截图，受影响的旧详情图继续pending；仍captured的文件确认、保存位置局部组件及目标流程示意不承载原任务header，不受影响，本轮不修改截图清单或新增正式图片。只追加来源、矩阵及10月15日仍未提交的本地汇总第27项，PM demo和正式项目PR待补，不操作远程issue。主代理PRD重新构建成功生成25个模块，阅读页保留摘要只读规则、索引模块08正常；相关CSS、证据、本地issue及生成文件格式核验通过。浏览器error日志为空，临时预览服务及页签已关闭，视口重置，文件树测试偏好恢复收起。

## PRD-0202：统一任务讨论与可拖动标注工具条（2026-10-15）

**历史范围说明：本节的独立生成文件、正文标注摘要及快照进入任务文件列表流程已由PRD-0205替代；统一沟通、历史消息和拖动规则保留，以下历史验证不证明0205附件流程。**

依据用户明确授权：移除文件内独立讨论入口、数量、正文气泡与面板，任务讨论承载全部沟通。关联文件的既有消息不删除原始数据，在任务消息流中保留原作者、时间、回复及来源并计入有效数量。标注工具条保留生成文件与连接AI，新增发起讨论，把本人本次已添加标注的可读摘要及固定版本图文快照带入任务讨论草稿；仅明确发布后才生成消息并保存附件。原草稿、附件与临时标注保持，准备草稿不解除丢弃提醒。拖动柄要求鼠标、触屏及键盘均可实际移动，且完整限制于可见边界。

主工作区已接入：`TaskDetail.tsx`、`TaskDiscussion.tsx`、`DiscussionComposer.tsx` 与 `TaskDiscussionMessage.tsx` 处理切页签、合并输入、附件及发布；新增 `discussion/lib/discussion-draft-insertion.ts` 保留原草稿、附件与提及。`task-file-annotation-document.ts` 新增 `createFileAnnotationDiscussionDraft`，复用图文快照生成器但将普通讨论正文整理为可读摘要。Explorer通过 `onStartDiscussion(draft, onPublished)` 交接；准备草稿不插入任务文件，成功发布且仍带对应快照附件时，才按同一标注签名记录交接，标注本身仍留在会话。移除快照后仅发表其他文字不误解除提醒。

Explorer移除文件讨论契约、面板、气泡及计数接线，Viewer／Lexical移除气泡参数，旧FileDiscussionPanel、FileDiscussionBubbles及专用计数模块退役。消息feed、`task-content-indicators.ts` 与 `useTaskCollaboration.ts` 统一读取既有成员消息，不清空原记录；新 `files/lib/useAnnotationToolbarDrag.ts` 与 `annotation-toolbar-position.ts` 提供工具条指针／触屏／键盘移动及位置边界。

本轮8组相关定向检查56项，加任务讨论接线名称过滤2项，共58／58通过：标注文件4、拖动位置4、草稿合并4、composer9、feed6、数量4、文件入口移除3、原任务讨论22及接线2。应用TypeScript和结构门通过，无新增结构例外。未运行全量测试或双重审查。最新搜索框圈选图片未形成额外搜索变更要求，本轮没有据此改动搜索。

主代理在主工作区当前源码 `http://127.0.0.1:5192/annotation-discussion-qa.html` 运行实际TaskDetail及真实子组件的隔离合成props页，1440×960、390×844及320×744核验：文件内没有独立讨论区域、入口或气泡，关联文件的既有消息在任务流只出现一次。预先填写主讨论正文及本地上传草稿附件，再进入回复模式输入其他草稿，选择文件精确正文并标注后发起讨论，实际返回普通新讨论草稿；主正文、原附件保持，摘要及冻结图文快照追加，编辑器聚焦，未自动发布或新增任务文件。该运行没有单独重新打开回复草稿回读，不将其登记为本轮浏览器通过场景。

模拟保存失败后正文及附件保留，消息不增加；重试成功发布无replyToId／fileThreadId的新任务消息，两份附件持久化，冻结HTML含原文与意见。最终消息流3条、任务文件3个，本次临时标注仍1条。鼠标真实拖动、触屏Input.dispatchTouchEvent拖动、方向键及Home复位、移动后的视口边界和缩到320px无溢出均通过，最终pageErrors=[]，未启动外部AI。早轮检查页遗漏App已有的onInitialAttentionTargetHandled回调导致发布后返回文件，补齐检查页回调后完整通过，不登记为产品缺陷。[运行记录](../../artifacts/product-audit/annotation-discussion-verification-2026-10-15.json)已归档于本地审计材料，仅证明当前本地组件和合成数据，不代表完整真实任务、正式后端、生产共享存储或跨端服务。

正式模块11、10、08、05及交互基线同步；本节替代0192独立文件讨论及0195两个工具条动作的当前判断，历史日志与验证保留。新FIG-FILES-040／041／042是上述当前源码组件页的实际PNG，工具条及草稿图1440×960、手机390×844，主代理及文档代理逐图目视核验，登记current-component；040／042就近入正文，041保留材料核对证据。016／017／018讨论气泡图保持superseded，012／019旧工具条图pending并撤正文；旧整页图继续pending，015丢弃确认及033／034保存位置保留局部范围。并行网站标注0203及文件树0204的源码、正文与最新last_change保持，不以本轮结果证明这些能力已通过；本轮PRD构建成功生成25个模块，阅读页包含PRD-0202及FIG-FILES-040／042，模块索引有效，相关格式检查通过，产品与模块版本保持。本地未提交汇总已更新，PM demo及正式项目PR待补，不操作远程issue。

末次应用TypeScript检查（并行网站类型接齐后）及本轮相关代码格式检查通过。临时annotation-discussion检查页、本次5192轻量预览和隔离Chrome已清理，用户原5173／5180服务保留；运行JSON已保存到仓库审计材料，不依赖临时页面继续存在。


## PRD-0201：讨论整体滚动与底部输入吸附（2026-10-15）

用户要求任务详情讨论的气泡输入框吸附在页面底部，详情整体滚动时始终可见。模块08明确任务主消息与回复随详情外层自然滚动，输入区在讨论页签内停靠详情当前可视底边，正常占位避免覆盖消息末尾；空／短讨论同样可用。回复摘要、附件及长输入增高时最多占可视高度46%，内部可滚，引用及通知定位使用顶部摘要／页签与底部输入之间的可读区域。只替代PRD-0193中任务讨论独立消息滚动的部分，其他详情滚动、文件讨论、发送、权限和草稿规则保持。

主代理已接入讨论消息随详情外层滚动、输入区在文档流内sticky bottom0及外层消息定位，移除讨论panel固定高度和内部overflow裁剪，保留讨论组件与草稿会话；短／空讨论使用最小高度，输入高度限制为详情视口46%并内部可滚。14项已有讨论流定向检查、应用类型、结构门与Vite生产构建通过；本轮未新增自动化测试、运行全量测试或双重审查。

主工作区当前构建在本机5187运行，桌面1280×720初始及外层scrollTop252、635／714时输入bottom均为720，消息区内部scrollTop为0；末条消息bottom561、输入top585，相距24px。原引用定位后目标top311.7～bottom459.8，位于页签下沿171与输入top585之间。普通草稿切概览时输入隐藏，回讨论草稿保留；回复自动聚焦同一底部输入，高167px。25行回复输入内部scrollHeight516／clientHeight134，外层输入底边不变。测试普通及回复文本已通过真实删除键清空，未发布任何消息。

390×844窄屏无横向溢出，输入bottom844；末条bottom635、输入top653，相距18px。长回复输入高257px，小于详情视口46%的358.8px，内部scrollHeight516／clientHeight70。另开既有“整理下周例会纪要”任务，Discussion0空状态提示可见，输入bottom720与详情底边一致；恢复原任务Discussion6，普通草稿为空且发布禁用，本轮浏览器error日志为空。未验证真实手机软键盘、全部短列表、附件增高及通知定位，不把本轮结果扩展为全部内容状态已实测。两张临时截图 `/private/tmp/discussion-bottom-sticky.png` 与 `/private/tmp/discussion-bottom-mobile.png` 仅作运行验证，不登记为正式PRD图。

FIG-COLLAB-004因整体布局变化恢复pending并撤下模块10旧图，其业务规则和last_change保持；FIG-COLLAB-001／006、FIG-DETAIL-003及FIG-PREVIEW-012补记变化并保持pending。文件讨论图及标注局部证据不扩大也不失效，superseded历史图不恢复。本轮不采集新正式截图，模块08last_change为PRD-0201，产品／模块版本保持；来源、矩阵、基线及仍未提交的10月15日本地汇总第25项同步，PM demo及正式项目PR待补，不操作远程issue或发布版本。文档格式、截图清单JSON及0201编号唯一性由文档代理作最小核验；本轮代码和运行验证由主代理执行。主代理PRD构建成功生成25个模块，阅读页包含PRD-0201及气泡输入吸附规则，模块索引指向模块08；日志0201仅1行，相关源码、PRD、基线及生成文件格式检查通过。

## PRD-0200：标注文件选择保存位置（2026-10-15）

**历史记录：标注生成到任务目录的流程已由PRD-0205讨论附件流程替代，以下保存位置与生成结果仅保留历史追溯。**

生成标注文件时，有有效文件夹先选择任务文件根或多级文件夹，默认源文件所在目录；无文件夹直接保存根目录。取消、保存失败及所选位置失效保留本次标注，失效位置不自动改存根目录；成功后继承任务文件范围并实际位于选择目录，同名文件区分。0195临时会话与交接、可见区域停靠及0197侧栏保持。

`TaskFileDialogs.tsx` 扩展save模式并复用移动位置的层级单选与路径反馈，`getTaskFileFolderDestinations` 复用有效目录遍历，过滤归档树及孤立目录；原移动排除自身／后代逻辑保持。`TaskFileExplorer.tsx` 仅确认后生成快照，提交前基于最新filesRef重核对位置，再沿placeTaskFileUploads与既有collaboration提交；成功后解除这批丢弃提醒并展开目标目录。取消没有生成或落盘，失败由原操作弹窗显示并保留选择。位置失效明确提示，不冒充根目录。新中文与英文界面文案均提供。

目录5项、放置3项与标注文件2项共10／10定向检查通过，应用类型和结构门通过。主工作区当前5173服务，Browser plugin不可用，用隔离Playwright组件页实测默认源目录、选择嵌套目录及根目录、取消无文件且pending保留、模拟保存失败保留、重试成功的实际parentId、同名文件分开、选择目标被删除后保存禁用并改选根目录、无文件夹不弹选择直接保存、手机选择保存；pageerror=[]。手机弹窗x16、宽358、高465.75，完整位于390×844内。浏览器可访问名称包含路径与标签的组合，首次严格匹配路径的验证选择器不符，修正选择器后上述交互全部通过；不隐瞒首次定位失败。

FIG-FILES-033／034来自当前源码隔离props页，主代理逐图查看，current-component；旧图不用于证明新保存流程，其局部形态／生成结果范围保持。正式服务端文件保存、权限与并发失效仍需正式项目接入，不将合成目录或本地parentId当作生产撤权证明。仅本地issue草稿，PR待补，无远程issue、外部AI、子代理、全量测试或双重审查。本次0200编号唯一，未发布版本。

本轮Vite生产构建通过；PRD构建生成25模块，包含PRD-0200与FIG-FILES-033，索引有效，最终格式检查通过。033为正文案例，034作为窄屏验证图登记。隔离浏览器和临时验证页面已清理，用户5173服务保留。


## 创建标注文案统一（2026-10-15，非语义）

创建任务卡入口、输入标题、数量入口、列表、编辑／删除名称、继续收集、发送提示及模拟调整反馈统一称“标注”；卡片输入按钮中文为“保存标注”，英文为“Save annotation”。本轮仅改展示文案，保存仍只加入／更新待发送列表并打开创建对话，统一发送后才生成调整；不改变会话、过期保护及应用边界。历史回复兼容原“批注”数量前缀，不改用户输入。

主工作区5180当前页面核验：保存后仍为2轮、2条标注，目标原文保持；输入与已发送数量均显示“2 条标注”，两处展开名称文字列表，已发送只读。无相关控制台错误或框架错误浮层；39／39已有定向检查通过。FIG-CREATE-031～034按同名资产更新为当前自然视口824×720 JPEG，逐图目视核验。本轮仅文案统一，无新增语义日志，模块07 last_change／version保持；本地待提交汇总追加，PR待补。

## PRD-0197：文件树按钮收起与额外拖动收起（2026-10-15）

依据用户要求文件模块左侧任务文件列表支持按钮收起／展开，并参考任务列表的最小边界阻力与额外左拖收起。模块11和交互基线明确默认200px、最小180px及额外左拖80px松手收起，Home同样可收起；标题旁收起按钮与正文工具栏展开入口双态可用，恢复收起前最后有效宽度。仅改变文件树布局，和0193详情滚动、0192讨论、0195标注会话保持各自边界。

已接入 `files/lib/file-sidebar-state.ts`、`files/lib/useFileSidebar.ts`、`TaskFileExplorer.tsx`、`task-file-editor.css`；`SidebarResizeHandle.tsx` 按是否提供预览回调启用既有预览／提交协议，任务列表同一流程保留。复用文件树原宽度键，新增独立收起键；实际宽度、ARIA范围与保存使用同一有效上限。侧栏DOM保留，收起时aria-hidden与inert阻断聚焦并交接可见按钮，CSS提供220ms过渡和减少动态效果分支。

新增3项文件侧栏状态检查先失败后通过，与原7项任务侧栏检查共10／10通过，应用类型及结构门通过。5173开发预览出现重复createRoot与removeChild错误，改在当前源码生产构建的本机5187稳定预览验收，不以旧热更新错误冒充此次稳定页面错误。实际默认200px按钮位于侧栏内；正常拖到300px，原始候选101px保持展开180px，候选100px收起并保留300px，Enter展开和Home收起、焦点交接、刷新恢复300px及收起均通过。搜索“规则”、当前PDF／DOCX、树滚动153px、目录展开、未保存正文与编辑模式、标注模式在收起／展开后保留；测试正文已恢复且未保存或生成新版本。390×844实际窄屏忽略桌面收起偏好，可返回390px宽目录并再次打开DOCX，未产生页面横向溢出。稳定预览没有新的控制台错误；减少动态效果本轮按CSS与构建核对，未变更系统偏好实测。

临时运行图 `/private/tmp/file-list-collapsed.png` 与 `/private/tmp/file-list-mobile-tree.png` 已逐图查看，不登记为正式PRD截图。旧整页及含树／顶部入口的9条图保持pending并补0197说明，012／015／019局部标注证据保持原范围，已superseded图不恢复。PRD-0197对应的模块规则、日志、基线和本地第22项同步，模块及产品版本保持；应用前端生产构建通过，PRD构建成功生成25个模块，阅读页包含PRD-0197及文件树宽度／收起规则，模块索引正确，本轮格式检查通过。未全量测试、双重审查、远程issue或版本发布；PM demo及正式项目PR待补。

## 创建批注任务名称层次（2026-10-15，纯视觉）

批注列表与输入中的任务名称改用现有tertiary文字色，正文保持主文字色。当前主工作区5180页面核验：待发送、已发送列表及输入的名称均rgb(97,112,137)，列表正文rgb(46,58,80)，名称与正文更易区分。只改两处CSS颜色，字号、字重、数据与操作保持；未新增测试或运行全量／双重审查。

FIG-CREATE-031／032／033按同名资产重采为当前1440×960 JPEG，034的收起状态不展示本轮名称样式，证据范围保持。主代理目视核验；截图仅支持当前呈现，不重复登记上一轮59项为本轮验证。本轮为非语义样式修改，不新增PRD编号，模块07的last_change与版本保持；生成页随当前截图重新构建。

## 文件工具栏全屏入口前移（非语义，2026-10-15）

文件工具栏的全屏入口移到讨论之前，仅调整视觉顺序，不改变功能、流程、权限、状态或数据规则，不新增变更编号，不修改版本或last_change。FIG-FILES-013／014／016／017／018／020展示旧工具栏顺序，恢复或保持pending并撤出当前正文，保留历史资产和先前停靠证据，待从主工作区当前运行页面重新采集；012局部列表与工具条、015确认组件、019长文件停靠截图均不承载顶部操作顺序，按原范围保留，其他既有截图状态保持。未以旧图证明新顺序，PRD构建由本轮收尾执行。

主代理在当前源码隔离组件页完成桌面1440px与手机390px运行核验：桌面全屏入口x1131在讨论入口x1177之前，手机全屏入口x108在讨论入口x156之前；可见操作顺序为全屏、讨论、标注、编辑、更多，无横向溢出，pageerror及consoleerror为空。临时截图已目视，临时QA已清理；此证据仅覆盖当前组件顺序与两种宽度呈现，不替代待采集的正式截图，也不证明正式任务端到端或生产服务。

本轮PRD构建成功生成25个模块，生成页已撤下受影响的六张截图，文件模块索引同步；本轮代码、文档及生成文件格式检查通过。仅追加本地未提交issue汇总，PR待补，未操作远程issue。

## 标注工具条按可见区域停靠（视觉修正，2026-10-15）

用户要求黑色工具条靠近当前可操作文件区域下沿，避免位于长文件末尾。本轮只修正定位和间距，不改变PRD-0195的标注会话、生成文件、AI交接、丢弃确认及权限，判为纯视觉修正，不新增语义编号，不改版本或last_change。

`TaskFileExplorer.tsx` 增加同区域sticky停靠容器，保留原操作和popover触发；`task-file-annotations.css` 让工具条在实际滚动区下沿吸附，桌面16px／手机12px留白，负向空间与正文底部预留避免增加文档长度，停靠容器不截获背景操作，退出文件区域时不脱离文件容器。没有全局fixed条或新的滚动监听。

主工作区5173 cwd已核实，Browser plugin不可用，隔离Playwright页复用当前源码和详情样式，以90节Markdown验证外层滚动：初始及scrollTop1400时工具条y847、高48px、可见区域下沿留白16px，文件正文高度9286.4375px，表明不等待文件末尾；手机390×844工具条286.625px宽、高44px、留白12px，列表位于工具条上方且视口内。文件末端、长短切换及容器边界通过，pageerror=[]。FIG-FILES-019／020真实PNG已逐图查看，属于current-component；013旧定位证据恢复pending并撤正文，012局部形态和014／015按原范围保留，讨论016～018保持。仅验证当前组件与Markdown布局，不据此宣称全部上传格式。应用类型检查及格式检查通过；本轮未新增自动测试、全量测试、双重审查或子代理。


## PRD-0195：临时标注、生成文件与离开确认（2026-10-15）

用户已确认：文件标注属于本人当前页面的临时会话，不自动存储或刷新恢复。列表仅核对、编辑和删除，文件右上角数量移除；底部生成文件与同款AI按钮独立。明确生成的完整标注文件进入任务文件区，有权成员按文件读取；直接AI交接不生成任务文件。未交付内容刷新／离开前确认丢弃，预览、取消与失败保留提醒，后续修改重新提醒。此条替代PRD-0190对应规则，文件讨论0192、创建0196及详情滚动0193保持各自范围。

`useTaskFileAnnotations.ts` 只使用React会话状态，活动流程不再读写旧标注storage或storage事件；旧读写API保留历史兼容，不恢复旧记录。`validateTaskFileAnnotations` 提供不依赖存储的作者／来源／版本校验。`TaskFileAnnotationDialogs.tsx` 移除交接footer与保存动作，输入为添加标注。`TaskFileExplorer.tsx` 复用AiConnectionButton及连接预览，只有open-attempted回调确认本批交接；HTML标注文件保留意见、局部PNG、原文、作者、时间及固定版本快照，使用既有文件放置和collaboration提交，同名不覆盖。生成失败保持会话，更多菜单仍可取得原材料修订包。

原生beforeunload保护刷新／关闭；TaskDetail透传退出controller，App的任务／模块／团队导航和清空任务选择复用离开确认，取消保留，明确确认才清理会话。已有文件正文草稿机制保持。生成后继续编辑不改写已生成文件，新的意见和输入重新触发提醒；仅预览AI不解除提醒。

新文件2项、核心9项、修订包6项及连接预览10项共27／27通过，应用类型检查、结构门及Vite生产构建通过。主工作区5173服务已核实cwd；Browser plugin不可用，隔离Playwright验证实际beforeunload取消／确认、会话不写storage、刷新不恢复、离开确认组件取消／丢弃、列表无footer及右上角数量、编辑未确认阻止生成、生成失败保留与成功落盘、PNG与完整意见预览、另一成员查看同一生成文件及刷新保留、390px工具条与浮层无溢出、AI预览不当作保存，pageerror=[]。桌面1440×960、手机390×844，工具条314.625px宽，scrollWidth=clientWidth。外部AI未启动；成功交接解除提醒按回调及既有连接逻辑核验，未用浏览器实际唤起证明。

FIG-FILES-012～015从当前源码隔离props页采集并逐图查看，属于current-component；010／011已失效恢复pending并撤正文。确认截图是同款组件，刷新行为另用浏览器原生确认验证。合成成员共用已保存文件及本地存储，不证明生产跨端共享；正式项目仍需服务端文件保存、权限和材料读取。仅本地待提交issue草稿，PR待补，无远程issue、子代理、全量测试或双重审查。本次PRD编号0195唯一，历史重复编号保持。


## PRD-0196：创建对话侧栏与名称文字批注（2026-10-15）

TaskCreationPage把创建对话移入工作区网格的独立右栏，TaskAiAdjustmentPopover在compact创建分支渲染motion.aside；桌面缩放任务区并排，不走固定Popover或遮罩。明确收起／Escape保留页面拥有的输入、批注、历史与候选，关闭后恢复任务宽度；窄屏覆盖任务编辑区并暂时隐藏背景焦点，关闭后恢复。

TaskCreationAnnotationComposer及Page停止截图采集并移除截图等待／失败状态，输入和Bucket显示任务名称与文字；History只保留数量入口与同一只读列表。退役创建截图采集与查看组件，snapshotCreationAnnotations只冻结当前标识、名称、文字及内部快照，旧会话的图片元数据不带入新进度或候选。内部签名、整批过期保护及明确应用保持，文件内容标注不在本轮范围。

本轮UI11＋批量28＋范围／生命周期20共59项通过，应用TypeScript及结构门通过。首次定向检查暴露了SSR中未定义的全局requestAnimationFrame和旧Popover／原文断言，改为受环境保护的window调用并更新现行交互断言后59／59通过，不称首次直接通过。真实5180桌面1440px：任务区x350～1025.8，侧栏x1025.8～1440无重叠；收起任务区宽1090px，重开保留补充文字和2条批注。名称＋文字列表img=0，发送后仅数量气泡约133.3×58px，内联details=0，统一发送仍生成两处目标候选，未应用／创建。390px侧栏x0～390，页面宽390，列表x18～378；Escape先收起子列表，随后明确收起侧栏恢复任务区。未全量或双重审查。

031～034沿原图号从主工作区当前运行页面更新，主代理目视核验；图片范围及状态见清单。未提交验证会话在页面更新时被重置，随后重新建立样例采集；新样例首次收集仍1轮且无候选，统一发送后2轮、两处目标候选，未应用／创建，不登记为保存或恢复能力。正式构建结果见实现矩阵，本地汇总追加，PR待补；产品及模块版本保持。

## PRD-0193：详情整页滚动与只读吸附摘要（2026-10-15）

依据用户指出文件无法整体滚动、概览只滚正文，并明确要求试做完整顶部随页滚走、紧凑关键信息吸附且不可编辑的交互。模块08和交互基线4.2／4.3调整为标题、属性与当前正文共用外层滚动；页签吸附在只读摘要下，回到页首恢复完整可编辑信息。主讨论消息流及底部输入、文件树、文件讨论和格式专用预览保留必要内部交互；现有保存、权限和人工确认规则保持。

当前主工作区已接入 `TaskDetail.tsx`、`TaskDetailStickySummary.tsx`、`task-detail-split.css`，以及 `TaskFileExplorer.tsx` 的外层滚动选区清理。摘要使用当前任务的名称、状态、负责人、日期和同一有效 AI 进度，不移除原顶部空间，也不因滚动失焦保存；文件讨论在桌面保留内部列表，窄屏继续从底部展开，避免被长正文推至页尾。

主工作区5173真实任务与长DOCX正文已实测：概览外层scrollTop=182.5；长文外层scrollTop=722而viewer.scrollTop=0；摘要top=64、页签top=116，摘要内按钮／输入／可编辑正文共0。回顶后scrollTop=0、摘要隐藏、名称保持可编辑；讨论草稿和DOCX选择切页签保留。390×844首屏布局已核对，摘要测量高度67px；窄屏滚动和完整键盘流程因浏览器连接反复重载／超时未完成验证，不把请求过视口或发送过按键当作通过。临时运行截图为 `/private/tmp/task-detail-sticky-files.png`，不作为正式PRD图。

应用TypeScript、结构门和Vite前端生产打包通过；未运行全量测试或双重审查。旧详情整页截图及复用项恢复或保持pending并注明PRD-0193，已superseded图不恢复，FIG-FILES-010／011等局部证据保持原登记范围。PRD构建成功生成25个模块，阅读页包含PRD-0193及整页滚动规则，模块索引已重新生成并保留正确的任务详情来源与阅读入口，本轮格式检查通过；PM demo与正式项目PR待补，未操作远程issue或发布版本。

## PRD-0192：文件讨论气泡与消息数量（2026-10-15）

**历史记录，界面及后续待接入项已由PRD-0202替代。**

依据用户指出文件讨论难以唤出、参考正文旁数量气泡并明确授权修改项目，模块11新增局部气泡与工具栏直接入口；计数为未删除评论及回复，标注数量独立。复用现有讨论串、固定版本、来源锚点与逐条连接AI，不恢复编辑或引用。

`src/features/tasks/files/lib/file-discussion-indicators.ts` 对消息ID去重，按有效文件讨论串统计未删除的成员评论／回复；`FileDiscussionBubbles.tsx` 只使用实际Lexical标记，同来源多串合并计数，组内全部解决才显示已解决图标。Explorer、Viewer、Lexical文档、FileDiscussionPanel、DiscussionMessages及文件讨论样式接入入口、展开定位、焦点返回和底部面板，`TaskDetail.tsx` 透传读取错误与重试回调。

本轮文件讨论交互6项、计数6项、精确文字锚点4项共16／16定向检查通过，应用TypeScript及结构门通过，无新增例外。主代理在主工作区当前源码的 `http://127.0.0.1:5192/file-discussion-entry-qa.html` 隔离合成props页验证1440×960、760×844与390×844：同源气泡4条、总数8条且包含整文件／旧版／失效来源，局部激活展开正确回复；关闭／Esc返回入口并保留草稿，回复+1及删除-1，回复AI回调正确，失效定位提示且无假锚点；全部解决后的气泡状态、PDF仅第2页局部入口、读取失败及重试恢复、英文入口、手机无横向溢出均核验，最终pageErrors=[]。未启动外部AI，不运行全量测试或双重审查。

当前局部气泡覆盖Markdown／文本及PDF抽取正文；HTML、图片与内嵌原PDF只提供顶部全部讨论入口。当前为同步本地组件存储，不将其当作异步加载、共享持久化或真实任务端到端证明；旧版提示及定位失败提示沿既有机制。FIG-FILES-016／017／018是上述当前源码组件页的实际PNG，前两图1440×960、手机390×844，主代理及文档代理逐图目视核验后登记current-component；001／DETAIL004／PREVIEW013继续pending，标注图的并行状态及证据范围保持。PRD构建成功生成25个模块，阅读页包含PRD-0192及FIG-FILES-016／018、模块索引有效；本地未提交汇总已更新，PM demo与正式项目PR待补，未操作远程issue或发布版本。

## PRD-0190：单一标注列表、编辑删除与本地 AI（2026-10-15）

当前文件标注统一名称并合并为一个非模态浮层。底部工具条及原文件入口／已有标记打开同一列表，列表显示任务内已保存标注，右下角直接连接本地 AI；不再提供标注侧栏、私有勾选、标注回复或新增整份文件意见。删除实际移除标注，编辑／删除仍仅限作者；文件讨论继续沿PRD-0183／0184，本轮不改变其逐条回复、删除与连接规则。

主代理直接改动 `TaskFileExplorer.tsx`、`TaskFileAnnotationDialogs.tsx` 与标注样式，删除不再使用的 `TaskFileAnnotationPanel.tsx`。`task-file-annotations.ts` 禁止新增／改写标注回复，旧数据仍可读取且原有附属历史不可改写，不进入交接。术语更新不迁移原存储键或意见原文。`AiConnectionDialog.tsx` 同时识别旧“文件批注”与新“文件标注”，保证原交接内容一致。

定向检查核心9+修订包6共15／15通过；连接预览10／10通过，含新名称与旧名称兼容、原文一致。应用类型、结构门通过。Browser plugin不可用，使用bundled Playwright+Chrome，在经进程cwd核实的主工作区5173服务执行 `/private/tmp/taskdoor-reference-annotations-check.mjs`，隔离合成props任务：新增标注、统一两条列表、无回复／整份入口／checkbox／旧侧栏、右下角连接可见、行内编辑、隐藏恢复、发送进入真实连接预览且带入新正文、菜单仍进入同一浮层、390px完整、作者删除后存储数量实际减少。最终pageerror／consoleerror=[]；没有启动外部Agent或代为执行。桌面列表360×259.6px、工具条289.7×48px；手机列表360px宽x18..378、工具条227.6px宽x81.2..308.8。文字路径有实际浏览器证据，图片／HTML沿同一行组件及固定锚点，未据此宣称本轮重新验证全部上传格式。

新FIG-FILES-010／011来自当前源码隔离组件页，主代理逐图查看，PNG1440×960与390×844，current-component，不冒充实际任务页面或生产跨端服务；005～009因命名与入口变化恢复pending并撤正文，历史原图保留。当前仍仅本地存储，正式仓库需要共享持久化、权限及CLI／MCP读取接口；本地待提交汇总已追加，PR待补，未操作远程issue，未使用子代理、全量测试或双重审查。本轮Vite生产打包通过，临时QA html／tsx已删除，隔离Chrome已关闭，用户5173服务保留；PRD构建已生成25个模块，含PRD-0190与新010／011，索引有效。

当前PRD-0190编号唯一；日志中PRD-0115／0100／0099的重复已存在于HEAD，本轮未增加，保留历史。


## PRD-0191：批注命名与气泡浮层核对（2026-10-15）

创建相关批注入口及文案统一名称。`TaskCreationHistory.tsx` 的已发送消息与输入框复用 `TaskCreationAnnotationBucket.tsx`，历史不给编辑／删除回调且保留提交快照，列表移除重复标题，未发送操作按钮并排且垂直居中。`task-ai-adjustment.css` 让气泡随内容收窄，并阻止外框在打开浮层时被程序滚动，滚动仅发生在对话正文。

本轮UI11项与批量处理28项共39项通过；末次UI11项复验通过，应用TypeScript通过。真实5180页面两图气泡展开前后均234×142px、内联details为0，列表任务标题为0；两按钮中心分别646／715px，与对应行中心相同。编辑保存返回收起，删除2变1且已发送消息仍2条；再次收集并统一发送生成第4轮两处目标候选，未应用／创建。Escape收起通过。390px浮层366px宽、left12/right378、页面宽390；操作按钮44px，外框scrollTop保持0。未运行全量或双重审查。

FIG-CREATE-031／032／033／034从主工作区当前页面刷新为简体中文JPEG1440×960，由主代理目视核验。图文保存与显示不证明视觉模型或生产写入。07的last_change为PRD-0191，版本保持，本地待提交汇总追加，PR待补；正式构建结果见实现矩阵。

## PRD-0184：文件讨论逐条连接 AI（2026-10-15）

文件评论与回复均接入现有AiConnectionButton。TaskDetail给文件协作对象传入openDiscussionAi，FileDiscussionPanel透传，共享消息在compact文件模式为回复也显示入口；消息携带fileThreadId，buildDiscussionAiRequest只接受当前请求的同范围消息及同串直接原消息，拒绝已删除／无效记录，不从缓存引用或输入草稿补内容。任务入口的活动范围保持，消息入口读取allMessages后由构建器校验来源。共享连接弹窗、快捷工具选择及真实传输反馈继续复用，未修改文件内容或恢复编辑／引用操作。

本轮16项文件讨论和上下文定向检查通过，另2项现有主讨论入口及真实TaskDetail回调检查通过，共18项；新增3项先验证失败，再接通入口和来源范围后通过。TaskLocalAiConnection的现有消息回调绑定更新为allMessages，并把旧的任务人员／标签等过宽预期修正为现行任务名称／目标及消息正文、附件归属，覆盖任务消息和文件回复都能生成共享连接请求。应用TypeScript检查通过。测试运行采用应用tsconfig和临时CSS／SVG资源适配；未运行全量测试或双重审查。

证据限组件渲染、真实事件回调与上下文构建，不将测试视为真实本地工具启动、浏览器全路径、生产保存或正式项目已接入。FIG-FILES-001／FIG-DETAIL-004／FIG-PREVIEW-013继续pending并追加入口变化说明，批注局部图证据范围保持，无新截图。模块05和11、交互基线及本地未提交汇总同步，PR待补，产品／模块版本保持。

## PRD-0183：文件讨论仅保留回复与删除（2026-10-15）

用户明确要求文件内容讨论的逐条操作只保留回复和删除。`FileDiscussionPanel.tsx` 向共享 `DiscussionMessages` 传入 `allowQuote=false` 且不再传编辑回调，新增评论输入同样禁用引用；本人主评论及回复显示回复／删除，他人发言只显示回复。文件原文与直接回复来源定位、线程折叠及删除权限保持，未改共享评论组件、文件正文或批注编辑。

本轮中英文服务端渲染断言通过，核对本人主评论、本人回复与他人回复的操作组合及来源定位；现有文件讨论交互4／4和应用TypeScript检查通过。直接Node执行先遇到CSS／SVG导入及JSX运行配置不匹配，使用临时资源加载适配与应用tsconfig后验证；既有一条工具栏断言仍要求常驻讨论按钮，已按PRD-0178的更多菜单入口修正后4／4通过。未新增永久测试，未运行全量或双重审查，不将静态渲染视为浏览器点击、跨端保存或正式项目接入证据。

FIG-FILES-001及同图复用项继续pending，清单注明旧图不能证明本次操作；当前批注局部图005～009不包含讨论操作，沿用原证据范围，不新增截图。模块11的last_change为PRD-0183；交互基线及本地未提交汇总同步，产品与模块版本保持，PR待补，不操作远程issue。

## PRD-0182：输入框内收起标注与按需核对（2026-10-15）

收集标注仅通过对话输入框内的数量入口呈现，默认收起，向上展开截图和标注文字，可编辑／移除，不显示“提交时的任务内容”；内部quote及valueSignature仍保留用于版本校验。编辑关闭汇总和父对话，再打开卡片输入，保存后回到收起状态，避免父浮层夺回焦点。创建页重复条数与输入框外的独立列表、说明已移除，二次发送、候选及明确应用边界保持。

接入来源：AnimatedAgentChatInput.tsx的contextContent组合入口、TaskCreationAnnotationBucket.tsx的非模态Popover、TaskCreationPage.tsx的编辑焦点交接、TaskAiAdjustmentPopover.tsx与TaskCreationHistory.tsx的呈现及内部快照。现有组件定向11项及应用TypeScript通过；真实5180页面确认默认aria-expanded=false、chip在输入shell内、未展开列表DOM为0，展开两张截图但details为0。编辑、保存返回收起、删除后2变1、再次收集及空补充发送已实测，发送才生成两处目标候选，尚未应用／创建。390px浮层left12/right378/width366，页面宽390无溢出；未运行全量测试或双重审查。

FIG-CREATE-032／033已重新采集，034为新增收起示例，均1440×960 current-page JPEG；031精简输入图保持。截图来源、条目状态与实际数据边界见清单；后台快照不等同真实视觉模型。本轮PRD构建成功25模块，生成页、索引及格式核验通过；07现行last_change为PRD-0182。本地仍未提交的汇总追加本项，PR待补，不操作远程issue或发布版本。

## 创建意见输入精简（2026-10-15，非语义）

用户要求移除意见输入浮层中的任务名、截图预览、截图说明及“查看当前任务内容”展开区，入口悬浮提示统一为“标注／Annotate”，无障碍名称仍区分目标任务。正常输入只保留标题、输入框和底部操作；采集状态或失败说明精简至底部文字。截图继续后台采集并保存到意见列表和历史，原文过期保护、整卡作用范围及两阶段发送保持，属于重复内容与提示文字的呈现收敛，不新增语义编号，模块07的last_change仍为PRD-0179，历史日志不改写。

实现为 `TaskCreationAnnotationComposer.tsx`、`TaskCreationAnnotationButton.tsx`。主代理在当前主工作区5180实际页面核验Editor宽360px、高216px，内部img／details／任务名均为0；聚焦提示文本精确为“标注”，hover与focus沿同一CSS规则，不把聚焦实测扩大为额外鼠标路径已逐项验证。首次发送后，Bucket仍有本轮后台采集并实际decode的PNG960×386和原意见，显示发送1条，未生成新调整。视口已恢复默认，截图保存与两阶段能力没有因精简输入区而移除。

现有 `server/taskCreationAnnotationUi.test.ts` 本轮修改既有断言后11／11通过，未新增测试；UI及本轮源码格式检查通过。应用TypeScript本轮尚未通过，当前共享工作区并行文件模块 `TaskFileExplorer.tsx:359` 将 `RefObject<HTMLElement | null>` 传入要求HTMLButtonElement的ref，主代理未修改该线程代码；不把此前应用类型通过结果冒称本轮通过，不扩大修复或执行全量／双重审查。

FIG-CREATE-031同名资产 `docs/prd/assets/task-creation/card-annotation-image-composer-zh.jpg` 已从主工作区5180重采，真实简体中文JPEG1440×960，主代理及文档代理目视核验精简表单；恢复current-page／captured，沿用图号与客户端日期2026-10-15，正文图注为就地写标注并先汇总，不再声称输入里展示截图。032／033保留原图及列表／历史证据，未重采。本轮图片限输入呈现，后台截图由上述实际Bucket操作支持，不以截图证明应用或正式创建成功。

当前仍未提交的本地汇总追加本项为第7项，其他并行条目和日志保持；PR待补，不操作远程issue、不发布版本。本轮PRD构建成功并生成25个模块，阅读页已同步精简输入的FIG-CREATE-031及现行标注流程，源文件last_change仍PRD-0179；最终文档更新后再同步产物并做本轮格式检查，不沿用前轮生成页结果。

## PRD-0181：批注输入与意见篮非模态浮层（2026-10-15）

用户明确要求将批注输入与意见篮调整为小型非模态悬浮浮层，不加遮罩、不固定居中、不锁背景编辑；意见篮可悬浮入口打开，移入后可编辑及主动交接，也保留点击与键盘入口，不能自动发送。模块11与交互基线记录当前目标，`last_change=PRD-0181`，产品与模块版本保持。仅替代PRD-0178的居中模态呈现，锚点、版本、作者编辑、紧凑列表、HTML静态预览和完整交接规则保持；模块05未改业务规则，继续按其现行连接边界引用，不更新版本或远程issue。

源码为 `TaskFileExplorer.tsx` 的选区／对象锚点、Base UI Popover handle、入口hover／点击／键盘与浮层开关，`TaskFileAnnotationDialogs.tsx` 使用共享Popover `modal=false`、虚拟选区或真实入口锚点、非模态焦点配置及输入／编辑草稿状态；`task-file-annotations.css` 提供小浮层及窄屏边界。未改批注核心／修订包，本轮未重复执行旧19项，不将它们登记为本轮通过。

Browser plugin本轮不可用，主代理使用bundled Playwright+Chrome对主工作区当前源码的5181隔离合成props页执行 `/private/tmp/taskdoor-floating-annotations-check.mjs`。实测hover打开、移入可操作且不抢原焦点，无dialog遮罩、背景inert或scroll lock；真实点击背景后可编辑，篮行未保存草稿收起／重开保留且可明确保存，键盘Enter可打开。composer贴近选区，真实点击外部后仍可继续填写；切换另一份文件并编辑和保存，等待界面稳定后原意见仍保留，最终提交绑定原float-source/v1而非新选中文件；明确取消直接收起且无额外原生确认弹窗。390×844点击可开篮、行编辑可用，浮层360px宽且x12～372px完整；桌面1440×960时篮360×189.8px、x1028/y128，composer360×275px、x212/y300。最终pageerror／consoleerror为空，应用TypeScript、结构门、Vite前端生产打包及当时格式检查通过，未运行全量测试或双重审查。

验证脚本早轮误用programmatic fill代替真实外部点击、programmatic focus代替键盘打开，导致等待失败；修正为真实click／Enter后通过，属于验证方式错误，不登记为产品失败。上述结论限当前真实组件和合成来源，不扩大为实际任务页面、生产保存、跨端或Agent执行。隔离Chrome已关闭，临时QA html／tsx已删除，本次5181验证服务已停止，用户原服务保持。

截图判定：004继续pending并撤正文，005／006保留局部高亮，002／003及原文件页三图保持。新增FIG-FILES-007／008／009对应 `assets/files-local-commits/floating-feedback-basket-zh.png`、`floating-annotation-composer-zh.png`、`floating-background-edit-zh.png`；真实简体中文PNG1440×960，主代理与文档代理逐图目视核验后登记current-component及正文引用。三图来自 `http://127.0.0.1:5181/file-annotation-floating-qa.html` 当前源码隔离合成props页，不冒充实际任务page；顶部测试输入不写成产品字段，009的背景文件编辑是真实组件行为。移动临时图390×844只作运行材料，不新增正式图号；其他并行记录不改。

现有[本地待提交汇总第6项](../../artifacts/product-audit/product-sync-pending-issue-2026-10-15.md)已同步本轮实现、运行与图片证据及PR待补，不改#49归档或远程issue。当前本地存储、静态HTML、真实跨端／CLI／MCP接口差异保持；临时资源清理已完成，PRD构建成功生成25个模块并包含PRD-0181与FIG-FILES-007／008／009，模块索引有效，不重用0178结果证明新版，也不运行全量测试或双重审查。

## PRD-0179：卡片意见截图与图文对话摘要（2026-10-15）

用户进一步要求意见发送及收集列表采用局部截图加文字，提交到对话后展示多张缩略图和实际意见数量。模块07的 `last_change` 为PRD-0179，交互基线同步该引用；产品及模块版本保持。沿用PRD-0177的单卡入口及两阶段发送，新增卡片截图快照、采集状态／失败处理及历史图文摘要，不复用或改写旧日志，不改并行文件模块PRD-0178。下方0177／0174保留各轮历史，本节登记当前最终实现和本轮验证。

实现来源为 `src/features/tasks/lib/capture-task-creation-annotation.ts`、`task-creation-annotations.ts`，以及 `TaskCreationAnnotationButton.tsx`、`TaskCreationAnnotationComposer.tsx`、`TaskCreationAnnotationBucket.tsx`、`TaskCreationAnnotationImage.tsx`、`TaskAiAdjustmentPopover.tsx` 和 `TaskCreationHistory.tsx`。截图从被标注的当前卡片采集，与稳定任务ID及原文同次保存；采集中禁止空图误发；失败提示截图未生成、可发送文字意见，用户发送即只带文字，收起后重新打开意见输入再次采集，没有独立的重试截图按钮。原文变化须重新采集。截图保存和展示供用户核对，本地候选仍处理有限语法文字，未接真实视觉推理。

主代理联合执行 `server/taskCreationAnnotations.test.ts` 28项和 `server/taskAiAdjustmentScope.test.ts` 20项共48／48通过，同组UI代理执行 `server/taskCreationAnnotationUi.test.ts` 11／11通过，本轮共59项相关定向检查通过。应用TypeScript `--noEmit`、结构门及Vite前端生产打包已顺序通过；本轮未执行标准 `npm run build`，前轮旧服务端测试类型诊断仅保留历史，不表述为本轮最新失败，不宣称全量测试或双重审查。

主工作区当前 `http://127.0.0.1:5180/` 实际页面核验主任务及两个子任务各只有一个意见入口，子卡展开仍为一个。捕获主卡PNG960×386和子卡PNG960×359，内容完整且没有意见工具或其他卡片。首次发送只收集并唤起对话：仍1轮、无预览、草稿名称不变；两图队列移除主任务意见后只余一图与发送1条。重新收集并二次发送2条后才产生第2轮，历史有两张缩略图和可展开的2条原文／意见，候选包含2处变化；明确应用后主任务更名为“例会决定与行动纪要”、第一个子任务更名为“核对并发布会议决定”，第二个子任务保持，列表清空而历史两图及意见仍保留。未确认创建正式任务，不以本地流程证明真实模型或正式保存。

本轮新登记FIG-CREATE-031／032／033，资产分别为 `docs/prd/assets/task-creation/card-annotation-image-composer-zh.jpg`、`card-annotation-image-bucket-zh.jpg`、`card-annotation-image-sent-zh.jpg`。均来自主工作区5180当前页面、简体中文JPEG1440×960，主代理及文档代理逐图目视核验，按2026-10-15、current-page／captured登记并在模块07就近呈现。旧029／030及纯文字收集图撤出当前正文，保持待采集；旧007／PREVIEW031／028继续pending，补问图不受影响。本轮图片证明意见输入、首次收集列表及二次提交消息，第三图只露出预览标题，不能单独证明全部差异或应用结果，应用结果由上述实际操作登记。

390×844下页面宽390px，对话左8px、宽374px、右382px，两条图文意见无横向溢出。`artifacts/task-creation-card-images-mobile-zh.jpg` 为真实JPEG390×844运行材料，不新增正式图号。定位嵌套祖先、所有字段、采集故障和纯文字回退未在真实浏览器逐项实测，不以这些截图或59项结果冒称全量运行覆盖。

现有[10月15日待提交汇总第1项](../../artifacts/product-audit/product-sync-pending-issue-2026-10-15.md)登记当前PRD-0177 → PRD-0179修订、实际实现和验证，PM demo及正式项目PR均待补；其他并行项和已提交#49归档保持，不操作远程issue。本轮PRD末次构建成功，生成25个模块；阅读页已核对PRD-0177／0179、标注流程及FIG-CREATE-031／032／033三张实际内嵌JPEG，模块07源文件 `last_change=PRD-0179`，模块索引的task-creation源文件与四个章节锚点正确。当前索引schema不含last_change，不新增字段或手改产物；本轮文档格式检查通过，不发布新版本。

## PRD-0178：文件批注入口收敛、紧凑意见与本人编辑（2026-10-15）

用户明确指出文件工具栏与意见篮过载，要求常显入口收敛、空篮隐藏、标注模式不展开空侧栏，意见优先展示局部截图／原文、目标及正文，详细来源按需查看且交接完整保留；本人可编辑正文，来源、锚点与版本保持。另明确正文段落／选区、图片及 HTML 区域在标注模式下悬浮高亮，退出只清除临时提示。模块 11／05 与交互基线记录现行目标，`last_change` 为 PRD-0178；本条替代 PRD-0175 的正文不可编辑与旧默认呈现，文件版本、回复沟通、修订包及连接不等于完成的边界保持。产品与模块版本不变，保留 PRD-0174／0176／0177，不发布新版本。

本轮源码：`TaskFileExplorer.tsx` 收敛工具栏与模式，`TaskFileAnnotationPanel.tsx`／`TaskFileAnnotationDialogs.tsx` 接入紧凑列表及本人编辑，`FileAnnotationSourcePreview.tsx` 与文件预览组件承接局部内容和悬浮／选择反馈；`task-file-annotations.ts` 保存本人正文编辑、局部截图和固定来源。`TaskHtmlAnnotations.tsx` 在静态 iframe 中读取 HTML 元素，保存 DOM selector 与归一化区域；仅预览副本清除脚本、外部样式／字体、表单提交及导航能力，原始文件保留。`capture-file-annotation.ts` 使用 `package.json` 固定的 `html-to-image@1.11.13` 生成局部预览，采集失败回退原文／位置，不作为修改源文件的手段。新样式为 `task-file-html-annotations.css`，与既有批注样式配合。连接继续沿 `AiConnectionDialog.tsx` 的同一 Markdown 交接，不因列表精简删字段。

主代理最终复验 `server/taskFileAnnotations.test.ts` 9项及 `server/taskFileAnnotationBundle.test.ts` 6项，共 **15／15**；精确文字选区 `server/taskFileTextAnnotation.test.ts` **4／4**，合计 **19／19** 定向检查通过。应用TypeScript、结构门、最终Vite前端生产打包及当时全工作区格式检查通过。主工作区当前实现的5181隔离合成props页由 `/private/tmp/taskdoor-file-annotation-refinement.mjs` 核验文字／图片／HTML新增与局部截图、行内编辑、多文件篮、真实ZIP下载、HTML脚本禁止、模式退出、空篮不展示及不强制空侧栏；1440×960与390×844，移动弹窗边界x16～374px且完整，无横向溢出，最终pageerror／consoleerror为空。补充隔离页核验：默认不显示意见栏，明确点击既有标记后可阅读意见，关闭后收起。该补充验证页最初的作者字段和换行转义错误已修正，成功结果基于修正后的合法材料。这些证据限当前组件及合成来源，不冒充真实任务页面、跨端协作或Agent执行。

HTML截图早轮白底覆盖问题已修复，最终按钮局部PNG包含蓝底3746像素与白字398像素，主代理及文档代理目视核对正确。无截图HTML的目标文字回退也通过独立浏览器核验，原selector／区域／意见保留，不把HTML blob作为图片。修订包补齐真实 `previews/*.png|jpeg`、相同图片去重、Markdown相对引用及manifest可选previewPath；实际再次下载并解压后验证3个有效PNG和3个源材料，Markdown不含base64 PNG，完整HTML按钮源码及原锚点／固定版本／正文保留。静态iframe脚本禁止有运行证据，其余资源／表单／导航限制按过滤与CSP源码记录，不声称全部外部场景已逐一运行。

截图判定：旧FIG-FILES-002／003继续pending并撤正文，原资产及PRD-0175采集、构建结果保留历史。新增FIG-FILES-004／005／006分别为 `assets/files-local-commits/refined-feedback-basket-zh.png`、`text-annotation-hover-zh.png`、`html-element-annotation-hover-zh.png`，真实简体中文PNG1440×960，分别显示紧凑三条意见、第二段正文悬浮、HTML元素高亮。主代理与文档代理逐图查看后登记current-component，明确来自主工作区当前源码的隔离合成props页，不冒充实际任务current-page，正文就近附图。移动及空态临时图只作为运行材料，不扩正式图号；文件页原三图及其他并行模块保持。

本次[仍未提交的本地issue汇总第4项](../../artifacts/product-audit/product-sync-pending-issue-2026-10-15.md)已同步19项检查、运行与图片证据、限制及PR待补，不改#49归档或远程issue。隔离Chrome、临时QA html／tsx和本次5181验证服务已清理，用户原服务保持。当前仅本地存储，不宣称正式项目、跨端协作或CLI／MCP批注接口已同步；本轮PRD构建已生成25个模块，生成页包含PRD-0178和FIG-FILES-004／005／006，模块索引校验通过，不运行全量测试或双重审查。

## PRD-0177：单卡意见入口与两阶段发送（2026-10-15）

用户明确纠正：每整张主任务卡及子任务卡各只保留一个意见图标；第一次从卡片发送只打开既有 AI 帮你改，展示已经收集的意见，用户可移除后再从对话发送，第二次发送才执行调整。模块 07 `last_change` 更新为 PRD-0177，交互基线同步当前引用；产品版本 1.1、模块版本 1.0 不变。本项替代 PRD-0174 的字段级入口、字段／标准索引锚点及发送呈现，保留该轮明确应用、最终创建、原文变化和整批失败保护。PRD-0174 的日志及下方检查记录作为历史保留，不作为本次修订的验证通过证据。

接入依据仍为 `TaskCreationPage.tsx`、`TaskCreationPlanEditor.tsx`、`TaskCreationSubtaskEditor.tsx`、`TaskCreationAnnotationButton.tsx`、`TaskCreationAnnotationComposer.tsx` 和 `TaskAiAdjustmentPopover.tsx`；`task-creation-annotations.ts` 本次改为稳定任务 ID 与整张可见卡片原文快照，`taskCreationAnnotationAdjustment.ts` 在该任务范围处理明确的多字段要求。旧 `TaskDetailFields.tsx` 的字段入口从当前创建路径撤出。卡片提交／更新和打开对话、意见列表编辑移除、对话真正发送与候选生成须分别核验；当前代码修订与本轮定向、类型／结构及运行验证仍在进行，尚未登记通过。有限本地语法与真实模型未接入的差异仅归实现矩阵，不写入模块正文。

旧 FIG-CREATE-029／030 含字段及标准行意见图标，与单卡入口不一致，恢复 pending 并从模块 07 撤下；原资产、采集日期及 PRD-0174 记录保留追溯。旧007／PREVIEW031／028继续pending，补问005／006不受影响。新截图待主工作区当前运行页面重新采集后登记，本轮尚未取得；旧桌面／窄屏实测不冒充当前两阶段流程已验证。

本次只更新现有[10 月 15 日待提交汇总第 1 项](../../artifacts/product-audit/product-sync-pending-issue-2026-10-15.md#1-创建方案卡片意见与两阶段发送prd-0174--prd-0177)，保留 PRD-0174 → PRD-0177 修订链及其他并行事项；不新建汇总、不操作远程 issue、不修改已提交 #49 归档。PRD 生成页待主代理按最终源文统一构建，不运行全量测试或双重审查，不发布版本。

## PRD-0176：文件全屏退出与回复层级（2026-10-15）

用户提供全屏正文与右上角退出图标参考，并明确要求复用现有讨论框架，用虚线及递进关系整理文件回复。模块 11 补充阅读全屏、退出及文件线程规则，`last_change` 为 PRD-0176；产品版本 1.1 与模块版本 1.0 保持。全屏退出入口属于语义交互变更，消息排版本身为视觉调整，合并在同次登记；不改变主任务消息平铺、顺序、权限、文件版本及批注边界。

实现来源：`FullscreenButton.tsx` 监听浏览器全屏状态，将退出按钮挂入全屏查看器，原工具栏保持外部；退出后清除旧选区浮层并恢复入口焦点。`task-file-editor.css` 提供固定右上角圆形退出图标与居中正文，`globalUiMessages.json` 提供中英文退出名称。`FileDiscussionPanel.tsx` 沿原线程／折叠逻辑渲染，移除重复静态回复计数；`DiscussionMessages.tsx` 仅在 compact 文件模式补直接被回复者及折叠箭头，主任务消息流不变；`task-file-discussions.css` 将文件原讨论／回复分为一级缩进、虚线连接与行间分隔，并对齐头像、姓名、时间及操作。

已有 FIG-FILES-001、FIG-DETAIL-004、FIG-PREVIEW-013 保持 pending；本次旧图无法证明新全屏返回与文件回复样式，不恢复当前证据。本轮文件全屏／下载7项、文件讨论4项及原任务讨论22项通过，应用TypeScript、结构与格式检查通过；PRD构建生成25个模块。实际5173 PDF全屏图标及焦点已核验；后续浏览器连续超时，未完成点击／Esc返回和展开回复视觉核验，无新增正式截图。详细边界登记于实现矩阵与[当前待提交汇总](../../artifacts/product-audit/product-sync-pending-issue-2026-10-15.md)；不更新远程issue。

## PRD-0175：文件内容批注、意见篮与本地 Agent 修订交接（2026-10-15）

用户区分文件里的沟通回复和针对内容的明确修改意见，并授权先实现文件预览标注、多条意见汇总与连接本地 Agent。模块 11 记录批注、固定版本、意见篮及修订要求文件规则，模块 05 复用连接 AI 并引用文件上下文边界；本次语义变更采用 PRD-0175，产品版本 1.1 与各模块版本保持，不发布新版本。模块 05 的 `last_change` 为 PRD-0175，模块 11 保留随后并行全屏与回复变更的 PRD-0176，不覆盖其规则或证据。批注、复制和唤起工具均不代表产出已修订，不替用户修改原文件、正式提交或完成任务。正文中已确认的协作者读取、授权及版本获取要求不能由本地界面推断为正式服务已实现。

源码接入登记：`src/features/tasks/files/lib/task-file-annotations.ts` 承接正文／图片／整文件定位、固定版本快照、意见选择与修订汇总；`useTaskFileAnnotations.ts` 承接本地保存状态；`TaskFileAnnotationPanel.tsx` 提供批注阅读及回复，`TaskFileAnnotationDialogs.tsx` 承接意见输入、意见篮预览、复制、保存汇总与连接 AI；`FileAnnotationSourcePreview.tsx` 显示选中文本或带区域框的原图缩略图，`FileImageAnnotations.tsx` 提供图片区域选择，`task-file-annotation-bundle.ts` 承接修订包导出。`TaskFileExplorer.tsx`、`TaskFileViewer.tsx` 接入预览及版本定位，现有 `FileDiscussionPanel.tsx` 保持沟通线程，与批注分别阅读。连接入口复用 `src/features/ai-connection/components/AiConnectionButton.tsx`；`AiConnectionDialog.tsx` 增加文件批注专用预览，`buildContextPrompt` 直接返回同一 Markdown，不再拼入其他上下文。样式为 `src/features/tasks/styles/task-file-annotations.css`、`task-file-image-annotations.css`，定向检查入口为 `server/taskFileAnnotations.test.ts` 与 `server/taskFileAnnotationBundle.test.ts`。

主代理本轮实际运行来自主工作区当前源码的隔离合成 props 页 `http://127.0.0.1:5181/file-annotation-qa.html`，不作为实际任务页面端到端证据。1440×960 与390×844 已核验整文件意见发布及加入篮子、回复保存且不进入汇总、下载实际 ZIP、保存汇总触发文件新增、源文件模拟升为 v2 后旧批注打开 v1 完整快照、图片真实框选与编号及带框原图缩略图、多文件意见篮、刷新后记录保留、第二处重复正文的精确选区批注、AI 弹窗显示全部选择，以及复制 payload 与意见篮 Markdown 逐字一致。原文件讨论入口仍可进入；英文固定文案切换后用户原文保持，390px 无横向溢出。最终 pageerror／consoleerror 为空，早轮隔离页 favicon404 已用 data icon 解决。本轮只打开 AI 预览，没有唤起外部工具或执行修改。

主代理最终复验核心与修订包相关 **12／12** 定向检查通过，连接预览兼容检查 `server/aiConnectionContextPreview.test.ts` **10／10** 通过，覆盖文件批注专用预览及原文完全一致，原任务／讨论预览保持；应用 TypeScript、结构门及 Vite 前端生产打包通过，无新增结构违反。打包保留既有大 chunk 与 native config 警告，不登记为新增失败。临时 QA html／tsx 已删除，隔离浏览器及5181验证服务关闭。上述为最小必要验证，不运行全量测试或双重审查；PRD 构建已成功生成 25 个模块，生成页含 PRD-0175、批注与意见篮正文、FIG-FILES-002／003 的内嵌图片；模块索引 JSON 有效。本次全工作区 git diff --check 通过，不沿用历史测试或截图证明本轮通过。

截图判定：批注入口、列表及意见汇总改变文件页面表现，FIG-FILES-001、FIG-DETAIL-004、FIG-PREVIEW-013 原已 pending，继续保留及并行 PRD-0176 的处理，不恢复旧图；原资产与采集历史保留。目标示意 local-commit-flow 不表示本次新能力，未改流程及登记。主代理采集的图片批注和意见篮两图经文档代理逐图目视核验，复制到 `assets/files-local-commits/image-annotations-zh.png`、`revision-feedback-basket-zh.png`，登记 FIG-FILES-002／003、`current-component`、简体中文 PNG1440×960；正文就近展示。两图明确来自当前实现的隔离合成 props 页，不能当作当前任务页面、跨端共享、服务接口或 Agent 执行修改的证据，不撤下与文件无关的图。

本次追加到[2026-10-15 待提交 issue 汇总](../../artifacts/product-audit/product-sync-pending-issue-2026-10-15.md#2-文件内容批注与本地-agent-修订交接prd-0175)，包含产品变更、实现与验证状态及 PR 待补。PRD-0174／0176 的并行内容保持；已提交 #49 的旧批次归档不追加，不创建、更新或评论远程 issue。当前 PM demo 仅本地存储，不具备真实跨端批注协作或 CLI／MCP 批注服务接口，正式项目接入另行跟进。PRD 构建与最终格式检查已完成，生成阅读页与模块索引同步。

## PRD-0174：创建方案局部意见标注与批量调整（2026-10-15）

用户明确要求在可修改处快速提出意见，将多条标注连同补充要求一起发送给当前创建对话，基于已有方案继续调整。模块 07 记录最终产品规则，`last_change` 更新为 PRD-0174；产品版本 1.1、模块版本 1.0 保持，不发布新版本。复用 D-149／D-151／D-166 的指定范围、当前草稿、差异预览与明确应用边界；本轮增加字段意见收集及批量上下文，不恢复归档的旧创建聊天状态机，不创建正式文件评论或任务讨论。

本轮实现证据按职责登记：`src/features/tasks/lib/task-creation-annotations.ts` 管理稳定任务 ID、字段及标准索引、原文快照、重复标注和过期目标；`src/features/tasks/components/TaskCreationAnnotationButton.tsx` 提供就地入口；`TaskCreationAnnotationComposer.tsx` 汇总原文与意见、编辑／移除／定位；`TaskAiAdjustmentPopover.tsx` 承接一并发送、生成／停止、差异预览和明确应用；`src/ai/mock/lib/taskCreationAnnotationAdjustment.ts` 负责限定标注字段的整批候选，通过 `src/ai/task-adjustment.ts` 门面对外使用；`server/taskCreationAnnotations.test.ts` 为对应定向检查。页面和字段接线由 `TaskCreationPage.tsx`、`TaskCreationPlanEditor.tsx`、`TaskCreationSubtaskEditor.tsx` 及 `TaskDetailFields.tsx` 提供；真实模型接入及有限语法差异只登记在实现矩阵。

主代理最终联合执行标注逻辑 20 项、标注组件 8 项及范围 20 项，共 48／48 通过。对应文件为 `server/taskCreationAnnotations.test.ts`、`server/taskCreationAnnotationUi.test.ts` 和 `server/taskAiAdjustmentScope.test.ts`；覆盖整批候选／应用复核、空补充发送、真实历史原文与意见、应用成功后才清空、失败／停止／取消／关闭保留及过期保护。最终共享工作区应用 TypeScript、Vite 前端生产打包与结构门均通过，AI 门面减少 2 条既有结构例外。标准完整构建的既有服务端旧测试类型错误、旧解析器 5 个过期日期用例仍单列，不宣称全量或标准完整应用构建通过。

收尾源码补齐定位意见时展开嵌套祖先、应用前拒绝覆盖未同步子任务输入，以及保留尚未加入意见列表的输入草稿。该部分登记为接线与保护事实，不将前述 48 项或两处意见实测扩大为每个字段、嵌套定位及所有创建离开路径均已实测。

主工作区当前 5180 实际页面已走通两处意见收集、空补充批量发送、差异预览、应用和清空意见，原目标及第二条完成标准保留；手改标注原文后发送禁用，编辑意见显示当前原文并可重新核对。未标注字段保留的结论限本轮实际操作与定向检查，不扩大为真实模型或正式保存已验证；本轮新截图另见以下登记。

截图判定：新增就地标注入口和意见汇总改变创建审阅表现，FIG-CREATE-007／FIG-PREVIEW-031 与底图含创建审阅的 FIG-CREATE-028 恢复 pending，模块 07 撤下旧图片引用，保留原资产与历史采集记录；补问 FIG-CREATE-005／006 及复用图不受影响，继续 captured。其他原已 pending 的创建图保持。

本轮新登记 FIG-CREATE-029／030，分别为 `docs/prd/assets/task-creation/annotation-bucket-zh.jpg` 和 `annotation-preview-zh.jpg`。两图来自主工作区当前 `http://127.0.0.1:5180/` 实际运行页面，简体中文、真实 JPEG 1440×960，主代理及文档代理均逐图目视核验。029 展示两条待发送意见、对应原文及编辑／移除；030 展示相同两条的字段前后差异与明确应用动作，意见列表自动收起保留预览空间。两图登记 current-page／captured，客户端采集日期 2026-10-15，在模块 07 标注流程旁呈现；它们证明当前界面，不证明真实模型、正式保存、全字段或异常分支已覆盖。

同一运行时 390×844 窄屏实测 `document.scrollWidth=390`，对话边界左 8px、右 382px、顶 72px、底 836px，无横向溢出。`artifacts/task-creation-annotations-mobile-zh.jpg` 为真实 JPEG 390×844，保留为运行验证材料，不新增正式 PRD 图号。

正式项目跟进新建[2026-10-15 待提交汇总草稿](../../artifacts/product-audit/product-sync-pending-issue-2026-10-15.md)，记录产品规则、实现与验证状态及 PR 待补；10 月 14–15 日旧批次已提交为 [nocoly/taskdoor#49](https://github.com/nocoly/taskdoor/issues/49)，其归档不再追加。当前未创建或更新远程 issue。主代理末次 PRD 构建成功、生成 25 个模块；生成阅读页已核对 PRD-0174 与“标注修改意见与继续对话”，模块索引含正确任务创建源文件及锚点。本次证据更新后仍由构建脚本同步产物，不沿用历史测试或截图作为本轮通过证据。

## PRD-0173：文件与文件夹按类型显示图标（2026-10-15）

用户明确文件与分组不需要设置图标，只显示文件类型标识；此处的分组对应文件夹。模块 11 的文件浏览及功能验收同步最终规则，`last_change` 为 PRD-0173，交互基线通过引用保持同一规则；产品版本 1.1、模块版本 1.0 保持，不发布新版本。移除既有图标设置能力属于语义变更，历史 PRD-0168 的图标网格与键盘操作结果保留追溯，不继续作为当前能力。

最终源码为 `src/features/tasks/files/components/TaskFileTree.tsx`：`TaskFileNodeMenu` 仅提供重命名、移动与删除；`TaskFileDialogs.tsx` 已移除 icon 类型、图标网格及设置回调，`TaskFileExplorer.tsx` 不再接图标设置保存。`src/features/tasks/files/lib/task-file-icons.ts` 不再以 `node.iconName` 覆盖标识，而是文件调用既有默认类型映射，文件夹按展开状态返回 Folder／FolderOpen。setter／restore helper与图标选择器样式已删除，旧 `iconName` 字段保留兼容，不批量改写节点。文件树、目录使用默认标识；移动目的地列表沿同一解析 helper，仅有本轮源码证据。预览工具栏和路径本来没有节点图标，本轮不新增。文件内容、版本与其他整理操作保持。

主代理执行两项新增图标回归从红到绿，覆盖旧自定义值不能覆盖文件类型和文件夹展开图标；与 `server/taskFileIcons.test.ts`、文件树、移动目的地相关检查联合共 13 项通过。应用 TypeScript 无报错，结构检查无新增违反，目标源码格式检查通过。主工作区当前 5173、1600×900 的“定稿发布会主视觉”页面已核验文件树 Markdown=NotebookTabs、PDF=FileText、DOCX=FileType2（运行 SVG 为 lucide-file-type-corner），展开分组=FolderOpen；目录 PDF 与展开分组同样采用默认标识。文件菜单只有重命名／移动到／删除文件，分组菜单只有重命名／移动到／删除文件夹。390×844 下目录菜单仍为这三项，文档 `scrollWidth=390`，运行日志 error／warn 为空。没有更改或保存文件内容，没有实际提交重命名、移动或删除；本轮这些操作只核对菜单保留，不登记为逐项提交回归通过。

实际页面核验图片为 `artifacts/product-audit/file-type-icons-2026-10-15.jpg`，已检查真实 JPEG 1600×900 并目视核对类型图标和文件菜单；该图登记为本轮来源材料，不新增 PRD 图号，不替换全套文件页截图。正式跟进已更新[当前汇总第 8 项](../../artifacts/product-audit/product-sync-pending-issue-2026-10-14.md#6-统一文件浏览整理与版本历史)，PR 链接待补，只保存本地草稿，未修改正式项目或提交远程 issue。

FIG-FILES-001、FIG-DETAIL-004、FIG-PREVIEW-013 原已 pending 且当前正文没有旧引用，继续保持并补充 PRD-0173 类型标识与菜单变化的失效原因；历史图标选择临时核验图没有正式图号，不作为当前证据。目标流程示意 local-commit-flow 未展示图标设置，继续沿用；本轮不新增 PRD 正式截图或扩写无关文件规则。PRD 构建成功，25 个模块的阅读页与索引同步；生成页已核对 PRD-0173 及类型标识规则，本次格式检查通过。不运行全量测试或双重审查。

## 文件历史底部说明精简（2026-10-14，非语义）

`TaskFileHistory.tsx` 移除底部“记录保存在当前浏览器”及其分隔线，存储、默认最新选择与比较行为保持。既有定向 SSR 经临时 SVG 适配 1／1 通过，代码格式检查通过；无新增测试或截图。纯文案精简，不新增日志，模块正文、PRD-0172 与版本保持，既有 pending 状态不变。

## PRD-0172：文件历史默认选择最新记录（2026-10-14）

用户要求默认选择最新一条。模块 11 的规则与验收调整为打开或重新打开历史时选中现有记录中版本号最高的一条，并直接显示左侧差异；切换旧记录及空历史规则保持。`last_change` 更新为 PRD-0172，模块版本 1.0 与产品版本 1.1 不变，PRD-0171 日志及旧证据保留。

代码已核验：`TaskFileHistory.tsx` 复制记录后按 `version` 降序排列，以最高版本的实际记录 ID 初始化选择；有效的手动选择保留，选择失效时回到实际最高版本，空历史保持原空状态。仅调整初始选择，不改差异库、快照、自动递增、权限或完整历史引用读取边界。

本轮既有 SSR 单用例更新后在应用 tsconfig 与临时 SVG 适配下 1／1 通过，覆盖输入数组乱序、唯一最高 v5 选中与比较面板、空历史；应用 TypeScript、结构门及代码格式检查通过。原 5173 主目录服务的合成示例组件加载实际 `task-file-editor.css` 后，左侧内容区与右侧历史栏独立显示；打开即选中 v3 并显示 v2／v3 比较，切到 v2 后关闭重开恢复 v3，最终 error／warn 为空。主代理已目视核对 `/tmp/taskdoor-file-history-default-latest.png`；临时文件与标签已清理，没有视口改动，截图只作示例组件核验、不登记正式资产。这些证据限本轮初始选择及切换，不证明真实任务保存，不复用上轮 23 项测试、长列表或窄屏结果，不重复前端生产构建，不称整个渲染套件通过。

不新增正式截图，三张既有文件图的 pending 状态保持；本轮只做与初选相关的必要核验及 PRD 构建，不运行全量测试或双重审查。

## PRD-0171：独立历史栏与代码差异比较（2026-10-14）

用户最终确认左侧代码差异比较、右侧独立更新历史，默认不选择记录，选择后才查看比较。模块 11 的流程、比较数据边界及 `last_change` 同步为 PRD-0171，产品版本保持 1.1、模块版本保持 1.0；PRD-0169 日志与旧证据保留，另一线程已登记的 Toast PRD-0170 不改写，不发布新版本。

代码来源：`TaskFileHistory.tsx` 使用 Radix Tabs 与项目 Button／ScrollArea／Badge／Empty，`selectedId` 初始为 null；右侧独立清单展示保存记录的作者、版本、时间和当前版本，左侧初始提示选择版本。手动激活记录后在左侧动态加载 `TaskFileRevisionDiff.tsx`；`TaskFileExplorer.tsx` 使用宽历史弹窗并带入文件路径。`task-file-history.css` 保留左右内容区与窄屏历史栏布局，比较内容可横向滚动；窄屏目前只有源码证据，本轮视口设置未真正改变 1280px 逻辑尺寸，不记录 390px 页面验证通过。

差异绘制使用已发布的 `react-diff-viewer-continued@4.4.0`：左右比较、行号、红绿整行及字符高亮、仅显示修改与展开上下文、完整比较的虚拟长列表均由该组件处理。`task-file-editing.ts` 的新修订保存独立完整 `beforeContent`／`afterContent` 快照；读取校验成对存在、格式及当前正文一致性，损坏记录保留并拒绝覆盖。`task-file-revision-diff.ts` 将文本、PDF 页文本和表格结构转为比较文本，保留页边界、工作表名、列及单元格；旧记录缺少快照时只返回已有 `changes`，界面明确提示仅保留修改片段，不借当前正文拼造完整旧文件。这些本地正文快照不代表原始二进制完整版本服务，也不证明外部历史引用已打开当时完整版本。

本轮文件编辑定向检查 23／23 通过（既有 18 项与新增快照／转换 5 项）；既有历史右栏默认未选中 SSR 单用例使用应用 tsconfig 与临时 SVG 资源适配后 1／1 通过，不记为整个渲染套件通过。应用 TypeScript、结构门、Vite 前端生产打包及相关格式检查通过；Toast PRD-0170 当时记录的缺失组件诊断保留其历史范围，本节登记文件组件补齐后的最终结果，不运行全量测试或双重审查。

主代理在原 5173 主目录服务的临时示例组件页实测默认未选中、左侧选择提示和右侧清单，切换版本后左侧比较更新；Arrow／Enter 可选择记录，未修改上下文可展开，3000 行虚拟列表可滚动到尾。Escape 关闭后重新打开仍无选中 tab、没有差异表格，左侧提示选择。最终日志 error／warn 为空；临时页面、源码与标签已清理，视口恢复。页面使用合成示例 props，结论限真实组件的比较与交互，不证明真实任务入口的完整保存链或跨端能力；未沿用旧版单列呈现或 390px 验证。

`/tmp/taskdoor-file-history-code-compare.png` 仅为临时示例组件核验图，没有正式 PRD 图号，不新增页面资产。清单没有已采集版本历史图，FIG-FILES-001、FIG-DETAIL-004、FIG-PREVIEW-013 继续 pending，不恢复旧图状态；完整历史引用读取、回滚、恢复、正式提交及既定权限的原有边界保持。

## 创建卡片宽度收敛（2026-10-14，非语义）

用户最终要求只收窄示例补问及关系确认，loading 保持原有整行宽度并与顶部任务面包屑左侧对齐，任务卡片保持改动前大小。`src/features/tasks/styles/task-creation-page.css` 已删除非初始内容通用 960px 限制和 planning 的 960px 限制，只保留 clarify／decision 最大 720px；planning／clarify／decision 采用 `margin-inline: 0`，review 无新增 width／margin 限制。既有 motion 容器的 `data-stage` 属性用于区分阶段。路径栏原位、内容决定高度、窄屏布局、中性底色及纯色按钮保持；逐步回答、上一步、方案编辑和确认规则不变，AI 入口可理解性问题未实施。最终范围已同步到[待提交汇总第 7 项](../../artifacts/product-audit/product-sync-pending-issue-2026-10-14.md#4-创建流程去色局部宽度与离开确认)，PR 链接待补，未修改正式项目或发布 issue。

补问当前证据继续适用：主工作区 `http://127.0.0.1:5173/`、1600×900 下两道补问卡均左侧 423px、宽 720px，与创建页作用域内路径栏左边界一致；390×844 下第 2 题左侧 16px、宽 358px，路径栏同为 16px，文档 `scrollWidth=390`。FIG-CREATE-005／006 与 FIG-PREVIEW-029／030 的原路径中文实拍均为完整当前补问页面、JPEG 1600×900，继续沿用；`/tmp/taskdoor-clarify-left-mobile.jpg` 为临时窄屏证据，不登记为正式 PRD 资产。关系确认的 720px 居左仅核对源码，未运行对应分支。

恢复尺寸后的当前实测来自同一 5173 补问示例：1600×900 下初次思考及回答两题后生成方案的两次 loading 均左侧 423px、宽 1120px，创建页和内容容器同为 1120px，路径栏左侧 423px。主任务审阅卡、底部操作栏、内容容器及创建页均左侧 423px、宽 1120px；继续拆解后的主卡与实际一张子卡也均左侧 423px、宽 1120px，恢复原创建页宽。390×844 下创建页、主卡及子卡均宽 358px，文档 `scrollWidth=390`。本轮未重测窄屏 loading，桌面两次 loading 实测不扩大为窄屏覆盖。当前 loading 临时实拍 `/tmp/taskdoor-loading-original-width.jpg` 已核验真实 JPEG 1600×900，不登记为 PRD 正式资产。

FIG-CREATE-007／FIG-PREVIEW-031 已复用登记为新路径 `clarify-review-original-size-zh.jpg`，核验真实 JPEG 1600×900 与当前原宽主任务审阅页面，恢复 captured 并在模块 07 保留相同图号、替代文本和图注。FIG-CREATE-028 的 390×844 离开确认不受本次撤回桌面限制影响，继续沿用而不证明桌面尺寸；FIG-CREATE-023 继续 pending。此前 loading 的左侧 423px、宽 960px，以及 review 的左侧 503px、宽 960px、左右留白各 137px，均为已撤回限制的试排历史；旧 `/tmp/taskdoor-creation-loading-left.jpg`、旧审阅图及更早720px补问居中测量均不作当前事实。

收窄阶段已验证逐步回答、上一步保持两题答案与 Enter 生成后目标／完成标准承接回答，应用 TypeScript、结构门及当时 PRD 构建通过。当前原宽 loading／主任务／一张子卡的桌面实测、主子卡窄屏实测与 007 重采已完成；运行日志 error／warn 为空，测试方案已丢弃（创建面板为0），视口恢复，自建标签关闭。最终 PRD 构建已通过，25 个模块阅读页与索引同步；当前原尺寸007截图、创建与预览的复用登记及生成页实际图片已核验，本次格式检查通过。本次仅改 CSS，不新增逻辑、业务规则、语义变更 ID、版本或模块 `last_change`；未确认创建或发送邀请，不扩大为真实 AI、正式保存或全部分支已验证，不运行全量测试或双重审查。

## 任务创建全过程与方案卡片去色（2026-10-14，非语义）

用户明确先处理创建过程中及方案卡片的彩色底色与渐变；所提供截图来自正式项目，其预览卡仍有浅色渐变。PM demo 的初始描述页装饰、主任务与子任务审阅卡、已有任务卡外层及共享旧创建对话卡片统一采用中性底色，创建主操作按钮保留操作色并改为纯色。状态、头像、焦点等功能色继续保留；创建、编辑、拆解、确认与“AI 帮你改”行为未改。用户提出的 AI 调整入口可理解性问题仍待讨论，本轮未实施该项方案。正式项目去色已经补入[今日待提交草稿](../../artifacts/product-audit/product-sync-pending-issue-2026-10-14.md#4-创建流程去色局部宽度与离开确认)及[本批待提交草稿](../../artifacts/product-audit/taskdoor-p0-batch-issue-draft-2026-10-14.md#6-任务创建视觉去色)，未修改正式源码或发布 issue，本批 PR 链接待补。

源码证据为 `src/features/tasks/styles/task-creation-page.css`、`task-creation-linear.css`、`task-creation-subtask.css` 与 `src/shared/styles/pm-global.css`。主工作区实际应用 `http://127.0.0.1:5173/` 的 1280×720 页面已核验：初始描述页 `before`／`after` 伪元素 `content: none`、`backgroundImage: none`；输入现有 Mock“整理下周例会纪要”后，`data-tone="blue"` 主卡为 RGB(255,255,255) 白底且 `backgroundImage: none`，创建按钮为 RGB(75,110,223) 纯色且无背景图。继续拆解时主卡保持中性，生成的 pink／purple 两张子卡均为白底、无背景图；390×844 下三卡同样为白底，文档 `scrollWidth=390`。未确认创建或发送邀请。临时页面核验图片为 `/tmp/taskdoor-creation-neutral-review.jpg`、`/tmp/taskdoor-creation-neutral-mobile.jpg`，不登记为 PRD 正式资产。已有任务卡原本中性，本轮外层 hero 统一中性；共享旧对话的 plan panel／output／subtask／receipt 仅完成源码核对，未运行对应分支，不扩大为全部创建分支已实测。

旧 FIG-CREATE-028 因预览底图变化先恢复 pending；随后从同一实际应用重新采集 390×844 的离开确认 JPEG `docs/prd/assets/task-creation/discard-confirmation-neutral-zh.jpg`，“继续编辑”后方案保留。该图只支持弹窗呈现及本轮继续编辑结果，不证明正式服务或所有离开出口；旧创建图继续保持 pending。应用 TypeScript 首次因另一并行改动尚未补齐 `TaskFileRevisionDiff` 而失败，组件补齐后重新执行成功；结构检查通过。备用临时组件入口未使用，已删除。本轮仅为视觉修正，不新增变更 ID、不修改版本或模块 `last_change`，不运行全量测试、双重审查或发布新版本；主代理已完成 PRD 构建，25 个模块阅读页与索引同步，生成页内的新 JPEG 与 FIG-CREATE-028 已核验；本次文件格式检查通过。恢复后的创建核验未出现新增 error／warn；核验方案已丢弃、视口恢复、自建标签关闭。

## PRD-0170：统一 Toast 停留时间（2026-10-14）

用户明确要求所有位置的 Toast 一并调整到合适时长。模块 15 新增统一操作提示规则，`last_change` 为 PRD-0170；当前产品版本保持 1.1、模块版本保持 1.0，不发布新版本。

代码来源为 `src/shared/ui/toast.tsx`：普通成功／信息提示与 Provider 默认时长统一为 2500ms；错误、带操作或补充说明的提示为 5000ms。邀请、责任保存、个人资料、复制、上传、完成确认和分析等调用点共用此入口；静态演示通过 `src/prd/StandaloneToast.tsx` 与 `scripts/build-shared-toast.mjs` 使用同一组件。`scripts/build-agentdoor-prd.mjs` 将阅读页及账号校验参考页的独立复制浮层改为共享 Toast，复制失败也显示错误提示；两个输出层级分别使用 `../shared` 与 `../../shared` 资产路径。

当前 Base UI Viewport 实现已核验鼠标悬停、键盘聚焦及窗口失焦会暂停计时，相关交互代码本轮未改。名称／目标的就地保存反馈、复制按钮状态及表单错误不属于 Toast，本轮保留各自原有规则。此变更调整计时与组件复用，不新增恢复能力，也不改变既有文件删除目标和本地撤销实现差异。截图清单未登记 Toast 计时或 PRD 复制浮层的当前截图，本轮无需要失效的对应资产，不采集新图；静态截图不能证明自动关闭时长。


本轮验证：共享 Toast 构建成功；PRD 构建生成 25 个模块，生成页已包含 PRD-0170 及 2.5／5 秒规则；两个阅读页的共享 CSS／JS 资产路径、复制成功／失败处理及模块索引核对通过；Toast 与 StandaloneToast 的定向 TypeScript 检查、结构门和本次文件格式检查通过。应用范围 TypeScript 检查仍被当前文件版本组件的缺失 `TaskFileRevisionDiff` 引用及其 `revision` 属性错误阻挡，位置为 `TaskFileHistory.tsx:15/32`，该文件不是本轮修改；不记为应用检查通过。本轮未执行浏览器计时实测、全量测试或双重审查。

## PRD-0169：版本记录默认收起与按需展开（2026-10-14）

用户要求版本记录默认全部收起，点击记录后才展开详情；概要左侧展示版本号和更新时间，右侧展示更新人，保留已有实际版本递增。默认展开方式属于操作流程变更，模块 11 正文、功能验收条件和 `last_change` 同步为 PRD-0169，当前产品版本保持 1.1、模块版本保持 1.0，不发布新版本。单列旧内容删除线后接新内容、自然换行和共用滚动区属于本轮同时收口的呈现约定；PRD-0168 日志及旧验证证据完整保留。

代码已核验：`TaskFileHistory.tsx` 的共享 Accordion 不再指定默认展开项，各条记录按点击独立展开；概要左侧显示真实版本和 `createdAt` 保存时间，右侧使用已保存作者，当前版本 Badge 保留。差异在同一纵向容器使用 `del` 展示旧内容、`ins` 展示新内容，没有可见前后标题，前后语义通过 `aria-label` 和数据标识保留。`task-file-history.css` 仅为长内容提供自然换行，没有每段独立高度限制与滚动，版本列表继续使用共享 ScrollArea。版本生成与保存仍沿既有 `task-file-editing.ts` 路径，本轮没有修改实际自动递增或存储规则；原 20 项 SSR 和 5175 页面结果不作为新流程验证。

单列差异呈现已由主工作区 5173 同一服务的临时组件页核验，使用新构造示例 props，未读写任务数据。主代理当时实测 1280×720 弹窗宽 672px，390×844 弹窗宽 358px；5 组差异均为旧删除线后接新内容、上下单列同宽，无可见前后标题，所有 `pre` 无独立横向／纵向溢出；外层 PageDown 后 `scrollTop=460`，长中文与连续 URL 在窄屏无横向溢出，运行日志 error／warn 为 0。这些结果只支持单列差异呈现、换行和统一滚动，不单独作为随后默认收起及概要调整的实测。

最终默认收起与概要布局也已在该主工作区 5173 临时组件页实测，使用合成 props，没有读写任务数据。1280×720 下 v3／v2 两条记录默认 `aria-expanded=false`，差异数量为 0，作者均位于版本号右侧；鼠标点击 v3 只展开该条，v2 保持收起，显示旧 `del` 后接新 `ins` 的单列差异。Escape 关闭后再次打开，两条仍全部收起。390×844 下，动画稳定后的弹窗宽 358px，无横向溢出，作者保持右侧；Enter 可展开 v3，5 组长中文与连续 URL 仍单列且无横向溢出。运行日志 error／warn 为 0，临时页已关闭、临时源文件已删除，视口已恢复；此前动画未稳定尺寸不作为最终证据。

主代理本轮应用 TypeScript 检查通过，既有 `server/taskFileEditing.test.ts` 18／18 项通过，包含无有效变化不增版本、自动递增及历史保留。既有 `taskFileEditorRendering.test.ts` 中“历史面板默认收起”单用例已同步默认收起、概要版本／作者／时间及展开前不加载差异，并明确 zh-CN；使用应用 tsconfig 和 `/tmp` 临时 SVG 资源适配运行，同一用例 1／1 通过。原始 Node 命令仍被既有 `.svg` 导入阻止，不修改正式测试运行配置，也不将整个渲染套件记为通过；相关代码与测试差异格式检查通过。结论限当前组件的默认收起、展开、概要及差异呈现，以及既有本地版本生成保存逻辑；不扩大为真实任务入口端到端保存、完整历史正文读取或跨端能力。

截图清单没有已采集的版本记录图；FIG-FILES-001、FIG-DETAIL-004、FIG-PREVIEW-013 已处于 pending，本轮继续保持。单列呈现的 `/tmp/taskdoor-file-history-stacked.png` 与最终收起态的 `/tmp/taskdoor-file-history-collapsed.png` 及对应窄屏图均为示例内容临时核验，不登记为正式 PRD 页面资产，不恢复旧图状态。本轮不扩大完整历史正文、回滚、恢复、正式提交或权限，不运行全量测试或审查。

## PRD-0168：文件浏览、上传与版本核对交互（2026-10-14）

本轮优化任务文件根及文件夹浏览、上传目标与处理反馈、移动目的地和版本记录。正式规则与功能验收条件归模块 11，模块版本保持 1.0、当前产品版本保持 1.1；保留本轮开始前的 PRD-0152 文件树宽度与设备偏好改动，不发布新版本。

代码来源：`TaskFileDirectory.tsx` 按当前位置展示非归档直接子项、文件夹优先及名称排序，复用文件图标、操作菜单和真实版本／更新时间记录；`TaskFileExplorer.tsx` 接入任务文件根入口与位置路径、窄屏目录打开、上传目标弹窗、拖入提示、实际完成数量、上传锁、成功提示与失败反馈。`task-file-upload.ts` 将成功处理的整批文件放入最新文件树，保留等待期间的整理；同级同名继续追加编号，目标已删除、归档或不再是文件夹时拒绝添加。真实二进制准备仍复用 `discussion-uploads.ts`，每批最多 10 个、单文件 20 MiB 的现有本地限制不变，不将它们登记为本轮新增的正式容量规则。

`TaskFileDialogs.tsx` 与 `task-file-action-options.ts` 按有效树层级列出任务文件根和可用文件夹，标注当前与目标路径，禁止同位置、自身、后代及不可用目标提交。`task-file-icons.ts` 统一图标映射，选择器采用无可见文字的图标网格，保留提示、可访问名称、当前选中状态及方向键。`TaskFileHistory.tsx` 继续使用已保存的修改记录，明确版本、作者、时间、当前版本、修改位置与前后内容，空记录不填补既有版本历史；对应呈现归 `task-file-editor.css`、`task-file-actions.css`、`task-file-history.css` 和双语文案。

用户追加要求优先使用成熟现成框架后，本轮沿项目 base-nova shadcn／Base UI 收敛呈现：通过官方 CLI 新增 Table、Badge、Empty、Field、Label、RadioGroup、ScrollArea、Progress、Spinner、Separator 十个 `shared/ui/` 组件源码，复用已有 Button、Input、Dialog、DropdownMenu 与 Accordion，没有新增依赖或覆盖全局预设。目录使用 Table／Badge／ScrollArea／Empty，操作弹窗使用 Field／Input／RadioGroup／ScrollArea／Button，版本记录使用 Accordion／Badge／Empty／ScrollArea；上传复用 Progress／Spinner，必要 CSS 仅承担布局、滚动和窄屏适配。窄屏目录保留名称与版本／子项数、省略更新时间列，时间数据和版本记录不变；当前代码按文件预览容器不超过 560px 时执行此布局。此响应式取舍已补入模块 11 与同一条 PRD-0168，其余主要业务交互与产品规则不变，不新增变更 ID。

第一轮文件相关行为检查共 32 项通过，其中 3 项上传放置与 4 项新移动目的地检查先失败后通过；移动代理的 4 项与既有文件树 7 项合计 11／11，现成组件收敛后这 11 项与类型检查仍通过。第二轮未修改这些行为 helper，不将第一轮 32 项记为第二轮重跑结果。现成组件版版本历史的独立 SSR 定向脚本渲染 2 个状态、20 项断言通过，覆盖框架空态、按钮、滚动区、Accordion 默认展开、真实修订倒序与原数组保护、当前版本、作者时间、修改数、前后内容、换行与键盘可聚焦差异区域；组件与独立样式的差异格式检查通过。此前手写版本的 16 项仅属第一轮结果，不用于证明最终组件。原 `taskFileEditorRendering.test.ts` 整个套件被 Node 的既有 `.svg` 加载问题阻止，未记为通过；不运行全量测试或双重审查。

第一轮运行核验使用主工作区 Vite build 产物的隔离预览 `http://127.0.0.1:5175/`，桌面 1280×720 与窄屏 390×844 下，根／文件夹列表、上传到所选文件夹、编辑保存 v1→v2、真实历史作者时间及前后差异、移动同位置禁用及移到根、24 图标的 End＋Enter 应用、20 MiB 超限失败保留列表均已通过根代理实操。5173 既有 HMR 启动反复卡加载，因此没有将其记录为本轮成功页面来源。这些是第一轮页面结果，不作为现成组件版最终布局与操作证明。

第二轮用成熟组件版的同一主工作区 build 产物预览地址复核：1280×720 下，Table 正确展示文件夹直接子项，任务文件根导航可用；标准上传 Dialog 显示目标，选择文件完成实际上传、成功提示并打开新文件正文；新文件 v1 的版本记录为空态，刷新后既有 v2 正文保留，Accordion 默认展开真实作者时间与行差异。390×844 下，目录省略更新时间列但名称、版本和操作仍可用，页面 `scrollWidth=390`；版本差异为 326px 单列，Escape 可关闭；24 个纯图标 Button 保留当前选中态，Home 将焦点移至首项，Escape 关闭后恢复菜单触发器；移动 RadioGroup 选中当前根位置时禁用提交，Down 选择“交付成果”后目的地更新并启用移动，取消保持原位。最终运行日志无 error／warn 或框架报错遮罩。

第二轮未再次实际执行拖拽、超限、移动确认提交或图标选中提交；这些分支仅保留第一轮实际提交或失败结果及代码证据，不混称为最终组件版逐项复核。最终应用 TypeScript、结构门与 Vite 前端打包已由根代理执行通过，本轮 PRD 构建成功，25 个模块的阅读页与索引同步，生成页包含 PRD-0168、文件浏览上传与窄屏展示约定；不将 Vite 打包记作标准完整应用构建。

当前证据限 PM demo 的文件浏览、整理、二进制本地准备及已保存修改差异。历史引用仍仅提示引用版本与当前显示版本，尚未切换到当时版本的完整正文；正式上传会话、防重复版本、跨端保存及不可改写的正式提交不由本轮证明。既有删除后撤销和文件夹归档入口与模块 13 的正式文件不可恢复目标仍存在差异，本轮未扩改这些规则或既定权限。

FIG-FILES-001、FIG-DETAIL-004、FIG-PREVIEW-013 复用旧文件页图片，继续保持 pending 并追加本轮列表、上传及版本记录变化的失效说明；对应模块与全貌预览目前无旧图片引用。最终目录、上传、版本及图标的临时核验截图保存在 `/tmp`，尚未放入 PRD 资产或登记为正式图号，不据此恢复旧图状态，不新增或伪造当前截图。

## PRD-0167：创建方案离开确认与真实分析 Skill 接入要求（2026-10-14）

用户明确：创建预览尚未保存为任务，有内容时返回或离开需要二次确认可能丢失；取消保留，确认丢弃清理本次会话。预计投入等创建字段仍需保存，预览未保存不改变确认创建的保存义务。本轮优先落实 demo 的未创建内容保护，不修改初始估算提交链或接入 AI 服务。

模块 07、12 与现行交互基线同步；模块 07 收口主动离开、浏览器原生提示、空白／成功例外及内部步骤保留，模块 12 明确主动重新分析重新执行 `agentdoor-task-status-analyzer` 及其 Prompt、共享规则与输出契约，校验并保存结果后才提示成功。既有 Skill、规则和评测成果属于可复用输入，不作为产品按钮已经接通真实服务的证据。

本地正式项目只读核验：`apps/web/src/ai/index.ts:188` 的 `repredictTaskProgress` 委托 `mockRecalculatePrediction`；`components/TaskDetail.tsx:495` 的已完成／已取消分支只重读协作；`TaskCommentUseCases.java:249` 仍校验被 @ 者已有任务访问权。本轮不修改正式项目，不调用模型。@ 自动加入的 demo 已实现事实沿 PRD-0166 记录，正式接入继续单列。

代码来源：`src/app/App.tsx` 的 `requestCreationExit` 延后整个离开动作，取消不改当前位置／团队或输入；`TaskCreationPage.tsx` 注册 `CreationExitController`，停止规划、拆解与 AI 调整，增加 `beforeunload` 原生提示。`TaskCreationDiscardDialog.tsx` 复用现有 `AlertDialog`，默认聚焦“继续编辑”，另一操作为“丢弃并离开”；`creation-messages.ts` 提供双语文案。`task-creation-exit.ts` 判定非空会话并只清理当前未创建记录，保留其他及已创建历史，读写失败保留内容。历史入口隐藏期间不再持续持久化未提交方案。

主代理亲自执行新增 `server/taskCreationExit.test.ts` 的 9 项定向检查，全部通过；应用 TypeScript 检查通过，结构门无新增违反。主工作区当前 `http://127.0.0.1:5173/` 窄屏运行核验：空白返回无弹窗；非空输入离开弹窗默认聚焦继续编辑，取消保留原文；预览取消保留标题和完成标准；确认丢弃后新建为空白；生成中放弃后新页面没有晚结果回填；切团队取消仍保持原团队及输入。未在运行 UI 模拟存储失败、刷新原生提示或实际提交创建，不把代码和定向检查泛化为全部出口运行覆盖。

FIG-CREATE-028 是本次主工作区 516×720 简体中文预览上离开确认实拍，资产为 `docs/prd/assets/task-creation/discard-confirmation-0167-zh.jpg`。已检查 JPEG 格式并按真实扩展名登记，截图呈现提示内容及两个操作，仅证明弹窗呈现，不代替取消、清理、异步保护或保存结果验收；既有创建图的 pending 状态保留。

本批事项集中在[待提交 issue 草稿](../../artifacts/product-audit/taskdoor-p0-batch-issue-draft-2026-10-14.md)，包含 PRD-0165 保存反馈、PRD-0166 @ 自动加入、本次创建离开确认及真实分析 Skill 待接入。旧 issue #40、#44 已提交，草稿仅指向本批且不填未经创建的 PR 链接。PRD 构建成功，25 个模块阅读页与索引已同步，生成页包含 PRD-0167 及本次规则和截图；不发起模型请求、运行全量测试或双重审查，不发布新版本。

## 编辑说明文案精简（2026-10-14，非语义）

用户明确不需要“正在编辑原文”说明。本轮移除 `TaskDetail.tsx` 名称／目标聚焦时的说明、`DiscussionMessages.tsx` 文件讨论编辑时的同类小字，以及 `TaskCreationEditableText.tsx` 的同名悬浮提示，并清理不再使用的样式。原文编辑、翻译阅读和名称／目标保存反馈保持原规则。

本次为视觉文案精简，不新增 PRD 变更 ID，不修改模块版本或 `last_change`。页面已在当前工作区 `127.0.0.1:5173` 核验名称输入框聚焦后不再显示该说明；临时验证画面为 `/tmp/taskdoor-no-editing-original-hint.png`。应用类型和结构检查通过，源码核验三个入口均已移除该文案；未新增测试、运行全量测试、双重审查或发布新版本。

## PRD-0166：@ 自动加入参与者的本地接入（2026-10-14）

用户在再次明确正式项目 DIS-2 后，要求先在当前本地 PM demo 实现。产品目标沿用模块 10 的同团队有效成员提及及发布成功加入参与者规则，不新增角色审批或改变负责人；本节更新 PRD-0164 当时的本地实现差异，正式项目的源码和部署未由本轮改动。

代码来源：`src/features/tasks/lib/task-mention-publishing.ts` 校验当前团队有效人员、任务存在、操作者讨论资格及最新任务记录，准备任务参与者、加入活动和旧创建快照；通过 `saveCollaboration` 的事务写入桥接复用 `commitTaskAiStorage`，一次成组保存消息、附件、通知事件与人员记录。`useTaskCollaboration.ts` 只在持久保存成功后发布快照；`TaskDetail.tsx` 的任务讨论、回复和文件讨论沿同一个发布方法，并为未成功的相同草稿保留消息 ID；`App.tsx` 提交时重读当前团队成员，成功后同步列表、详情与旧任务快照。

本轮定向验证：`server/taskMentionPublishing.test.ts` 8 项与既有 `taskCollaboration.test.ts` 19 项共 27／27 通过，覆盖成组回读、失败回滚、普通文本不加人、已有关系与重试去重、无效团队成员、当前发言资格、删除／跨团队／过期任务、回复及文件讨论和旧创建任务。应用 TypeScript 检查通过。另运行讨论接线文件 10 项，9 项通过；活动入口的一条源码正则断言在独立 HEAD 基线复现同一失败，与本轮未修改的 `TaskActivityLog.tsx` 有关，未扩大修改该历史断言。

当前工作区源代码的隔离运行页面 `http://127.0.0.1:5174/` 已核验：原任务参与者只有陈默、林洁，选择 @ 苏禾并编辑草稿时未加人；发布成功后苏禾出现在参与者中，讨论数量增加一，活动显示新增参与人，刷新并重新打开后仍保留。临时验证画面保存在 `/tmp/taskdoor-mention-implemented.png`，未用它替换 PRD 的既有布局截图。通知事件已与讨论成组保存，通知中心仍未接入该事件投影；本地结果不证明正式服务端访问权、跨端并发或真实通知投递。未运行全量测试、双重审查或发布新版本。

## PRD-0165：名称与目标失焦保存反馈（2026-10-14）

用户要求设计并在 PM demo 更新现有名称与目标的失焦保存成功提示。对应目标为字段旁显示勾与“已保存”，保持 2 秒后淡出；每个字段及任务的反馈独立，再次编辑清除，只有有效修改且保存成功后显示，不新增全局成功提示。模块 08 与现行交互基线同步；本轮不扩大为失败重试、其他 P0 或正式项目接入。

代码来源：`src/features/tasks/components/TaskDetail.tsx` 接入名称与目标的独立保存反馈，名称 Enter 保持失焦提交与输入法保护；`TaskFieldSaveFeedback.tsx` 呈现勾与中英文状态文字；`src/features/tasks/lib/useTaskTextSaveFeedback.ts` 管理独立状态、短暂反馈和过期回执，开始编辑、切换任务及卸载时取消旧反馈；`task-text-editing.ts` 准备不可变字段更新。`src/app/App.tsx` 的两类更新回调复用 `persistTaskDefinition`，在恢复日志成组保存成功后才发布新状态；双语文案与样式分别归 `src/shared/i18n/detail-messages.ts` 和 `src/features/tasks/styles/task-detail-split.css`。实现判断及边界见[当前实现矩阵](current-implementation-matrix.md)。

本轮最小验证：新增字段更新 4 项与既有恢复日志保存 32 项共 36／36 通过；应用 TypeScript 检查通过，结构门无新增违反，相关改动格式检查通过。主工作区当前运行页面已核验名称“已保存”短暂显示后消失、未改值只聚焦离开不出现反馈，目标修改后刷新保留已保存内容。尚未用真实运行 UI 模拟存储故障或延迟；代码保护与本地验证不作为正式 API 或跨端保存证明。

旧 FIG-DETAIL-002 概览图保留历史文件并转为待采集，从当前模块正文撤下。FIG-DETAIL-021 为主工作区当前运行时的窄屏实拍，目标字段旁的“已保存”清楚可见；完成标准的键盘焦点提示同时出现，遮挡部分目标正文，因此仅登记为就地反馈的运行证据，不放入模块正文，不用于证明桌面双字段、保存故障或延迟覆盖。资产为 `docs/prd/assets/task-detail/task-save-feedback-0165-zh.png`，截图清单已同步。名称与目标原值在页面核验后已恢复，验证产生的少量活动记录仍保留，不将其描述为全部数据已还原。

PRD 构建成功，25 个模块的生成阅读页与模块索引已同步，并核对本次保存反馈规则及 PRD-0165；不发布新版本。

## PRD-0164：P0 评审收口与正式项目限制（2026-10-14）

用户明确：完成标准没有拖动顺序入口，不为此新增重排功能；子任务层级沿用本地正式项目的团队配额，默认 10 层、绝对上限 20 层；子任务目标已有独立编辑，不要求与父目标不同；具备当前任务发布讨论资格的人可 @ 同团队有效成员，发布成功时自动加入非负责人／参与者，不再设置单独加人角色权限；主动重新分析须实际调用任务分析 Prompt 与 AI 机制。

本轮同步模块 07、08、09、10、12、13、15 和交互基线，替代旧四层上限、子任务不能沿用父目标、提及不能增加参与关系和模糊的刷新即分析表述。完成标准的稳定身份与版本保护仍保留，不新增拖动、上移或下移入口。历史日志、四层示例及冻结评测内容保持原事实；当前层级只以模块 07 的团队配额为准。

代码核对限当前本地源码：demo `TaskCriteriaFields.tsx` 只有编辑、删除和追加；`TaskDetail.tsx` 的目标支持失焦修改，`task-goal.ts` 读取各任务已保存目标。正式项目 `services/task-collaboration-service/.../TaskQuota.java` 默认 10、绝对上限 20，创建、批量创建、移动和恢复使用实际团队配额。当前 planner Skill 与递归方案 Schema 没有四层硬限制，不为修改层数批量改写历史示例或评测。

@ 发布的当前差异：demo 候选已包含同团队有效成员，但 `postDiscussion` 只保存提及和通知，人员在另一存储链保存；正式服务仍拒绝尚无任务访问权的被提及者。新行为必须在同一次发布中保存消息与新增参与关系，不能先发消息、后加人并称为原子成功。操作者按讨论资格校验，不额外要求团队管理员或独立加人权限。原文 `@姓名` 不产生关系，提交时校验明确成员 ID 仍属于当前有效团队，草稿和失败不加人，删除消息不自动移除参与者。

重新分析当前差异：demo 与正式项目任务详情仍委托模拟重算，终态只重读记录；正式 AI orchestration 目录尚无现成任务分析接口。测试工作台已有模型调用、分析 Skill 加载和输出校验，但它们不等于产品任务分析服务。真实接入需要读取已保存且有权访问的上下文、发起分析、验证并保存结果；工作台模型测试通过不作为产品按钮已接通的证据。

本轮只修改需求与评审记录，没有修改应用或正式项目源码，没有发起模型请求。界面与截图事实不变，既有截图状态保持；PRD 构建成功，生成页与模块索引同步；本轮仅做文档规则和格式校验，不运行应用测试、全量测试或双重审查，不发布新版本。

## PRD-0163：团队日历与 P0 复核（2026-10-14）

用户在 P0 逐项讨论中明确要求统一“今天”的时区判断。本轮按现行模块 02 的团队时区规则接入 PM demo：团队时区作为保存数据，新团队捕获创建者设备时区，失败回退 UTC；日期相关调用使用当前团队上下文。`task-schedule.ts` 将明确时间点转为团队日历日，纯日历日期保持原值；列表日期筛选、截止显示、创建及截止校验使用同一入口；创建改期上下文、详情和图表日期使用相同团队时区，打开列表跨团队午夜时刷新相对日期判断。旧 demo 团队缺少时区字段时沿用原上海口径，避免成员设备切换改变旧团队结果。这是旧数据兼容边界，不作为默认所有团队采用上海的新产品规则。

代码来源：`src/shared/lib/team-time-zone.ts`、`useTeamTimeZone.ts`；团队数据和创建路径为 `src/ai/mock/data/memberProfiles.ts`、`src/features/members/lib/team-limits.ts`、认证工作区准备及 `CreateTeamDialog.tsx`；任务日期入口为 `src/features/tasks/lib/task-schedule.ts`、`components/task-list-filters.ts` 和相关工作区、列表、详情、创建调用。

本轮必要日期验证共 37 项通过：团队时区、列表、新团队及注册工作区的 32 项，加创建日期专项的 5 项。新增 11 项时区回归覆盖跨设备跨日、本周、春秋夏令时、纯日期、无效旧日期、新团队两条创建路径、非法时区保留数据与日期输入界面；修正后主代理再次执行新增 11 项，全部通过。应用 TypeScript 检查与结构门通过。混合运行中的 1 项旧零格进度 SSR 检查仅接受中文“未形成结果”，当前默认英文为“No results yet”；主代理在隔离 HEAD 源码副本单独执行该项，确认基线同样失败，未为本轮时区改动扩改语言断言。

实现范围限 demo 的团队日历数据与任务日期判断；团队时区设置、正式 API／CLI 与通知重调度未由本轮改动证明。具体时间点仍按用户设备显示，既有日历值与历史记录不改写。本轮没有新增日期控件或常规布局；认证语言菜单等既有截图不受影响，截图清单的既有待采集状态保持，不用旧截图证明新业务时区。

另外只读核对本地正式项目 `taskdoor` 的 `sand` 分支：已有完成标准稳定 ID、服务端层级配额与验权、团队日历和防重复请求标识；重新分析路由仍使用模拟计算。用户对子任务目标复用、@ 自动加入参与者、分析不新增来源入口、文件活动快照和两种邀请并存的意见，分别保留为确认方向或待补边界，集中在[P0 复核记录](../../artifacts/product-audit/taskdoor-p0-todo-2026-10-14.md)，不把这些讨论自动实施或覆盖当前正式模块。

## PRD-0162：创建与分析 Skill 同步（2026-10-14）

用户明确确认不强制拆子任务、初始预计投入由创建任务 Skill 生成且隐藏展示但保存，后续估算与进度由任务分析 Skill 更新，并要求当前字段中彻底删除前置依赖。模块 07、12、现行交互基线及共享契约同步这些规则；版本保持，不改写旧日志、旧规划协议或不可变历史评测包。

当前创建生产路径为 `agentdoor-task-planner/SKILL.md` 与 `task-preview.v1` 的说明、Schema、示例；Schema 删除前置依赖属性及 required 项，额外属性校验拒绝空旧字段。分析入口、EWD 工时规则和输出契约补齐必要估算／重估，`progress.estimate` 复用 EWD 估算结构；应用核对范围、权限及输入版本后保存，Skill 不生成保存回执或定时器。当前 MCP 适配说明不再指引依赖维护，旧核验工具来源保持为历史能力证据，不据此声称正式 Schema 已更新。

本轮修改 Skill、字段约定、示例、PRD 及必要的工作台加载／输入校验：识别新版 v8，延续标准覆盖与燃起图校验，排除分析和 EWD 输入中的旧依赖字段；隔离适配检查已通过。本机已安装 `~/.agents/skills/taskdoor-create-task` 也局部同步四个文件，保留其额外语言、候选与原子提交规则。当前 PM 创建审阅简化仍清空 `effortEstimate`，后续分析仍为本地模拟；这些应用接入差异登记在实现矩阵，不以 Skill 文件或协议校验证明真实模型和正式保存可用。产品任务界面及既有截图不变，不新增截图；已有待采集项保持。

本轮自动化准备进一步复现并修复 `task-preview.ts` 对已移除依赖字段的直接遍历异常，同时同步结构修正提示及旧验收转换。创建预览、方案调整、结构恢复及新版分析的相关本地检查共 28 项通过，工作台类型检查通过。`artifacts/skill-regression-2026-10-14/` 保存 30 个隔离案例、来源清单及预检；用户明确授权 PPIO 后，用例和当前项目 Skill 冻结版本已保存到测试工作台并完成两个真实评测批次的生成及一次补判。实际批次、版本及请求 ID 记录在 `live-start.json`。

创建 12 条全部通过；分析 18 条中 7 条通过、6 条失败、5 条待判断。分析失败包括 5 条生成阶段 `UND_ERR_SOCKET` 连接中断，以及 1 条新增范围用例的第 5 条完成标准预期 0%、实际输出 50%；另外 5 条因判断阶段 `UND_ERR_SOCKET` 中断保持待判断。

原始生成模型为 `pa/mercury-5.5`，补判使用 PPIO 的 `qwen/qwen3.7-plus`，复用已保存输出、不重新生成。30 条中 20 条取得实际模型判断，5 条生成无有效输出仅记录本地 `insufficient`，另 5 条判断请求失败；本地记录不算作真实 AI 判断，待判断不计通过。证据见[本轮汇总](../../artifacts/skill-regression-2026-10-14/results.md)、[最终结果](../../artifacts/skill-regression-2026-10-14/final-results.json)与[补判记录](../../artifacts/skill-regression-2026-10-14/judge-progress.json)。创建批次为 `5d8876f0-b992-4dc2-b990-553aa4b71446`，分析批次为 `bd766f61-361a-4014-a1f2-8e729ff9c959`；融合评测平台的用户入口为 `http://127.0.0.1:15501/evals`，可直接查看已保存结果，不需要历史导入。结论限定为本次冻结 Skill 的方案生成与分析提案，正式任务保存、事件调度和用户确认写回仍按实现矩阵中的接入差异处理。

补判耗时展示已同步：已补判断的记录显示实际判断耗时，总计不含生成结束至补判启动之间的闲置时间。Jev 7 项定向检查、Timing 5 项检查、工作台与融合前端扩展类型检查及格式检查通过；融合界面已核验创建 12 条全部通过，示例记录的 4.7 秒／6.4 秒判断耗时可见。未再次重试模型请求，最终计数保持。

修复后的真实复测已结束。按原 30 条场景映射，创建 12 条、分析 18 条全部通过：原 19 条通过结果保持；5 条判断连接失败复用原输出补判，全部通过；5 条生成失败和 1 条修正预期后的用例在新批次 `6b710f31-d731-461d-b665-f77fd9f0b714` 独立重新生成并判断，6 条全部通过。原失败运行仍保留，以上初次回归的 19／6／5 记录不改写。模型和预算保持，证据见[修复后汇总](../../artifacts/skill-regression-2026-10-14/repair-results.md)、[原场景与新运行映射](../../artifacts/skill-regression-2026-10-14/repair-results.json)、[启动记录](../../artifacts/skill-regression-2026-10-14/repair-start.json)和[失败分析](../../artifacts/skill-regression-2026-10-14/failure-analysis.md)。

唯一原语义失败是旧用例把新增的中英文复合标准机械期望为 0%，忽略中文成果已有证据；不是已证实的 Skill 缺陷。用例改为按证据允许部分完成 25%／50%／75%，保留英文未交付缺口，并严格校验英文增量的完成工作量为 0。连接默认使用 `Connection: close`；三次对照均成功且使用新 socket，未证实陈旧连接复用，不能把该假说写为根因。此次 11 条受影响用例未再断连，不代表长期稳定性已经证明。连接处理与用例参考的 43 项本地检查、工作台类型及格式检查通过；融合平台页面核验新批次 6／6 通过。

### PRD-0162 验证结论更正与严格复测（2026-10-14）

明确撤回“原 30 场景／18 分析全部通过即可证明业务正确”的质量结论；以上报告与计数只保留为当时软验收历史。冻结输入审计发现，缺少原始比例预期被误写成未知，模型判断漏核了实际历史及预测字段。以输入中的独立 EWD 明细、交付正文、真实历史和落实的执行窗口建立 18 个基准，对 19 轮已保存输出执行完整自动断言与关系检查，**17 轮通过、2 轮失败**。`all-evidence`、`weighted` 无真实保存历史及正式起点却生成 `comparison`，前者还生成无据预测日期；不改写原运行或原始输出。证据见[参考审计](../../artifacts/skill-regression-2026-10-14/reference-audit.md)、[严格基准用例](../../artifacts/skill-regression-2026-10-14/strict-cases.json)及[严格审计](../../artifacts/skill-regression-2026-10-14/strict-audit.json)。

这 2 例随后使用新 ID 进行真实 PPIO 严格复测，批次 `a2ea744a-9d92-4543-83c2-97a4e176298c`：各 24/24 项程序检查通过，Qwen 各 2 项 `met`，`comparison` 均为 null。严格映射中的 18 场景／19 轮由 17 轮已保存输出及 2 条新输出组成，数值与来源检查通过；原 2 条严格审计失败继续保留，不能据新复测反称旧软验收可靠。[严格复测结果](../../artifacts/skill-regression-2026-10-14/strict-results.md)与[结果映射](../../artifacts/skill-regression-2026-10-14/strict-results.json)补充当前证据，不改变产品规则、模块版本或正式应用接入判断。

## 2026-10-13：附件条目直接展示（非语义排版修正）

用户要求去掉独立“附件”表头。提示词与预览直接在所属消息下列出附件 ID 和名称，同行及多个附件的分项空行保持；仅去除重复表头，沿用 PRD-0157，不新增日志 ID 或修改版本。既有中英文消息附件用例更新表头缺失断言后定向执行，1/1 通过；附件原名、来源归属和 ID 缺失提示保持。

## 2026-10-13：附件字段同行展示（非语义排版修正）

用户要求每个附件的 ID 与名称同行展示，中文用逗号“，”分隔，英文用“, ”分隔，多个附件分项留空行。共享附件格式在实际带入与预览中一致，原始名称及 ID 缺失说明保持；仅调整排版，沿用 PRD-0157，不新增日志 ID 或修改版本。既有“消息附件在中英文提示词与预览”用例增加同行断言并定向执行，1/1 通过；未运行全量测试、双重审查或额外截图。

## PRD-0157：讨论上下文与附件定位

用户明确要求讨论发言人称“用户”，讨论与回复标题为 `## 「{任务名称}」任务讨论上下文信息`，并带入附件 ID 和名称。模块 05 及当前交互基线同步；任务标题、原文、中英文语言选择、单层直接原消息和未发送输入排除继续适用。附件元数据扩展属于语义变更，登记 PRD-0157，版本保持 1.1；旧日志保留历史。

实现证据：`src/features/tasks/discussion/lib/task-discussion-ai.ts` 从当前消息及可用直接原消息的保存引用提取 ID 与原名称，不读取附件正文；旧单文件名称只有在当前可见文件唯一匹配时补 ID，缺失或同名时保留名称。`AiConnectionDialog.tsx` 在提示词与预览中按所属消息展示，未知 ID 使用当前语言的“未提供”说明；标题与用户字段、附件字段由 `globalUiMessages.json` 提供中英文文案。原消息不可用时不带其附件。

本轮最小验证：上下文预览、消息构建与任务基础上下文三个定向文件共 21 项通过，覆盖附件归属、原名称、旧记录缺口、不可用原消息排除、中英文模板与原文；结构检查无新增违反，前端 TypeScript 与格式检查通过。证据限本地 Demo，不代表正式项目或客户端已同步。现有截图清单没有上下文导出或预览截图，既有普通讨论及全局连接引导图片状态保持，不采集无关截图、不发布新版本。

## PRD-0156：上下文固定文案按界面语言显示

用户明确要求任务、讨论与回复连接 AI 的固定文案按当前界面语言显示，支持简体中文与英文，覆盖标题、分组名、字段名、末尾提示及来源缺口说明。任务名称、目标、消息正文、作者、ID 和原始保存时间等真实上下文保持原文，不主动翻译，讨论阅读的翻译偏好不影响导出原文。模块 05 为规则归属，模块 10 保留现有引用，当前交互基线及设计包 README 同步；本轮登记语义变更 PRD-0156，版本继续 1.1，既有字段、来源和草稿边界不变。

当前工作区代码已核验：`AiConnectionDialog.tsx` 的共享提示词按传入语言查固定系统文案，仅对来源缺口的系统值使用对应译文，其他实际字段和原文空白不变；标题与末尾仍复用同一原任务名称。`globalUiMessages.json` 统一中英文模板。弹窗与 `TaskDetail.tsx` 的任务、讨论快捷入口显式传入当前界面语言，再由启动、复制链路传至文本构建。任务预览有任务 ID 时显示原负责人、名称与目标，消息正文不经过业务翻译；日期预览仍遵循模块 02 的统一显示格式，提示词保存原始时间。无任务 ID 的既有回退外框只本地化系统说明，JSON 材料原值保持。模块 05 引用模块 02 的语言选择规则，不重复维护全局语言或日期规则。

主代理报告本轮 `aiConnectionContextPreview.test.ts` 8 项、`aiContextCompact.test.ts` 3 项、`taskDiscussionAi.test.ts` 7 项，共 18/18 定向测试通过，覆盖中英文任务、讨论、回复模板，原文和空白、不可用原消息及四种工具复制与带入链接的语言切换；其中四个新增语言用例已先验证旧中文固定模板失败，再通过实现。另有日期原文、JSON 隔离、四种工具复制、失败、取消及快捷共享传输边界的 9/9 选定现有回归通过，本轮合计 27 项。结构检查无新增违反，应用 TypeScript 检查与代码格式检查退出码为 0。结果限本地模板、预览及隔离传输验证，不代表外部客户端已真实接收或正式项目已同步；本轮未运行全量测试、标准完整应用构建或双重审查，不沿用旧轮次结果。

现有清单没有展示上下文导出的截图，FIG-COLLAB-004 普通讨论操作与 FIG-CLI-009／011 全局连接引导不受影响，状态保持；不自动采集截图或发布版本，保留并行 PRD-0152 内容及全部历史记录。

## 2026-10-13：上下文标题精简（非语义修正）

用户要求把标题中的“任务中已保存的上下文信息”精简为“任务上下文信息”，保留已确认的任务名称，完整模板为 `## 「{任务名称}」任务上下文信息`。模块 05、当前交互基线及设计包 README 同步；仅改标题措辞，字段、末尾、分组、权限及来源范围保持。PRD-0155 的旧标题与当轮验证保留历史，不改写日志；本轮不新增语义变更 ID，不修改 `last_change` 或版本。

`AiConnectionDialog.tsx` 的共享标题已改为新模板，既有标题断言同步。主代理报告按“讨论带入文案分组展示”筛选的 1/1 定向测试通过，实际共享提示词头部符合新标题，后续分组与原文断言保持；命令后的代码格式检查退出码为 0。本轮不重跑其他测试、类型检查或标准完整应用构建，不沿用前轮结果。当前截图不展示导出标题，状态保持，不自动采集截图或发布版本。

## 2026-10-13：上下文末尾任务名称文案（非语义修正）

用户要求任务末尾使用“这是我当前在 「{任务名称}」 中处理的任务，可通过 TaskDoor CLI 获取详细信息。”，讨论与回复使用“这是我当前在 「{任务名称}」 中处理的任务讨论，可通过 TaskDoor CLI 获取详细信息。”。只调整末尾句的措辞，字段、标题、分组、权限和 CLI 能力保持；模块 05、现行交互基线及设计包 README 同步，保留 PRD-0155 和现有版本，不新增语义变更 ID，也不改写历史日志。

`AiConnectionDialog.tsx` 的标题与末尾句复用同一任务名称，任务与讨论各自使用上述句式。主代理实际调用本地 `taskDetailMocks['fragrance-product']` 的任务和讨论构建器及共享提示词函数，输出末尾分别为“这是我当前在 「锁定礼盒价格、赠品与库存」 中处理的任务，可通过 TaskDoor CLI 获取详细信息。”和“这是我当前在 「锁定礼盒价格、赠品与库存」 中处理的任务讨论，可通过 TaskDoor CLI 获取详细信息。”；旧的产品地点及后续协助措辞不再出现。本轮实际调用与代码格式检查退出码为 0；仅为文案修正，不新增或重跑产品测试，不将前轮 14 项通过数作为本轮验证。现有截图没有上下文文本预览，不受末尾句变化影响，状态保持，不自动采集截图或发布版本。

## PRD-0155：统一上下文模板与讨论目标带入

用户提供具体讨论文本格式并明确要求参考该格式：使用包含任务名称的“任务中已保存的上下文信息”Markdown 标题，标题后长横线、后续 `---` 分隔区块；消息 ID 独立一行，作者与有效保存时间同一行，正文接标签并保留原始换行，移除重复材料介绍段，末尾按后续要求协助及 CLI 提示保持。同时按用户本轮示例，讨论与回复带入已填写任务目标，空目标省略，任务完成标准仍排除。该目标范围调整记录为 PRD-0155，局部替代 PRD-0154 的讨论目标排除及标题文案；任务其他字段、直接原消息单层范围与草稿排除不变，历史记录保留。

当前工作区 `task-discussion-ai.ts` 已恢复实际目标字段并过滤空白值，未增加标准、状态等字段；消息自身及直接原消息字段保持。`AiConnectionDialog.tsx` 的共享文本构建已使用 `## 「{任务名称}」任务中已保存的上下文信息`，首个分隔为长横线、后续为 `---`；消息 ID 单列，作者与有效保存时间同一行，正文紧接标签并保留原始换行，任务名称不重复为字段行，旧材料介绍段已移除。正式规则归模块 05，模块 10 继续引用，现行交互基线和设计包 README 同步。

主代理报告本轮 `aiConnectionContextPreview.test.ts`、`aiContextCompact.test.ts`、`taskDiscussionAi.test.ts` 组合 14/14 项通过，结构检查、应用 TypeScript 检查和代码格式检查连续执行退出码为 0。主代理使用实际 `taskDetailMocks['fragrance-product']` 分别构建任务、普通讨论和回复请求并静态渲染预览，核验三者标题与首个长横线一致，实际已填写目标在提示词与 HTML 均保留；任务没有消息段、普通讨论仅当前消息、回复额外带直接原消息。回复 ID 单列，作者与有效保存时间同一行，正文接标签，后续分隔与用户示例一致；未出现旧介绍段、重复任务名称字段、任务完成标准或转义空格。空目标仍省略，其他消息范围与草稿边界保持。仅登记本轮结果，不沿用前轮同名用例的通过数；本次未执行全量测试、标准完整应用构建或客户端唤起，证据限本地 Demo。

截图清单没有上下文预览实拍，FIG-COLLAB-004 只展示普通讨论操作，FIG-CLI-009／011 展示全局安装引导，本轮状态保持，不自动采集截图或发布版本。并行 PRD-0152 文件树内容保留。

## PRD-0154：任务名称标题与任务目标带入

用户进一步明确任务、普通讨论和回复的顶层标题都直接使用任务名称，去掉产品前缀与上下文后缀，任务信息内不再重复名称字段；仅任务入口带入已填写目标，空目标省略。讨论仍只用顶层任务名称与 ID 定位任务，两处继续排除任务完成标准。模块 05、现行交互基线及设计包 README 同步，模块 10 保留对模块 05 的引用；此条局部替代 PRD-0153 的任务目标排除及前轮标题文案，其他任务字段、当前消息、直接原消息、完整原文、草稿排除与按需 CLI 读取保持，历史记录不改写。

当前工作区代码核验：`task-ai-connection.ts` 带入实际任务目标并过滤空白目标，未恢复完成标准；`task-discussion-ai.ts` 的任务字段仍为名称与 ID。`AiConnectionDialog.tsx` 的 `buildContextPrompt` 首行直接使用任务名称，任务信息不重复名称字段；任务预览仅在请求确有非空目标时展示，不给空目标生成占位。没有专属预览时，回退内容只在请求未提供目标且实际有正文时补入，不生成空目标遮蔽实际字段。当前消息、直接原消息字段及自然换行保持。

主代理报告本轮 `aiConnectionContextPreview.test.ts`、`aiContextCompact.test.ts`、`taskDiscussionAi.test.ts` 组合 14/14 项通过，`aiConnectionDialog.test.ts` 的“没有专属预览时”筛选用例 1/1 通过，共 15 项相关验证；该旧测试只补明确的简体中文 Provider，未改变产品语言。结构检查、应用 TypeScript 检查和代码格式检查连续退出码为 0。主代理使用本地 `taskDetailMocks['fragrance-product']` 分别构建任务与回复提示词并静态渲染预览，确认两者顶层均为原任务名称，没有产品前缀、上下文后缀或重复名称行；任务提示词与 HTML 保留已填写目标，回复两处均不带目标，两处均排除任务完成标准。只登记本轮结果，不使用前轮同名测试的通过数替代；本次未执行标准完整应用构建、全量测试或客户端唤起。

截图清单没有登记上下文预览实拍；普通讨论操作图 FIG-COLLAB-004 及全局引导 FIG-CLI-009／011 不受本轮标题与任务目标变化影响，状态保持，不自动采集截图或发布版本，保留并行 PRD-0152 内容。

## PRD-0153：精简上下文任务信息

用户明确要求上下文中的任务信息不要带入太多内容，不需要目标与任务完成标准。本轮正式规则归模块 05：任务入口仅保留任务 ID、名称、状态及已填写负责人和截止时间；讨论与回复仅用任务 ID 和名称定位所属任务，不新增状态等字段。消息自身与直接原消息的 ID、作者、已保存发布时间和完整原文，以及草稿排除保持。模块 10 保留对模块 05 的引用，现行交互基线及设计包 README 同步；此条替代 PRD-0085、PRD-0151 和前轮排版记录中的任务目标、任务完成标准带入范围，其他规则及历史记录保留。

当前工作区代码核验：`task-ai-connection.ts` 与 `task-discussion-ai.ts` 已移除目标和标准字段；任务入口保留原状态、负责人与截止时间，讨论未添加这些字段。`AiConnectionDialog.tsx` 在有任务 ID 的预览中仅显示实际带入的基础字段，不再呈现目标、标准、参与人及标签空项占位；消息正文与直接原消息预览保持，纯文本仍从相同请求构建。

主代理报告本轮 `aiConnectionContextPreview.test.ts`、`aiContextCompact.test.ts`、`taskDiscussionAi.test.ts` 组合验证 14/14 项通过，覆盖已填写的目标与标准不进入任务或回复请求、预览无这些字段及“未提供”占位、消息关系保持。`npm run structure:check`、`tsc -p tsconfig.app.json --pretty false` 与代码 `git diff --check` 连续执行退出码为 0。主代理实际用两个构建器生成任务和回复提示词，并静态渲染预览，确认请求、提示词和 HTML 均不含目标或标准且保留任务 ID；任务保留必要基础字段，回复任务段仅名称与 ID，两条消息完整字段保持。只登记本轮结果，前轮同为 14 项的排版验证及 PRD-0151 的 54 项验证仍保留其历史范围；本次没有执行全量测试、标准完整应用构建或客户端唤起。

截图判定：已核验当前截图清单，没有登记展示上述任务或讨论上下文预览的当前截图。FIG-COLLAB-004 仅展示普通讨论直接操作，FIG-CLI-009／011 展示全局安装引导，均不受本轮字段收缩影响，状态保持；既有 pending 图不恢复。本轮无需将普通讨论操作图标为 pending，不新增截图或发布版本，保留并行 PRD-0152 文件树内容。

## 2026-10-13：连接带入文本标题与排版（非语义修正）

用户授权将任务带入标题统一为“TaskDoor · 任务上下文”，普通讨论和回复标题统一为“TaskDoor · 任务讨论上下文”，通过虚线与空行划分任务信息、当前消息和回复的直接被回复消息；目标、标准及正文自然换行，完整保留原文，并明确原文是待分析材料。仅调整导出文本的名称与排版，PRD-0151 的字段范围、权限、草稿排除和按后续要求协助规则保持，未新增语义变更 ID，模块版本与 `last_change` 保持。

正式呈现规则归模块 05，模块 10 保留现有引用，交互基线只同步引用范围。当前 `AiConnectionDialog.tsx` 的 `buildContextPrompt` 已使用两类稳定标题，将任务字段、当前消息和直接原消息分别分组；多行目标、标准和正文直接呈现，不再对任务或讨论单字段执行 JSON 字符串转义，原始字段值和换行保持。材料说明与按用户后续要求协助的末尾提示保留。弹窗预览布局和已有截图展示未改变，本轮无截图失效项，不新增截图或发布版本。

主代理实际输出任务、普通讨论和回复三种文本，核验两类标题以及分别 1、2、3 段内容；礼盒任务示例保留 ID、作者与已保存发布时间，正文自然换行。主代理报告本轮 `aiConnectionContextPreview.test.ts`、`aiContextCompact.test.ts`、`taskDiscussionAi.test.ts` 共 14/14 项定向测试通过，结构检查、应用 TypeScript 检查和代码格式检查均退出成功。仅登记本轮结果，PRD-0151 的 54 项前轮验证保留其历史范围，不当作本轮验证；本次未执行全量测试、完整应用构建或双重审查。

## PRD-0152：文件树默认宽度与设备记忆

用户读取 [正式项目 issue #40 最新回复](https://github.com/nocoly/taskdoor/issues/40#issuecomment-6140056634) 后，明确选择文件树首次默认 200px，保留 180～420px 的拖动和键盘调宽，并授权修改本项目；本设备已有有效保存值优先使用，不将既有偏好统一重置。规则与可判定条件归模块 11，模块版本保持 1.0，本次为语义变更，当前产品版本继续 1.1。

工作区代码已核验：`src/features/tasks/files/components/TaskFileExplorer.tsx` 将 `useSidebarWidth` 的初始值由 232 改为 200，保留 `taskdoor-file-tree-width` 存储键和 180～420px 范围；`src/features/tasks/components/SidebarResizeHandle.tsx` 沿用有效保存值优先和调整后写入逻辑。`src/shared/styles/pm-global.css` 的文件页基础网格同步默认 200px，`task-detail-split.css` 移除详情固定 200px 网格覆盖，`task-file-editor.css` 桌面网格改为 `clamp(180px, var(--task-sidebar-width, 200px), 420px)`，使实际树宽采用同一变量和范围，不再受原 45% 上限压缩。修改前回调已存在但实际布局被覆盖，不能沿用此前“已接入调宽”作为本轮生效证据。

主代理在主工作区当前 `http://127.0.0.1:5173/` 的 1280×800 页面核验：详情文件区域为 914px，本设备原保存值 248px 被正常恢复，实际树宽同为 248px；键盘 Home 到 180px，End 到 420px，实际布局与边界一致，最大树宽时预览区为 494px。原生鼠标拖动由 420px 调到 200px 后，实际网格为 200px／714px；刷新并重新进入文件页签后，调宽柄数值与实际树宽均为 200px。方向键 Right 从 200px 调至 216px，实际树宽同步；结束时再拖至 248px，恢复用户测试前设备偏好。本轮 `npm run structure:check` 通过，检查 398 个文件、1873 条 import。证据限本地界面布局、操作和存储，不代表正式项目已同步或跨设备偏好；未运行全量测试或双重审查。

截图判定：FIG-FILES-001、FIG-DETAIL-004 和 FIG-PREVIEW-013 复用同一旧文件页图片，原已 pending；补记本轮默认与调宽行为变更后，继续待主工作区当前运行时采集，不作为设备记忆或调宽生效证据。历史文件及状态示意保留，本轮不以旧截图证明当前行为。

## PRD-0151：回复连接 AI 上下文与草稿边界

本轮用户明确授权调整 Demo 与规则：单条已发布回复连接 AI 时带入直接被回复原消息；输入框中的未发送内容不需要带入。正式规则归模块 05，模块 10 和现行交互基线引用；`docs/task-design-kit/README.md` 增加现行规则入口，D-155 原文保留历史。PRD-0151 替代 PRD-0096 的草稿带入要求，任务入口与既有简短文本、按用户后续要求协助和 CLI 按需读取保持，不预设工作结果。

当前工作区代码核验：`src/features/tasks/discussion/lib/task-discussion-ai.ts` 仅接受已发布讨论或回复，使用当前消息自己的 ID 与完整原文；回复从当前任务可见消息中查找直接原消息，导出其 ID、作者、有效的已保存发布时间和完整原文。原消息删除、不可用、属于文件线程或不是讨论时仅保留已知 ID 与来源缺口，不回退到旧引用正文，不递归祖先或加入其他回复。缺失或无效时间不补造。

`TaskDiscussion.tsx` 移除回复输入区的 AI 回调接线，`DiscussionComposer.tsx` 与 `MentionComposer.tsx` 移除草稿 AI 属性与按钮；编辑、草稿持久化和发布流程保持。`AiConnectionDialog.tsx` 使用相同请求字段呈现当前消息与直接原消息；实际带入继续采用简短文本，并保留原文换行和空白。`task-ai-connection.ts` 的任务定位与必要基础字段范围未改。此处代码证据限本地 Demo，不代表正式项目模板已同步、真实权限服务或客户端连接已经验证。

主代理报告本轮 `aiConnectionContextPreview.test.ts`、`aiContextCompact.test.ts`、`taskDiscussionAi.test.ts`、`taskDiscussionFeedInteraction.test.ts`、`taskDiscussionInteraction.test.ts` 共 50/50 项定向测试通过，覆盖直接原消息、不可用与缺少原消息 ID 的缺口预览、完整原文、排除草稿及现有讨论交互。`discussionComposer.test.ts` 按发布 Promise、发布失败、纯附件评论筛选的 4/4 项通过。结构检查、应用 TypeScript 检查与独立 Vite 前端打包通过；标准 `npm run build` 未通过，主代理已在 HEAD 基线复现相同的 50 条 server 旧测试类型诊断，本轮新增诊断为 0，不登记为标准完整构建成功。仅登记以上本轮结果，不运行全量测试或双重审查。

截图判定：已目视核验 FIG-COLLAB-004 的普通输入区未出现草稿 AI，已发布消息入口仍对应现行直接操作，保留 captured；该图未展示连接预览，不能作为导出上下文证据。截图清单同步该边界，其余旧 pending 图保持。全局 CLI／MCP 引导布局不受本轮影响，FIG-CLI-009／011 不重采；本轮未新增截图或发布版本，历史日志与图片保留。

## 2026-10-13：删除连接页帮助中心文字（非语义文案）

用户指出移除跳转后“帮助中心”文字仍在，明确要求连文字一并去掉。`AiConnectionPage.tsx` 共用底部提示仅保留浏览器登录确认文案，中英文 CLI 与 MCP 均不再显示帮助中心。模块 05 同步显示规则；此前 PRD-0150 的导航移除保持，本次只删除普通文字，不新增操作或变更日志。

主工作区当前 In-app Browser 1280×720 核验 CLI／ChatGPT 与 MCP／ChatGPT 两分支，底部 DOM 均无“帮助中心”；截图 FIG-CLI-009／011 已更新。浏览器确认提示与 CLI 权限说明保留，没有触发授权或外部工具操作。

## 2026-10-13：MCP 移除重复的 CLI 选择提示（非语义文案）

用户要求 MCP 介绍不再显示“需要完整能力、脚本编排或复杂批量操作时，选择 CLI。”。`AiConnectionPage.tsx` 已移除这句及对应英文，仅保留 MCP 使用场景、精选工具范围与授权方式。模块 05 同步文案和 FIG-CLI-011 图注；能力表、权限、认证及操作入口不变。本轮为文案精简，不新增变更 ID，不修改版本或 `last_change`。

用户随后指定定稿文案，以“MCP精选常用工具”开头，先说明能力范围与上下文负担，再说明适合在 AI 对话中查任务、看进展、更新信息，最后说明授权登录或个人访问令牌访问。代码中文按用户原文替换，英文同步顺序，模块 05 同步描述；仍属非语义文案调整。

主工作区当前运行时 `http://127.0.0.1:5173/` 的 MCP／ChatGPT 页面已核验用户定稿文案及顺序。FIG-CLI-011 更新为 1280×720 简体中文当前实拍，目视核验介绍与定稿一致；未修改用户当前页面，核验临时标签已关闭。本轮采用页面核验、目标格式检查及 PRD 构建，不运行全量测试或双重审查。

## PRD-0150：移除连接页帮助中心跳转

用户在 CLI 与 MCP 底部各标注“帮助中心”，要求先去掉跳转地址。本轮将 `AiConnectionPage.tsx` 共用登录提示中的链接改为普通文字，保留浏览器确认提示、个人访问令牌及安装配置操作。模块 05 同步该规则及 `last_change`，版本保持 1.1。

主工作区当前运行时 `http://127.0.0.1:5173/` 的 CLI 与 MCP 均显示“帮助中心”为 `SPAN`，没有 `href`，底部链接数量均为 0。应用 TypeScript 检查通过。FIG-CLI-009／011 更新为当前简体中文截图；旧 CLI JPEG 保留历史。未触发授权、访问令牌或客户端打开操作。正文与生成页由 PRD 构建脚本同步，不发布新版本。

## 2026-10-13：MCP 使用场景与选择依据（非语义文案）

用户要求参考历史补清楚 MCP 的使用场景、选择依据、能力范围小于 CLI 及精选工具的定位。历史线程《润色 TaskDoor AI 连接说明》（`01a12ef5-9300-7d30-8406-7dc9f383bc6f`）已由历史代理只读核实；PRD-0131 的既有确认是 CLI／API 提供完整能力，MCP 精选工具子集以减少工具上下文。历史上“不用说范围小”的文案偏好由本轮明确要求更新，能力边界保持；不恢复已由 PRD-0139 移除的独立 API 标签。

用户随后要求精炼首句，移除客户端兼容条件及无需安装 CLI 的说明，再次精炼为“用 MCP，在 AI 对话中查任务、看进展、更新信息。”；后续能力范围、选择依据和授权说明保持。当前主工作区 MCP 弹窗已呈现新首句，本轮未切换用户页面或分配子代理。

主代理仅修改 `AiConnectionPage.tsx` 的 MCP 中英文介绍：在 AI 对话中查任务、看进展和更新信息；精选常用工具，范围小于 CLI，以减少上下文负担并让 AI 调用更聚焦；完整能力、脚本编排或复杂批量操作选择 CLI。原布局、授权登录、个人访问令牌和安装提示词保持。模块 05 仅同步 MCP 分支说明及 FIG-CLI-011 图片和图注，能力表、鉴权、权限与验收保持。这是既有能力的非语义文案补充，不新增功能或变更 ID，不改版本、`last_change` 和 CHANGELOG；不新增 MCP 协议或鉴权更稳定、跨客户端稳定性或调用成功率保证。

主工作区当前 In-app Browser `http://127.0.0.1:5173/`，825×804，MCP／ChatGPT 选中，新介绍已显示；介绍为 12px、宽 743px、含 padding 高 56.8px，页面与弹窗无横向溢出。个人访问令牌链接保留 `http://127.0.0.1:5173/?settings=tokens` 和 `target=_blank`；提示词、复制、在工具中打开、底部浏览器确认及帮助中心保持。此前应用 TypeScript `tsconfig.app` 的 `noEmit` 检查与代码目标 `diff --check` 通过；本次仅再次润色首句，当前页面核验通过；PRD 构建成功，25 个模块与生成索引同步，新措辞与当前截图已嵌入生成页，目标文件格式检查通过。未点击令牌、复制、唤起客户端、创建或修改任务，也未执行真实授权；未重测 375px 窄屏或英文运行态，不沿用前轮通过结果。

FIG-CLI-011 更新为主工作区当前 `assets/cli-connection/mcp-selection-guide-zh.png`，825×804 简体中文实拍，已目视核验并标 captured。旧 `mcp-authorization-zh.jpg` 保留历史；FIG-CLI-009 的 CLI 分支本轮不改、不刷新。截图只证明本地说明与入口展示，不作为生产接口清单、真实服务能力或授权成功证据。

## 2026-10-13：合并来源与历史编号对照

本轮合并 `0108ac3` 与 `origin/main`，保留两侧已经确认的需求和全部历史日志，不重新分配或覆盖历史 ID。编号在分支间存在分叉：本地 PRD-0099 为团队任务恢复回收站，本地 PRD-0100 为职责每日分析；远端 PRD-0099 为头像删除，远端 PRD-0100 为相同的团队任务恢复。历史记录按标题、日期和来源提交区分，模块 24 的现行 `last_change` 使用远端恢复记录 PRD-0100。

远端 `079a01f` 提供个人头像及团队标志删除，`2bca6fd` 恢复团队任务回收站及设置中的操作对齐；现有本地团队任务恢复正文与远端规则一致。远端 `3c5dd18` 固定八项依赖为锁文件已有版本、补充 `fflate`、配置 `legacy-peer-deps`，并将 toast 构建产物移出 Git 跟踪；这里记录该构建来源，不将合并前的安装或打包结果当作本轮已经通过。

PRD-0101 至 PRD-0149 的本地规则与证据全部保留，PRD-0149 的主任务讨论图不受头像删除入口影响。此轮只整合现有已确认规则及来源，属于非语义合并，不新增变更 ID 或发布版本。

## PRD-0100：团队任务恢复回收站

用户确认恢复设置内回收站分类，替代 PRD-0083。`GovernanceTasksPanel.tsx` 恢复完整分类，并将全部输入交给 `rowsOf`，普通分类排除删除项、回收站仅保留删除项；沿用删除时间列、恢复入口及每页 10 项。恢复操作仍仅更新当前设置面板状态，未接通持久化任务恢复或生产接口；不能据此认定生产恢复完成。旧 FIG-TEAM-007 已转待采集并从正文撤下。

## 2026-10-13：MCP 认证说明与令牌入口（非语义润色）

用户进一步要求 MCP 顶部先说明使用场景，当前文案为“MCP 适合支持 MCP 的 AI 客户端，在对话中查询和处理 TaskDoor 任务。支持授权登录，也可通过个人访问令牌访问。”，同段保留与 CLI 一致的个人访问令牌链接。底部恢复“登录时在浏览器中确认即可”和与 CLI 一致的帮助入口，令牌入口仅保留在顶部介绍中；实际启动结果和连接记录保持。模块 05 的当前页面描述已同步，能力表、鉴权机制、指南兼容性和权限规则保持；这是既有说明与入口位置的非语义润色，不新增变更 ID，不改版本、`last_change` 或历史日志。本轮应用类型检查通过；主工作区浏览器核验 MCP 场景说明、两种认证说明、底部浏览器确认提示与帮助中心入口，个人访问令牌链接与 CLI 指向同一 `?settings=tokens` 地址，说明与链接均为 12px。1280×900 与 375×900 视口无横向溢出；FIG-CLI-009 已刷新，FIG-CLI-011 为本轮 MCP 当前页面实拍。未创建令牌、唤起客户端或执行真实授权。

## PRD-0149：移除任务消息编辑

用户要求去掉主任务讨论中的消息编辑入口，删除与回复使用一致字号。本轮规则归模块 10，分析触发及权限说明分别在模块 12、15 区分主任务消息与文件内讨论；仅移除主任务主消息和回复的编辑能力，文件正文编辑及文件内讨论保留。

当前 `TaskDiscussionMessage.tsx` 的操作区仅渲染回复与有权本人删除，不再接入编辑回调或更多菜单；`TaskDiscussion.tsx` 的输入流程仅处理发布和回复。文件内 `DiscussionMessages.tsx` 与 `FileDiscussionPanel.tsx` 仍使用原编辑流程，未扩大本轮撤除范围。

主代理及 UI 代理报告本轮 `server/taskDiscussionFeedInteraction.test.ts` 14/14 通过，应用类型检查 `npx tsc -p tsconfig.app.json --noEmit` 与 `npm run structure:check` 成功。新回归覆盖本人主消息和回复无编辑／空更多入口、回复仍发布独立消息及发布失败保留回复目标和草稿。主工作区当前页面核验编辑与更多按钮数量为 0，四个删除／回复操作的 computed style 均为 12px、字重 400、行高 19.8px；没有实际发布、编辑或删除现有消息。

FIG-COLLAB-004 已更新为主工作区 `http://127.0.0.1:5173/` 当前运行时的 `task-discussion-actions-0149-zh.jpg`，824×720，目视核验本人主消息及回复的直接操作和页签计数。旧图保留历史，其他已 pending 的任务讨论图补本轮入口和字号失效原因。模块版本保持，阅读页通过 PRD 构建脚本生成，不发布新版本。

## PRD-0148：页签累计数量

用户明确授权显示任务讨论与文件页签的累计数量，超过 99 时统一显示 99+。计数规则统一归属模块 08，模块 10、11 仅引用：讨论总数为有效任务主消息与回复，文件总数为有效文件，搜索和筛选不改变总数；0 至 99 显示实际值，超过 99 显示 99+，实际数量仍通过提示及可访问名称读取。

本轮 `task-content-indicators.ts` 从已加载的消息及文件记录计算有效总数，按 ID 去重并采用最新记录的删除或归档状态；`TaskDetailTabLabel.tsx` 显示累计值或 99+，`TaskDetail.tsx` 将实际数量写入页签提示及可访问名称。未知数量不显示为零。本轮范围仅为计数展示。

主代理报告本轮 `taskDetailTabLabel.test.ts` 与 `taskContentIndicators.test.ts` 定向测试 7/7 通过，`npx tsc -p tsconfig.app.json --noEmit` 与 `npm run structure:check` 均成功。测试覆盖有效数据范围、去重、零值与未知值、99／100 边界、实际数量提示及英文名称；当前页面实测讨论 2、文件 4，文件搜索无匹配仍为 4，方向键从文件切回讨论仍为 2。

FIG-DETAIL-002 与 FIG-COLLAB-004 已重新采集为 `task-tab-counts-0148-zh.jpg` 和 `task-discussion-counts-0148-zh.jpg`，均来自主工作区 `http://127.0.0.1:5173/` 当前运行页面，824×720，已目视核验页签数量并恢复正文。包含旧页签的其他既有 pending 图继续待重采，历史图片保留。模块版本保持，本轮重新构建阅读页，不发布新版本。

## PRD-0147：移除前置依赖能力

用户明确要求去掉详情概览中的前置依赖整段及该类型。本轮将其从当前产品能力中移除，正式规则同步至模块 07、08、12、13、15 及现行交互基线；替代先前保留详情参考依赖的规则。任务关系只表达父子归属，目标、完成标准中的真实材料要求和交付顺序保持，不清除历史存储或改写正式工具 Schema。

`TaskDetail.tsx` 移除整个依赖区和维护回调，`App.tsx` 移除保存入口，创建单列字段和共享详情字段不再挂载依赖选择或插槽。`task-situation.ts` 不根据旧边生成概览提示，`task-relation-projection.ts` 的关系摘要不再带入依赖。创建表单、工作区创建和 AI 调整边界不提交旧依赖；服务端方案生成、Mock 规划及嵌套场景不再返回关系边。旧字段继续兼容解析，删除时仅静默清理，不产生新的依赖维护活动；父子层级、日期及投入约束保留。

个人工作推荐、任务诊断和协作排期不再使用历史依赖字段生成优先级、下一步、完成冲突或预测限制。分析仍可从当前正文、实际执行记录和所需材料缺失核对真实执行阻塞，父级按相关子任务证据聚合。历史字段存在或相关任务未完成本身不构成阻塞证据。

原始 Skill 文字合同同步 7 个文件：shared/current-prd-contract、planner 入口与 task-planning／task-preview、status-analyzer 入口与 problem-analysis、diagnostician 入口。活跃 planner 不读取跨 Skill 的共享合同，因此其生产包中的三份文字直接规定所有 `dependsOnClientIds=[]`，修改旧方案也不恢复边。JSON Schema 的字段与类型、正式 MCP 契约、旧协议、生成快照及历史示例不修改。Mock 数据契约只补现行覆盖说明，旧规模与迁移沿革保留，旧依赖数量及 DAG 要求不再作为当前产品验收。

最小验证：`taskAssistant.test.ts` 7 项与 `mockTaskAssistant.test.ts` 21 项共 28 项通过；依赖入口接线 6 项、关系投影 1 项及创建单列 UI 5 项共 12 项通过。创建／调整新增 7 项回归通过，其区域检查共 117 项通过；分析区域 81 项通过，另有真实正文阻塞及父级聚合 smoke 验证。最终应用类型检查与结构门通过，无新增结构违反。区域检查中的 10 项旧基线失败单独保留：创建／调整 8 项（2 项待开始状态、1 项默认参与人、5 项未固定系统时钟的历史日期），诊断上下文 2 项旧 fixture；后两项用未改 Mock 规则也得到相同空结果，不扩大修复。服务端颜色 Schema 初始化沿用同一格式的正则表达，未扩大颜色能力或修改正式工具协议。未运行全量测试、标准完整 build 或双重审查。

主工作区当前 Chrome `http://127.0.0.1:5173/`，1440×778：中文叶子任务概览完整显示目标、完成标准、空子任务及标签，依赖区 DOM 数量为 0；父任务仍显示 3 个直属子任务及其各自的下级数量。英文概览另作语言核验，随后恢复中文，未改业务内容。FIG-DETAIL-002 使用 `artifacts/task-overview-no-dependencies-0147-zh.jpg` 实拍，目视核验后复制为 `assets/task-detail/overview-no-dependencies-0147-zh.jpg`；父任务和英文图保留 artifacts 作为运行证据，不重复新增正文图号。

FIG-COLLAB-002、FIG-DETAIL-019／020 原图仍显示依赖区，转 pending 并撤下正文，状态菜单及通知规则保持。旧「依赖与标签」FIG-DETAIL-009／FIG-PREVIEW-011 转 superseded 仅留历史，其他已 pending 图保持。PRD-0147 按写入时实时最高编号唯一分配，保留 PRD-0143 至 PRD-0146 原日志、状态与日期规则；模块版本不变，不发布新版本。正文和截图由 PRD 构建脚本生成阅读页，不手改生成文件。

## 2026-10-13：讨论时间与回复文字对齐（视觉修正）

用户反馈讨论底部的时间和右侧「回复」未水平对齐。`task-discussion-feed.css` 统一底部辅助文字的字号与 1.65 行高，footer、meta 和 actions 按文字基线对齐，更多图标独立居中，避免图标成为基线参照；桌面 28px、窄屏 44px 操作区域保持。

主工作区当前 Chrome（http://127.0.0.1:5173/，简体中文）实测礼盒任务 5 条消息，修正前时间／回复的文字上边界差为 0.203125px，修正后 1440×722 与 390×844 均为 0px，上下边界完全一致；覆盖本人删除操作、引用回复与带附件消息。390px 下回复与本人删除高度均为 44px，页面无横向溢出；没有发布、删除或改写消息。临时视口已恢复。真实触屏操作、文件内讨论与翻译提示换行未重新验收。

FIG-COLLAB-004 已刷新为 `task-discussion-footer-alignment-zh.jpg`，来自主工作区当前页面实拍，已目视核验，旧日期截图保留。只调整样式和截图证据，模块 10 版本与 `last_change: PRD-0146` 保持，不新增语义日志。本轮最小验证为上述浏览器布局量测与文件格式检查；PRD 构建成功后同步生成页，不沿用前轮类型或业务测试作为本轮结果。

## PRD-0146：全局日期格式统一

用户将 PRD-0142 的讨论日期样式扩展至全部系统日期与时间展示。唯一规则归属为模块 02 的 3.4，模块 10 与交互基线改为引用；绝对日期采用英文月份缩写，时刻采用 12 小时制 AM/PM，同年省略年份、跨年显示，完整提示含年份，近期相对措辞仍随界面语言。日历日期不附加时分、月份导航保留年份，业务原文及机器数据保持。未来事件的同年年份规则在本轮统一，PRD-0142 的未来时间实现记录仅作为历史，不改写旧日志。

`src/shared/lib/date-time.ts` 提供日历日期、时间点、时分、月份、相对时间与旧日期文案的共用显示函数；`shared/i18n/core.ts` 的既有格式入口委托此模块，任务 `relative-time.ts` 仅重导出相对函数。日历日期校验后按原日显示，时间点按浏览器或调用方明确指定的时区显示；旧无年文案只转换已有月日与时分，不获得猜测年份或完整 timestamp，无效值不补造。`formatSystemDateText` 仅处理系统生成文案，不改写人员自由输入。

调用范围包括任务截止与范围日历、筛选、创建及历史、文件更新和版本、回收站、燃起图与进度、诊断、AI 差异、活动及概览；其他领域包括通知、连接记录与 AI 预览、令牌列表与到期日历、团队加入日期、职责更新时间、治理任务、审计日志，以及 test-lab 记录与报表的显示预览。日期筛选复用 inline 日历，保留 ISO `from/to`、历史日期选择与 Apply 流程。原始时间编辑值、JSON、导出、AI 提示词及接口和存储语义保持，不以显示字符串进行排序。

`GlobalNotifications.tsx` 的通知时间优先读取已保存 `createdAt` 并调用共用格式；Mock 通知也使用已有 timestamp，不再直接显示固定的旧时间文案。只有缺少有效时间点的旧记录才沿用受限文案转换，不将相对文本或无年日期伪造成 `<time dateTime>` 的完整时间。任务活动、文件及进度的旧日期展示也经过相同显示入口，不能因 Mock 路径绕过规则。

主工作区当前 Chrome `http://127.0.0.1:5173/` 的中英文通知页核验 4 个 ISO `createdAt`、英文月份缩写及 AM/PM label，完整提示含 2026；语言切换不修改已读。讨论页显示 `Sep 14, 5:30 PM`，顶部截止日为 `Sep 1`，近期记录仍为相对措辞。日期筛选实测历史 `Oct 1` 可选，确认后外弹层保持、草稿保留，Escape 仅关闭内日历，Apply 后条件显示 `Oct 1` 起，清除恢复无日期条件。首次热刷新期间的筛选弹层异常在稳定运行时未重现，不记录为新增业务能力或已修复缺陷。

共享日期 6 项、通知真实 timestamp 1 项、i18n 日历 1 项、讨论互动 14 项、任务日期 4 项、任务列表呈现 8 项、范围 2 项、诊断 17 项及 AI 预览 2 项，共 55 项定向检查通过；另有令牌日历、令牌列表与审计日志的中英文 6 个 SSR 视图核验通过。最终应用类型检查与结构门通过，无新增结构违反。旧组合用例的 15 项现行 UI／源码断言不匹配仍保留为限制，不将本轮结果视作全量通过；未运行全量测试、标准完整 build 或双重审查。

FIG-COLLAB-002／004 分别使用主工作区 1440×722 英文通知与中文讨论实拍，已目视核验并复制为 `notifications-0146-en.jpg`／`task-discussion-feed-0146-zh.jpg` 独立路径；中文通知对照图及筛选日历图保留在 `artifacts/global-date-notifications-zh.jpg`／`artifacts/global-date-filter-calendar-zh.jpg` 作为本轮运行证据，不重复新增正文图号。FIG-LIST-007、FIG-TEAM-008、FIG-CLI-006、FIG-DELETE-001／005／006／009、FIG-TOKEN-001 共 8 张含旧日期的当前图转 pending 并撤下正文。已有 pending 继续待采集，历史资产与版本保持；日期未改变、只显示相对「刚刚」或仅有模糊背景的截图不扩大失效范围，不发布新版本。本轮编号按写入时的实时最高值重新分配为 PRD-0146，保留并行状态菜单记录及其编号。

## PRD-0145：状态菜单规则汇总与编号澄清

并行维护出现两项 PRD-0143，原日志与采集证据保留。任务详情的现行菜单规则统一使用 PRD-0145 独立编号：已完成任务的进行中候选项四段全亮；其他状态读取原有效进度，未知不填充；描边复用共享默认值。代码、运行证据和完成态实拍沿用下方 PRD-0144，本轮不扩大实现范围或发布版本。

## PRD-0144：已完成任务的进行中候选样式

用户补充已完成任务菜单中的进行中候选项应显示四段全亮。PRD-0144 仅替代 PRD-0143 在已完成任务中的该候选图形，规则归模块 08 的 3.5；其他状态仍读取当前任务有效进度，实际状态、AI 评估、人工确认和进度计算保持。

`TaskStatusBadge.tsx` 仅在规范化后的当前状态为已完成、候选为进行中时向菜单图标传入 ratio=1，外层状态图标继续使用原进度和终态属性。主工作区当前 Chrome 页面（http://127.0.0.1:5173/，1440×722，英文）核验「锁定礼盒价格、赠品与库存」：顶部仍为已完成与圆环勾，菜单进行中四段透明度均为 1，描边 3、尺寸 16px。当前任务 AI 暂无评估，这个候选全亮不被当作新的 AI 完成量。切换至「冻结十月直播间资源日历」，菜单仍为 1／1／1／0.2，保留实际三段。未点击状态选项或修改业务数据。

应用类型检查 `npx tsc -p tsconfig.app.json --noEmit` 通过；新增 FIG-DETAIL-020 为主工作区当前已完成任务的状态菜单实拍，已目视核验，FIG-DETAIL-019 保留进行中任务的对照。页面热更新期间发生重复 createRoot／removeChild 异常，刷新后恢复并完成上述核验；不把热更新错误记录为生产能力证据。本轮未运行全量测试或双重审查，不发布新版本。

## 2026-10-13：详情状态菜单描边统一（视觉调整）

菜单状态图标移除 `strokeWidth={2.3}` 覆盖，直接复用共享图标的默认描边。主工作区当前运行页面（http://127.0.0.1:5173/，Chrome，1440×722，简体中文）核验「冻结十月直播间资源日历」：列表与菜单圆环均为 16px、28 viewBox、描边 3，进度均为三亮一暗；菜单不再比同尺寸列表图标细。未改任务状态或进度。FIG-DETAIL-019 已刷新至 `status-menu-progress-weight-zh.jpg` 并目视核验，旧英文实拍保留。本轮为纯视觉修正，不新增语义变更日志，沿用 PRD-0143 和版本 1.1；模块正文只更新图片引用。

## PRD-0143：详情状态菜单显示实际进度

用户要求详情状态展示实际情况。PRD-0143 替代详情菜单固定四段全亮的约定，规则归模块 08 的 3.5；列表状态筛选继续使用固定类别图标，进度计算与状态修改逻辑保持。

`TaskStatusBadge.tsx` 的详情状态菜单复用 `TaskStatusIcon` 并传入按钮同一 `progressRatio`，不再使用固定满环的类别图标。主工作区当前运行页面（http://127.0.0.1:5173/，Chrome，1440×722，英文界面）核验「冻结十月直播间资源日历」：列表、详情状态按钮与菜单进行中项均为三亮一暗，四段透明度为 1／1／1／0.2；无 AI 评估的「补齐直播断流与缺货应急预案」三处均为 0.2／0.2／0.2／0.2。打开菜单及 Escape 关闭正常，未修改任务状态、确认或进度数据。

应用类型检查 `npx tsc -p tsconfig.app.json --noEmit` 与 `npm run structure:check` 通过，无新增结构违反。FIG-DETAIL-019 来自主工作区当前页面实拍，已目视核验；原详情截图继续保持 pending。本轮证据覆盖本地菜单的部分进度及未知态，不证明生产 AI 或服务端保存；未运行全量测试或双重审查，不发布新版本。

## PRD-0142：协作记录时间格式统一

用户明确采用英文月份缩写和 12 小时制 AM/PM 的绝对时间：同年 `Sep 14, 5:30 PM`，跨年 `Sep 14, 2025, 5:30 PM`；中英文界面均使用这一样式，完整时间提示始终含年份，近期相对措辞仍跟随界面语言。该显示规则属于语义变更，归模块 10 的 3.1，交互基线同步；浏览器时区、保存时间点、倒序排列及相对／绝对切换条件保持。

已核验共享 `relativeTaskTime` 的 src 调用仅有 `TaskDiscussionMessage.tsx`、文件内讨论的 `DiscussionMessages.tsx` 与 `TaskActivityLog.tsx`。活动与文件提交仅在记录有有效时间戳时显示时间；通知与行为日志未引用该函数，不纳入本轮统一范围。三个调用方均使用格式化后的 `full` 作为时间的 `title` 与 `aria-label`。旧文件预览截图没有讨论时间，本轮不扩大其失效范围。

`relative-time.ts` 已将绝对日期、完整时间及昨天的时刻固定按 `en-US` 和 `hour12: true` 格式化；较早记录的月份使用 `short`。刚刚与昨天词语、分钟／小时相对措辞仍使用界面语言；原阈值与日历判断保持。未来时间继续显示含年份的完整时间，无效时间仍返回 `null`，不补造记录。

主工作区当前 Chrome 的简体中文礼盒任务讨论页核验 `Sep 14, 5:30 PM`、`Sep 2, 6:20 PM`、`Sep 1, 10:06 AM` 和 `Sep 1, 10:00 AM`；完整 `title` 为含年份格式，如 `Sep 14, 2026, 5:30 PM`。既有 `dateTime` 未变，近期记录仍显示 `8小时前`。浏览器本轮覆盖任务讨论，文件讨论及活动的统一范围由共享调用代码支撑，不将静态图扩大为三类页面的逐项运行验收。

`server/taskDiscussionFeedInteraction.test.ts` 的 14 项及 `server/taskDiscussionInteraction.test.ts` 中“时间显示保存的日期时分且位于内容附件下方，旧相对时间不伪造日期”的定向 1 项，共 15 项检查全部通过；覆盖中英文绝对格式、完整年份提示、午间午夜、跨年、未来、无效时间及任务／文件讨论保持挂载后的新消息。应用类型检查与结构门通过，无新增结构违反；未运行全量测试、标准完整 build 或双重审查。

FIG-COLLAB-004 已重新采集为主工作区当前 Chrome 1440×778 简体中文实拍，目视核验后复制到 `task-discussion-feed-0142-zh.jpg` 独立路径，恢复 captured 与正文引用；该图证明当前任务讨论的时间外观。原已 pending 的 FIG-COLLAB-006、FIG-COLLAB-001、FIG-DETAIL-003、FIG-PREVIEW-012 及活动 FIG-COLLAB-003、FIG-DETAIL-005、FIG-PREVIEW-014 补时间格式失效原因并保持，不复用旧图。历史图片与既有日志保留，不发布新版本。

## PRD-0141：任务消息连接 AI 与删除直接入口

用户要求恢复每条讨论右上角原有的连接 AI 主按钮与工具下拉，并把本人发言的删除操作直接放在回复左侧。规则归模块 10 的 3.1，交互基线 4.5 同步；本轮仅替代 PRD-0126 的消息菜单 AI 入口位置及本人删除入口位置，不修改 PRD-0140 的引用直接定位、无高亮、头像与回复间距，也不改变文件内线程。

模块 05 3.1 已明确最近使用工具的主按钮、下拉切换，以及任务 ID／名称／已填写目标／完成标准、当前讨论 ID／作者／已保存发布时间／正文的带入范围；回复使用自身讨论 ID，回复草稿另带未发送草稿，不预先带入整串回复或附件内容。本轮引用这些现有规则，模块 05 与 `buildDiscussionAiRequest` 的协议不变，不重复扩写上下文。

当前 `TaskDiscussionMessage.tsx` 在消息头复用 `AiConnectionButton compact`，回调继续传入当前记录的 `discussion`／`reply` 类型、`activityId`、触发元素与工具快捷尝试；更多菜单只保留本人编辑，删除按钮仅在本人及存在删除回调时显示在回复之前。消息流样式把底部操作排成同一行，窄屏删除与回复点击区继续为 44px。`task-discussion-ai.ts` 仍只导出当前记录及现有任务字段，不附带其他线程或被删除正文。

主工作区当前 Chrome 的「锁定礼盒价格、赠品与库存」讨论页核验：每行右上角显示 AI 主按钮与下拉，本人周岚的删除在回复左侧，梁川发言不显示删除；AI 按钮与回复右边界均为 1408px。5 条头像仍为 28×28px，与姓名纵向中心差为 0px。点击 AI 下拉可见 ChatGPT、Claude、WorkBuddy 和 Cursor，Escape 正常关闭。没有触发外部工具或实际删除消息；静态页面与菜单操作不作为真实客户端唤起或生产删除保存证据。

本轮 `server/taskDiscussionFeedInteraction.test.ts` 的 12 项及 `server/taskDiscussionAi.test.ts` 以 `回复编辑入口|无草稿仍可连接|缺失或非人类讨论目标` 筛选的 3 项，共 15 项定向测试全部通过；应用类型检查与结构门通过，无新增结构违反。未改变上下文构建代码，也未重复执行全量测试、标准完整 build 或双重审查。

FIG-COLLAB-004 已从主工作区当前 Chrome 采集 1440×778 简体中文实拍，目视核验后复制到独立路径 `task-discussion-feed-0141-zh.jpg`，恢复 captured 与正文引用；该图只证明本轮消息入口与外观。FIG-COLLAB-006 的 PRD-0140 图片未展示当前连接 AI 和本人删除入口，本轮未重新采集，保持 pending 并撤下正文。FIG-COLLAB-001、FIG-DETAIL-003 与 FIG-PREVIEW-012 原已 pending，补当前失效原因并保持。旧图片及历史日志保留，不发布新版本。

## PRD-0140：任务引用直接定位与身份行协调

用户要求讨论头像与姓名水平对齐、头像参照活动大小、回复双方间距一致，并要求点击姓名后的引用小气泡直接定位原消息，不在预览内显示定位文案，也不高亮。任务引用交互调整属于语义变更，规则归模块 10 的 3.1，交互基线 4.5 同步；头像与留白属于同轮视觉修正，不扩展讨论能力。PRD-0140 替代 PRD-0130 的触屏先预览再定位及预览内定位按钮，保留倒序、按需预览、回复草稿、权限与原消息不可用保护。

`TaskDiscussionMessage.tsx` 保留 `PersonAvatar size="sm"`，消息流样式移除原 32px 覆盖，使用与活动相同的 28px 头像、28px 姓名行最小高度与居中对齐；身份行及「回复」内部使用同一个 8px 间距。引用预览只显示原消息内容或不可用提示，图标激活按父消息 ID 请求定位；不再区分触屏先预览。`TaskDiscussion.tsx` 的任务内部定位清除高亮并保留精确滚动与焦点，通知／活动传入的外部 `attentionTarget` 仍由独立分支处理短暂高亮。文件讨论的 `DiscussionMessages.tsx` 和原 `ReplyReference` 未改，继续按文件线程阅读。

主工作区 `http://127.0.0.1:5173/` 的当前 Chrome 页面核验「锁定礼盒价格、赠品与库存」：5 条消息头像均为 28×28px，头像与姓名纵向中心差均为 0px，回复左右留白均为 8px。Tab 聚焦引用图标显示父原文，预览按钮数为 0；Enter 激活后精确聚焦 `task-activity-fragrance-product-activity`，预览关闭，`is-attention` 数量为 0。浏览器真实操作覆盖键盘聚焦与激活；触屏直接定位仅由定向测试覆盖，未将真实触屏手势记作已验收。未发布消息或修改业务数据。

`node --import tsx --test server/taskDiscussionFeedInteraction.test.ts server/discussionFeed.test.ts` 的 16 项定向测试全部通过；应用类型检查与结构门通过，无新增结构违反。标准 `npm run build` 因当前 `tsconfig.node.json`／server 的已有文件覆盖及测试类型错误失败；独立 Vite 前端打包通过，25.18 秒。本次不扩大修复其他服务端问题，不运行全量测试或双重审查，也不把前端通过结果记作完整 build 成功。

FIG-COLLAB-004 与 FIG-COLLAB-006 已分别用主工作区当前 1440×778 简体中文消息流及键盘引用预览重新采集并目视核验，使用 `task-discussion-feed-0140-zh.jpg` 和 `task-discussion-reference-preview-0140-zh.jpg` 两个独立路径，恢复 captured 及模块正文引用。静态图只证明外观与预览内容，实际定位以本轮运行验证为据。已待采集的 FIG-COLLAB-001、FIG-DETAIL-003 与 FIG-PREVIEW-012 同步标注本次头像呈现变化并保持 pending；活动图片不受本次修改影响。历史图片及 PRD-0130 等旧日志保留，不发布新版本。

## 2026-10-13：CLI 介绍与令牌入口排版（视觉调整）

用户要求将 API 接入说明和个人访问令牌入口接在 CLI 介绍段末尾，并与介绍统一字号，随后进一步精确化同段文案：前半使用“本地 Agent 推荐使用 CLI，适合脚本编排和批量操作，需要安装并执行命令。”，最新后半为“如需与其他业务系统集成，或通过自动化平台调用 TaskDoor，可使用 API，能力范围与 CLI 一致。获取接入凭据，请前往”并接原令牌链接。这是既有用途的措辞润色，排版和措辞均属非语义修正，能力、接入流程、令牌跳转及权限规则保持；正式模块、版本、`last_change` 和日志无需修改，不新增变更 ID。前次主工作区已核验介绍与链接同段、均为 12px、链接指向 `?settings=tokens`、1280px 与 375px 无横向溢出，并刷新 FIG-CLI-009，应用类型检查通过；这些属于最新措辞修改之前的验证。最新业务系统集成文案已在主工作区当前运行页面核验，FIG-CLI-009 已重新采集为 1280×900 实拍。未创建令牌、唤起客户端或验证生产服务。

## PRD-0139：连接入口聚焦 CLI/MCP

用户明确取消 API 独立标签，连接弹窗聚焦 CLI/MCP，原产品连接标识、标题和说明保持。CLI 分支保留与 API 接口及完整能力一致的说明，个人访问令牌管理作为辅助入口，程序接入与 API 文档由模块 21 所属页面承接。正式模块已移除 API 独立头部、两步接入和 FIG-CLI-010 引用，PRD-0138 记录保留为历史；FIG-CLI-010 在截图清单标为 superseded，FIG-CLI-009 已刷新为主工作区 1280×900 实拍。本轮应用类型检查、结构门及前端构建通过；浏览器核验仅 CLI/MCP 标签、分支切换与 CLI 的能力说明，点击个人访问令牌辅助入口在新标签页打开访问令牌设置，设置页已有 API 文档入口。1280px 和 375px 视口无横向溢出。未创建令牌、唤起客户端或调用生产 API；证据仅覆盖本地指引与入口。

## PRD-0138：API 独立接入引导

用户要求三方式标签保持简洁，将 CLI 推荐理由移入分支正文；API 分支按程序接入场景使用 TaskDoor 单标识、独立标题与说明，CLI/MCP 原产品连接标识、标题和说明保留。API 引导分为创建个人访问令牌与按 API 文档接入，分别说明操作范围、工作空间、有效期及接口、参数、返回值，补充账号与令牌限定范围；CLI/API 分支只描述自身完整能力与适用场景，MCP 分支原说明保持。规则归属模块 05，令牌规则仍引用模块 21。`AiConnectionPage.tsx` 与连接样式已实现。应用类型与结构检查、前端构建通过；主工作区核验标签纯名称、CLI 推荐理由归正文、API 单标识与两步引导、CLI/API 不描述 MCP 范围，以及令牌与文档入口地址，窄屏和 1280×900 页面无横向溢出。FIG-CLI-009 已刷新，FIG-CLI-010 为本轮 API 分支实拍；未创建令牌、唤起 Agent 或调用生产 API。

## 2026-10-13：任务列表搜索、筛选与创建入口试排（待确认）

用户要求“把筛选放输入框里面，创建放筛选位置试试”，本轮据此实现本地预览：原高级筛选入口移至搜索框右端，原外侧筛选按钮位置用于当前团队创建；侧栏可见时不重复显示顶栏创建，侧栏隐藏或收起时保留顶栏入口。来源与待确认范围见 `intake/2026-10-13-task-list-entry-layout-preview.md`。

用户随后通过截图反馈框内筛选入口的选中／展开底色过满，要求缩小。本次仅将底色向内缩 4px，保留点击区域、图标、入口位置及原筛选操作。1440×722 视口、260px 侧栏实测搜索框仍为 179×36px，筛选点击区域仍为 34×34px；按钮透明，`::before` 底色各边内缩 4px 后为 26×26px、圆角 6px。鼠标位于按钮左缘向内 2px 仍命中；Escape 后焦点回到筛选，Enter 重新打开并聚焦“搜索筛选类型”。验证前为空关键词、全部状态、全部范围、最近更新，显示“锁定礼盒价格、赠品与库存”详情且筛选弹层已打开，最终恢复同一展开状态；未创建或更改任务，手机未重测。本次只有 CSS 视觉改动，CSS `diff --check` 通过，未重跑应用类型及结构门；PRD 构建成功，25 个模块与生成索引同步，生成页确认 FIG-LIST-006 已撤下、FIG-LIST-007 保留，不沿用前轮通过结果。

本次微调实拍为 `artifacts/task-filter-inset-preview-open-zh.jpg`（工具栏与展开菜单）和 `artifacts/task-filter-inset-preview-toolbar-zh.jpg`（局部）。底色微调属于非语义视觉修正，无需新增日志；正式布局规则、基线、版本、`last_change` 与 CHANGELOG 保持，入口布局的正式采用仍待确认，FIG-LIST-006 继续 pending。

以下为底色内缩前入口试排的历史验证：主工作区 1440×722 视口、260px 侧栏实测搜索框 179×36px、框内筛选 34×34px、外侧白底加号创建 36×36px；侧栏展开时顶栏新建隐藏，连接 AI 渐变入口保留。筛选选择“进行中”后数量 1 徽标完整位于框内，Escape 后焦点返回筛选入口；输入“首发”再清除仍保留进行中与数量 1，随后恢复全部状态、空关键词、全部范围及最近更新。外侧新建可打开需求描述并聚焦，输入框仍为 760px、路径栏左距 24px，未提交创建。Home 收起侧栏到 0px 后顶栏新建显示；用户随后展开到 260px 并保持新建页，停止继续切换。该轮应用类型、结构门与目标文件格式检查通过；PRD 构建成功，25 个模块与生成索引同步，生成页已撤下 FIG-LIST-006 并保留 FIG-LIST-007。未运行全量测试或双重审查，手机未重测。

前轮实拍为 `artifacts/task-list-entry-trial-zh.jpg`、`artifacts/task-list-entry-trial-toolbar-zh.jpg`、`artifacts/task-list-entry-trial-active-zh.jpg` 与 `artifacts/task-list-entry-trial-creation-zh.jpg`，分别用于整体试排、工具栏局部、搜索词与徽标并存及创建入口后的初始页；保留为布局位置历史，不作为本次微调后的底色外观证据。

本轮仅获本地试排授权，正式采用待确认，不覆盖模块 04／06 或交互基线的现行入口规则，不修改 `last_change`、版本或新增语义变更 ID。FIG-LIST-006 的框外筛选和顶栏创建画面与试排不同，恢复 pending 并撤下模块 06 图片及图注；FIG-LIST-007 收起态入口保持，沿用原证据。连接弹窗及设置等图片背景不作为本轮入口证据，不扩大截图失效范围。试排截图暂留 `artifacts/` 供评判，不登记为正式 FIG。

## 2026-10-13：新建任务初始页路径栏左对齐（视觉修正）

用户明确本次只调整顶部「任务 › 新建任务」路径栏。`task-creation-page.css` 的初始页路径栏按创建面板左边界对齐，桌面保留 24px 左距，创建面板不超过 760px 时保留 16px；正文恢复原有最多 960px 内容列与最多 760px 需求输入区的居中布局。选择器仅作用于初始描述页，创建流程与业务规则保持。

主工作区 1440px 视口、侧栏 260px 时，创建面板宽 1180px、内容列宽 960px、输入框宽 760px，输入框左右各 210px，与改动前一致；顶部路径栏距面板左边界 24px，页面无横向溢出。当前实拍为 `artifacts/task-creation-breadcrumb-only-260-zh.jpg`。后续准备宽侧栏检查时用户已切回原任务，因此停止页面操作；最终只读确认仍显示「锁定礼盒价格、赠品与库存」，侧栏 260px、视口 1440px，未提交创建。本轮未重新验证 520px 侧栏或移动端。

前轮输入区加宽已撤回，`artifacts/task-creation-responsive-260-zh.jpg` 对应撤回前的表现，不再作为当前界面证据；前轮移动端截图也不替代本次修正后的验证。既有创建页 FIG 继续 pending，不复用旧图作为当前证据。本轮为纯视觉修正，不新增变更 ID、不改模块 07 版本或 `last_change`。

本次文件格式检查通过；PRD 构建成功，25 个模块与索引同步。只撤回两条 CSS 正文宽度覆盖，未新增结构依赖，未重复运行结构门、全量测试或双重审查。

## 2026-10-12：AI 渐变与新建细描边（视觉修订）

用户要求恢复连接 AI 的原渐变按钮，并选择新建任务使用白底细描边。`WorkspaceTopbar.tsx` 恢复 `Sparkles`，两个入口复用 outline 按钮；`workspace-shell.css` 恢复 AI 的浅渐变、蓝灰描边与轻阴影，新建使用中性细边框和深色文字。760px AI 短标、420px 新建加号、完整无障碍名称、原操作回调及焦点恢复保持。新建样式以用户明确选择为依据，未新增入口或业务流程。

主工作区验证新建背景为白色且无渐变，AI 为 `linear-gradient(110deg, white 40%, route-soft)` 并显示星光图标；390px 下两入口高 44px，页面无横向溢出。连接指南可打开，Escape 后焦点返回 `workspace-ai-trigger`；验证后恢复原任务、345px 侧栏及默认视口，未创建任务或执行外部操作。FIG-LIST-006／007 与 FIG-CLI-009 在原路径刷新为 1280×720 当前页面。应用类型、格式检查与 PRD 构建通过，25 个模块与索引同步，三张当前图片内容已核验嵌入生成页。本轮仅为视觉修订，不新增变更 ID、不改版本或模块 `last_change`，未运行全量测试或双重审查。上一节的蓝色新建及轻量 AI 为本轮修订前的历史表现。

## 2026-10-12：顶栏任务与 AI 入口层级（视觉调整）

`WorkspaceTopbar.tsx` 与 `workspace-shell.css` 将新建任务呈现为使用现有主题 Token 的主按钮，将连接 AI 呈现为轻量按钮，并将装饰星光替换为连接图标。760px 及以下的 AI 入口使用「AI」短标，420px 及以下的新建入口保留加号；两者保留完整无障碍名称及窄屏 44px 点击高度。原位置、当前团队创建回调、连接指南及 `workspace-ai-trigger` 焦点恢复目标保持。仅调整视觉层级与响应式呈现，不新增语义变更 ID，不改模块版本或 `last_change`。

主工作区浏览器验证 600px 保留新建任务文字，390px 与 320px 使用加号和连接图标加 AI 短标；三种宽度均无页面横向溢出。新建入口打开需求描述面板，未提交创建；连接入口打开默认 CLI 引导，桌面 Escape 关闭后焦点回到 `workspace-ai-trigger`，390px Enter 也能打开。应用类型检查、结构门及代码格式检查通过。验证后恢复原任务、345px 侧栏宽度和默认视口，未发布消息或执行外部 AI 操作。

FIG-LIST-006／007 与 FIG-CLI-009 在原路径刷新为 1280×720 简体中文当前实拍，保留 captured；列表图使用既有「锁定礼盒价格、赠品与库存」，收起图核验侧栏宽为 0。其他设置或回收站图片中被弹层模糊遮住的背景，不作为本次入口证据。证据限本地视觉与入口导航，不扩大生产能力判断。PRD 构建成功，25 个模块与索引同步，三张当前图片的实际内容已核验嵌入生成页；本次文件格式检查通过。

## PRD-0137：侧栏拖动边界与收起阻力

用户要求正常左拖先停在最小宽度并产生阻力，继续额外左拖一段才收起；右拖可调整宽度并有限定最大。本轮已确认目标为正常范围 260px 至 `min(520px, floor(任务工作区可用宽度 × 45%))`；向左到达 260px 后，视觉宽度保持 260px，额外左拖至少 80px，松手才收起，对应未截断拖动宽度不超过 180px。额外不足 80px 时松手仍为 260px。右拖、键盘调宽、宽度显示、无障碍范围及本次保存结果使用同一有效边界，拖动柄在分界线两侧均可命中。模块 06 3.4 是唯一正文归属，交互基线同步；保留 PRD-0136 的单向展开入口、松手连续衔接、上下文、设备偏好和窄屏规则，不改写旧日志。

本轮对照用户给出的 [Linear 页面](https://linear.app/bujiafei/project/frontdoor1-fa300c4e85a6/issues)，该页面观察到侧栏最小宽 192px，到达最小宽后额外左拖 46px 仍保持 192px，继续较长左拖才收起；右拖上限为 330px。以上仅为参考页面的交互观察，TaskDoor 不照搬这些数值，也不将它们作为本项目已实现证据。

当前 `task-sidebar-state.ts` 集中计算有效最大宽、最小宽预览与收起阈值，`useTaskSidebar.ts` 将预览硬保底为 260px，并将同一有效上限用于提交；`TaskWorkspace.tsx` 向拖动柄传入当前实际宽度和有效上限。`SidebarResizeHandle.tsx` 的无障碍范围为 260px 至当前上限，松手按最后指针位置重算；工作区保留拖动柄在边界左右各 6px 的命中区域，列表内容独立裁切。以上为本轮实现来源，业务规则仍以模块 06 为准。

主工作区 1280px 视口的原生拖动，从指针 369→223px，未截断宽度为 220px，侧栏连续显示 366→348→330→311→293→275→260px，左边界始终为 0；松手后仍为 260px 展开态。分界线左侧、线上与右侧的 363／366／369px 三个命中点均为拖动柄。由最小宽的右侧指针 263→700px 向右拖动后，侧栏实际宽、内容宽和无障碍值均为 520px。1024px 视口的有效最大宽为 460px，实际宽与无障碍值均为 460px；ArrowLeft 立即变为 444px，无最大宽外的键盘死区，End 回到 460px，边界右侧 463→690px 继续右拖仍为 460px。

从 260px 最小宽进行临界验证：指针 263→184px，额外左拖 79px，松手仍为 260px 且展开入口数量为 0；263→183px，额外左拖 80px，松手后完全收起为 0，点击展开恢复 260px。恢复 366px 后从 369→183px 左拖，拖动中停在 260px；松手起点为侧栏宽 260px／内容宽 260px／左边界 0，随后连续采样为 211.70／279.69／−67.98、74.98／335.43／−260.46，最终为 0／366／−366px，未出现此前松手瞬跳。运行轨迹保留为 `artifacts/task-sidebar-resistance-trace.json`；`artifacts/task-sidebar-min-width-zh.jpg` 是最小宽视觉验收实拍，不作为动效证明。

最终键盘核验：Enter 展开恢复 366px，连续 8 次 ArrowLeft 后仍为展开态、宽 260px；Home 收起后焦点转到展开图标，Space 展开恢复 260px，焦点回到拖动柄。验证后恢复本设备原 366px 宽度。390×844 下 `scrollWidth=clientWidth=390`，拖动柄不显示，展开图标容器数量为 0。浏览器存储中的每次调宽值本轮未单独读取，不把有效上限接入与页面值核验扩大为保存结果的逐项实测。

本轮边界定向测试新增用例在修正前有 4 条失败，修正后 7 条全部通过；应用类型、结构与 6 个目标文件的格式检查通过。Vite 前端生产打包通过，3416 个模块，6.20 秒。FIG-LIST-006／007 的静态展开／收起外观不受本轮数值算法影响，沿用 captured 实拍与原路径；两图只证明端态，不证明阻力、收起阈值、最大宽度或无障碍边界一致性。未发布历史版本，未运行全量测试或双重审查。

PRD 构建成功，25 个模块与索引同步；生成页已核验 PRD-0137、最小宽阻力、额外 80px 收起阈值、有效最大宽与双侧抓取规则，两张既有实拍内容保持。本轮文档格式检查通过，PRD-0136／0135 旧日志保留。

## PRD-0136：侧栏单向展开入口与松手衔接

用户明确要求展开态不显示常驻收起图标，只在收起态保留展开图标，并指出向左拖动末尾出现二次收起。模块 06 3.4 为当前规则的唯一正文归属，模块 04 引用；PRD-0136 替代 PRD-0135 的双态图标入口，侧栏仍由边缘拖动或聚焦拖动柄按 Home 收起，收起态侧栏图标通过点击、Enter 或 Space 展开。不增加悬停弹出侧栏，原宽度、上下文、设备偏好及窄屏行为保持。

本轮对照用户给出的 [Linear 页面](https://linear.app/bujiafei/project/frontdoor1-fa300c4e85a6/issues)：展开时主区无菜单侧栏按钮，拖动收起后主区保留菜单图标，点击恢复侧栏。逐步采样拖动末段，侧栏宽度为 192→198.39→240.23→244px，左边界为 0→−31.96→−241.15→−260px，宽度恢复与退出位移连续衔接。以上是该页面的参考观察，不作为 TaskDoor 已实现证据。

TaskDoor 修改前主工作区实测：侧栏从 366px 拖至 115px，预览列表宽缩至 260px；松手时侧栏仍为 115px，内部宽却立即由 260px 跳至 366px、左边界由 −145px 跳至 −251px，再继续向 0 收起。这一不连续位置变化对应用户反馈的末段顿挫。当前 `task-workspace.css` 将工作区轨道与列表内容宽度同步设为约 220ms、`cubic-bezier(.4,0,.2,1)` 过渡，平移按实际动画宽度计算；`TaskSidebarToggle.tsx` 只在收起态呈现入口，`useTaskSidebar.ts` 补充收起／展开提交后的焦点恢复，`SidebarResizeHandle.tsx` 将最后指针候选应用后再结束拖动，并将 Home 接入收起。

修正后主工作区原生拖动 366→115px，拖动时列表宽 260px、左边界 −145px。松手后连续采样的“侧栏宽／列表宽／列表左边界”为 107.21／267.17／−159.97、49.62／320.26／−270.65、13.70／353.37／−339.68、1.91／364.23／−362.33，最终为 0／366／−366px；采样中未出现修正前 260→366px 的瞬跳，列表右边缘与侧栏宽的偏差始终不超过 0.008px。展开态开关容器数量为 0，点击收起态入口展开后焦点位于“调整任务列表宽度”。聚焦拖动柄后 Home 收起，焦点转到“展开任务列表”；Enter 和 Space 展开后焦点回到“调整任务列表宽度”，开关容器数量为 0。常规拖动 366→300px 保存新宽度，再从 300→115px 拖动收起仍保留 300px，点击恢复 300px，验证后恢复原 366px。390×844 下页面宽为 390px 且无横向溢出，展开开关容器数量为 0，保留手机列表／详情返回模式。悬停不弹出、查询与编辑上下文、刷新偏好及减少动态效果本轮未逐项重复实测，原轮次证据只作历史。

`taskSidebarState` 的 3 条定向测试、应用类型检查与结构门通过，4 个修改代码文件格式检查通过。FIG-LIST-006／007 已在原路径刷新为主工作区 1280×720 简体中文同一秋季任务概览的静态终态，目视核验后恢复 captured 与模块 06 引用：展开态为 366px 且没有收起入口，收起态侧栏宽最终为 0，仅保留展开图标。两图只证明端态，不证明过渡；9/18 截止日期与第一条标准已确认均为既有业务状态。旧 PRD-0135 和其后视觉轮次的事实仅为历史记录，不改写为新入口证据。版本保持，不发布历史版本；本轮未运行全量测试或双重审查。

本轮 Vite 前端生产打包通过：3416 个模块，2.93 秒。PRD 构建成功，25 个模块与生成索引同步；生成页已核验 PRD-0136、单向展开入口、拖动柄 Home 收起与两张刷新实拍。本轮文档格式检查通过，PRD-0135 原日志行保留。

## 2026-10-12：详情外层左侧对齐（视觉调整）

用户要求任务详情居左对齐。本轮只增量调整 `src/features/tasks/styles/task-detail-split.css`，详情路径、标题组合、任务属性、页签及概览、讨论、活动与分析正文共用外层留白；讨论滚动区与输入区、分析面板及来源或错误区沿用同一值。留白按详情容器可用宽度响应：常规为 32px，不超过 980px 时为 22px，不超过 740px 时为 16px。图标后的文字、属性内部间距、讨论头像与活动时间线缩进、垂直间距和原操作保持。

主工作区 `http://127.0.0.1:5173/` 简体中文运行核验：1280×720、侧栏 366px、详情 914px 时，路径、标题行、属性、Tab、活动工具栏与时间线标记左边界均为 388px，即详情起点加 22px。侧栏收起后详情宽 1280px，上述起点均为 32px；概览目标及子任务标题左边界为 32px，讨论滚动区与输入区、分析面板左侧留白为 32px。1024×768 展开侧栏后详情宽 658px，共同起点为 382px，即 366px 加 16px；390×844 窄屏各外层起点为 16px，`scrollWidth=clientWidth=390`，无横向溢出。展开中间帧的六处外层起点仍一致。`artifacts/task-detail-alignment-activity-zh.jpg` 为本轮活动页面实拍验收材料，不作为讨论发布、活动生成或生产保存能力证明。

结构检查通过，无新增结构例外。FIG-LIST-006／007 已刷新为同一任务的主工作区 1280×720 概览实拍并目视核验；展开态为 366px 侧栏、914px 详情，收起态确认侧栏宽 0、详情左边界 0、头部起点 32px 后采集，沿用原图号与路径。原已 pending 的详情、讨论和活动图保持；不把本轮活动验收材料恢复为人员筛选或引用预览证据。PRD 构建成功，25 个模块与索引同步，生成页的外层对齐措辞和两张刷新图片已核验，本轮文档格式检查通过。模块 08 与交互基线只同步外层对齐表述，未改变入口、业务流程、权限、任务状态、筛选或验收标准；按纯视觉修正处理，不新增语义日志，既有 `last_change` 和版本保持，不发布历史版本。本轮未运行全量测试或双重审查，前轮侧栏与其他协作功能证据保留为对应轮次记录。

本轮 Vite 前端生产打包通过；未重跑 `npm run build` 或 TypeScript 检查。

## 2026-10-12：侧栏收起展开动效优化（视觉调整）

用户要求学习收起与展开的交互，不需要悬停弹出的侧栏。本轮 `task-workspace.css` 保留约 220ms 的单一宽度过渡，内部列表以实时容器宽度推导平移，收起时保持展开宽度并整体向左移出，详情同步获得空间；`TaskSidebarToggle.tsx` 统一使用轻量侧栏图标，动作由无障碍名称和按需提示说明。沿用 PRD-0135 的点击、拖动吸附、宽度恢复、上下文、设备偏好、键盘与窄屏规则，未增加弹出侧栏、快捷键或业务动作。

主工作区 `http://127.0.0.1:5173/` 简体中文 1280×720 实测：展开宽 366px，收起过渡中侧栏宽为 95.515625px，内部列表仍为 366px，左边界为 −270.484375px、右边界为 95.515625px，与侧栏边缘同步。完全收起后两列宽为 0／1280px，内部列表向左平移 366px，隐藏侧栏 `aria-hidden=true` 且 `inert`；悬停图标仍保持 `collapsed=true` 和列宽 0，没有弹出侧栏。原生拖动 366px 至 111px，松手吸附收起，再展开恢复 366px；连续点击和 Enter 切换正常，但工具操作间隔不能证明 220ms 内反向，未将中途反向记作已实测。搜索“秋季”在切换后保留并已恢复原输入，列表 `scrollTop` 为 720，收起展开后仍为 720。390×844 在桌面已收起偏好下仍可返回列表，内容无平移且搜索可见；验证后恢复默认视口，未写入任务或讨论数据。

本轮 3 条侧栏状态定向测试、结构门和 `tsconfig.app` 类型检查通过。FIG-LIST-006／007 已在原路径刷新为同一任务的当前展开／收起实拍，图号与图注保持，统一侧栏图标已目视核验；两图只证明静态端态，不证明动画。PRD 构建成功，25 个模块与索引同步，生成页包含动效措辞、PRD-0135 及两张刷新实拍；本轮文档格式检查通过。只调整动效与图标样式并润色模块 06 及交互基线，不新增语义变更 ID、不改 `last_change` 或发布版本。以下 PRD-0135 段落保留初次接入的验证与既有失败历史，不作为本轮重新运行完整构建或旧列表测试的记录。

## PRD-0135：侧栏完全收起

用户确认最小状态采用整栏完全收起、仅留一个侧栏图标，并明确授权按方案 3 实施，要求交互更丝滑。模块 06 3.4 为宽度、拖动吸附、恢复上下文、设备偏好、键盘和窄屏规则的唯一正文归属；模块 04 引用该规则，交互基线同步约 220ms 的连续过渡及不超过 900px 的单栏行为。收起仅作用于工作区任务导航，不恢复旧详情分栏。

当前前端由 `src/features/tasks/components/TaskWorkspace.tsx` 接入 `TaskSidebarToggle.tsx`、`SidebarResizeHandle.tsx`、`src/features/tasks/lib/useTaskSidebar.ts` 与 `task-sidebar-state.ts`，宽度、收起偏好与拖动吸附集中管理，工作区样式提供连续过渡与减少动态效果。桌面开关位于任务详情或创建页路径行，无详情时空态同样可展开；窄屏使用原单栏导航。

主工作区 `http://127.0.0.1:5173/`，1280×720 简体中文实测：点击收起后侧栏宽度为 0，侧栏正确设置 `aria-hidden`／`inert`，纯图标入口保留；再次展开恢复 366px，键盘 Enter 可展开且聚焦提示可见。原生拖动 366px 至 105px，松手完全收起，再展开恢复 366px。搜索关键词与未发布讨论草稿在切换后保持，列表实际 `scrollTop` 为 2183，收起展开后仍为 2183；刷新后 `data-sidebar-collapsed=true` 且列宽为 0，恢复本设备收起偏好。验证草稿已恢复，未发布消息。390px 窄屏在桌面已收起偏好下仍可从详情返回列表。以上证据支持本地点击、键盘、拖动吸附和已验证上下文；未逐项实测全部详情编辑、文件选择、动画中途反向及真实触屏手势。

`server/taskSidebarState.test.ts` 的 3 条定向测试、结构门、`tsconfig.app` 类型检查与 Vite 前端打包通过。本次新增文件的 node 工程清单已补齐，`npm run build` 仍被既有 server、types 及 I18n 等类型错误阻断；旧 `taskWorkspaceList` 测试有 13 条因默认英文或旧状态断言失败，不能记为整体构建或测试全绿。FIG-LIST-006／007 已采集为同一任务的主工作区 1280×720 展开／收起实拍并目视核验，模块 06 引用。FIG-LIST-002～005 保持 pending；模块 10 的 FIG-COLLAB-003／004／006 因旧图未包含新侧栏开关转为 pending，撤下正文，其原讨论与活动验收记录保留为对应轮次历史证据。版本保持 1.1，不发布历史版本；本轮不证明生产保存或跨设备同步。

## 2026-10-12：详情完成勾线宽协调（视觉调整）

用户指出详情任务完成标准的确认勾比左侧任务列表显细。`src/features/tasks/styles/task-criterion-review.css` 将详情已确认圆环中心路径的 `stroke-width` 从 2 调为 2.5，保留 24px SVG、0.86 路径缩放、位置、配色与点击区；任务完成标准和标题确认入口共用此样式，左侧列表共享图形原有 2.5 线宽保持。未改变人工确认、撤销、任务状态或 AI 进度。

主工作区 `http://127.0.0.1:5173/` 1280×720 简体中文实际页面核验：「完成秋季抗老精华首发闭环」当前第一条标准已确认，其路径与圆环计算线宽均为 2.5px，SVG 为 24px、路径缩放为 0.86；左侧已完成任务路径仍为 2.5px。实拍 `/private/tmp/taskdoor-detail-check-weight.jpg` 已目视对照，仅作本轮验收证据。未点击确认或写入业务数据。

FIG-COLLAB-003／004／006 原图含标题已确认勾，现以独立 JPEG 路径刷新为主工作区 1280×720 实拍，分别展示紧凑人员筛选、回复引用收起和键盘引用预览。原已 pending 的详情完成标准截图保持。模块 10 仅更新图片引用；本轮纯视觉修正不新增语义日志、不改版本或 `last_change`。前端 Vite 构建通过；验证限本地视觉与样式，不证明生产服务。

## 2026-10-12：状态选项图标纠正（视觉调整）

`src/shared/ui/TaskStatusBadge.tsx` 的静态进行中图标固定传入 `ratio={1}`，详情状态菜单、任务列表快捷状态筛选、高级筛选及已选状态标签共用此定义，呈现四段全亮圆环。已阻塞的静态选项和实际任务状态图标统一使用 `TriangleAlert`；实际进行中任务继续由 `TaskStatusIcon` 读取有效 AI 进度，无评估时保持未填充。`TaskCompletionIndicator.tsx` 的标题进度与人工确认入口保留原 AI 段数和确认行为。

主工作区 `http://127.0.0.1:5173/` 的隔离浏览器会话（1280×900，简体中文）核对快捷状态筛选与详情状态菜单：进行中四段透明度均为 1，已阻塞为橙色警告三角；筛选已阻塞后 3 条任务行及所选任务状态字段均使用同一三角图标，清除筛选后进行中任务的状态与标题保留原 AI 三亮一暗段数。未修改任务数据。页面无应用运行异常，浏览器另有既有 `favicon.ico` 404；应用类型与结构检查通过。

本轮仅修正状态图形，未改变状态选项、筛选数量、权限、保存或进度计算，按纯视觉修正同步模块 06／08 与交互基线，不新增语义日志、不修改版本或 `last_change`。运行证据限本地 demo，不作为生产服务证明。明确展示旧状态选项的 FIG-LIST-005 继续 pending，并补充图标失效原因；原已 pending 的详情截图保持，不将旧图恢复为当前证据。

## 2026-10-12：独立紧凑人员筛选（视觉调整）

用户确认人员筛选菜单需独立于负责人／参与人赋值列表。新增 `features/members/components/PersonFilterSelect.tsx` 与 `features/members/styles/person-filter.css`，活动、行为日志及旧工作区筛选入口均接入；`PersonPicker` 移除 filter 入口，继续负责赋值、交接、提及等操作。筛选触发器复用公共 Select 样式与字体契约；人员显示和搜索标签复用 `PersonAvatar.tsx` 的姓名格式，未增加结构例外。活动作者候选及稳定 ID、类型组合、行为日志的操作人候选和分页规则保持。旧 `WorkspaceList`／`TaskOverviewWorkspace` 无当前 src 调用，只登记组件迁移，不作为用户可用页面证据；后者仍保留原 owner 字符串比较。

主工作区 `http://127.0.0.1:5173/` 实测：桌面菜单宽 240px、头像 22px、选项行 36px；「锁定礼盒价格、赠品与库存」的 3 个选项菜单高 153px，9 条活动保持。搜索周岚后 Enter 选择显示 2 条，叠加文件为空；恢复全部人员保留文件条件显示 2 条提交，恢复全部类型回 9 条。无匹配提示、Escape 返回人员入口、再次打开清空搜索均通过。行为日志从第 2 / 3 页搜索选周岚后回第 1 / 1 页，8 条均为该人员，恢复全部回第 1 / 3 页；9 个候选的列表最高 240px 并可滚动。两页筛选入口桌面为 12px／500／32px，390×844 为 14px／500／44px；窄屏菜单宽 240px、选项行 44px且在视口内，页面宽 390。详情参与人列表仍为 420px 宽、36px 头像、52px 行高，未选择或修改成员。

FIG-COLLAB-003 与 FIG-TEAM-008 均使用新的独立 JPEG 路径采集 1280×720 主工作区实拍，展示菜单展开状态，替代此前冲突或旧组件的图片证据；此前轮次记录仅保留为历史。模块 10／25 与生成页同步，搜索、候选、应用条件及权限均未改变，按纯视觉与组件组织修正处理，不新增语义日志、不修改版本或 `last_change`。本轮未创建讨论、任务或成员数据。
应用类型、结构检查、Vite 前端构建及本次文件的格式检查通过；PRD 构建成功，25 个模块与生成页同步，紧凑菜单文案及两张当前图片均已输出。未运行全量测试或双重审查。


## 2026-10-12：新讨论相对时间立即更新（缺陷修复）

主工作区既有 Mock「锁定礼盒价格、赠品与库存」实际发布临时验证消息后，首次渲染显示完整日期「2026年10月12日17:48」，到旧计时器刷新后才变为「刚刚」。根因为 `TaskDiscussion.tsx` 与文件讨论的 `DiscussionMessages.tsx` 缓存当前时间、每 60 秒才更新，新消息时间晚于缓存值时被 `relativeTaskTime` 的未来时间分支按绝对日期展示。两组件现每次渲染读取实时 `Date.now()`，分钟计时器仅触发重新渲染；时间格式函数和已确认产品规则保持。此前布局轮次的函数样例验证没有覆盖组件保持挂载时新消息与缓存时钟的组合，本轮补充该回归场景。

修复后实际发布的新消息 `createdAt=2026-10-12T09:53:30.816Z` 立即显示「刚刚」，完整时间为「2026年10月12日17:53」；前一条临时消息当时显示「5分钟前」，旧 Mock 日期仍保持 9/14 17:30 等原记录。`artifacts/task-discussion-relative-time-fixed.jpg` 为默认 444×720 主工作区浏览器验收实拍，已目视核验；图片中两条临时消息随后均通过各自更多菜单删除，恢复原 4 条 Mock，用户已有消息未修改。该图只保留本轮验收证据，不放入 PRD 正文或截图清单，不替代 FIG-COLLAB-004／006。

`server/taskDiscussionFeedInteraction.test.ts` 的 10 项定向测试通过，新增的任务讨论和文件讨论保持挂载后接收新消息用例均先失败、修复后通过；应用类型检查与本次源码格式检查通过。此轮修复既定近期时间规则，不新增语义 ID，不改模块正文、`last_change` 或 CHANGELOG。证据限本地 demo 渲染、临时消息发布与清理，不扩大生产保存或通知服务判断；保留并行 PRD-0134 及其他文档变更。

## 2026-10-12：活动类型标签与动作措辞（视觉调整）

用户要求恢复三类彩色类型胶囊并放在操作人／动作文字最后。`TaskActivityLog.tsx` 在 summary 最后呈现类型标签，`task-records.css` 分别沿用任务信息蓝色、讨论青绿色、文件紫色；仅 `task-definition-change` 的动作文字改为「更新了任务信息」，状态、参与人等其他具体动作保持。左侧动作图标、姓名前头像、来源操作与下一行文件引用保持，提交记录仍无额外说明，原字段前→后值渲染未改。

主工作区协作平台团队「完成移动端 3.8.0 可控发布」实测 14 条活动对应 14 个类型标签，每个标签均紧跟动作文字并为 summary 最后一个子元素。任务信息标签背景／文字为 rgb(234, 246, 255)／rgb(8, 105, 188)，讨论为 rgb(240, 253, 250)／rgb(23, 118, 101)，文件为 rgb(245, 243, 255)／rgb(108, 60, 240)。5 条字段 changes 均显示记录中的前→后值，1 条任务定义变更显示「更新了任务信息」，文件提交说明为 0。桌面页面宽为 1280；390×844 下仍有 14 个顺序正确的标签与 5 条 changes，字段值没有超出视口，页面宽为 390，文件提交仍无说明。

上述记录沿用已有团队示例，没有补造礼盒任务的历史旧值。5 条 changes 是已渲染的结构化条目，不代表 5 项值均真实改变；状态合成历史的前后值都显示「进行中」，属于既有状态显示映射，本轮未调整。应用类型与结构检查通过；本轮标签和措辞不改变来源操作，未重复行为测试，此前文件打开证据保留为对应轮次历史验证。

本轮属于视觉与措辞修正，不新增语义 ID、不改版本、模块 `last_change` 或 CHANGELOG；模块 10 只同步动作文字后的类型标签规则，保留其他会话的 PRD-0134 可搜索人员筛选。FIG-COLLAB-003 已刷新为上述任务的 1280×1000 简体中文主工作区实拍，目视核验后恢复 captured 与正文引用；此前无类型胶囊的图片与计数是历史证据，不证明当前表现。本轮未运行 PRD 构建，临时视口已恢复。

## PRD-0134：人员筛选一致性

用户要求相邻筛选文案及其他人员筛选列表保持一致。浏览器修改前实测活动类型字重为 500、活动人员为 400；根因为未分层的 `button { font: inherit; }` 覆盖 Tailwind 字重，只有 `ListFilterSelect` 的页面类另行恢复 500。`select.tsx` 提供共用触发器样式，`pm-global.css` 为 Select 与人员筛选声明统一字体和尺寸；`TaskActivityLog.tsx` 与 `AuditLogPanel.tsx` 的人员入口复用 `PersonPicker`，保持原人员 ID、候选范围与组合条件，行为日志动作也复用 `ListFilterSelect`。人员筛选默认统一「全部人员」，列表沿用共用的姓名、头像与选中态；筛选用途关闭人员资料预览，赋值、多选、推荐和邀请用途保持原逻辑。

主工作区 1280×720 实测活动两入口均为 12px、字重 500、32px 高，字体、边框与阴影相同；人员列表与详情参与人列表均为 14px、字重 600、36px 头像和 52px 行高。搜索「周」后键盘 Enter 选择周岚，活动为 2 条；叠加文件类型为空，恢复全部人员后保留文件条件得到 2 条提交，恢复全部类型为原 9 条。行为日志从第 2 / 3 页搜索周岚后回到第 1 / 1 页，8 条记录均归周岚；恢复全部人员为第 1 / 3 页。390×844 时两页相邻筛选均为 14px、字重 500、44px 高，人员弹层边界为 12～378px，页面宽为 390；无匹配搜索显示空态，Escape 关闭后焦点返回活动人员入口。

FIG-TEAM-008 已刷新为主工作区默认 1280×720 简体中文实拍。活动筛选测量后出现并行的类型标签更新及临时测试讨论记录，随后同路径截图写入冲突，当前文件与登记任务场景不一致。保留并行代码、需求和数据，FIG-COLLAB-003 恢复 pending 并撤下正文，完整页待重新采集；前一节的截图采集描述仅保留为对应轮次记录。上述 9 条活动及筛选数量为本轮验证时的记录，不代表并行新增记录后的当前总量。模块 10／25 接入可搜索列表属于交互变化，记录 PRD-0134；触发器字体与样式统一为视觉修正。未修改任务、消息、成员或日志数据。上述证据限本地展示、搜索与筛选，不证明生产服务或未覆盖的历史同名人员准确归属；未被当前应用调用的 `WorkspaceList`、`TaskOverviewWorkspace` 不作为用户可用页面证据。

应用类型检查、结构检查、Vite 前端构建与本次文件的格式检查通过；PRD 构建成功，生成页包含 PRD-0134，模块索引已同步。未运行全量测试或双重审查。

## 2026-10-12：讨论时间移至消息底部（视觉调整）

`TaskDiscussionMessage.tsx` 将时间从消息头移到正文下方的操作行左侧，与右侧回复同一行；相对时间仍使用原 `relativeTaskTime`，没有时间戳或无效值不补造时间。主工作区既有 Mock「锁定礼盒价格、赠品与库存」的 4 条时间保持 9/14 17:30、9/2 18:20、9/1 10:06、9/1 10:00，消息头不再显示时间。1280×900 时正文和时间左边界均为 434px、回复右边界为 1256px；444×720 时各条时间左边界为 60px、回复右边界为 426px，时间与回复的纵向中心一致，两种尺寸无横向溢出。对真实函数在 Asia/Shanghai 时区验证 10 分钟前、2 小时前、昨天 10:06、9/14 17:30 及无效值返回 null，完整时间提示保留日期与时分。

FIG-COLLAB-004 刷新为上述任务的 1280×900 简体中文实拍；FIG-COLLAB-006 刷新为既有 Mock「更新 GMV 看板与渠道归因」的键盘引用预览实拍，点击图标仍精确定位 `task-activity-fragrance-data-activity`。截图已目视确认，源码格式检查通过；未发布消息或新建任务，最后恢复默认视口。本轮为纯布局调整，不重复运行行为测试，不改变时间规则、正文、模块 last_change 或语义日志，证据限本地显示与引用操作。

## PRD-0133：文件提交活动展示范围

用户要求去掉「提交了文件」记录下的额外说明，文件引用放在提交动作下方。已确认规则写入模块 10：提交内容仅展示本次文件引用，不附加自动生成说明；保留来源打开、不可用提示与窄屏换行，讨论正文及任务字段变更保持。

修改前核验两句说明来自预填演示数据：`src/ai/mock/data/taskDetailMocks.ts` 为提交生成「更新…的范围、依据与交付结果」，`src/ai/mock/data/expandedTaskDiagnosisExamples.ts` 生成「补入…的核对资料」，均写入 `commit.message`，不是活动页实时生成。`TaskActivityLog.tsx` 已将提交记录排除在说明渲染之外，文件引用统一放入动作下方的 `task-change-files`，原数据保留。

主工作区「锁定礼盒价格、赠品与库存」1280×720 实测两条文件提交的 header 文件数和 `task-change-description` 数均为 0，下方文件行分别含 2 个、1 个引用，与 header 间距均为 8px；7 条非提交活动的原说明仍展示，页面宽为 1280。键盘 Enter 打开「礼盒商品权益确认表.xlsx」后，文件页选中对应树节点并显示该文件编辑标题与表格。390×844 下两条提交同样没有额外说明或 header 文件，第一条的两个引用纵坐标为 854.96875px、906.96875px，按钮均为 44px 高，自然换行且页面宽为 390。应用类型与结构检查通过，无新增结构违反。FIG-COLLAB-003 已同路径刷新为主工作区 1280×720 完整当前页，目视确认后恢复 captured 与正文引用；此前轮次日志和其他截图保留。证据限本地展示、键盘打开与窄屏布局，不扩大生产能力判断。

## 2026-10-12：活动头像尺寸协调（视觉调整）

用户反馈姓名前头像过小，与动作图标及正文不协调。仅将 `TaskActivityLog.tsx` 中 `task-change-actor` 的 `PersonAvatar` 从 xs（22px）改为 sm（28px），时间线动作图标仍为 28px、筛选中的头像仍为 22px，操作人组合继续垂直居中。仅作尺寸修正，正文规则、PRD-0132、模块 `last_change` 与变更日志不变。

主工作区 1280×720 页面实测 9 条活动的姓名前头像均为 28×28px，动作图标 9 个；首条头像和动作标记的纵向中心均为 370.1953px，姓名为 370.1914px，头像与姓名间距为 8px，视口与页面宽均为 1280。390×844 页面首条头像为 28×28px，头像与标记中心均为 488.1953px、姓名为 488.1914px，9 条活动对应 9 个动作图标，页面宽为 390，无横向溢出。FIG-COLLAB-003 已用主工作区同路径 1280×720 简体中文新图刷新并恢复 captured，图片经查看确认；证据仅补头像尺寸与对齐，不扩大功能或其他截图范围。

## 2026-10-12：活动动作标识与操作人组合（视觉调整）

用户纠正上轮活动标识的呈现：`TaskActivityLog.tsx` 保留时间线动作图标，头像放在 `task-change-actor` 的姓名前，移除重复区分类型的任务信息／讨论胶囊；讨论动作文字承接原来源入口，文件名称保留单层引用按钮。类型与人员筛选、活动记录和来源导航能力保持。本轮为视觉纠正，不新增语义变更 ID，不修改模块 `last_change` 或改写 PRD-0132 日志；模块 10 同步最终呈现。

主工作区 `http://127.0.0.1:5173/` 当前任务「锁定礼盒价格、赠品与库存」实测：1280×720 页面的 9 条活动均有左侧动作 SVG 和姓名前头像，`task-change-kind`／`task-change-object` 数量均为 0，页面 scrollWidth 为 1280。键盘 Enter 激活「回复了讨论 · 查看讨论」后进入讨论并精确聚焦 `task-activity-fragrance-product-activity-reply`；选择周岚仍为 2 条状态／定义记录。390×844 页面同样有 9 个动作图标、9 个姓名前头像且无类型胶囊，页面宽为 390；首条图标与头像纵向中心分别为 488.195px 和 488.188px，讨论动作按钮为 44px 高。应用类型和结构检查通过。证据限本地布局、人员筛选与来源导航，不证明生产服务、全部长文件名或历史同名人员的准确归属。

下方 PRD-0132 首次实现记录中的「9 个左侧头像」是上轮页面证据，已被本轮动作图标与姓名前头像组合替代，不能继续作为当前呈现说明。FIG-COLLAB-003 已从主工作区同路径重新采集为 1280×720 简体中文当前页，并恢复模块正文引用；FIG-DETAIL-005 和 FIG-PREVIEW-014 仍保持 pending，不扩大截图范围。

## 2026-10-12：顶部右侧入口分组与样式统一（视觉调整）

新建任务与连接 AI 组成操作组，通知与头像作为最右侧工具组；两类按钮使用一致的中性白底浅边框，移除连接 AI 的渐变与阴影。主工作区 1280×720 页面测得操作按钮均为 36px 高、13px 字号，通知与头像点击区均为 40×40，四个入口垂直中心均为 31.5px，两组间距为 16px。375×720 和 320×720 页面中四个入口均为 44×44，顶栏 scrollWidth 分别为 375、320，顶栏宽度与视口一致，无重叠或横向溢出；320px 时工具组位于 112～304px，团队右边界为 84px。点击连接 AI 正常打开对应对话，通知正常打开、Escape 关闭后焦点返回通知入口；头像支持回车打开账户菜单及 Escape 关闭。应用类型、结构与代码格式检查通过；`workspaceNavigation` 定向验证 5 项中 3 项通过，2 项为既有中文字符串源码断言与当前国际化调用不一致（分别期待账户菜单与退出登录的中文 `aria-label`／文字字面量，当前使用 `t(...)`），不登记为全部通过。`/private/tmp/taskdoor-topbar-layout-desktop.jpg` 仅用于本轮效果核对，未登记为 PRD 图片；FIG-COLLAB-003 和其他会话刚更新的 FIG-COLLAB-004 实拍顶栏均已符合本轮布局，FIG-CLI-009 的虚化背景不作为顶栏证据。本轮只改变排列和样式，入口流程与权限保持，不新增语义变更 ID；证据限本地布局与导航。

## PRD-0132：活动人员展示与筛选

用户提供当前活动页截图并明确要求展示人员头像、支持按人筛选，以及修正文件胶囊展示。已确认规则写入模块 10：每条活动显示操作人头像和姓名，人员单选与活动类型共同筛选，人员选项只包含本任务真实活动操作者，按稳定身份区分同名；无匹配与尚无活动分别提示，文件引用保留来源操作并支持长名称及窄屏阅读。

`TaskActivityLog.tsx` 复用 `usePersonOptions` 与 `PersonDirectory` 解析现有 `author`，以成员 ID 或唯一姓名取得稳定人员身份；每条记录使用 `PersonAvatar`，人员选项按身份去重，人员与类型条件共同过滤。未新增身份字段或迁移全部历史记录；仅保存同名署名且无法唯一解析的历史记录保留原署名，不猜测成员归属，这类记录不能证明准确区分同名人员。文件引用直接使用 `TaskActivityFileLink`，移除原 `task-change-object` 外层，避免嵌套胶囊。

主工作区 `http://127.0.0.1:5173/` 使用既有任务「锁定礼盒价格、赠品与库存」核验：9 条记录各显示对应头像，人员菜单只含梁川和周岚；周岚筛选为 2 条任务信息，叠加文件类型显示无匹配空态。通过键盘 Home、Enter 恢复全部人员后仍保留文件类型并显示 2 条提交；Enter 打开文件引用后精确进入「礼盒商品权益确认表.xlsx」编辑页。390×844 视口的页面 scrollWidth 为 390，筛选与文件按钮均为 44px 高，多个文件自然换行且不存在外层对象胶囊。1280px 桌面页面同样无横向溢出，DOM 中 9 条活动对应 9 个左侧头像，嵌套文件胶囊数量为 0。应用类型、结构检查与 `server/taskActivity.test.ts` 的 40 项定向测试通过。上述证据限本地阅读、筛选与来源导航，不证明全部长文件名场景、同名历史准确归属或生产服务。FIG-COLLAB-003 已登记为本轮主工作区 1280×720 简体中文实拍；FIG-DETAIL-005 和 FIG-PREVIEW-014 的旧复用图继续 pending，不作为当前证据。

## PRD-0130：任务引用按需预览

用户要求收起任务回复的引用正文，通过姓名后消息图标悬停查看。本轮确认键盘聚焦同样可预览，桌面点击定位原消息，触屏先打开预览再通过预览内操作定位；原消息已删除或不可用时仅提示，不展示旧正文或定位。`TaskDiscussionMessage.tsx` 与消息流样式实现图标和预览，模块 10 与交互基线同步，替代 PRD-0127 的常驻引用摘要呈现。

主工作区查看既有 Mock「更新 GMV 看板与渠道归因」，4 条消息依次为 9/14 17:30、9/2 18:20、9/1 10:06、9/1 10:00；第三条回复仅保留姓名后引用图标，闭合时该回复不展示父消息摘要。Shift+Tab 聚焦图标打开预览，显示完整父原文与定位操作；桌面点击图标、窄屏点击预览内定位均精确聚焦并高亮 `task-activity-fragrance-data-activity`，同时关闭预览。1280×900 与 444×720 无横向溢出，窄屏预览左右边界为 20.37px 与 423.63px；真实触屏手势未由浏览器工具模拟，`pointerType: touch` 只预览、不直接跳转的分支由定向测试覆盖。未发布消息，最后恢复默认视口与阅读起点。2 个定向文件共 30 项测试、应用类型、结构及源码格式检查通过。FIG-COLLAB-004 更新为引用收起实拍，新增 FIG-COLLAB-006 为键盘聚焦显示预览的实拍，均来自主工作区 1280×900 简体中文页面；FIG-COLLAB-005 保持历史 superseded。证据限本地阅读与引用定位，不证明生产保存、通知投递或 AI 服务。

## PRD-0131：连接能力范围修正

本轮用户提供的正式项目沟通明确：CLI 与 API 接口、能力一致，提供完整能力；MCP 为减少工具上下文占用而精选部分接口，不覆盖完整 API；CLI 与 MCP 的鉴权方式一致。以上作为已确认产品规则，替代 PRD-0128 的能力判断。用户进一步要求保留原产品连接标识、标题、说明与主连接布局，仅补充选择依据。`AiConnectionPage.tsx` 与连接样式已采用 CLI、MCP、API 简洁文字标签，默认 CLI，选中分支集中显示一段能力与场景说明，保留授权、令牌管理和文档入口。应用类型检查、结构门与前端构建通过；主工作区浏览器核验 CLI/MCP/API 说明与入口、产品选择时 logo 与配置文案联动，444px 和 1280px 两种视口无横向溢出。未核验生产接口清单、完整业务能力、鉴权稳定性或 token 成本，不能将选择说明作为真实服务能力验证。FIG-CLI-009 已重新采集为主工作区 1280×900 的 CLI 默认分支。

## 2026-10-12：讨论回复操作对齐（视觉调整）

`TaskDiscussionMessage.tsx` 将更多操作置于回复之前，配合消息流样式的固定双列，使回复始终位于末列并沿消息右边界对齐；更多菜单隐藏或不存在时不会推移回复，触屏仍保留 44×44 点击区。主工作区使用既有 Mock「锁定礼盒价格、赠品与库存」核验 4 条回复按钮：1280×900 时回复、时间及消息右边界均为 1256px，444×720 时均为 426px，两种尺寸无横向溢出。点击第三条回复正确进入底部「回复 梁川」，取消后恢复普通空输入，未发布消息。应用类型及源码格式检查通过；FIG-COLLAB-004 刷新为主工作区 1280×900 简体中文实拍。本次仅调整操作布局，更多菜单权限和原有讨论规则保持，不新增语义变更 ID。

## 2026-10-12：讨论消息虚线分隔（视觉调整）

用户要求讨论逐条增加轻量虚线分隔。参考 [21st.dev 的 Activity Feed Items](https://21st.dev/@felipemenezes098/components/the-item-one/activity-feed-items) 中的单层列表分隔方式，`task-discussion-feed.css` 在相邻消息间使用 1px 虚线，沿正文对齐，末条不显示；分隔层不接收指针事件。主工作区查看既有 Mock「锁定礼盒价格、赠品与库存」，4 条消息仍按 9/14 17:30、9/2 18:20、9/1 10:06、9/1 10:00 倒序展示，引用点击仍精确聚焦并高亮 `task-activity-fragrance-product-activity`。1280×900 与 444×720 视口均无横向溢出，未发布消息或新建任务；源码格式检查通过，纯 CSS 未重复运行行为测试。FIG-COLLAB-004 刷新为主工作区 1280×900 简体中文实拍，包含当前任务与导航。排序、回复、权限及文件内线程规则保持，本轮为纯视觉调整，不新增语义变更 ID。

## PRD-0129：新建任务入口迁移

用户要求去掉任务侧栏标题行，将创建按钮放在顶部栏右侧。`src/app/workspace/components/WorkspaceTopbar.tsx` 接收 `onCreateTask` 并在通知之前展示新建任务按钮；`src/app/App.tsx` 复用 `startNewTaskConversation`，与原空工作区创建进入同一流程。`TaskWorkspaceList.tsx` 不再展示标题行，保留搜索筛选与空态创建；样式分别归顶栏与任务列表。主工作区浏览器确认标题行消失、搜索上移及顶栏新建入口；444px 窄屏收为图标，回车打开新建任务面板并聚焦需求描述输入框。按钮按用户反馈改为白底、浅边框、灰色文字，与连接 AI 同高同字号，属于纯视觉调整，不新增变更 ID。结构检查、应用类型检查和 Vite 前端构建通过；完整 `npm run build` 被当前 `tsconfig.node.json` 的 TS6307 文件清单／包含范围错误阻塞，既有 `server/taskWorkspaceList.test.ts` 混用中英文翻译的断言失败，不登记为测试通过。证据限本地入口与创建面板导航，不扩大生产创建能力判断。FIG-LIST-005、FIG-DETAIL-015～018、FIG-COLLAB-002、FIG-TEAM-005 直接显示旧工作区导航，恢复待采集并撤下当前正文；其余原已 pending 的列表与创建截图保持。FIG-WORK-001 同步顶部创建及侧栏搜索筛选，是目标示意，不作为运行证据。

## PRD-0128：连接方式选择

`AiConnectionPage.tsx` 与 `local-agent-connection.css` 实现 CLI/MCP/API 选择引导、MCP 双认证说明和 API 令牌与文档入口。能力范围来自用户本轮确认；这里只实现接入引导，不证明生产 CLI、MCP、API 服务能力。应用类型与结构检查、前端构建通过；浏览器核验 CLI、MCP、API 分支切换与入口地址，FIG-CLI-009 为主工作区实拍。未执行客户端唤起、令牌创建或真实授权。

## PRD-0127：任务讨论倒序与单一消息流

用户明确取消回复数量与同串阅读入口，任务主消息和回复按时间倒序逐条展示，最近消息在前；回复者与被回复者姓名同字号，引用仍精确定位原消息。规则更新模块 10 与交互基线，替代 PRD-0126 的顺序和同串阅读，文件内讨论保持原线程。主工作区查看既有 Mock「锁定礼盒价格、赠品与库存」，4 条消息依次为 9/14 17:30、9/2 18:20、9/1 10:06、9/1 10:00，无回复数量入口；回复者与被回复者字号均为 14px。点击引用精确聚焦 `task-activity-fragrance-product-activity` 并高亮 1800ms，逐条回复进入底部指定对象，取消后恢复普通空输入，未发布消息。1280×900 与 723px 默认视口均无横向溢出；46 项定向测试、应用类型、结构及源码格式检查通过。FIG-COLLAB-004 更新为主工作区 1280×900 简体中文实拍，包含最新导航；FIG-COLLAB-005 的同串截图退出当前正文并标记 superseded，保留文件供历史追溯。证据限本地阅读与回复草稿交互，不证明生产保存、通知投递或 AI 服务。

## PRD-0126：任务讨论消息流

用户要求参考逐条回复消息流，能点击定位被回复消息，也能从主消息查看该串并继续回复。任务讨论使用 `discussion-feed.ts` 投影、`TaskDiscussionMessage.tsx` 及统一输入流程，原文定位采用对应消息 ID，同串阅读复用讨论区，AI 连接移入消息更多菜单；文件内讨论保持原线程。主工作区查看既有 Mock「终审短视频脚本与直播卖点」，全部流含主消息、直接回复及另一条主消息共 3 条，查看 1 条回复后同串仅 2 条且默认回复主消息；点击摘要精确聚焦原消息并短暂高亮 1800ms。普通与回复草稿切换保留，验证输入已键盘清空，未发布消息。1280×900、723px 默认视口与 390×844 手机视口均无横向溢出，底部统一输入；其他作者发言未显示编辑删除权限。4 个定向测试文件 48 项、应用类型和结构检查通过。FIG-COLLAB-004／005 是主工作区 1280×900 简体中文实拍；旧讨论截图继续 pending，证据限本地消息流与交互，不证明生产保存、通知投递或 AI 服务。

## PRD-0125：状态筛选数量

用户要求任务列表的状态菜单显示任务数量，数字右对齐，选中勾保留并位于数字左侧。`task-list-projection.ts` 统计已去重的候选集合，排除状态条件但保留任务范围、关键词和其他筛选，历史待开始按进行中统计；`TaskWorkspaceList.tsx` 展示总数及各状态数量，`task-workspace-list.css` 保持数字和选中勾独立对齐。主工作区使用原有团队 Mock 验证全部 76 项，进行中 62、已阻塞 3、已完成 10、已取消 1；选择已取消后列表为 1，菜单其他数量保持。搜索「国庆专场」后总数与已取消均为 1，其余为 0；再选我负责范围后全部为 0。未创建或修改任务，最终恢复原查询。数字右边界均为 287px、勾右边界为 253.148px。应用类型检查和 2 项状态数量定向测试通过，FIG-LIST-005 为主工作区当前 723×720 简体中文页面；证据限本地界面和统计投影，不证明生产数据服务。旧列表截图继续保持待采集。

## 2026-10-12：已取消图标灰色统一（视觉调整）

已取消状态统一使用共享中性色，详情标题圆环与状态图标采用相同灰色；原有圆环叉形状、状态修改和人工确认行为保持。主工作区查看原为已取消的 Mock 任务「国庆专场跨平台联播筹备」，列表图标、详情标题圆环与状态按钮的 SVG 均为 rgb(119, 119, 119)，data-tone 为 neutral；未写入任务状态。截图 `artifacts/cancelled-icon-gray.png` 为实际页面，应用类型检查通过，证据限本地 UI。本次只调整视觉配色，不新增语义变更 ID。

## PRD-0124：AI 辅助修改范围纠正

用户明确本次仅删除分析页签里的「AI 帮你改」。创建页及主任务／子任务审阅的入口、共享浮层、建议应用与相关词条和测试恢复；分析仍没有调整入口和应用回调。共享样式回到 `task-ai-adjustment.css`，结构例外恢复原数量，保留此前无图标、拆解等待与人工编辑等改动。主工作区浏览器验证创建主任务生成后「AI 帮你改任务方案」可打开本次对话、继续输入及关闭；未提交创建或修改任务记录。应用类型、结构检查与 1 项范围定向用例通过，`artifacts/creation-ai-adjust-restored.png` 为创建弹层实拍。FIG-DETAIL-015 仍对应只保留重新分析的页面；本轮没有新增生产服务验证。

## PRD-0123：移除 AI 辅助修改

`App`、`TaskDetail` 及创建审阅组件移除「AI 帮你改」入口、调整草稿、应用回调与浮层组件，专属样式删除，生成反馈与历史等仍用样式保留到 `task-ai-common.css`。分析仅保留重新分析；概览手工编辑与新增子任务、创建生成与继续拆解保留。主工作区浏览器验证「定稿发布会主视觉」分析无旧入口及浮层、重新分析仍可操作；「整理下周例会纪要」正常生成主任务审阅、继续拆解在子任务区展示处理步骤。未提交创建或改写任务记录。应用类型检查、结构检查及 6 项定向用例通过；混合测试尚有既有 i18n／旧结构断言漂移，本次未扩大修复。FIG-DETAIL-015 刷新，证据仅覆盖本地 demo UI，不证明生产端服务。

## 2026-10-12：完成标准与标题完成图形统一（视觉调整）

进一步轻量化详情确认态：图形从 28px 调整为 24px 居中，环线宽 2.5、中心勾线宽 2 并缩放至 0.86；标题与标准同步，绿色保持。按钮仍为桌面 28px、触屏 44px，列表状态图形不改。主工作区实际测量两处确认图形均为 24px、按钮均为 28px，未修改状态或标准确认；FIG-DETAIL-017 重新采集。本次仍为纯视觉修正，不新增语义变更 ID。

未确认标准的四段圆环也统一采用 ad-task-status-progress，亮段不透明、暗段透明度 0.2，悬停反馈使用同色。浏览器核对「定稿发布会主视觉」：标题与标准的描边均为 rgb(0, 138, 245)，暗段均为 0.2；未改评估或确认。FIG-DETAIL-016 已刷新，属于纯配色修正，不新增变更 ID。

TaskCriterionIndicator 的人工确认态复用 TaskProgressIcon，与标题采用相同绿色描边圆环、线宽和中心勾；聚焦时保留撤销图形，保存时保留加载提示。主工作区查看「锁定礼盒价格、赠品与库存」，顶部和标准均为 rgb(87, 188, 108)、3px 描边、透明背景；键盘聚焦显示撤销，未修改已有确认。应用类型检查通过，FIG-DETAIL-017 已重新采集。仅统一视觉表达，不改变确认、AI 或状态规则，不新增语义变更 ID；证据限本地 UI。

## PRD-0122：分析入口按依据展示

`TaskDetail` 使用忽略人工完成状态后的当前范围进度投影判断可用依据，ratio 为 null 时不渲染分析 tab 和 panel。名称、状态及仅估算不生成展示资格，有效零值不按缺失处理。当前分析失效时渲染概览并同步选择；键盘遍历仅含可用页签。浏览器验证「补齐直播断流与缺货应急预案」无分析页签、无分析 panel（DOM 数量 0），End 落到活动；「定稿发布会主视觉」仍可打开分析及基本完成评估。未修改任务数据。应用类型检查通过；FIG-DETAIL-018 为主工作区实际页面，仅证明本地 UI。

## PRD-0121：分析导航与状态视觉统一

`TaskDetail` 的分析标签改为中文「分析」／英文「Analysis」，排序置后并沿用键盘导航；移除标题任务色与自定义色样式。`TaskCompletionIndicator` 按状态复用 `TaskStatusBadge` 的颜色 token，取消状态采用同一圆环叉。浏览器验证 End 切到最后的分析、顶部 backgroundImage 为 none；进行中标题与状态均为 rgb(0, 138, 245)，已完成标题、状态及列表均为 rgb(87, 188, 108)。未修改任务状态或标准。应用类型检查通过，FIG-DETAIL-015／016／017 已重新采集为主工作区当前页面。证据限本地 UI，不证明生产服务。

## PRD-0120：状态精简与圆环统一

`TaskProgressIcon` 为标题确认入口、状态标签和列表提供相同四段几何及完成圆环勾；`TaskStatusBadge` 移除待开始选项。App 启动迁移、任务读取、创建与 AI 拆解默认状态及旧筛选兼容为进行中，原目标、标准和进度依据保留。`readProgressPredictions` 同时兼容旧缓存签名，仅变更历史待开始别名，真实目标或范围变化仍使评估失效。主工作区验证菜单只有四项、点击完成及 Space 撤销恢复已阻塞与原 AI 两段，标准记录未变。6 项定向检查、应用类型检查及结构检查通过。FIG-DETAIL-016／015 刷新，FIG-DETAIL-017 为实际完成状态截图；证据限本地 demo，不证明正式项目迁移或服务端保存。

## PRD-0119：整任务评估依据

`TaskDetail.tsx` 将独立 AI 快照的 basis 传入 `TaskCompletionIndicator.tsx`；无独立快照时读取同一进度投影的最新观察 note，或已校验的燃起记录 note。提示仅在有效进度且依据非空时显示，人工确认说明独立保留。浏览器键盘聚焦验证「处理达人视频极限词下架事件」显示部分完成及风险视频、申诉回执的依据，未修改任务状态；应用类型检查通过。FIG-DETAIL-016 已刷新为主工作区当前界面，证据限本地 UI，不证明生产 AI 或服务端保存。

## 2026-10-12：子任务与创建流程图标统一（视觉调整）

用户要求移除子任务及创建过程中的任务图标。`TaskSubtaskList.tsx`、`TaskCreationExistingTaskCard.tsx` 与创建审阅组件不再渲染 TaskIcon；相应列表、候选卡和多层子任务网格取消图标占位列。名称、层级、人员、状态及原有操作保留。主工作区浏览器核验子任务列表与主任务创建审阅，截图保存于 `artifacts/subtasks-without-icons.png`、`artifacts/creation-without-icons.png`；创建拆解的后续结果未采集。应用类型和结构检查通过。模块 07／08 的旧相关截图原已 pending，继续保持待采集。本次只调整视觉标识，不改变创建、状态、权限或数据规则，因此不新增语义变更 ID。

## PRD-0118：标题四段圆环与任务确认

2026-10-12 用户明确要求移除标题图标，原位置使用与完成标准一致的四段圆环、确认及提示。`TaskDetail.tsx` 接入 `TaskCompletionIndicator.tsx`，移除标题外观入口与标准汇总的横向按钮；复用标准的圆环、实心勾、悬停撤销、短暂确认动效及 Portal 提示样式。主工作区浏览器验证点击完成、Space 撤销恢复待开始、键盘聚焦显示阶段提示；AI 保持少量完成，三个标准未被人工改写。应用类型与结构检查通过。FIG-DETAIL-016、FIG-DETAIL-015 已重新采集；证据限本地交互，不证明生产 AI 或服务端保存。标题外观入口已移除，PRD-0115 的详情外观选择能力被本次决定替代。只读控制保留键盘提示，点击无状态修改回调。



## PRD-0117：整任务进度确认按钮

2026-10-12 用户要求合并 checkbox 与四段进度，移除常驻 AI 阶段文案和确认计数。`TaskCompletionCriteria.tsx` 使用单个 Tooltip.Trigger，四段与人工勾独立渲染；样式归 `task-criterion-review.css`，状态沿用 `TaskDetail.tsx` 的回调。主工作区浏览器验证点击完成、Space 撤销，AI 仍为一段且三个标准保持未确认；应用类型检查通过。FIG-DETAIL-016 为当前主工作区页面，仅证明本地交互，不证明生产 AI 或服务端保存。

## PRD-0114：完成标准汇总

TaskCompletionCriteria 接入四段进度和整任务确认浮层，TaskDetail 接入状态修改；标准确认成功后判断全量完成。应用类型检查通过，浏览器验证汇总区域与确认入口，截图 artifacts/task-completion-summary.png。

## PRD-0112：恢复方形图标

详情恢复独立 TaskAppearancePicker，子任务停止传入图标进度圈。类型检查通过；浏览器当前为用户创建草稿，未导航打断。

## PRD-0111：状态编辑

App 移除详情状态编辑的人员分配限制，沿用 changeTaskStatus 保存与活动记录。类型检查通过；浏览器已验证五项状态菜单，证据 artifacts/status-editable.png。

## PRD-0110：连续拆解等待

TaskCreationPlanEditor 保留主任务并在子任务区承载 TaskCreationProcess；子任务属性改为三列。类型检查通过，浏览器当前未停留创建审阅状态，截图待采集。

## PRD-0109：圆形任务标识

任务详情恢复图标与颜色设置，中心外观与外圈完成操作分离；子任务显示独立进度圈。应用类型检查通过，浏览器截图待采集。

## PRD-0108：拆解思考区域

TaskCreationPage 复用 TaskCreationProcess 展示三步本地模拟进度，停止使运行标识失效，保留主任务方案；移除返回按钮。类型检查通过。仍为模拟拆解，非真实模型思考过程；截图待采集。


## PRD-0107：完成与撤销展示

TaskCompletionIndicator 已完成时隐藏外层分段，仅显示实心勾与悬停撤销；撤销继续复用原状态回调，AI 数值不变。TaskCriterionIndicator 使用 Base UI Tooltip Portal 避免滚动容器和 Tab 裁切。应用类型检查通过。FIG-DETAIL-014 旧完成展示失效，已撤出正文并标记 pending。


## PRD-0106：可选拆解等待反馈

TaskCreationPage 增加选择说明、拆解等待态与操作禁用；创建按钮右对齐。当前等待为本地演示延迟，拆解仍读取预置方案并以完成标准兜底，尚未接入根据修改后的主任务重新推理的生产 AI。应用类型检查通过；创建截图待重新采集。


## PRD-0105：AI 入口与圆环提示

TaskDetail 将修改与拆解统一为调整任务，复用 TaskAiAdjustmentPopover 的范围选择与独立草稿；TaskWorkloadSummary 使用已有进度行 action 展示次级操作。TaskCompletionIndicator 移除原生 title 和悬停中心勾，保留单份自定义提示。浏览器核验入口可切换子任务安排，标题圆环没有 title 或 hover 勾节点；FIG-DETAIL-015 为主工作区当前页面。仅验证本地界面，不证明生产 AI 调用。


## PRD-0104：整任务完成圆环

TaskCompletionIndicator 复用完成标准的四段圆环样式及进度分档函数；TaskDetail 从共享工作量投影提取独立 AI 评估，不把已完成状态输入圆环计算。人工完成回调沿用现有权限、恢复状态及错误处理，不修改标准确认。当前为本地展示与状态回调，不证明生产 AI 回写。旧详情截图保持 pending；新增 FIG-DETAIL-014 来自主工作区实拍。浏览器验证 75% 圆环在标记完成及取消后保留三段，标准仍为 0/1；恢复原进行中状态。应用类型、结构门与 PRD 构建通过。

## PRD-0103：老板意见改版来源

用户提供 Google 文档并明确授权全轮改版。TaskCreationPage 与 task-creation-review 控制主任务优先、隐藏字段清理；TaskDetail 的 AI 页签复用已有建议确认；SidebarResizeHandle、TaskDueDatePicker、relative-time、TaskActivityLog 支撑侧栏、日期、时间和日志；TaskIcon 改色标；自动标签来自 ai/mock/lib/taskAutoTags 的本地确定性分析，经 ai/task-auto-tags 门面调用，不是生产 AI 服务。AiConnectionPage 指向 documents/cli-commands.md。旧创建、列表和详情图已撤下并标记 pending。已有任务拆解支持按完成标准整理本地候选并确认保存，创建无规划子项时使用同样的本地标准拆解，均不等于任意自然语言模型规划。

## PRD-0102：详情头部改版

TaskDetail.tsx 标题前复选框调用既有状态回调；TaskAppearancePicker.tsx 仅提供颜色选择，保留旧 iconName 数据兼容。详情背景沿用 data-tone。此次仅改详情入口，其他页面 TaskIcon 尚未迁移。

## PRD-0101：职责自动更新配置

当前配置字段responsibilityAutoUpdate按团队保存；PersonalInfoDialog调用applyAutomaticResponsibilityUpdates，编辑时pausedTeamId暂停。responsibilityProposals.ts对add/update应用去重及版本核对，记录变更；保存失败保留旧状态。用户确认此配置为应用方式，修正模块19和Skill的一律逐条确认约定。server/responsibilityAutoUpdate.test.ts为本地行为验证；不证明生产MCP自动更新授权、回执或每日调度已接入。旧截图自动应用文案与确认后写入的需求差异已由本规则解决，其余实现差异保留。


## PRD-0100：职责每日分析与精简输出

依据2026-10-11用户确认：每日检查一次当前用户当前团队的任务证据变化，首次建立历史基线，后续增量处理；责任正文一条一个范围，依据分开。规则已写入模块19、人员责任Skill与输出契约，优先于旧事件即时分析快照。既有人员分析用例验证贡献归属及责任边界，不证明每日调度已实现；当前无后台每日调度、增量游标或通知去重的运行验证。职责页自动应用文案与确认后写入的既有差异仍待修正，截图未改变。


## PRD-0099：团队任务恢复回收站

用户确认恢复设置内回收站分类，替代 PRD-0083。`GovernanceTasksPanel.tsx` 恢复完整分类，并将全部输入交给 `rowsOf`，普通分类排除删除项、回收站仅保留删除项；沿用删除时间列、恢复入口及每页 10 项。恢复操作仍仅更新当前设置面板状态，未接通持久化任务恢复或生产接口；不能据此认定生产恢复完成。旧 FIG-TEAM-007 已转待采集并从正文撤下。


## PRD-0095：设置快捷导航

快捷入口由 `docs/prd/index.md` 维护，`scripts/build-agentdoor-prd.mjs` 生成至账号与团队分组，并校验正文锚点存在。四个入口引用现有章节，不新增重复模块。


## PRD-0093：10 月 9—10 日需求与实现核对

- 已覆盖：团队删除保留 30 天及拥有者恢复（PRD-0073／0090）、我的团队当前标识（0092）、团队任务筛选总数与分页、无回收站及无归档（0080—0083／0091）、行为日志分页与头像（0081／0089）、MCP 安装 Skill 和访问令牌新标签页入口（0087—0089）、任务与讨论精简上下文、目标和完成标准（0084—0085）、讨论翻译范围与进度百分比分档（0077—0078）。
- 补充证据：`TeamAppearancePicker.tsx` 与 `shared/lib/avatar-image.ts` 支撑团队图片上传、格式及 2 MB 校验；`TeamLogo.tsx` 和 `TeamSwitcher.tsx` 读取团队标志。`TaskDetail.tsx` 使用单行 Input，`task-heading.css` 提供省略号与编辑时横向显示。
- 权限差异：当前 `canEditTeamInformation` 与 `canEditTeamAppearance` 允许 owner 和 admin，正式模块 03／15 仍仅允许拥有者；未发现本轮直接授权扩大管理员权限，因此保留需求并记录待修复差异。
- 验证边界：本轮只核对文档与当前代码，不据此宣称生产端到期永久清理、MCP 客户端实际连接或跨端保存已验证。测试实验室及评测工具变动属于研发工具，不新增为用户产品能力；存储压缩与图标模块上提是实现细节。
- 纯视觉调整由 Git 保留：设置标题字重、卡片布局与分隔、角色位置、到期红色提示、嵌套确认遮罩、关闭按钮、菜单 hover 及列表间距。过期截图改为待采集并从正文撤下，不生成替代截图。


## PRD-0092：我的团队当前标识

`PersonalInfoDialog.tsx` 将 activeTeamId 传给 `MyTeamsPanel.tsx`，仅未删除且 ID 匹配的团队展示当前团队标签；无团队状态不传入活动 ID。前端类型检查通过，截图待采集。


## PRD-0091：团队任务移除归档

`GovernanceTasksPanel.tsx` 移除归档入口、批量选择状态及归档弹窗，任务名称直接展示；`governance.css` 将操作表头与行内按钮统一居中。前端类型检查通过。FIG-TEAM-007 保持待采集，不以旧截图证明当前界面。


## PRD-0090：恢复团队二次确认

`src/features/members/components/MyTeamsPanel.tsx` 使用共享确认弹窗；点击恢复仅选择目标，确认后才调用恢复，取消与关闭清除目标。提交期间禁止重复操作，失败保留确认目标。前端类型检查通过，本次未验证生产恢复接口。卡片布局旧截图待重新采集。


## PRD-0089：设置需求补充

本次依据用户确认补齐模块 03、05、13。行为日志头像及团队任务负责人、分页和筛选数量由 `AuditLogPanel.tsx`、`GovernanceTasksPanel.tsx` 支撑；个人访问令牌与 API 文档入口由 `AccessTokensPanel.tsx` 支撑，MCP 安装引导由 `AiConnectionPage.tsx` 和 `public/documents/skills/taskdoor-mcp/SKILL.md` 支撑。团队 30 天保留规则沿用 PRD-0073；生产环境到期永久清理与客户端 MCP 实际连接未在本次验证，不能由页面展示推定已完成。现有待采集截图状态保持，本次未新增截图证据。


## PRD-0088：新标签页访问令牌

`AiConnectionPage.tsx` 提供新标签页链接，`App.tsx` 识别 settings=tokens 直接打开访问令牌模块；不在 URL 中传入令牌。


## PRD-0087：统一 MCP 安装引导

`AiConnectionPage.tsx` 的两种连接方式共用产品选择与提示词传输，MCP 指向 `public/documents/skills/taskdoor-mcp/SKILL.md`；不要求用户把令牌提交到聊天。独立 MCP 配置组件已移除，旧 PRD-0086 证据由本项替代。


## PRD-0086：MCP 连接入口

`AiConnectionPage.tsx` 提供 CLI／MCP 切换，`McpConnectionPanel.tsx` 提供配置复制与一次性令牌说明。MCP 地址支持 VITE_TASKDOOR_MCP_URL 配置，当前默认沿用仓库沙箱地址。访问令牌副标题已接入用户提供的 API 文档地址 `https://sand.taskdoor.com/documents/openapi/v1`，新标签页打开。未验证客户端连接回执。


## PRD-0085：任务目标与完成标准

任务、讨论上下文均带入当前目标和逐项编号的完成标准，空值省略；同一字段投影供预览和传输使用。证据：`src/features/tasks/lib/task-ai-connection.ts`、`src/features/tasks/discussion/lib/task-discussion-ai.ts`、`server/aiContextCompact.test.ts`。


## PRD-0084：精简 AI 上下文（2026-10-10）

任务与讨论构建器只导出定位字段，讨论摘录限制 180 字；共享传输载荷保留 taskId。证据：`src/features/tasks/lib/task-ai-connection.ts`、`src/features/tasks/discussion/lib/task-discussion-ai.ts`、`src/features/ai-connection/components/AiConnectionDialog.tsx`、`server/aiContextCompact.test.ts`。客户端启动与 CLI 登录仍由原连接流程处理，传入 ID 不证明已读取最新详情。


## PRD-0083：团队任务分类

团队任务不显示回收站分类，列表继续排除已删除任务；任务工作区的回收站入口与权限保持原有规则。证据：`src/features/members/governance/components/GovernanceTasksPanel.tsx`、`src/features/members/governance/lib/governance.ts`。


## PRD-0082：团队任务筛选数量（2026-10-09）

`GovernanceTasksPanel.tsx` 的数量直接读取分类筛选后的 `rows.length`，与分页使用同一结果集，删除右侧汇总；未知数据仍由上层加载状态处理，空结果显示 0。FIG-TEAM-007 仍待重新采集。


## PRD-0081：设置列表统一与行为日志分页（2026-10-09）

两页共用 `GovernancePagination.tsx` 与表格样式，每页 10 项。行为日志从完整筛选结果切片，筛选变化回到首页；团队任务跨页选择保持。FIG-TEAM-007/008 仍待重新采集。


## PRD-0080：团队任务分页与活动列（2026-10-09）

`GovernanceTasksPanel.tsx` 依据筛选后的任务集按每页 10 项切片，最近活动独立成列；页码限制在有效范围内，跨页选择保留，批量归档从完整筛选集读取选中项。FIG-TEAM-007 仍待重新采集。


## PRD-0079：行为日志与团队任务 UI（2026-10-09）

`AuditLogPanel.tsx` 使用动作、任务、时间、操作人四列表格，关联任务沿用原跳转；`GovernanceTasksPanel.tsx` 复用 `TaskStatusBadge` 与负责人头像；`governance.css` 使用现有设计变量调整密度与窄屏布局。界面中英文及设置导航统一为行为日志／Activity log。


## PRD-0076：自动翻译仅作用于讨论（2026-10-09）

`TaskDetail.tsx` 移除标题右侧的任务阅读选项菜单；`I18nProvider.tsx` 删除 `originalTasks` 与 `toggleTaskOriginal`，`MockDataProvider.tsx` 的任务标题、目标和记录文字不再读取 `autoTranslate`；`DiscussionMessages.tsx` 的回复引用摘要改由 `autoTranslate` 决定是否显示译文；账户菜单开关文案改为“自动翻译讨论内容／Auto-translate discussions”；对应样式 `.task-reading-menu` 与三条界面文案一并删除。讨论消息的原文／译文切换（`DiscussionMessages.tsx`）和账户菜单的“自动翻译协作内容”保留。

## PRD-0075：访问令牌、团队任务与审计记录（2026-10-09）

依据正式项目 `apps/web` 的 `features/credentials/components/AccessTokensPanel.tsx`、`TokenExpiryPicker.tsx` 与 `features/governance/components/GovernanceTasksPanel.tsx`、`AuditLogPanel.tsx` 移植：`src/features/credentials/`（令牌面板、到期日期选择、`lib/pat.ts`、`access-tokens.css`）和 `src/features/members/governance/`（团队任务、审计记录、`lib/governance.ts`）；中英文文案取自正式项目 `messages.ts`，经 `shared/i18n/catalog.ts` 读取。`src/ai/settings-demo.ts` 代替正式项目接口，由当前团队的演示任务与回收站生成团队任务行，并提供演示令牌与审计事件。`PersonalInfoDialog.tsx` 接入导航，团队任务与审计记录仅对拥有者和管理员显示。`server/settingsGovernance.test.ts` 覆盖分类、汇总、批量归档结果、演示数据与令牌格式。

FIG-WORK-003（同复用 FIG-PREVIEW-017）、新增 FIG-CLI-006、FIG-TEAM-007、FIG-TEAM-008 于 2026-10-09 从主工作区 Vite 服务 `http://localhost:5181/` 采集，English，裁切缩放至 1280×720；团队任务与审计记录截图为协作平台团队。

## PRD-0074：连接 AI 与正式项目对齐（2026-10-09）

依据正式项目 `apps/web` 的 `features/credentials/components/AiConnectionPage.tsx`，`src/features/ai-connection/components/AiConnectionPage.tsx` 改为安装提示词、“在 {工具} 中打开”及结果提示，常用命令同步为 CLI v0.1 命令，去掉演示连接回执；`AiConnectionDialog.tsx` 新增 `copyAndOpenPrompt`，`ai-tools.ts` 新增 `aiToolPromptLink` 并将显示名称改为 ChatGPT、Claude；英文文案取自正式项目 `globalUiMessages.json`。正式项目的已授权设备区仅在真实账号下显示，PM 演示不展示。`server/connectAiPrompt.test.ts` 覆盖名称、唤起链接、复制失败不唤起与唤起失败提示。

FIG-CLI-002 至 004（同复用 FIG-PREVIEW-024 至 026）于 2026-10-09 从主工作区 Vite 服务 `http://localhost:5181/` 重新采集，English，裁切缩放至 1280×720。FIG-CLI-005／FIG-PREVIEW-053 显示旧工具名，标记 pending 并撤出正文。

## PRD-0073：团队删除可恢复与我的团队（2026-10-09）

`team-lifecycle-storage.ts` 删除团队时将团队、任务节点、详情种子、活动、交接通知、团队回收站、任务分配覆盖及任务文件／讨论存储移入 `agentdoor-deleted-teams`，保留 30 天；`readDeletedTeams` 读取时排除过期记录，`restoreDeletedTeam` 校验有效拥有者、期限和重复恢复后经恢复日志一次写回，并追加 restore 操作记录。`MyTeamsPanel.tsx` 在个人设置和无团队页展示团队列表、角色、加入时间、成员人数及删除倒计时；`PersonalInfoDialog.tsx` 新增入口，`TeamLifecycle.tsx` 更新删除说明。`memberProfiles.ts` 的成员关系新增可选 `joinedAt`，创建团队、接受邀请和登录加入时写入。

FIG-WORK-003（同复用 FIG-PREVIEW-017）`settings-en.png` 于 2026-10-09 从主工作区 Vite 服务 `http://localhost:5181/` 重新采集，English，裁切缩放至 1280×720，显示新增的 My teams 入口。

## PRD-0072：任务排期仅保留截止日期（2026-09-30）

当前协议证据：`skills/agentdoor-task-planner/references/planning-v0.2.schema.json` 的 schedule 仅含 dueOn、basis、assumptions、evidenceRefs；`planning-v0.2.md`、Skill 入口及 Python 校验器同步截止日期语义。`server/test-lab/skills.ts` 在当前调用指令中明确日期规则，旧 Skill 快照原文保持；`server/testLabDeadlineOnly.test.ts` 验证截止可为空、拒绝 startOn 及历史快照调用约束。

## 2026-09-27：主任务与子任务删除场景截图

用户要求补充有数据的回收站及主任务／子任务删除截图。使用主工作区当前 Vite 服务的 `http://localhost:5173/` 独立浏览器源，以内置示例数据通过实际界面删除两条主任务分支（新品发布会筹备，含 11 个子任务；完成秋季抗老精华首发闭环，含 12 个子任务）和两条独立子任务（核对库存与开播安排、确认下周行动项与负责人），生成 4 条回收记录。与原有 `127.0.0.1` 工作区存储隔离，未改动原有任务。

FIG-DELETE-001 由 pending 更新为当前页面有数据列表；新增 FIG-DELETE-003 至 008，分别呈现主任务连带删除确认、单独子任务删除确认、分支层级展开、本页混合多选、14 项任务恢复确认及彻底删除确认。7 张均为简体中文、1280×720 当前运行界面截图，来源为 `TaskDeleteDialog.tsx`、`TaskBranchDisclosure.tsx`、`TaskRecycleBinDialog.tsx`；数据由真实 UI 删除流程生成，未手工拼造回收站快照。恢复与彻底删除只打开确认弹窗并取消，未提交；分页、过期和失效负责人等状态不在本次截图覆盖内。

本次补足既有 PRD-0065 至 PRD-0070 的页面证据，不改变功能、权限或实现状态判断，不新增变更 ID，不发布版本。原截图补齐记录中关于 FIG-DELETE-001 待采集的说明为当时状态，以本次采集为准；生产服务端与跨设备限制保持。

## PRD-0071：成员退出模块边界澄清（2026-09-27）

依据用户对当前 PRD 的明确修正，“退出”在本模块专指主动退出团队或被有权限的管理者移出团队。删除日常退出登录与切换团队段落，同步模块名称、目录及元数据；账号停用既有条款移至账号模块 3.7。任务交接、角色权限和 FIG-EXIT-001 至 003 仍适用。本次只修改需求文档组织与模块边界，不修改应用代码，不新增实现能力判断；账号停用和跨端撤权仍沿用 PRD-0058 所记生产服务限制。

## 2026-09-27：认证页、回收站与成员交接截图补齐

从主工作区当前运行服务 `http://127.0.0.1:5173` 采集 7 张简体中文、1280×720 页面截图：FIG-AUTH-002、003 为登录和注册空表单；FIG-INT-002 为认证页语言菜单；FIG-DELETE-002 为当前团队回收站空态；FIG-EXIT-001 至 003 分别为负责任务、批量成员选择与参与任务交接。对应来源为 `OnboardingExperience.tsx`、`LanguageSwitcher.tsx`、`TaskRecycleBinDialog.tsx` 和 `TeamLifecycle.tsx`。

交接页显示陈默负责 12 项、参与 15 项，确认按钮在 0/27 项指定时禁用；仅展开清单与选择器，随后取消，未提交成员移除或任务关系变更。登录与注册清空浏览器自动填充后截图，未提交认证、发送验证码或创建账号。回收站没有记录，因此 FIG-DELETE-001 的有记录、多选、子任务展开及恢复确认仍保持待采集，不用空态图片替代这些状态的证据。

本次只补充既有规则的页面图片与来源登记，不改变功能、权限、流程或实现状态判断，按非语义图片补齐处理，不新增 PRD 变更 ID，不发布新版本。既有生产服务限制保持。

## PRD-0070：回收站权限收紧（2026-09-24）

`canManageRecycledTask` 以有效团队身份及拥有者角色／实际 deletedBy 判定；回收站列表过滤和恢复／彻底删除提交共用此规则。管理员不再获得全团队管理权，正常任务删除继续校验当前负责人。定向测试覆盖本人、他人、管理员、拥有者降级、退出、混合批量及拥有者不能代删正常任务。当前仍为本地实现，生产服务端授权限制见 PRD-0065。


## PRD-0069：回收站多选操作（2026-09-24）

`TaskRecycleBinDialog.tsx` 以当前页有效选中记录数大于 1 为表头操作展示条件；按钮使用恢复／彻底删除文案，继续复用原确认及提交路径。单项行内按钮与翻页清除勾选逻辑保持。


## PRD-0068：子任务范围展示（2026-09-24）

`TaskBranchDisclosure.tsx` 在删除预览和回收站共用只读层级清单，分别读取 `deletedTasks` 和回收站分支快照；不读取额外任务正文、不增加独立子任务操作。原生 details 支持键盘展开，清单限制高度并可滚动。类型检查通过；浏览器核验“新品发布会筹备”的 11 个子任务展开后按层级显示，未执行删除。回收站复用同一组件，当前验证会话无回收记录，未以虚构记录冒充运行证据。


## PRD-0067：回收站固定入口（2026-09-24）

`TaskWorkspaceList.tsx` 将回收站按钮置于列表滚动容器之外的底部区域，`task-workspace-list.css` 保持其固定占位、键盘聚焦和触屏点击尺寸；标题栏仅保留新建任务按钮。沿用原 `onOpenRecycleBin` 回调与当前团队弹窗，不改变数据和权限规则。应用类型检查通过，浏览器验证底部入口可见并能直接打开当前团队回收站。


## PRD-0066：Google 设置密码与认证页语言（2026-09-24）

`OnboardingExperience.tsx` 复用 `LanguageSwitcher`，在认证页右上角提供中英文切换；复用密码字段新增 Google 密码设置表单。`onboardingPreview.ts` 的 google-password 状态未完成时不授予 verified，不能创建／加入团队或被工作区简化逻辑跳过；刷新恢复该步骤，旧免密码 Google 会话迁移到设置页，已有密码不重复要求设置。密码保存后继续同一账号、团队和邀请。

24 项 Google、登录注册、默认姓名与多语言定向测试通过，应用类型检查通过。浏览器核验语言入口、中文切换后邮箱输入保留，以及 Google 选账号后显示设置密码、空输入禁用继续；未通过浏览器设置密码。当前 Google 为本地示例身份选择，真实 OAuth、生产账号凭据及服务端会话控制仍未接入。认证页面旧截图撤出并标记 pending；原先自动个人团队的本地行为未在本轮改造为正式首次设置目标。


## PRD-0065：任务回收站（2026-09-24）

`TaskRecycleBinDialog.tsx`、`task-recycle-bin.css`、`TaskWorkspaceList.tsx` 提供当前团队入口、名称搜索、删除人头像、期限、10 项分页和本页批量操作；未选时禁用，翻页／搜索清除选择。`taskRecycleBin.ts` 保存分支快照并校验权限、期限、重复标识、父任务与四层限制；`App.tsx` 两个删除入口与恢复共用本地恢复日志原子保存。团队删除同步清空对应回收站。原父任务缺失时恢复顶层，失效负责人需重新指定，离开参与者不会补回。

当前是浏览器本地实现：保留期在启动、每分钟及操作时校验；关闭浏览器期间没有后台服务，重新打开才清理。服务端定时清理、跨设备授权与并发控制、物理文件及讨论数据清理、真实通知、CLI 恢复接口仍需接入，不能视为生产数据保留保证。原有讨论和文件投影按任务 ID 保留，永久删除仅使任务和快照不可从产品恢复，不等于完成底层所有关联数据的物理擦除。旧版已经永久删除的任务无法补回。

验证：6 项回收站定向测试通过，覆盖分支恢复、失效负责人、权限、过期、冲突和存储失败回滚；应用类型检查通过。相关团队生命周期及删除测试通过；既有新增子任务用例 `确认新增只创建一个直属任务…` 因创建者默认参与与旧空数组预期不同失败，此处未改创建逻辑。浏览器验证真实入口和空态，独立临时样式预览验证有数据列表、12 条分页与翻页后批量按钮禁用；未删除用户任务。新截图待采集，临时预览不登记为实际业务数据证据。


## PRD-0064：团队信息仅拥有者可编辑（2026-09-24）

`PersonalCenterPage.tsx` 对非拥有者以文本展示团队名称，不提供编辑或保存按钮；保存处理调用 `canEditTeamInformation` 校验有效拥有者身份。`TeamOwnershipSettings` 原有权限分支对管理员只显示离开操作。定向用例覆盖管理员、普通成员、非成员、失效拥有者与转让前后权限。当前仍是浏览器本地原型，不能视为生产服务端授权证据；团队设置截图保持 pending。


## PRD-0063：批量范围限定当前页（2026-09-24）

`TeamLifecycle.tsx` 使用当前页任务与勾选 ID 的交集统一控制批量按钮禁用状态及写入范围。其他页的勾选保留，但不参与当前页批量操作。本条替代 PRD-0059 的跨页批量规则；相关截图仍为 pending。


## PRD-0062：隐藏交接父任务路径（2026-09-24）

`TeamLifecycle.tsx` 已移除列表中的父任务说明及路径悬停展示；保留任务名称、状态与成员，现有搜索匹配、分页与批量交接逻辑不变。相关截图仍保持 pending。


## PRD-0061：交接任务状态筛选（2026-09-24）

`TeamLifecycle.tsx` 增加全部状态及非终态筛选，状态与关键词、只看未指定共同决定分页和批量范围；切换状态回到首页且保留指定结果。列表表头复用人员弹层，以“批量设置成员”为入口，移除表头已选数量说明。未增加状态修改能力；截图沿用 pending 状态。主工作区浏览器验证“已阻塞”筛选仅显示匹配任务、分页随结果收起、底部仍按全部 27 项校验；批量设置成员入口与全选位于列表表头，已选说明不再显示。


## PRD-0060：简化交接表单与分页（2026-09-24）

按用户要求，`TeamLifecycle.tsx` 移除交接说明输入及其状态；为兼容现有本地存储接口提交空备注，不改写历史记录。分页改为页码按钮与前后箭头，多页使用省略号控制宽度；跨页选择及提交规则不变。相关截图继续保持 pending，不恢复旧表单截图为当前证据。


## PRD-0059：交接列表分页（2026-09-24）

根据用户的样式与分页要求，`TeamLifecycle.tsx` 和 `team-lifecycle.css` 接入独立状态列、直接父任务说明、每页 10 项及本页全选；跨页保留选择，批量只作用于当前筛选内的已选任务，所有待交接任务仍统一校验。复用 `PersonPicker` 的头像、搜索和选择交互。

主工作区浏览器核验：12 项负责清单分成 10＋2 项；首页全选后翻到第二页仍显示已选 10 项，跨页指定后总进度为 10 / 27；只看未指定时剩余 2 项且分页隐藏，未提交成员移除。现有相关截图仍为 pending，不将旧图恢复为当前证据。本次仍是本地分页，不代表已接入服务端分页或生产事务。


## PRD-0058：成员交接与团队所有权（2026-09-24）

依据本轮用户确认的成员退出交接、管理员移除、团队拥有者和删除团队方案及项目改造授权，正式模块 03、09、13、14、15 替代 PRD-0034 的无交接退出和唯一管理员约束。交接复用成员菜单和弹窗；团队设置承载所有权转让与团队删除。拥有者可邀请管理员或成员，管理员仅邀请成员，与任免权限保持一致。终态任务保留原人员字段作为历史归属，有效成员关系决定访问。

`src/components/TeamLifecycle.tsx` 与 `PersonalCenterPage.tsx` 已接入成员菜单、负责／参与 Tab、搜索、批量指定、交接备注、拥有者转让和输入团队名称删除确认。`teamMembershipLifecycle.ts` 统一权限与交接范围，`teamLifecycleStorage.ts` 复用恢复日志保存任务、成员关系、活动和本地汇总通知；`App.tsx` 接入保存与无团队落点。旧团队迁移唯一拥有者且保留原创建者，退出成员不再由示例目录补回；登录预览会核对退出／删除记录，避免重新创建已删除团队或已退出成员关系。

最小验证：25 项团队生命周期、邀请、容量与登录工作区定向测试通过，应用 TypeScript 检查通过。主工作区页面核验拥有者角色、移除入口、12 项负责／15 项参与的真实清单、12 项批量指定与未完成时禁用提交、窄屏布局、转让说明及删除名称校验；未在用户浏览器提交移除、转让或删除。失败中途写入回滚、最后团队删除与隔离通过内存存储定向测试验证。

本轮仍为浏览器 localStorage 原型：本地事务恢复、任务活动和汇总通知不代表生产服务事务、跨设备竞争控制或真实消息投递。账号停用逐团队交接、管理者摘要访问的服务端权限边界、Web／CLI／Agent 全端撤权、团队数据彻底清除与生产服务验收仍需后续接入。

FIG-MEMBER-003、004、FIG-WORK-005 及产品预览同源图片撤出当前正文，清单恢复 pending；未重新采集截图，不复用旧角色画面作为当前证据。


## PRD-0057：连接 AI 工具名称与截图（2026-09-24）

任务内工具菜单依据 `src/components/AiConnectionButton.tsx` 与 `src/lib/aiTools.ts`，显示 Codex、Claude Code、WorkBuddy 和 Cursor；全局安装指南依据 `src/components/AiConnectionPage.tsx`。FIG-CLI-005 从当前任务详情页采集；FIG-CLI-002 至 004 从当前全局连接指南重新采集，均为 English、1280×720。产品预览复用同源图片。

## PRD-0056：讨论、通知、活动与文件截图（2026-09-24）

用户要求在对应 PRD 模块中直接展示讨论、通知、活动和文件界面。FIG-COLLAB-001、003 与 FIG-FILES-001 复用 2026-09-22 当前运行页的 FIG-DETAIL-003、005、004；FIG-COLLAB-002 于 2026-09-24 从当前工作区重新采集，展示通知列表、未读状态、全部标为已读、筛选和关闭入口。四张图片均为 English、1280×720，业务示例内容保留原文。

## PRD-0054：任务定位与删除确认（2026-09-24）

依据本轮用户反馈，`TaskWorkspaceList.tsx` 在选中项和结果顺序变化时只滚动列表容器；`TaskDeleteDialog.tsx` 统一任务与子任务删除确认，使用现有 AlertDialog，保留名称、后代数量与展开名单、依赖影响及不可恢复提示。

## PRD-0055：任务整体进度与单条完成标准（2026-09-24）

用户要求在“任务进度与完成”中分别呈现任务整体进度和单条完成标准交互。整体进度使用四段阶段并展示燃起图、当前情况与下一步；单条标准展示 AI 阶段、人工确认和撤销。四段区间按用户明确的 0%–<25%、25%–<50%、50%–<75%、75%–100% 记录，替代 PRD-0034 的 90% 分界。FIG-PROGRESS-001 至 004 复用 2026-09-22 当前运行页截图，原始证据为 FIG-DETAIL-006、007、010、011。

## PRD-0053：任务创建四步主流程（2026-09-23）

用户指出需求澄清、已有任务关系和是否拆解属于条件场景，不应与人员匹配等主步骤并列。依据当前创建页 `src/lib/taskCreationProgress.ts` 的四个规划步骤，将正文和 FIG-CREATE-001 统一为分析任务、目标与计划、成员推荐、动态规划；用户审阅与确认创建位于四步规划之后。原有补问、任务关系、四层限制、未分配和统一提交规则保持。

## PRD-0052：筛选范围外的已打开详情（2026-09-23）

用户要求明确右侧已打开任务不在当前搜索或筛选结果中时的显示方式。任务列表保留右侧详情和未保存内容，左侧按当前条件刷新且不选中任务，详情顶部显示范围外提示；用户打开其他结果或原任务重新符合条件后恢复正常联动。来源为本轮对话及 `src/components/TaskWorkspace.tsx`。

## PRD-0051：任务范围、状态与排序补充（2026-09-23）

根据用户要求，将任务列表现有的范围、状态与排序能力作为一组组合操作写入正文和验收标准。核对 `TaskWorkspaceList.tsx`：范围包含全部任务、我负责的和我参与的；状态支持多选；排序包含最近更新和最新创建。FIG-LIST-003 来自当前运行页面，展示“我负责的 + 进行中 + 最新创建”，未修改任务数据。

## PRD-0050：团队切换信息精简（2026-09-23）

用户提出团队切换时无需展示团队身份。团队菜单移除当前团队及各选项中的管理员／成员文字，保留图标、团队名称、选中状态和创建团队入口；角色信息继续由团队设置与成员管理承载。

## 模块标题与目录分组整理（2026-09-23）

用户要求将“首次进入与团队建立”改为“团队管理”，并统一检查其余模块标题。当前模块改用稳定的功能名，目录按产品概览、账号与团队、任务管理、协作与连接、系统规则分组；文件路径、模块 ID、正文规则和历史变更记录保持不变。

## 邀请链接范围澄清（2026-09-23）

用户指出原范围说明容易被理解为不支持通过邀请链接加入团队。团队建立与成员协作模块改为直接说明邮箱定向邀请流程：受邀者通过专属邀请链接注册或登录并确认加入；任务人员关系仍在团队成员身份生效后按任务规则处理。正式正文同时去除“本期支持／不支持”等版本口吻，范围章节直接描述功能与限制。此次只调整表达，不改变既有邀请流程或变更编号。

## PRD-0049：认证表单取消账号预填（2026-09-23）

用户指出登录截图预填“受邀成员”和密码会被理解为展示其他账号。普通登录与注册表单改为默认空白，不主动带入示例或其他账号信息；邀请入口仍展示团队与加入身份。重新采集 FIG-AUTH-002，并同步产品全貌预览中的复用图片。

## 产品价值场景编排（2026-09-23）

在“产品目标与生命周期”中保留典型场景表，并按用户指定图片替换配图：FIG-LIFE-002 展示任务规划、公共空间、团队资产与 AI 分析之间的协作架构；FIG-LIFE-003 展示多位成员与各自个人 Agent 共享任务上下文的协作场景。此前误用的生命周期流程图和登录页插画不再出现在正文。内容复用当前已确认的创建、两类协作与人工确认规则，不新增功能范围或变更编号。

## 创建流程图视觉重绘（2026-09-23）

使用 `baoyu-diagram` 的流程图规范重绘 FIG-CREATE-001：改为四阶段分区，阶段内展示判断与回退，减少跨区连线并统一节点、颜色和信息层级。业务流程与 PRD-0047 保持不变，属于纯视觉修正，不新增变更编号。

## PRD-0048：团队上限与表单精简（2026-09-23）

用户明确每账号团队创建上限改为 10 个，每团队保留 50 人，并移除创建弹窗中的已创建数量和成员上限说明。同步共享限制、首次进入校验、弹窗及 FIG-TEAM-006。

## PRD-0047：创建流程与写作范式（2026-09-23）

按用户要求将创建流程整理为需求澄清、已有任务关系确认、按需拆解、责任域匹配、方案审阅和统一提交。新增分支说明与任务字段表，更新 FIG-CREATE-001；写作范式同步治理 Skill、README 和模板。依据现行任务交互基线与成员推荐规则，保留核心约束与案例配图。

## PRD-0046：CLI 命令设计预留（2026-09-23）

用户要求先预留 CLI／MCP 结构与各命令的详细设计。本轮仅在 CLI 模块增加一条设计预留说明，保留现有能力与权限约束，不把示例当作最终命令合同。

## 邀请卡片对齐修正（2026-09-23）

依据当前主工作区 `src/styles/onboarding.css`，邀请卡片改为图标与右侧两行文字整体垂直居中；重新采集 FIG-TEAM-002／003／004 及预览复用图片。纯视觉修正，不新增变更编号。

## PRD-0045：创建团队入口与容量限制（2026-09-23）

用户要求补团队创建入口与首期数量限制，并指出此前仅提建议未修改。本轮落实菜单底部入口、每账号自建 5 个团队及团队 50 人（含待接受邀请）；受邀团队不占创建额度。

## PRD-0044：邀请角色与示例账号入口（2026-09-23）

用户明确要求任务内邀请与团队设置一致，包含名称、邮箱和角色；以团队现有成员／管理员选项为准，替代 PRD-0034 的无角色邀请要求。另授权指定账号访问原有 Mock 数据，此账号配置仅属演示实现，不写入产品需求正文。

## 密码恢复配图补充（2026-09-23）

按用户要求，在账号模块 3.5 补充填写邮箱和设置新密码两张运行截图（FIG-AUTH-008／009），来源为主工作区 http://127.0.0.1:5173/forgot-password。仅补充已确认流程的配图，未修改需求语义，不新增变更编号或发布版本。

## PRD-0043：正文与实现记录分离（2026-09-23）

用户明确要求 PRD 描述产品怎么做，Mock／Local／演示数据只是界面呈现手段，不应写入正文。按此清理当前 17 个模块、预览图注和目录，并更新治理 Skill、README 与模板。业务约束保持，开发状态与证据继续由实现矩阵和截图清单记录；历史日志不改写。此次为写作规范变更及措辞整理，模块 last_change 与版本保持。

## PRD-0042：密码入口与可读性整理（2026-09-23）

用户确认 Google 注册不设密码，之后改用邮箱密码登录时通过“忘记密码”验证邮箱并设置原账号密码。同时要求功能标题、流程步骤、限制分组与必要加粗。账号正文与校验参考同步；参考页遗留的自动个人工作区规则改回已确认的首次设置。其余当前正文只整理表达，不修改历史归档与日志，不发布版本。

## PRD-0041：需求正文写作规范（2026-09-23）

用户要求正文只说明怎么做，不收录对话过程、修改要求或方案辩解。将该约束补入项目 PRD Skill 与 README，清理近期账号、团队、导航、详情及流程图的此类表述。只调整表达，产品规则及已登记实现差异保留；尚在讨论的账号自动关联建议未借本次清理改写为已确认规则。

## PRD-0040：个人信息与只读邮箱（2026-09-23）

用户要求账号模块补充注册后进入设置的个人信息、邮箱与责任说明，并明确邮箱只读、本期不支持换绑。责任沿用当前按团队保存、AI 建议需确认的规则，首次注册不新增头像或责任必填步骤。核对 `PersonalInfoDialog.tsx` 的邮箱 Input 仍有 onChange，`PersonalCenterPage.tsx` 存在责任编辑与建议确认；本轮仅补需求，不修改组件。

## PRD-0039：受邀注册与登录（2026-09-23）

用户纠正：邀请链接区分注册新账号和登录已有账号，不以是否已登录作为主分支。本轮明确通过邀请注册后设置个人名称，再确认加入既有团队；保留邀请，不创建个人团队。替代上轮按登录状态展开的图示。

## PRD-0038：独立账号登录流程（2026-09-23）

用户指出账号登录代表已有用户，不应与新注册共用一个新老用户判断。按此拆分三条主流程；Google 共用入口的账号识别保留为系统规则，注册中断保留为异常恢复，均不增加普通登录步骤。

## PRD-0037：新用户首次设置（2026-09-23）

用户明确要求补回新用户首次设置，并在登录注册说明前增加流程图；已有用户加入团队无需重复。无邀请收个人名称与团队名称，受邀仅收个人名称；Google 姓名预填可改，未完成设置再次登录继续。本轮只更新 PRD，不改认证组件。

## PRD-0034：逐项评审收口（2026-09-23）

用户在本对话逐项澄清并明确要求“按照我给你的回复和建议、你自己的想法”更新 PRD；另要求建议并写入任务最大层级。本轮产品讨论仅按项目 agentdoor-task-design 原则，文档更新按 agentdoor-prd-governance 执行。

直接决定：已在团队的任务人员保存后生效，待接受只指团队邀请；仅负责人可删任务且级联子任务，任务成员共同编辑与设置状态；AI 与人工确认分别保存，不以标准阻断完成，完成后修改不自动改状态；创建者默认参与，交接本期不做；仅对话创建，未确认方案退出丢弃，整份多任务创建全部成功或失败；历史耗时后续再做；职责匹配推荐；文件保留版本但删除无恢复；CLI 与用户界面同权，普通字段采用最新写入；邮箱／Google 同账号绑定，邀请只按邮箱定向且不选角色。

按用户授权采纳的设计补充：任务最多四层（根为第 1 层，已有父任务按绝对深度计）；验证码有效期 10 分钟、60 秒重发、单码 5 次错误后作废；团队时区默认浏览器、日期与时间点分开；邀请默认 7 天及待加入选择的生效边界；AI 触发表、通知去重与接收表；同字段后成功写入覆盖、不同字段保留；讨论仅作者可改，任务关系决定读取与编辑，孤立任务暂留空关系不增加交接／恢复流程。以上为本轮开发目标，不作为实现证据。

核对依据：正式 16 模块、当前实现矩阵、现行交互基线及历史详细稿；`skills/agentdoor-ewd-progress/SKILL.md` 的工作明细加权公式、`src/lib/taskCriterionReview.ts` 的 0／25／50／90 粗阶段阈值用于保持既有计算口径。仅定义需求，未执行真实认证、邀请投递或 AI 分析。

冲突替代：旧任务参与邀请／owner proposal、ACL 单独授权、完成核对阻断、手工创建／持久草稿、30 天恢复、强制任务交接、固定上海日期、一分钟验证码和普通字段冲突合并不再是本期合同。历史归档与旧日志不改写；同步交互基线和模板；生成器适配“功能验收标准”、模块内跳转及独立账号校验参考页。相关旧流程图及带角色的邀请截图撤出正文与预览，清单标为 superseded；其他当前 Mock 截图沿用原来源，不当作本轮需求已实现证明。


## PRD-0024：两层任务协作（2026-09-22）

用户明确协作一方面是人与本地 Agent 的协作，另一方面是基于任务上下文与其他协作者之间的协作。生命周期正文、验收与 FIG-LIFE-001 据此区分两层关系，明确成果回填与接续方式。图为目标流程示意，不是运行截图；本轮未变更应用实现，真实 Agent 读写与跨成员同步仍沿用待接入边界。

## PRD-0023：历史任务支持后续规划（2026-09-22）

依据用户提出“根据用户的历史的数据，任务、完成的时长来预测，和建议用户的任务拆解”，确认方向后明确要求写入文档。生命周期与创建规划补充历史拆解、完成时长和执行结果的使用方式、耗时范围、依据不足与用户确认边界。属于已确认的后续目标，本轮仅修改文档，未提供新增实现证据；现有 Mock 截图不证明真实历史分析或预测能力。

仅登记已核验模块的来源，不推断未列模块的实现情况。

| 模块 | 来源 | 证据范围 |
| --- | --- | --- |
| 海外优先与多语言 | 2026-09-20 用户要求“先做海外市场”“先支持英文和中文” | 产品方向 |
| 海外优先与多语言 | `src/i18n/core.ts`、`messages.ts`、`I18nProvider.tsx` | 偏好、词条、格式化基础层 |
| 海外优先与多语言 | `src/main.tsx`、`src/components/LanguageSwitcher.tsx`、`WorkspaceTopbar.tsx` | 运行入口接线 |
| 海外优先与多语言 | `src/i18n/taskStatus.ts`、`TaskStatusBadge.tsx` | 中文状态存储值兼容 |
| 海外优先与多语言 | `server/i18n.test.ts` | 默认值、词条一致、插值、复数、日期和 SSR 降级的定向测试 |
| 海外优先与多语言 | `docs/i18n-inventory.json`、`scripts/audit-i18n.mjs` | 待分类的中文与时区引用盘点，不是翻译覆盖率 |
| 海外优先与多语言 | `docs/task-design-kit/11-task-workspace-detail-interaction-baseline.md` 第 7 节、`src/lib/taskSchedule.ts` | 现行上海日历日规则，未迁移团队时区 |
| 海外优先与多语言 | 2026-09-20 用户截图反馈：语言放下拉、Mock 英文化、包括创建和登录注册 | PRD-0004 交互与范围依据 |
| 海外优先与多语言 | `src/i18n/mockContent.ts`、`mock/`、`MockDataProvider.tsx`、`server/mockI18n.test.ts` | 任务展示、基线匹配、完成标准、讨论及英文搜索 |
| 海外优先与多语言 | `src/i18n/onboardingMessages.ts`、`OnboardingExperience.tsx`、`server/onboardingI18n.test.ts` | 登录、注册、邀请、密码找回提示与状态保护 |
| 海外优先与多语言 | `src/i18n/creationMessages.ts`、`creationMock.ts`、`server/taskCreationI18n.test.ts` | 创建控件、七种示例、新生成方案本地化与草稿保护 |
| 任务详情 | 用户要求基础信息收入独立 Tab；`TaskDetail.tsx`、`task-detail-split.css`、`detailMessages.ts` | PRD-0005：统一四 Tab、移除折叠偏好、直接定位与双语入口 |
| 海外优先与多语言 | `createdMockCatalog.ts`、`filterDisplay.ts`、`remainingMessages.ts`、`TaskListFilterPanel.tsx`、`server/mockI18n.test.ts` | PRD-0006：持久化创建示例、默认标题及筛选本地化回归 |
| 海外优先与多语言 | `moduleMessages.ts`、`activityDisplay.ts`、`settingsMock.ts`、`TaskActivityLog.tsx`、`PersonalInfoDialog.tsx`、`PersonalCenterPage.tsx`、`MemberInvitations.tsx`、`server/moduleI18n.test.ts` | PRD-0007：活动与设置文案、示例数据保护、目录一致性与定向回归 |
| 海外优先与多语言 | `progressCopy.ts`、`mock/progressRecords.json`、`mock/createdProgress.json`、`TaskBurnUpTiming.tsx`、`TaskCurrentSituation.tsx`、`server/progressI18n.test.ts` | PRD-0008：进度文案、完整示例依据目录、日期坐标保护与已修改记录保留 |

| 海外优先与多语言 | `globalUiMessages.json`、`notificationCopy.ts`、`aiContextCopy.ts`、`server/globalUiI18n.test.ts`、`scripts/check-ui-i18n.cjs` | PRD-0009：主应用静态扫描与动态数据定向测试；范围和剩余迁移见检查记录 |

| 任务详情 | 2026-09-21 用户确认编号进度环方案；`TaskCompletionCriteria.tsx`、`TaskCriterionIndicator.tsx`、`taskCriterionReview.ts` | PRD-0010：人工确认与 AI 评估分开，复用本地任务保存事务 |

| 任务详情 | 用户要求 Mock 体现逐条进度；`taskCriterionReviewMocks.ts`、`taskCriterionReviewMocks.json`、`taskCriterionReviewMocks.test.ts` | PRD-0011：手工编写的合成快照、英文依据、保守迁移与撤销保护 |

| 任务详情 | 用户要求梯度而非百分比，并试做左侧集中操作与动效；`TaskCriterionIndicator.tsx`、`task-criterion-review.css`、`criterionStage` | PRD-0012：四段梯度、浮层确认、减少动态效果与旧数值兼容 |

| 任务详情 | 用户反馈 Mock 圆环无进度；`taskCriterionReviewMocks.json`、`taskCriterionReviewMocks.test.ts`、`task-criterion-review.css` | PRD-0013：全种子逐条覆盖及迁移回归，固定模拟档位与加粗弧线 |

| 任务详情 | 用户确认人工确认直接操作方案；`TaskCriterionIndicator.tsx`、`task-criterion-review.css`、`taskCriterionIndicator.test.ts` | PRD-0014：圆环直接确认与撤销，独立 AI 依据，触屏文字入口 |


### 2026-09-21 英文截图证据刷新

任务列表、多语言、任务详情模块新增 4 张主工作区当前运行页面的英文截图，见 [截图清单](screenshot-manifest.json)。覆盖高级筛选、English 语言选择、分段 AI 进度与人工确认状态、AI 依据弹层。示例数据来自当前演示任务 `ccx-serum-launch`；截图不作为真实 AI 服务或持久化能力的验证。本次只增加视觉证据与来源说明，不改变功能范围、验收标准或实现状态判断，因此不新增 PRD 变更 ID，保留当前版本。


## PRD-0015 完整稿整合（2026-09-21）

本轮以用户指定的原完整 PRD `.worktrees/full-product-prd/docs/prd` 的 15 个模块为结构与原有合同来源，正式内容统一维护于主工作区 `docs/prd`。原稿日志、来源与实现矩阵保存在 `history/full-product-prd-baseline/`，其中同名变更 ID 只属于原稿历史，未复用为本目录新日志。原稿关于本地 MVP、上线目标的边界保持；未在本轮逐项复验的能力不能被理解为本轮已验证。

本轮运行页面核验并截图：英文登录、注册、任务创建入口、设置、成员邀请、筛选、详情四 Tab、讨论、文件与活动。正文截图就近呈现，图号和来源见截图清单；当前圆环只有 AI 梯度 hover／聚焦提示，不再有常驻逐条 AI 文案或独立依据入口（`TaskCriterionIndicator.tsx` 与运行页面），旧依据弹层图撤出当前阅读版。历史文件正文保留原语言。未提交注册、发送邀请或创建任务。


### 2026-09-21 创建示例过程截图

模块 07 补充七种既有示例的 16 张英文界面实拍：单任务输入与审阅、复杂项目及子任务、多层任务、两步补问、相似任务独立规划、已有父任务下创建子任务、无匹配负责人与邀请空表单。来源为主工作区 `TaskCreationPage.tsx` 当前运行页面，图号 FIG-CREATE-003 至 FIG-CREATE-018。已有候选任务的原始中文名称／正文保留并在图注说明。未点击确认创建或发送邀请；仅展示已记录的本地 Mock 流程，不改变需求、版本或实现状态判断，因此不新增语义变更日志。


## PRD-0016 概要化与任务详情截图

按用户要求，16 个模块正文精简为基本流程与边界，原详细文本保留在 `history/before-overview-edit/` 供追溯，不表示取消既有规则。七种创建示例及 16 张过程图保留。2026-09-21 在主工作区 English 界面重新采集同一任务 ccx-serum-launch 的 Overview、Discussion、Files、Activity 四个 Tab；讨论可见 Translated／View original，文件与活动中的原始业务记录不强制翻译。截图只证明当前本地页面，不证明生产服务。

## PRD-0017：内容翻译本地演示

用户确认先做本地交互演示。代码：`src/i18n/contentReading.ts`、`I18nProvider.tsx`、`MockDataProvider.tsx`、`mock/readingDemo.json`、`LanguageSwitcher.tsx`、`DiscussionMessages.tsx`、`TaskDetail.tsx`、`TaskCreationEditableText.tsx`、`TaskCriteriaFields.tsx`。设备级开关、逐条讨论原文切换与原文编辑已接线；没有真实翻译请求或通用用户内容翻译。

验证：内容阅读、Mock 和全局词条定向测试共 17 项通过，应用 TypeScript 检查通过；浏览器验证预算讨论英文正文与中文原文逐条切换。语言菜单 FIG-INT-001 已转待采集。


### 2026-09-21 多层级与下半页截图补齐

模块 07 多层级示例更新为四张连续截图：主任务、上下两段任务树、展开末级详情（FIG-CREATE-011／012／019／020）。模块 08 增加概览下半页四图：AI 进度图表、现状与下一步、子任务、依赖与标签（FIG-DETAIL-006 至 009）。来源为主工作区当前代码的 Vite 构建预览 http://127.0.0.1:5174/，英文界面，示例业务原文保留；未确认创建任务。只补足既有流程的视觉证据，不改变功能、验收或实现状态，故不新增变更 ID 或版本。


### 2026-09-21 开篇纯截图预览

按用户要求增加首位产品全貌预览，复用清单中已采集的 19 张英文运行截图，保留原始来源并登记 FIG-PREVIEW 图号。生成页面只呈现完整截图，图注与四段说明留在 Markdown 源文件。属于阅读编排调整，不改变产品规则或实现判断，不新增语义变更 ID 或发布版本。


### 2026-09-21 预览分类与缩略图

既有 19 张截图按任务协作、创建规划、团队与账号分组，通过缩略图及前后按钮切换大图，打印仍展开全部截图。仅调整 PRD 阅读交互，不改变产品需求或截图来源，不新增语义变更编号。


### 2026-09-21 设置与连接 AI 截图补齐

主工作区当前运行页面新增英文截图 7 张：个人信息、团队信息、成员管理上下页、连接 AI 安装说明与命令示例上下页。同步进入模块 04、05、09 和全貌预览（FIG-PREVIEW-020 至 026），新增「连接 AI」预览分类。截图为本地演示界面，保留演示邮箱；未修改资料、权限或发送邀请，CLI 示例不证明真实服务。仅补视觉证据，未新增需求变更编号或发布版本。


### 2026-09-21 大图两侧切换

全貌预览在大图左右居中增加上一张／下一张箭头，与顶部按钮、缩略图和键盘同步；分类首尾禁用对应方向，打印隐藏箭头。仅调整 PRD 阅读控件，不改产品需求或截图，不新增语义变更编号。


### 2026-09-21 七种创建示例逐例补全

逐例核对当前创建页全部七个快捷示例，模块 07 与全貌预览「创建规划」同步呈现 24 张过程截图。每例含原始输入与完整审阅页；补问含两步回答，复杂项目含七个子任务上下页，多层级含上下任务树与末级展开，相似／父任务含关系确认，未分配含邀请表单。新增 FIG-CREATE-021 至 026，刷新其他现有截图；多层级四张已采集详情沿用原记录。英文界面，已有候选任务原文保留；截图终点为确认创建入口，未提交正式创建或邀请。仅补视觉覆盖，不改变需求或实现判断，不新增语义变更编号。


### 2026-09-21 预览图片说明

全貌预览恢复简短图片说明，创建示例标出场景与步骤序号；说明随当前图片切换，打印保留。仅调整文档图注与呈现，不改变产品需求或截图证据，不新增语义变更编号。


### 2026-09-21 全貌预览覆盖核对与完成标准操作

核对全貌预览「创建规划」包含模块 07 全部七种示例的 24 张过程图；「任务协作」包含概览、AI 分析上下页、子任务、关系、讨论、文件和活动。新增完成标准操作三图 FIG-PREVIEW-046 至 048（对应 FIG-DETAIL-010 至 012）：原状态 1/3 → 人工确认 2/3 → 撤销恢复 1/3，主工作区当前运行页面实拍。仅补图片证据与说明，不改变需求范围，不新增语义变更编号。


## PRD-0018：认证页面移除语言入口

`OnboardingExperience.tsx` 移除 LanguageSwitcher 引用和共用认证页品牌行控件。`WorkspaceTopbar.tsx` 的账户菜单语言入口保留；语言偏好初始化不变。当前主工作区 /login 与 /signup 浏览器核验均无语言控件，重新采集英文截图并同步正文、全貌预览及截图清单。未提交登录或注册。


### 2026-09-21 子任务展开分析截图

主工作区当前英文页面内联展开 ccx-serum-launch 的首个子任务，采集 AI 进度梯度与计划／预测完成时间线。FIG-DETAIL-013 同步到全貌预览 FIG-PREVIEW-049，紧接子任务列表图。仅增加既有交互的视觉证据，不新增语义变更编号。


### 2026-09-21 登录注册前置与加入团队截图

全貌预览「团队与账号」按登录、注册、受邀登录、受邀注册、个人与团队管理顺序展示。主工作区当前英文邀请入口实拍登记为 FIG-TEAM-002 / 003，并复用为 FIG-PREVIEW-050 / 051；图片呈现目标团队与加入身份，未提交认证或加入操作。仅调整截图顺序并补充既有流程证据，不新增语义变更编号。


### 2026-09-21 首轮文字精简

按用户要求精简 16 个模块的摘要、重复说明和图注，保留四段结构、原有流程及当前／目标边界。截图、图号和全貌预览顺序不变；实拍日期与来源继续由 screenshot-manifest.json 维护。仅调整表达，不取消规则、不重新判定实现状态，故不新增语义变更 ID。


### 2026-09-21 清理抽象解释

按内部开发与验收用途，移除生命周期图的“进入／工作／收口证据”和附加解释，缩短画布；将其他流程图的口号式标题改为具体流程名称。移除阅读页的 Markdown 自述、重复图注和待重拍说明。关键规则继续保留于对应模块，Web／CLI 版本一致及正式提交不可改写明确归入 CLI 与文件验收。图源清单标记编辑更新；截图未改。仅重组已有表述，未取消功能或改变规则，不新增语义变更编号。


## PRD-0019：创建、协作、完成闭环

依据用户本轮明确的工作流程更新四个模块与 FIG-LIFE-001：登录与团队进入为前置，创建阶段参考历史任务、识别责任并建议分配；成员在本地 Agent 工作，将成果或协作内容按需回填 TaskDoor，其他成员使用更新后的有权上下文继续工作，最终人工完成。属于已确认产品流程；未在本轮实现历史任务分析、Agent 真实读写或跨成员同步，当前仍为本地演示。


## PRD-0020：Google 登录与注册前置验证码

2026-09-21 用户明确要求新增 Google 登录、注册时收取验证码且验证正确才创建账号。本轮更新账号与团队模块的目标设计，未修改应用代码。代码核验：`src/components/OnboardingExperience.tsx` 的注册主按钮先显示“创建账号”，随后进入独立验证码页；`src/lib/onboardingPreview.ts` 的 register 分支只保存待验证资料，verify-code 分支才写入 accounts，但当前接受任意六位数字，无真实投递与有效期验证。Google 入口尚未出现在当前认证组件。

注册同页收码、Google 身份验证、账号绑定冲突及两条认证路径的邀请衔接均属于设计目标，未做真实服务验收。Google 免重复邮箱码为本轮设计建议。旧运行截图继续仅证明当前 Mock；FIG-AUTH-001 旧目标图撤出正文并标为待更新，避免与新流程混淆。


## PRD-0021：Google 入口展示

`OnboardingExperience.tsx` 登录与注册表单共用 Google 按钮、彩色图标及邮箱分隔线，`onboardingMessages.ts` 提供中英词条。点击仅显示暂不可用提示，不触发授权、创建账号或更改邀请。浏览器确认登录页按钮及点击反馈；真实 OAuth 服务仍未接入。受影响的旧认证截图从正文和预览撤出并标记待采集。


### 2026-09-22 全部当前运行截图刷新

按用户要求，主工作区当前代码在 http://127.0.0.1:5173/ 重新采集 52 张英文运行截图（1280×720），替换当前阅读页所用全部页面截图，统一呈现姓名首字母头像与最新界面。覆盖七种创建示例的输入、补问、关系确认、层级展开和草稿审阅，任务概览、完成标准确认／撤销、AI 分析、展开子任务、讨论、文件、活动，以及成员、设置、认证、受邀加入与连接 AI 指引。全貌预览和正文复用同源图片；登录、注册、受邀加入及语言菜单的待采集截图恢复展示。业务原文保留，流程示意图与历史归档不作为本轮新截图。

完成标准演示后已撤销，恢复原 1/3 确认；未提交创建任务、注册、加入团队或发送邀请。截图仅证明当前本地界面，不改变真实服务、Google OAuth 或验证码的实现状态。属于视觉证据刷新，不新增语义变更 ID、不发布新版本。采集范围与日期见 screenshot-manifest.json。


## PRD-0022：创建页移除演示入口

2026-09-22 主工作区 `TaskCreationPage.tsx` 已移除七种场景按钮及示例切换状态，Mock 数据保留；用户直接输入需求。`task-creation-page.css` 统一深色创建首屏底色，消除导航与正文的色块边界。英文运行页面重拍创建空页、七种需求输入页和深色空页，正文与全貌预览共用新图；后续草稿过程图保留。浏览器已验证无快捷入口、深色顶部连续底色；未提交创建。深色样式本身为视觉修正，与入口范围澄清一并记录，不发布新版本。


### 2026-09-22 两层协作流程图展开

按用户要求，将 FIG-LIFE-001 的单一协作框展开为共享任务上下文、人与本地 Agent、人与其他协作者三个节点，以双向箭头表达读取上下文和回填成果／进展，再衔接人工完成。属于 PRD-0024 已确认语义的图形表达修正，不新增需求、变更 ID 或版本。


## PRD-0025：邮箱注册同页收码（2026-09-22）

用户确认 Google 入口保留顶部，邮箱注册在当前表单填写姓名、邮箱、密码及验证码，验证后再创建账号。`OnboardingExperience.tsx` 接入同页获取验证码、30 秒重发倒计时、修改邮箱清空验证码、显式提交及邀请保留；旧会话的注册验证码页回到新表单。`onboardingPreview.ts` 的新注册入口在本地校验本次码值、邮箱、10 分钟有效期，重发替换旧码，成功后消费并创建一次账号。旧两步 reducer 仍为既有预览内部兼容路径，不由新注册页面调用；找回密码流程不变。

当前仍是浏览器本地演示：页面明确显示未发送邮件及演示码，没有真实邮件投递、服务端限流或生产认证；Google OAuth 仍未接通。正文保留产品目标，实现差异记录于此。旧普通／受邀注册截图及全貌预览复用项转为待采集并撤出正文。

验证：认证相关定向测试 18 项通过，应用 TypeScript 检查通过；浏览器确认同页表单、仅填邮箱即可发码、重发倒计时和更改邮箱清除演示码。未创建真实账号或发送邮件。


## PRD-0026：固定注册演示码（2026-09-22）

用户明确仅查看 Mock 效果，验证码固定为 111111，无需真实验证。新注册入口不再检查发码、码值、过期或邮箱绑定；按钮自动填入 111111，输入框也标明固定码，可直接填写六位数字继续。保留收码按钮与倒计时视觉效果；正式产品的服务端验证目标未改变。来源为 `OnboardingExperience.tsx`、`onboardingPreview.ts`；`registrationInline.test.ts` 两项定向测试通过。


## PRD-0027：验证码展示与重发间隔（2026-09-22）

用户要求输入框不展示固定码，并将重发倒计时调整为一分钟。`OnboardingExperience.tsx` 只显示邮箱验证码提示；`getPreviewCodeResendDelay` 使用 60 秒间隔，注册与找回密码共用。固定码 111111 与点击获取后自动填入的 Mock 行为保持，仍不做真实验证。旧注册截图继续待采集。


## PRD-0028：注册后设置个人与团队信息（2026-09-22）

用户确认注册只收邮箱、密码和验证码。`OnboardingExperience.tsx` 移除注册称呼框，创建团队时补称呼与团队名，受邀确认时只补称呼，已有称呼不重复收取；无团队的认证落点为创建／加入选择页。`onboardingPreview.ts` 支持无称呼账号注册及刷新恢复，创建或接受邀请时保存称呼与成员关系；真实邀请目录使用补齐后的身份。首次设置无头像选择器，沿用既有默认头像。退出／移除团队后的真实跨端成员状态同步仍不属于本地认证演示能力，本次验证无团队登录与注册落点。

验证码继续使用固定 111111 Mock，60 秒重发倒计时；没有新增真实认证服务。注册截图仍待采集，FIG-TEAM-001 目标流程图同步称呼填写节点。浏览器验证注册页仅三项输入、Mock 注册进入无团队页及创建团队页显示称呼和团队名称；未在浏览器提交创建团队或邀请加入。


## PRD-0029：新注册用户跳过团队选择页（2026-09-22）

用户截图指出新用户不需要创建／加入中间页。`onboardingPreview.ts` 区分注册与已有账号登录的落点：注册无邀请直接进入 create，有邀请进入 invite；已有账号登录且无团队仍进入 choose。旧会话中尚未填称呼的注册选择页在恢复时迁移到对应设置页。`OnboardingExperience.tsx` 隐藏新用户创建页返回选择页入口。19 项认证定向测试通过，覆盖新注册直接设置、受邀确认及已有账号无团队分支；注册旧截图继续待采集，当前无此选择页的登记截图需要撤销。


## PRD-0030：登录注册流程整理（2026-09-22）

依据本对话已确认决定整理账号与团队模块：Google 在上方；注册仅邮箱、密码、验证码；60 秒重发；16px 输入文字、框内简短说明、字段错误按需显示；称呼与团队名在注册后设置，受邀不填写团队名，首次不选头像；新注册跳过选择页，已有账号无团队才显示创建／加入入口。本次只改 PRD，没有新增实现或实拍证据。

当前实现继续沿用 PRD-0026 至 PRD-0029：本地验证码固定 111111，点击获取自动填入，不检查码值或有效期，不投递邮件；Google 仅展示入口，未接入 OAuth。正文的真实验证、账号绑定、服务端限流和跨端成员同步均为目标要求，不代表已经实现。普通／受邀注册旧截图仍待采集。本轮统一正文表达，不发布新版本。

## PRD-0032：注册验证码有效期（2026-09-23）

用户明确将邮箱注册验证码有效期调整为 1 分钟；60 秒重发间隔保持。本次仅更新 PRD 目标，未改应用代码。当前仍沿用 PRD-0026 的固定码 Mock，不校验有效期、不发送真实邮件；不能以演示表单证明生产验证已实现。

### 2026-09-23 账号与邀请路径图文补充

补充未注册、已有账号未登录、已登录三种邀请进入路径，恢复普通注册与受邀注册截图，并刷新受邀登录截图。主工作区 /signup、/signup?invite=demo-valid、/login?invite=demo-valid 实拍；浏览器验证注册切换登录仍保留邀请团队。Google 点击显示尚不可用提示，新增 FIG-AUTH-004；不将入口截图当作 OAuth 成功证据。未提交注册、登录或加入。补充既有流程说明与截图，不新增语义变更编号。

## PRD-0033：Google 授权流程 Mock（2026-09-23）

用户要求仅实现样式和本地流程。`GoogleAuthPreview.tsx` 提供示例账号选择、授权确认、取消及失败预览；`OnboardingExperience.tsx` 接入现有表单，`onboardingPreview.ts` 保存演示 Google 身份并按邀请、账号与团队状态分流。同邮箱密码账号不合并，真实 Google OAuth 和绑定仍未实现。浏览器已核验示例账号授权后进入原团队加入确认；没有提交加入。FIG-AUTH-005/006 和 FIG-TEAM-004 为当前 Mock 实拍，不是 Google 托管页面。

19 项认证定向测试通过，覆盖新账号、重复登录、邀请保留、账号冲突、已有团队去向和空密码拒绝。

## PRD-0035：登录后直接进入工作区（2026-09-23）

用户要求移除创建／加入页面，并默认使用邮箱名称或已有姓名。`simplifyOnboardingEntry` 将认证和旧引导会话衔接到已有工作区；无团队时按账号建立唯一的个人工作区，邀请保留独立确认。`OnboardingExperience.tsx` 移除选择及团队填写页面。16 项相关定向测试通过，应用类型检查通过；仍是浏览器本地 Mock，不代表真实认证服务。

## PRD-0036：Google 选账号后直接登录（2026-09-23）

用户指出账号选择页的 Local demo 标记和后续“确认使用信息”页面多余，要求选中账号直接登录并衔接团队创建。`GoogleAuthPreview.tsx` 删除 selected／consent 中间态、信息确认内容及演示按钮，账号按钮直接调用既有 onComplete；保留取消和真实本地登录错误反馈。继续复用 PRD-0035 的自动团队工作区创建，无额外团队填写页；定向邀请保留独立的加入确认。

验证：4 项 Google 认证状态定向测试、应用 TypeScript 检查通过。主工作区 http://127.0.0.1:5173/login 浏览器实测，账号选择无标记／信息确认步骤；点击 Alex Morgan 后直接进入新建的 Alex Morgan 空团队工作区。FIG-AUTH-005 已重拍为 1280×720；旧 FIG-AUTH-006 保留文件仅追溯。本轮没有接入真实 Google 服务。

### 2026-09-23 受邀流程分支图示澄清

按用户反馈，将 FIG-AUTH-007 原先合写在节点内的受邀路径展开为“是否已登录”，未登录再区分已有账号与未注册，三条路径汇合到确认加入。账号模块 3.4 同步表达；沿用已确认规则，仅改图示与措辞，不新增语义变更 ID，不改变实现状态。

### 2026-09-23 账号模块阅读顺序调整

按用户要求先展示注册说明和既有注册截图，再展示已有账号登录，流程总览移至登录之后、受邀说明之前，取消 3.0 编号。复用现有图片与规则，未改变功能或实现状态，属于阅读编排调整，不新增语义变更 ID。


## PRD-0077：讨论区翻译与词条复用

2026-10-09 用户明确自动翻译仅限讨论区、记录词条复用，并要求同步 PRD。本节替代 PRD-0017 关于整任务阅读入口的当前规则，历史记录保留用于追溯。

| 来源 | 核验范围 |
| --- | --- |
| `src/ai/mock/i18n/MockDataProvider.tsx`、`mockContent.ts`；`src/features/tasks/components/TaskDetail.tsx`；`src/shared/i18n/I18nProvider.tsx` | 任务字段和普通业务文本保持原文；移除任务阅读菜单及整任务原文切换状态 |
| `src/ai/mock/i18n/discussion-translation-entries.ts`；`src/features/tasks/discussion/components/DiscussionMessages.tsx` | 讨论正文独立读取译文；按任务、精确原文、目标语言记录词条，设备持久化并跨刷新复用 |
| `src/shared/ui/LanguageSwitcher.tsx`、`src/shared/i18n/globalUiMessages.json` | 偏好名称明确为“自动翻译讨论内容” |
| `server/contentReading.test.ts` | 5 项定向测试通过：任务原文、阅读状态、无译文保留原文、词条跨刷新复用及原文／语言隔离 |
| 主工作区 `http://127.0.0.1:5173/`，2026-10-09 English 界面 | 浏览器验证 GMV 任务标题、目标和完成标准为中文原文，无整任务阅读入口；讨论正文仍显示译文与逐条原文入口 |

应用类型检查和结构检查通过。语言菜单 FIG-INT-001 的旧文案截图失效，已从正文移除并标记待重新采集；本轮未新增截图资产。


### 2026-10-09 团队删除与恢复修复验证

主工作区复现团队删除保存失败及回滚：大体积保留记录和恢复日志占用浏览器存储。`team-lifecycle-storage.ts` 与 `task-ai-adjustment-storage.ts` 改用 gzip 无损压缩大快照，兼容读取原 JSON 和旧 LZW 日志；未改变拥有者权限和 30 天保留规则。删除确认文案保留名称和页面入口两侧的「」。浏览器实测删除协作平台团队成功，“我的团队”出现剩 30 天与恢复按钮，随后恢复成功；验证团队已恢复。FIG-DELETE-009 记录实际已删除状态，来源为主工作区 http://127.0.0.1:5173/。44 项删除、恢复及恢复日志定向测试通过，包含容量限制下的大快照完整恢复；应用类型检查通过。本轮为既有能力修复与截图补齐，不新增语义变更 ID 或发布版本。


## PRD-0078：MCP 任务分析与分档百分比

依据项目 2026-10-08 已核验的 `skills/shared/production-mcp-contract.md` 及标准返回契约，任务分析新增 `references/mcp-analysis.md`，读取 `criteria.version/items[].id/text`，保持人工确认独立；当前会话未连接正式 MCP，无线上读写验证。`task-progress-percent.ts` 统一整体与标准的分档，`TaskProgressStage.tsx` 和 `TaskCriterionIndicator.tsx` 展示百分比；燃起图仍使用原始完成量。相关定向验证覆盖数值边界、未知、100% AI 与人工确认分离以及图表保持。旧概览、标准和展开子任务截图标 pending 并撤下，不新增截图或发布版本。


## 2026-10-10 设置页面截图补齐

从主工作区当前运行页面 `http://127.0.0.1:5173/` 通过设置导航实际打开并采集团队任务（FIG-TEAM-007）、行为日志（FIG-TEAM-008）、访问令牌（FIG-CLI-006）、我的团队（FIG-DELETE-009）。截图已重新登记为 current-page，替换旧 pending 记录并放回对应功能正文；未创建或删除令牌，未提交团队恢复，不代表生产 API 验证。本次仅更新界面证据，产品规则不变，不新增语义变更 ID。


## PRD-0096 讨论上下文修正

`task-discussion-ai.ts` 导出当前记录的自身 ID 作为讨论 ID，不再输出回复 ID；当前正文及未发送草稿不截断。定向验证见 `server/aiContextCompact.test.ts`，未带入其他记录或已删除内容。已有设置截图不受影响。


## PRD-0097 设置分组

依据 PersonalInfoDialog 设置导航，将个人信息、我的职责、我的团队、访问令牌、团队信息、成员、团队任务、行为日志拆成设置分组的八个正式模块。现有规则及四张 current-page 截图迁移，原模块保留跨领域流程引用。团队信息管理员编辑等既有实现差异继续有效，本次不改变产品权限；其余页面尚未补采截图。


## 2026-10-10 设置截图补充

新增个人信息、我的职责、团队信息、成员四个 current-page 截图及令牌创建表单两张、删除确认和团队恢复确认截图。均从主工作区实际设置导航采集，未提交写操作。职责页当前显示自动更新开启，其自动应用文案与正式需求的确认后写入存在差异；团队信息截图身份为管理员，当前可编辑，与拥有者独占编辑目标仍有差异。保留目标，不以截图覆盖权限和职责确认规则。本次为截图证据补充，无新语义变更编号。


## 2026-10-10 CLI 与 MCP 引导截图

FIG-CLI-007、FIG-CLI-008 为主工作区当前连接 AI 弹窗实拍，分别展示 CLI 安装与 MCP Skill 配置提示词、产品选择和令牌入口。未执行复制、客户端唤起或安装；WorkBuddy 标志当前加载失败。仅补充截图证据，不新增语义变更 ID。

## 2026-10-10 MCP 双认证（PRD-0098）

页面与安装 Skill 已支持浏览器 OAuth 授权为主、令牌为备选的引导；实际 OAuth 服务能力来自正式项目 Issue #28 的说明，PM Demo 不实现授权服务。FIG-CLI-008 的旧提示词截图撤下，待重新采集。全局字体沿用 9080860 已推送的调整，用户确认正式项目同步移植。

## PRD-0115：任务外观自定义色

`TaskAppearancePicker.tsx` 颜色优先，使用原生取色器和六位 HEX 输入；`TaskIcon.tsx` 与 `TaskDetail.tsx` 显示自定义色，`App.tsx` 保存图标与颜色，`workspaceNodes.ts` 读取并校验 HEX。实现为本地演示；旧详情截图已经待采集，本轮没有新增运行截图。

## PRD-0116：子任务不设置前置依赖

`TaskCreationSubtaskEditor.tsx` 移除依赖编辑；`task-creation-review.ts` 清除所有审阅任务的 dependsOnClientIds，创建提交复用该处理。既有详情关系能力不变；创建页旧截图继续待采集，本轮未新增截图。

## 2026-10-10 头像删除（PRD-0099）

`shared/ui/AvatarEditActions.tsx` 提供悬停层的编辑与删除按钮，仅在已上传图片时出现删除。`PersonalInfoDialog.tsx` 删除草稿中的 `avatarDataUrl`，随“保存资料”生效；`TeamAppearancePicker.tsx` 删除后立即保存不含图片的团队外观。浏览器在本地开发服务验证两处上传、悬停双按钮与删除恢复首字母；现有截图不含悬停状态，无需重新采集。

## PRD-0159：仅实施 NAV-1 筛选同步

用户明确要求只处理工作区与整体导航的 NAV-1，其他 P0 未授权实施，本轮扩展改动已撤回。当前代码由 TaskWorkspace 的结果选择、App 的清空详情回调和 task-result-selection 支撑；保留本轮开始前文件树默认宽度等其他对话已有改动。模块06替代保留筛选外详情的旧规则，其他模块不变。

2026-10-13 主工作区实操：搜索“国庆专场”后唯一列表项与详情一致；清除搜索后当前任务仍在结果中，详情保持；无匹配关键词清空详情；从第二条置顶任务切换到“我负责的”后选中屏幕第一条置顶任务。应用 TypeScript 检查和结构检查通过。旧列表截图继续标记待采集，本次实操画面仅作核验材料。

## PRD-0160：搜索与筛选变化统一选择首条

用户明确要求修改搜索或筛选条件后展示新结果第一条，否则展示空状态，并要求两处空状态说明简短。正式规则归模块 06，交互基线与 NAV-1 清单、正式项目 issue 草稿同步；本条替代 PRD-0159 中“调整筛选时保留仍匹配任务”的分支。范围、搜索、状态、标签、日期变化统一选择实际列表首条，置顶优先；普通任务数据刷新或仅排序变化仍保留匹配的手动选择。自动详情更新不抢走搜索或筛选控件焦点，手动打开任务沿用既有导航焦点规则；移动端在列表筛选时停留列表。其他 P0 不在本轮范围，历史日志和证据保留。

实现定位为 `src/features/tasks/components/TaskWorkspace.tsx`、`src/features/tasks/lib/task-result-selection.ts`、`src/app/App.tsx` 及两处空状态的中英文文案。本轮主工作区实操：手动选中第二条“新品发布会筹备”后搜索“发”，该任务仍匹配但详情切到第一条置顶“完成秋季抗老精华首发闭环”；继续输入“布”得到“发布”时搜索框始终保有焦点，详情随新结果更新。无匹配词“1111111”清空详情；中英文两处说明的实际文本行数均为 1。仅调整排序保持手动选中的匹配任务。应用 TypeScript 与结构检查通过，PRD 构建成功并生成 25 个模块，生成页包含 PRD-0160；PRD-0159 的旧验证仅保留历史。状态、标签、日期复用同一条件变化判断，本轮未逐项操作；窄屏与业务数据刷新未重测。截图清单中的任务列表当前页面图仍待主工作区重新采集，旧图不恢复为当前证据。


## PRD-0161：当前选择优先，首条仅作兜底

用户进一步明确，主动打开搜索或筛选结果中的任务应正常展示该选择，第一条仅用于没有选择或当前任务已不匹配的兜底场景；已授权更新 PM demo 并将筛选同步及简短空状态合并发布到正式项目的一条 issue。正式规则归模块 06，当前交互基线同步。本条替代 PRD-0160 的条件变化强制首条分支，PRD-0159／0160 的日志与当轮证据完整保留；不扩展其他 P0，不发布新版本。

本轮代码移除条件变化强制首条分支及对应上下文签名，所有结果变化统一判断当前选择是否仍匹配。实现定位为 `src/features/tasks/lib/task-result-selection.ts` 的当前匹配选择优先策略、`src/features/tasks/components/TaskWorkspace.tsx` 的结果同步，以及 `src/app/App.tsx` 的不转移焦点与空结果清空回调。数据刷新与排序同样保持匹配选择；置顶优先、移动端列表筛选停留列表及 PRD-0160 的中英文简短说明继续适用。

2026-10-13 主工作区实操：选中第二条“新品发布会筹备”后搜索“发”，详情保留该任务，继续输入“布”时焦点保持；在“发布”结果中主动打开“定稿发布会主视觉”，随后改搜“发”仍保留该非首条任务。改搜“首发”使原选择不匹配后，详情兜底到第一条置顶任务；“1111111”无结果时清空详情，重新搜索“发”后无选择兜底到首条。状态筛选为“已完成”时排除原任务并打开第一条匹配结果，主动打开另一条完成任务后放宽为全部状态仍保留该选择。中文两侧空说明实测各一行。5 项定向选择断言、应用 TypeScript、结构检查、PRD 构建（25 个模块）及格式检查通过；生成页包含 PRD-0161。团队／范围、标签／日期、业务数据刷新、英文及窄屏未在本轮重测，不用旧轮次实测证明本轮通过。任务列表 6 张 current-page／current-component 旧图继续 pending，历史备注保留，本轮截图仅作操作核验材料，未补采正式图号资产；PM demo 证据不代表正式项目已经接入。
