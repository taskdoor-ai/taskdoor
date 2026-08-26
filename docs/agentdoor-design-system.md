# AgentDoor Design System（待按 V2 重构）

> 本文仍包含固定阶段、看板、时间线和自定义视图等历史设计。2026-08-26 之后的产品与实现判断以 [产品定义 V2](./product-v2/README.md) 为准；视觉 Token 仍可参考，产品结构不再视为 canonical。

> 项目基调、工作流和规则优先级见 [项目工作宪章](./product-v2/00-project-operating-charter.md)。本文只对视觉、内容、交互品质、组件治理和无障碍负责，不能反向定义产品对象、状态、权限或导航。

### 有效性地图

| 内容 | 当前效力 |
| --- | --- |
| Design thesis、质量门槛、组件研究、Token / 复用治理、颜色、排版、间距、动效、内容、无障碍、反模式 | 有效；实施必须遵守 |
| Work Request、固定 Routing Path、Space、强阶段 / Stage、看板、时间线、自定义视图和旧 Canonical screen composition | `legacy / inactive`；仅供历史参考，禁止作为 V2 产品或实现依据 |
| 与 Task、Todo、Responsibility、Handoff、Decision、File 和“我的工作”有关的产品语义 | 以 product-v2 与决策台账为唯一依据 |

> Follow-up `DS-V2-01`：把折叠的旧 Work Request、固定阶段、看板、自定义视图与固定导航全文迁入独立历史文档。Work Owner：设计系统维护者；触发条件：移除“待按 V2 重构”状态，或开始实现新的 Task / 导航 UI 前；验证：现行设计系统正文不再命中 `remain fixed`、`only system-default` 等旧强制句，历史链接仍可访问。

> Version 0.30 · 2026-08-26  
> Visual direction: **Routing Surface / 路由界面**

## 1. Design thesis

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
- **Coherence:** Home, Tasks, Todos, Settings, and AI connection may have different jobs, but they must unmistakably belong to the same product.

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

### Mandatory design preparation protocol

Any new surface, redesigned flow, or new reusable component must complete this sequence **before implementation**. This is a release gate, not optional inspiration:

1. Read the current product definition, this design system, and adjacent AgentDoor surfaces. Audit existing patterns before reusing them; consistency must not preserve a weak interaction.
2. Use the `frontend-design` skill for new or materially reshaped UI, and record which visual and interaction principles it changes.
3. Research mature, positively adopted primitives before drawing a custom control. Search the project's curated foundation first, then 21st.dev and established open-source repositories. Create or update the required Component Research Record under `docs/component-research/`; record a concise **adopt / adapt / reject** decision and verify license, dependencies, maintenance, accessibility, framework fit, usage signal, and visual fit.
4. Reuse AgentDoor's canonical interaction grammar: Dialog for focused create/edit, Alert Dialog for destructive confirmation, Select or Combobox for selection/search, Badge for compact labels, and Table/List for dense collections. A page-specific interaction may diverge only with a documented product reason.
5. Define the object model, required states, empty/loading/error/permission behavior, keyboard path, and responsive behavior before visual polish.
6. Implement with semantic `--ad-*` tokens and shared components. Do not duplicate a visual pattern as page-local markup or accept arbitrary color values where curated semantic choices exist.
7. Verify with a production build, interaction checks, keyboard/focus checks, and rendered screenshots at desktop and mobile sizes. Critique the screenshots for hierarchy, density, alignment, unfinished copy, and product coherence; revise before handoff.

“Pure handcrafting” is not a virtue by itself. When a suitable mature primitive exists, source-adapt it and preserve attribution; custom implementation is reserved for AgentDoor-specific domain semantics that established components cannot express.

#### External component discovery gate

For a new page, materially redesigned workflow, or reusable component, external discovery is mandatory **before the first visual implementation**. The designer or agent owns this work; the user must not be expected to spend their time finding the component.

Use this search order:

1. **AgentDoor foundation:** inventory existing `src/components/ui`, product components, Token variants, and two adjacent screens.
2. **21st.dev first pass:** search the exact interaction noun and related category; inspect Popular as well as visually relevant results. Record usage counts when available, dependencies, source code, and installation method. A high count is a useful adoption signal, not proof of product fit.
3. **Accessible foundation:** check shadcn/ui and its registry, Base UI, React Aria, or Radix for behavior-heavy controls. Prefer these for Dialog, Combobox, Select, Menu, Tooltip, Calendar, focus management, and keyboard behavior.
4. **Application patterns:** check maintained collections such as Origin UI and Tremor for forms, settings, filters, tables, pagination, dashboard, and enterprise application compositions.
5. **Visual and motion patterns:** check 21st.dev Popular, Motion Primitives, and other maintained open-source collections when motion or a distinctive interaction materially improves comprehension. Decorative popularity must not override product clarity.
6. **Focused GitHub search:** search the component/interaction plus the project's stack. Prefer original repositories and official documentation; inspect license, recent maintenance, open issues, framework version, accessibility approach, bundle/dependency impact, and whether the code can be adapted without importing a second design system.

