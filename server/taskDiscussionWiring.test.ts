import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) => {
  const url = new URL(`../${path}`, import.meta.url);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
};
const detail = readSource("src/components/TaskDetail.tsx");
const discussion = readSource("src/components/TaskDiscussion.tsx");
const activity = readSource("src/components/TaskActivityLog.tsx");
const app = readSource("src/App.tsx");

test("讨论与活动使用独立组件，概览不再进入详情", () => {
  assert.match(detail, /<TaskDiscussion/);
  assert.match(detail, /<TaskActivityLog/);
  assert.doesNotMatch(detail, /TaskOverviewWorkspace|id: "overview"|setActiveTab\("overview"\)/);
  assert.match(discussion, /getTaskDiscussionThreads/);
  assert.match(activity, /getTaskActivityItems/);
  assert.doesNotMatch(activity, /MentionComposer|发送回复|发布动态/);
});

test("讨论保留发布、回复、稳定定位和文件引用", () => {
  assert.match(discussion, /MentionComposer/);
  assert.match(discussion, /replyToActivityId/);
  assert.match(discussion, /task-activity-\$\{reply\.id\}/);
  assert.match(discussion, /onOpenFile/);
  assert.match(detail, /publishSelectionActivity[\s\S]*?setActiveTab\("discussion"\)/);
  assert.match(detail, /hidden=\{activeTab !== "discussion"\}/);
});

test("活动按真实前后值呈现，不用讨论卡片伪装变更", () => {
  assert.match(activity, /task-change-timeline/);
  assert.match(activity, /change\.before/);
  assert.match(activity, /change\.after/);
  assert.match(activity, /dateTime=/);
  assert.doesNotMatch(activity, /activity-message-featured|activity-replies/);
});

test("活动计数覆盖三类记录，讨论摘要可返回原讨论", () => {
  assert.match(detail, /getTaskActivityItems\(activities, task\.commits\)/);
  assert.match(detail, /<TaskActivityLog[^>]*onOpenDiscussion=/s);
  assert.match(activity, /onOpenDiscussion/);
  assert.match(activity, /查看讨论/);
});

test("没有精确时间的旧变更不展示旧相对时间或额外历史分区", () => {
  assert.ok(activity.includes("recordHasTimestamp && <time"), "只有真实时间戳存在时才展示时间");
  assert.ok(!activity.includes("历史记录") && !activity.includes("原时间：") && !activity.includes("未保存精确发生时间"));
});

test("记录在 App 按任务保存并接入同一个状态变更入口", () => {
  assert.match(app, /parseTaskActivityStore/);
  assert.match(app, /appendTaskActivity/);
  assert.match(app, /persistStoredValue\(taskActivityStorageKey, taskActivityStore\)/);
  assert.match(app, /onActivityAppend=/);
  assert.match(app, /onTaskStatusChange=\{selectedTreeTask\?\.kind === "task" \? \(status\) => \{\s*changeTaskStatus\(selectedTaskId, status\);/);
  assert.match(app, /changeTaskStatus\(selectedTaskId, status\)/);
});

test("名称与目标失焦时合并保存，避免逐字写日志", () => {
  assert.match(detail, /onBlur=\{\(\) => [^\n]*onTaskTitleChange/);
  assert.match(detail, /onBlur=\{\(\) => [^\n]*onTaskGoalChange/);
  assert.doesNotMatch(detail, /onChange=\{[^\n]*onTaskTitleChange/);
  assert.doesNotMatch(detail, /onChange=\{[^\n]*onTaskGoalChange/);
});

test("文件选区讨论引用实际打开的文件，而不是第一次聚焦的文件", () => {
  const explorer = readSource("src/components/task-files/TaskFileExplorer.tsx");
  assert.ok(explorer.includes("onSelectText(selected)"), "文件预览应回传实际选中文件");
  assert.ok(detail.includes("captureFileSelection = (file: TaskFileNode, fileSelection?: TaskFileTextSelection)"), "选区应接收真实来源文件及编辑器选区");
  assert.ok(detail.includes("source: file.name"), "引用名称来自本次选区文件");
});

test("文件跳转聚焦实际预览锚点，在移动端也不误报记录缺失", () => {
  const explorer = readSource("src/components/task-files/TaskFileExplorer.tsx");
  assert.ok(explorer.includes('`task-file-preview-${selected.id}`'), "预览区提供实际选中文件的定位锚点");
  assert.ok(explorer.includes("tabIndex={-1}"), "预览区可以接受程序化焦点");
  assert.ok(detail.includes('`task-file-preview-${initialAttentionTarget.targetId}`'), "通知应落到预览区而非不存在的ID");
  assert.ok(detail.includes('`task-file-preview-${id}`'), "附件点击应落到相同预览锚点");
});

test("失效建议链接不会静默替换成另一条 AI 原记录", () => {
  assert.ok(detail.includes("getTaskInsightSource(activities, initialAttentionTarget.targetId)"));
  assert.doesNotMatch(detail, /record \?\? activities\.find/);
});
