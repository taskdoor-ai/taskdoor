# AgentDoor Design System（待按 V2 重构）

> 本文仍包含固定阶段、看板、时间线和自定义视图等历史设计。2026-08-26 之后的产品与实现判断以 [产品定义 V2](./product-v2/README.md) 为准；视觉 Token 仍可参考，产品结构不再视为 canonical。

> 项目基调、工作流和规则优先级见 [项目工作宪章](./product-v2/00-project-operating-charter.md)。本文只对视觉、内容、交互品质、组件治理和无障碍负责，不能反向定义产品对象、状态、权限或导航。

### 有效性地图

| 内容 | 当前效力 |
| --- | --- |
| Design thesis、质量门槛、按需组件研究、Token / 复用治理、颜色、排版、间距、动效、内容、无障碍、反模式 | 有效；按本节触发条件实施 |
| Work Request、固定 Routing Path、Space、强阶段 / Stage、看板、时间线、自定义视图和旧 Canonical screen composition | `legacy / inactive`；仅供历史参考，禁止作为 V2 产品或实现依据 |
| 与 Task、Responsibility、Handoff、Decision、File 和“我的工作”有关的产品语义 | 以 product-v2 与决策台账为唯一依据 |

> Follow-up `DS-V2-01`：把折叠的旧 Work Request、固定阶段、看板、自定义视图与固定导航全文迁入独立历史文档。Work Owner：设计系统维护者；触发条件：明确安排设计系统清理或准备移除“待按 V2 重构”状态；验证：现行设计系统正文不再命中 `remain fixed`、`only system-default` 等旧强制句，历史链接仍可访问。该文档债务不阻塞普通 Task / 导航 UI 工作。

> Version 0.36 · 2026-08-28
> Visual direction: **Routing Surface / 路由界面**

## 1. Design thesis

### 2026-08-31 上下文 AI 调整浮层（D-151）

`TaskAiAdjustmentPopover` 替代 D-149 的居中弹窗形式，沿用已有 Base UI / 21st 适配 Popover、Button 与 Textarea；不新增依赖。浮层贴近实际入口，采用白色表面、轻阴影、范围与任务名称一行、直接输入和蓝色圆形预览箭头，不遮暗页面。差异预览原位展开，明确确认后才应用；取消丢弃当前 AI 草稿，收起只隐藏。

外部点击不抢回焦点；Esc、收起、取消、应用及首尾 Tab 退出返回仍有效的入口。创建子任务展开区使用稳定的最右侧展开按钮定位；详情子任务菜单关闭后使用原更多按钮，避免锚定已卸载内容。页面持有分范围 AI 草稿，切换模块或示例再返回可以继续；刷新及离开页面不持久化输入。沿用候选签名、保存失败保留和手工编辑冲突保护。

桌面宽度 460px，视口边缘自动翻转／移位；窄屏保留 8px 安全边距，内部滚动，预览底部动作不随正文卷走。移动操作区至少 44px，键盘焦点可见，减弱动效偏好下禁用动画。该变化不恢复聊天式创建，不接入真实模型或新增确认业务对象。

### 子任务完成标准展开编辑（D-150，2026-09-01 局部修订）

创建方案按用户后续反馈使用 `TaskCreationSubtaskEditor`：每个子任务是独立卡片，默认收起，最右侧“展开／收起”是唯一展开入口，取消三点菜单及列表外围大框；收起显示名称、单行首条标准、条数和只读的负责人头像／姓名，不提供摘要快捷编辑。负责人和展开控件同排居中，桌面展开按钮使用 32px 紧凑高度，窄屏及触屏保留 44px 触达区域。展开复用主任务 heading 布局编辑名称、多条完成标准、负责人、参与人、截止时间、标签、前置依赖与执行建议；目标仍在数据层继承主任务，不在每项内重复展示。完成标准复用创建页的单行自适应输入，随内容和可用宽度增高，不再嵌套标准展开。手动修改直接同步当前候选方案，不再提供整项保存／取消，收起保留输入，失效依赖可单独移除；“AI 帮你改”仍需预览和明确应用，EWD 估算继续独立确认或取消。有非空执行建议才显示折叠入口，不删除字段或已有建议。详情子任务列表仍使用 `TaskCriteriaEditor` 逐条编辑完成标准并显式保存／取消，名称保留单独的详情入口。两者复用既有 21st 适配 Accordion、Button 和输入控件。

每条标准使用独立文本框，正文中的分号或换行不隐式拆条；创建方案允许未完成字段暂存，但最终确认须通过名称、目标和完成标准等必要校验，每项至少有一条非空标准，空白条目明确反馈位置。同步方案不提前创建；AI 候选过期须重新预览，版本冲突保留人工输入，EWD 编辑中的独立确认不因收起而丢失。已有详情继续保护未保存标准，保存或取消后返回展开按钮。窄屏换行并保持 44px 操作区，减弱动效偏好下取消折叠动画。编辑的是任务定义，不显示验收复选框，也不把人工变更记录为 AI 生成。

### 2026-08-31 模块内 AI 调整（D-149）

> 下述居中弹窗与 544px 宽度属于历史呈现，已由 D-151 的上下文浮层替代；字段范围、差异预览及写入边界继续有效。

创建候选与已有详情复用同一弹窗，在任务信息、子任务模块和单项菜单进入，不再把局部修改放到整页底部。范围标识与真实任务名称常驻，采用“输入 → 具体差异 → 明确应用”，不使用聊天气泡。字段差异以灰色修改前、蓝色修改后加文字标签表达；新增子任务聚合为一个定义预览，不重复展示六组空白前值。保留手工编辑和初始 AI 创建流程。

复用项目已有 Base UI Dialog、Button / ai 变体，以及既有 21st 适配的人员、日期与 Accordion；沿用语义 Token，不新增组件依赖。桌面使用共享 544px 弹窗宽度，窄屏留边、内部滚动、底部动作可达；焦点进入输入框，预览后落到差异区，取消或保存返回入口，单项菜单不触发行导航。详情保留正式负责人，另行标明待接受提议。界面显式标记 Mock；过期、无变化、失败与未支持分别反馈，不能冒充模型推理或生产写入。

### 2026-08-31 单任务工作区（D-146）

移除当前常驻侧栏与移动端导航抽屉。顶栏以一条轻分隔线组织“团队切换｜通知、头像”，不添加模块标签、第二个任务按钮、首页、主题快捷按钮或未来占位。头像菜单依次放置主题切换、普通设置和危险动作退出登录；主题固定在“设置”上方，浅色／深色状态分别提供“切换到深色／浅色”的完整可访问名称，并继续复用现有主题状态与本机持久化。当前本地原型不以退出入口清空任务数据或冒充真实会话撤销。搜索、筛选、新建和标签管理保持在列表上下文，详情与标签管理依靠可操作面包屑返回。桌面／移动复用同一套入口，保持 44px 点击区、长团队名省略与完整可访问名称；复用 TeamLogo、DropdownMenu、PersonAvatar 和 Sheet，不新造浮层交互。

### 2026-08-31 创建页视觉增量（D-143 / D-147）

创建与各模块 AI 调整统一使用输入区域内的 `TaskAiWorking` 轻量工作条：当前动作、一句与当前范围相关的说明、停止。复用已有 21st 适配活动指示器和 Button，不再展示四阶段清单、巨型加载卡片或常驻的首次规划报告；生成结束直接呈现任务方案，局部调整则呈现具体差异，等待人工确认。一般只切换“理解需求／整理结果”两条短反馈，补问及不支持的需求仅检查必要条件；当前仍为父页／浮层明确标注的本地 Mock，短演示不冒充实际调用、查重或思维链。停止、收起、换范围和卸载作废旧运行并保留输入，旧结果不得覆盖新范围；应用仍检查版本与权限，不增加演示等待。窄屏保留 44px 停止入口，减弱动效偏好下不跳动。

按 D-147，点击新建进入任务页内的紧凑需求工作区，保留 AI 理解、最多两项关键补问、已有任务关系判断和人工确认；不提供默认空白任务表，不恢复聊天气泡、弹窗或巨型居中入口。真实阶段用轻量步骤标识，补问和关系选择在同一页面呈现；生成后头部复用任务详情的 `task-detail-hero-card`、标题、目标、完成标准和紧凑属性栏样式，只有一份可编辑方案。子任务使用清单、彩色任务图标与前置依赖提示；自然语言调整先展示具体字段差异，再应用到当前方案。已有 21st 适配的 PersonPicker / MemberSelector、TaskDueDatePicker、Accordion 继续使用，保留蓝色主动作与必要过渡，不另造双栏简报。五个 Mock 场景在需求阶段以可识别的业务卡片呈现，生成后收在“使用示例”，切换可返回原草稿；能力限制显式标注。阶段切换正确移动焦点，窄屏重排；减弱动效偏好下关闭过渡，必要字段和已设依赖不依赖 hover 才可见。

AgentDoor is the shared context and continuation layer between people and their personal AIs. Its interface should feel like a carefully prepared working brief: clear, readable, source-backed, and ready for a human decision.

The system uses white surfaces, clear typography, and blue for primary actions. The default light theme uses a white canvas; gray distinguishes navigation and grouped regions. Color communicates evidence type, uncertainty, confirmation, risk, and acceptance.

The visual standard is defined by four qualities:

- **Clear:** information hierarchy and available actions are immediately understandable.
- **Beautiful in interaction:** controls respond naturally, state changes are legible, and workflows feel continuous.
- **Simple:** every visible element has a necessary job; remove duplicated structure and explanatory decoration.
- **Designed:** simplicity does not mean plainness. Composition, typography, color, spacing, and motion may create character when they improve recognition or use.

### Quality bar: top-tier UI/UX craft

“Correct”, “clean”, “consistent”, and “built from a component library” are the baseline, not an acceptable final result. Every production-facing surface must demonstrate senior design judgment:

