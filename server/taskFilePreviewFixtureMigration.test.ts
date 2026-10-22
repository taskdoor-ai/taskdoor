import assert from "node:assert/strict";
import test from "node:test";
import * as fixtures from "../src/ai/mock/data/taskDetailMocks.ts";
import { getTeamTaskDetailFixture } from "../src/ai/mock/data/teamTaskDetailFixtures.ts";
import { allTeamWorkspaceNodes } from "../src/ai/mock/data/teamWorkspaceScenarios.ts";
import { isSupportedTaskFileUpload } from "../src/features/tasks/files/lib/task-file-capabilities.ts";
import { getSerumLaunchFileAssets } from "../src/ai/mock/data/serumLaunchFileAssets.ts";
import { getSerumLaunchCommonFileAssets } from "../src/ai/mock/data/serumLaunchCommonFileAssets.ts";
import { getSerumLaunchDiscussionFiles, SERUM_LAUNCH_DISCUSSION_PACK_ID } from "../src/ai/mock/data/serumLaunchDiscussionSamples.ts";
import { getSerumLaunchMediaDiscussionFiles, SERUM_LAUNCH_MEDIA_DISCUSSION_PACK_ID } from "../src/ai/mock/data/serumLaunchMediaDiscussionSamples.ts";
import { createCollaborationSnapshot, getDiscussionAttachment, getTaskFiles, loadCollaboration, replaceCollaborationFiles, TASK_COLLABORATION_STORAGE_PREFIX } from "../src/features/tasks/lib/task-collaboration.ts";
import { createTaskFileRevision, saveTaskFileEdit } from "../src/features/tasks/files/lib/task-file-editing.ts";
import { updateTaskFileDrafts } from "../src/features/tasks/files/lib/task-file-drafts.ts";
import type { TaskFileNode, TaskNode } from "../src/shared/model/task-model.ts";

const main = allTeamWorkspaceNodes.find((node): node is TaskNode => node.kind === "task" && node.id === "ccx-serum-launch")!;
const scope = JSON.stringify([main.teamId, main.id]);
const key = `${TASK_COLLABORATION_STORAGE_PREFIX}${encodeURIComponent(scope)}`;
function memoryStorage() {
  const data = new Map<string, string>();
  return { data, getItem: (name: string) => data.get(name) ?? null, setItem: (name: string, value: string) => { data.set(name, value); } };
}

test("精华主任务保留原素材与常用包，另附11种讨论样例和2种音视频样例", () => {
  assert.equal(getSerumLaunchFileAssets(main).length, 3);
  assert.equal(getSerumLaunchCommonFileAssets(main).length, 7);
  const files = getTaskFiles(fixtures.createWorkspaceTaskDetail(main).files).filter(file => file.kind === "file");
  assert.equal(files.length, 26);
  assert.ok(files.every(isSupportedTaskFileUpload));
  assert.equal(files.some(file => file.id === `${main.id}-record`), false);
});

test("四个团队的内置任务模板最终出口都不再提供不支持的文件类型", () => {
  for (const task of allTeamWorkspaceNodes.filter((node): node is TaskNode => node.kind === "task")) {
    const detail = fixtures.taskDetailMocks[task.id as keyof typeof fixtures.taskDetailMocks] ?? getTeamTaskDetailFixture(task) ?? fixtures.createWorkspaceTaskDetail(task);
    const unsupported = getTaskFiles(detail.files).filter(file => file.kind === "file" && !isSupportedTaskFileUpload(file));
    assert.deepEqual(unsupported.map(file => file.name), [], task.id);
  }
});

test("未修改的旧主任务持久退役六个不支持示例，追加讨论样例且原音视频节点不丢", () => {
  const legacy = fixtures.getLegacyTaskFileFixtures(main);
  const storage = memoryStorage();
  const before = createCollaborationSnapshot(legacy);
  storage.data.set(key, JSON.stringify(before));
  const report = fixtures.migrateUnsupportedBuiltinTaskFiles(storage, [{ taskId: main.id, teamId: main.teamId!, legacyFiles: legacy }]);
  assert.equal(report.retiredFileIds.length, 6);
  const saved = loadCollaboration(storage, scope, fixtures.createWorkspaceTaskDetail(main).files);
  assert.equal(saved.files.length, legacy.length + getSerumLaunchDiscussionFiles(main).length + getSerumLaunchMediaDiscussionFiles(main).length - 1);
  assert.equal(getTaskFiles(saved.files).filter(file => file.kind === "file").length, 28);
  assert.deepEqual(saved.appliedFilePacks, [...before.appliedFilePacks!, SERUM_LAUNCH_DISCUSSION_PACK_ID, SERUM_LAUNCH_MEDIA_DISCUSSION_PACK_ID]);
  assert.deepEqual(loadCollaboration(storage, scope, fixtures.createWorkspaceTaskDetail(main).files), saved);
});

