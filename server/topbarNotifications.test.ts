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
  return renderToStaticMarkup(createElement(GlobalNotifications, { onOpenTaskInsight: () => {}, placement }));
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

  assert.match(html, /<button[^>]*aria-label="通知，2 项未读"/);
  assert.match(html, /class="notification-trigger notification-trigger-topbar"/);
  assert.match(html, /<span aria-hidden="true" class="notification-trigger-count">2<\/span>/);
  assert.doesNotMatch(html, /rail-item|data-tooltip=/);
});

test("未指定摆放位置时兼容旧侧栏通知入口", async () => {
  for (const placement of [undefined, "rail"] as const) {
    const html = await renderNotifications(placement);
    assert.match(html, /class="rail-item notification-trigger"/);
    assert.match(html, /aria-label="通知，2 项未读"/);
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
  const controls = cssRule(".sheet-close, .notification-back, .notification-mark-read, .notification-filter-trigger", mobileStyles);
  assert.match(controls, /min-width:\s*var\(--ad-control-touch-min\)/);
  assert.match(controls, /min-height:\s*var\(--ad-control-touch-min\)/);
});

test("移动端列表头部为两个工具图标和关闭按钮留足位置，详情头部只预留关闭按钮", () => {
  const mobileStyles = styles.slice(styles.indexOf("@media (max-width: 640px)"));
  const header = cssRule(".sheet-header", mobileStyles);
  assert.match(header, /padding-right:\s*calc\(var\(--ad-control-touch-min\) \* 3 \+ var\(--ad-space-3\) \+ var\(--ad-space-2\) \* 3\)/);
  assert.match(cssRule(".notification-header-actions", mobileStyles), /right:\s*calc\(var\(--ad-space-3\) \+ var\(--ad-control-touch-min\) \+ var\(--ad-space-2\)\)/);
  assert.match(cssRule(".sheet-header.notification-header-detail", mobileStyles), /padding-right:\s*calc\(var\(--ad-control-touch-min\) \+ var\(--ad-space-3\) \+ var\(--ad-space-2\)\)/);
  assert.ok(/<SheetHeader className=\{selectedItem \? "notification-header-detail" : undefined\}/.test(notificationSource), "详情必须应用单关闭按钮的头部占位");
});

test("关闭通知时只清理临时详情状态，已读状态和当前筛选不被重置", () => {
  const closeHandler = notificationSource.match(/const changeSheetOpen = \(open: boolean\) => \{([\s\S]*?)\n  \};/);
  assert.ok(closeHandler, "所有关闭路径需要复用同一个清理入口");
  assert.match(closeHandler[1], /setSheetOpen\(open\)/);
  assert.match(closeHandler[1], /if \(!open\)\s*\{\s*resetDetail\(\);\s*setFilterOpen\(false\);\s*\}/);
  assert.ok(/<Sheet onOpenChange=\{changeSheetOpen\}/.test(notificationSource), "外部关闭必须使用公共清理入口");
  assert.doesNotMatch(notificationSource.replace(closeHandler[0], ""), /\bsetSheetOpen\(/, "不得再有绕过清理的直接关闭");

  const resetDetail = notificationSource.match(/const resetDetail = \(\) => \{([\s\S]*?)\n  \};/);
  assert.ok(resetDetail);
  assert.match(resetDetail[1], /setSelectedId\(null\)/);
  assert.doesNotMatch(`${closeHandler[1]}\n${resetDetail[1]}`, /setItems\(|setActiveFilter\(/);
});

test("全部已读改为标题栏扫把图标，列表不再显示独立工具栏", () => {
  assert.doesNotMatch(notificationSource, /NotificationListView|activeView|notification-view-tabs/);
  assert.doesNotMatch(notificationSource, />待处理|>待处理</);
  assert.match(notificationSource, /const markAllRead = \(\) =>/);
  assert.match(notificationSource, /className="notification-header-actions"/);
  assert.match(notificationSource, /aria-label="全部标为已读"/);
  assert.match(notificationSource, /<Broom aria-hidden="true"/);
  assert.doesNotMatch(notificationSource, /notification-list-toolbar|>全部已读<\/button>/);
});

test("通知列表项固定为简洁的事件与上下文两行", () => {
  const listMarkup = notificationSource.slice(notificationSource.indexOf('className="notification-list"'), notificationSource.indexOf("</div> : <div className=\"notification-empty\""));
  assert.match(listMarkup, /notification-item-event/);
  assert.match(listMarkup, /notification-item-context/);
  assert.doesNotMatch(listMarkup, /item\.response|待处理|notification-item-kind|notification-item-icon/);

  const item = cssRule(".notification-item");
  assert.match(item, /min-height:\s*68px/);
  assert.match(item, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(cssRule(".notification-item-event"), /white-space:\s*nowrap/);
  assert.match(cssRule(".notification-item-context"), /white-space:\s*nowrap/);
});

test("全局通知保留协作邀请与 AI 诊断，不承载普通任务进展或责任转移", () => {
  const fixtures = notificationSource.slice(notificationSource.indexOf("const initialNotifications"), notificationSource.indexOf("const readFilterLabels"));
  assert.equal(fixtures.match(/\bid:/g)?.length, 2);
  assert.match(fixtures, /kind:\s*"invitation"/);
  assert.match(fixtures, /kind:\s*"ai-update"/);
  assert.match(fixtures, /title:\s*"确认第二批达人名单与合作档期"/);
  assert.match(fixtures, /第二批达人中有 3 位合作档期与双十一排期冲突/);
  assert.doesNotMatch(fixtures, /任务进展|责任移交|处理结果/);
});

test("未读只由列表前的蓝点表达，两类通知不使用头像或 Logo", () => {
  const listMarkup = notificationSource.slice(notificationSource.indexOf('className="notification-list"'), notificationSource.indexOf("</div> : <div className=\"notification-empty\""));
  assert.match(listMarkup, /!item\.read && <span aria-hidden="true" className="notification-unread-dot"/);
  assert.match(listMarkup, /【协作邀请】/);
  assert.match(listMarkup, /【AI 诊断】/);
  assert.doesNotMatch(listMarkup, /【AI 动态】/);
  assert.doesNotMatch(listMarkup, /Avatar|notification-item-icon|notification-item-logo|<img/);
  assert.match(cssRule(".notification-unread-dot"), /background:\s*var\(--ad-route\)/);
});

test("协作邀请详情只展示任务名称、完成标准、截止时间和接受拒绝", () => {
  assert.match(notificationSource, /className="notification-invitation-title"/);
  assert.match(notificationSource, /className="notification-criteria"/);
  assert.match(notificationSource, /<h3>完成标准<\/h3>/);
  assert.match(notificationSource, /<ul>\{selectedItem\.completionCriteria\.map/);
  assert.doesNotMatch(notificationSource, /<ol>\{selectedItem\.completionCriteria\.map/);
  assert.match(cssRule(".notification-criteria ul"), /list-style:\s*disc/);
  assert.match(notificationSource, /className="notification-deadline"/);
  assert.match(notificationSource, /<dt>截止时间<\/dt>/);
  assert.match(notificationSource, />接受<\/Button>/);
  assert.match(notificationSource, />拒绝<\/Button>/);
  assert.doesNotMatch(notificationSource, /notification-detail-mark|为什么现在提醒|范围与上下文|处理后的边界|信息边界|declineReasons/);
});

test("AI 诊断详情只展示结论，并以任务名称作为唯一跳转入口", () => {
  assert.match(notificationSource, /className="notification-ai-update"/);
  assert.match(notificationSource, /selectedItem\.kind === "invitation" \? "协作邀请" : "AI 诊断"/);
  assert.match(notificationSource, /<h3>结论<\/h3>/);
  assert.match(notificationSource, /<dt>任务<\/dt>/);
  assert.match(notificationSource, /<button className="notification-task-link" onClick=\{\(\) => openRelatedTask\(selectedItem\)\} type="button">\{selectedItem\.title\}<\/button>/);
  assert.doesNotMatch(notificationSource, /<h3>动态内容<\/h3>|<dt>关联任务<\/dt>|<dt>发现时间<\/dt>|>查看相关任务<\/Button>/);
  assert.match(cssRule(".notification-task-link"), /white-space:\s*normal/);
  assert.match(cssRule(".notification-task-link:focus-visible"), /outline:\s*2px solid var\(--ad-focus\)/);
  assert.doesNotMatch(notificationSource, /AI 洞察建议|建议操作|风险等级/);
});

test("AI 诊断中的任务名称与跳转的任务匹配", () => {
  const aiTask = notificationSource.match(/taskId:\s*"fragrance-creator-business",[\s\S]*?title:\s*"([^"]+)"/);
  const workspaceSource = readFileSync(new URL("../src/data/workspaceNodes.ts", import.meta.url), "utf8");
  const task = workspaceSource.match(/id:\s*"fragrance-creator-business",[\s\S]*?name:\s*"([^"]+)"/);
  assert.ok(aiTask);
  assert.ok(task);
  assert.equal(aiTask[1], task[1]);

  const openRelatedTask = notificationSource.match(/const openRelatedTask = \(item: AiUpdateNotification\) => \{([\s\S]*?)\n  \};/);
  assert.ok(openRelatedTask);
  assert.match(openRelatedTask[1], /onOpenTaskInsight\?\.\(item\.taskId\)/);
  assert.match(openRelatedTask[1], /changeSheetOpen\(false\)/);
});
