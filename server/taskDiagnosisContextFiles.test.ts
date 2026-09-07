import assert from "node:assert/strict";
import test from "node:test";
import { createTaskFileRevision, saveTaskFileEdit } from "../src/lib/taskFileEditing.ts";
import { taskDetailMocks } from "../src/data/taskDetailMocks.ts";
import { getTaskDiagnosisReport } from "../src/lib/taskDiagnosis.ts";

const module = await import("../src/lib/taskDiagnosisContext.ts").catch(() => null);
class MemoryStorage {
  records = new Map<string, string>();
  getItem(key: string) { return this.records.get(key) ?? null; }
  setItem(key: string, value: string) { this.records.set(key, value); }
}
test("诊断读取用户已保存的文件正文，不读取编辑器未保存草稿或旧 seed", () => {
  assert.ok(module, "任务正文上下文适配尚未实现");
  const id = "fragrance-final-decision";
  const task = taskDetailMocks[id];
  const storage = new MemoryStorage();
  const before = module.buildTaskDiagnosisContext(id, task, storage);
  assert.equal(getTaskDiagnosisReport({ task: { id, title: task.title, status: task.status, context: before } }).findings.length, 1);
  const file = task.files.find((item) => item.id === `${id}-result`)!;
  const revision = createTaskFileRevision(file, { kind: "text", text: "新预算已确认生效，不再执行原预算。" }, "周岚", "2026-09-03T10:00:00+08:00")!;
  saveTaskFileEdit(storage, id, revision, file.version ?? 1);
  const context = module.buildTaskDiagnosisContext(id, task, storage);
  assert.equal(context.files.find((item) => item.id === file.id)?.content, "新预算已确认生效，不再执行原预算。");
  assert.equal(getTaskDiagnosisReport({ task: { id, title: task.title, status: task.status, context }, decisionConflicts: task.diagnosis?.decisionConflicts }).findings.length, 0);
});
test("本地文件版本损坏时不拿旧正文作结论，保留读取缺口", () => {
  assert.ok(module);
  const id = "fragrance-final-decision";
  const context = module.buildTaskDiagnosisContext(id, taskDetailMocks[id], { getItem: () => "not json" });
  assert.equal(context.files.filter((file) => file.kind === "file").length, 0);
  assert.equal(context.unavailableFileCount, taskDetailMocks[id].files.filter((file) => file.kind === "file").length);
});
