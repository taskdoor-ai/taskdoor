# 全局通知入口 component research

## 需求

- 用户任务：在任何模块中查看并处理协作请求，浏览 Task AI 洞察与相关动态；Task AI 洞察从通知返回来源 Task 处理。
- 交互关键词：notification center、inbox、right sheet、action queue、focus management。
- 技术约束：React；优先复用现有 Base UI、Button 与 AgentDoor Token；不安装新依赖。
- 必须覆盖的状态：全部、未读、已读、详情、接受、可选原因拒绝、空状态、移动端、键盘焦点和 reduced motion。

## 搜索过程

- 21st.dev：检查 Notifications 分类、Notifications Menu、Notification Inbox Popover、Notification Center 与 Notification Button。
- 官方组件库：检查 shadcn/ui Sheet 与 Base UI Dialog 官方文档。
- GitHub / 成熟实现：shadcn/ui Sheet 以 Radix / Base UI Dialog 行为作为成熟开源基础；当前仓库已安装 Base UI，无需引入第二套浮层依赖。

## 候选

| 候选 | 来源与采用信号 | 行为 / 无障碍 | 依赖 / 许可 / 维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [Notifications Menu](https://21st.dev/community/components/ahmedmayara/notifications-menu) | 21st.dev Notifications 分类；项目已有基于其结构的分段筛选组件 | 适合紧凑通知列表，但原模型偏“未读消息” | 复制式社区组件；需核对并保留来源 | 列表 anatomy 可用，业务状态需完全重写 | **改造**：只复用紧凑分段与列表节奏 |
| [Notification Inbox Popover](https://21st.dev/community/components/ruixen.ui/notification-inbox-popover) | 21st.dev 社区组件；提供 All / Unread 与时间信息 | Popover 适合短消息，不适合责任范围、依据和多动作处理 | 仅 Lucide；维护信号有限 | 宽度和信息容量不足；“标记全部已读”会混淆已读与已处理 | **拒绝** |
| [Notification Center](https://21st.dev/community/components/forge-ui/notification-center/default) | 21st.dev Notification 分类；有视觉演示 | 偏单条实时支付提醒，无复杂处理流 | 依赖 motion、react-icons；当前项目不需要 | 大量装饰与新依赖，不符合安静基调 | **拒绝** |
| [Sheet](https://ui.shadcn.com/docs/components/radix/sheet) | shadcn/ui 官方；明确用于从边缘展示补充当前页面的内容 | 基于 Dialog，具备标题、描述、关闭、遮罩和方向组合 | 开源复制式组件；可用现有 Base UI 实现，不安装依赖 | 只需转换为 AgentDoor Token 和左侧固定宽度 | **采用结构** |
| [Base UI Dialog](https://base-ui.com/react/components/dialog) | 官方维护；当前仓库已安装并用于共享 Dialog | 焦点进入 / 返回、Escape、Portal、Backdrop、受控状态和滚动示例完整 | 已有 `@base-ui/react` 依赖 | 只需增加共享 `Sheet` 视觉变体 | **采用行为基础** |
| [Material UI Badge](https://mui.com/material-ui/react-badge/) | 官方维护；Badge 专门用于附着在图标右上角的补充计数 | 建议把未读数写入拥有者的可访问名称；零值隐藏，超大数封顶 | MIT；无须复制实现或增加依赖 | 采用锚点、可访问名称和 `99+` 规则 | **采用规则** |
| [Ant Design Badge](https://ant.design/components/badge/) | 官方维护；通知计数是核心示例 | 小号角标使用紧凑高度与红色错误语义，支持偏移和封顶 | MIT；无须复制实现或增加依赖 | 采用红色语义与小尺寸比例，转换为 AgentDoor Token | **采用视觉比例** |

21st.dev 未稳定提供可核对的使用量数字，因此不伪造 usage count；本次以官方维护、现有依赖、无障碍行为和产品适配为主要信号。

## 最终选择

- 采用的行为基础：Base UI Dialog。
- 采用的视觉结构：shadcn Sheet 的 Header / Content 结构，并按全局导航关系改为左侧滑出；21st.dev Notifications Menu 的紧凑分段与时间列表节奏。
- AgentDoor 适配：铃铛数量表示未读；标题栏菜单筛选“全部 / 未读 / 已读”；详情在同一 Sheet 内前进 / 返回；已读与业务处理状态分离，拒绝原因可选且私密。Task AI 洞察只在通知中展示概览，通过“前往任务查看”定位来源 Task 的洞察区。
- 铃铛角标细化：计数直接锚定 40px rail item 的右上角，使用由 `--ad-danger` 与 surface 混合得到的柔和红色、白字、`--ad-sidebar` 2px 分隔边；以标准 Token 直接形成紧凑尺寸，不再先放大后 `transform` 缩放。零未读不显示，超过 99 显示 `99+`，触发器的可访问名称保留完整未读数；不使用跳动或脉冲动画。
- 来源注释或许可动作：共享 Sheet 和通知筛选组件保留来源说明；不复制第三方完整视觉代码。
- 为什么不需要自研行为：Base UI 已提供焦点、Escape、Portal 与遮罩；自研只限 AgentDoor 特有的处理状态和内容语义。

## 验证

- 桌面：440px Sheet 从 64px 一级导航右边缘展开，导航保持可见，不改变当前模块。
- 移动：全宽 Sheet，44px 触控目标。
- 键盘：触发器可聚焦；打开后焦点进入标题；Escape 关闭并返回触发器。
- 空状态：说明当前没有需要响应的事项，不制造庆祝或焦虑。
- 相邻界面：复用一级 rail item、共享 Button、Dialog 浮层语法和现有通知分段组件。
