import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const React = require("react") as typeof import("react");
let capturedEffects: Array<readonly unknown[] | undefined> | undefined;
const useEffect = React.useEffect;
React.useEffect = (effect, dependencies) => {
  capturedEffects?.push(dependencies);
  return useEffect(effect, dependencies);
};
(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);
const { renderToStaticMarkup } = await import("react-dom/server");
const { TaskDiscussion } = await import("../src/features/tasks/components/TaskDiscussion.tsx");
const { I18nProvider } = await import("../src/shared/i18n/I18nProvider.tsx");

test("相同消息的新引用及回执确认重渲染不再触发阅读，真实变化与新打开请求仍触发", () => {
  const snapshots: Array<readonly unknown[]> = [];
  function Subject() {
    const [step, setStep] = React.useState(0);
    // Each acknowledgement render recreates both the activity array and callback.
    const activities = ["first", ...(step >= 2 ? ["second"] : [])].map(id => ({
      id, author: "member", type: "member-post" as const, message: id, time: "时间未知", createdAt: "2026-10-16T01:00:00Z",
    }));
    capturedEffects = [];
    TaskDiscussion({
      activities, active: step !== 4, readable: true, readRequestSequence: step >= 3 ? 1 : 0,
      currentUser: "member", files: [], people: [], onRead: () => undefined,
      onPost: () => undefined, onOpenFile: () => undefined,
    });
    // Capture real React hook dependencies; child components are not rendered here.
    snapshots.push(capturedEffects[0]!);
    capturedEffects = undefined;
    if (step < 4) setStep(step + 1);
    return null;
  }
  renderToStaticMarkup(React.createElement(I18nProvider, { initialLocale: "zh-CN", children: React.createElement(Subject) }));
  assert.equal(snapshots.length, 5);
  const changed = (before: readonly unknown[], after: readonly unknown[]) => before.length !== after.length || after.some((value, index) => !Object.is(value, before[index]));
  assert.equal(changed(snapshots[0], snapshots[1]), false, "同内容的新数组和新回调不应重新报告阅读，阻断回执循环");
  assert.equal(changed(snapshots[1], snapshots[2]), true, "新呈现消息需要阅读");
  assert.equal(changed(snapshots[2], snapshots[3]), true, "同一区域的新打开请求需要新回执");
  assert.equal(changed(snapshots[3], snapshots[4]), true, "区域可见性变化仍受 effect 管理");
});
