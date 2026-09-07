import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("负责人和参与人空状态只显示统一圆形图标，不展示暂不分配或虚线外圈", async () => {
  const { MemberSelector } = await import(new URL("../src/components/MemberSelector.tsx", import.meta.url).href);
  const owner = renderToStaticMarkup(createElement(MemberSelector, {
    allowUnassigned: true,
    hideHeader: true,
    label: "负责人",
    max: 1,
    members: [{ id: "me", name: "当前成员", email: "me@example.com", role: "成员" }],
    onChange: () => undefined,
    selected: [],
  }));
  const participants = renderToStaticMarkup(createElement(MemberSelector, {
    hideHeader: true,
    hideSelectedName: true,
    label: "参与人",
    members: [{ id: "me", name: "当前成员", email: "me@example.com", role: "成员" }],
    onChange: () => undefined,
    selected: [],
    stacked: true,
  }));

  assert.match(owner, /aria-label="添加负责人"/);
  assert.match(participants, /aria-label="添加参与人"/);
  assert.match(owner, /person-picker-empty-icon/);
  assert.match(participants, /person-picker-empty-icon/);
  assert.match(owner, /lucide-user-round-x/);
  assert.match(participants, /lucide-user-round-x/);
  assert.doesNotMatch(owner + participants, /暂不分配|暂未分配|border-dashed/);
});

test("负责人和参与人共用暂不分配与邀请区域，多选清空仍遵守最少人数限制", () => {
  const picker = read("components/PersonPicker.tsx");
  const selector = read("components/MemberSelector.tsx");

  assert.match(selector, /allowUnassigned = true/);
  assert.equal((selector.match(/allowUnassigned=\{allowUnassigned && min === 0\}/g) ?? []).length, 3);
  assert.doesNotMatch(picker, /allowUnassigned && !multiple &&/);
  assert.match(picker, /aria-pressed=\{isUnassigned\}/);
  assert.match(picker, /if \(props\.multiple\) props\.onChange\(\[\]\)/);
});

test("创建方案保留未分配提示，人员列表与确认区域复用邀请入口", () => {
  const page = read("components/TaskCreationPage.tsx");
  const plan = read("components/TaskCreationPlanEditor.tsx");
  const subtask = read("components/TaskCreationSubtaskEditor.tsx");
  const app = read("App.tsx");

  assert.match(page, /unassignedTaskCount/);
  assert.match(page, /个任务暂不分配负责人，可先创建/);
  assert.doesNotMatch(page, /邀请更多同事参与协作/);
  assert.match(plan, /<MemberSelector allowUnassigned[^>]*label="负责人"/);
  assert.match(subtask, /<MemberSelector allowUnassigned[^>]*label=\{`\$\{label\}负责人`\}/);
  assert.match(app, /openMemberInviteDialog\(returnFocus\)/);
  assert.doesNotMatch(app, /openPersonalCenter\("members", returnFocus\)/);
});

test("搜索下方的暂不分配选项使用单行邀请说明和立即邀请入口", () => {
  const picker = read("components/PersonPicker.tsx");
  const detail = read("components/TaskDetail.tsx");

  assert.match(picker, /unassignedLabel = "暂不分配"/);
  assert.match(picker, /unassignedDescription = "没找到合适的人，邀请更多同事进来协作"/);
  assert.match(picker, /person-picker-unassigned/);
  assert.match(picker, />立即邀请<\/button>/);
  assert.ok(picker.indexOf("person-picker-search") < picker.indexOf("person-picker-unassigned"));
  assert.ok(picker.indexOf("person-picker-unassigned") < picker.indexOf("<Combobox.List"));
  assert.doesNotMatch(picker, /邀请链接|邀请更多同事参与进来|邀请更多同事加入团队/);
  assert.doesNotMatch(detail, /提议：/);
  assert.doesNotMatch(detail, /task-owner-invite-action/);
  assert.doesNotMatch(detail, />邀请同事</);
});

