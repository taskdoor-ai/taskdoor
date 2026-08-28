# Influencer Commerce Responsibility Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy retail fixtures with a local-only influencer-commerce scenario, show each member's responsibility in team settings, and assign generated tasks by responsibility through deterministic Mock logic.

**Architecture:** One canonical `creatorCommerceMembers` fixture supplies both the settings table and the task assistant. A focused pure module classifies task and responsibility text into responsibility domains, scores candidates deterministically, and returns an assignment plus explanation. Scenario-version initialization replaces legacy task and tag storage exactly once; UI surfaces consume the new fixtures without API calls.

**Tech Stack:** React 19, TypeScript, Vite, Node test runner with `--experimental-strip-types`, CSS design tokens, browser-based local QA.

---

## File map

- Create `src/data/creatorCommerceScenario.ts`: canonical members, standard prompt, scenario tags, and scenario copy constants.
- Create `src/lib/responsibilityAssignment.ts`: pure responsibility-domain classification and deterministic assignment.
- Create `server/responsibilityAssignment.test.ts`: public behavior tests for the matcher.
- Modify `src/lib/mockTaskAssistant.ts`: generate influencer-commerce drafts and recommendations through the matcher.
- Modify `server/mockTaskAssistant.test.ts`: integration tests for first turn, second turn, missing owner, manual override, generic fallback, and abort.
- Replace `src/data/tagGroups.ts`: eight influencer-commerce tags.
- Replace `src/data/workspaceNodes.ts`: influencer-commerce workspace and one-time legacy reset behavior.
- Modify `src/App.tsx`: import the canonical members and bump task/tag fixture versions.
- Modify `src/data/memberProfiles.ts`: rename the active Mock team and align the current user's profile and responsibility document.
- Modify `src/components/PersonalCenterPage.tsx`: add the read-only responsibility column.
- Modify `src/styles/personal-center.css`: desktop three-column table and narrow-screen layout.
- Replace legacy task copy in `src/components/PersonalWorkbench.tsx`, `src/components/GlobalNotifications.tsx`, and `src/data/taskDetailMocks.ts`.
- Modify `src/components/TaskCreationConversation.tsx`: add the standard influencer-commerce quick prompt and retain manual draft edits.

## Test command

Use the bundled Node runtime for TypeScript tests:

```bash
/Users/yxzuji/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --experimental-strip-types server/responsibilityAssignment.test.ts server/mockTaskAssistant.test.ts server/taskAssistant.test.ts
```

### Task 1: Canonical influencer-commerce member fixture

**Files:**
- Create: `src/data/creatorCommerceScenario.ts`
- Create: `server/creatorCommerceScenario.test.ts`
- Modify: `src/App.tsx:73-107`

- [ ] **Step 1: Write the failing fixture integrity test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";

test("creator-commerce fixture exposes eight unique non-empty responsibilities", () => {
  assert.equal(creatorCommerceMembers.length, 8);
  assert.equal(new Set(creatorCommerceMembers.map((member) => member.id)).size, 8);
  assert.ok(creatorCommerceMembers.every((member) => member.dynamicResponsibility.trim().length > 0));
});
```

- [ ] **Step 2: Run the single test and verify RED**

Run:

```bash
/Users/yxzuji/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --experimental-strip-types server/creatorCommerceScenario.test.ts
```

Expected: FAIL because `src/data/creatorCommerceScenario.ts` does not exist.

- [ ] **Step 3: Create the canonical fixture**

```ts
import type { PersonOption } from "../components/PersonPicker";
import type { TagDefinition } from "./tagGroups";

export const creatorCommercePrompt = "为新品防晒衣策划抖音达人带货，9 月 15 日上线，目标 GMV 50 万，需要完成达人筛选、脚本素材、直播执行、库存价格、投流、数据复盘和合规审核。";

