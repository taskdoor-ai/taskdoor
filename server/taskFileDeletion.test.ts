import assert from "node:assert/strict";
import test from "node:test";
import type { TaskFileNode } from "../src/shared/model/task-model.ts";
import { deleteTaskFileNode, type TaskFileDeletionAccess } from "../src/features/tasks/files/lib/task-file-deletion.ts";
import { createFolder, moveNode, renameNode } from "../src/features/tasks/files/lib/task-file-tree.ts";
import { applyTaskFileEdit, createTaskFileRevision } from "../src/features/tasks/files/lib/task-file-editing.ts";
import { createCollaborationSnapshot, postCollaborationMessage, updateCollaborationMessage, replaceCollaborationFiles, saveCollaboration, loadCollaboration } from "../src/features/tasks/lib/task-collaboration.ts";

const access: TaskFileDeletionAccess = { actorId: "alice", ownerId: "owner", participantIds: ["alice", "bob"], activeMemberIds: ["owner", "alice", "bob", "admin"] };
const own: TaskFileNode = { id: "own", kind: "file", name: "own.txt", content: "original", parentId: null, updatedAt: "", createdById: "alice" };
const other: TaskFileNode = { ...own, id: "other", name: "other.txt", createdById: "bob" };

test("only current task members can delete; uploader deletes own, current owner deletes any", () => {
  assert.deepEqual(deleteTaskFileNode([own, other], own.id, access), [other]);
  assert.throws(() => deleteTaskFileNode([own, other], other.id, access), /权限/);
  assert.deepEqual(deleteTaskFileNode([other], other.id, { ...access, actorId: "owner" }), []);
  assert.throws(() => deleteTaskFileNode([own], own.id, { ...access, participantIds: ["bob"] }), /权限/);
  assert.throws(() => deleteTaskFileNode([own], own.id, { ...access, activeMemberIds: ["owner", "bob"] }), /权限/);
  assert.throws(() => deleteTaskFileNode([own], own.id, { ...access, actorId: "admin" }), /权限/);
  assert.throws(() => deleteTaskFileNode([own], own.id, { ...access, actorId: "" }), /权限/);
});

test("owner transfer and unknown legacy uploaders use the current context at confirmation", () => {
  const legacy = { ...own, createdById: undefined };
  assert.throws(() => deleteTaskFileNode([legacy], legacy.id, access), /权限/);
  assert.deepEqual(deleteTaskFileNode([legacy], legacy.id, { ...access, actorId: "owner" }), []);
  assert.throws(() => deleteTaskFileNode([other], other.id, { ...access, actorId: "owner", ownerId: "bob", participantIds: ["owner"] }), /权限/);
});

test("deleting a folder cannot remove another uploader's nested files", () => {
  const folder: TaskFileNode = { ...own, id: "folder", kind: "folder", name: "Folder" };
  const nested: TaskFileNode = { ...folder, id: "nested", parentId: folder.id };
  const child = { ...other, parentId: nested.id };
  const nodes = [folder, nested, child];
  assert.throws(() => deleteTaskFileNode(nodes, folder.id, access, "archive"), /权限/);
  assert.ok(nodes.every(node => !node.archived));
  const kept = deleteTaskFileNode(nodes, folder.id, access);
  assert.equal(kept.find(node => node.id === nested.id)?.parentId, null);
  assert.ok(kept.some(node => node.id === child.id && !node.archived));
  assert.ok(deleteTaskFileNode(nodes, folder.id, { ...access, actorId: "owner" }, "archive").every(node => node.archived));
  assert.ok(deleteTaskFileNode([folder, { ...own, parentId: folder.id }], folder.id, access, "archive").every(node => node.archived));
});

test("creation records original identity; moving, renaming and later edits preserve it", () => {
  const result = createFolder([], null, "New", "alice");
  assert.equal(result.folder.createdById, "alice");
  const moved = moveNode([result.folder, own], own.id, result.folder.id);
  assert.equal(renameNode(moved, own.id, "renamed.txt").find(node => node.id === own.id)?.createdById, "alice");
  const record = createTaskFileRevision(own, { kind: "text", text: "edited" }, "bob");
  assert.equal(applyTaskFileEdit(own, record!).createdById, "alice");
});

test("published discussion uploads belong to the publisher, reused files keep their uploader", () => {
  const base = createCollaborationSnapshot([]);
  const message = { id: "msg", author: "alice", time: "刚刚", message: "upload", type: "member-post" as const };
  const posted = postCollaborationMessage(base, { message, attachments: [{ ...own, createdById: "forged" }] });
  assert.equal(posted.files.find(node => node.id === own.id)?.createdById, "alice");
  const updated = updateCollaborationMessage(posted, posted.messages[0], "alice", {}, [other]);
  assert.equal(updated.files.find(node => node.id === other.id)?.createdById, "alice");
  const reused = postCollaborationMessage(posted, { message: { ...message, id: "msg2", author: "bob" }, attachments: [own] });
  assert.equal(reused.files.find(node => node.id === own.id)?.createdById, "alice");
});

test("the persistence boundary rechecks deletion and preserves original identity", () => {
  const base = createCollaborationSnapshot([own, other]);
  assert.throws(() => replaceCollaborationFiles(base, [own], access), /权限/);
  assert.throws(() => replaceCollaborationFiles(base, [own, { ...other, archived: true }], access), /权限/);
  const edited = replaceCollaborationFiles(base, [{ ...own, createdById: "bob" }, { ...other, name: "renamed.txt" }], access);
  assert.equal(edited.files[0].createdById, "alice");
  const unknown = { ...other, id: "legacy", createdById: undefined };
  assert.equal(replaceCollaborationFiles(createCollaborationSnapshot([unknown]), [{ ...unknown, createdById: "alice" }], access).files[0].createdById, undefined);
  const inserted = replaceCollaborationFiles(base, [...base.files, { ...own, id: "new", createdById: "forged" }], access);
  assert.equal(inserted.files.find(node => node.id === "new")?.createdById, "alice");
  let stored = "";
  const storage = { getItem: () => stored || null, setItem: (_key: string, value: string) => { stored = value; } };
  saveCollaboration(storage, "permission-check", 0, inserted);
  assert.equal(loadCollaboration(storage, "permission-check", []).files.find(node => node.id === "new")?.createdById, "alice");
});