test("邀请弹窗不显示重复小标题，但输入框保留邀请地址的无障碍名称", async () => {
  const app = read("App.tsx");
  const profiles = await import(new URL("../src/data/memberProfiles.ts", import.meta.url).href);

  assert.equal(
    profiles.getTeamInviteLink({ id: "creator-commerce", inviteToken: "abc123" }),
    "https://agentdoor.local/t/creator-commerce/join/abc123",
  );
  assert.match(app, /open=\{memberInviteOpen\}/);
  assert.match(app, /<DialogTitle>邀请成员<\/DialogTitle>/);
  assert.match(app, /aria-label="邀请地址"/);
  assert.doesNotMatch(app, /<span>邀请地址<\/span>/);
  assert.match(app, /aria-label="复制邀请地址"/);
  assert.match(app, />复制<\/Button>/);
  assert.match(app, /copyTextToClipboard\(activeTeamInviteLink\)/);
});

test("系统剪贴板不可用时，邀请地址复制会回退到页面内复制", async () => {
  const { copyTextToClipboard } = await import(new URL("../src/lib/clipboard.ts", import.meta.url).href);
  const calls: string[] = [];

  await copyTextToClipboard("https://agentdoor.local/invite", {
    legacyCopy: (value: string) => { calls.push(`fallback:${value}`); return true; },
    writeText: async (value: string) => { calls.push(`clipboard:${value}`); throw new Error("denied"); },
  });

  assert.deepEqual(calls, [
    "clipboard:https://agentdoor.local/invite",
    "fallback:https://agentdoor.local/invite",
  ]);
});

test("负责人未分配文案不再混用暂未分配", () => {
  const sources = [
    read("components/PersonPicker.tsx"),
    read("components/TaskCreationPage.tsx"),
    read("lib/mockTaskAssistant.ts"),
    read("../server/taskAssistant.ts"),
  ].join("\n");

  assert.doesNotMatch(sources, /暂未分配/);
});

test("待接受负责人直接使用头像右下角状态，不冒充已确认负责人", () => {
  const detail = read("components/TaskDetail.tsx");

  assert.match(detail, /const displayedOwnerId = pendingOwnerId \?\? confirmedOwnerId/);
  assert.match(detail, /invitationStatusById=\{ownerInvitationStatus\}/);
  assert.match(detail, /selected=\{displayedOwnerId \? \[displayedOwnerId\] : \[\]\}/);
  assert.match(detail, /pendingOwnerId \? "pending"(?: as const)? : "accepted"/);
});

test("人员弹窗只展示头像名称，并把 AI 匹配度与理由放在右侧", () => {
  const picker = read("components/PersonPicker.tsx");

  assert.match(picker, /memberRecommendations/);
  assert.match(picker, /person-picker-match-score/);
  assert.match(picker, /data-match-tone=\{getMemberMatchTone\(recommendation\.score\)\}/);
  assert.match(picker, /AI 建议理由/);
  assert.match(picker, /Sparkles/);
  assert.match(picker, /listRef\.current\.scrollTop = 0/);
  assert.doesNotMatch(picker, /isSelf && selfOptionLabel === "我自己处理" \? `\$\{person\.name\} · \$\{person\.role\}` : person\.role/);
});

test("人员弹窗加宽并让邀请说明与操作保持一行", () => {
  const tokens = read("../styles/agentdoor-tokens.css");
  const styles = read("styles.css");

  assert.match(tokens, /--ad-person-picker-width:\s*420px/);
  assert.match(styles, /\.person-picker-invite-row small\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /\.person-picker-invite-row\s*\{[^}]*align-items:\s*baseline/s);
});

test("人员匹配度按高、中、低三档着色", async () => {
  const { getMemberMatchTone } = await import(new URL("../src/components/PersonPicker.tsx", import.meta.url).href);
  const styles = read("styles.css");

  assert.equal(getMemberMatchTone(100), "high");
  assert.equal(getMemberMatchTone(80), "high");
  assert.equal(getMemberMatchTone(79), "medium");
  assert.equal(getMemberMatchTone(50), "medium");
  assert.equal(getMemberMatchTone(49), "low");
  assert.equal(getMemberMatchTone(0), "low");
  assert.match(styles, /person-picker-match-score\[data-match-tone="high"\][^{]*\{[^}]*var\(--ad-tag-green-ink\)/s);
  assert.match(styles, /person-picker-match-score\[data-match-tone="medium"\][^{]*\{[^}]*var\(--ad-tag-orange-ink\)/s);
  assert.match(styles, /person-picker-match-score\[data-match-tone="low"\][^{]*\{[^}]*var\(--ad-tag-red-ink\)/s);
});