export const creatorCommerceMembers = [
  { id: "周岚", name: "周岚", email: "zhoulan@agentdoor.local", role: "内容电商负责人", dynamicResponsibility: "达人带货目标、预算、跨角色协调与最终结果", availability: "本周可投入 6 小时，负责关键决策", currentWork: ["确认香氛礼盒追加投放目标"], recentActivity: "近 30 天统筹 3 场达人带货项目" },
  { id: "陈默", name: "陈默", email: "chenmo@agentdoor.local", role: "达人商务经理", dynamicResponsibility: "达人筛选、建联、佣金谈判、排期与合作确认", availability: "本周可完成 12 位达人建联", currentWork: ["确认第二批达人合作档期"], recentActivity: "已完成 28 位达人分层" },
  { id: "林洁", name: "林洁", email: "linjie@agentdoor.local", role: "内容策划", dynamicResponsibility: "卖点提炼、短视频脚本、直播话术与素材交付", availability: "本周可交付 4 套脚本", currentWork: ["终审香氛礼盒直播卖点"], recentActivity: "近 30 天交付 16 条带货脚本" },
  { id: "高远", name: "高远", email: "gaoyuan@agentdoor.local", role: "直播运营", dynamicResponsibility: "直播排期、场控、彩排、上线执行与异常处理", availability: "9 月 12 日后有完整彩排窗口", currentWork: ["完善直播间场控清单"], recentActivity: "连续完成 5 场直播执行" },
  { id: "梁川", name: "梁川", email: "liangchuan@agentdoor.local", role: "商品运营", dynamicResponsibility: "选品、价格机制、赠品、库存与履约", availability: "本周可完成一次库存锁定", currentWork: ["锁定礼盒赠品与库存"], recentActivity: "负责 4 个在售商品机制" },
  { id: "许宁", name: "许宁", email: "xuning@agentdoor.local", role: "投流负责人", dynamicResponsibility: "媒体投放、预算消耗、定向、人群包与 ROI", availability: "本周可管理 20 万投放预算", currentWork: ["调整第二轮投流人群包"], recentActivity: "近 30 天平均 ROI 2.8" },
  { id: "韩序", name: "韩序", email: "hanxu@agentdoor.local", role: "数据分析师", dynamicResponsibility: "指标口径、数据看板、渠道归因与项目复盘", availability: "本周可安排 4 小时分析", currentWork: ["更新 GMV 看板与渠道归因"], recentActivity: "已完成 6 场活动复盘" },
  { id: "苏禾", name: "苏禾", email: "suhe@agentdoor.local", role: "合规负责人", dynamicResponsibility: "广告法、素材宣称、达人合同与平台规则", availability: "需提前一天预约审核", currentWork: ["审核达人合同补充条款"], recentActivity: "近 30 天审核 22 份素材" },
] satisfies Array<PersonOption & { dynamicResponsibility: string }>;

export const creatorCommerceTags: TagDefinition[] = [
  { id: "creator-business", name: "达人商务", icon: "users", color: "blue" },
  { id: "content-production", name: "内容制作", icon: "sparkles", color: "purple" },
  { id: "live-execution", name: "直播执行", icon: "flag", color: "pink" },
  { id: "merchandising", name: "商品运营", icon: "package", color: "teal" },
  { id: "media-growth", name: "投流增长", icon: "chart", color: "cyan" },
  { id: "data-review", name: "数据复盘", icon: "layers", color: "green" },
  { id: "compliance-review", name: "合规审核", icon: "shield", color: "amber" },
  { id: "high-priority", name: "高优先级", icon: "flag", color: "red" },
];
```

If `TagIconName` lacks `chart`, add `"chart"` to its union and icon set in `src/data/tagGroups.ts`.

- [ ] **Step 4: Replace `baseCollaborationMembers` in `App.tsx`**

Import `creatorCommerceMembers`, delete the inline retail array, and retain the current-user profile projection:

```ts
const collaborationMembers = useMemo(() => creatorCommerceMembers.map((member) => member.id === "周岚" ? { ...member, name: personalCenterState.profile.name, email: personalCenterState.profile.email, role: personalCenterState.profile.title } : member), [personalCenterState.profile]);
```

- [ ] **Step 5: Run fixture test and build, verify GREEN**

Expected: fixture test PASS; TypeScript build PASS.

- [ ] **Step 6: Commit only fixture paths**

```bash
git add src/data/creatorCommerceScenario.ts server/creatorCommerceScenario.test.ts src/App.tsx src/data/tagGroups.ts
git commit -m "feat: add creator commerce team fixture"
```

### Task 2: Responsibility assignment tracer bullet

**Files:**
- Create: `src/lib/responsibilityAssignment.ts`
- Create: `server/responsibilityAssignment.test.ts`

- [ ] **Step 1: Write one failing test for creator-business assignment**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";
import { assignTaskByResponsibility } from "../src/lib/responsibilityAssignment.ts";

test("assigns creator outreach to the member responsible for creator business", () => {
  const result = assignTaskByResponsibility({ title: "筛选达人并确认商务合作", goal: "完成达人建联、佣金谈判与合作档期确认" }, creatorCommerceMembers);
  assert.equal(result.ownerId, "陈默");
  assert.equal(result.domain, "creator-business");
  assert.match(result.reason, /达人筛选|建联|佣金/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Expected: FAIL because `assignTaskByResponsibility` does not exist.

- [ ] **Step 3: Implement the minimal public matcher**

```ts
import type { TaskAssistantMember } from "./taskAssistantProtocol";