- **Composition:** the screen has a deliberate focal point, balanced density, and a clear reading path. Empty space must organize information rather than compensate for missing content.
- **Hierarchy:** type scale, spacing, contrast, and placement reveal importance without requiring explanatory labels. Do not solve hierarchy by making one heading enormous and everything else tiny.
- **Interaction:** entry points are discoverable, transitions are continuous, feedback is immediate, and hover, focus, loading, success, error, empty, and destructive states feel like one designed system.
- **Detail:** alignment, optical spacing, icon weight, copy, borders, radii, and control sizing receive the same attention as the page concept. No internal values, placeholder vocabulary, accidental truncation, or unfinished states may reach the UI.
- **Character:** each important surface should contain at least one product-specific design decision that could not be copied unchanged into a generic admin template.
- **Coherence:** Home, Tasks, Settings, and AI connection may have different jobs, but they must unmistakably belong to the same product.

A mature external component is raw material, not the finished design. It must be composed, adapted, and visually reviewed in AgentDoor's real content and surrounding layout.

### Signature: the Routing Thread

A 2px blue line connects the five things AgentDoor must never blur:

```text
问题 → 证据 → 责任 / 能力 / 权限 → 路由决定 → 业务验收
```

The thread may appear when a surface genuinely connects at least three distinct decision facts, such as evidence, responsibility and acceptance. Lightweight tasks may omit it or collapse it to a single evidence-to-action relation. It must never imply a fixed lifecycle, fabricated progress, or mandatory stages. Nodes use shape and labels as well as color, so meaning remains accessible without color perception.

## 2. Product principles translated into UI

| Product principle | Interface rule |
| --- | --- |
| 跟随需求，结构按需生长 | Start with the user's outcome and highest-value gap; do not pre-generate a full task tree. |
| 默认自己负责，协作主动展开 | Keep the current user as the default Owner and reveal people comparison only when they ask. |
| 先准备上下文，再邀请人 | Put the prepared brief and evidence before people recommendations. |
| 能力与责任分开 | Never merge Owner, Expert, Contributor, and Authorizer into one score or badge. |
| 推荐必须可解释 | Every recommendation exposes evidence, source, freshness, and uncertainty. |
| 找到人不是完成 | The dominant progress model ends at accepted delivery, not assignment. |
| 接受与生效分开 | Invitation acceptance, Handoff consent, activation, delivery, and business acceptance remain distinct states. |
| 不共享私人 AI 对话 | Show reviewed context increments and provenance, never chat transcripts by default. |

### Risk-based design preparation

Routine, reversible UI changes that reuse an existing product contract and interaction pattern use the short path:

1. Read the directly relevant product decision and design-system section, not the entire document.
2. Inspect the existing shared component / Token and the closest current surface that already expresses the pattern.
3. Implement through the shared API and verify the affected interaction, focus path, and viewport at the task boundary.

This short path does not require external search, a Component Research Record, repeated screenshots of unaffected states, or a full design-baseline run.

A **new page, materially reshaped workflow, new reusable interaction primitive, or new dependency** uses full preparation before implementation:

1. Read the relevant product definition, design-system sections, and adjacent AgentDoor surfaces.
2. Use the `frontend-design` skill and identify the visual / interaction principles being introduced or changed.
3. Inventory AgentDoor's foundation first. If it cannot express the requirement, research mature external primitives and verify license, dependencies, maintenance, accessibility, framework fit, adoption signal, and visual fit.
4. Define the affected object model, states, keyboard path, responsive behavior, and failure / permission behavior.
5. Implement with semantic `--ad-*` tokens and one AgentDoor-owned shared API.
6. Verify the production build plus the actual desktop / mobile and keyboard states affected by the new pattern.

“Pure handcrafting” is not a virtue by itself. When a suitable mature primitive exists, source-adapt it and preserve attribution; custom implementation is reserved for AgentDoor-specific domain semantics that established components cannot express.

#### External component discovery gate

External discovery is required only when full preparation is triggered **and** the existing AgentDoor foundation cannot represent the interaction, or when an external implementation / dependency is being considered. Reusing or composing an established local pattern does not trigger a new search. The designer or agent owns any required discovery; the user must not be expected to find the component.

Use the relevant entries in this order; do not exhaust every source when the local foundation or an authoritative implementation already settles the choice:

1. **AgentDoor foundation:** inventory existing `src/components/ui`, product components, Token variants, and the closest relevant current screen.
2. **21st.dev first pass:** search the exact interaction noun and related category; inspect Popular as well as visually relevant results. Record usage counts when available, dependencies, source code, and installation method. A high count is a useful adoption signal, not proof of product fit.
3. **Accessible foundation:** check shadcn/ui and its registry, Base UI, React Aria, or Radix for behavior-heavy controls. Prefer these for Dialog, Combobox, Select, Menu, Tooltip, Calendar, focus management, and keyboard behavior.
4. **Application patterns:** check maintained collections such as Origin UI and Tremor for forms, settings, filters, tables, pagination, dashboard, and enterprise application compositions.
5. **Visual and motion patterns:** check 21st.dev Popular, Motion Primitives, and other maintained open-source collections when motion or a distinctive interaction materially improves comprehension. Decorative popularity must not override product clarity.
6. **Focused GitHub search:** search the component/interaction plus the project's stack. Prefer original repositories and official documentation; inspect license, recent maintenance, open issues, framework version, accessibility approach, bundle/dependency impact, and whether the code can be adapted without importing a second design system.

Compare the smallest credible set that can answer the choice. A novel shared primitive or new dependency normally compares three serious candidates, including an accessible official / GitHub implementation and, when visually relevant, a 21st.dev candidate. A narrow behavior choice may need only one or two authoritative candidates. Save a research record only when adopting external code, adding a dependency, or preserving a reusable non-obvious decision. For each recorded candidate state:

- the exact URL and component name;
- evidence of maturity or adoption;
- interaction and accessibility strengths;
- dependency, license, and maintenance risks;
- visual fit with AgentDoor and the amount of adaptation required;
- one of **adopt**, **adapt**, or **reject**, with a concrete reason.

The final selection may combine layers—for example, Base UI behavior with a 21st.dev visual anatomy—but must produce one AgentDoor-owned shared API. Copying a component into a single page without Token adaptation, attribution, state coverage, and reuse does not count as successful adoption.

When a required discovery finds no suitable candidate, record the evidence that custom work is justified. “Faster to hand-code” and “I already know how” are not sufficient reasons when the discovery gate is actually triggered.

### Design system governance and reuse

AgentDoor has one visual and interaction system. Pages may express different jobs, but they may not invent independent typography, button styles, card language, form behavior, spacing scales, or navigation patterns. A design change is incomplete until the reusable part has been incorporated into the design system.

#### Token hierarchy

All reusable visual decisions must enter the system through the appropriate layer:

1. **Foundation tokens:** raw color, typography, spacing, radius, shadow, motion duration, easing, and breakpoint values.
2. **Semantic tokens:** meanings such as surface, text hierarchy, border, primary action, danger, success, focus, selection, and disabled state.
3. **Component tokens:** shared decisions for Button, Input, Select, Dialog, Badge, Card, Table, Navigation, and other canonical components.
4. **Pattern tokens:** page-shell width, header spacing, toolbar rhythm, list density, detail layout, and responsive transitions shared across multiple surfaces.

Compact selection follows one shared visual contract: pagination, view switches, filter chips, and similar reversible choices use `--ad-control-selected-bg` with `--ad-control-selected-ink`, never the black primary-action fill. The primary rail uses the same quiet selected surface with `--ad-navigation-selected-ink` for its active icon; route-blue communicates the current destination, while the Connect AI entry keeps its existing route treatment. Black fill is reserved for explicit primary actions, not persistent selection state.

Pages consume semantic, component, and pattern tokens. They must not introduce hard-coded visual values when an existing token expresses the same decision. If no suitable token exists, propose and document a reusable token instead of hiding the decision inside a page selector.

External components never bring their own scale into AgentDoor. Their raw `px`, `rem`, Tailwind arbitrary values, radii, and control heights must be translated to the nearest existing AgentDoor Token before adoption. If that translation makes the component fail, reject or recompose the component; do not create a parallel scale to preserve its screenshot exactly.

#### Required reuse order

Before creating any UI, follow this order:

1. Reuse an existing canonical component without modification.
2. Add a documented variant to that component when the behavior and anatomy remain the same.
3. Compose existing primitives into a reusable product pattern.
4. Create a new shared component only when the first three options cannot represent the requirement.
5. Page-local implementation is allowed only for truly unique composition, never for a duplicated control or interaction.

Copying markup or CSS from another page does not count as reuse. Shared behavior, accessibility, variants, states, and styling must live in one canonical component API.

Date semantics must map to canonical shared components. A single due date uses `TaskDueDatePicker`; a task period uses `TaskDateRangePicker`. Each component owns its label, trigger anatomy, control height, typography, border, radius, focus state, calendar surface, Portal positioning, and responsive behavior. Pages may control placement and available width, but must not restyle these internals or duplicate the label. Date ranges may not be substituted with page-local paired inputs.

#### Continuous contribution loop

When a task creates or changes a reusable pattern, leave the system stronger:

1. Inventory relevant tokens, components, and adjacent patterns before designing.
2. Identify what can be reused and what gap genuinely exists.
3. Implement the gap as a token, variant, shared component, or documented pattern.
4. Replace nearby duplicates when the new shared solution makes them obsolete.
5. Update this specification or the component selection record only when a reusable contract changed.
6. Capture the desktop, mobile, hover, focus, empty, loading, error or disabled states that the change actually affects.
7. Compare with the closest relevant AgentDoor pattern; major pages and release work expand the comparison as needed.

#### Consistency gates

A change cannot be considered complete when any of the following is true:

- The same object is rendered by different components on different pages.
- The same action changes color, label, size, placement logic, or confirmation behavior without a documented reason.
- A new page introduces its own heading scale, form controls, card anatomy, table density, modal structure, or responsive rule.
- A page-specific selector recreates an existing shared component.
- Internal data values leak into user-facing labels.
- The design system documentation and the implemented component disagree.
- The new surface looks polished in isolation but does not visually belong beside the rest of AgentDoor.

#### Automated enforcement

