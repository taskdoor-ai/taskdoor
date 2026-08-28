# Select component research

## 需求

- 全系统普通下拉统一采用用户指定的 shadcn Select 视觉样式。
- 选项使用纯文字，不在业务选项前添加图标或 Badge；保留展开箭头和选中对勾作为必要状态提示。
- 复用现有共享组件、Base UI 行为基础和 AgentDoor 控件 Token，不增加依赖。

## 候选

| 候选 | 来源与采用信号 | 行为与无障碍 | 依赖/维护 | 结论 |
| --- | --- | --- | --- | --- |
| shadcn Select | [21st.dev / shadcn Select](https://21st.dev/@shadcn/components/select) 与 [shadcn 官方文档](https://ui.shadcn.com/docs/components/base/select)；用户明确指定，成熟共享组件 | 标准 Trigger、Value、Group、Item、Label、选中指示和错误态 | 项目已经具备同类结构，无需新增依赖 | **adopt visual anatomy**：统一轻边框、表面背景、圆角、焦点环和纯文字选项 |
| Base UI Select | [Base UI 官方文档](https://base-ui.com/react/components/select)；项目现有行为基础 | 提供键盘、焦点、typeahead、定位、分组、滚动和无障碍命名能力 | 项目已安装；稳定维护 | **adopt behavior**：继续作为底层，不更换组件系统 |
| React Aria Select | [React Aria Components](https://react-spectrum.adobe.com/react-aria/components/Select.html) | 无障碍覆盖完整，适合复杂集合 | 会引入第二套选择控件基础和新依赖 | **reject**：当前没有 Base UI 无法解决的问题 |

## 最终选择

- 以 Base UI 负责行为，采用 shadcn Select 的视觉 anatomy，形成唯一共享 `Select` API。
- 删除任务列表和任务详情中的页面级透明、虚线、9px 字号覆盖；紧凑场景只允许设置共享最小宽度，不重绘组件。
- 普通 SelectItem 只渲染文本。标签被选中后仍由页面上的共享 `TagBadge` 展示，但下拉选项不重复图标、颜色和 Badge 容器。
- 三点操作菜单复用同一套轻量 popup、圆角、阴影和纯文字 option 语言；普通编辑、删除等动作不添加前置业务图标，不使用横线分隔，改由更充分的弹层内边距和选项间距组织层级；危险色已足够表达删除语义。
- 保留下拉 Chevron、选中 Check 和长列表滚动箭头，因为它们表达控件状态，不属于业务装饰图标。
- 详情页等直接触控场景使用共享 `size="touch"` 变体映射 `--ad-control-touch-min`，不允许页面 CSS 单独覆盖 Select 高度。

## 验证

- 检查任务列表状态筛选、扁平标签筛选、任务详情添加标签和标签编辑。
- 验证键盘打开、方向键移动、Enter 选择、Escape 关闭、选中对勾、分组标签和移动端弹层。
