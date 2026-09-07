# 复杂任务创建与子任务编辑 research

## 2026-08-31 · 表单式创建落地

- 实际复用：`PersonPicker` / `MemberSelector`（[21st Member Selector](https://21st.dev/community/components/osiris-balonga/member-selector/default)，Base UI Combobox 行为）、`TaskDueDatePicker`（项目已有 21st Date Range Picker 单日期适配）、`Accordion`（21st 分发的 shadcn / Radix 实现）。不是用相似外观替代这些控件。
- 新检索：[Animated Tabs registry](https://21st.dev/r/skyleen77/animated-tabs) 提供 Motion 动画高亮，但不直接复制整套组件；现有场景是切换候选示例而非内容页签，采用原生 `aria-pressed` 按钮 + 项目已有 Motion 共享高亮。不声称安装了 Animated Tabs。
- [Texture Button](https://21st.dev/@cult-ui/components/texture-button) 用于比较按钮的层次感；未复制其源码或新增依赖。主动作继续用项目 Button，通过品牌蓝色的渐变与内阴影形成深度。
- 选择范围：真实复用 21st 适配控件，沿用旧创建页彩色 TaskIcon；不引入第二套成员、日历、弹层，也不恢复 AI Message / 固定分析轨迹。未新增 npm 依赖；页面没有远程运行时资源请求。
- 来源许可：本轮未新增外部源码副本，保留现有组件来源注释；Motion、Base UI、Radix 继续使用项目已有版本。

## 需求

- 用户任务：让快速测试同时覆盖单项任务与复杂拆分任务；复杂场景在创建确认前直接展示可编辑的父任务 + 子任务结构。子任务不是精简附属记录，而是只额外具有 `parentTaskId` 的 Task，需要独立确认结果、负责人、协作人员和所需资料。
- 交互关键词：editable task list、nested task、subtask editor、owner picker、member selector、source selector、accessible tabs。
- 技术约束：React + TypeScript；不安装依赖；复用共享 `Input`、`Textarea`、`Button`、`PersonPicker`、`MemberSelector`、`PersonAvatar`、`CheckboxIndicator` 与 AgentDoor Token。
- 必须覆盖的状态：单 Task、3 个真实独立子 Task、编辑与删除已有子 Task、本人负责、拟交给同事且待接受、0..n 协作人员、0..n 资料引用、父 / 子 Task 各自的 0..n 协作缺口、字段缺失、桌面 / 窄屏和键盘路径。

## 搜索过程

- 21st.dev 查询与分类：检索 editable list、task、nested list；复核 [Interactive List](https://21st.dev/community/components/ravikatiyar/interactive-list/default) 与已采用的 [Member Selector](https://21st.dev/community/components/osiris-balonga/member-selector/default)。没有发现同时具备任务父子语义、编辑字段和责任接受边界的可直接采用组件。
- 官方/组件库查询：检查 [Base UI Accordion](https://base-ui.com/react/components/accordion) 与 [shadcn/ui Accordion](https://ui.shadcn.com/docs/components/base/accordion) 的标题 / 内容组织和 WAI-ARIA 模式；同时复用项目已有 Base UI Combobox 人员选择行为。
- GitHub 查询：检查 [React Complex Tree](https://github.com/lukasbach/react-complex-tree) 的可访问 Tree、多选、重命名与键盘能力；核对其维护方向及对本轮单层任务拆分的适配成本。
- 2026-08-28 页签增量：再次检索 21st.dev 的 tabs / task switcher，未找到同时具备稳定维护信号、任务对象语义和可访问说明的候选；搜索结果不足，因此没有复制 21st.dev 页签实现。进一步比较项目已安装的 [Radix Tabs](https://www.radix-ui.com/primitives/docs/components/tabs) 与 [Base UI Tabs](https://base-ui.com/react/components/tabs)：两者均提供 WAI-ARIA、方向键和受控状态；Radix 已在 `AiConnectionPage` 使用，无新增依赖和第二套 primitive。

## 候选

| 候选 | 来源与采用信号 | 行为/无障碍 | 依赖/许可/维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 21st Interactive List + Member Selector | 公开社区组件；项目人员选择器已验证 Member Selector 的选中优先、搜索、多人勾选和移除结构 | 逐项编辑 / 删除结构直观；原始动画列表没有完整任务层级和责任语义 | 常依赖 Framer Motion；单页许可 / issue 信号弱，不复制源码 | 借鉴“连续列表 + 条目内动作”；负责人继续使用 `PersonPicker`，协作人员直接复用项目共享 `MemberSelector` | **adapt anatomy** |
| Base UI / shadcn Accordion | 官方组件；项目已有 Radix Accordion 与 Base UI 依赖 | 标题、Trigger、Panel 和键盘 / 焦点语义成熟 | MIT、持续维护；零新增依赖 | 单开手风琴会迫使任务互斥；本页只需要各项独立 Disclosure | **adapt disclosure semantics, reject accordion exclusivity** |
| React Complex Tree | 成熟 GitHub 项目，支持可访问 Tree、重命名、搜索与键盘 | 适合多层导航、拖拽和复杂选中；能力远超一个父 Task + 一层子 Task | 开源维护中，但会新增完整树状态和依赖面 | 需要大幅删除 DnD / 多选 / Tree 导航，且容易把创建页做成目录工具 | **reject** |
| Radix Tabs | 官方维护；项目已经安装并在相邻页面使用 | WAI-ARIA Tabs、左右方向键、Home / End、受控选中 | MIT、持续维护、无新增依赖 | 行为可靠，但会隐藏兄弟 Task 的完整配置，不符合本轮连续审阅 | **reject for this surface** |
| Base UI Tabs | 官方维护；无样式、可组合 | WAI-ARIA 与键盘行为完整，并提供 Indicator / Panel | MIT、持续维护；但本项目当前未使用该 Tabs primitive | 行为与 Radix 重复，会引入第二套页签基础 | **reject for consistency** |

## 最终选择

- 2026-08-28 纵向平铺增量：产品负责人否定父 / 子 Task 页签，要求全部任务直接连续审阅。重新比较后保留现有共享任务编辑组合，拒绝 Radix Tabs 与 Tree 作为当前页面结构；两者分别增加隐藏上下文或多余层级操作，不符合一层任务在创建前逐项核对的目标。
- 采用的行为基础：父 Task 与一层子 Task 按顺序纵向排列，每一项都编辑完整 Task，并提供互不排斥的独立展开 / 收起；创建确认页只审阅 Proposal 已有结构，删除使用对应项内的具名按钮，不维护当前选中状态，也不打开 Dialog。
- 采用的视觉结构：单 Task 直接使用标准表单，不绘制只有一个父项的列表规则、编号或“父任务”标签；只有初始 Proposal 已含子 Task 时才出现连续“任务”列表。单项与复杂创建都不显示父 / 子数量统计或“添加子任务”入口，复杂列表只编辑、展开、收起或删除 Proposal 已有子 Task。每个任务块以圆形浅绿数字序号、“父任务 / 子任务”和任务名称建立边界；序号使用既有 teal Tag palette、标准触控尺寸与 pill 圆角 Token，只表达顺序。表单按“任务信息 → 上级任务 → [文件] → 责任”呈现；文件只在当前 Task 有候选或已有选择时出现，“责任”区只保留具体缺口与处理候选，不显示负责人或其他协作人员编辑段。不用大面积蓝色卡片、横向滚动或嵌套侧栏，不新增 primitive、依赖或外部源码。
- AgentDoor 适配：任务信息复用共享 Input / Textarea，父任务和子任务使用同一个 `TaskSourceSelector` 密度与同一个 `TaskCollaborationEditor`；删除 `TaskPeopleEditor`，不以嵌入、折叠或隐藏形式保留。主 Task 人员在右侧摘要只读复用 `PersonAvatar`；创建者、Owner、Participant 和待接受状态继续保留在正式数据与创建投影中，但当前表单不提供重复的人员编辑入口。
- 来源注释或许可动作：未复制 21st 或树库源码；Base UI / shadcn 只作为行为比较。无需新增许可文件或依赖。
- 为什么必须做轻量组合：现有共享组件已经覆盖可靠输入、搜索和焦点行为；成熟 Tree 能力过重，Tabs 会隐藏兄弟 Task，互斥 Accordion 又阻碍任务间对照。本页采用语义列表加独立 Disclosure 状态，默认全部展开且允许按需收起，不需要新增依赖或第二套 primitive。
- 2026-08-28 实例修正：不新增视觉组件或外部依赖。父 / 子 Task 继续复用同一个 `TaskCollaborationEditor`，但每个 Task 块传入各自的缺口、候选人和选择状态；POS 示例收敛为“修复实现与自测 / 离线重放回归 / 门店灰度”三个独立结果，规则判断与最终整合回到父 Task。原四项中“单一规则判断、短评审、父任务最终整合”不再为了凑数被建成子 Task。
- 2026-08-28 右侧摘要增量：没有新增交互 primitive、依赖或第二套人员组件。负责人和主 Task 协作人员直接复用已采用的 21st.dev Member Selector 人员解剖与项目共享 `PersonAvatar`；卡片只做只读核对，因此拒绝在摘要中嵌入 `MemberSelector` / `PersonPicker` 的编辑行为，也不引入新的统计卡组件。视觉上采用“标题 → 人员名册 → 少量属性 → 创建动作”的连续结构，移除等权统计格；子 Task 人员保持在各自 Task 块，不做误导性的聚合。
- 2026-08-28 文件按需增量：这不是新页面、共享组件或交互 primitive，不重复引入外部候选。直接复用已有 `TaskInformationEditor` 在空候选时返回 `null` 的完整零占位行为，并把场景级分析来源与 Task 级 `fileCandidateIds` 分开；有候选或已选引用时仍使用同一 `TaskSourceSelector`。选择“扩展 Proposal 数据组合，不扩展视觉组件”，避免制造第二套空状态、上传入口或局部 CSS。日常一对一用于验证“分析有来源但创建无文件”，POS 用于验证父 / 子候选子集与新增无候选子 Task。
- 2026-08-28 责任同源与 Checkbox 前置增量：没有新增页面、共享控件或外部依赖。继续采用既有 21st Interactive List 的“连续条目 + 前置选择锚点”解剖、共享 `Checkbox`、`PersonPicker` 与整行 `button[aria-pressed]`；文件行只移动非交互 `CheckboxIndicator`，避免嵌套按钮，责任卡只移动唯一真实 Checkbox。数据上从既有创建记录派生 `active / pending-invitation（旧数据兼容） / pending-acceptance / unassigned` 责任投影，Task 详情消费同一来源，不另建第二份责任 Store。拒绝把外部候选直接写成 Participant 或已接受 Responsibility，也拒绝为本轮引入新表格、卡片或任务分配组件。
- 2026-08-29 对话双栏增量：对话只保留 21st AI Message、AI Agent Response 与紧凑确认卡，点击卡片后才展开右侧任务详情。子任务采用 21st.dev / shadcn Accordion 的 Radix 行为合同，并继续复用 21st Member Selector、PersonAvatar 与 Status Badge 解剖。宽屏默认保持对话全宽，详情可展开或关闭，1100px 以下降级为抽屉；界面不把子任务伪装成线性步骤，未声明依赖时列表顺序不代表先后关系。

## 验证

- 桌面、移动、键盘、焦点、空状态、错误状态：检查 1440px / 390px；Tab 按视觉顺序进入每个任务块的字段、文件选择、责任确认与删除动作，全程不打开 Dialog；创建表单中的负责人 / 其他协作人员编辑器必须为 0；子任务名 / 目标 / 责任 / 验收为空时禁用创建；列表头不出现追加入口，删除已有子 Task 不影响其他任务草稿。
- 与相邻页面和现有共享组件的比较：父任务与子任务共同使用 `TaskInformationEditor`、`TaskCollaborationEditor`；子任务写入继续复用 `TaskNode.parentTaskId`，任务详情继续用同一 Task 投影；创建表单不调用 `TaskPeopleEditor`、Owner `PersonPicker` 或 Participant `MemberSelector`，主 Task 人员只在右侧摘要复用 `PersonAvatar`；责任拟承担人继续使用共享 `PersonPicker`，文件选择共同使用一个无密度分叉的 `TaskSourceSelector`。