- `npm run build` runs the TypeScript production build and is the normal code-boundary check; continuous micro-feedback should not rerun it after every small edit.
- `npm run design:check` measures registered design debt. It is a targeted diagnostic for global Token, shared foundation, global stylesheet, design-check changes, and release-level validation—not a routine UI regression gate.
- When both checks are justified, run `npm run design:check` and `npm run build` explicitly so the evidence remains separate.
- Forbidden implementation copy such as “Default List” remains unacceptable. The checked-in baseline is a diagnostic debt ceiling when the design check is intentionally run; raising it still requires explicit human design approval and a written reason.

## 3. Color system

### Foundation

| Token | Value | Use |
| --- | --- | --- |
| `--ad-canvas` | `#FFFFFF` | Default light-theme page canvas. |
| `--ad-surface` | `#FFFFFF` | Cards, drawers, menus, and prepared briefs. |
| `--ad-surface-subtle` | `#F3F3F2` | Selected rows and grouped evidence. |
| `--ad-sidebar` | `#F7F7F6` | Quiet navigation surface in the light theme. |
| `--ad-ink` | `#17191C` | Primary text. |
| `--ad-ink-secondary` | `#565A60` | Supporting content. |
| `--ad-ink-tertiary` | `#7A7E84` | Metadata and placeholders; not for critical information. |
| `--ad-border` | `#DCD8D1` | Hairline separation. |

### Actions and routing

| Token | Value | Use |
| --- | --- | --- |
| `--ad-route` | `#1268D6` | The single primary action and Routing Thread. |
| `--ad-route-hover` | `#0D57B5` | Primary hover. |
| `--ad-route-soft` | `#E7F1FD` | Selected routing path and focus wash. |
| `--ad-route-ink` | `#0A438E` | Text on route-soft. |
| `--ad-focus` | `#1268D6` | 2px keyboard focus ring with 2px offset. |

### Semantic evidence

These colors support labels and left-edge markers; they do not fill large decorative cards.

| Meaning | Strong | Soft | Required label |
| --- | --- | --- | --- |
| Fact / 已验证事实 | `#24735A` | `#E5F3ED` | “事实” |
| Inference / 推断 | `#8A5A13` | `#FFF1CF` | “推断” |
| Conflict / 冲突 | `#B43A35` | `#FCE9E7` | “冲突” |
| Unknown / 未知 | `#62666D` | `#ECEDEF` | “未知” |
| Accepted / 已接受 | `#24735A` | `#E5F3ED` | Check icon + “已接受” |
| Blocked / 阻塞 | `#B43A35` | `#FCE9E7` | Stop icon + reason |

### Color discipline

- Only one filled chromatic button appears in a decision area.
- Status is always expressed by label, icon, and color together.
- Task card backgrounds may use a subtle gradient from the existing task tone into the surface color; task icons and their backgrounds stay solid. Avoid glass effects, saturated dashboard charts, and decorative multicolor card mosaics.
- Yellow means an inference or attention item, never general decoration.
- Red means conflict, rejection, destructive action, or true blocking state.

## 4. Typography

### Families

- **UI and body:** `Inter`, `Noto Sans SC`, system sans-serif.
- **Prepared brief introduction:** `Noto Serif SC`, `Source Serif 4`, serif. Use only for short problem statements and human-authored summaries.
- **Evidence identifiers and timestamps:** `IBM Plex Mono`, `SFMono-Regular`, monospace.

This pairing keeps the editorial clarity of the reference while remaining dependable for Chinese enterprise UI.

### Theme architecture

- `:root` is the canonical light theme and uses a pure white canvas.
- `[data-theme="dark"]` overrides the same semantic tokens rather than redefining component styles.
- Components may only consume semantic `--ad-*` tokens; they must not branch on theme names.
- Theme preference is persisted locally and can later expand to workspace-managed themes without changing component APIs.
- New themes must preserve evidence semantics, contrast, focus visibility, and the single routing-accent hierarchy.

### Scale

| Token | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| `display` | 40 / 44 | 650 | Rare page thesis or empty-state invitation. |
| `title-1` | 28 / 34 | 650 | Task or prepared-brief title. |
| `title-2` | 22 / 28 | 650 | Major section. |
| `title-3` | 18 / 24 | 600 | Card and panel title. |
| `body` | 15 / 24 | 400 | Default Chinese body copy. |
| `body-sm` | 14 / 21 | 400 | Dense card content. |
| `label` | 13 / 18 | 550 | Controls and structured labels. |
| `caption` | 12 / 18 | 450 | Provenance, timestamps, freshness. |
| `code` | 12 / 18 | 500 | Object IDs and evidence references. |

Headings use slight negative tracking (`-0.02em`); Chinese body copy uses normal tracking. Do not reproduce extreme marketing-scale negative tracking inside the product.

Typography is selected by semantic role, not by visual nudging. Page CSS must consume `--ad-text-*` tokens; arbitrary 11px, 13.5px, or `text-[...]` values are not allowed. When density is too high, simplify content or composition before shrinking text.

## 5. Spacing, shape, and layout

- Base unit: 4px.
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Components consume this scale through `--ad-space-*`; imported components must replace their original padding, margin, and gap values with the nearest existing step.
- Default card padding: 20px on desktop, 16px on mobile.
- App maximum content width: 1440px.
- Reading column: 720px maximum.
- Existing 64px navigation rail and 240px contextual directory are implementation measurements, not a canonical information architecture. Reuse their tokens only when the current product-v2 navigation decision calls for those surfaces.
- A product action must preserve the user's prepared context and make the created object reachable; which destination or directory changes is decided by product-v2, not by this spacing section.
- Current Task workspace desktop grid (D-148): `320px minmax(0, 1fr)`, with a compact task index on the left and the selected detail on the right. At narrow widths use list → detail navigation, not shrunken columns; the current prototype switches at 900px. Detail components respond to their container width.

### Radius

- Card and panel: 12px.
- Button and input: 8px.
- Compact tag: 6px.
- Pill: reserved for compact categorical labels and short immutable status only. Never use it to imply online presence, activity, “currently working”, responsiveness, or availability inferred from behavior.

### Control size

| Token | Size | Use |
| --- | --- | --- |
| `--ad-control-height-xs` | 28px | Rare compact utility control; never a primary action. |
| `--ad-control-height-sm` | 32px | Dense row action, compact filter, and icon utility. |
| `--ad-control-height-md` | 36px | Default desktop Button, Input, Select, and trigger. |
| `--ad-control-height-lg` | 40px | Prominent desktop action or spacious form. |
| `--ad-control-touch-min` | 44px | Minimum interactive target on touch layouts. |

Control anatomy and hit area belong to the shared component. Pages choose a named `size` variant; they do not set local heights or padding. Icon-only controls use the corresponding square dimension. Default interface icons are 16px; 20px is reserved for prominent controls and navigation.

### Elevation

- Cards use a 1px border and no shadow.
- Floating menus may use `0 8px 24px rgba(23, 25, 28, 0.10)`.
- Drawers use a border before a shadow.

## 6. Core components

### Analysis trace（optional proposal pattern, not a lifecycle）

After a user submits a need, the product may expose a collapsible activity trace while an editable Proposal is being prepared. Do not show it merely to dramatize a fast or simple operation. It shows only observable system work: problem parsing, authorized source discovery, evidence classification, and proposal preparation. It may include source titles, access state, freshness, and step status; it must never expose private model chain-of-thought text. When used, the trace opens while active, collapses after completion, and remains available as a processing record.

#### Analysis questions（proposal vocabulary, not fixed stages）

The analysis trace represents a decision-preparation process, not the model's private reasoning and not the execution lifecycle. Its job is to turn a user's request into an evidence-backed, actionable next step.

When these activities genuinely occur and add value, use the following vocabulary. They are questions, not a required sequence or product state machine: AI may omit, merge or progressively reveal them for light work. Making all five permanently user-visible is a C2 product choice and requires confirmation.

| Question label | Question answered | Possible evidence / output | Recommended description |
| --- | --- | --- | --- |
| 理解任务 | 用户要解决什么？ | 对象、现象、影响、期望结果与约束 | “明确目标、交付结果和处理约束。” |
| 拆解问题 | 完成任务前需要分别解决什么？ | 可分别判断或执行的子问题清单 | “识别完成任务前需要分别解决的关键问题。” |
| 查找相关依据 | 哪些可用信息能回答这些子问题？ | 资料、历史工作、代码、人员和权限信息，以及各来源的用途 | “在当前权限内，从业务资料、历史记录、代码和人员信息中寻找依据。” |
| 归纳事实与待确认项 | 现在能确定什么，还不能确定什么？ | 已确认事实、待确认判断、冲突和信息缺口 | “对照多个来源，整理已确认事实、存在冲突的判断和仍缺失的信息。” |
| 规划后续处理 | 基于当前结论，接下来应该怎么走？ | 下一步动作、负责人、前置条件、审批要求和完成条件 | “根据当前结论，确定下一步动作、负责人、审批要求和验证方式。” |

If both “拆解问题” and “理解任务” are displayed, keep their meanings distinct: the former produces questions that guide retrieval and later judgment. Likewise, do not treat source discovery as evidence synthesis: a source is an input, while a classified claim is a decision artifact.

#### Evidence synthesis

Evidence synthesis means converting retrieved material into claims that can support a decision. It is not a source count, file summary, or generic statement that analysis is complete.

Every synthesized item must be classified as one of the following:

- **已确认事实:** directly supported by a reliable, identifiable source and safe to use as an input to the next decision.
- **待确认判断:** plausible from current information but still requires confirmation by an accountable person or a stronger source.
- **冲突:** two or more relevant sources support incompatible claims; show both sides and do not silently choose one.
- **信息缺口:** required information is unavailable or inaccessible; state which downstream decision it blocks or weakens.

Each item should expose the claim, supporting source, freshness, confidence or uncertainty, and its effect on subsequent work. When this question is shown, its user-facing label is **“归纳事实与待确认项”**; “综合证据” may remain an internal capability name only.

#### Routing recommendation

A routing recommendation is a proposed work-transition decision derived from the synthesized evidence. It determines **what happens next, who must act or decide, and what must be true before the work can continue**. It is not merely a participant recommendation or a prose summary.

A complete routing recommendation contains:

