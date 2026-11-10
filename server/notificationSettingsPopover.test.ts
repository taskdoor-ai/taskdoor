import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { notificationPreferencesKey, readNotificationPreferences } from "../src/features/notifications/lib/notification-preferences.ts";

register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { NotificationSettingsPanel, NotificationSettingsPopover } = await import("../src/features/notifications/components/NotificationSettingsPanel.tsx");
const { GlobalNotifications } = await import("../src/features/notifications/components/GlobalNotifications.tsx");
const { Popover, PopoverContent, PopoverTrigger } = await import("../src/shared/ui/popover.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");
type Element = ReactElement<Record<string, any>>;
function elements(tree: ReactNode): Element[] {
  return Children.toArray(tree).flatMap(child => isValidElement<Record<string, any>>(child) ? [child, ...elements(child.props.children)] : []);
}
function withStorage(run: (storage: Storage & { failRead: boolean; failSave: boolean }) => void) {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const priorStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const records = new Map<string, string>();
  const storage = { failRead: false, failSave: false,
    getItem(key: string) { if (this.failRead) throw new Error("read denied"); return records.get(key) ?? null; },
    setItem(key: string, value: string) { if (this.failSave) throw new Error("save denied"); records.set(key, value); },
  } as Storage & { failRead: boolean; failSave: boolean };
  Object.defineProperty(globalThis, "window", { configurable: true, value: Object.assign(new EventTarget(), { location: { search: "" } }) });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try { run(storage); }
  finally {
    if (priorWindow) Object.defineProperty(globalThis, "window", priorWindow); else Reflect.deleteProperty(globalThis, "window");
    if (priorStorage) Object.defineProperty(globalThis, "localStorage", priorStorage); else Reflect.deleteProperty(globalThis, "localStorage");
  }
}
// The real component uses React's SSR hook dispatcher; callbacks trigger actual hook rerenders.
function capture(component: () => ReactNode, actions: Array<(nodes: Element[]) => void> = [], locale: "zh-CN" | "en" = "zh-CN") {
  let nodes: Element[] = [];
  let phase = 0;
  function Capture() {
    nodes = elements(component());
    const action = actions[phase++];
    action?.(nodes);
    return null;
  }
  renderToStaticMarkup(createElement(I18nProvider, { initialLocale: locale, children: createElement(Capture) }));
  return nodes;
}
const switchIn = (nodes: Element[]) => nodes.find(node => node.props.role === "switch")!;

test("紧凑设置保存失败保持原值，重新切换成功后恢复且按账号隔离", () => {
  withStorage(storage => {
    storage.failSave = true;
    const nodes = capture(() => NotificationSettingsPanel({ userId: "alice" }), [first => {
      assert.equal(switchIn(first).props.checked, true);
      switchIn(first).props.onChange({ target: { checked: false } });
    }, failed => {
      assert.equal(switchIn(failed).props.checked, true);
      assert.match(failed.find(node => node.props.role === "alert")!.props.children, /保存失败/);
      storage.failSave = false;
      switchIn(failed).props.onChange({ target: { checked: false } });
    }]);
    assert.equal(switchIn(nodes).props.checked, false);
    assert.equal(nodes.some(node => node.props.role === "alert"), false);
    assert.deepEqual(readNotificationPreferences(storage, "alice"), { onlyRelated: false });
    assert.deepEqual(readNotificationPreferences(storage, "bob"), { onlyRelated: true });
    assert.ok(nodes.some(node => node.props.className === "notification-settings-panel"));
    assert.ok(nodes.some(node => node.props.className === "notification-settings-title" && node.props.children === "通知设置"));
    assert.ok(nodes.some(node => typeof node.props.children === "string" && node.props.children.includes("其他动态可在活动记录中查看")));
    assert.equal(nodes.some(node => typeof node.props.children === "string" && node.props.children.includes("仅控制站内通知")), false);
  });
});

