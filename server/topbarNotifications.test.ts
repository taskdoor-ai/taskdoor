import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

// Node does not render stylesheets; keep the real component and Base UI rendering.
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);

const notificationSource = readFileSync(new URL("../src/components/GlobalNotifications.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles/notifications.css", import.meta.url), "utf8");

async function renderNotifications(placement?: "rail" | "topbar") {
  const { GlobalNotifications } = await import(new URL("../src/components/GlobalNotifications.tsx", import.meta.url).href);
  return renderToStaticMarkup(createElement(GlobalNotifications, { placement }));
}

async function sheetElements(props: Record<string, unknown> = {}) {
  const { SheetContent } = await import(new URL("../src/components/ui/sheet.tsx", import.meta.url).href);
  const portal = SheetContent(props);
  return Children.toArray(portal.props.children) as ReactElement<Record<string, unknown>>[];
}

function cssRule(selector: string, source = styles) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`(?:^|\\n)\\s*${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `缺少 ${selector} 的样式`);
  return match[1];
}

test("顶栏通知使用独立按钮样式并保留未读数量的可访问名称", async () => {
  const html = await renderNotifications("topbar");

  assert.match(html, /<button[^>]*aria-label="通知，3 项未读"/);
  assert.match(html, /class="notification-trigger notification-trigger-topbar"/);
  assert.match(html, /<span aria-hidden="true" class="notification-trigger-count">3<\/span>/);
  assert.doesNotMatch(html, /rail-item|data-tooltip=/);
});

test("未指定摆放位置时兼容旧侧栏通知入口", async () => {
  for (const placement of [undefined, "rail"] as const) {
    const html = await renderNotifications(placement);
    assert.match(html, /class="rail-item notification-trigger"/);
    assert.match(html, /aria-label="通知，3 项未读"/);
  }
});

test("右侧通知抽屉同时把方向交给内容与遮罩，默认仍使用左侧布局", async () => {
  const [backdrop, popup] = await sheetElements({ side: "right" });
  assert.equal(backdrop.props["data-side"], "right");
  assert.equal(popup.props["data-side"], "right");
  const [legacyBackdrop, legacyPopup] = await sheetElements();
  assert.equal(legacyBackdrop.props["data-side"], "left");
  assert.equal(legacyPopup.props["data-side"], "left");
});

test("顶栏使用右侧抽屉，并将关闭后的焦点明确交还同一通知按钮", async () => {
  assert.ok(/side=\{placement === "topbar" \? "right" : "left"\}/.test(notificationSource), "顶栏通知必须使用右侧抽屉");
  assert.ok(/const triggerRef = useRef<HTMLButtonElement>\(null\)/.test(notificationSource), "关闭后须有明确的触发器焦点目标");
  assert.ok(/<SheetTrigger\s+ref=\{triggerRef\}/.test(notificationSource), "焦点引用必须绑定真实通知触发器");
  assert.ok(/<SheetContent\s+finalFocus=\{triggerRef\}/.test(notificationSource), "关闭或 Escape 的焦点恢复交由 Base UI 执行");

  const triggerRef = { current: null };
  const [, popup] = await sheetElements({ finalFocus: triggerRef, side: "right" });
  assert.equal(popup.props.finalFocus, triggerRef);
});

test("顶栏铃铛保持 44px 点击区域，数字角标为清晰的 20px 通知红徽标", () => {
  const trigger = cssRule(".notification-trigger-topbar");
  assert.match(trigger, /width:\s*var\(--ad-control-touch-min\)/);
  assert.match(trigger, /height:\s*var\(--ad-control-touch-min\)/);
  assert.match(trigger, /flex:\s*0 0 auto/);
  assert.match(cssRule(".notification-trigger-topbar:focus-visible"), /outline:\s*2px solid var\(--ad-focus\)/);
  const badge = cssRule(".notification-trigger-count");
  assert.match(badge, /box-sizing:\s*border-box/);
  assert.match(badge, /min-width:\s*20px/);
  assert.match(badge, /height:\s*20px/);
  assert.match(badge, /padding:\s*0 5px/);
  assert.match(badge, /background:\s*var\(--ad-notification-badge\)/);
  assert.match(badge, /font-size:\s*11px/);
  assert.match(badge, /font-variant-numeric:\s*tabular-nums/);
  assert.match(cssRule(".notification-trigger-topbar .notification-trigger-count"), /border-color:\s*var\(--ad-surface\)/);
  const tokens = readFileSync(new URL("../styles/agentdoor-tokens.css", import.meta.url), "utf8");
  assert.match(tokens, /--ad-control-touch-min:\s*44px/);
  assert.match(tokens, /--ad-notification-badge:\s*#d92d3e/);
});

test("右侧抽屉与遮罩不预留旧侧栏宽度，移动端占满视口", () => {
  const popup = cssRule('.sheet-content[data-side="right"]');
  assert.match(popup, /right:\s*0/);
  assert.match(popup, /left:\s*auto/);
  assert.match(popup, /width:\s*min\(100vw,\s*var\(--ad-notification-panel-width\)\)/);
  assert.match(popup, /border-right:\s*0/);
  assert.match(cssRule('.sheet-backdrop[data-side="right"]'), /inset:\s*0/);
  assert.doesNotMatch(popup, /--ad-sidebar-collapsed-width/);
  const mobileStyles = styles.slice(styles.indexOf("@media (max-width: 640px)"));
  assert.match(cssRule('.sheet-content[data-side="right"]', mobileStyles), /width:\s*100vw/);
});

test("减少动画偏好同时覆盖右侧进入和关闭动画", () => {
  const reducedStyles = styles.slice(styles.indexOf("@media (prefers-reduced-motion: reduce)"));
  const reducedAnimationRule = cssRule('.sheet-backdrop, .sheet-content[data-side], .sheet-content[data-side][data-ending-style]', reducedStyles);
  assert.match(reducedAnimationRule, /animation:\s*none/);
  assert.match(cssRule(".notification-trigger-topbar", reducedStyles), /transition:\s*none/);
});

test("移动端通知头部的关闭、返回、全部已读与筛选按钮均至少 44px", () => {
  const mobileStyles = styles.slice(styles.indexOf("@media (max-width: 640px)"));
  const controls = cssRule(".sheet-close, .notification-mark-read, .notification-filter-trigger", mobileStyles);
  assert.match(controls, /min-width:\s*var\(--ad-control-touch-min\)/);
  assert.match(controls, /min-height:\s*var\(--ad-control-touch-min\)/);
});

test("点击通知普通区域只标记已读，不跳转或关闭面板", () => {
  assert.doesNotMatch(notificationSource, /respondToInvitation|NotificationResponse|finishNavigation|<Dialog|>接受<|>拒绝</);
  assert.match(notificationSource, /onRead=\{\(\) => markRead\(item\)\}/);
  const readHandler = notificationSource.match(/const markRead = \(item: WorkspaceNotification\) => \{([\s\S]*?)\n  \};/);
  assert.ok(readHandler);
  assert.match(readHandler[1], /read: true/);
  assert.doesNotMatch(readHandler[1], /setSheetOpen|changeSheetOpen|setActiveFilter/);
});

test("三类通知仅展示类型、完整文案和时间，不要求成员来源", async () => {
  const { notificationExamples, notificationTypeLabels } = await import("../src/data/notificationExamples.ts");
  const { NotificationItem } = await import("../src/components/GlobalNotifications.tsx");
  assert.deepEqual(notificationExamples.map(item => item.kind).sort(), ["invitation", "member-joined", "mention"]);
  for (const [index, item] of notificationExamples.entries()) {
    const html = renderToStaticMarkup(createElement(NotificationItem, { item, onRead() {} }));
    assert.ok(html.includes(`【${notificationTypeLabels[item.kind]}】`));
    assert.ok(html.replace(/<[^>]+>/g, "").includes(item.content));
    assert.match(html, /<time dateTime=/i);
    assert.match(html, /notification-unread-dot/);
    assert.doesNotMatch(html, /person-avatar|notification-item-excerpt|notification-item-context|接受|拒绝/);
    const readHtml = renderToStaticMarkup(createElement(NotificationItem, { item: { ...item, read: true }, onRead() {} }));
    assert.doesNotMatch(readHtml, /notification-unread-dot/);
    if (index) assert.ok(Date.parse(notificationExamples[index - 1].createdAt) >= Date.parse(item.createdAt));
  }
  const systemItem = { id: "system", kind: "member-joined" as const, content: "新成员已加入团队。", createdAt: "2026-09-01T10:00:00+08:00", time: "10:00", read: false };
  const html = renderToStaticMarkup(createElement(NotificationItem, { item: systemItem, onRead() {} }));
  assert.ok(html.includes(systemItem.content));
  assert.doesNotMatch(html, /undefined|person-avatar/);
});

test("非演示团队不注入内置通知，空列表无未读角标", async () => {
  const { GlobalNotifications } = await import("../src/components/GlobalNotifications.tsx");
  const html = renderToStaticMarkup(createElement(GlobalNotifications, { showDemoNotifications: false }));
  assert.match(html, /通知，0 项未读/);
  assert.doesNotMatch(html, /notification-trigger-count/);
});


test("任务名称独立显示为链接，协作邀请类型统一命名", async () => {
  const { notificationExamples, notificationTypeLabels } = await import("../src/data/notificationExamples.ts");
  const { NotificationItem } = await import("../src/components/GlobalNotifications.tsx");
  assert.equal(notificationTypeLabels.invitation, "协作邀请");
  for (const item of notificationExamples) {
    const html = renderToStaticMarkup(createElement(NotificationItem, { item, onRead() {}, onOpenTask() {} }));
    if (item.task) {
      assert.match(html, /role="link"/);
      assert.ok(html.includes(`>${item.task.title}</button>`));
      assert.ok(html.replace(/<[^>]+>/g, "").includes(item.content));
    } else assert.doesNotMatch(html, /role="link"/);
    assert.match(html, /class="notification-item-read"[^>]*><\/button>/);
  }
});
