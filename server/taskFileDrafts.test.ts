import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskFileExplorer } from "../src/components/task-files/TaskFileExplorer.tsx";
import * as draftStore from "../src/lib/taskFileDrafts.ts";
import type { TaskFileDraft } from "../src/lib/taskFileDrafts.ts";

type Drafts = Record<string, TaskFileDraft>;

const taskIds = ["draft-task-a", "draft-task-b", "draft-task-c"];
const draft = (text: string, baseVersion = 1): Drafts => ({ document: { content: { kind: "text", text }, baseVersion } });

function withDraftStore(run: (store: typeof draftStore, target: EventTarget) => void, browser = true) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const target = new EventTarget();
  if (browser) Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  else Reflect.deleteProperty(globalThis, "window");
  try {
    run(draftStore, target);
  } finally {
    taskIds.forEach(taskId => draftStore.updateTaskFileDrafts(taskId, {}));
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

function warnsBeforeUnload(target: EventTarget) {
  const event = new Event("beforeunload", { cancelable: true });
  Object.defineProperty(event, "returnValue", { configurable: true, value: "", writable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

test("删除任务只清理指定任务的全部文件草稿，保留其他任务正文与基准版本", async () => {
  await withDraftStore((store, target) => {
    const deletedDrafts = { ...draft("将删除的草稿"), second: { content: { kind: "text" as const, text: "另一个文件" }, baseVersion: 4 } };
    const retainedDrafts = draft("不能被清理的正文", 7);
    store.updateTaskFileDrafts(taskIds[0], deletedDrafts);
    store.updateTaskFileDrafts(taskIds[1], retainedDrafts);
    assert.equal(warnsBeforeUnload(target), true);

    store.clearTaskFileDraftSessions([taskIds[0]]);

    assert.equal(store.getTaskFileDrafts(taskIds[0]), undefined);
    assert.equal(store.getTaskFileDrafts(taskIds[1]), retainedDrafts);
    assert.equal(warnsBeforeUnload(target), true, "其他任务仍有草稿，必须继续警告");
  });
});

test("批量清理最后几个任务草稿后解除退出警告，再次编辑会重新启用", async () => {
  await withDraftStore((store, target) => {
    store.updateTaskFileDrafts(taskIds[0], draft("父任务草稿"));
    store.updateTaskFileDrafts(taskIds[1], draft("子任务草稿"));
    store.clearTaskFileDraftSessions([taskIds[0], taskIds[1]] as const);

    assert.equal(store.getTaskFileDrafts(taskIds[0]), undefined);
    assert.equal(store.getTaskFileDrafts(taskIds[1]), undefined);
    assert.equal(warnsBeforeUnload(target), false);

    store.updateTaskFileDrafts(taskIds[2], draft("之后的新编辑"));
    assert.equal(warnsBeforeUnload(target), true);
  });
});

test("空列表、重复或不存在的任务 ID 不会误清其他草稿，重复清理安全", async () => {
  await withDraftStore((store, target) => {
    const retained = draft("保留");
    store.updateTaskFileDrafts(taskIds[1], retained);
    store.clearTaskFileDraftSessions([]);
    store.clearTaskFileDraftSessions(["missing-task", taskIds[0], taskIds[0]]);
    assert.equal(store.getTaskFileDrafts(taskIds[1]), retained);
    assert.equal(warnsBeforeUnload(target), true);

    store.clearTaskFileDraftSessions([taskIds[1], taskIds[1]]);
    store.clearTaskFileDraftSessions([taskIds[1]]);
    assert.equal(store.getTaskFileDrafts(taskIds[1]), undefined);
    assert.equal(warnsBeforeUnload(target), false);
  });
});

test("保存或放弃最后一份草稿仍通过空更新解除退出警告", async () => {
  await withDraftStore((store, target) => {
    store.updateTaskFileDrafts(taskIds[0], draft("编辑中"));
    assert.equal(warnsBeforeUnload(target), true);
    store.updateTaskFileDrafts(taskIds[0], {});
    assert.equal(store.getTaskFileDrafts(taskIds[0]), undefined);
    assert.equal(warnsBeforeUnload(target), false);
  });
});

test("没有 window 时也可清理会话，不读取或改写已保存文件存储", async () => {
  await withDraftStore((store) => {
    store.updateTaskFileDrafts(taskIds[0], draft("无浏览器环境"));
    store.clearTaskFileDraftSessions([taskIds[0]]);
    assert.equal(store.getTaskFileDrafts(taskIds[0]), undefined);
  }, false);
});

test("重新打开文件浏览器只恢复未删除任务的草稿", () => {
  withDraftStore((store) => {
    const renderTask = (taskId: string) => renderToStaticMarkup(createElement(TaskFileExplorer, {
      taskId, currentUser: "周岚", onSelectText: () => undefined,
      files: [{ id: "document", kind: "file", parentId: null, name: "记录.md", content: "原文", updatedAt: "昨天", version: 1 }],
    }));
    store.updateTaskFileDrafts(taskIds[0], draft("删除任务的未保存正文"));
    store.updateTaskFileDrafts(taskIds[1], draft("其他任务的未保存正文"));
    assert.match(renderTask(taskIds[0]), /继续编辑/);

    store.clearTaskFileDraftSessions([taskIds[0]]);

    assert.doesNotMatch(renderTask(taskIds[0]), /继续编辑/);
    assert.match(renderTask(taskIds[1]), /继续编辑/);
  }, false);
});