test("退役标记仅隔离任务列表，保留旧讨论的版本匹配规则和后续列表保存的源记录", () => {
  const original: TaskFileNode = { id: "retired-source", kind: "file", name: "旧核对.docx", parentId: null, updatedAt: "昨天", version: 7, content: "原始正文" };
  const retired = { ...original, retiredBuiltin: true as const };
  const snapshot = createCollaborationSnapshot([retired]);
  assert.deepEqual(getTaskFiles(snapshot.files), []);
  assert.equal(getDiscussionAttachment(snapshot.files, { fileId: retired.id, name: retired.name, version: 1 })?.id, retired.id);
  assert.deepEqual(replaceCollaborationFiles(snapshot, []).files, [retired]);
  assert.throws(() => createCollaborationSnapshot([{ ...retired, kind: "folder" }]), /退役|文件/);
});

test("存量迁移只退役完整匹配的内置示例，用户修改、上传、历史与文件包标记均保留", () => {
  assert.equal(typeof fixtures.getLegacyTaskFileFixtures, "function");
  assert.equal(typeof fixtures.migrateUnsupportedBuiltinTaskFiles, "function");
  const legacy = fixtures.getLegacyTaskFileFixtures(main);
  const source = legacy.find(file => file.id === `${main.id}-record`)!;
  const uploaded: TaskFileNode = { ...source, id: "user-upload", blobId: "discussion-blob-user" };
  const renamed = { ...legacy.find(file => file.id === `${main.id}-asset-docx`)!, name: "用户改名.docx" };
  const moved = { ...legacy.find(file => file.id === `${main.id}-asset-xlsx`)!, parentId: null };
  const edited = { ...legacy.find(file => file.id === `${main.id}-asset-csv`)!, content: "用户修改", version: 2 };
  const files = legacy.map(file => [renamed, moved, edited].find(changed => changed.id === file.id) ?? file).concat(uploaded);
  const before = { ...createCollaborationSnapshot(files), revision: 8, messages: [{ id: "old-message", author: "周岚", message: "原讨论", type: "member-post" as const, time: "昨天", attachmentRefs: [{ fileId: source.id, version: 1, name: source.name }] }] };
  const storage = memoryStorage();
  storage.data.set(key, JSON.stringify(before));
  const report = fixtures.migrateUnsupportedBuiltinTaskFiles(storage, [{ taskId: main.id, teamId: main.teamId!, legacyFiles: legacy }]);
  assert.equal(report.retiredFileIds.length, 3);
  const saved = loadCollaboration(storage, scope, fixtures.createWorkspaceTaskDetail(main).files);
  assert.deepEqual(saved.messages, before.messages);
  assert.deepEqual(saved.appliedFilePacks, [...before.appliedFilePacks!, SERUM_LAUNCH_DISCUSSION_PACK_ID, SERUM_LAUNCH_MEDIA_DISCUSSION_PACK_ID]);
  for (const file of [renamed, moved, edited, uploaded]) assert.deepEqual(saved.files.find(item => item.id === file.id), file);
  assert.equal(saved.files.find(file => file.id === source.id)?.retiredBuiltin, true);
  assert.ok(getDiscussionAttachment(saved.files, before.messages[0].attachmentRefs[0]));
  assert.equal(fixtures.migrateUnsupportedBuiltinTaskFiles(storage, [{ taskId: main.id, teamId: main.teamId!, legacyFiles: legacy }]).retiredFileIds.length, 0);
});

test("内置示例有本地编辑记录或未提交草稿时不会退役", () => {
  assert.equal(typeof fixtures.getLegacyTaskFileFixtures, "function");
  const legacy = fixtures.getLegacyTaskFileFixtures(main);
  const doc = legacy.find(file => file.id === `${main.id}-record`)!;
  const table = legacy.find(file => file.id === `${main.id}-asset-xlsx`)!;
  const storage = memoryStorage();
  storage.data.set(key, JSON.stringify(createCollaborationSnapshot(legacy)));
  const edit = createTaskFileRevision(doc, { kind: "text", text: "用户保存的修改" }, "周岚")!;
  saveTaskFileEdit(storage, main.id, edit, doc.version!);
  updateTaskFileDrafts(main.id, { [table.id]: { content: { kind: "table", sheets: [] }, baseVersion: 1 } });
  try {
    const report = fixtures.migrateUnsupportedBuiltinTaskFiles(storage, [{ taskId: main.id, teamId: main.teamId!, legacyFiles: legacy }]);
    const saved = loadCollaboration(storage, scope, fixtures.createWorkspaceTaskDetail(main).files);
    assert.equal(saved.files.find(file => file.id === doc.id)?.retiredBuiltin, undefined);
    assert.equal(saved.files.find(file => file.id === table.id)?.retiredBuiltin, undefined);
    assert.ok(report.retainedFileIds.includes(doc.id));
    assert.ok(report.retainedFileIds.includes(table.id));
    assert.equal(report.retiredFileIds.length, 4);
  } finally { updateTaskFileDrafts(main.id, {}); }
});
