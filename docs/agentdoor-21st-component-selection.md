# Agentdoor × 21st.dev Component Selection

> Curated 2026-08-26. This selection starts with the 21st.dev component catalog and records supporting open-source foundations; no AI-generated component is accepted without source review.

## Selected foundation

| Agentdoor need | 21st component | ID / registry slug | What we keep | What we change |
| --- | --- | ---: | --- | --- |
| Product navigation | [Sidebar Light](https://21st.dev/@inference-sh/components/sidebar-light) | `19361` | Recursive groups, active route, lightweight source | Warm paper surface, 232/64px widths, explicit “待我确认” count, remove generic dashboard vocabulary |
| Five visible stages | [Stepper](https://21st.dev/@originui/components/stepper) | `769` | Horizontal/vertical orientation, active/completed/loading state model, keyboard-capable triggers | Freeze labels to 已定位/待确认/执行中/待验收/已解决; assembling remains under 待确认; add rejection return state |
| Source bundle | [AI Sources](https://21st.dev/@educalvolpz/components/ai-sources) | `23817` | Collapsible source snippets, reduced-motion support, typed source data | Replace web favicons with connector/object marks; add freshness, access scope, evidence type, and conflict state |
| Inline provenance | [AI Citation](https://21st.dev/@educalvolpz/components/ai-citation) | `23791` | Anchored citation card, origin-aware placement, keyboard/reduced-motion behavior | Show source title, captured time, permission scope, and immutable reference ID; no fabricated favicon |
| Routing choice | [Origin UI Radio Group cards](https://21st.dev/@originui/components/radio-group) | `747` | Radix radio semantics and card selection pattern | Three fixed paths; selected card uses 2px routing edge; descriptions explain consequences; one confirmation CTA below |
| People and roles | [Table with Avatars](https://21st.dev/@felipemenezes098/components/table-02) | `22178` | Responsive table, avatar fallback, concise row rhythm | Columns become candidate / suggested role / evidence / uncertainty; role distinguishes responsibility, capability, contribution, authorization |
| Decision/audit history | [Timeline](https://21st.dev/@nyxbui/components/timeline) | `1074` | Left/center/right placement, done/error/current states, composable content | One immutable event per human decision; separate Membership, Access, Publication, and Acceptance nouns |
| Structured brief frame | [Frame](https://21st.dev/@coss.com/components/frame) | `11474` | Header/panel/footer composition | Remove shadow and nested floating-card look; use one hairline outer boundary and section dividers |
| Global task board | [Trello Kanban Board](https://21st.dev/@koustubhayadiyala36/components/trello-kanban-board) | `koustubhayadiyala36/trello-kanban-board` | Horizontal columns, accessible task cards, drag-and-drop movement, responsive overflow | Use task lifecycle columns 待接受/进行中/待验收/已完成; show current stage as task metadata; dragging changes task state but never advances a stage |
| Global task timeline | [SVAR React Gantt](https://github.com/svar-widgets/react-gantt) | `@svar-ui/react-gantt` | Native React task bars, progress, dependencies, configurable scales, read-only mode | Use Chinese scales and Agentdoor tokens; show global tasks rather than stage todos; selection opens task detail and schedule editing stays outside the view |
| Classification tag | [Status Badge](https://21st.dev/@arihantcodes_1f7b8c4d/components/status-badge) | `arihantcodes_1f7b8c4d/status-badge` | Compact icon + label anatomy and same-hue soft surface treatment | Treat as user-managed classification, use 6px radius, curated Lucide icons and Radix-inspired palette; render through one `TagBadge` everywhere |

## Why these components fit

### 1. They are primitives, not a pre-made dashboard

Agentdoor's product model is unusual. A complete dashboard template would pull it back toward generic task management. These components provide interaction mechanics while leaving Work Request, Routing Proposal, Agreement, Access Decision, Context Publication, and Acceptance semantics under our control.

### 2. Their source is adaptable

- Sidebar Light is about 2.8 KB of component source and has no registry dependency bundle.
- Origin UI Stepper is composable and supports horizontal/vertical layouts.
- Origin UI Radio Group is built on Radix rather than a proprietary visual framework.
- AI Sources and AI Citation already respect `prefers-reduced-motion`.
- Table with Avatars uses ordinary shadcn Table and Radix Avatar primitives.
- Timeline exposes individual nodes rather than forcing a single event schema.
- Status Badge provides a proven compact anatomy. Agentdoor keeps its icon/label/color relationship but does not copy its fixed status vocabulary.

### Classification tag supporting foundations

- **Icons:** [Lucide](https://github.com/lucide-icons/lucide), already used by the project. Expose only a curated, product-reviewed subset so stored tag data remains stable and the picker stays scannable.
- **Color:** [Radix Colors](https://www.radix-ui.com/colors) as the contrast and light/dark scale reference. Map named choices to Agentdoor-owned background, foreground, and border tokens rather than persisting arbitrary hex values.
- **Primitive mechanics:** [shadcn Badge](https://ui.shadcn.com/docs/components/radix/badge) for composable badge and icon behavior; Agentdoor owns the classification semantics and visual tokens.
- **Creation flow:** canonical shadcn Dialog + Select, with a live `TagBadge` preview. Inline input plus a full-width “add” bar is rejected because it cannot explain icon, color, group, validation, or editing consistently.

### 3. They support Agentdoor's confirmation boundaries

The selected components can express state without merging distinct decisions. The Stepper is for user-visible progress; the Timeline is for immutable events; Radio cards are for a pending routing choice. They are intentionally separate.

## Composition by product surface

### Work Request routing page

```text
Sidebar Light
└── Work Request shell
    ├── Stepper (five visible stages)
    ├── prepared brief
    │   ├── AI Sources
    │   └── AI Citation
    ├── Table with Avatars (candidate roles and evidence)
    └── Radio Group cards (direct / join existing / create collaboration)
```

### Collaboration detail

```text
Sidebar Light
└── Frame
    ├── Agreement summary
    ├── participants table
    ├── access decisions
    ├── actions and handoffs
    └── Timeline (membership/access/publication events)
```

### Deliverable and acceptance

```text
Frame
├── Deliverable revision
├── AI Sources / AI Citation (frozen acceptance evidence)
├── required approvers
└── Timeline (accept / return decisions)
```

### Global task views

```text
Sidebar Light
└── View directory
    ├── Task Kanban (system default)
    │   └── Trello Kanban Board
    │       ├── 待接受
    │       ├── 进行中
    │       ├── 待验收
    │       └── 已完成
    ├── Task Timeline (demo custom)
        └── SVAR React Gantt (read-only task schedule and dependencies)
    └── Task List (demo custom)
        └── shadcn Table with task status and stage metadata
```

The Kanban board consumes global task records. Stage-generated todos stay inside task detail and are never promoted to Kanban cards. The custom timeline and task list share the same task records and change only the result layout and saved query definition.

## Components explicitly rejected

| Component | Reason |
| --- | --- |
| Workbench Sidebar `19357` | Glassmorphism and dashboard styling conflict with the warm paper direction. |
| Animated Sidebar `21517` | Drag-resize and spring effects add complexity without helping routing. |
| Reshaped Radio `17933` | Pulls in the full Reshaped package and theme for a primitive Radix already provides. |
| Process Timeline `1943` | Scroll-triggered marketing behavior is wrong for persistent workflow state. |
| Profile/Team marketing cards | Social links, glow, hover reveals, and portfolio framing misrepresent organizational evidence. |
| Interactive Logs Table `10635` | Good observability UI, but too technical and filter-heavy for human decision history. |
| Project Detail View `8248` | Reinforces a Task-first product model, conflicting with Work Request and routing-first semantics. |

## Implementation sequence

1. Install or copy Sidebar Light, Stepper, Radio Group cards, AI Sources, AI Citation, Table with Avatars, Timeline, Frame, Trello Kanban Board, and SVAR React Gantt.
2. Apply the semantic tokens from `styles/agentdoor-tokens.css` instead of retaining each component's default theme.
3. Rename props and types around Agentdoor domain nouns rather than preserving demo vocabulary.
4. Add Storybook or equivalent states for default, loading, empty, conflict, permission-hidden, rejected, and accepted.
5. Test keyboard navigation, responsive stacking, reduced motion, and color-independent status recognition.

## Install references

```bash
npx shadcn@latest add "https://21st.dev/r/inference-sh/sidebar-light?api_key=$API_KEY_21ST"
npx shadcn@latest add "https://21st.dev/r/originui/stepper?api_key=$API_KEY_21ST"
npx shadcn@latest add "https://21st.dev/r/educalvolpz/ai-sources?api_key=$API_KEY_21ST"
npx shadcn@latest add "https://21st.dev/r/educalvolpz/ai-citation?api_key=$API_KEY_21ST"
npx shadcn@latest add "https://21st.dev/r/originui/radio-group?api_key=$API_KEY_21ST"
npx shadcn@latest add "https://21st.dev/r/felipemenezes098/table-02?api_key=$API_KEY_21ST"
npx shadcn@latest add "https://21st.dev/r/nyxbui/timeline?api_key=$API_KEY_21ST"
npx shadcn@latest add "https://21st.dev/r/coss.com/frame?api_key=$API_KEY_21ST"
npx shadcn@latest add "https://21st.dev/r/arihantcodes_1f7b8c4d/status-badge"
```

Do not run these until a React/shadcn project exists in the workspace and its package manager, path aliases, and Tailwind version are known.

The Trello Kanban Board is currently source-adapted in the project from the linked 21st.dev component. Do not invent a registry install URL when the catalog does not expose a verified command; retain source attribution and adapt it through the project's existing shadcn primitives and design tokens.

SVAR React Gantt is installed from npm as `@svar-ui/react-gantt`. Its open-source core is MIT licensed and supplies the timeline, progress, dependency, scale, and read-only behavior; PRO-only scheduling, critical-path, baseline, and export features are not part of this prototype.