Every research record must contain at least three serious candidates unless the search space genuinely has fewer, normally including one 21st.dev candidate and one maintained official/GitHub implementation. For each candidate state:

- the exact URL and component name;
- evidence of maturity or adoption;
- interaction and accessibility strengths;
- dependency, license, and maintenance risks;
- visual fit with AgentDoor and the amount of adaptation required;
- one of **adopt**, **adapt**, or **reject**, with a concrete reason.

The final selection may combine layers—for example, Base UI behavior with a 21st.dev visual anatomy—but must produce one AgentDoor-owned shared API. Copying a component into a single page without Token adaptation, attribution, state coverage, and reuse does not count as successful adoption.

When no candidate is suitable, the research record becomes the evidence that custom work is justified. “Faster to hand-code” and “I already know how” are not acceptable reasons.

### Design system governance and reuse

AgentDoor has one visual and interaction system. Pages may express different jobs, but they may not invent independent typography, button styles, card language, form behavior, spacing scales, or navigation patterns. A design change is incomplete until the reusable part has been incorporated into the design system.

#### Token hierarchy

All reusable visual decisions must enter the system through the appropriate layer:

1. **Foundation tokens:** raw color, typography, spacing, radius, shadow, motion duration, easing, and breakpoint values.
2. **Semantic tokens:** meanings such as surface, text hierarchy, border, primary action, danger, success, focus, selection, and disabled state.
3. **Component tokens:** shared decisions for Button, Input, Select, Dialog, Badge, Card, Table, Navigation, and other canonical components.
4. **Pattern tokens:** page-shell width, header spacing, toolbar rhythm, list density, detail layout, and responsive transitions shared across multiple surfaces.

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

#### Continuous contribution loop

Every design and implementation task must leave the system stronger:

1. Inventory relevant tokens, components, and adjacent patterns before designing.
2. Identify what can be reused and what gap genuinely exists.
3. Implement the gap as a token, variant, shared component, or documented pattern.
4. Replace nearby duplicates when the new shared solution makes them obsolete.
5. Update this specification and the component selection record in the same change.
6. Capture representative desktop, mobile, hover, focus, empty, loading, error, and disabled states.
7. Compare the changed surface with at least two adjacent AgentDoor surfaces before handoff.

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

- `npm run design:check` measures registered design debt and fails when hard-coded colors, sub-12px font declarations, native Select/Dialog elements, page-level primitive overrides, duplicate UI exports, or global stylesheet size increase above the checked-in baseline.
- Forbidden implementation copy such as “Default List” fails immediately and is never grandfathered into the baseline.
- `npm run verify` is the required local and CI handoff command. It runs the design check before the TypeScript production build.
- The baseline is a debt ceiling, not an allowance. It may only stay unchanged or decrease; raising it requires explicit human design approval and a written reason in the change record.

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
- Avoid gradients, glass effects, saturated dashboard charts, and colored card mosaics.
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
- Main desktop grid: `minmax(0, 1fr) 320px`; stack below 960px.

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

Minimum height is 36px desktop and 44px touch. Loading preserves the original label width.

### Select

All predefined single-choice dropdowns use the shared shadcn-style `Select` backed by Base UI. Pages may set width and size through the shared API, but must not redraw the trigger with transparent, dashed, borderless, or sub-12px page-specific styles.

- Trigger anatomy is fixed: text value, quiet surface, soft border, control radius, focus ring, and one trailing Chevron. The Chevron is a functional affordance, not a business icon.
- Items are plain text by default. Do not place avatars, classification-tag icons, colored `TagBadge` components, or decorative leading icons inside ordinary Select options.
- The selected Check indicator and long-list scroll arrows remain because they communicate selection and overflow state.
- Use Group and Label for small categorized sets. Use Combobox instead when a list is large enough to need search.
- Compact Select uses the shared small control height and `--ad-select-compact-min`; it never reduces typography below the global 12px floor.
- Three-dot action menus use the same quiet popup surface, border, radius, shadow, option height, and focus treatment. Ordinary menu options are plain text; do not add a leading Pencil, Trash, Plus, or other redundant icon when the action label is already explicit. Do not divide a short action menu with horizontal rules; use popup padding and visible vertical spacing between options. Destructive color communicates deletion.

### Classification tag

A classification tag is identity metadata, not lifecycle status. Every surface that displays a tag uses one shared `TagBadge`; list rows, task detail, filters, pickers, and management previews must not re-create it with local chip markup.