1. **推荐下一步:** the immediate action or decision.
2. **负责人或角色:** the accountable actor, reviewer, contributor, or authorizer.
3. **路由依据:** the confirmed facts, unresolved judgment, risk, permission boundary, or dependency that makes this route appropriate.
4. **所需输入与前置条件:** information, access, approval, or artifact required to begin.
5. **完成条件:** the observable result that allows the work to move to the following processing point.
6. **后续路径:** the expected next action / decision or an alternative path if the recommendation is rejected or blocked.

For example, a POS coupon recovery task may route through:

```text
业务规则确认 → 技术方案与代码审核 → 发布授权 → 门店灰度验证 → 全量发布决策
```

When this question is shown, its user-facing label is **“规划后续处理”**; “形成路由建议” may remain an internal capability name. Always keep the conceptual boundary explicit:

```text
归纳事实与待确认项 = 现在能确定什么？
规划后续处理       = 基于这些结论，接下来怎么走？
```

### Buttons

1. **Primary:** route blue fill; one per decision area. Labels name the result: “确认直接执行”, not “提交”.
2. **Secondary:** white surface, hairline border, dark text.
3. **Quiet:** transparent; appears inside cards and rows.
4. **Destructive:** red text or red fill only after an explicit confirmation step.

Minimum height is 36px desktop and 44px touch. Use the shared Button `size="touch"` variant for actions that remain touch targets in portalled overlays; do not reproduce the 44px rule with page CSS. Loading preserves the original label width.

### Select

All predefined single-choice dropdowns use the shared shadcn-style `Select` backed by Base UI. Pages may set width and size through the shared API, but must not redraw the trigger with transparent, dashed, borderless, or sub-12px page-specific styles.

- Trigger anatomy is fixed: text value, quiet surface, soft border, control radius, focus ring, and one trailing Chevron. The Chevron is a functional affordance, not a business icon.
- Items are plain text by default. Do not place avatars, classification-tag icons, colored `TagBadge` components, or decorative leading icons inside ordinary Select options.
- The selected Check indicator and long-list scroll arrows remain because they communicate selection and overflow state.
- Use Group and Label for small categorized sets. Use Combobox instead when a list is large enough to need search.
- Compact Select uses the shared small control height and `--ad-select-compact-min`; it never reduces typography below the global 12px floor.
- Selects that remain direct touch targets use the shared `size="touch"` variant and `--ad-control-touch-min`; pages must not recreate that height with local CSS.
- Three-dot action menus use the same quiet popup surface, border, radius, shadow, option height, and focus treatment. Ordinary menu options are plain text; do not add a leading Pencil, Trash, Plus, or other redundant icon when the action label is already explicit. Do not divide a short action menu with horizontal rules; use popup padding and visible vertical spacing between options. Destructive color communicates deletion.

### Person picker

All searchable, predefined human selection uses the shared `PersonPicker` backed by Base UI Combobox. It is the single-choice identity counterpart to ordinary Select: pages may choose an action trigger such as “更换” or an identity trigger showing the current person, but they must not redraw the popup, search field or person rows.

- Search matches visible identity facts that help recognition: name, Team role / responsibility label and email. It never searches private activity or hidden profile fields.
- Every row uses `PersonAvatar`, a primary name, one quiet role line and a trailing selected Check. The current user may be labeled “我自己处理” only when that choice has the corresponding product meaning; the real name and role remain visible on the secondary line.
- Selected identities, responsibility cards and summary surfaces display the real name only; they do not append “（我）” to the name. “我自己处理” remains an action label inside the picker, not an identity suffix.
- The popup owns the search input, explicit no-result state, directional-key highlight, Enter selection, Escape close and visible focus. Person rows use the touch minimum height even on desktop so avatars and two text lines retain breathing room.
- The portalled search input does not draw its own blue rectangular outline inside the popup. Keyboard focus is communicated by the complete search row's quiet `focus-within` surface, visible caret and highlighted result movement; do not remove the global focus treatment from unrelated controls or repair this with a page-local descendant selector.
- Width, list height, spacing and elevation use `--ad-person-picker-*`, `--ad-space-*`, `--ad-control-*` and semantic surface tokens. A page can align the popup to its trigger and choose the shared `sm` / `touch` trigger size, but cannot shrink row typography, avatars or padding locally.
- Multi-person controls may compose the same person-row anatomy and search behavior, while preserving explicit add/remove and maximum-selection semantics. They must not create a second person-search visual language.
- Task 详情中的负责人和参与者使用同一 `member` 人员触发解剖：头像在上、姓名在下；负责人点击整个人员单元打开同一 PersonPicker，不绘制横向 Owner 特例。头像右下角的 `accepted` 为事实绿色实心对勾，`pending` 为中性空心待勾选，并用可访问名称说明“邀请已接受 / 等待接受邀请”。选择外部负责人只形成 pending 候选，接受前当前 Owner 与目录 `ownerId` 不变；拒绝者从候选投影移除。角标不得表达在线、忙碌、响应速度或绩效。

文件详情的维护人和可见范围采用 value-as-trigger：维护人身份单元直接打开共享 PersonPicker，可见范围标签直接打开既有范围 Dialog，不在卡片标题重复设置统一“编辑”按钮。触发器必须有包含当前值的可访问名称和可见焦点；当前前端 Mock 只能更新会话投影，不得把界面即时变化表述为真实责任转移、ACL、授权、撤权、持久化或审计。

### Team switcher

应用级当前 Team 使用共享 `TeamSwitcher`：桌面窄轨顶部以团队 Logo 作为触发器，移动顶部同时展示 Team 名称。弹层复用 Base UI-backed DropdownMenu 的单选语义，依次展示当前 Team 摘要、“切换团队”标签与可用 Team 列表；当前项必须同时使用勾选和文字，不能只靠 Logo 颜色。

- Team Logo 使用共享 `TeamLogo` 图形投影与语义 Tag palette Token，不再显示名称首字。已知团队使用稳定的业务图形，未知团队使用通用团队图形；没有真实品牌图片时不得伪造图片资产，也不引入第二套头像或任意品牌色标尺。
- 切换只改变已实现的 Team 上下文；前端 Mock 必须明确说明不会改变权限或数据范围，不能把视觉切换冒充 ACL 已生效。
- 不提供尚未实现的“创建团队”“团队设置”、成员数、套餐或额度信息。
- 桌面窄轨和移动顶部复用同一组件 API；菜单行为、焦点恢复、Escape、方向键和 typeahead 由共享 DropdownMenu 负责。
- 宽度、Logo 尺寸、间距、圆角和触控目标使用 `--ad-team-switcher-*`、`--ad-control-*`、`--ad-space-*` 与 `--ad-radius-*` Token，页面不得局部重画。

### Task intent input shell

D-140 removes the React Task-creation surface. The Task List may retain one quiet intent input before the result List, but it is an editable shell rather than a form or command.

- Use the shared `InputBar` text surface with a visible label, plain-language placeholder and restrained route-colored edge. It belongs inside the Task List page, not on a separate creation page.
- The shell accepts text and multiline Enter input only. It has no attachment control, send button, quick-test prompt, analysis state, Proposal preview, confirmation card, success receipt or hidden auto-submit.
- Copy must state that the text remains in the input and does not create a Task. Do not clear it on Enter, simulate progress, append a Task row, write creation storage keys or imply that an Agent has started work.
- The page header contains “任务” and the secondary “标签管理” action only. There is no primary “新建任务” action while the shell has no confirmed submit behavior.
- The shell uses existing color, typography, spacing, focus and radius Tokens. On narrow screens, place the explanation above the input; preserve the same text semantics and a visible focus ring.
- Restoring Task creation, persistence, file selection, people selection, parent / child planning or AI Proposal behavior requires a new confirmed product contract; none may be hidden inside the retained shell.

### Classification tag

A classification tag is identity metadata, not lifecycle status. Every surface that displays a tag uses one shared `TagBadge`; list rows, task detail, filters, pickers, and management previews must not re-create it with local chip markup.

`TagBadge` sizes follow information density: `md` for focused editing and previews, `sm` for selectors and task detail, and `xs` for dense table columns. The `xs` variant keeps the canonical color and icon anatomy while using the compact spacing scale; pages must not shrink tags with local CSS.

- Anatomy is fixed: **user-facing name + user-selected Lucide icon + curated soft background palette**. Text and icon remain present, so color is never the only identifier.
- The visual foundation source-adapts the 21st.dev Status Badge and shadcn Badge mechanics. AgentDoor changes the meaning from system status to user-managed classification.
- Radius is 6px, not a full pill. Compact height is 24px and standard height is 32px; icon size is 12–16px. Do not shrink tag text below the global 12px readability floor.
- Icons come from a reviewed Lucide registry exposed by the product. Do not dynamically import arbitrary icon names or introduce a second icon library for the same job.
- Colors source-adapt the user-selected 21st.dev Status Badge relationship: Tailwind 50/100-like pastel backgrounds, lively same-hue foregrounds, and an almost invisible boundary. Users choose a named swatch; they do not enter arbitrary hex values.
- Classification color should feel light but recognizable. The background carries softness, while the icon and name carry color identity; small-size foregrounds are slightly darker than the reference component to retain readability. Tags must remain distinct from lifecycle status, warnings, and primary actions.
- Tags form one flat catalog. There is no tag-group object, group selector, group heading, grouped card, cascade level, or prerequisite grouping step.
- Create and edit use the same focused Dialog with name, icon, color, and live preview. Deletion uses Alert Dialog and states its cross-task effect.
- The tag editor is a compact appearance workbench, not a divider-heavy settings form: a quiet preview surface sits beside compact icon and curated-color controls on desktop and stacks above them on mobile. Use surface contrast, spacing, and selection elevation before adding borders.
- Dialog chrome uses one soft outer boundary and elevation. Header, body, and footer must not be split by repeated horizontal rules; the title icon, concise helper copy, and live preview provide structure. Cancel is quiet, save is the only primary action.
- The management surface must expose edit and delete actions without turning the table into an inline form. Filters and task detail use the canonical Select/Combobox pattern.
- The management surface presents one responsive flat tag collection with a single “添加标签” action. Each tag exposes edit and delete without introducing a group card, left-side group selector, master-detail panel, or second taxonomy layer.
- Reordering must have a keyboard-complete path. Until the shared system includes an accessible drag-and-drop primitive with announcements and touch handling, expose explicit up/down controls with position numbers; do not ship pointer-only dragging or a decorative grip that does nothing.
- Palette values must be consumed through `--ad-tag-{name}-{bg|ink|border}` tokens. Management, task detail, lists, filters, and previews must render the same `TagBadge` component rather than copying its color classes.
- Tag selection uses the shared flat multi-select `TagPicker`; each option uses a checkbox and canonical `TagBadge` rendering. The popup has no group navigation, cascade column, custom title, instructions, counters, footer, or Done action; selection applies immediately and the user closes it by clicking outside, pressing Escape, or toggling the trigger. Size, surface, spacing, focus, elevation and keyboard behavior come from the shared picker rather than page-local state.
- Tag-management-only dimensions and elevation belong to shared pattern tokens (`--ad-tag-*`, `--ad-shadow-*`); page CSS must not introduce one-off modal widths, preview sizes, or selected-control shadows.

