# Task AI 洞察工作简报组件调研

> 命名更新（D-119）：产品前台现统一显示“AI 建议”；本调研记录保留形成时的原称，内部 Insight 模型不变。

- 日期：2026-08-28
- 范围：Task 详情概览中的 AI 洞察信息结构、动作与处理弹窗
- 需求关键词：continuous list、alert with actions、status alert、dialog、accessible disclosure

## 候选

| 候选 | 来源 | 信号 | 结论 |
| --- | --- | --- | --- |
| `lavikatiyar/list` | [21st.dev](https://21st.dev/@lavikatiyar/components/list) | List 分类约 349 个结果；该实现以连续分隔行呈现活动，依赖 Framer Motion | **改造**：复用“单容器连续行”的结构，不引入依赖与动画 |
| `serafimcloud/alert` | [21st.dev](https://21st.dev/community/components/serafimcloud/alert/alert-with-list) · registry `serafimcloud/alert` | Alert with list/actions；使用 CVA、Lucide | **改造**：复用状态标记、正文、补充信息与动作区的层级 |
| `coss.com/alert` | [21st.dev](https://21st.dev/community/components/coss.com/alert/warning) · registry `coss.com/alert` | warning / info / success / action 变体，2026-03 更新 | **改造**：参考语义色分工，全部转换为 TaskDoor Token |
| `rynkovski/notification-alert-dialog` | [21st.dev](https://21st.dev/community/components/extendui/notification-alert-dialog/default) · registry `rynkovski/notification-alert-dialog` | 完整 Alert Dialog，适合需要确认的动作 | **拒绝代码、保留模式**：已有共享 Dialog，不建立第二套弹窗 |
| Base UI Dialog | [官方文档](https://base-ui.com/react/components/dialog) | 维护中的官方实现；具备焦点管理、标题描述关联和键盘关闭 | **采用现有实现**：项目共享 Dialog 已基于 Base UI |
| Radix Collapsible | [官方文档](https://www.radix-ui.com/primitives/docs/components/collapsible) | 维护中的官方 Disclosure 原语 | **拒绝**：洞察行不藏关键事实，处理细节进入 Dialog，避免额外展开状态 |

候选数量满足 3 个以上，且同时覆盖 21st.dev 与维护中的官方组件实现。未复制外部 JSX/CSS，未安装依赖，不产生额外许可义务。

## 最终组合

采用 `lavikatiyar/list` 的连续列表骨架、`serafimcloud/alert` 的“状态—结论—事实—影响—动作”信息层级、`coss.com/alert` 的语义色思路，以及项目现有 Base UI Dialog 的处理模式。

洞察行统一回答五件事：发现了什么、依据是什么、影响什么、系统现在能做什么、做完后还剩什么。动作只绑定已存在的产品能力：跳转、更新现有对象、通过现有流程创建子 Task；不能处理的权限类洞察只提示信息，不伪造按钮。

## 多条洞察密度复核

2026-08-28 根据多条 Mock 洞察并列场景复核原方案。继续采用 `lavikatiyar/list` 的连续行，而不引入 Collapsible：类型、事实、影响和边界都是决定是否处理所需的信息，不应默认隐藏。视觉上将“影响 / 边界”并入主内容的紧凑双列说明，动作区只保留已有功能入口；桌面端使用短行、轻分隔，移动端再转单列。该调整不改变上述组件采用结论，也不新增依赖。

同日根据真实多条截图再次减负：继续采用连续 List，但将每行固定成“信息 / 操作”两区。信息区只保留结论、关注原因和一条证据；操作区以分隔线承载动作及一句能力边界。此调整替代上一段“影响 / 边界双列说明”的视觉实现，仍不采用折叠、不新增组件或依赖。

## 信息提示消除复核

2026-08-28 补充检查“仅作提示”项的退出机制。继续使用 `serafimcloud/alert` 的次级动作语法与项目共享 Button，不引入新的 Toast、Alert 或依赖：信息型行在右侧用 Ghost Button 提供“忽略此提示”，反馈使用页面内的轻量 `role=status` 浮层，并保留“撤销”和标题区“恢复已忽略”。忽略只改变稳定成员标识对应的个人列表投影；证据、能力边界或可用动作签名变化后重新出现。可行动行始终显示，不允许旧隐藏记录把视图 disposition 误读为业务闭环。

同日按 D-122 进一步收敛前台文案：右栏保留分隔结构但移除逐行重复的“可用操作”；信息型权限缺口以“提示”状态和“已知晓”表达，不再重复“仅作提示”或当前无申请能力说明。“已知晓”继续复用上述个人隐藏、撤销与重新显示机制，不改变组件采用、依赖或正式对象边界。D-124 随后把它改为共享实心 Button，避免 Ghost 外观看起来像普通文字；没有新增变体或依赖。

D-125 为该实心 Button 增加现有 Lucide Check 前置图标，并保留文字标签；继续复用 Button 的标准 icon slot、尺寸与间距，不新增图标资产或局部样式。

D-129 将 Check 调整到“已知晓”文案之后；继续使用共享 Button 的 `inline-end` 图标槽，不新增图标资产、依赖或局部间距样式。

随后按 D-123 收敛零结果：当前 Task 没有任何建议时不渲染 List 容器或空卡，后续概览内容自然上移；只有“建议仍存在但已全部知晓”时保留一行紧凑恢复入口。该调整继续使用条件渲染与现有 Button，不新增 Empty State 组件或依赖。
