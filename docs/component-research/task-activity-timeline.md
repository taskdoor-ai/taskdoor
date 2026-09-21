# 任务活动时间线 research

> 当前适用范围（2026-08-31，D-142）：旧的“讨论与变更统一时间线”已被替代。下文保留为历史研究，不再作为把人的消息混入活动的依据。本次沿用原生 `ol/li`、稳定来源 ID 与既有 Token；讨论独立承载输入、线程和引用，活动改为紧凑、只读的变更时间线。真实时间戳记录与缺少采集时间的旧展示记录分开，不编造旧值或旧日期；没有引入第三方依赖或进行新一轮网络调研。

## 需求

- 用户任务：把 Task 的动态、AI 洞察与提交记录合并为一条可筛选、可追溯的活动时间线。
- 交互关键词：activity feed、event timeline、commit event、AI insight、type filter、source link。
- 技术约束：React + TypeScript；复用当前 `PersonAvatar`、`MentionComposer`、共享 Select 和文件跳转；不安装依赖；不合并 Activity、Insight、Commit、ChangeSet 的领域对象。
- 必须覆盖的状态：全部事件、按类型筛选、无活动、筛选无结果、成员回复、AI 入口、Commit 文件存在 / 不可达、桌面、移动和键盘焦点。

## 搜索过程

- 21st.dev：查询 [Timeline Components](https://21st.dev/community/components/explore/timeline-component) 的 Popular 与相关结果，并检查 [Modern Timeline](https://21st.dev/%40chowlol202/components/modern-timeline)；重点比较纵向轨道、事件类型和移动布局。
- 官方组件库：检查 [MUI Timeline](https://mui.com/material-ui/react-timeline/) 的顺序事件、连接线、左右布局与 API。
- GitHub / 设计系统：检查 [Primer React](https://github.com/primer/react) Timeline；其近期 release 已增加可选 `ol/li` 列表语义，适合验证读屏顺序。

## 候选

| 候选 | 来源与采用信号 | 行为 / 无障碍 | 依赖 / 许可 / 维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 21st.dev Modern Timeline | 21st.dev 时间线集合有 60 个结果、15 个精确匹配；该候选声明响应式、可访问与可主题化 | 有纵向连接线和响应式结构，但偏 Roadmap，需重新建立事件与来源语义 | 常见依赖为 Tailwind、shadcn 与 Motion；页面未提供足够许可 / 维护信号 | 动效和大节点偏营销，直接采用会压过任务内容 | **adapt anatomy**：只借鉴连续纵向脉络 |
| MUI Timeline | MUI 官方 Lab 组件，提供顺序、连接线、对齐和自定义 API | 顺序事件模型清楚；默认结构仍需应用补充业务标签与列表语义 | MUI Lab 依赖与当前 Base UI / shadcn 栈重复；MIT、持续维护 | 会引入第二套主题和组件尺度 | **reject dependency；adapt event anatomy** |
| Primer React Timeline | GitHub Primer 官方 React 实现，仓库约 3.9k stars；近期 release 专门增加 `ol/li` 列表语义开关 | 明确支持读屏列表数量和位置导航，适合不可变事件流 | MIT、持续发布；引入 Primer 会形成第二设计系统 | GitHub 风格接近 Commit，但不能覆盖 TaskDoor 的协作语义 | **adapt semantics**：采用 `ol/li` 与可定位事件 |

## 最终选择

- 采用的行为基础：原生 `ol/li` 语义列表、稳定事件 ID、共享 Select 类型筛选；不引入新依赖。
- 采用的视觉结构：单列纵向事件脉络；人类作者统一复用 `PersonAvatar`，AI 使用专属图形，Commit 由“代码提交”动作标签识别，类型始终保留明确文字。
- TaskDoor 适配：每条活动只显示具体动作，不增加事件分组或来源分类；动作标签使用稳定的 TaskDoor Tag Token 色辅助扫读，同时保留文字。成员主动发布的顶层内容标为“动态”，回复单独标为“回复”，并保留连接个人 AI；AI 洞察使用 Sparkles 图标、文字与推断语义色三重标识，代码提交保留消息、作者、时间与文件明细。间距、字号、圆角、控件高度全部使用现有 `--ad-*` Token。
- 来源注释或许可动作：未复制第三方源码、未安装依赖；文档保留候选链接和结构来源。
- 为什么不需要自研 / 为什么必须自研：时间线行为本身使用原生列表即可；Activity、Insight、Commit 的引用关系与回复动作是 TaskDoor 特定领域组合，外部 Roadmap / Git 组件不能直接表达。

## 验证

- 桌面、移动、键盘、焦点、空状态、错误状态：运行 `npm run verify`；分别检查完整活动、各类型筛选、筛选空态、文件跳转、回复输入和移动堆叠。当前静态 Mock 没有加载与错误请求，N/A。
- 与相邻页面和现有共享组件的比较：筛选复用任务列表的共享 Select 密度；来源按钮延续文件页的焦点、颜色与跳转；事件排版保持任务概览的安静简报密度。
