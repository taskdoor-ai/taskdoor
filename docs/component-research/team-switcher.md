# 团队切换组件 research

## 需求

- 用户任务：在应用顶部展示当前团队 Logo，并从该入口切换团队；参考图强调 Logo、当前团队摘要、候选列表与选中勾选。
- 交互关键词：team switcher、workspace switcher、sidebar dropdown、radio menu。
- 技术约束：Vite + React + TypeScript；已有 Base UI Menu、AgentDoor DropdownMenu 与两支团队 Mock；不安装新依赖，不扩大权限或数据范围。
- 必须覆盖的状态：默认、打开、当前项、键盘切换、Escape 返回、桌面窄轨、移动顶部、深色主题、触控目标与 reduced-motion。

## 搜索过程

- 21st.dev 查询与分类：检索 workspace switcher、team switcher、profile dropdown；站内搜索未返回可核验的专用团队切换候选，因此复核项目已采用的 `aymanch-03/user-dropdown` 弹层结构，只借用锚定关系与轻量表面，不复制源码。
- 官方/组件库查询：shadcn Blocks `sidebar-07` 的 `team-switcher.tsx`、shadcn Dropdown Menu、Base UI Menu 与 Accessibility。
- GitHub 查询：shadcn/ui 官方仓库与 Base UI 官方实现；两者均为持续维护的开源项目，本轮不复制新代码。

## 候选

| 候选 | 来源与采用信号 | 行为/无障碍 | 依赖/许可/维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [21st User Dropdown](https://21st.dev/aymanch-03/user-dropdown) | 项目既有头像菜单已记录并采用其锚定弹层结构 | 专用团队单选与键盘契约不足 | 社区页面维护信号有限；不复制源码 | 头像信息卡语义与团队上下文不同 | **adapt anatomy / reject code**：仅借用“标识触发器 + 锚定弹层”关系 |
| [shadcn sidebar-07](https://ui.shadcn.com/blocks) | 官方 Blocks 明确包含 `team-switcher.tsx`，侧栏折叠态同时覆盖图标入口 | 使用 Dropdown Menu 与键盘菜单语义，当前团队由勾选表达 | shadcn/ui 官方持续维护；MIT；本项目已有同源 API | 需去掉快捷键、套餐与营销式团队信息，转换为 `--ad-*` | **adapt structure**：采用侧栏顶部触发器、当前摘要、单选列表 |
| [Base UI Menu](https://base-ui.com/react/components/menu) / [Accessibility](https://base-ui.com/react/overview/accessibility) | 官方维护；项目已依赖 `@base-ui/react` | 提供 ARIA、方向键、typeahead、Escape 与焦点恢复 | MIT；无新增依赖；2026 年仍持续发布无障碍修复 | 只需复用已有 AgentDoor DropdownMenu 外观 | **adopt behavior** |

## 最终选择

- 采用的行为基础：现有 Base UI-backed `DropdownMenu` 的 RadioGroup / RadioItem。
- 采用的视觉结构：改造 shadcn sidebar-07 的“团队标识触发器 → 当前团队摘要 → 团队单选列表”；保留参考图的 Logo 与选中勾选，不加入创建团队、团队设置或虚构成员数。
- AgentDoor 适配：桌面窄轨只展示团队图形标识；移动顶部同时展示团队名；菜单使用安静白色表面、语义 Token、12px 最小文字和明确的本地 Mock 边界。r14 将名称首字占位统一替换为共享 `TeamLogo`：零售团队使用店铺图形、协作平台团队使用模块图形，未知团队使用通用团队图形；不伪造品牌图片或新增上传字段。
- 来源注释或许可动作：不复制第三方源码；沿用项目既有 Base UI / shadcn 许可与组件。
- 为什么不需要自研 / 为什么必须自研：弹层、单选、键盘与焦点完全复用成熟 primitive；AgentDoor 领域层只维护 `TeamSwitcher` 与同一套 `TeamLogo` 图形投影。

## 验证

- 桌面：在默认 1280×960 预览中打开窄轨顶部 Logo，菜单显示 2 个 Team、当前摘要、单选勾选和 Mock 边界；切换后触发器 Logo 与可访问名称同步更新。
- 移动：在 390×844 检查顶部“Logo + Team 名称”和 288px 菜单，弹层未横向溢出；窄轨中的重复触发器在移动断点隐藏。
- 键盘 / 焦点：Base UI 菜单暴露 `menuitemradio` checked 状态；Escape 关闭菜单并回到触发器，方向键与 typeahead 沿用共享 primitive。
- 设计 / 构建：`npm run design:check` 通过且未抬高设计债务；完整 `npm run verify` 的生产构建被当前工作区既有 `CollaborationBrief` 类型不一致阻断，本组件已通过 Vite 开发编译和实际浏览器交互。
- 与相邻页面和现有共享组件的比较：对照 WorkspaceSidebar、个人中心 Team Select、全局通知 Sheet；沿用同一表面、Token 与焦点语言。
- r14 图形 Logo：实际浏览器检查顶部窄轨、团队切换摘要、两个单选项、设置页 Team Select 与 64px 团队摘要均已使用共享 `TeamLogo`；切换器显示店铺 / 模块图形和选中勾选，设置页图形尺寸与文本基线对齐。`npm run verify` 通过。