test("紧凑设置读取失败不展示伪开关，重试能恢复已存配置并保留英文文案", () => {
  withStorage(storage => {
    storage.setItem(notificationPreferencesKey("alice"), JSON.stringify({ version: 1, onlyRelated: false }));
    storage.failRead = true;
    const nodes = capture(() => NotificationSettingsPanel({ userId: "alice" }), [failed => {
      assert.equal(switchIn(failed), undefined);
      assert.match(failed.find(node => node.props.role === "alert")!.props.children, /Could not load/);
      storage.failRead = false;
      failed.find(node => node.props.children === "Retry")!.props.onClick();
    }], "en");
    assert.equal(switchIn(nodes).props.checked, false);
    assert.equal(nodes.some(node => node.props.role === "alert"), false);
    assert.ok(nodes.some(node => node.props.className === "notification-settings-title" && node.props.children === "Notification settings"));
    assert.ok(nodes.some(node => typeof node.props.children === "string" && node.props.children.includes("View other updates in the activity log")));
    assert.equal(nodes.some(node => typeof node.props.children === "string" && node.props.children.includes("Email rules stay the same")), false);
  });
});

test("齿轮设置复用通知面板内的非模态popover定位并把焦点归还齿轮", () => {
  const portalContainer = { current: null };
  const changes: boolean[] = [];
  const nodes = capture(() => NotificationSettingsPopover({ userId: "alice", open: true, onOpenChange: next => changes.push(next), portalContainer }));
  const root = nodes.find(node => node.type === Popover)!;
  assert.equal(root.props.modal, false);
  assert.equal(root.props.open, true);
  root.props.onOpenChange(false);
  assert.deepEqual(changes, [false]);
  const trigger = nodes.find(node => node.type === PopoverTrigger)!;
  assert.equal(trigger.props.render.props["aria-label"], "通知设置");
  const content = nodes.find(node => node.type === PopoverContent)!;
  assert.equal(content.props.portalContainer, portalContainer);
  assert.equal(content.props.align, "end");
  assert.equal(content.props.positionMethod, "fixed");
  assert.equal(content.props.collisionPadding, 12);
  assert.equal(content.props.finalFocus, trigger.props.ref);
  const focused: unknown[] = [];
  trigger.props.ref.current = { focus: (options: unknown) => focused.push(options) };
  let prevented = false;
  let stopped = false;
  content.props.onKeyDownCapture({ key: "Escape", nativeEvent: { isComposing: false }, preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  assert.equal(prevented, true);
  assert.equal(stopped, true, "Escape不能继续到父Sheet的取消关闭与恢复焦点路径");
  assert.deepEqual(changes, [false, false]);
  assert.deepEqual(focused, [{ preventScroll: true }]);
});

test("通知面板Escape先关闭设置，关闭通知时同步清除设置状态", () => {
  withStorage(() => {
    let canceled = 0;
    const settings = (nodes: Element[]) => nodes.find(node => node.type === NotificationSettingsPopover)!;
    const sheet = (nodes: Element[]) => nodes[0];
    const nodes = capture(() => GlobalNotifications({ teamId: "team", userId: "alice", showDemoNotifications: false }), [first => {
      sheet(first).props.onOpenChange(true, { reason: "trigger-press", cancel() {} });
    }, opened => {
      settings(opened).props.onOpenChange(true);
    }, nested => {
      assert.equal(settings(nested).props.open, true);
      sheet(nested).props.onOpenChange(false, { reason: "escape-key", cancel() { canceled++; } });
    }, escaped => {
      assert.equal(canceled, 1);
      assert.equal(sheet(escaped).props.open, true);
      assert.equal(settings(escaped).props.open, false);
      settings(escaped).props.onOpenChange(true);
    }, reopened => {
      sheet(reopened).props.onOpenChange(false, { reason: "close-press", cancel() {} });
    }]);
    assert.equal(sheet(nodes).props.open, false);
    assert.equal(settings(nodes).props.open, false);
  });
});
