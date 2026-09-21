# PRD 来源映射

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
