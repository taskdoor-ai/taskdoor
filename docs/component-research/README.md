# Component Research Records

UI 设计任务必须先完成组件发现，再进入实现。本目录保存选择证据，避免每次从零搜索，也避免用户替团队寻找成熟组件。

## 优先来源

| 层级 | 来源 | 主要用途 | 选择信号 |
| --- | --- | --- | --- |
| 社区发现 | [21st.dev](https://21st.dev/community/components?tab=home) | 快速发现有视觉完成度的 React 组件、布局和交互 | Popular/使用量、源码、依赖、作者、同类候选 |
| 本项目基础 | `src/components/ui`、shadcn/ui | Button、Dialog、Menu、Select、Table 等共享组件 | 已接入、主题一致、复用成本最低 |
| 无障碍行为 | [Base UI](https://base-ui.com/)、[React Aria](https://react-spectrum.adobe.com/react-aria/)、[Radix UI](https://www.radix-ui.com/) | Combobox、Dialog、Popover、焦点和键盘行为 | ARIA/WCAG、边界状态、维护团队 |
| 应用组件 | [Origin UI](https://originui.com/)、[Tremor](https://www.tremor.so/) | 设置、筛选、表格、分页、数据与企业应用布局 | 框架兼容、可复制、许可、维护状态 |
| 动效组件 | [Motion Primitives](https://motion-primitives.com/) | 有明确交互价值的过渡、反馈和状态变化 | reduced-motion、依赖、性能、使用范围 |
| 仓库检索 | [GitHub](https://github.com/) | 查找原始仓库、维护状态、Issues、许可和实现细节 | Stars/使用量仅作信号；更看重维护、许可和适配性 |

21st.dev 是默认的外部发现入口，不是唯一来源。复杂交互优先保证可靠行为，再选择视觉实现；营销型特效不能直接进入企业产品界面。

## 文件模板

每个新页面、重大重设计或新共享组件创建 `<feature>.md`：

```md
# <功能 / 组件> research

## 需求
- 用户任务：
- 交互关键词：
- 技术约束：
- 必须覆盖的状态：

## 搜索过程
- 21st.dev 查询与分类：
- 官方/组件库查询：
- GitHub 查询：

## 候选
| 候选 | 来源与采用信号 | 行为/无障碍 | 依赖/许可/维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| ... | ... | ... | ... | ... | adopt / adapt / reject |

## 最终选择
- 采用的行为基础：
- 采用的视觉结构：
- Agentdoor 适配：
- 来源注释或许可动作：
- 为什么不需要自研 / 为什么必须自研：

## 验证
- 桌面、移动、键盘、焦点、空状态、错误状态：
- 与相邻页面和现有共享组件的比较：
```

## 使用规则

- 至少比较 3 个严肃候选；不足时写明原因。
- 通常至少包含 1 个 21st.dev 候选和 1 个维护中的官方/GitHub 实现。
- 不因“看起来好看”直接采用；同时检查语义、键盘、焦点、响应式、依赖和许可。
- 不因“可以手写”跳过搜索。自研必须由候选不适配的证据支持。
- 采用后只能形成一个 Agentdoor 共享组件 API，并使用 `--ad-text-*`、`--ad-space-*`、`--ad-radius-*`、`--ad-control-*` 等现有 Token；来源组件的字号、间距和尺寸值不能原样保留。