<details>
<summary>Historical Work Request and fixed-stage mappings（legacy / inactive）</summary>

### Work Request status（legacy / inactive 产品映射）

The five user-visible lifecycle states remain fixed:

```text
已定位 → 待确认 → 执行中 → 待验收 → 已解决
```

- A detail-page header shows only the current state as compact metadata beside the request ID and author.
- Full progression belongs in request lists and activity history, where lifecycle comparison is useful.
- Never place the full lifecycle rail beside the collapsible analysis trace; they describe different timelines and compete for attention.
- `assembling` remains visually inside “待确认”; it must not appear as “执行中”.

### Task stages and stage delivery（legacy / inactive）

Task stages describe the execution sequence of a collaboration task. They are different from the analysis trace and from the task-level lifecycle.

Each stage defines five things:

- **阶段目标:** 本阶段需要解决的问题。
- **阶段负责人:** 负责组织本阶段工作的人。
- **阶段待办:** 为完成阶段目标而生成的具体行动。
- **完成标准:** 允许 Owner 确认本阶段完成的可验证条件。
- **下一阶段:** 本阶段确认完成后进入的工作阶段。

Only the Task Owner can confirm stage completion and advance the task. Stage assignees may update todos, attach deliverables, and submit their work for review, but they do not directly complete or switch the stage.

The stage states are:

```text
尚未开始 → 进行中 → 已完成
```

- Task stages do not expose a blocked state. If a specific action cannot continue, its assignee or the Task Owner marks the related todo as “已阻塞” and records the reason; the stage remains “进行中”.
- Entering a new stage regenerates the current todo set from that stage's responsibilities and completion criteria.
- Todos from the previous stage remain in history and must not remain mixed into the new stage's current todo list.
- A stage becomes “已完成” only after the Owner confirms its required delivery and completion criteria.
- Completing individual todos does not automatically advance the stage.

#### Stage completion record

Do not use **“阶段成果”** or **“阶段性成果”** as an umbrella label. A completed stage record separates four conceptually different objects:

1. **阶段交付:** 本阶段实际创建或更新、能够被下一阶段直接使用的文件、代码、清单、报告或确认记录。
2. **阶段结论:** 本阶段最终确认了什么，包括适用范围、边界和关键决定。
3. **遗留问题:** 尚未解决但经 Owner 判断不阻塞阶段推进的问题或风险；记录影响、后续负责人和处理阶段。
4. **判断依据:** 支撑阶段结论的来源、事实、测试观察或历史记录。它解释“为什么得出该结论”，但不等于阶段交付。

A decision-only stage must still produce a reviewable decision record; a source list alone cannot be treated as its delivery. The same object may serve two roles only when those roles are explicit. For example, a newly produced test report is a stage deliverable, while the specific observations cited from that report are judgment evidence.

#### Stage delivery dialog

Only completed stages expose **“查看阶段交付”**. It opens a modal dialog with the same confirmation-oriented visual structure as the Owner stage-completion dialog; it must not expand inline beneath the stage rail.

The dialog order is fixed:

1. **阶段结论**
2. **阶段交付**
3. **已确认内容**
4. **遗留问题**
5. **判断依据**
6. **完成记录**

Every delivery item exposes its name, type, revision, and how the next stage can use it. Judgment evidence is secondary information and carries the explicit explanation **“用于说明结论，不等于阶段交付”**. The completion record shows the stage responsible person, confirming Task Owner, and confirmation time. Empty sections use explicit states such as “无遗留问题”; they must not be silently omitted.

</details>

### Evidence row

Each row contains:

```text
[type marker] claim or finding
              source · captured time · freshness · access scope
              contradiction / uncertainty when present
```

Facts, inferences, conflicts, and unknowns are separate rows or sections. A paragraph may not silently mix them.

### Task AI suggestion work brief

> 历史方案参考：D-142 已移除当前详情的概览和默认 AI 建议区。下述建议内容与动作边界供未来独立诊断方案复用，不构成本轮恢复入口的依据；旧通知只按需展开其来源记录。

Task 概览的“AI 建议”使用一个安静的连续 List，而不是一组彼此漂浮的等权卡片。List 顶部先给出任务态势摘要与待处理数量；每一行按“语义标记 / 结论与事实 / 影响、边界与动作”组织。事实使用紧凑标签值，不用长段 AI 解释；影响与能力边界必须在动作之前可见。

只有至少一条建议由当前可见事实触发时才渲染整个“AI 建议”区；零建议时不显示标题、态势摘要或空状态卡，后续概览模块直接上移。若建议存在但已被当前成员全部标记“已知晓”，只保留紧凑标题与重新显示入口，不渲染空工作简报。

语义色只表达建议性质：推断、冲突、未知、路由与事实，并使用既有 `--ad-inference-*`、`--ad-conflict-*`、`--ad-unknown-*`、`--ad-route-*`、`--ad-fact-*` Token。信息提示型行不放主按钮；导航型动作使用安静 Button，更新或创建型动作使用一个明确主按钮。不得给每行固定增加“记录跟进”，也不得用局部状态把导航伪装成闭环。

处理弹窗复用共享 Dialog。弹窗需重述建议依据、明确本次动作会改变什么与不会改变什么；更新动作显式保存，取消不写入。840px 以下改为单列，关键事实、边界和动作不折叠；所有动作保持可见焦点与触摸尺寸。

当同一 Task 出现多条建议时，行高必须服务于连续扫描。桌面端使用“左侧信息 / 右侧操作”两区：左侧只保留类型与状态、结论、关注原因和一条依据；右侧以竖分隔线集中放置真实动作与一句必要边界，不逐行重复“可用操作”，也不再罗列“当前状态、判断依据、影响、边界”。桌面端优先在首屏附近看到 3–5 条；840px 以下可改为上下两区，并用横分隔线保持关系，触摸控件继续使用标准尺寸。较长证据值可以单行省略并通过原生提示查看全文。

信息提示型行在左侧状态中显示“提示”，右侧只放共享实心“已知晓” Button，不重复“仅作提示”或无产品能力说明。它必须具有与其他主操作一致的明确可点击外观，文字后使用共享 Check 图标并始终保留“已知晓”文字，不能使用看似普通文字的 Ghost 样式或只显示图标。“已知晓”后该行立即离开当前成员视图，并用短时、非阻塞反馈提供“撤销”；标题来源区在存在隐藏项时提供紧凑的重新显示入口。文案必须说明隐藏不等于来源事实已解决，不能写入 Activity 或影响其他成员；证据版本变化后重新显示。浏览器无法保存或移除偏好时，反馈需明确“仅本次会话生效”及刷新后的可能结果。可行动建议不提供“已知晓”来替代处理。所有入口复用共享 Button 尺寸与焦点样式，移动端保持最小触摸尺寸。

### Person recommendation

Required fields:

- Person or Agent identity.
- Suggested role: responsibility, capability, contribution, or authorization.
- Plain-language reason.
- Evidence source and freshness.
- Uncertainty and alternative path.

Never show a universal “match score”. If ranking is useful, use ordinal language such as “优先建议” and explain why.

### Task list actions

`TaskAppearancePicker` separates appearance into a pure icon grid and a pure background-swatch grid. It does not show visible category names or card-like “icon + label” / “swatch + label” combinations; accessible names and hover hints still identify every option. Only the final `TaskIcon` preview combines the two selected inputs.

The Task list is one flat workspace with no Folder rail, directory tree, grouping pane, directory breadcrumb, restore-directory control, or separate “我的待办” destination. The page header owns “任务”, the secondary “标签管理” action, and one primary “新建任务” action. “新建任务” starts a fresh Agent conversation and never opens a second page-local creation form. One non-submitting Task intent input shell sits between the header and List container. The List toolbar owns one shared-Input name search plus status / owner / flat-tag filters. Results are tone-aware decision cards rather than a dense table: the shared Task icon and title establish identity, status sits beside the title, the goal remains one quiet supporting line, and “负责人 / 标签 / 到期时间” form one compact metadata row below. Do not repeat column headings above the cards or use “截止时间” for this field. A Task icon has two independent inputs: one bare icon from the canonical task-icon set and one background from the canonical tag-palette tones; only the final preview combines them. The shared `TaskIcon` renders the result consistently in list and detail contexts. Appearance is decorative and never implies status, priority, ownership, permission or tag membership. Tags reuse the canonical compact `TagBadge` and collapse excess labels into a count. Paginate at 10 rows, reset to page 1 when filters change, and hide pagination for empty results. On narrow screens the action group may wrap, the intent explanation stacks above its input, and the same card fields stack without horizontal overflow; all controls retain shared touch targets.

D-142 supersedes the old Overview-dependent placement: the current detail tabs are **讨论 / 子任务 / 文件 / 活动**. Keep the compact Task heading and the current parent-task breadcrumb; do not restore a separate Overview workbench.

Task period is optional. The shared Task date-range picker renders a quiet “添加周期” trigger when both values are empty, permits clearing the whole range from the popover, and never silently restores dates after a clear. A non-empty range must contain both start and end, with end on or after start. Use the same calendar, focus and Token treatment for empty and populated states; do not add a required marker, a fake placeholder date, or a second date-control style.

