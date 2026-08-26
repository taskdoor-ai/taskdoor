# Tag management research

## 需求

- 用户任务：标签以名称、图标和底色形成统一组件；标签组采用一组一卡片，而不是左右主从或一标签一卡片。
- 交互关键词：tag, badge, settings card, combobox, dropdown, dialog, color picker。
- 技术约束：React、Tailwind v4、现有 Base UI/shadcn 基础、Lucide、Agentdoor Token；不引入第二套图标或无必要的新运行时依赖。
- 必须覆盖：创建、编辑、删除、重命名、空组、组内创建、键盘焦点和响应式。

## 搜索过程

- 21st.dev：Badge、Tags、Cards、Settings、Combobox，以及用户指定的 Status Badge。
- 官方/组件库：现有 shadcn Button/Dialog/Select/Dropdown Menu，Base UI 的组合与无障碍基础，Origin UI 的应用组件。
- GitHub：shadcn/ui、Origin UI、Motion Primitives；检查框架、许可、依赖和维护信息。
- 分级选择：Ant Design Cascader、`@rc-component/cascader`、Cascader Shadcn，以及 shadcn Dropdown Menu 的 Submenu 结构。

## 候选

| 候选 | 来源与采用信号 | 行为/无障碍 | 依赖/许可/维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| Status Badge | [21st.dev / arihantcodes](https://21st.dev/community/components/arihantcodes_1f7b8c4d/status-badge/default)，用户明确指定 | 图标 + 文本 + 语义底色，颜色不是唯一信息 | `lucide-react`；项目已有，无新增依赖 | 含义需从状态改为分类，颜色需 Token 化，小字号文字需比示例略深 | **adapt**：采用浅底色与鲜活同色文字的配色关系，不照搬状态语义和固定尺寸 |
| shadcn Badge + Dialog/Menu/Select | [shadcn/ui](https://github.com/shadcn-ui/ui)，成熟开源代码分发与组件基础 | Dialog、Menu、Select 处理焦点与键盘；共享 API 已在项目中 | MIT；项目已有，零新增依赖 | 视觉必须适配 Agentdoor，不直接使用默认页面组合 | **adopt/adapt**：行为直接复用，样式通过共享变体和 Token 调整 |
| Base UI Combobox | [Base UI](https://base-ui.com/) 与 [21st.dev Combobox](https://21st.dev/community/components/coss.com/combobox/default) | 支持 Combobox/Autocomplete、ARIA/WCAG 与复杂边界行为 | MIT；项目已有 Base UI；持续维护 | 适合任务中的标签搜索选择，不需要自建键盘逻辑 | **adopt later**：用于标签应用/搜索，不强行用于当前低数量管理卡片 |
| `@rc-component/cascader` | [React Component Cascader](https://github.com/react-component/cascader)，Ant Design 生态的独立分级选择基础 | 同一浮层中的逐级菜单、多选、键盘导航、自定义选项渲染 | MIT；持续发布；新增一个专门行为依赖 | 只需将默认样式映射为 Agentdoor Token，避免自行维护级联选择状态 | **adopt behavior**：任务标签选择采用 `Panel`，父级只导航，叶子标签多选 |
| Cascader Shadcn | [GitHub / Ademking](https://github.com/Ademking/cascader-shadcn) | shadcn 风格的两级菜单，支持点击或悬停展开和自定义标签 | MIT；实现较轻；当前以单路径选择为主 | 视觉骨架与现有系统接近，但不满足标签多选 | **reference anatomy**：参考紧凑浮层和列宽，不作为行为底座 |
| shadcn Dropdown Menu Submenu | [shadcn/ui Dropdown Menu](https://ui.shadcn.com/docs/components/radix/dropdown-menu) | 键盘与焦点完整，但子级通常进入另一浮层 | 项目已有，零新增依赖 | 更像动作菜单，不适合在一个面板内批量勾选标签 | **reject for tag selection**：保留给动作菜单，不把标签选择伪装成菜单命令 |
| Origin UI Dialog | [21st.dev / Origin UI Dialog](https://21st.dev/community/components/originui/dialog/default) 与 [Origin UI](https://github.com/shadcn/originui) | 延续 shadcn/Radix 的焦点管理和键盘路径，表单结构清楚 | MIT、Tailwind v4、React 兼容；项目已有底层依赖 | 默认视觉仍需去除多余分隔和通用模板感 | **adapt**：采用轻量标题、紧凑表单和明确 footer，不照搬默认边框 |
| Dotted Dialog | [21st.dev / Serafim](https://21st.dev/community/components/serafim/dotted-dialog) | 基于 shadcn/Radix，响应式且支持平滑进入 | 复用现有 Dialog 基础；点阵为视觉层而非必要依赖 | 点阵装饰与 Agentdoor 的简约工作界面冲突 | **reject decoration / adapt elevation**：仅参考低存在感悬浮层次 |
| Shadcn Badge / Label Badges | [21st.dev Badge collection](https://21st.dev/community/components/explore/shadcn-badge)、[Label Badges](https://21st.dev/community/components/ln-dev7/label-badges/default) | 图标 + 文本 + 柔和底色在紧凑空间内仍可识别 | 结构简单，无需新增运行时依赖 | 需统一图标、色板、圆角和交互态 | **adapt**：落入共享 `TagBadge`，不在页面内复制 chip |
| Card Studio / borderless cards | [21st.dev / Shadcn Studio](https://21st.dev/community/components/ShadcnStudio/card-studio/default) 与 [Card collection](https://21st.dev/community/components/s/card) | 卡片行为简单，主要价值在内容分层和动作组织 | 可在现有 Card 基础上适配；不增加依赖 | 营销卡片的渐变和装饰不适合企业任务管理 | **adapt hierarchy**：采用低边框、留白分层和安静 footer，拒绝装饰性渐变 |
| Color Picker collection | [21st.dev Color Picker collection](https://21st.dev/community/components/explore/react-color-picker)、[Color Palette](https://21st.dev/community/components/s/color-palette) | 原生 radio/pressed 语义可形成可键盘操作的色板 | 多数可无依赖实现；完整自由取色器会增加状态和校验 | 任意色会破坏跨主题可读性和企业色板一致性 | **adapt swatches / reject free picker**：只使用命名色样和明确选中标记 |
| Sortable / reorderable lists | [21st.dev Drag and Drop collection](https://21st.dev/community/components/s/drag-and-drop)、[React Aria ListBox](https://21st.dev/community/components/jollyshopland/list-box/drag-and-drop)、[ReUI Sortable](https://21st.dev/community/components/reui/sortable/default) | 成熟拖拽需同时覆盖键盘拾取、读屏播报、触摸滚动和放置反馈 | 完整方案需要 React Aria 或 DnD 依赖；当前项目未安装，且本轮不应引入半套拖拽基础 | 直接照搬看板式拖拽会让低数量标签编辑过重 | **adapt list / reject partial drag**：采用紧凑顺序列表、数字位置和可键盘操作的上移/下移；待有共享可访问拖拽基础后再升级指针拖动 |
| Motion Primitives | [GitHub](https://github.com/ibelick/motion-primitives)，约 6k stars、MIT | 提供可组合动画，需自行保证产品语义和 reduced-motion | Beta；引入 Motion 需评估依赖 | 标签管理不需要高存在感动效 | **reject for this surface**：使用现有 CSS 微交互即可 |

## 最终选择

- 行为基础：现有 shadcn/Base UI 的 Button、Dialog、Select、Dropdown Menu、Alert Dialog。
- 视觉结构：21st.dev Status Badge / Label Badges 的“图标 + 名称 + 柔和底色”结构；标签组使用 Agentdoor 自有的一组一卡片产品模式；编辑弹窗采用 Origin UI 的轻表单骨架和 Card Studio 的低边框分层。
- Agentdoor 适配：统一 `TagBadge` 和 `TagAppearancePicker`；颜色写入 `--ad-tag-{name}-{bg|ink|border}` Token；弹窗宽度、预览尺寸和选中阴影写入共享 pattern Token；字号、间距、圆角和控件高度沿用既有标尺；组级动作进入共享菜单；标签点击编辑；标签仅从所属标签组内创建，避免顶部重复入口。
- 标签选择：共享 `TagPicker` 使用 `@rc-component/cascader` 的 `Panel` 行为并置于现有 Popover 中。打开时先展示标签组，点击组后在同一浮层右侧展示标签；标签组只导航，叶子标签可多选。浮层不添加标题、说明、计数、底栏或“完成”按钮，标签身份继续由共享 `TagBadge` 表达。
- 色彩关系：参考 21st.dev Status Badge 的 Tailwind 50/100 色阶背景与高纯度同色文字；Agentdoor 将文字适度加深以适配小字号，并把边界降为近乎不可见。编辑器色样、实时预览与所有 `TagBadge` 读取同一组 Token。
- 来源注释：`TagBadge.tsx` 保留 21st.dev 来源注释；开源基础沿用现有依赖与许可。
- 自研边界：仅组合“标签组卡片”“标签外观工作台”和“标签组顺序编辑器”三个 Agentdoor 领域模式，不重写 Button、Dialog、Menu、Select、Cascader、Badge 的行为基础，不引入自由取色器、第二套图标库或不可访问的指针专用拖拽。

## 验证

- 已检查桌面双列与移动单列、创建/编辑入口、组位置与组内标签顺序调整、移除标签、删除确认、卡片空状态与共享按钮可读性。
- 与任务列表、任务详情标签和企业设置入口比较；同一标签继续由 `TagBadge` 渲染。
