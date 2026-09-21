# PRD 需求变更日志

本文件只记录语义需求变更。纯文字修正和视觉样式调整由 Git 历史追踪。

| 变更 ID | 日期 | 版本 | 影响模块 | 类型 | 变更内容 | 原因与影响 | 相关链接 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PRD-0021 | 2026-09-21 | 1.1 | 账号与身份 | 实现状态更新 | 登录、注册页加入 Google 双语入口，未接入时提示暂不可用；旧认证截图转待采集。 | 用户要求页面展示授权入口；按钮存在不等于真实 Google 登录可用。 | [账号](modules/02-account-identity.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0020 | 2026-09-21 | 1.1 | 账号与身份、首次进入与团队建立 | 修订 | 新增 Google 登录目标；邮箱验证码移入注册表单，校验正确后才创建账号；补充绑定冲突与邀请衔接设计。 | 用户要求重设计登录注册；区分当前任意六位数字 Mock 与真实验证目标，未修改应用实现。 | [账号](modules/02-account-identity.md)、[团队](modules/03-team-onboarding.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0019 | 2026-09-21 | 1.1 | 产品目标与生命周期、任务创建、CLI 连接、文件与本地提交 | 修订 | 明确创建—协作—完成闭环；创建参考历史任务、识别责任并建议分配；本地 Agent 工作后回填成果或协作内容，成员接续使用完整有权上下文。 | 用户明确核心工作流程；保留本地演示与正式接入边界。 | [主流程](modules/01-product-lifecycle.md)、[创建](modules/07-task-creation.md)、[连接](modules/05-cli-connection.md)、[回填](modules/11-files-local-commits.md) |
| PRD-0018 | 2026-09-21 | 1.1 | 账号与身份、海外优先与多语言、产品全貌预览 | 移除 | 移除登录注册及共用认证页面的语言选择入口，刷新登录注册截图。 | 用户要求简化认证页面；沿用语言偏好，登录后通过账户菜单切换。 | [账号](modules/02-account-identity.md)、[多语言](modules/02-internationalization.md)、[预览](modules/00-product-preview.md) |
| PRD-0017 | 2026-09-21 | 1.1 | 海外优先与多语言 | 新增 | 自动翻译开关、讨论逐条原文切换、任务原文入口及编辑保护。 | 用户确认先做本地交互演示；只匹配示例译文，真实翻译服务尚未接入。 | [模块正文](modules/02-internationalization.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0016 | 2026-09-21 | 1.1 | 全文及任务详情 | 文档整合 | 全文改为概要流程；任务详情就近展示概览、讨论、文件、活动四张当前截图，并记录讨论译文／原文入口。 | 按用户要求减少正文，保留完整模块和创建场景图；详细规则留作参考，不表示取消功能边界。 | [目录](index.md)、[详细参考](history/before-overview-edit/README.md)、[截图清单](screenshot-manifest.json) |
| PRD-0015 | 2026-09-21 | 1.1（沿用原完整稿） | 全部 15 个原模块及多语言 | 整合修订 | 恢复原完整 PRD 生命周期结构，合并四 Tab、逐条 AI 梯度及人工确认、多语言与 TaskDoor CLI 命名；重采英文截图并就近排版，撤下旧三栏和中文运行图。 | 修正前次误以三个局部模块生成全文的问题；保留原目标能力边界，不把 Mock 当生产能力。当前圆环已移除常驻 AI 文案与独立依据按钮，保留 hover 来源提示。 | [目录](index.md)、[来源映射](source-map.md)、[截图清单](screenshot-manifest.json)、[原稿日志](history/full-product-prd-baseline/CHANGELOG.md) |
| PRD-0014 | 2026-09-21 | 0.2 | [任务详情](#task-detail) | 修订 | 编号环直接确认及撤销；AI 梯度与依据移至正文下方独立入口，触屏常显确认文字。 | 提升人工确认可发现性，保存成功后才显示实心勾及短暂撤销反馈；保留只读与未保存保护。 | [模块正文](modules/03-task-detail.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0013 | 2026-09-21 | 0.2 | [任务详情](#task-detail) | 修订 | 将逐条评估 Mock 从 14 个任务扩展到全部 232 个内置任务、577 条标准，保留明确未知及已有记录。 | 修复大部分任务缺少评估而呈现空环；固定模拟梯度不从任务状态推算，弧线加粗以便辨识。 | [模块正文](modules/03-task-detail.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0012 | 2026-09-21 | 0.2 | [任务详情](#task-detail) | 修订 | 编号环使用四段 AI 梯度，依据和确认集中到左侧浮层，移除行尾百分比和确认按钮；增加克制动效。 | 与任务 AI 进度档位一致，释放正文空间；保留人工确认语义及减少动态效果支持。 | [模块正文](modules/03-task-detail.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0011 | 2026-09-21 | 0.2 | [任务详情](#task-detail) | 修订 | 补齐逐条完成标准 Mock 评估、双语依据和人工确认示例，并迁移未修改旧示例。 | 让编号环呈现真实的示例状态；保留用户修改、撤销与未知，不由整体进度推算标准。 | [模块正文](modules/03-task-detail.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0010 | 2026-09-21 | 0.2 | [任务详情](#task-detail) | 修订 | 完成标准改为编号进度环、按需确认操作、逐条依据浮层和确认条数。 | 区分 AI 评估与人工验收，移除装饰勾的误导；确认独立持久化，标准修改后失效。 | [模块正文](modules/03-task-detail.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0009 | 2026-09-21 | 0.2 | [海外优先与多语言](#internationalization) | 修订 | 全局排查并补齐 AI 工具、通知、文件及辅助控件文案，增加主应用静态扫描。 | 区分静态界面覆盖与动态内容边界，保留用户原文和 AI 导出协议。 | [模块正文](modules/02-internationalization.md)、[检查记录](../i18n-ui-audit-2026-09-21.md) |
| PRD-0008 | 2026-09-20 | 0.2 | [海外优先与多语言](#internationalization) | 修订 | 补齐进度图表、当前情况、下一步建议及内置进度依据英文展示。 | 修复 AI 分析区中英文混排；图表译文参与排版，数值、日期与用户记录保留。 | [模块正文](modules/02-internationalization.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0007 | 2026-09-20 | 0.2 | [海外优先与多语言](#internationalization) | 修订 | 补齐活动及设置主要控件、邀请文案与设置示例数据双语。 | 修复英文模式下活动和设置仍显示系统中文；原始用户内容与权限不变。 | [模块正文](modules/02-internationalization.md)、[实现矩阵](current-implementation-matrix.md) |
| PRD-0006 | 2026-09-20 | 0.2 | [海外优先与多语言](#internationalization) | 修订 | 创建示例语言识别与工时、日期解耦，父子任务共用展示目录；补齐默认名称及高级筛选双语。 | 修复列表、面包屑和详情语言不一致，保持自定内容与筛选存储值。 | [模块正文](modules/02-internationalization.md)、[来源映射](source-map.md) |
| PRD-0005 | 2026-09-20 | 0.2 | [任务详情](#task-detail) | 修订 | 基础信息并入讨论、文件、活动同级 Tab，移除双栏收起及窄屏二级切换。 | 用户要求统一详情入口，释放内容宽度；保留编辑及证据定位。 | [模块正文](modules/03-task-detail.md)、[交互基线](../task-design-kit/11-task-workspace-detail-interaction-baseline.md) |
| PRD-0004 | 2026-09-20 | 0.2 | [海外优先与多语言](#internationalization) | 修订 | 语言入口移入账户下拉；接入登录注册、创建流程与内置 Mock 双语目录，明确用户内容保护及剩余迁移边界。 | 根据用户要求支持英文演示与主流程体验，切换不改写业务数据。 | [模块正文](modules/02-internationalization.md)、[实现矩阵](current-implementation-matrix.md)、[来源映射](source-map.md) |
| PRD-0003 | 2026-09-20 | 0.2 | [海外优先与多语言](#internationalization) | 新增 | 确定英文默认、简体中文切换、内容与显示分离、状态兼容、时区边界和全产品迁移验收；记录已接通基础层与未完成流程。 | 海外市场优先，避免翻译改写业务数据或将局部本地化误报为全站英文。 | [模块正文](modules/02-internationalization.md)、[实现矩阵](current-implementation-matrix.md)、[来源映射](source-map.md) |
| PRD-0002 | 2026-09-20 | 0.2 | [任务列表](#task-list) | 修订 | 任务范围移至外部快捷筛选；明确范围与状态组合、数量口径、排序、搜索清除、筛选条件移除和列表详情联动。同步控件对齐、图标和选中样式验收，以当前结构示意替换过期插图。 | 汇总本轮已确认交互，替代搜索框内嵌范围、顶部清除全部、分类清除叉及任务行常驻更新时间等旧描述。 | [任务列表正文](modules/01-task-list.md)、[交互基线](../task-design-kit/11-task-workspace-detail-interaction-baseline.md) |
| PRD-0001 | 2026-09-18 | 0.1 | PRD 体系、[任务列表](#task-list) | 新增 | 建立模块化 PRD 模板、内容规则和变更机制，并以任务列表作为首个示例模块。 | 统一后续需求编写与维护方式，明确任务列表的目标交互；不描述当前实现进度。 | [设计说明](../superpowers/specs/2026-09-18-prd-template-system-design.md) |
