# Member Recommendation Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace member recommendation percentages with a same-shape, color-strength Sparkles indicator and hide that indicator whenever the member is selected.

**Architecture:** Recommendation generation will expose an ordinal `level` and an explanation instead of a universal numeric score. `PersonPicker` will render one shared Sparkles icon for unselected recommendations, color it by level, and expose the level plus reason through the existing tooltip; selected rows will render only their check indicator.

**Tech Stack:** TypeScript, React, Base UI Combobox/Tooltip, Lucide React, Node test runner, CSS design tokens.

---

### Task 1: Replace numeric recommendation scores with levels

**Files:**
- Modify: `src/lib/taskMemberRecommendations.ts`
- Test: `server/taskMemberRecommendations.test.ts`

- [ ] **Step 1: Write the failing level tests**

Replace numeric score assertions with explicit tier assertions:

```ts
assert.equal(recommendations.business.level, "high");
assert.equal(recommendations.live.level, "medium");
assert.equal(recommendations.content.level, "low");
assert.deepEqual(sortMembersByRecommendation(members, recommendations).map(member => member.id), ["business", "live", "content"]);

assert.ok(Object.values(recommendations).every(item => item.level === "low"));
assert.ok(Object.values(recommendations).every(item => item.reason.includes("缺少直接命中")));
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --import tsx --test server/taskMemberRecommendations.test.ts`

Expected: FAIL because recommendations still expose `score`, not `level`.

- [ ] **Step 3: Implement the ordinal recommendation model**

Use a narrow public type and stable level weights:

```ts
export type TaskMemberRecommendationLevel = "high" | "medium" | "low";

export type TaskMemberRecommendation = {
  level: TaskMemberRecommendationLevel;
  reason: string;
};

const recommendationLevelWeight: Record<TaskMemberRecommendationLevel, number> = {
  high: 2,
  medium: 1,
  low: 0,
};
```

Generate `high` for at least three direct keyword matches, `medium` for one or two, and `low` for none. Sort on `recommendationLevelWeight[level]`, falling back to the original member index within each tier.

```ts
export function createTaskMemberRecommendations({ members, taskText }: { members: PersonOption[]; taskText: string }): TaskMemberRecommendations {
  const normalizedTaskText = taskText.trim();
  return Object.fromEntries(members.map(member => {
    const responsibility = `${member.role} ${member.dynamicResponsibility ?? ""}`;
    const matches = uniqueMatches(normalizedTaskText, responsibility);
    const level: TaskMemberRecommendationLevel = matches.length >= 3 ? "high" : matches.length ? "medium" : "low";
    const reason = matches.length
      ? `任务中的“${matches.slice(0, 4).join("、")}”与${member.name}的责任范围直接匹配。`
      : `当前任务描述与${member.name}的责任记录缺少直接命中，建议结合实际经验与可用时间再确认。`;
    return [member.id, { level, reason }];
  }));
}

export function sortMembersByRecommendation(members: PersonOption[], recommendations: TaskMemberRecommendations): PersonOption[] {
  return members
    .map((member, index) => ({ index, member }))
    .sort((left, right) => {
      const rightWeight = recommendations[right.member.id] ? recommendationLevelWeight[recommendations[right.member.id].level] : -1;
      const leftWeight = recommendations[left.member.id] ? recommendationLevelWeight[recommendations[left.member.id].level] : -1;
      return rightWeight - leftWeight || left.index - right.index;
    })
    .map(({ member }) => member);
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --import tsx --test server/taskMemberRecommendations.test.ts`

Expected: 2 tests pass.

### Task 2: Render the color-strength icon and selected state

**Files:**
- Modify: `src/components/PersonPicker.tsx`
- Modify: `src/styles.css`
- Modify: `server/unassignedOwnerInvitation.test.ts`
- Modify: `docs/superpowers/specs/2026-09-18-member-recommendation-indicator-design.md`

- [ ] **Step 1: Write failing rendering-contract tests**

Update the source contract to require:

```ts
assert.doesNotMatch(picker, /person-picker-match-score|recommendation\.score|\{recommendation\.score\}%/);
assert.match(picker, /const recommendation = !selected &&/);
assert.match(picker, /data-recommendation-level=\{recommendation\.level\}/);
assert.match(picker, /getMemberRecommendationLabel\(recommendation\.level\)/);
assert.match(styles, /person-picker-ai-reason\[data-recommendation-level="high"\]/);
assert.match(styles, /person-picker-ai-reason\[data-recommendation-level="medium"\]/);
assert.match(styles, /person-picker-ai-reason\[data-recommendation-level="low"\]/);
assert.doesNotMatch(styles, /person-picker-match-score/);
```

- [ ] **Step 2: Run the focused UI contract test and verify it fails**

Run: `node --import tsx --test server/unassignedOwnerInvitation.test.ts`

Expected: FAIL because the picker still renders a percentage and shows the recommendation beside selected checks.

- [ ] **Step 3: Implement the shared icon and tooltip**

Add a label function:

```ts
export function getMemberRecommendationLabel(level: TaskMemberRecommendationLevel) {
  if (level === "high") return "推荐度较高";
  if (level === "medium") return "推荐度适中";
  return "推荐度较低";
}
```

Only create a recommendation for an unselected, active member:

```ts
const recommendation = !selected && !isScope && person.membershipStatus !== "invited"
  ? memberRecommendations[person.id]
  : undefined;
```

Render only the fixed Sparkles trigger, with `data-recommendation-level`, an accessible label containing the member name and recommendation level, and Tooltip content in the form `推荐度较高：具体理由`. Keep the existing click/pointer guards so opening the explanation never selects the person.

```tsx
{recommendation && <Tooltip.Root>
  <Tooltip.Trigger
    aria-label={`${person.name}：${getMemberRecommendationLabel(recommendation.level)}`}
    className="person-picker-ai-reason"
    closeOnClick={false}
    data-recommendation-level={recommendation.level}
    delay={150}
    onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
    onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
    type="button"
  >
    <Sparkles aria-hidden="true" size={14} />
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Positioner className="person-picker-ai-tip-positioner" collisionPadding={12} side="top" sideOffset={6}>
      <Tooltip.Popup className="person-picker-ai-tip" role="tooltip">
        {getMemberRecommendationLabel(recommendation.level)}：{recommendation.reason}
      </Tooltip.Popup>
    </Tooltip.Positioner>
  </Tooltip.Portal>
</Tooltip.Root>}
```

- [ ] **Step 4: Implement same-hue strength styling**

Remove percentage and traffic-light rules. Reduce `.person-picker-option-end` to icon width, retain one fixed icon geometry, and derive three strengths from the existing route color:

```css
.person-picker-ai-reason[data-recommendation-level="high"] { color: var(--ad-route); }
.person-picker-ai-reason[data-recommendation-level="medium"] { color: color-mix(in srgb, var(--ad-route) 64%, var(--ad-border-strong)); }
.person-picker-ai-reason[data-recommendation-level="low"] { color: color-mix(in srgb, var(--ad-route) 32%, var(--ad-border-strong)); }
```

Keep the same focus ring for all three levels and do not replace the degree color on hover.

- [ ] **Step 5: Record the selected-state decision in the spec**

Add: “已选成员只显示 Combobox 勾选，不同时显示推荐度星芒；取消选择后恢复星芒。”

- [ ] **Step 6: Run focused tests**

Run:

```bash
node --import tsx --test server/taskMemberRecommendations.test.ts server/taskMemberMatchBasis.test.ts server/unassignedOwnerInvitation.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 7: Run a focused TypeScript build check**

Run: `npx tsc -b --pretty false`

Expected: exits 0 with no TypeScript errors. Do not run the unrelated full test suite.

- [ ] **Step 8: Commit only the recommendation indicator files**

```bash
git add docs/superpowers/plans/2026-09-18-member-recommendation-indicator.md docs/superpowers/specs/2026-09-18-member-recommendation-indicator-design.md server/taskMemberRecommendations.test.ts server/unassignedOwnerInvitation.test.ts src/components/PersonPicker.tsx src/lib/taskMemberRecommendations.ts src/styles.css
git commit -m "feat: replace member match scores with recommendation levels"
```