export type ResponsibilityDomain = "analytics" | "compliance" | "content" | "coordination" | "creator-business" | "live-operations" | "media-buying" | "merchandising";
export type ResponsibilityAssignment = { domain: ResponsibilityDomain | null; matchedKeywords: string[]; ownerId: string; reason: string };

export const responsibilityKeywords: Record<ResponsibilityDomain, string[]> = {
  coordination: ["目标", "预算", "统筹", "协同", "最终结果"],
  "creator-business": ["达人", "筛选", "建联", "佣金", "谈判", "合作", "档期"],
  content: ["内容", "卖点", "脚本", "话术", "素材", "短视频"],
  "live-operations": ["直播", "场控", "彩排", "上线", "异常"],
  merchandising: ["选品", "商品", "价格", "赠品", "库存", "履约"],
  "media-buying": ["投流", "投放", "预算消耗", "定向", "人群包", "ROI"],
  analytics: ["数据", "指标", "看板", "归因", "复盘", "GMV"],
  compliance: ["合规", "广告法", "宣称", "合同", "平台规则", "审核"],
};

const includesKeyword = (text: string, keyword: string) => text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());
const matchedDomains = (text: string) => (Object.entries(responsibilityKeywords) as Array<[ResponsibilityDomain, string[]]>).filter(([, keywords]) => keywords.some((keyword) => includesKeyword(text, keyword))).map(([domain]) => domain);

