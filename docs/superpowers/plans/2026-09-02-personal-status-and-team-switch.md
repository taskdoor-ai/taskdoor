# Personal Status and Team Switch Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace work identity, timezone, and biography fields with a persisted fixed-icon personal status, surface that status on the current user's profile card, and remove logos from every team-switch interaction.

**Architecture:** Add a small domain module for the allowed status icon identifiers, keep Lucide rendering in a shared presentation component, and migrate personal-center storage from v6 to v7 without reclassifying biography text as a status. Feed the saved status into the existing current-user `PersonOption`; simplify the existing team selectors while retaining their current callbacks and accessibility semantics.

**Tech Stack:** React 19, TypeScript, Lucide React, Base UI dropdown/select primitives, Node test runner through `tsx`, Vite.

---

## File map

- Create `src/lib/personalStatus.ts`: fixed status identifiers, labels, validation, and default icon.
- Create `src/components/PersonalStatusIcon.tsx`: one shared mapping from status identifiers to Lucide glyphs.
- Create `src/components/PersonalStatusField.tsx`: fixed-icon picker plus one-line status input.
- Modify `src/data/memberProfiles.ts`: v7 profile contract, validation, seed data, and v6 migration.
- Modify `src/data/sharedTypes.ts`: optional explicit status icon on `PersonOption`.
- Modify `src/components/PersonalInfoDialog.tsx`: remove the three old fields and render the new status field.
- Modify `src/components/personProfileCardModel.ts`: expose an explicit icon without changing fallback classification for other members.
- Modify `src/components/PersonAvatar.tsx`: render the explicit status icon when present.
- Modify `src/App.tsx`: project the saved status into the current user's team member record.
- Modify `src/components/TeamSwitcher.tsx`: remove all `TeamLogo` rendering while preserving team names, roles, and current-item check.
- Modify `src/components/PersonalCenterPage.tsx`: remove Logo rendering from the responsibility team selector only.
- Modify `src/components/WorkspaceSidebar.tsx`: remove the obsolete compact Logo-only switcher.
- Modify `src/styles/personal-center.css` and `src/styles.css`: status field/picker layout and logo-free team-switch grids.
- Create `server/personalStatus.test.ts`: status domain and storage migration coverage.
- Modify `server/personalCenterResponsibility.test.ts`, `server/personProfileCard.test.ts`, and `server/workspaceNavigation.test.ts`: rendering and data-flow coverage.

### Task 1: Define and migrate the personal status data contract

**Files:**
- Create: `src/lib/personalStatus.ts`
- Modify: `src/data/memberProfiles.ts`
- Test: `server/personalStatus.test.ts`

- [ ] **Step 1: Write failing tests for the fixed set, current v7 profile, and v6 migration**

Create `server/personalStatus.test.ts` with tests equivalent to:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  initialPersonalCenterState,
  loadPersonalCenterState,
  personalCenterStorageKey,
} from "../src/data/memberProfiles.ts";
import { personalStatusOptions } from "../src/lib/personalStatus.ts";

test("personal status uses the agreed fixed icon list", () => {
  assert.deepEqual(personalStatusOptions.map(({ id, label }) => [id, label]), [
    ["general", "普通"],
    ["focus", "专注"],
    ["meeting", "会议"],
    ["away", "暂离"],
    ["travel", "出差"],
    ["rest", "休息"],
  ]);
});

test("the current profile stores only contact and personal status fields", () => {
  assert.equal(personalCenterStorageKey, "agentdoor-personal-center-v7");
  assert.deepEqual(Object.keys(initialPersonalCenterState.profile).sort(), [
    "email", "name", "statusIcon", "statusMessage",
  ]);
  assert.equal(initialPersonalCenterState.profile.statusIcon, "focus");
  assert.equal(initialPersonalCenterState.profile.statusMessage, "正在协调新品上线节奏");
});

