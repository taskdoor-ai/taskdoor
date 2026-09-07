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

  assert.match(html, /aria-label="查看陈默的人员信息"/);
});

test("a rendered person name is also a profile preview trigger", () => {
  const html = renderToStaticMarkup(createElement(PersonName, {
    name: profile.name,
    profile,
  }));

  assert.match(html, /class="person-name-trigger"/);
  assert.match(html, /aria-label="查看陈默的人员信息"/);
  assert.match(html, />陈默<\/span>/);
});

test("a non-focusable avatar preview never binds itself to the surrounding canvas card", () => {
  const source = readFileSync(new URL("../src/components/PersonAvatar.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /closest<HTMLElement>\("button, a\[href\], \[tabindex\]"\)/);
  assert.doesNotMatch(source, /focusOwner\.addEventListener\("focus"/);
});