export function assignTaskByResponsibility(task: { goal: string; title: string }, members: TaskAssistantMember[]): ResponsibilityAssignment {
  const taskText = `${task.title} ${task.goal}`;
  const taskDomains = matchedDomains(taskText);
  const ranked = members.map((member, index) => {
    const responsibility = member.dynamicResponsibility.trim();
    const memberDomains = matchedDomains(responsibility);
    const sharedDomains = taskDomains.filter((domain) => memberDomains.includes(domain));
    const directKeywords = [...new Set(taskDomains.flatMap((domain) => responsibilityKeywords[domain]).filter((keyword) => includesKeyword(taskText, keyword) && includesKeyword(responsibility, keyword)))];
    return { directKeywords, index, member, score: sharedDomains.length * 100 + directKeywords.length, sharedDomains };
  }).sort((left, right) => right.score - left.score || right.directKeywords.length - left.directKeywords.length || left.index - right.index);
  const winner = ranked[0];
  if (!winner || winner.score === 0) return { domain: taskDomains[0] ?? null, matchedKeywords: [], ownerId: "", reason: "没有成员责任覆盖该任务，需要人工指定负责人。" };
  return { domain: winner.sharedDomains[0] ?? taskDomains[0] ?? null, matchedKeywords: winner.directKeywords, ownerId: winner.member.id, reason: `责任匹配：${winner.member.dynamicResponsibility}` };
}
```

- [ ] **Step 4: Run the single test and verify GREEN**

- [ ] **Step 5: Commit**

```bash
git add src/lib/responsibilityAssignment.ts server/responsibilityAssignment.test.ts
git commit -m "feat: assign tasks by member responsibility"
```

### Task 3: Matcher edge cases one by one

**Files:**
- Modify: `server/responsibilityAssignment.test.ts`
- Modify: `src/lib/responsibilityAssignment.ts`

- [ ] **Step 1: Add and pass the seven-domain matrix test**

Use a table with expected IDs: content → 林洁, live → 高远, merchandising → 梁川, media → 许宁, analytics → 韩序, compliance → 苏禾, coordination → 周岚. Run after adding this one test and only adjust keywords required by failures.

- [ ] **Step 2: Add and pass name-independence test**

```ts
test("does not use member names for assignment", () => {
  const renamed = creatorCommerceMembers.map((member, index) => ({ ...member, id: `member-${index}`, name: `成员 ${index}` }));
  const result = assignTaskByResponsibility({ title: "审核素材宣称与达人合同", goal: "检查广告法和平台规则" }, renamed);
  assert.equal(result.ownerId, "member-7");
});
```

- [ ] **Step 3: Add and pass missing-responsibility test**

```ts
test("returns unassigned when no responsibility covers the task", () => {
  const withoutCompliance = creatorCommerceMembers.filter((member) => member.id !== "苏禾");
  const result = assignTaskByResponsibility({ title: "审核达人合同", goal: "检查广告法和素材宣称" }, withoutCompliance);
  assert.equal(result.ownerId, "");
  assert.match(result.reason, /人工指定/);
});
```

- [ ] **Step 4: Add and pass empty-responsibility and role-only tests**

Assert a member with role `合规负责人` and empty `dynamicResponsibility` never wins.

- [ ] **Step 5: Add and pass deterministic tie test**

Extend ranking with an availability score that prefers text containing `可`, `窗口`, or `可安排` only when total and direct scores tie; otherwise preserve input order.

- [ ] **Step 6: Run all matcher tests and commit**

```bash
git add src/lib/responsibilityAssignment.ts server/responsibilityAssignment.test.ts
git commit -m "test: cover responsibility assignment edge cases"
```

### Task 4: Mock assistant influencer-commerce first turn

**Files:**
- Modify: `server/mockTaskAssistant.test.ts`
- Modify: `src/lib/mockTaskAssistant.ts`

- [ ] **Step 1: Replace the retail request fixture with `creatorCommerceMembers` and `creatorCommercePrompt`**

- [ ] **Step 2: Write one failing integration test**

```ts
test("first creator-commerce turn builds seven subtasks assigned by responsibility", async () => {
  const response = await requestMockTaskAssistant({ ...baseRequest, messages: [{ role: "user", content: creatorCommercePrompt }] });
  assert.equal(response.draft.subtasks.length, 7);
  assert.deepEqual(response.draft.subtasks.map((task) => task.ownerId), ["陈默", "林洁", "高远", "梁川", "许宁", "韩序", "苏禾"]);
  assert.equal(response.draft.mainTask.ownerId, "周岚");
  assert.equal(response.readyToCreate, false);
});
```

- [ ] **Step 3: Run the test and verify RED**

Expected: current retail draft and fixed owners do not satisfy the assertions.

- [ ] **Step 4: Build the standard seven-subtask template, assigning every draft through the matcher**

Use these titles and responsibility-specific goals:

```ts
const creatorCommerceSubtaskSeeds = [
  { title: "筛选达人并确认商务合作", goal: "完成达人筛选、建联、佣金谈判与合作档期确认。", labels: ["达人商务"] },
  { title: "完成卖点、脚本与直播素材", goal: "完成卖点提炼、短视频脚本、直播话术与素材交付。", labels: ["内容制作"] },
  { title: "完成直播彩排与上线执行", goal: "完成直播排期、场控清单、彩排和上线异常预案。", labels: ["直播执行"] },
  { title: "确认价格机制、库存与履约", goal: "锁定商品价格、赠品机制、库存数量和履约方案。", labels: ["商品运营"] },
  { title: "制定投流计划并控制 ROI", goal: "确认投放预算、定向、人群包和 ROI 目标。", labels: ["投流增长"] },
  { title: "搭建数据看板并完成复盘", goal: "统一 GMV 指标口径、渠道归因和项目复盘模板。", labels: ["数据复盘"] },
  { title: "完成素材宣称与合同合规审核", goal: "审核广告法、素材宣称、达人合同和平台规则。", labels: ["合规审核"] },
];
```

Map each seed through `assignTaskByResponsibility`, use its `ownerId`, and build `peopleRecommendations` from unique assignments with the matcher's `reason`.

- [ ] **Step 5: Run first-turn test and verify GREEN**

- [ ] **Step 6: Commit**

```bash
git add src/lib/mockTaskAssistant.ts server/mockTaskAssistant.test.ts
git commit -m "feat: mock creator commerce task plan"
```

### Task 5: Mock assistant follow-up, missing owner, generic fallback, and abort

**Files:**
- Modify: `server/mockTaskAssistant.test.ts`
- Modify: `src/lib/mockTaskAssistant.ts`

- [ ] **Step 1: Add a failing manual-override preservation test**

Set the first subtask owner to `周岚` in `request.draft`, send a second user turn, and assert the response still uses `周岚` for that task.

- [ ] **Step 2: Implement draft merge by stable subtask title**

Preserve a non-empty owner from the incoming draft when its ID remains in `request.members`. Only run automatic assignment for empty or invalid owner IDs.

- [ ] **Step 3: Add and pass missing compliance owner test**

Remove 苏禾, assert the compliance subtask owner is empty and risks include `合规责任缺口`.

- [ ] **Step 4: Add and pass generic fallback test**

Send `整理下周例会纪要`; assert the response does not create the seven creator-commerce subtasks.

- [ ] **Step 5: Re-run and retain abort test**

- [ ] **Step 6: Commit**

```bash
git add src/lib/mockTaskAssistant.ts server/mockTaskAssistant.test.ts
git commit -m "test: preserve responsibility assignment behavior"
```

### Task 6: Replace task and tag fixtures with one-time scenario reset

**Files:**
- Modify: `src/data/tagGroups.ts`
- Modify: `src/data/workspaceNodes.ts`
- Modify: `src/App.tsx:28-140`
- Create: `server/creatorCommerceReset.test.ts`

- [ ] **Step 1: Write failing reset tests**

Test exported pure helpers instead of localStorage internals:

```ts
test("legacy workspace is replaced by creator-commerce seeds", () => {
  const result = resetLegacyWorkspace([{ id: "coupon-fix", kind: "task", name: "退款灰度", parentId: "workspace-root", ownerId: "周岚", status: "进行中", updatedAt: "今天" }]);
  assert.ok(result.some((node) => node.id === "fragrance-creator-wrapup"));
  assert.ok(result.every((node) => !node.name.includes("退款")));
});