D-139 removes the global Todo entry, Task-detail Todo projection, Todo-to-Task conversion, Task-detail responsibility distribution and Task acceptance-criteria surface. The current prototype must not create or operate Todo and must not hide these removed controls in an alternate container. Unique Task Owner, participants, status, Activity, File, parent / child relations, Handoff and permission semantics continue to use their existing shared components and safety boundaries.

D-142 separates Task-detail **讨论** from **活动** and removes the Overview tab. Discussion is the default high-frequency surface: show human-authored posts, replies, mentions and original-file references with shared person components and the shared composer. Do not insert automatic AI suggestions or change events into the conversation. Activity is a read-only change timeline: compact neutral action markers, a subtle vertical connector, actor, concrete action and time; display before → after only when recorded values exist. Never infer an old value from the current Task. Use a single quiet type filter rather than colourful social cards. Commits retain their original identity, author, message and linked files, presented as file submissions in the current business-task prototype. Preserve every human reply, including replies to historical AI or system records, with its source context in Discussion. Keep stable focus targets, keyboard Tab navigation, wrapping metadata and touch-sized controls. Real timestamps and legacy display-time records must be distinguishable; never invent dates for legacy data. Browser-local records are a prototype, not immutable server audit.

Task parent / child navigation keeps the existing direct-child list in **子任务**, immediately after **讨论**. The parent remains in the task-ownership breadcrumb, not a Folder classification. Show only direct relations and navigate one level at a time. Preserve shared Task status/person components, visible keyboard focus, Left / Right and Home / End Tab navigation, responsive wrapping and touch targets. Do not reintroduce the removed Overview or a duplicate relationship tree, and do not imply inheritance of owner, status, members, files or permissions.

The Task List page has a page header outside the List container. It uses the single title “任务” and one scope sentence, with no eyebrow, directory breadcrumb, selected-group title or module sidebar. “标签管理” and the primary “新建任务” action sit at the right of this header; creating starts a fresh Agent conversation. The non-submitting intent shell follows the header; the List container then begins with one shared-Input name search on the left and status / owner / flat-tag filters on the right, followed by the result count, Task decision cards and pagination. Search icons use the shared Input `leadingIcon` slot and sit inside the same border and focus surface as the entered text; do not place a detached icon beside the control. Search, status, owner and tag use one shared task-matching predicate. Use `--ad-search-field-width` on desktop and full width on narrow screens.

### Personal center and responsibility document

成员设置使用一个设置式大型 Dialog。头像菜单不展示姓名、头像和身份组成的信息卡，首项提供主题切换，其下是与其他菜单动作一致的 **设置**，最后提供危险动作 **退出登录**；顶栏不再重复主题入口。主题项按当前状态显示“切换到深色／浅色”，使用对应图标与完整可访问名称，点击后复用现有主题状态和本机持久化。当前没有真实认证会话时，退出入口不得清除本机任务数据或显示伪成功。头像在菜单展开时不增加蓝色装饰外框，键盘焦点仍必须可见。Dialog 左侧身份区只展示头像与姓名，不在姓名下重复职位。导航按 **个人设置 / 团队设置** 分组：个人设置依次为 **个人信息 / 我的责任**；团队设置为 **团队信息 / 成员**。该导航位置不改变数据归属，“我的责任”仍是 Team-bound 文档。应用级 TeamSwitcher 与责任页标题区右侧的紧凑 Team Select 共享同一当前 Team 状态；设置内切换经过未保存责任草稿保护，不建立第二份团队上下文。团队信息使用“通用”结构，按团队标志、团队名称 Input、显式保存以及“离开团队 / 删除团队”危险区纵向排列；团队名称 Input 使用标准正文字号和正常字重，不继承字段标签的强调字重。不可逆动作必须使用 AlertDialog，且至少保留一个可切换 Team。成员使用 **用户 / 角色** 两列结构，复用 PersonAvatar 与共享 Select；角色表头与每行 Select 使用相同列宽和左边界，并整体靠右。成员页提供邀请链接复制 / 重新生成、邮箱邀请和角色修改；最后一名在职管理员不可被降级。我的责任承接所选 Team 的责任正文、就地新增／更新提议与证据，不设独立 AI 建议区。当前这些成员管理动作只写入本机原型，界面必须明确不发送真实邮件、不改变生产组织权限。窄屏将四个入口收敛为可横向滚动的单行导航，责任标题与操作允许换行且不得横向溢出，团队信息动作变为全宽，成员角色折叠到用户信息下方，保持相同语义、焦点顺序和可见选中态。

The responsibility surface presents one Team-bound responsibility document as a single, unboxed statement list using the available content width rather than the narrower reading-column cap. A compact Team Select sits at the right of the title area and switches the same application-level Team state; it is not a separate “当前团队” side area. The surface has no separate “AI 建议” heading, count, document card, blue decoration rail, right rail or review card:

```text
○ 当前责任                                      [✦ AI 建议]
  展开后：建议替换文本  查看依据  忽略  更新
○ 当前责任
◌ 候选责任文本                  查看依据  [+]
```

The document remains continuous plain text, not a grid of responsibility cards. The member and Team administrator may edit it; every save shows the latest editor and time, while production records the revision. Existing responsibilities keep equal visual weight, one statement per row and a light separator. Only a row with a pending update gets the shared light-blue AI Button: a Sparkles icon plus visible “AI 建议” text. Its accessible name changes between “查看 AI 建议” and “收起 AI 建议” with the disclosure state; `aria-expanded` and `aria-controls` connect it to the read-only replacement statement, evidence disclosure, quiet “忽略” action and explicit “更新” Button directly under that row. The entry identifies an AI-authored proposal; it must not imply regeneration, automatic writing or that an update has already happened.

An add proposal is one read-only candidate row after the existing statements. It reuses their type size, line height and alignment, while a dashed marker, subtle inference surface and trailing plus distinguish it without relying on color alone. The trailing plus is the only write action; it is a Button with accessible name “添加责任” and applies the visible candidate text in one click. Evidence remains available from the same row, and the quiet ignore disposition remains available without competing with the plus. Proposal text is not editable in this compact projection; a member who needs different wording uses the document's separate edit mode. Proposal title, pending badge, explanatory copy, updated time, AI actor, rule version and ChangeSet remain stored but are not otherwise projected on this surface.

The surface uses shared Button, Select, Dialog, Textarea and Avatar APIs; personal information and Team context must not be recreated as an embedded right rail or page card. The title Select uses the existing active Team source of truth and routes a switch through the same unsaved-draft protection as leaving the responsibility editor. Reading mode splits the plain-text document into an unboxed full-width statement list; edit mode uses one compact Textarea per statement, with explicit add and remove actions, then serializes rows back to the same document. Do not require members to type blank lines. A human click atomically writes the visible proposal text, advances the document revision, records the action and removes the proposal from the active state. Update proposals carry their base revision, target paragraph position and expected original text. If only the revision changed while the expected text remains at the same position, the client may safely rebase before applying; a changed target blocks the update and must never fall back to append. Ignore removes only the proposal. Manual document editing and proposal application are mutually exclusive. Evidence, Coverage and decision history remain available for audit after either action, but there is no aggregate Coverage card on this surface. On mobile, title actions may wrap, the expanded update content stacks below its target, the “AI 建议” disclosure and icon-only add action both retain a 44px touch target, and the list must not create horizontal scrolling. A local-only prototype may state its capability boundary once as a quiet footer note, never as a top banner or side card. Do not introduce social-profile metrics, follower counts, activity charts, online status or decorative profile cards.

Textarea uses the shared `default` variant for short descriptions, `document` for sustained plain-text editing, and `responsibility` for one auto-growing responsibility row. Input and Textarea focus use one visible route-colored border, not a stacked border + ring + outline. Pages must not override native textarea height, padding or font size locally.

All human identity surfaces use the same `PersonAvatar` image/fallback anatomy, including Task Owner, participants, the avatar rail entry and “我的责任”. Selection state belongs to the surrounding selector or checkbox; do not overlay a check badge on the portrait itself. A status dot is allowed only when the product intentionally exposes an approved presence state.

### Routing path selector（视觉模式可参考；固定路径语义 inactive）

Three peer options appear together:

- `direct` — direct execution in existing permissions.
- `join_existing_task` — associate with an existing Task after its Owner confirms.
- `create_collaboration` — establish an Agreement before invitations and Task creation.

Selection uses route-soft background and a 2px blue leading edge. Only the chosen option reveals its confirmation action.

### Human decision record

Membership, access, context publication, and acceptance share a visual skeleton but retain distinct nouns, actors, evidence, and timestamps. Never collapse them into a generic “approved” component.

### Global notifications

按 D-146／D-181／D-183，全局通知是轻量顶栏右侧的 utility，位于头像之前，不使用一级模块选中态；D-183 已移除它左侧的独立主题按钮，主题改为头像菜单首项。桌面端复用共享 `Sheet`，从视口右侧展开，不保留旧侧栏偏移；面板依靠左边框与左向阴影建立层级，不明显压暗原页面，点击面板外可关闭。移动端面板占满视口；打开后焦点进入带标题描述的面板，Escape 或关闭按钮返回原铃铛。铃铛计数表示未读通知。未读角标使用由 danger 与 surface 混合得到的柔和红色、白字和 surface 色分隔边，紧贴铃铛右上角；零值隐藏，超过 99 显示 `99+`，完整数量写入触发器的可访问名称，不使用跳动或脉冲动画。旧左侧 Sheet 仅保留组件兼容，不构成恢复侧栏的理由；D-86 / D-88 / D-89 的通知语义不变。

通知列表只使用“全部 / 未读 / 已读”筛选，入口放在标题栏右侧的紧凑菜单中；选中项使用勾选和文字共同表达，不依赖颜色。铃铛数量表示未读，不表示待处理。列表只显示足以判断下一步的类型、动作摘要、来源与时间。协作邀请与责任转交详情在同一 Sheet 内展示“为什么现在提醒 / 范围与上下文 / 处理后的边界”，操作区只保留接受和拒绝；拒绝原因可选且私密，不使用羞耻或报警式视觉。Task 的“AI 建议”详情只作概览并跳回来源 Task。“AI 建议”使用推断语义色与来源图标，普通协作请求使用 route 语义，状态始终保留文字。

