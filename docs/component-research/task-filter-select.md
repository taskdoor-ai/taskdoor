# 任务筛选 Select research

## 需求

- 用户任务：状态、负责人和标签筛选全部使用用户指定的 21st.dev shadcn Select，并保持同一外观与交互。
- 交互关键词：select trigger、filter dropdown、grouped options、keyboard typeahead、clearable all option。
- 技术约束：React + TypeScript；复用 `src/components/ui/select.tsx`、现有 `@base-ui/react` 和 Lucide；不安装新依赖；尺寸必须转换为 TaskDoor Token。
- 必须覆盖的状态：默认值、已选择、展开、键盘焦点、长标签、组合筛选、移动端换行和深色模式。

## 搜索过程

- 21st.dev：核对用户指定的 [shadcn Select](https://21st.dev/@shadcn/components/select) Preview、Usage 与 Component 结构；页面公开了 Trigger / Value / Content / Group / Label / Item 组合，示例 Trigger 宽度为 180px。
- 官方组件库：核对 [shadcn/ui Base Select](https://ui.shadcn.com/docs/components/base/select)；确认项目当前使用的 Base UI 变体、可访问名称和分组选项结构。
- GitHub / 行为基础：核对 [shadcn-ui/ui](https://github.com/shadcn-ui/ui) 与 [Base UI Select](https://base-ui.com/react/components/select)；确认 MIT 许可、持续维护及键盘 typeahead、焦点与弹层定位要求。

## 候选

| 候选 | 来源与采用信号 | 行为 / 无障碍 | 依赖 / 许可 / 维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [21st.dev · shadcn Select](https://21st.dev/@shadcn/components/select) | 用户明确指定；公开 Preview 与完整组合示例；发布于 2024-10-09 | Trigger + listbox；分组、滚动与选中反馈完整 | 页面版本依赖 Radix Select 与 Lucide；shadcn 来源为 MIT | 结构与项目共享 Select 一致，只需恢复 Trigger 外观 | **adopt anatomy** |
| [shadcn/ui Base Select](https://ui.shadcn.com/docs/components/base/select) | shadcn 官方当前 Base UI 版本；文档持续维护 | 提供可访问名称、键盘选择、分组、滚动、无效态和 RTL | MIT；项目已经安装 `@base-ui/react` 与 `shadcn` | 无新增依赖，直接复用现有共享组件 | **adopt implementation base** |
| [Base UI Select](https://base-ui.com/react/components/select) | 当前共享组件的底层官方 Primitive | 官方要求 Trigger 有可访问名称；支持 typeahead、定位和受控值 | MIT；项目已使用 `@base-ui/react` 1.7 | 只负责行为，不能直接作为最终视觉 | **adopt behavior** |

## 最终选择

- 采用的行为基础：保留现有 `src/components/ui/select.tsx` 的 Base UI Root、Trigger、Value、Popup、Group、Item 与键盘行为。
- 采用的视觉结构：恢复 21st.dev / shadcn 的有边框白色 Trigger、标准控件高度、圆角、Chevron、阴影和 focus ring；三个筛选都通过同一个 `WorkspaceFilterSelect` 组合。筛选弹层关闭 `alignItemWithTrigger`，统一从 Trigger 下方留出标准间距展开，避免选中项对齐模式覆盖触发器形成双层边框。
- TaskDoor 适配：将示例的 180px 宽度转换为 `--ad-filter-select-width`；任务筛选使用共享 `sm` 规格的 `--ad-control-height-sm` 与 `--ad-text-caption`。中文默认值简化为“状态 / 负责人 / 标签”，重置项使用“不限…”；工具栏不重复展示任务总数，数量继续由结果区摘要表达。
- 来源注释或许可动作：共享 Select 已保留 shadcn 来源注释；未复制新增第三方源码、未安装依赖，MIT 许可无新增动作。
- 为什么不需要自研：现有共享 Select 已覆盖用户指定组件的结构和行为；此前外观异常来自 `.workspace-list-toolbar button` 的页面级覆盖，清理覆盖即可。

## 验证

- 桌面：检查三个 Trigger 等宽、展开菜单、选中值、组合筛选计数和目录计数。
- 移动：检查筛选自动换行、无水平溢出。
- 键盘 / 焦点：检查 Trigger 的可访问名称、Tab 焦点、Enter / Space 展开、方向键与选中反馈。
- 相邻页面：继续复用 `CollaborationBrief`、任务创建流程所用的同一共享 Select，不创建第二套下拉组件。
