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

test("团队邀请链接保留在设置，人员邀请入口复用名称和邮箱弹窗", async () => {
  const app = read("App.tsx");
  const form = read("components/MemberInvitations.tsx");
  const settings = read("components/PersonalCenterPage.tsx");
  const profiles = await import(new URL("../src/data/memberProfiles.ts", import.meta.url).href);
  assert.equal(profiles.getTeamInviteLink({ id: "creator-commerce", inviteToken: "abc123" }), "https://agentdoor.local/t/creator-commerce/join/abc123");
  assert.match(app, /memberInvitationsRef.current\?\.openInvite/);
  assert.match(settings, /invitations\?\.openInvite/);
  assert.match(form, /<DialogTitle>邀请人员<\/DialogTitle>/);
  assert.match(form, /aria-label="名称"/);
  assert.match(form, /aria-label="邮箱"/);
  assert.match(settings, /aria-label="复制邀请链接"/);
  assert.doesNotMatch(settings, /邀请于/);
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

test("负责人保存后直接作为正式负责人展示，不显示任务内邀请状态", () => {
  const detail = read("components/TaskDetail.tsx");

  assert.match(detail, /const displayedOwnerId = confirmedOwnerId/);
  assert.match(detail, /selected=\{displayedOwnerId \? \[displayedOwnerId\] : \[\]\}/);
  assert.doesNotMatch(detail, /pendingOwnerId|ownerInvitationStatus|onOwnerProposalChange/);
});

test("人员弹窗只为未选择成员展示推荐度星芒，选中后只保留勾选", () => {
  const picker = read("components/PersonPicker.tsx");

  assert.match(picker, /memberRecommendations/);
  assert.doesNotMatch(picker, /person-picker-match-score|recommendation\.score|\{recommendation\.score\}%/);
  assert.match(picker, /const recommendation = !selected &&/);
  assert.match(picker, /data-recommendation-level=\{recommendation\.level\}/);
  assert.match(picker, /getMemberRecommendationLabel\(recommendation\.level\)/);
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

test("人员推荐度使用同一紫色语义的深、中、浅三档", async () => {
  const { getMemberRecommendationLabel } = await import(new URL("../src/components/PersonPicker.tsx", import.meta.url).href);
  const styles = read("styles.css");

  assert.equal(getMemberRecommendationLabel("high"), "推荐度较高");
  assert.equal(getMemberRecommendationLabel("medium"), "推荐度适中");
  assert.equal(getMemberRecommendationLabel("low"), "推荐度较低");
  assert.match(styles, /person-picker-ai-reason\[data-recommendation-level="high"\][^{]*\{[^}]*var\(--ad-route\)/s);
  assert.match(styles, /person-picker-ai-reason\[data-recommendation-level="medium"\][^{]*\{[^}]*color-mix\(in srgb, var\(--ad-route\) 64%, var\(--ad-border-strong\)\)/s);
  assert.match(styles, /person-picker-ai-reason\[data-recommendation-level="low"\][^{]*\{[^}]*color-mix\(in srgb, var\(--ad-route\) 32%, var\(--ad-border-strong\)\)/s);
  assert.doesNotMatch(styles, /person-picker-match-score/);
});
