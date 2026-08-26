# AgentDoor V2 协作流程组件研究

> 状态：research-partial / implementation-blocked
> 检索日期：2026-08-26
> 范围：渐进创建、人员比较、Handoff、团队文件与 Activity

## 一、需求

- 用户任务：从需求表达开始，逐步形成最小 Task Proposal；用户主动决定是否协作；候选人可解释比较；邀请、Handoff、结果交回和文件证据保持清楚。
- 交互关键词：progressive disclosure、editable proposal、candidate comparison、bounded invitation、handoff revision、file tree、activity event list。
- 技术约束：Vite + React + TypeScript + Tailwind 4；项目已有 Base UI、Radix Collapsible、Lucide、Motion 和 shadcn 风格共享组件。
- 产品约束：不能固定套用向导；不能暴露模型私有思维链；不能显示人员总分、在线状态、精确负载和响应速度；Handoff 的接受与生效必须分开。
- 状态覆盖：初始、准备中、可编辑、缺口、继续自己、协作展开、无候选、权限不足、版本漂移、澄清、拒绝、已同意待生效、已生效、交回待验收、空 / 错误 / reduced-motion。

## 二、搜索过程与工具边界

- 当前工具清单中没有可调用的 21st.dev / Magic MCP Server，也没有相关 MCP resource / template。不能把网页检索冒充 MCP 调用。
- 本轮通过 [21st.dev 公共组件目录](https://21st.dev/community/components?tab=home)、组件详情、上游官方文档与 GitHub 仓库做只读核验。
- 本轮没有下载组件、运行 registry install 或安装依赖。
- 本地 `shadcn info` 会访问官方 registry，但当前沙箱网络代理拒绝连接；不影响对已安装组件和公开来源的只读判断。

### 证据完整度

本轮足以决定“视觉上借鉴什么、哪些现有 primitive 可以继续用”，不足以授权复制第三方源码：

| 来源 | 采用 / 热度信号 | 维护 / Issue 信号 | 安装与本地状态 | 当前可下的结论 |
| --- | --- | --- | --- | --- |
| 21st 单组件页面 | 页面提供发布日期、源码和部分依赖，但不提供可靠使用量 / 下载量；显示的目录计数不能代表该组件采用量 | 多数组件没有对应仓库、release 与 issue 链，记为未知 | 本轮没有 Magic / 21st MCP，也未执行 Copy / CLI | 只可 `adapt anatomy`；逐条许可与来源确认前禁止复制 |
| [Vercel AI Elements](https://github.com/vercel/ai-elements) | 核验快照约 2k stars、20 个 releases | release 页显示 `1.9.0`（2026-03-12）；没有完成 Task 组件专项 issue 审计 | 官方文档给出 `npx ai-elements@latest add task`；本项目未安装，也不准备首轮安装 | 可借鉴信息结构，不能据此引入整套依赖 |
| Radix Collapsible | 本项目已直接使用，外部热度不是本轮采用依据 | 官方维护库；未做本轮专项 issue 清零 | 本地直接依赖 `@radix-ui/react-collapsible@^1.1.20` | 可复用现有行为层；仍需做本产品状态测试 |
| [Base UI](https://github.com/mui/base-ui) | 核验快照约 10.6k stars | 官方 release / changelog 持续更新；未做 Radio / Dialog 全部 open issue 审计 | 本地直接依赖 `@base-ui/react@^1.7.0` | 可复用项目现有 Radio / Dialog 行为，不代表无需回归测试 |
| [React Aria](https://github.com/adobe/react-spectrum) | 核验快照约 15.1k stars、29 个 releases | release 快照至少到 React Aria Components 1.17.0（2026-04-15）；未做 Tree 专项 issue 清零 | `react-aria-components` 不是直接依赖 | 只作行为基准；引入前另做依赖、bundle 与 issue 评估 |

以上 stars / release 数只记录检索当日公开快照，不作为质量替代指标。真正采用条件仍是许可、来源、维护、可访问性、依赖成本和 AgentDoor 语义同时通过。

## 三、渐进式任务创建 / AI Proposal

| 候选 | 来源与采用信号 | 行为 / 无障碍 | 依赖 / 许可 / 维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [21st AI Planning](https://21st.dev/@arunjdass/components/ai-planning) | 2026-06-18 发布；单组件使用量未知；提供紧凑步骤与折叠构图 | 可点击 `div`、持续旋转和 pulse；缺少完整键盘与 reduced-motion 契约 | React + Lucide 接近现栈；21st 页面未声明可复制许可，也没有组件专项维护 / issue 链 | 任意字号、颜色、间距与固定流程均需重做 | **adapt anatomy only**：只借鉴“可折叠的可观察活动记录” |
| [Vercel AI Elements Task](https://elements.ai-sdk.dev/components/task) / [GitHub](https://github.com/vercel/ai-elements) | Apache-2.0；有正式发布与上游仓库 | 文档声明键盘和读屏支持，基于 Collapsible | 官方组合偏 Next.js + AI SDK；AgentDoor 是 Vite | 信息结构可迁移，不能引入整套流式依赖 | **adapt**：借 Task / TaskItem 信息层级 |
| [Radix Collapsible](https://www.radix-ui.com/primitives/docs/components/collapsible) | 项目已经直接依赖并用于现有 trace | 遵循 disclosure 语义，支持 Space / Enter | MIT；无新增依赖 | 只需改产品命名与 Token | **adopt behavior** |

### 最终选择

- 行为基础：现有 Radix Collapsible。
- 视觉结构：21st AI Planning 的紧凑折叠关系 + AI Elements Task 的列表层级。
- AgentDoor 适配：共享组件命名为 `NeedLedProposal` 与 `ProposalActivityTrace`；只显示授权检索、证据整理和草稿准备等可验证动作。
- 不采用固定 Stepper，也不把“思维链”作为用户可见对象。

```ts
type ProposalActivity = {
  id: string;
  label: string;
  status: "pending" | "running" | "complete" | "blocked";
  evidenceRefs?: string[];
  detail?: string;
};

type CollaborationGap = {
  kind:
    | "information"
    | "knowledge"
    | "experience"
    | "permission"
    | "judgement"
    | "execution"
    | "capacity"
    | "stakeholder";
  reason: string;
  evidenceRefs: string[];
  missingRefs: string[];
  uncertainty?: string;
};
```

## 四、人员候选比较

| 候选 | 来源与采用信号 | 行为 / 无障碍 | 依赖 / 许可 / 维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [21st / Origin UI Radio Card](https://21st.dev/community/components/originui/radio-group/card) | 卡片型单选构图适合短名单；该单组件的真实使用量未知 | 有 Label、`aria-describedby` 与整卡点击；仍需验证 focus-visible | 需要 Radix Radio；registry 项许可、维护与 issue 来源链未知，复制前必须确认 | 视觉层级可用，但不能把人简化成一个选项标题 | **adapt anatomy** |
| [Base UI Radio](https://base-ui.com/react/components/radio) / [GitHub](https://github.com/mui/base-ui) | 项目已使用 Base UI；上游持续维护 | WAI-ARIA、组标签、表单、键盘和读屏支持 | MIT；无新增依赖 | 用 AgentDoor Token 重组卡片即可 | **adopt behavior** |
| [21st / ReUI Data Grid](https://21st.dev/community/components/reui/data-grid-table/card-container-table) | 功能丰富但面向大型数据表；单组件使用量未知 | 排序、拖动、缩放等需额外审计；维护 / issue 信号未知 | 增加 TanStack Table 和多个 DnD 包；许可未知；示例含 online / busy | 对 0–4 人短名单过重，且易滑向人员排行 | **reject** |

### 最终选择

- 行为基础：Base UI Radio。
- 视觉结构：Radio Card 的整卡选择关系，但每张卡展开明确证据、授权、本人公开窗口、不确定性和替代路径；候选为 0–4 位，不凑数、不预选。
- 选择一位候选不等于发送邀请；“邀请”是下一次明确确认。

```ts
type CandidateFit = {
  memberId: string;
  displayName: string;
  fillsGap: string;
  evidence: Array<{
    label: string;
    sourceType: "delivery" | "responsibility" | "self-declared";
    freshness: string;
    confidence?: "high" | "medium" | "low";
  }>;
  authorization: { status: "ready" | "missing" | "unknown"; note: string };
  collaborationWindow?: {
    label: string;
    source: "self-published";
    freshness: string;
  };
  collaborationModes: string[];
  uncertainty?: string;
  alternative?: string;
};
```

禁止向组件传入或展示在线状态、精确任务数、响应速度、接受率、空闲百分比和综合排名。

## 五、Handoff、接收与生效

| 候选 | 来源与采用信号 | 行为 / 无障碍 | 依赖 / 许可 / 维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [21st / Nyxb Timeline](https://21st.dev/@nyxbui/components/timeline) | 可组合的纵向事件构图；单组件使用量未知 | 未声明完整列表与读屏契约；组件专项维护 / issue 信号未知，落地必须使用 `ol/li` 和状态文本 | Lucide + CVA 已有；21st 页面许可未声明 | 可表达不可变事件，但不能当线性流程条 | **adapt anatomy** |
| [Base UI Dialog](https://base-ui.com/react/components/dialog) | 项目已有共享 `dialog.tsx` | 焦点陷阱、焦点返回、Esc、Title / Description、背景 inert | MIT；无新增依赖 | 只需补协议 diff、权限和责任内容 | **adopt** |
| [21st Agent Elements Approval Footer](https://21st.dev/@21st/components/edit-tool/approval-footer) / [GitHub](https://github.com/21st-dev/agent-elements) | 上游仓库为 MIT；该单组件使用量未知 | 上游有近期变更，但未完成该组件专项 release / issue 审计；普通动作按钮不是人的责任协议 | 依赖可满足；本轮不安装 | Apply / Skip 会错误合并接受、澄清、拒绝与激活 | **reject for Handoff** |

### 最终选择

- `HandoffOfferCard`：负责 scope、非目标、责任效果、Manifest、权限缺口、版本漂移、接收者复述和允许动作。
- `HandoffEventList`：语义化不可变事件列表，展示 revision、consent、preflight、activation 与 result acceptance。
- Base UI Dialog 承担聚焦阅读、范围反提和私密拒绝。
- UI 不提供一个通用客户端 `onActivate`；正式生效由服务端校验同一 Revision、权限、版本与对象状态后完成。

```ts
<HandoffOfferCard
  kind={kind}
  status={status}
  revision={revision}
  source={source}
  recipient={recipient}
  scope={inScope}
  outOfScope={outOfScope}
  requestedEffect={effect}
  manifest={permissionFilteredManifest}
  permissionGaps={gaps}
  versionDrift={drift}
  recipientRestatement={restatement}
  allowedActions={[
    "request-clarification",
    "propose-scope",
    "accept-revision",
    "decline-private",
  ]}
  onAction={handleAction}
/>
```

## 六、团队文件树、列表与 Activity

| 候选 | 来源与采用信号 | 行为 / 无障碍 | 依赖 / 许可 / 维护 | 视觉适配成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| [21st / Ruixen FileTree](https://21st.dev/@ruixen.ui/components/file-tree-1) | 递归、缩进、图标与展开密度完成度较高；单组件使用量未知 | 页面未给 Tree role、方向键、Home / End 或读屏契约；维护 / issue 信号未知 | Lucide 已有；要求 framer-motion；registry 许可需再确认 | 可借视觉，行为不能照搬 | **adapt anatomy** |
| [React Aria Tree](https://react-aria.adobe.com/Tree) / [GitHub](https://github.com/adobe/react-spectrum) | 成熟的生产级 Tree 行为基准 | 方向键、选择、异步加载、空状态、读屏和可访问拖放完整 | Apache-2.0；需新增 `react-aria-components`，当前未批准 | 行为价值高，视觉可完全使用 AgentDoor Token | **adapt benchmark；依赖批准后可 adopt** |
| [21st / Extend Finder](https://21st.dev/community/components/extend-hq/file-system) | Finder 式多视图，功能丰富；单组件使用量未知 | 没有清楚的完整读屏契约；维护 / issue 信号未知 | 新增 `@pierre/trees` 与第二套图标库；许可未知 | 四种视图与对象存储映射对首版过重 | **reject** |

### 最终选择

- 视觉先保留现有 TaskDetail 文件树，增加清晰缩进、选中和按需加载状态。
- 行为合同以 React Aria Tree 为基准：单一 Tab stop、方向键、Home / End、typeahead、层级 / sibling / expanded 信息。
- 首版不做拖拽移动；使用“移动到……”Dialog，显式检查后代循环、权限、版本和可撤销性。
- 文件与文件夹混合主列表继续复用现有 Table；树负责定位，列表负责操作。
- Activity 没有找到同时具备清楚许可、完整无障碍合同且明显优于语义化列表的外部组件。采用 Nyxb Timeline 的视觉节奏，自建 `ActivityEventList` 的 `ol/li` 语义和对象跳转。

## 七、共享组件清单

| 共享组件 | 行为基础 | 负责的产品语义 |
| --- | --- | --- |
| `NeedLedProposal` | Radix Collapsible + 表单 | 最小 Proposal、一个问题、继续自己 / 展开协作 |
| `ProposalActivityTrace` | Radix Collapsible | 只展示可观察的准备动作与证据引用 |
| `CollaborationGapCard` | AgentDoor Card pattern | 解释缺口、依据、不确定性和最小补齐路径 |
| `CandidateComparison` | Base UI Radio | 0–4 人多维比较，不凑数、无总分 |
| `CollaborationOfferDialog` | Base UI Dialog | scope、协作方式、共享预览与发送确认 |
| `HandoffOfferCard` | Base UI Dialog / AgentDoor pattern | 同一 Revision 的责任协议与接收选择 |
| `HandoffEventList` | semantic `ol/li` | 不可变协议和激活事件 |
| `TeamFileBrowser` | 当前 Task 文件树 + React Aria Tree 合同 | 团队文件夹、列表、详情、版本和引用 |
| `ActivityEventList` | semantic `ol/li` | help / offer / discovery / risk / opportunity |

## 八、动效与 Token 适配

- 默认过渡 160ms，路由关系改变 240ms；只在用户操作导致的状态变化时发生。
- 外部组件的任意像素、颜色、圆角和时长全部映射到 `--ad-*` Token。
- 不采用固定创建向导、Handoff Stepper、人员 Data Grid、在线状态、循环动画、Finder 多视图或营销型 hover 特效。
- reduced-motion 下禁用路径绘制和位移，仅保留即时状态变化。

## 九、实施前检查

- [ ] 产品负责人确认 Decision Brief 与相关 Q 项。
- [ ] 建立 Git baseline 或等效可恢复快照。
- [ ] 复制任何 21st registry 源码前再次确认该具体条目的许可与来源链。
- [ ] 不安装新依赖；若要采用 React Aria Tree，单独提交依赖与 bundle 评估。
- [ ] 每个共享组件覆盖桌面、移动、键盘、焦点、空、加载、错误、权限不足与 reduced-motion。
- [ ] 与 TaskDetail、WorkspaceList 和 MyTodos 两个相邻页面做截图对比，不形成第二套视觉系统。
