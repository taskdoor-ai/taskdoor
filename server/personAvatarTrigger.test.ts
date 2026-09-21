import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PersonAvatar, PersonName } from "../src/components/PersonAvatar.tsx";
import type { PersonOption } from "../src/data/sharedTypes.ts";

const profile: PersonOption = {
  email: "chenmo@agentdoor.local",
  id: "member-chenmo",
  name: "陈默",
  phone: "138 6218 9074",
  role: "达人商务经理",
  statusMessage: "正在跟进防晒达人合作",
};

test("profile preview trigger forwards Base UI attributes to the real avatar element", () => {
  const html = renderToStaticMarkup(createElement(PersonAvatar, {
    name: profile.name,
    profile,
    profilePreviewFocusable: false,
  }));

  assert.match(html, /aria-label="View 陈默’s profile"/);
});

test("a rendered person name is also a profile preview trigger", () => {
  const html = renderToStaticMarkup(createElement(PersonName, {
    name: profile.name,
    profile,
  }));

  assert.match(html, /class="person-name-trigger"/);
  assert.match(html, /aria-label="View 陈默’s profile"/);
  assert.match(html, />陈默<\/span>/);
});

test("a non-focusable avatar preview never binds itself to the surrounding canvas card", () => {
  const source = readFileSync(new URL("../src/components/PersonAvatar.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /closest<HTMLElement>\("button, a\[href\], \[tabindex\]"\)/);
  assert.doesNotMatch(source, /focusOwner\.addEventListener\("focus"/);
});

test("正式任务成员头像不显示已接受角标，团队待加入提示仍保留", () => {
  const accepted = renderToStaticMarkup(createElement(PersonAvatar, {
    invitationStatus: "accepted",
    name: profile.name,
    profile,
  }));
  const pending = renderToStaticMarkup(createElement(PersonAvatar, {
    invitationStatus: "pending",
    name: "待加入成员",
    showProfilePreview: false,
  }));

  assert.doesNotMatch(accepted, /person-avatar-invitation-status|邀请已接受/);
  assert.match(pending, /person-avatar-invitation-status pending/);
  assert.match(pending, /Invitation pending/);
});
