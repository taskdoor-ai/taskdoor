import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("负责人和参与人空状态只显示统一圆形图标，不展示暂不分配或虚线外圈", async () => {
  const { MemberSelector } = await import(new URL("../src/features/members/components/MemberSelector.tsx", import.meta.url).href);
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

test("负责人和参与人共用暂不分配操作，多选清空仍遵守最少人数限制", () => {
  const picker = read("features/members/components/PersonPicker.tsx");
  const selector = read("features/members/components/MemberSelector.tsx");

  assert.match(selector, /allowUnassigned = true/);
  assert.equal((selector.match(/allowUnassigned=\{allowUnassigned && min === 0\}/g) ?? []).length, 3);
  assert.doesNotMatch(picker, /allowUnassigned && !multiple &&/);
  assert.match(picker, /aria-pressed=\{isUnassigned\}/);
  assert.match(picker, /if \(props\.multiple\) props\.onChange\(\[\]\)/);
});

test("创建方案保留未分配提示，人员列表与确认区域复用邀请入口", () => {
  const page = read("features/tasks/components/TaskCreationPage.tsx");
  const plan = read("features/tasks/components/TaskCreationPlanEditor.tsx");
  const subtask = read("features/tasks/components/TaskCreationSubtaskEditor.tsx");
  const app = read("app/App.tsx");

  assert.match(page, /unassignedTaskCount/);
  assert.match(page, /个任务暂不分配负责人，可先创建/);
  assert.doesNotMatch(page, /邀请更多同事参与协作/);
  assert.match(plan, /<MemberSelector allowUnassigned[^>]*label="负责人"/);
  assert.match(subtask, /<MemberSelector allowUnassigned[^>]*label=\{`\$\{label\}负责人`\}/);
  assert.match(app, /openMemberInviteDialog\(returnFocus\)/);
  assert.doesNotMatch(app, /openPersonalCenter\("members", returnFocus\)/);
});

test("邀请说明作为暂不分配的副标题，立即邀请保持独立操作", () => {
  const picker = read("features/members/components/PersonPicker.tsx");
  const detail = read("features/tasks/components/TaskDetail.tsx");

  assert.match(picker, /unassignedLabel = d\('unassigned'\)/);
  assert.doesNotMatch(picker, /person-picker-invite-row|<small title=\{unassignedDescription\}/);
  assert.match(picker, /person-picker-unassigned/);
  assert.match(picker, /const invitationHint = !inviteCandidate && !isMentionTrigger && allowInvitations && onInviteMembers/);
  assert.match(picker, /aria-describedby=\{invitationHint \? inviteDescriptionId : undefined\}/);
  assert.match(picker, /<\/button>\s*\{invitationHint\}/);
  assert.match(picker, /!canUnassign && invitationHint && <div className="person-picker-invite-hint"/);
  assert.match(picker, /person-picker-invite-copy[^\n]*unassignedDescription/);
  assert.match(picker, /person-picker-invite-action[^\n]*d\('inviteNow'\)/);
  assert.ok(picker.indexOf("person-picker-search") < picker.indexOf("person-picker-unassigned"));
  assert.ok(picker.indexOf("person-picker-unassigned") < picker.indexOf("<Combobox.List"));
  assert.ok(picker.indexOf("person-picker-unassigned") < picker.indexOf("person-picker-invite-hint"));
  assert.ok(picker.indexOf("person-picker-invite-hint") < picker.indexOf("<Combobox.List"));
  assert.doesNotMatch(picker, /邀请链接|邀请更多同事参与进来|邀请更多同事加入团队/);
  assert.doesNotMatch(detail, /提议：/);
  assert.doesNotMatch(detail, /task-owner-invite-action/);
  assert.doesNotMatch(detail, />邀请同事</);
});

test("团队邀请链接保留在设置，人员邀请入口复用名称和邮箱弹窗", async () => {
  const app = read("app/App.tsx");
  const form = read("features/members/components/MemberInvitations.tsx");
  const settings = read("features/members/components/PersonalCenterPage.tsx");
  const profiles = await import(new URL("../src/ai/mock/data/memberProfiles.ts", import.meta.url).href);
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
  const { copyTextToClipboard } = await import(new URL("../src/shared/lib/clipboard.ts", import.meta.url).href);
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
    read("features/members/components/PersonPicker.tsx"),
    read("features/tasks/components/TaskCreationPage.tsx"),
    read("ai/mock/lib/mockTaskAssistant.ts"),
    read("../server/taskAssistant.ts"),
  ].join("\n");

  assert.doesNotMatch(sources, /暂未分配/);
});

test("负责人保存后直接作为正式负责人展示，不显示任务内邀请状态", () => {
  const detail = read("features/tasks/components/TaskDetail.tsx");

  assert.match(detail, /const displayedOwnerId = confirmedOwnerId/);
  assert.match(detail, /selected=\{displayedOwnerId \? \[displayedOwnerId\] : \[\]\}/);
  assert.doesNotMatch(detail, /pendingOwnerId|ownerInvitationStatus|onOwnerProposalChange/);
});

test("人员弹窗保留推荐排序和勾选，移除匹配度标识", () => {
  const picker = read("features/members/components/PersonPicker.tsx");

  assert.match(picker, /memberRecommendations/);
  assert.doesNotMatch(picker, /person-picker-match-score|recommendation\.score|\{recommendation\.score\}%/);
  assert.match(picker, /sortMembersByRecommendation\(members, memberRecommendations\)/);
  assert.match(picker, /Combobox.ItemIndicator/);
  assert.doesNotMatch(picker, /Sparkles|person-picker-ai-reason|data-recommendation-level|recommendationReason/);
  assert.match(picker, /listRef\.current\.scrollTop = 0/);
  assert.doesNotMatch(picker, /isSelf && selfOptionLabel === "我自己处理" \? `\$\{person\.name\} · \$\{person\.role\}` : person\.role/);
});

test("人员弹窗使用300px紧凑宽度", () => {
  const tokens = read("shared/styles/tokens.css");

  assert.match(tokens, /--ad-person-picker-width:\s*300px/);
});