Task 的“AI 建议”通知详情是信息概览，不是处理面：第三段标题使用“信息边界”，主动作固定为“前往任务查看”。D-142 下跳转只按需展开来源记录，不恢复概览；具体来源 ID 失效时明确提示，不能用另一条建议顶替。通知内不得出现“处理缺口”、AI 稍后处理、事实反馈或模拟处理结果，本轮也不新增诊断处理面。协作邀请与 Handoff 仍可按其协议在通知内回应。

通知是原对象投影，不复制正文或权限。已读不能移出待处理；回应后的生效、失败、等待确认和失效必须明确区分。移动端列表行和所有回应控件保持 44px 触控目标；不使用摇铃、循环动画或未读焦虑动效。

### Task list and Task files

The Task module has one canonical flat task set and no Folder sidebar, list / directory switch, directory count, or directory restoration action. Under D-146 / D-148, the app opens a compact left task list alongside the selected detail on desktop, below one lightweight workspace topbar; there is no persistent module rail or mobile navigation drawer. Task creation, filtering and tag management stay in the list context. The list never indents by `parentTaskId`; parent navigation stays in the Task breadcrumb and direct children stay in the Subtasks tab.

The left list is an object index, not a set of scaled-down detail cards: each row shows only the task name and selection state, with no task icon, status, date or other metadata. Other task information remains in the existing right detail. Task selection changes only the right pane; keep query, filters, selected tag and list scroll mounted, including when temporarily visiting creation or tag management. No task is preselected; an unselected right pane has one quiet instruction, not a dashboard. On narrow screens show one pane at a time and return to the same list context. The existing board uses the same filtered task set and remains a view, not a new module.

“按标签查看” is one compact selection control whose menu shows only tag names and selection state, with tag management inside the menu, not a multi-row tag grid. It uses the existing flat multi-tag definitions, not a TagGroup or Folder domain. Per-tag counts are currently hidden; retain their projection and use the same scope if counts are shown in future: derive each tag count from the common query / owner / status scope before applying the selected tag. Multi-tag counts overlap and must not be summed as a total. Preserve the selected tag on rename, fall back to all tags on deletion, and keep unrelated filters. Unknown data or front-end team switching must never imply permission enforcement.

Task detail keeps its existing card language. Its hero is one tone-aware summary card containing the shared `TaskIcon`, task title and goal, followed by the existing “负责人 / 参与人 / 状态 / 截止时间” fields. Compact owner and participant controls show avatars without repeating names underneath. Reuse `MemberSelector`, `TaskStatusBadge` and the current shared `TaskDueDatePicker`; page-local avatar, status or date controls are not allowed. D-142 uses one compact underline tablist: Discussion, Subtasks, Files and Activity. Discussion is the implementation's default entry; there is no Overview panel or duplicate progress / AI workbench. The task tone may organize identity but never replace written status.

There is no independent Team File module in the current product surface. Task detail owns the File entry and renders the current Task's ACL-visible File / reference set directly, without a people selector or per-person switching. A Task may still present its internal file hierarchy, current version, visibility summary and source path using the shared File components; these projections never duplicate File, FileVersion, TaskFilePlacement or ACL truth. Front-end Mock visibility editing must state that saving affects only the current session and does not perform ACL evaluation, authorization, revocation, persistence, or audit.

### Task and todo views（列表视觉可参考；看板 / 自定义视图语义 inactive）

> **历史区块边界：仅限本标题下方折叠的 “Historical task / todo view specification”。**其中的 `canonical`、`fixed`、`must`、默认看板、时间线、自定义视图和拖拽等表述只记录旧方案，不具备当前规范效力；新设计不得据此恢复这些产品结构。当前只可抽取列表的密度、排序可读性和权限不扩张等视觉 / 通用原则，产品入口与状态必须回到 product-v2 和决策台账判断。后续同级的 `Context package` 仍是有效的上下文边界规范。

<details>
<summary>Historical task / todo view specification（legacy / inactive）</summary>

A **view** is a named, reusable task or todo entry that determines which permitted records are presented, how they are sorted, and which supported result layout is used. A view opens a collection of records; it does not open a specific record's detail page. Views are divided into two sources:

- **System default views:** stable, product-owned entry points that work without configuration. Their names and filter definitions cannot be edited or deleted by users.
- **User custom views:** user-owned combinations of filters and sorting generated from a described work scenario. They may be renamed, updated, or deleted by their creator, but can never expand the creator's underlying data permissions.

The contextual directory uses one continuous section named **“视图”** rather than separate “默认视图” and “自定义视图” sections or subheadings. Product defaults appear first, followed immediately by user custom views and the custom-view creation entry. Every saved view identifies its origin in supporting metadata: **“默认”** for product-provided views and **“自定义”** for user-defined or demo custom views. The task sidebar contains only this view directory; it does not add a second task-navigation section. A demo custom view is labeled **“自定义 · 示例”** rather than presented as a view the user has already created. Each custom-view row exposes an overflow action only on pointer hover, keyboard focus, or touch-capable layouts. Its menu includes visibility configuration and deletion; system-default views have no deletion action. Deleting a custom view removes only its saved query, layout, and visibility configuration, never the tasks in its result.

#### Historical view snapshot（legacy / inactive）

| Object | Source | View | Definition |
| --- | --- | --- | --- |
| Task | System default | 任务看板 | The only system-default task view. Shows every visible global task in stable lifecycle columns: 待接受、进行中、待验收、已完成. |
| Task | Demo custom | 任务时间线 | Visible tasks whose planned start/end overlaps the saved date window, laid out by task-level schedule and dependencies. |
| Task | Demo custom | 任务列表 | Visible global tasks presented as a compact sortable table with task status, current stage, stage owner, stage progress, task owner, and due date. |
| Todo | System default | 未完成 | Visible Todos with `completed=false`. |
| Todo | System default | 已完成 | Visible Todos with `completed=true`; title and description are struck through. |
| Todo | Demo custom | 今日待办 | Visible, incomplete Todos due on the current local date. |

Task views and todo views are separate saved-query namespaces. A task view cannot silently become a todo view, and switching product destinations restores the last selected view for that destination independently.

Selecting any task view displays that view's detail in the main area: its name, origin, visibility or scope explanation, effective record count, filter summary, and task result. The sidebar never renders concrete tasks and does not provide a “视图 / 任务” tab pair. Concrete tasks are opened from the selected view's main result. **“任务看板”** is the single system-default task view; all other task views are custom views owned by a user.

The global task board groups **tasks, not stage-generated todos**. Its column state is the task-level lifecycle and remains stable while the current stage or its todo set changes. Current stage, stage owner, stage progress, risk, and due date are task-card metadata. Advancing a stage regenerates stage todos inside the task but does not move the task to another board column. Dragging a task card explicitly changes the task-level state; it never auto-completes a stage or skips owner confirmation. Blocking, risk, and overdue conditions are represented by status badges, filters, or custom views rather than permanent primary columns.