test("v6 migration preserves identity and teams without treating biography as status", () => {
  const legacy = {
    ...initialPersonalCenterState,
    profile: {
      name: "保留姓名",
      email: "keep@example.com",
      title: "旧身份",
      timezone: "旧时区",
      bio: "这是一段旧的关于我，不是当前状态",
    },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key: string) => key === "agentdoor-personal-center-v6" ? JSON.stringify(legacy) : null },
  });
  try {
    const migrated = loadPersonalCenterState();
    assert.equal(migrated.profile.name, "保留姓名");
    assert.equal(migrated.profile.email, "keep@example.com");
    assert.equal(migrated.profile.statusIcon, "focus");
    assert.equal(migrated.profile.statusMessage, "正在协调新品上线节奏");
    assert.ok(!migrated.profile.statusMessage.includes("关于我"));
    assert.equal(migrated.teams.length, legacy.teams.length);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
```

- [ ] **Step 2: Run the new test and verify the expected red state**

Run:

```bash
npx tsx --test server/personalStatus.test.ts
```

Expected: FAIL because `src/lib/personalStatus.ts` does not exist and the profile still contains `title`, `timezone`, and `bio`.

- [ ] **Step 3: Add the fixed status domain module**

Create `src/lib/personalStatus.ts`:

```ts
export const personalStatusOptions = [
  { id: "general", label: "普通" },
  { id: "focus", label: "专注" },
  { id: "meeting", label: "会议" },
  { id: "away", label: "暂离" },
  { id: "travel", label: "出差" },
  { id: "rest", label: "休息" },
] as const;

export type PersonalStatusIcon = typeof personalStatusOptions[number]["id"];

export const defaultPersonalStatusIcon: PersonalStatusIcon = "general";

export function isPersonalStatusIcon(value: unknown): value is PersonalStatusIcon {
  return personalStatusOptions.some((option) => option.id === value);
}
```

- [ ] **Step 4: Upgrade the personal-center profile and storage migration**

In `src/data/memberProfiles.ts`:

1. Import `isPersonalStatusIcon` and `PersonalStatusIcon`.
2. Replace the profile contract with:

```ts
profile: {
  name: string;
  email: string;
  statusIcon: PersonalStatusIcon;
  statusMessage: string;
};
```

3. Change the current key to `agentdoor-personal-center-v7` and retain `agentdoor-personal-center-v6` as the newest legacy key.
4. Seed the profile with:

```ts
profile: {
  name: "周岚",
  email: "zhoulan@agentdoor.local",
  statusIcon: "focus",
  statusMessage: "正在协调新品上线节奏",
},
```

5. Extract the existing team validation into a reusable `hasValidTeams(state)` helper. Make `isPersonalCenterState` require a valid status icon and a string status message.
6. Add a legacy profile validator for `{ name, email, title, timezone, bio }` and a `migrateV6State` function that copies `name`, `email`, and teams while taking `statusIcon` and `statusMessage` from the current fixture. Do not copy `bio` into `statusMessage`.
7. Route the existing v5-v1 migration results through the same profile conversion so every returned object satisfies the v7 contract.
8. Read the v7 key first, then v6, then the existing v5-v1 keys.

Use this normalization shape at the migration boundary:

```ts
const migrateLegacyProfile = (profile: LegacyPersonalProfile) => ({
  name: profile.name,
  email: profile.email,
  statusIcon: initialPersonalCenterState.profile.statusIcon,
  statusMessage: initialPersonalCenterState.profile.statusMessage,
});
```

- [ ] **Step 5: Run the data tests and verify green**

Run:

```bash
npx tsx --test server/personalStatus.test.ts server/personalCenterResponsibility.test.ts
```

Expected: PASS. The existing v5 append-semantics migration test must remain green.

- [ ] **Step 6: Commit the data contract change**

```bash
git add src/lib/personalStatus.ts src/data/memberProfiles.ts server/personalStatus.test.ts server/personalCenterResponsibility.test.ts
git commit -m "feat: add persisted personal status"
```

### Task 2: Build the fixed-icon status editor and replace the old fields

**Files:**
- Create: `src/components/PersonalStatusIcon.tsx`
- Create: `src/components/PersonalStatusField.tsx`
- Modify: `src/components/PersonalInfoDialog.tsx`
- Modify: `src/styles/personal-center.css`
- Modify: `server/personalStatus.test.ts`

- [ ] **Step 1: Add failing source/rendering assertions for the personal information form**

Append to `server/personalStatus.test.ts`:

```ts
import { readFileSync } from "node:fs";

const dialogSource = readFileSync(new URL("../src/components/PersonalInfoDialog.tsx", import.meta.url), "utf8");
const fieldSource = readFileSync(new URL("../src/components/PersonalStatusField.tsx", import.meta.url), "utf8");

test("personal information replaces identity, timezone, and biography with one status row", () => {
  const profilePanel = dialogSource.slice(
    dialogSource.indexOf('activeModule === "profile"'),
    dialogSource.indexOf(': activeModule === "team"'),
  );
  assert.match(profilePanel, /<PersonalStatusField/);
  assert.doesNotMatch(profilePanel, /工作身份|时区|关于我|draft\.title|draft\.timezone|draft\.bio|<Textarea/);
  assert.match(fieldSource, />我的状态</);
  assert.match(fieldSource, /aria-label="选择状态图标"/);
  assert.match(fieldSource, /aria-label="状态说明"/);
  assert.match(fieldSource, /personalStatusOptions\.map/);
  assert.match(fieldSource, /DropdownMenuRadioGroup/);
  assert.match(fieldSource, /<Input/);
});
```

- [ ] **Step 2: Run the focused test and verify red**

Run:

```bash
npx tsx --test server/personalStatus.test.ts
```

Expected: FAIL because both status UI components are missing and the old fields still render.

- [ ] **Step 3: Create the shared status glyph component**

Create `src/components/PersonalStatusIcon.tsx` with a complete map:

```tsx
import { CalendarClock, CircleDot, Coffee, Focus, Moon, Plane, type LucideIcon } from "lucide-react";
import type { PersonalStatusIcon } from "../lib/personalStatus";

const personalStatusGlyphs: Record<PersonalStatusIcon, LucideIcon> = {
  general: CircleDot,
  focus: Focus,
  meeting: CalendarClock,
  away: Coffee,
  travel: Plane,
  rest: Moon,
};

export function PersonalStatusIconGlyph({ icon, size = 16 }: { icon: PersonalStatusIcon; size?: number }) {
  const Icon = personalStatusGlyphs[icon];
  return <Icon aria-hidden="true" size={size} strokeWidth={1.8} />;
}
```

- [ ] **Step 4: Create the fixed icon picker plus one-line input**

Create `src/components/PersonalStatusField.tsx` using the existing dropdown primitives:

```tsx
import { Check, ChevronDown } from "lucide-react";
import { personalStatusOptions, type PersonalStatusIcon } from "../lib/personalStatus";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { PersonalStatusIconGlyph } from "./PersonalStatusIcon";

export function PersonalStatusField({ icon, message, onIconChange, onMessageChange }: {
  icon: PersonalStatusIcon;
  message: string;
  onIconChange: (icon: PersonalStatusIcon) => void;
  onMessageChange: (message: string) => void;
}) {
  const selected = personalStatusOptions.find((option) => option.id === icon) ?? personalStatusOptions[0];
  return <div className="personal-status-field">
    <span>我的状态</span>
    <div className="personal-status-control">
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="选择状态图标" className="personal-status-trigger" title={selected.label}>
          <PersonalStatusIconGlyph icon={selected.id} />
          <ChevronDown aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" aria-label="状态图标" className="personal-status-menu" sideOffset={6}>
          <DropdownMenuRadioGroup onValueChange={(value) => onIconChange(value as PersonalStatusIcon)} value={icon}>
            {personalStatusOptions.map((option) => <DropdownMenuRadioItem className="personal-status-option" key={option.id} value={option.id}>
              <PersonalStatusIconGlyph icon={option.id} />
              <span>{option.label}</span>
              {option.id === icon && <Check aria-hidden="true" />}
            </DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Input aria-label="状态说明" onChange={(event) => onMessageChange(event.target.value)} placeholder="用一句话说明你当前的状态" value={message} />
    </div>
  </div>;
}
```

- [ ] **Step 5: Replace old fields in the dialog and trim saved status text**

In `src/components/PersonalInfoDialog.tsx`:

- Remove the `Textarea` import.
- Add `PersonalStatusField`.
- In `save`, write `statusMessage: draft.statusMessage.trim()` alongside trimmed name and email.
- Replace the three old field labels with:

```tsx
<PersonalStatusField
  icon={draft.statusIcon}
  message={draft.statusMessage}
  onIconChange={(statusIcon) => { setDraft({ ...draft, statusIcon }); setSaved(false); }}
  onMessageChange={(statusMessage) => { setDraft({ ...draft, statusMessage }); setSaved(false); }}
/>
```

- [ ] **Step 6: Add compact, keyboard-visible status styles**

In `src/styles/personal-center.css`, replace the `label:last-of-type` span rule with status-specific layout:

```css
.personal-status-field { display: grid; grid-column: 1 / -1; gap: var(--ad-space-2); }
.personal-status-field > span { color: var(--ad-ink-secondary); font-size: var(--ad-text-caption); }
.personal-status-control { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--ad-space-2); }
.personal-status-trigger { display: inline-flex; min-width: var(--ad-control-touch-min); min-height: var(--ad-control-touch-min); align-items: center; justify-content: center; gap: var(--ad-space-1); padding: 0 var(--ad-space-2); border: 1px solid var(--ad-border); border-radius: var(--ad-radius-control); background: var(--ad-surface); color: var(--ad-ink); }
.personal-status-trigger:focus-visible { outline: 2px solid var(--ad-focus); outline-offset: 2px; }
.personal-status-trigger svg:last-child { width: 12px; height: 12px; color: var(--ad-ink-tertiary); }
.personal-status-menu[data-slot="dropdown-menu-content"] { min-width: 176px; }
.personal-status-option[data-slot="dropdown-menu-radio-item"] { display: grid; grid-template-columns: 20px minmax(0, 1fr) 16px; gap: var(--ad-space-2); }
.personal-status-option [data-slot="dropdown-menu-radio-item-indicator"] { display: none; }
```

- [ ] **Step 7: Run the status tests and verify green**

Run:

```bash
npx tsx --test server/personalStatus.test.ts
```

Expected: PASS with no warnings.

- [ ] **Step 8: Commit the status editor**

```bash
git add src/components/PersonalStatusIcon.tsx src/components/PersonalStatusField.tsx src/components/PersonalInfoDialog.tsx src/styles/personal-center.css server/personalStatus.test.ts
git commit -m "feat: replace profile metadata with personal status"
```

### Task 3: Feed the saved icon and message into the current user's profile card

**Files:**
- Modify: `src/data/sharedTypes.ts`
- Modify: `src/components/personProfileCardModel.ts`
- Modify: `src/components/PersonAvatar.tsx`
- Modify: `src/App.tsx`
- Test: `server/personProfileCard.test.ts`
- Test: `server/personalStatus.test.ts`

- [ ] **Step 1: Write failing model and wiring tests**

Add to `server/personProfileCard.test.ts`:

```ts
test("an explicitly selected personal status icon takes priority over text classification", () => {
  const card = createPersonProfileCardModel({
    email: "zhoulan@agentdoor.local",
    id: "me",
    name: "周岚",
    role: "",
    statusIcon: "rest",
    statusMessage: "正在协调新品上线节奏",
  });
  assert.equal(card.statusIcon, "rest");
  assert.equal(card.statusKind, "coordination");
});
```

Add a source assertion to `server/personalStatus.test.ts`:

```ts
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("the saved personal status is projected into the current team member", () => {
  assert.match(appSource, /statusIcon:\s*personalCenterState\.profile\.statusIcon/);
  assert.match(appSource, /statusMessage:\s*personalCenterState\.profile\.statusMessage/);
});
```

- [ ] **Step 2: Run the focused tests and verify red**

Run:

```bash
npx tsx --test server/personProfileCard.test.ts server/personalStatus.test.ts
```

Expected: FAIL because `PersonOption` and the profile-card model do not expose `statusIcon`, and `App.tsx` only projects name/email.

- [ ] **Step 3: Extend the shared person contract and model**

In `src/data/sharedTypes.ts`, import the type and add the optional field:

```ts
import type { PersonalStatusIcon } from "../lib/personalStatus";

export type PersonOption = {
  availability?: string;
  currentWork?: string[];
  dynamicResponsibility?: string;
  email: string;
  id: string;
  name: string;
  phone?: string;
  recentActivity?: string;
  role: string;
  statusIcon?: PersonalStatusIcon;
  statusMessage?: string;
};
```

In `src/components/personProfileCardModel.ts`, include `statusIcon: profile.statusIcon` in the returned model. Keep `statusKind` so members without an explicit icon retain the current text-derived icon behavior.

- [ ] **Step 4: Render explicit icons and retain the fallback**

In `src/components/PersonAvatar.tsx`, import `PersonalStatusIconGlyph` and change the status row to:

```tsx
{card.statusMessage && <p className="person-profile-status" data-status-kind={card.statusKind}>
  {card.statusIcon
    ? <PersonalStatusIconGlyph icon={card.statusIcon} size={14} />
    : <StatusIcon aria-hidden="true" size={14} strokeWidth={1.7} />}
  <span>{card.statusMessage}</span>
</p>}
```

- [ ] **Step 5: Project saved personal status into the current user**

In the `collaborationMembers` memo in `src/App.tsx`, extend only the current-user branch:

```ts
? {
    ...member,
    name: personalCenterState.profile.name,
    email: personalCenterState.profile.email,
    statusIcon: personalCenterState.profile.statusIcon,
    statusMessage: personalCenterState.profile.statusMessage,
  }
: member
```

- [ ] **Step 6: Run the focused tests and verify green**

Run:

```bash
npx tsx --test server/personProfileCard.test.ts server/personDirectory.test.ts server/personalStatus.test.ts
```

Expected: PASS. Existing members without `statusIcon` must retain their derived icon kinds.

- [ ] **Step 7: Commit the profile-card wiring**

```bash
git add src/data/sharedTypes.ts src/components/personProfileCardModel.ts src/components/PersonAvatar.tsx src/App.tsx server/personProfileCard.test.ts server/personalStatus.test.ts
git commit -m "feat: show saved status on personal profile"
```

### Task 4: Remove logos from team switching and remove the compact duplicate

**Files:**
- Modify: `src/components/TeamSwitcher.tsx`
- Modify: `src/components/PersonalCenterPage.tsx`
- Modify: `src/components/WorkspaceSidebar.tsx`
- Modify: `src/styles.css`
- Modify: `src/styles/personal-center.css`
- Test: `server/personalCenterResponsibility.test.ts`
- Test: `server/workspaceNavigation.test.ts`

- [ ] **Step 1: Replace old Logo expectations with failing logo-free assertions**

In `server/personalCenterResponsibility.test.ts`, replace the test named `team switch keeps trigger and Base UI options visually isomorphic` with assertions that the responsibility selector contains `SelectValue`, each option contains the full team name, and the extracted selector source does not contain `TeamLogo`.

Use this core assertion:

```ts
assert.match(selectSource, /<SelectTrigger\b[^>]*className="responsibility-team-select"[^>]*>[\s\S]*?<SelectValue>\{selectedTeam\.name\}<\/SelectValue>[\s\S]*?<\/SelectTrigger>/);
assert.match(selectSource, /state\.teams\.map\([\s\S]*?<SelectItem\b[^>]*value=\{team\.id\}[^>]*>[\s\S]*?<span>\{team\.name\}<\/span>[\s\S]*?<\/SelectItem>/);
assert.doesNotMatch(selectSource, /TeamLogo|team-logo/);
```

In `server/workspaceNavigation.test.ts`, load `TeamSwitcher.tsx` and `WorkspaceSidebar.tsx`, then add:

```ts
test("team switching uses names, roles, and checks without team logos", () => {
  assert.doesNotMatch(teamSwitcherSource, /TeamLogo|team-logo/);
  assert.match(teamSwitcherSource, /activeTeam\.name/);
  assert.match(teamSwitcherSource, /team\.role/);
  assert.match(teamSwitcherSource, /team-switcher-option-check/);
  assert.doesNotMatch(sidebarSource, /<TeamSwitcher/);
});
```

- [ ] **Step 2: Run the focused tests and verify red**

Run:

```bash
npx tsx --test server/personalCenterResponsibility.test.ts server/workspaceNavigation.test.ts
```

Expected: FAIL because the trigger, menu, responsibility selector, and compact sidebar source still render `TeamLogo`.

- [ ] **Step 3: Simplify the global team switcher**

In `src/components/TeamSwitcher.tsx`:

- Remove the `TeamLogo` import and every `TeamLogo` element.
- Remove the `compact` prop and compact-only side/size logic.
- Always render the trigger copy with the team name; preserve the topbar chevron.
- Keep the current summary as team name plus role.
- Keep each option as team name plus role plus current-item check.

The resulting option body must keep this structure:

```tsx
<DropdownMenuRadioItem className="team-switcher-option" key={team.id} value={team.id}>
  <span className="team-switcher-option-copy"><strong>{team.name}</strong><small>{team.role}</small></span>
  {team.id === activeTeam.id && <Check aria-hidden="true" className="team-switcher-option-check" />}
</DropdownMenuRadioItem>
```

- [ ] **Step 4: Remove Logo rendering from the responsibility selector**

In `src/components/PersonalCenterPage.tsx`, keep `TeamLogo` for the team-information panel, but remove it from the responsibility `SelectTrigger` and `SelectItem` elements:

```tsx
<SelectTrigger aria-label={`切换责任所属团队，当前为${selectedTeam.name}`} className="responsibility-team-select" size="sm">
  <SelectValue>{selectedTeam.name}</SelectValue>
</SelectTrigger>
<SelectContent align="end">
  {state.teams.map((team) => <SelectItem className="responsibility-team-option" key={team.id} value={team.id}><span>{team.name}</span></SelectItem>)}
</SelectContent>
```

- [ ] **Step 5: Remove the obsolete compact switcher from the sidebar source**

In `src/components/WorkspaceSidebar.tsx`, remove the `TeamSwitcher` import, its `activeTeamId`, `onTeamChange`, and `teams` props, and the compact `TeamSwitcher` element. Keep `PrimarySection` exported because `App.tsx` imports the type.

- [ ] **Step 6: Update team-switch layouts for text-only content**

In `src/styles.css`:

- Delete `.team-switcher-trigger.compact`.
- Change `.team-switcher-current` to a one-column layout.
- Change `.team-switcher-option` to `grid-template-columns: minmax(0, 1fr) var(--ad-control-icon-sm)`.
- Keep all `.team-logo*` base rules because the team-information panel still uses `TeamLogo` outside switching.

In `src/styles/personal-center.css`, delete the responsibility selector rules that target `.team-logo-sm`, `.team-logo-*`, and `.team-logo + span`; retain overflow/text truncation on the Select value and option text.

- [ ] **Step 7: Run the team-switch tests and verify green**

Run:

```bash
npx tsx --test server/personalCenterResponsibility.test.ts server/workspaceNavigation.test.ts
```

Expected: PASS. The team-information panel may still contain `TeamLogo`; neither switcher source may contain it.

- [ ] **Step 8: Commit the logo-free switching change**

```bash
git add src/components/TeamSwitcher.tsx src/components/PersonalCenterPage.tsx src/components/WorkspaceSidebar.tsx src/styles.css src/styles/personal-center.css server/personalCenterResponsibility.test.ts server/workspaceNavigation.test.ts
git commit -m "refactor: remove logos from team switching"
```

### Task 5: Run scoped verification and requirement review

**Files:**
- Verify only; no planned production changes.

- [ ] **Step 1: Run the complete targeted test set**

Run:

```bash
npx tsx --test server/personalStatus.test.ts server/personProfileCard.test.ts server/personDirectory.test.ts server/personalCenterResponsibility.test.ts server/workspaceNavigation.test.ts
```

Expected: all targeted tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build complete with exit code 0.

- [ ] **Step 3: Inspect the final diff against the approved scope**

Run:

```bash
git diff --check
git diff -- src/lib/personalStatus.ts src/components/PersonalStatusIcon.tsx src/components/PersonalStatusField.tsx src/data/memberProfiles.ts src/data/sharedTypes.ts src/components/PersonalInfoDialog.tsx src/components/personProfileCardModel.ts src/components/PersonAvatar.tsx src/App.tsx src/components/TeamSwitcher.tsx src/components/PersonalCenterPage.tsx src/components/WorkspaceSidebar.tsx src/styles/personal-center.css src/styles.css server/personalStatus.test.ts server/personProfileCard.test.ts server/personalCenterResponsibility.test.ts server/workspaceNavigation.test.ts
```

Expected: no whitespace errors; the diff contains only the approved personal-status and team-switch cleanup plus their tests.

- [ ] **Step 4: Commit any verification-only corrections**

Only if Task 5 revealed a correction, stage the exact touched files and commit them with:

```bash
git commit -m "fix: complete personal status verification"
```

Do not create an empty commit.
