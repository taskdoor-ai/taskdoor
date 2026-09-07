# 个人中心与“我的责任” research

## 需求

- 用户任务：从头像设置入口打开统一大型 Dialog；个人设置依次展示“个人信息 / 我的责任”，团队设置保留“团队信息 / 成员”；责任页标题右侧可切换团队，以一份连续文本共同维护，AI 建议保持证据来源。
- 交互关键词：profile dialog、avatar disclosure、team switcher、editable responsibility document、evidence-backed AI suggestions。
- 技术约束：Vite + React + TypeScript；已有 Base UI、shadcn 风格 Select / Dialog / Button、PersonAvatar；不得安装新依赖。
- 必须覆盖的状态：默认、团队切换、编辑、保存、取消、未保存正文、AI 建议、采纳、忽略、建议已处理完、从未产生建议、保存失败、空责任正文、移动、键盘、焦点、reduced-motion。

## 搜索过程

- 21st.dev 查询与分类：Profile、Account、Settings、Profile Dropdown；检查 Profile 分类 Popular、Account Settings、Account Menu 和 2026-08-20 Settings Pages 指南。
- 官方/组件库查询：shadcn Select / Tabs、Base UI Select / Tabs、React Spectrum Tabs。
- GitHub 查询：Radix Primitives 许可与维护来源；本轮没有复制第三方源码。
- r7 文档式责任补充：检查 21st Rich Text Editor / Smart Textbox、Tiptap 官方 Editor 与无障碍指南、shadcn Textarea / Field；重点比较纯文本、富文本 Schema、键盘与依赖成本。
- 历史 r8 阅读与采纳交互复核（已被 r10 替代）：曾采用 Smart Textbox 的“建议进入草稿、由人确认”思路，但未使用 ghost text 或自动保存。
- 历史 r9 采纳反馈复核（已被 r10 替代）：曾沿用 Button、Textarea 和现有状态文本，以中间草稿呈现采纳过程。
- r10 确认动作收敛：继续采用共享 Button 和原生列表，不新增确认 Dialog 或分步控件。AI 直接提供完整建议段落，主操作只保留“采纳 / 忽略”；采纳本身即人的明确确认，因此与正文写入原子保存，处理后从 active 队列消失。
- r12 逐条责任编辑复核：检查 21st.dev Interactive List / Animated To-Do List、shadcn Array Fields / Input Group / Field 和 React Spectrum TextField。采用“受控条目数组 + 明确增删 + 每项可访问名称”的结构，但继续使用项目现有 Textarea / Button，不引入 React Hook Form、Framer Motion 或第二套表单系统。
- r13 设置入口与分组复核：依据产品负责人提供的设置弹窗参考，复核既有 21st Account Settings、shadcn Settings / Sidebar 与当前大型 Dialog。保留“左侧分组、右侧详情”的成熟结构，把入口统一命名为“设置”；个人信息在上，团队信息在下。团队信息复用现有 Team 与 Responsibility 数据，不新增团队名称写入、成员管理或权限设置。
- r15 团队模块拆分：21st.dev 的 Team Members / Settings 检索未返回可核验的专用设置成员表，因此复用已记录的 [21st Member Selector](https://21st.dev/community/components/osiris-balonga/member-selector/default) 身份双行结构；同时比较 [shadcn Table](https://ui.shadcn.com/docs/components/base/table) 的 Simple Name / Email / Role 表与项目现有 PersonAvatar 列表。采用只读语义列表，不引入 TanStack Table、邀请、角色编辑或分页。
- r16 参考图精修：依据产品负责人再次提供的“通用 / 成员”设置参考，不再使用摘要式团队卡片。团队信息改造为纵向通用设置表单，复用共享 TeamLogo、Input 与 Button；成员改造为桌面三列信息表（用户 / 团队 / 工作身份），窄屏把相同字段堆叠为成员卡片。参考图中的邀请链接、角色修改、离开与删除没有对应命令或权限事实，本轮不呈现。
- r17 功能复刻：产品负责人进一步明确要求按参考完整复刻并具备功能，因此重新检查团队邀请、成员角色和危险操作候选。采用参考图的邀请链接、成员表、角色下拉和通用设置危险区；实现范围限定为浏览器本机原型状态，不冒充真实邮件、服务端 ACL 或生产组织删除。

## 候选

| 候选 | 来源与采用信号 | 行为/无障碍 | 依赖/许可/维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [21st Account Settings](https://21st.dev/community/components/s/account) / [Settings Pages 指南](https://21st.dev/blog/react-settings-page-components) | Account Settings 分类约 56、Glass Account Settings Card 约 277；指南建议按主题拆分、文本显式保存 | 结构建议可靠，但单组件键盘契约与许可链不完整 | 部分候选依赖 framer-motion；21st 单页维护信号有限 | 玻璃态和账号/账单语义不适合 AgentDoor | **adapt structure**：采用“按主题分区、每区独立保存”，拒绝视觉 |
| [21st Account Menu](https://21st.dev/%40ruixen.ui/components/account-menu) | 2025-10 发布；明确覆盖 profile / team / preferences 入口 | 菜单层级完整，但本项目已有头像菜单且当前组件无更强行为证据 | Lucide；页面未提供独立许可 / issue 链 | 替换现有菜单会制造第二套样式 | **reject implementation / adapt anatomy**：保留“头像菜单进入 Profile”的信息结构 |
| [21st Features / Card Grid](https://21st.dev/community/components/s/features) | 公开 Features 集合包含大量 Card/Grid/Bento；指南明确同级信息应使用 uniform card row，只有存在主次时才用 Bento | 响应式网格结构可借鉴；具体社区组件行为与许可需逐项复核 | 很多候选依赖 Motion，本轮不需要 | 动画与营销视觉不适合责任信息 | **adapt layout / reject code**：采用同级等宽横排，拒绝 Bento 主次与动效 |
| [shadcn Card](https://ui.shadcn.com/docs/components/radix/card) | 官方文档提供 Header / Content / Footer 组合和 spacing variable | 静态 Card 语义清晰；内部按钮沿用既有 Button 焦点契约 | 项目已有相同技术栈；MIT 风格开源，无新增依赖 | 可完全转为 `--ad-*` Token | **benchmark composition**：责任组头、Claim 内容与动作分区，但不新增共享 Card |
| [Carbon Tile](https://carbondesignsystem.com/components/tile/usage/) | IBM 官方维护；Default/Advanced/读屏/键盘状态均标记 Tested | 官方建议强关联 Tile Group 横向从左到右、组内同变体；基础 Tile 本身不抢焦点 | Apache-2.0；本轮只参考结构 | 企业信息密度与本产品接近 | **adopt grouping principle**：三类责任等权横排、同宽同语法，窄屏堆叠 |
| [Base UI Tabs](https://base-ui.com/react/components/tabs) + [Select](https://base-ui.com/react/components/select) | 官方持续维护；项目已直接依赖 `@base-ui/react` | Tabs 提供键盘焦点与 panel 关系；Select 提供 label、typeahead、触控定位 | MIT；无新增依赖 | 只需 AgentDoor Token 适配 | **adopt behavior** |
| [shadcn Tabs](https://ui.shadcn.com/preview/radix/tabs-example) + [Select](https://ui.shadcn.com/docs/components/base/select) | 官方示例包含 line tabs、内容 tabs、disabled、icons；现有 Select 已按该结构接入 | 基于 Base UI / Radix，包含 focus、invalid、disabled 结构 | MIT 风格开源；项目已拥有代码 | 与现有共享组件最接近 | **adapt visual API** |
| [React Spectrum Tabs](https://react-spectrum.adobe.com/Tabs) | Adobe 官方维护；覆盖 compact、responsive overflow、manual / automatic keyboard activation | 完整 Tabs 语义、方向键、disabled、inactive panel inert | Apache-2.0；引入会新增设计系统和依赖 | 作为行为基准价值高，直接采用过重 | **benchmark / reject dependency** |
| [21st Rich Text Editor collection](https://21st.dev/community/components/explore/rich-text-editor-react) / [Smart Textbox](https://21st.dev/community/components/tigerabrodi/smart-textbox/default) | 集合约 49 个候选，19 个只依赖 React/Tailwind；Smart Textbox 提供 AI ghost suggestion | 社区候选键盘与许可信号不一致，Smart Textbox 引入 mentions / segment 模型 | 多数候选依赖 Motion、Lucide 或额外包；维护信号弱于官方编辑器 | 对纯文本责任过度设计 | **reject dependency / adapt suggestion anatomy**：AI 建议与正文分离 |
| [Tiptap Editor](https://tiptap.dev/docs/editor/getting-started/overview) / [Accessibility](https://tiptap.dev/docs/guides/accessibility) | ProseMirror 基础、MIT 开源、官方持续维护，支持 JSON / HTML 与扩展 | 官方给出 textbox / toolbar 角色、键盘与避免焦点陷阱指南 | 需要新增 Tiptap / ProseMirror 包；评论与版本历史部分为付费能力 | 当前只保存短篇纯文本，Schema 与工具栏成本过高 | **benchmark / reject dependency**：未来需要富文本评论或协同编辑时再采用 |
| [shadcn Textarea](https://ui.shadcn.com/docs/components/base/textarea) | 官方提供 Field、Description、Invalid 和按钮组合 | 原生 textarea 键盘与读屏行为直接，错误状态明确 | 项目已有共享 Textarea，无新增依赖；成熟官方实现 | 可完全沿用 AgentDoor Token | **adopt**：单一纯文本责任正文与显式保存 |
| [21st Interactive List](https://21st.dev/community/components/ravikatiyar/interactive-list/default) / [Animated To-Do List](https://21st.dev/community/components/uniquesonu/animated-to-do-list/default) | 公开社区实现，覆盖受控列表、添加与删除 | 删除动作明确且列表响应式；动画不是本需求必要条件 | 均依赖 Framer Motion，部分还依赖 react-icons；社区维护与许可信号弱 | 卡片、搜索和动画会放大责任编辑 | **adapt anatomy / reject code**：借用逐项操作结构，不引入依赖或动效 |
| [21st Member Selector](https://21st.dev/community/components/osiris-balonga/member-selector/default) | 2026-01-18 发布；既有研究记录约 369–432 使用信号 | 头像、姓名与次级身份层次清楚，但原组件偏选择交互 | 依赖 Lucide / Framer Motion；页面许可链不完整，不复制源码 | 可直接映射到共享 PersonAvatar 与 Token | **adapt identity row**：成员页只借用双行身份结构 |
| [shadcn Table](https://ui.shadcn.com/docs/components/base/table) | 官方持续维护；Simple 示例直接覆盖 Name / Email / Role | 原生 table 语义明确，复杂筛选需额外 Data Table | MIT；项目未安装 Table，本轮不新增依赖 | 桌面列对齐合适，但移动需重新堆叠 | **adapt columns / reject dependency**：使用 `ul/li` 实现同等只读信息层次 |
| [shadcn React Hook Form Array Fields](https://ui.shadcn.com/docs/forms/react-hook-form) / [Input Group](https://ui.shadcn.com/docs/components/aria/input-group) | 官方文档明确给出 `useFieldArray` 的 append / remove、稳定 key 与 InputGroupButton | FieldSet / Legend、每项 label 和删除按钮契约完整 | React Hook Form 会新增依赖；项目已有受控状态和共享控件 | 行式输入与 AgentDoor 最接近 | **adopt behavior / reject dependency**：使用受控数组、fieldset、逐项 label 与增删焦点，复用现有控件 |
| [React Spectrum TextField](https://react-spectrum.adobe.com/v3/TextField.html) | Adobe 官方维护，完整描述 label、description、error 与 `aria-label` 契约 | 每个字段必须拥有可访问名称，键盘行为成熟 | 引入 React Spectrum 会并行设计系统；Apache-2.0 | 只作为无障碍基准 | **benchmark / reject dependency**：每条责任提供序号化可访问名称 |
| [21st Team Invite](https://21st.dev/%40preetsuthar17/components/team-invite) | 2025-08-21 发布；直接覆盖邮箱邀请与角色选择 | 交互路径短，但社区页面不能替代生产权限与发送契约 | 依赖 Motion / Lucide；未复制源码 | 结构与参考图接近，动效不需要 | **adapt anatomy / reject dependency**：复用邮箱、角色、提交三段式结构 |
| [21st Team Access Card](https://21st.dev/%40ruixen.ui/components/team-access-card) | 2025-10-09 发布；覆盖邀请、角色和删除 | 提供成员管理全链路参考，但卡片 / Drawer 结构不符合大型设置 Dialog | 依赖 shadcn / Framer Motion；社区维护信号弱于官方 primitive | 改造成 AgentDoor 设置页的成本可控 | **adapt workflow / reject code**：采用动作集合，拒绝卡片与动效视觉 |
| [21st Invite Member Modal](https://21st.dev/community/components/sshahaider/invite-member-modal) | 公开候选；邮箱 + 角色与本需求直接对应 | Dialog 内字段、取消和提交顺序清楚 | Lucide；页面许可链不足，不复制源码 | 可映射到现有 Dialog / Input / Select | **adapt composition** |
| [shadcn Alert Dialog](https://ui.shadcn.com/docs/components/alert-dialog) / [Data Table](https://ui.shadcn.com/docs/components/aria/data-table) | 官方持续维护；分别覆盖不可逆确认和成员列式管理 | Alert Dialog 有明确取消 / 确认焦点契约；Data Table 提供列式基准 | 项目已有 AlertDialog / Select / Button；无需安装 TanStack Table | 与现有 Token 和参考结构一致 | **adopt existing primitives / benchmark table anatomy** |

## 最终选择

- 采用的行为基础：Base UI Select；现有 Base UI Dialog / Button / Input。模块导航使用原生按钮与 `aria-current`，不引入新的 Tabs 依赖。
- 采用的视觉结构：改造 21st Settings 的“左侧类别 / 右侧详情”大型设置壳层和主题分区；头像菜单继续复用现有 AgentDoor 入口。
- 历史基础（已被 r13 收敛）：头像菜单曾使用“个人资料”入口并打开“个人中心” Dialog；r13 已统一改为“设置”，同时把责任模块归入下方“团队信息”。连续责任正文、AI 建议、具体依据 disclosure 与本机能力边界继续复用；所有尺寸使用 `--ad-*`。
- 头像一致性修订：个人入口和责任页直接复用任务成员区的 `PersonAvatar` 图片 / fallback 结构，不再提供页面级“仅首字”分支；任务成员选择态由按钮、Checkbox 和操作文案表达，移除覆盖在头像右下角的对勾。
- 头像隐私与无障碍：DiceBear 请求只使用本地计算得到的匿名种子，不发送姓名；头像本身标为装饰，姓名由相邻文本或父控件的可访问名称表达，避免读屏重复播报。远程头像仍有第三方可用性风险，加载失败使用本地首字 fallback；生产接入真实成员头像前需复核组织的数据出站策略。
- 来源注释或许可动作：Select / Dialog 沿用现有 Base UI / shadcn 来源记录；不复制 21st 源码，不新增许可文件和依赖。
- 为什么不需要自研 / 为什么必须自研：Select、Dialog 行为复用成熟 primitive；横向分组采用 CSS Grid 和现有 Claim 组合，无需新增 Card 或 Grid 依赖。“拟写入文本、具体证据与人工确认”是 AgentDoor 领域语义，继续由产品组件表达。r1 曾创建的未引用 Tabs 已移除。
- r7 呈现选择：责任正文采用现有共享 Textarea 的“阅读 / 编辑”双态，页面以连续文本和安静元信息呈现；AI 观察改为分隔线列表，不使用逐条卡片。拒绝引入 Tiptap 与 21st 编辑器代码，因为当前存储语义只是纯文本，没有格式化、嵌套节点、评论或实时协同需求。
- 历史 r8 交互选择（已被 r10 替代）：曾考虑把 AI 建议带入未保存 Textarea 草稿。
- 历史 r9 采纳选择（已被 r10 替代）：曾考虑“采纳并编辑 → 草稿中 → 保存后生效”的中间状态。
- r10 采纳选择：r9 的中间草稿反馈被产品负责人明确替代。右侧每条只显示建议写入内容、依据与“忽略 / 采纳”；采纳同一次持久化更新正文和 Claim accepted，忽略只更新 Claim hidden。active 队列不显示已处理建议，历史和证据仍留在 Store；左侧手动编辑打开时禁用采纳以避免覆盖。
- r12 编辑选择：保持 `ResponsibilityDocument.content` 为纯文本兼容层，进入编辑时投影为受控条目数组，保存时以空行序列化。每条使用共享 `Textarea responsibility` 变体和删除按钮，底部统一新增；不采用卡片、拖拽排序或富文本。共享 Input / Textarea 移除叠加 ring 与 outline，焦点只保留一层 route 边框。
- r13 设置结构：头像菜单的“个人资料”改为“设置”，大型 Dialog 标题同步改为“设置”。左侧导航按“个人设置 / 团队设置”分组，只保留“个人信息 / 团队信息”两个入口；团队信息页先展示当前 Team Logo、名称、本人身份与责任条目数，再承接既有责任说明和 AI 建议。头像展开态不再添加蓝色装饰外框，键盘焦点仍保留中性可见轮廓。
- r15 设置结构：身份区只保留头像与姓名，移除姓名下方职位。团队设置拆为“团队信息 / 成员 / 我的责任”：团队信息只展示 Team 基础资料；成员使用现有协作者 Mock 的只读姓名、邮箱与工作身份列表；我的责任完整承接既有责任正文、编辑、AI 建议、证据与未保存保护。移动端四个入口使用可横向滚动的同一导航序列。
- r16 参考图结构：团队信息页标题使用“通用”，依次呈现当前 Team 选择、团队标志、团队名称与显式保存动作；名称写回现有 Team 记录，不新增 Schema。成员页使用稳定的“用户 / 团队 / 工作身份”列，身份列继续复用 PersonAvatar，团队列继续复用 TeamLogo；只读边界不因视觉对齐参考图而扩大。
- r17 功能结构：团队上下文继续由应用级 TeamSwitcher 统一控制，设置页不再重复 Team Select。团队信息补齐“离开团队 / 删除团队”并统一使用 AlertDialog；成员列改为“用户 / 团队 / 角色”，补齐邀请链接复制与重新生成、邮箱邀请、角色变更和最后一名管理员保护。邀请表单复用现有 Popover，避免在大型设置 Dialog 内再叠一层 Dialog；其余操作复用 AlertDialog、Input、Button、Select、PersonAvatar、TeamLogo 与 `--ad-*` Token。没有引入 Motion、TanStack Table 或新依赖。
- r18 密度精修：当前 Team 已由应用级切换器和设置上下文明确，因此成员表中的 Team Logo 属于重复信息。删除该列，保留“用户 / 角色”两列；角色表头与 Select 统一使用 `--ad-select-compact-min` 宽度。团队名称 Input 显式使用 `--ad-text-body-sm` 和正常字重，避免继承标签的 600 字重。
- r19 AI 建议入口：D-182 的纯更新图标已由 D-184 局部替代。已有责任的更新提议仍默认收起，但行尾入口改为项目共享浅蓝 AI Button，使用 Sparkles 与可见“AI 建议”；查看／收起访问名、`aria-expanded` 和 `aria-controls` 保留 disclosure 语义。按钮不生成、不写入，只有展开内容中的“更新”执行原有人工确认。
- r20 导航与宽度：D-185 将“我的责任”移入个人设置并紧跟“个人信息”，团队设置只保留“团队信息 / 成员”。责任数据仍绑定 Team；标题区右侧使用共享 Select 切换既有 `activeTeamId`，并复用未保存草稿确认。责任正文和候选行取消 `--ad-reading-max` 限制，使用内容区可用宽度；Select 不形成右侧面板或第二栏，窄屏工具栏换行且不产生横向滚动。

## 验证

- 已运行 `npm run verify`：设计基线检查、TypeScript 与 Vite 生产构建通过，未抬高设计债务；保留既有 Vite `__dirname` 与大 chunk 警告。
- 已检查 1440×1000 个人信息模块、1440×1000 责任模块和 500×900 移动 Dialog：模块导航、团队选择、Claim 证据与移动堆叠正常。
- r4 入口检查：桌面菜单只含“个人资料 / 我的责任 / 标签管理 / 退出登录”，没有个人信息卡；打开菜单首焦点为“个人资料”，点击后菜单关闭、Dialog 默认进入个人信息；移动四个菜单项均为 44px 触控高度。
- 历史 r5 布局检查（已被 r11 收窄）：曾把 Coverage 与缺失来源收进 AI 组 disclosure；r11 已移除该汇总入口，每条建议的具体依据 disclosure 继续保留。
- r6 入口检查：头像菜单移除“我的责任”重复快捷入口，只保留“个人资料 / 标签管理 / 退出登录”；“个人资料”仍默认打开个人信息，责任继续由 Dialog 左侧模块进入。
- 键盘 / 焦点：Select、Dialog 继续使用 Base UI 契约；头像选项采用普通 disclosure 与原生按钮 Tab 顺序，打开菜单聚焦首项；Dialog 打开聚焦姓名输入，桌面关闭回头像触发器、移动关闭回“打开导航”；reduced-motion 关闭本页非必要过渡。
- 空 / 错误 / 恢复：第二团队覆盖无 AI 观察空状态；临时编译 fixture adapter 后验证完整数据通过、残缺 Team、非法 history、缺少原始表达均拒绝并回退；模拟 quota 错误时保存返回失败且 UI 不提交内存状态。
- 与相邻页面比较：对照 WorkspaceList、TagManagementPage、AiConnectionPage；复用同一页面宽度、标题标尺、Button / Select / Dialog，不引入独立卡片或控件语言。
- r13 已验证：桌面与 390 × 844 移动视口均完成设置入口、个人 / 团队分组与团队摘要检查；头像展开态计算样式无蓝色阴影，键盘焦点轮廓仍可见；编辑责任后切换个人信息会出现“放弃未保存的责任修改？”确认。`npm run verify` 通过。
- r15 已验证：桌面设置导航显示个人信息、团队信息、成员与我的责任，身份区无职位副文案；成员页渲染 8 条可访问列表项；390 × 844 下四入口可横向滚动并自动露出当前项；编辑责任后切换成员仍出现放弃确认。
- r16 已验证：桌面团队信息页按“团队标志 / 团队名称”纵向排布，成员页按三列对齐 8 名成员；团队名称完成改名、保存并恢复原值的实际链路检查；390 × 844 下成员字段堆叠且无横向表格滚动，团队信息保存动作变为全宽。
- r17 已验证：邀请链接复制和重新生成、非法邮箱、重复邮箱、成功邀请、成员 / 管理员角色往返、最后一名管理员保护、刷新持久化均通过；在隔离 Origin 中实际完成离开团队与删除团队并自动切换到剩余 Team。邀请 Popover 的 Escape 关闭与触发器焦点回归已纳入复核。当前浏览器的临时视口覆盖未生效，移动端本轮只完成响应式规则静态复核，未把桌面截图冒充移动验收。
- r18 已验证：桌面成员表只显示用户和角色，角色表头左边界与每行 Select 一致；团队名称字体降为标准正文且不再加粗。构建与设计基线检查通过后交付。
- r19 已验证：隔离的本地页面中，责任行尾按钮显示 Sparkles 与可见“AI 建议”，使用共享浅蓝 AI 变体；展开后可访问名切换为“收起 AI 建议”，只出现原有更新内容与“更新”动作，收起后不产生责任写入，控制台无错误。