test("creator-commerce tag reset returns exactly eight tags", () => {
  assert.deepEqual(resetLegacyTags([{ id: "refund", name: "退款", icon: "wrench", color: "red" }]).map((tag) => tag.name), creatorCommerceTags.map((tag) => tag.name));
});
```

- [ ] **Step 2: Replace `initialTags` with a copy of `creatorCommerceTags`**

Keep `normalizeTags` for user-created tags after reset.

- [ ] **Step 3: Replace `workspaceNodeSeeds`**

Create one root, one campaign folder, one parent task `fragrance-creator-wrapup`, and the eight approved responsibility-based child tasks. Give every task only labels from `creatorCommerceTags`.

- [ ] **Step 4: Export pure reset helpers from their owning modules**

```ts
// src/data/workspaceNodes.ts
export const creatorCommerceWorkspaceVersion = "creator-commerce-v1";
export const resetLegacyWorkspace = (_value: unknown): WorkspaceNode[] => workspaceNodes.map((node) => ({ ...node }));

// src/data/tagGroups.ts
export const resetLegacyTags = (_value: unknown): TagDefinition[] => creatorCommerceTags.map((tag) => ({ ...tag }));
```

- [ ] **Step 5: Bump App versions and reset once**

Set `tagCatalogVersion` and `workspaceMockVersion` to `creator-commerce-v1`. When the stored version differs, initialize directly from the new fixtures and save the new version. When it matches, normalize and retain user-created creator-commerce tasks and tags.

- [ ] **Step 6: Run reset tests and assert every task label is present in the new catalog**

- [ ] **Step 7: Commit**

```bash
git add src/data/tagGroups.ts src/data/workspaceNodes.ts src/App.tsx server/creatorCommerceReset.test.ts
git commit -m "feat: reset workspace to creator commerce scenario"
```

### Task 7: Render the read-only responsibility column

**Files:**
- Modify: `src/components/PersonalCenterPage.tsx:104-205`
- Modify: `src/styles/personal-center.css`

- [ ] **Step 1: Add semantic responsibility content to the table**

Change the header to:

```tsx
<div aria-hidden="true" className="team-member-list-head"><span>用户</span><span>责任</span><span>角色</span></div>
```

Add between the identity and role controls in every row:

```tsx
<p className="team-member-responsibility" title={member?.dynamicResponsibility ?? "加入后补充责任"}>{member?.dynamicResponsibility ?? "加入后补充责任"}</p>
```

- [ ] **Step 2: Add desktop three-column CSS**

Use the same grid template for header and rows:

```css
.team-member-list-head, .team-member-list > li { grid-template-columns: minmax(260px, .9fr) minmax(320px, 1.15fr) minmax(150px, .38fr); }
.team-member-responsibility { display: -webkit-box; overflow: hidden; margin: 0; color: var(--ad-ink-secondary); font-size: var(--ad-text-caption); line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
```

- [ ] **Step 3: Add narrow-screen layout**

At the existing personal-center breakpoint, make identity span both columns, place responsibility below it, and keep role controls usable without horizontal overflow.

- [ ] **Step 4: Run build and design check**

- [ ] **Step 5: Commit**

```bash
git add src/components/PersonalCenterPage.tsx src/styles/personal-center.css
git commit -m "feat: show member responsibility column"
```

### Task 8: Replace all visible legacy retail copy

**Files:**
- Modify: `src/data/memberProfiles.ts`
- Modify: `src/components/PersonalWorkbench.tsx`
- Modify: `src/components/GlobalNotifications.tsx`
- Modify: `src/data/taskDetailMocks.ts`
- Modify: `src/components/TaskCreationConversation.tsx`

- [ ] **Step 1: Update team and profile copy**

Rename `零售业务团队` to `达人带货运营团队`, current user title to `内容电商负责人`, and responsibility document to the coordination responsibility from the canonical fixture.

- [ ] **Step 2: Replace PersonalWorkbench task surfaces**

Use the approved fragrance-gift wrap-up tasks for the attention map, timeline, focus card, decisions, waiting collaborators, and AI suggestion. Every named collaborator must match the canonical responsibility fixture.

- [ ] **Step 3: Replace GlobalNotifications fixtures**

Create five notifications about creator outreach, script review, live rehearsal, compliance review, and data results. Any `taskId` must exist in the new workspace fixture.

- [ ] **Step 4: Replace task detail fixtures**

Delete retail keys and provide detail records for the fragrance project and its responsibility-based tasks. Owners and participants must be canonical member IDs; labels must be from the eight-tag catalog.

- [ ] **Step 5: Add standard quick prompt**

Replace the generic `创建产品任务` suggestion with `创建达人带货项目`, submitting `creatorCommercePrompt` or inserting the full prompt so the test path is deterministic.

- [ ] **Step 6: Run a legacy-vocabulary scan**

```bash
rg -n "退款|撤单|门店灰度|POS|会员结算|优惠券" src --glob '!src/data/legacyTaskSnapshots.ts'
```

Expected: no active UI fixture hits. Historical migration-only constants may remain only when required to detect and replace old storage.

- [ ] **Step 7: Build, design check, and commit**

```bash
git add src/data/memberProfiles.ts src/components/PersonalWorkbench.tsx src/components/GlobalNotifications.tsx src/data/taskDetailMocks.ts src/components/TaskCreationConversation.tsx
git commit -m "feat: replace retail copy with creator commerce scenario"
```

### Task 9: Full verification and browser acceptance

**Files:**
- Modify only if verification exposes a defect in files already listed above.

- [ ] **Step 1: Run all TypeScript behavior tests**

Expected: responsibility, scenario reset, Mock assistant, and server safety tests PASS.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: PASS; existing Vite native-config and chunk-size warnings are allowed.

- [ ] **Step 3: Run design guard**

```bash
npm run design:check
```

Expected: `✓ 未新增已登记的设计债务`.

- [ ] **Step 4: Verify settings in the local browser**

Open Settings → Members. Confirm eight rows, `用户｜责任｜角色` headers, all responsibilities visible, role selectors still enabled for admin, and no horizontal overflow at desktop and mobile widths.

- [ ] **Step 5: Verify responsibility-based creation**

Open New conversation → `创建达人带货项目`. Confirm one main task, seven subtasks, exact responsibility owners, responsibility-based reasons, no API request, manual override persistence after a second reply, and successful creation into the workspace.

- [ ] **Step 6: Verify complete scenario replacement**

Refresh once and confirm new created tasks persist. Inspect Home, Tasks, task detail, notifications, and tag picker; confirm only influencer-commerce content and the eight new tags are visible.

- [ ] **Step 7: Run diff checks and commit fixes only if needed**

```bash
git diff --check -- src server
```

Expected: no new whitespace errors in touched files.
