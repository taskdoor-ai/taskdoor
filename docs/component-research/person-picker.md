# 人员选择器 research

## 需求

- 用户任务：统一人员下拉的头像、姓名、角色、间距、选中态与焦点态；支持按姓名、职责和邮箱搜索；形成共享组件供任务创建、Task Owner 等入口复用。
- 交互关键词：searchable people picker、combobox、single member select、avatar option、self option。
- 技术约束：React + TypeScript；继续使用项目已安装的 `@base-ui/react`、`lucide-react` 与 `PersonAvatar`；不安装新依赖；所有尺寸转换为 TaskDoor Token。
- 必须覆盖的状态：默认、打开、搜索、无结果、当前选中、键盘高亮、禁用、移动端触控，以及“我自己处理”的语义化选项。

## 搜索过程

- 21st.dev 查询与分类：检索 `member selector`、`combobox`、`select` 与 Dropdown / Popular；重点复查已被项目头像和成员选择借鉴的 [Member Selector](https://21st.dev/community/components/osiris-balonga/member-selector/default)。21st 的 Select / Combobox 分类在抓取时给该组件约 369–432 的使用信号。
- 官方/组件库查询：检查 [Base UI Combobox](https://base-ui.com/react/components/combobox) 的 input-inside-popup、对象值、单选/多选与键盘行为；检查 [shadcn/ui Combobox](https://ui.shadcn.com/docs/components/radix/combobox) 的 popup、custom item 和 multiple 组合。
- GitHub 查询：核对 [mui/base-ui](https://github.com/mui/base-ui) 与 [shadcn-ui/ui](https://github.com/shadcn-ui/ui) 的维护和许可；项目当前已安装 `@base-ui/react@^1.7.0`。

## 候选

| 候选 | 来源与采用信号 | 行为/无障碍 | 依赖/许可/维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| Member Selector | 21st.dev；创建与更新于 2026-01-18，分类页约 369–432 使用信号；现有 `PersonAvatar` 已借鉴其身份结构 | 有头像、搜索、已选成员和点击外部关闭；原实现的焦点/键盘语义不如专用 Combobox 完整 | 依赖 Lucide 与 Framer Motion；页面未明确展示许可，故不直接复制源码 | 人员行结构可取，但原尺寸、头像来源和动效需全部改为 TaskDoor Token / `PersonAvatar` | **adapt**：只借鉴“搜索 + 身份双行 + 选中反馈”的视觉结构 |
| Base UI Combobox | 官方行为组件；npm `@base-ui/react` 1.7.0，约 1,345 dependents，近期发布；项目已经安装 | 原生支持 trigger + popup 内 input、对象项过滤、单/多选、ARIA、方向键、Enter、Escape、焦点与空状态 | MIT；由 mui/base-ui 持续维护；零新增依赖 | 无样式，需完整接入 TaskDoor Token，但不会引入第二套视觉系统 | **adopt**：作为共享人员选择器的唯一行为基础 |
| shadcn/ui Combobox | 官方文档与 Registry；GitHub 约 122k stars，MIT；项目已有 shadcn 风格 UI 层 | 提供 popup、custom item、multiple、invalid / disabled 和 auto-highlight 组合范式 | MIT、持续维护；其当前实现同样以 Base UI / React Aria / Radix 为可选基础 | 可借鉴 API 命名与组合方式；直接安装会与现有 `ui/select` 和 Token 层重复 | **adapt**：借鉴共享 API 与 custom item 组合，不额外安装 |

## 最终选择

- 采用的行为基础：Base UI `Combobox` 的 input-inside-popup 模式。人员列表需要过滤，继续用普通 Select 只会复制搜索和键盘逻辑。
- 采用的视觉结构：21st Member Selector 的“头像 + 姓名 + 次级身份 + 末端选中标记”，并在弹层顶部保留单一搜索框。
- TaskDoor 适配：形成一个 `PersonPicker` 共享 API；统一使用 `PersonAvatar`、`--ad-person-picker-*`、`--ad-space-*`、`--ad-text-*`、`--ad-control-*` 和语义颜色。触发器允许安静动作式与身份式两种受控变体，但弹层、搜索与人员行只有一套。
- 来源注释或许可动作：组件源码注明行为来自 Base UI Combobox、视觉结构参考 21st Member Selector 与 shadcn custom-item 组合；不复制许可不明的 21st 源码；Base UI / shadcn 均为 MIT。
- 为什么不需要自研：过滤、ARIA、焦点、键盘和弹层定位属于成熟 Combobox 行为；自研会重复已有依赖并延续现有两套不一致实现。

## 验证

- 桌面、移动、键盘、焦点、空状态、错误状态：验证任务创建页与任务详情 Owner；搜索姓名 / 岗位 / 动态职责 / 邮箱；无结果；方向键、Enter、Escape、Tab 焦点；窄屏弹层宽度与 44px 触控目标。当前为本地同步数据，没有异步错误态；未来远程目录搜索需在相同组件 API 增加 loading / error 区域。
- 与相邻页面和现有共享组件的比较：任务创建的“更换处理人”、任务详情 Owner 与现有参与者入口；人员头像继续统一使用 `PersonAvatar`，普通枚举继续使用 `Select`，只有需要搜索的人员集合使用 `PersonPicker`。

## 2026-08-27 创建初始负责人复用

- 需求：默认只有当前用户时也显示真实姓名与角色，并始终允许在创建前更换初始负责人。
- 选择：直接复用既有 `PersonPicker` 的 action trigger、搜索、人员双行信息、当前用户标识和选中反馈；不新增 Owner 专用下拉、不安装依赖，也不复制页面级人员菜单。
- 本人语义：共享组件增加受控的 `selfOptionLabel`。缺口处理场景继续显示动作语义“我自己处理”；初始负责人和摘要等身份区域只显示正式 Owner 姓名“周岚”，不追加“（我）”。
- 相邻一致性：创建负责人、创建缺口处理人和 Task 详情 Owner 使用同一人员搜索与选中语法；只有业务语义不同，弹层视觉与键盘行为保持一致。

## 2026-08-28 Task 人员邀请状态与负责人同构

- 需求：Task 详情把“拥有者”改为“负责人”，负责人和参与者使用同一“头像＋姓名”人员单元；头像右下角表达邀请是否已接受，负责人仍可通过同一人员搜索器更换。
- 21st.dev 候选：[Member Selector](https://21st.dev/community/components/osiris-balonga/member-selector/default) 继续提供头像、姓名、添加与选中反馈的同构结构；页面显示其 2026-01-18 更新且依赖 `lucide-react` / `framer-motion`。**adapt**：复用解剖，不引入其动效依赖或复制许可不明源码。
- 官方行为候选：[Base UI Combobox](https://base-ui.com/react/components/combobox) 继续作为单人 / 多人选择、弹层搜索、方向键、Enter、Escape 与焦点恢复基础。**adopt**：项目已安装 `@base-ui/react`，不增加依赖。
- 官方视觉候选：[shadcn/ui Avatar](https://ui.shadcn.com/docs/components/base/avatar) 提供 AvatarBadge 右下角状态位和图标组合。**adapt**：只采用角标位置与图标容器关系，转换为 `PersonAvatar` 的 `accepted / pending` 语义和 TaskDoor Token；不安装第二套 Avatar。
- 最终规则：`PersonAvatar` 共享 `invitationStatus`；`accepted` 使用事实绿色实心对勾，`pending` 使用中性空心待勾选；二者有可访问名称，不能解释为在线状态。拒绝不形成第三个常驻人员角标，而是从当前人员列表移除并保留在协议 / 活动事实中。
- 触发器复用：`PersonPicker` 增加 `member` 触发变体，让单一负责人和多位参与者都呈现头像在上、姓名在下；弹层和键盘行为不变。新加入人员默认 `pending`，现有已成立关系默认 `accepted`。

## 2026-08-28 责任确认与详情负责人列复用

- 需求：每条创建责任可选择暂不分配并独立勾选；Task 详情在“当前责任”后展示可修改的唯一负责人；共享人员弹层的搜索框不出现内层蓝色矩形。
- 选择：继续 **adopt** Base UI Combobox 的搜索、对象值、方向键、Enter、Escape 和焦点恢复；继续 **adapt** 21st Member Selector 的双行身份结构；继续 **reject** 页面自绘下拉或第二套 Owner 控件。没有新增依赖或外部源码。
- 语义边界：创建责任的 Checkbox 与 PersonPicker 分离，换人后重新确认；Task 详情只在当前 Owner 行复用一个 identity `PersonPicker`，非 Owner 行不创建责任 assignee。两个入口都不绕过生产 Handoff / 接受协议。
- 焦点修正：Base UI 搜索输入标记为共享 `data-slot="input"`，复用现有 Input 焦点例外，消除输入文字区域的蓝色矩形；完整搜索行继续通过 `focus-within` 背景、光标和结果高亮提供可见键盘反馈。Portal 内部问题在共享组件修复，不使用页面后代选择器。
- 验证范围：创建页责任的暂不分配 / Owner / 外部候选三种选择，Task 详情负责人列，顶部负责人 / 参与者和文件维护人；覆盖 Tab、Enter、方向键、Escape、桌面与窄屏。
