import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PersonAvatar } from "../src/shared/ui/PersonAvatar";
import { applyPersonalProfileDraft, initialPersonalCenterState, isPersonalCenterState } from "../src/ai/mock/data/memberProfiles";
import { validatePersonalAvatarFile } from "../src/features/me/lib/personal-avatar";

const appSource = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
const dialogSource = readFileSync(new URL("../src/app/workspace/components/PersonalInfoDialog.tsx", import.meta.url), "utf8");
const passwordChangeSource = readFileSync(new URL("../src/features/auth/components/WorkspacePasswordChange.tsx", import.meta.url), "utf8");
const stylesheetSource = readFileSync(new URL("../src/shared/styles/personal-center.css", import.meta.url), "utf8");

test("personal center state accepts an optional local avatar data URL", () => {
  const state = structuredClone(initialPersonalCenterState) as unknown as Record<string, any>;
  state.profile.avatarDataUrl = "data:image/png;base64,YXZhdGFy";

  assert.equal(isPersonalCenterState(state), true);
  assert.equal(isPersonalCenterState({
    ...state,
    profile: { ...state.profile, avatarDataUrl: 1 },
  }), false);
  assert.equal(isPersonalCenterState({
    ...state,
    profile: { ...state.profile, avatarDataUrl: "https://example.com/avatar.png" },
  }), false);
});

test("local avatar validation accepts supported images and rejects invalid candidates", () => {
  assert.equal(validatePersonalAvatarFile({ size: 1024, type: "image/png" }), "");
  assert.equal(validatePersonalAvatarFile({ size: 1024, type: "image/jpeg" }), "");
  assert.equal(validatePersonalAvatarFile({ size: 1024, type: "image/webp" }), "");
  assert.match(validatePersonalAvatarFile({ size: 1024, type: "text/plain" }), /JPG、PNG 或 WebP/);
  assert.match(validatePersonalAvatarFile({ size: 2 * 1024 * 1024 + 1, type: "image/png" }), /2 MB/);
});

test("person avatar prefers a saved custom image", () => {
  const html = renderToStaticMarkup(createElement(PersonAvatar, {
    avatarUrl: "data:image/png;base64,YXZhdGFy",
    name: "周岚",
    showProfilePreview: false,
  }));

  assert.match(html, /src="data:image\/png;base64,YXZhdGFy"/);
});

test("app merges the saved avatar into the current user profile", () => {
  assert.match(
    appSource,
    /member\.id === currentUserId[\s\S]{0,180}?avatarUrl:\s*personalCenterState\.profile\.avatarDataUrl/,
  );
});

test("personal information places read-only account details below the name and above save", () => {
  const panelStart = dialogSource.indexOf('<div className="personal-profile-panel">');
  const panelSource = dialogSource.slice(
    panelStart,
    dialogSource.indexOf(': activeModule === "team"', panelStart),
  );

  assert.match(panelSource, /className="personal-avatar-setting"/);
  assert.match(panelSource, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(panelSource, /type="file"/);
  assert.match(panelSource, /className="personal-avatar-choice"/);
  assert.match(panelSource, /<AvatarEditActions\b/);
  assert.match(panelSource, /avatarUrl=\{draft\.avatarDataUrl\}/);
  assert.match(panelSource, /<span>\{m\('name'\)\}<\/span><Input\b[\s\S]*?<WorkspacePasswordChange\b[\s\S]*?personal-profile-actions/);
  assert.doesNotMatch(panelSource, /draft\.email/);
  const accountFields = passwordChangeSource.slice(0, passwordChangeSource.indexOf("<DialogContent"));
  assert.match(accountFields, /<Input\b[^>]*\breadOnly\b[^>]*value=\{accountEmail \?\? ""\}[^>]*\/>\s*<\/label>\s*<DialogTrigger\b[^>]*variant="link"/);
  assert.doesNotMatch(panelSource, />工作身份<|>时区<|>关于我</);
  assert.doesNotMatch(panelSource, /personal-profile-email|draft\.title|draft\.timezone|draft\.bio/);
});

test("profile save updates name and avatar while protecting account and membership emails", () => {
  const draft = {
    ...initialPersonalCenterState.profile,
    email: "another-address@example.com",
    avatarDataUrl: "data:image/png;base64,YXZhdGFy",
    name: " 周岚 ",
  };
  const next = applyPersonalProfileDraft(initialPersonalCenterState, draft);

  assert.equal(next.profile.email, initialPersonalCenterState.profile.email);
  assert.equal(next.profile.name, "周岚");
  assert.equal(next.profile.avatarDataUrl, draft.avatarDataUrl);
  assert.deepEqual(next.teams, initialPersonalCenterState.teams);
});

test("personal avatar layout has a large circular preview and an overlay edit control", () => {
  const previewRule = stylesheetSource.match(/\.personal-avatar-preview \.person-avatar \{[^}]*}/s)?.[0] ?? "";
  const emailRule = stylesheetSource.match(/\.personal-profile-email \{[^}]*}/s)?.[0] ?? "";
  const actionsRule = stylesheetSource.match(/\.personal-profile-actions \{[^}]*}/s)?.[0] ?? "";

  assert.match(stylesheetSource, /\.personal-avatar-setting \{[^}]*display:\s*grid/s);
  assert.match(stylesheetSource, /\.personal-avatar-preview \{[^}]*width:\s*var\(--ad-person-profile-avatar-size\)[^}]*height:\s*var\(--ad-person-profile-avatar-size\)/s);
  assert.match(stylesheetSource, /\.personal-avatar-choice \{[^}]*width:\s*100%[^}]*height:\s*100%/s);
  assert.doesNotMatch(previewRule, /--person-avatar-size|border:|box-shadow:/);
  assert.match(stylesheetSource, /\.personal-avatar-edit \{[^}]*position:\s*absolute[^}]*z-index:\s*2[^}]*right:\s*0[^}]*bottom:\s*0/s);
  assert.equal(emailRule, "");
  assert.doesNotMatch(actionsRule, /border-top:/);
  assert.doesNotMatch(dialogSource, /点击图标选择本地图片/);
});
