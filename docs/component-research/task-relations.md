# Task 关联任务 research

## 需求

- 用户任务：在 Task 详情中用一个“关联任务”入口看懂并进入直属上级 / 下级 Task，同时不把 Folder 或 Todo 当成父子关系。
- 交互关键词：related tasks、parent child task list、grouped navigation rows、responsive task list。
- 技术约束：React + TypeScript；复用现有 `TaskIcon`、`TaskStatusBadge`、`PersonAvatar` 和 `--ad-*` Token；不安装新依赖；只读取 `parentTaskId`。
- 必须覆盖的状态：无关系、仅上级、仅下级、同时有上 / 下、长标题、移动端、键盘焦点与导航后焦点。

## 搜索过程

- TaskDoor foundation：核对 Task List 与 Task 详情的关联任务；现有任务身份、状态与人员组件已经覆盖字段呈现。
- 21st.dev：检查 [Task 分类及 Recommended / Most downloaded 排序](https://21st.dev/community/components/s/task) 和 [Ravi Katiyar Task List](https://21st.dev/community/components/ravikatiyar/task-list/default)；该 Featured 候选以可扫读表格呈现 Task，但依赖 Framer Motion。
- 官方组件库：检查 [shadcn/ui Item](https://ui.shadcn.com/docs/components/base/item) 的 `ItemGroup → ItemMedia / ItemContent / ItemActions` 组合、尺寸与链接焦点状态。
- 官方行为基础：检查 [React Aria GridList](https://react-aria.adobe.com/GridList) 的交互项、键盘导航、typeahead 与 row actions。
- GitHub / 成熟开源：检查 [Primer TreeView](https://primer.style/product/components/tree-view/) 及其[无障碍规范](https://primer.style/product/components/tree-view/accessibility/)；重点比较完整树行为是否适合本页的一跳父子导航。

## 候选

| 候选 | 来源与采用信号 | 行为 / 无障碍 | 依赖 / 许可 / 维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 21st.dev Ravi Task List | Featured Task 候选；任务名、分类、状态、周期具备扫描结构 | 原示例重点是 staggered motion，未说明完整键盘合同或 reduced-motion | 依赖 `framer-motion`；公开页许可不足以单独核验 | 需要移除动效、分类列和独立视觉 | **adapt anatomy**：只借鉴任务字段的单行扫描，不复制源码 |
| shadcn/ui Item | 官方维护；Item 明确支持 media、title、description、actions、分组、紧凑尺寸和 link 形态 | Link 形态提供 hover / focus 状态；最终仍需使用原生列表语义 | MIT；项目已有 React、Base UI、CVA 与同系基础，无需为本轮新增包 | 与“一个可点击任务行”的信息密度最接近 | **adopt anatomy**：用现有组件与 Token 改造，不运行 CLI、不复制第二套基础组件 |
| React Aria GridList | Adobe 维护的生产级交互集合 | 官方支持键盘导航、typeahead、单 / 多选和 row actions | Apache-2.0；引入 `react-aria-components` 需新依赖批准 | 行为强于本轮单一“打开任务”动作所需 | **benchmark**：采用可见焦点与整行操作原则，拒绝依赖 |
| Primer TreeView | GitHub 官方维护的完整层级组件 | tree / treeitem、roving tabindex、方向键、Home / End、typeahead、焦点转移与窄屏可读性规范完整 | MIT；直接采用会引入 Primer React 组件栈 | 本页已有 Folder 树，一跳父 / 子无需折叠树 | **reject**：树会重新混淆 Folder 与 Task 分解；只借鉴具名、焦点与触控原则 |
| TaskDoor 现有任务与关联对象行 | 已在 Task List 与 Task 详情使用 | 原生 Button、具名操作与现有焦点模式可直接组合 | 无新依赖；完全受现有 Token 治理 | 最低，且能保持同一 Task 身份外观 | **adopt** |

## 最终选择

- 采用的行为基础：语义 `section + ul/li + button`；每个关系行只有一个“打开 Task”动作，使用原生 Button，以 sr-only 动作 / 元数据标签和可见文本共同形成完整无障碍名称，并保留可见 `:focus-visible`；导航后把焦点送到新详情标题。
- 采用的视觉结构：借鉴现有 Task List 的安静列头与整行导航，用现有组件组成一个标准 Task 关系 List；入口复用既有 TaskDetail 页签模式并固定在“概览”之后。父、子放入同一 List，通过“类型”列逐行区分，并只保留任务名称、类型、状态、负责人四项，不做树缩进、分组卡片或额外元数据。
- TaskDoor 适配：复用 `TaskIcon` 还原同一 Task 图标与背景，复用 `TaskStatusBadge` 和 `PersonAvatar`；字号、间距、圆角、触控与颜色只用现有 `--ad-text-*`、`--ad-space-*`、`--ad-radius-*`、`--ad-control-*` 与语义色 Token。
- 来源注释或许可动作：未复制第三方源码、未安装依赖，因此无新增来源注释或许可动作。
- 为什么不需要完整外部实现：当前关系是少量、只读、单动作导航 List，且详情已具备稳定页签模式；引入动画 Task Table、GridList 状态机或第二套 Tabs 会制造额外依赖和交互语义。

## 验证

- 桌面、移动：检查四列表头与行对齐、长任务名称、状态和负责人；390px 隐藏横向表头并显示字段标签，页面无横向溢出。
- 键盘、焦点：每行 Tab 焦点可见，Enter / Space 导航，进入新 Task 后主标题获得焦点。
- 空状态：没有任何父子关系时整个 Section 不出现；仅有一个关系方向时每行类型仍准确。
- 相邻页面：列头与身份外观对照 Task List；“关联任务”保持同一 Task 身份语言；Section 层级对照概览与文件页。
