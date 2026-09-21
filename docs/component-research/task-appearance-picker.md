# Task appearance picker research

## 需求

- 用户任务：在任务详情标题左侧直接编辑 Task 图标与图标背景色，并同步到任务列表。
- 交互关键词：icon picker、preset color picker、popover、single selection。
- 技术约束：复用现有 Base UI Popover、Lucide React 和 TaskDoor Token；不安装依赖，不开放任意 Hex 色值。
- 必须覆盖的状态：当前图标与颜色、键盘焦点、选中态、旧数据回退、桌面弹层、窄屏可触达。

## 搜索过程

- 21st.dev 查询与分类：查询 icon picker、color picker、popover，并查看 Popular 分类入口；可用结果以 Color Picker 与 Base Popover 为主，未发现同时满足“小规模图标集 + 规范预设色”的成熟单组件。
- 官方/组件库查询：检查 shadcn/ui Popover 与 Toggle Group 的单选模式，以及本项目现有 `src/components/ui/popover.tsx`。
- GitHub / 官方查询：检查 Lucide React 官方文档的独立导入、TypeScript 与无障碍能力。

## 候选

| 候选 | 来源与采用信号 | 行为/无障碍 | 依赖/许可/维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [21st Color Picker](https://21st.dev/@anubra266/components/color-picker) | 21st.dev 组件，2025-08 发布，包含 presets / inline / hue wheel 示例 | 完整颜色空间适合自由选色，但对 8 个规范色过重 | `lucide-react` + `@ark-ui/react`；21st 社区组件按平台说明为 MIT | 需要删除 hue、任意色与额外依赖 | reject |
| [21st Base Popover](https://21st.dev/@sean0205/components/base-popover) | 21st.dev / ReUI，2025-10 发布，明确基于 Base UI | 适合触发后承载富选择内容，门户与焦点行为成熟 | `@base-ui-components/react`；项目已有等价 `@base-ui/react` Popover | 直接复用现有 Popover，只适配内部内容 | adapt |
| [shadcn/ui Popover](https://v3.shadcn.com/docs/components/popover) + Toggle Group | 官方维护的通用组合模式；Toggle Group 提供单选、`aria-pressed` 与方向键语义 | 图标和色板属于少量单选项，组合模式清晰 | MIT；项目已有 Popover，但没有 Toggle Group，不能为本需求新增依赖 | 复用行为结构，以原生 radio group 保留同等语义 | adapt |
| [Lucide React](https://lucide.dev/guide/react) | 官方库，独立图标导入可 tree-shake，项目已使用 | 图标按钮提供 `aria-label`，装饰性预览隐藏于读屏 | ISC，持续维护，项目现有依赖 | 只需建立受控的有限图标映射 | adopt |

## 最终选择

- 采用的行为基础：现有 Base UI `Popover` 负责弹层、关闭与焦点。任务与标签共用 `AppearancePicker`，图标和底色采用带 `aria-pressed` 的单选按钮，保留 Tab、方向键、Home / End 导航，任务选择后自动保存。
- 2026-09-03 用户确认统一任务与标签的设置样式，替代此前无预览的矩阵布局：左侧实时预览，右侧图标矩阵与底色色板；图标选中项使用白底与轻阴影，颜色选中项使用勾选标记和对应色环。窄屏改为上下排列，弹层内容可滚动。任务保留 8 个图标与 8 个规范色，不改变已保存的图标和颜色值。
- TaskDoor 适配：尺寸、间距、圆角、边框、焦点与色调全部使用 `--ad-*` Token；色调只做对象识别，不承载状态。
- 来源注释或许可动作：没有复制外部组件源码；复用项目已有 Base UI Popover 与已有 Lucide 依赖，无新增许可文件。
- 为什么必须自研：外部 Color Picker 面向任意颜色空间，超出本产品的规范预设；本实现只组合现有基础组件形成一个 TaskDoor 共享 `TaskAppearancePicker` API。

## 验证

- 2026-09-03 在内置浏览器以桌面默认尺寸和 390×844 核对共享选择组件，验证方向键切换、图标与颜色选中态、刷新后保留设置及窄屏边界；旧数据继续回退到 `list-todo + neutral`。
- 与相邻页面和现有共享组件的比较：任务列表与任务详情统一复用 `TaskIcon`；弹层行为与 `TagPicker` 的现有 Popover 保持一致。
- 写入验证：实测把 `trade-backfill` 切换为 `sparkles + red` 后，当前详情立即更新，`agentdoor-workspace-nodes` 同步保存 `iconName`、`iconTone` 与更新时间。