- Anatomy is fixed: **user-facing name + user-selected Lucide icon + curated soft background palette**. Text and icon remain present, so color is never the only identifier.
- The visual foundation source-adapts the 21st.dev Status Badge and shadcn Badge mechanics. AgentDoor changes the meaning from system status to user-managed classification.
- Radius is 6px, not a full pill. Compact height is 24px and standard height is 32px; icon size is 12–16px. Do not shrink tag text below the global 12px readability floor.
- Icons come from a reviewed Lucide registry exposed by the product. Do not dynamically import arbitrary icon names or introduce a second icon library for the same job.
- Colors source-adapt the user-selected 21st.dev Status Badge relationship: Tailwind 50/100-like pastel backgrounds, lively same-hue foregrounds, and an almost invisible boundary. Users choose a named swatch; they do not enter arbitrary hex values.
- Classification color should feel light but recognizable. The background carries softness, while the icon and name carry color identity; small-size foregrounds are slightly darker than the reference component to retain readability. Tags must remain distinct from lifecycle status, warnings, and primary actions.
- Tag groups are organizational drawers, not a second taxonomy object users must configure before tagging work. The management-page header only creates a tag group; labels are created from the “添加标签” action inside their destination group, so every new label has an explicit home and the page does not repeat equivalent creation paths.
- Create and edit use the same focused Dialog with tag group, name, icon, color, and live preview. Tag group and name are stacked as two full-width rows, with tag group first; do not compress these conceptually different fields into a two-column line. Deletion uses Alert Dialog and states its cross-task effect.
- The tag editor is a compact appearance workbench, not a divider-heavy settings form: a quiet preview surface sits beside compact icon and curated-color controls on desktop and stacks above them on mobile. Use surface contrast, spacing, and selection elevation before adding borders.
- Dialog chrome uses one soft outer boundary and elevation. Header, body, and footer must not be split by repeated horizontal rules; the title icon, concise helper copy, and live preview provide structure. Cancel is quiet, save is the only primary action.
- The management surface must expose edit and delete actions without turning the table into an inline form. Filters and task detail use the canonical Select/Combobox pattern.
- The management surface presents **one tag group per card** in a responsive grid. Tags remain compact badges inside their group card; do not introduce a left-side group selector, a master-detail panel, one card per tag, or stretched table rows when the group has no additional detail to carry.
- Group cards are content-adaptive: header = group identity + count + one overflow menu; body = editable tag cloud or compact empty state; footer = one quiet “添加标签” action. Rename and delete belong in the overflow menu instead of being repeated beside every tag.
- The group overflow menu uses “编辑标签组” rather than a narrow “重命名” action. The focused group editor owns group name, group position, tag order, tag removal, and the destructive group-delete entry, so structural operations are discoverable in one place.
- Reordering must have a keyboard-complete path. Until the shared system includes an accessible drag-and-drop primitive with announcements and touch handling, expose explicit up/down controls with position numbers; do not ship pointer-only dragging or a decorative grip that does nothing.
- Creating a tag from inside a group inherits that group and omits the redundant group selector. Editing may expose the shared group Select so an existing tag can be moved.
- Palette values must be consumed through `--ad-tag-{name}-{bg|ink|border}` tokens. Management, task detail, lists, filters, and previews must render the same `TagBadge` component rather than copying its color classes.
- Tag selection exposes a two-level information hierarchy inside one panel: **tag-group heading → immediately visible tags**. This is grouped navigation, not a hover submenu or cascader; users select a tag in one click and never have to open a second floating panel. Multi-select and searchable surfaces use the shared shadcn Combobox composition with grouped collections and chips; small single-select filters may use the shared Select with `SelectGroup` and `SelectLabel`.
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

### Person recommendation

Required fields:

- Person or Agent identity.
- Suggested role: responsibility, capability, contribution, or authorization.
- Plain-language reason.
- Evidence source and freshness.
- Uncertainty and alternative path.

Never show a universal “match score”. If ranking is useful, use ordinal language such as “优先建议” and explain why.

### Routing path selector（视觉模式可参考；固定路径语义 inactive）

Three peer options appear together:

- `direct` — direct execution in existing permissions.
- `join_existing_task` — associate with an existing Task after its Owner confirms.
- `create_collaboration` — establish an Agreement before invitations and Task creation.

Selection uses route-soft background and a 2px blue leading edge. Only the chosen option reveals its confirmation action.

### Human decision record

Membership, access, context publication, and acceptance share a visual skeleton but retain distinct nouns, actors, evidence, and timestamps. Never collapse them into a generic “approved” component.

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
| Todo | System default | 待处理 | Visible todos that still require action; excludes “已完成”. |
| Todo | System default | 已完成 | Visible todos whose todo state is “已完成”. |
| Todo | Demo custom | 今日待办 | Visible, unfinished todos due on the current local date. |

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

A Personal Agent Work Package is the reviewed payload sent from any product object to a user's local AI tool. It is not a fixed task template and it is not a chat transcript. Every connection entry must provide the same four slots:

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
| Todo | Todo content and assignee | Responsibility, sources, completion criteria | Complete or plan the todo | Todo result, evidence, or blocker |
| Current responsibility | Accepted Responsibility | Goal, sources, acceptance criteria, intended recipient | Continue the accepted responsibility | Reviewable conclusion and work product |

The package preview uses the same four labels across all entries. Only their values change. This keeps the mental model stable while preserving the meaning of the object that initiated the connection.

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
- **21st.dev is the preferred discovery source for visual anatomy and interaction references.** The canonical mapping, selected component IDs, adaptation decisions, rejected alternatives, and install references are documented in [AgentDoor × 21st.dev Component Selection](./agentdoor-21st-component-selection.md).
- shadcn/ui and 21st.dev are inputs, not parallel visual systems. Adopt behavior, adapt appearance, preserve attribution, and expose only one AgentDoor-owned component API to product pages.