The demo custom **“任务时间线”** is also task-level. It uses the MIT-licensed [SVAR React Gantt](https://github.com/svar-widgets/react-gantt) as the canonical timeline component rather than maintaining a page-specific CSS grid. Each row represents one task and uses the task's planned start/end, progress, current stage, owner, and optional predecessor. The timeline is read-only in this surface: selecting a row opens canonical task detail, while date/progress changes happen through task editing rather than drag gestures in the saved view. It must not render internal stage todos as if they were global tasks.

The demo custom **“任务列表”** uses the same global task records as the board. It is a custom view rather than a second navigation tree: the saved view owns its filter, sort, visible columns, and visibility scope, while each task title opens the canonical task detail. The list must not be duplicated underneath the sidebar view directory.

#### View, search, and display-group boundary

Do not treat a task directory or display group as a saved view:

- **View:** determines which records enter the result set, their saved sort order, and the supported layout used to present the collection.
- **Search:** temporarily narrows the currently selected view; it does not alter or save the view definition.
- **Display group:** organizes the already-filtered result into headings such as task state, associated task, owner, or due date. It changes presentation only and does not add or remove records.
- **View detail:** the main-area result of the selected view. It contains the view definition and its permission-filtered task records; clicking a board card, timeline row, or equivalent record enters the task detail.

The main-area view detail is the single task-collection surface. Do not duplicate those records into the sidebar as a tree, list, collapsible section, or secondary tab.

The effective result is evaluated in this order:

```text
用户权限范围 ∩ 当前视图条件 ∩ 当前搜索条件 → 视图排序 → 展示分组
```

Counts shown beside a view or group are calculated from the permission-filtered data. Clearing search restores the full selected view; switching views keeps the search query and recomputes the intersection so the relationship remains visible and predictable.

#### View ownership and visibility

Every custom view has exactly one owner. A newly created custom view defaults to **“仅自己可见”**. Only the view owner may change its visibility scope; other viewers see the scope as read-only metadata.

Supported scopes are:

- **仅自己可见:** only the owner can discover and open the view.
- **任务协作者可见:** people who can already access at least one task returned by the view may discover the view; each person still sees only records they are individually allowed to access.
- **组织内可见:** organization members may discover the view, but the view never grants access to any underlying task.

Visibility controls access to the saved filter, sort, layout, and view name. It does not change task membership, task permissions, source permissions, or the effective result intersection. The sidebar shows the active scope next to every custom view. An owner-only three-dot action menu exposes exactly two operations: **“配置可见范围”** and **“删除视图”**. Visibility configuration opens a focused Dialog and uses the canonical shadcn Select component to choose the scope, with explicit cancel and save actions; do not use a browser-native select or place a second set of radio choices directly inside the action menu. Deleting a view always requires an Alert Dialog confirmation and removes only the saved view configuration, never its underlying tasks.

#### Creating a custom view with local AI

“创建自定义视图” opens a guided dialog rather than immediately adding a sidebar item. When no local AI is connected, the dialog:

1. explains that a connected local AI converts the user's scenario into filters and sorting;
2. offers an example scenario description appropriate to tasks or todos;
3. provides a single primary action, **“连接本地 AI”**.

No custom view record is created, no success state is shown, and no generated query is implied before the connection exists. After connection, the user describes the scenario in natural language; the local AI proposes structured filter and sorting conditions. The user previews those conditions and explicitly confirms before the view is saved. Every proposed condition is evaluated within the user's existing access scope, and missing access is surfaced rather than bypassed.

</details>

### Context package

A Personal Agent Work Package is the reviewed payload sent from a product object to a user's local AI tool. D-155／D-157 的当前连接只带上下文：当前任务或讨论原文与必要关联信息在同一个“带入的信息”区按行展示，不另套原文卡，不展示或默认导出工作要求与期望成果；具体要求由用户在工具中提出。

<details>
<summary>历史四槽方案（保留参考，不作为当前讨论连接的展示或导出合同）</summary>

The earlier package design used four slots:

1. **Current work object / 当前处理内容** — the exact object from which the user invoked the Agent, such as an activity, reply, selected document passage, file, todo, Responsibility, decision, or whole task.
2. **Related context / 一并带入的信息** — the minimum authorized information directly related to that object: parent task, current Responsibility or processing point, people, source references, prior decisions, or related files.
3. **Instruction / 希望 Agent 完成** — the explicit operation requested by the entry point or selected by the user, such as analyze, reply, modify, complete, compare, or summarize.
4. **Expected output / 期望带回的成果** — the result shape that can return to collaboration, such as a reply draft, judgment, revised file, patch, todo result, risk, or unresolved question.

The package is assembled by the connection entry, not inferred from presentation labels inside the dialog. The dialog previews and confirms the package; it does not invent missing intent.

#### Generation rules

- The current work object is always included verbatim or by immutable reference.
- Related context follows direct product relationships and uses the smallest sufficient scope.
- Immediate object content has priority over task background; task background must not obscure the user's current focus.
- All context is filtered by the current user's data permissions before preview and transfer.
- Source text, authorship, reply relationships, and provenance remain distinguishable from AI summaries.
- The requested instruction and expected output are explicit fields. They must not be guessed from generic labels such as “continue work.”
- Users can review what crosses the boundary. Future selectable context controls must operate on the related-context slot without removing the current work object.
- Private local-Agent conversation is not part of the return payload unless the user explicitly selects content from it.

#### Entry mapping

| Entry | Current work object | Related context | Instruction | Expected output |
| --- | --- | --- | --- | --- |
| Activity | Activity text, author, timestamp | Task, current Responsibility / processing point, quoted source, related replies | Understand, judge, reply, or continue processing | Advice, reply, action items, or risks |
| Reply | Target reply and reply-to relationship | Parent activity, Task, current Responsibility / processing point, source | Compose or improve a reply | Reviewable reply draft |
| Document selection | Selected original text and location | Document, task, related discussion | Analyze, explain, rewrite, or compare | Conclusion, revision, or cited explanation |
| File / change | File or revision reference | Task goal, rules, prior revision | Review, modify, test, or compare | Revised file, patch, review result, or test evidence |
| Current responsibility | Accepted Responsibility | Goal, sources, intended recipient | Continue the accepted responsibility | Reviewable conclusion and work product |

</details>

Task Activity 和 Reply 的紧凑连接入口使用统一的浅蓝方形 Sparkles 图标按钮；页面级明确动作可以保留文字标签。Task 详情不再提供逐项 Responsibility 分配或按人员切换的连接入口。

D-155 在讨论区只保留整条 Discussion 右侧和回复编辑区 @ 右侧两处连接，移除回复操作旁及已发布子回复的重复入口；D-157 另将已有任务头部的“AI 调整”替换为仅显示 Sparkles 图标的“连接 AI”入口，保留悬浮提示和无障碍标签。任务头部只核对上下文和选择工具，不再打开字段调整浮层；创建与子任务调整不受此次替换影响。三处共用四种工具及真实 Logo，“带入的信息”统一展示当前对象、必要任务背景、相关讨论或当前草稿与来源；不展示“希望 AI 完成／期望成果”，不把被删掉的要求偷偷导出。整任务入口读取实际字段和已提供的关联摘要，不导出示例标准、旧摘要或完整文件；待接受人员和未核验文件快照需明确标记。原文和草稿保持可读，长内容内部滚动；打开、关闭不改任务、不发布或清空回复。普通鼠标点击不描边整个讨论串；键盘焦点范围限于原消息或操作控件，来源跳转短暂浅底提示原消息。全局连接和自动变更 Activity 入口仍不恢复，工具列表不冒充安装检测，尝试唤起不冒充连接成功。

D-172 在“我的工作”头部增加带文字的共享浅蓝“连接 AI”按钮；其单独 CLI 弹层要求已由 D-177 局部替代，无工作上下文限制已由 D-178 局部替代。该按钮直接复用任务／讨论已使用的 `AiConnectionDialog` 及其 ChatGPT、Claude Code、CodeBuddy、Cursor 四产品选择；“带入的信息”取 `personalWorkbenchModel.ownedTasks` 的完整正式负责任务列表，每项仅含 Task ID、名称与真实状态，不带当前情况、责任类型、期限、时效、actions／priorities、讨论、文件或详情，空列表只标 `meta=0`。顶栏、一级导航与全局连接页仍隐藏。产品选择、复制或尝试唤起不得写成设备检测、握手成功、Agent 接单或自动回写；复用共享模态的遮罩、Esc／关闭与焦点管理，关闭后焦点返回触发按钮。页面级带文字动作使用共享 Button `variant="ai"` 与 `size="sm"`，窄屏保持触摸目标。

紧凑连接入口使用共享 Button `variant="ai"` 与 `size="icon-sm"`；页面不得通过局部 CSS 重画其背景、颜色、圆角或控件尺寸。

Task 详情中承载成组信息的“AI 建议”使用 `--ad-radius-card`；不得引用未进入 Token 标尺的页面级圆角。

The current preview uses one information section across all three entries, preserves source identity and raw text, and keeps contextual material separate from executable instructions in the exported package.

## 7. Motion

- Default transition: 160ms `cubic-bezier(.2,.8,.2,1)`.
- Routing Thread reveal: 240ms, only when a route changes or a new confirmed node is added.
- No idle ambient animation.
- No bouncing decorative characters.
- `prefers-reduced-motion: reduce` disables path drawing and transforms.

## 8. Content design

- Use user-recognizable nouns: “资料权限”, not “Access Grant config”.
- Buttons state the effect: “邀请王敏加入”, “允许读取退款重放记录”.
- Separate system suggestion from human decision: “建议创建协作” versus “已确认创建协作”.
- Empty results preserve the original problem and offer a next path.
- Errors identify what failed, what remains safe, and the recovery action.
- Never claim “已解决” until all required acceptances apply to the same Deliverable revision.
- “协作缺口”描述 Task 尚缺的判断、证据、权限或独立结果，不等同于子任务、人员责任或邀请。每项缺口都允许暂不分配、由 Owner 处理或准备邀请草稿。
- 只有独立结果、独立验收、可独立推进与结果返回同时成立时，才展示“建议转为子任务”；必须先展示依据、父任务与初始 Owner，再由用户明确确认创建。

Domain / code names do not have to become interface labels. If the corresponding proposed profile is used, prefer these user-facing effects:

| Domain term | Preferred UI label |
| --- | --- |
| Handoff | 工作交接 |
| context-only | 共享接续上下文 |
| result-return | 交回结果 |
| responsibility-transfer | 移交这项责任 |
| owner-transfer | 移交任务负责人 |

Never expose profile strings such as `owner-transfer` as primary copy. “交接 / 接续” describes continuity; “移交” is reserved for an explicit responsibility effect; “交回结果” does not imply the parent Task has accepted or finished.

## 9. Accessibility and responsiveness

- Target WCAG AA contrast for body text and controls.
- Keyboard focus is always visible and never removed.
- Every icon has a text label or accessible name.
- Interactive targets are at least 44×44px on touch layouts.
- Below 960px, the decision rail moves below the prepared brief.
- Below 640px, the sidebar becomes a sheet and evidence metadata wraps beneath the claim.
- Do not hide evidence provenance on mobile.

## 10. Historical screen composition（legacy / inactive）

```text
┌──────────────┬───────────────────────────────────┐
│ icon rail │ contextual list │ Work Request title · current state │
│           │                 ├─────────────────────┬──────────────┤
│ home      │ hidden on home  │ prepared brief      │ next action  │
│ requests  │ request list    │ evidence ledger     │ task summary │
│ tasks     │ task list       │ people & reasons    │ primary action│
│ spaces    │ space list      │ routing thread      │              │
└──────────────┴─────────────────────┴─────────────┘
```

该构图只保留“中心解释、侧栏承载一个下一决策”的视觉启发；Work Request、Spaces 与固定导航不再是 canonical 产品结构。

## 11. Anti-patterns

- Do not turn the landing view into analytics cards and charts.
- Do not show people as a social marketplace or leaderboard.
- Do not use chat bubbles as the primary shared-context model.
- Do not pre-create assignees while still discovering the problem.
- Do not make every object a floating rounded card.
- Do not use color without semantic meaning.
- Do not label invitation, access, publication, or technical review as business acceptance.

## 12. External component foundation

AgentDoor uses mature open-code components as foundations rather than repeatedly drawing behavior-heavy controls from scratch.

- **shadcn/ui is the preferred behavioral and structural foundation** for Button, Dialog, Alert Dialog, Select, Combobox, Command, Popover, Dropdown Menu, Table, Pagination, Form controls, and related primitives. Use its official documentation and registry examples first, then adapt all typography, spacing, radius, color, and elevation through AgentDoor tokens and shared APIs.
- **When external discovery is triggered, 21st.dev is a preferred source for visual anatomy and interaction references, not a per-task requirement.** Reusable selected component IDs, adaptation decisions and install references are documented in [AgentDoor × 21st.dev Component Selection](./agentdoor-21st-component-selection.md).
- shadcn/ui and 21st.dev are inputs, not parallel visual systems. Adopt behavior, adapt appearance, preserve attribution, and expose only one AgentDoor-owned component API to product pages.
