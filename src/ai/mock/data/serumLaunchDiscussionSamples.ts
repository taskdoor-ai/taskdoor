import type { TaskFileNode, TaskNode } from "@/shared/model/task-model";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import { getSerumLaunchFileAssets } from "@/ai/mock/data/serumLaunchFileAssets";
import { getSerumLaunchCommonFileAssets } from "@/ai/mock/data/serumLaunchCommonFileAssets";

export const SERUM_LAUNCH_DISCUSSION_PACK_ID = "serum-launch-discussion-samples-20261021-v1";
const taskId = "ccx-serum-launch";
const prefix = `${taskId}-discussion-sample-20261021`;
const folderId = `${prefix}-folder`;
const fixedAt = "2026-10-21T10:00:00+08:00";
const markdown = `# 秋季精华首发协作说明

这组演示资料用于对照任务讨论中的附件展示与阅读效果。

## 资料分组

- 视觉素材：JPG、PNG、WebP 和 SVG。
- 执行资料：PDF、PPTX 和 HTML。
- 交接配置：TXT、JSON 和 XML。

## 核对方式

1. 从讨论附件打开对应文件。
2. 阅读时确认文件名与格式。
3. 修改建议可通过回复继续讨论。

> 本文为本地演示资料。
`;

/** These explicit sample nodes reuse originals without moving any existing task file. */
export function getSerumLaunchDiscussionFiles(task: Pick<TaskNode, "id">): TaskFileNode[] {
  if (task.id !== taskId) return [];
  const sourceTask = { id: taskId, teamId: "creator-commerce" };
  const files = [...getSerumLaunchFileAssets(sourceTask), ...getSerumLaunchCommonFileAssets(sourceTask)].map(file => ({
    ...structuredClone(file), id: `${prefix}-${file.format!.toLowerCase()}`, parentId: folderId,
    builtinPackId: SERUM_LAUNCH_DISCUSSION_PACK_ID, updatedAt: fixedAt,
  }));
  return [
    { id: folderId, kind: "folder", name: "讨论", parentId: null, updatedAt: fixedAt, builtinPackId: SERUM_LAUNCH_DISCUSSION_PACK_ID },
    ...files,
    { id: `${prefix}-md`, kind: "file", name: "首发协作说明.md", originalName: "serum-launch-collaboration.md", parentId: folderId,
      builtinPackId: SERUM_LAUNCH_DISCUSSION_PACK_ID, blobId: "builtin-task-asset:/task-assets/serum-launch/common/serum-launch-collaboration.md",
      format: "MD", mimeType: "text/markdown", sizeBytes: new TextEncoder().encode(markdown).length, sizeLabel: "433 B", version: 1,
      content: markdown, previewData: { kind: "markdown", text: markdown }, updatedAt: fixedAt },
  ];
}

/** Sample authors and copy are explicit; none is a report or decision by a real team member. */
export function getSerumLaunchDiscussionActivities(task: Pick<TaskNode, "id">): CollaborationMessage[] {
  if (task.id !== taskId) return [];
  const files = getSerumLaunchDiscussionFiles(task).filter(file => file.kind === "file");
  const refs = (formats: string[]) => files.filter(file => formats.includes(file.format!)).map(file => ({ fileId: file.id, version: 1, name: file.name }));
  return [
    { id: `${prefix}-visual`, author: "TaskDoor 示例", type: "member-post", createdAt: "2026-10-21T10:01:00+08:00", time: "2026-10-21 10:01",
      message: "【附件样例·视觉素材】这组 JPG、PNG、WebP 和 SVG 仅用于查看本地讨论附件的展示与预览效果，不代表业务审核结论。", attachmentRefs: refs(["JPG", "PNG", "WEBP", "SVG"]) },
    { id: `${prefix}-execution`, author: "TaskDoor 示例", type: "member-post", createdAt: "2026-10-21T10:02:00+08:00", time: "2026-10-21 10:02",
      message: "【附件样例·执行资料】这里复用首发 PDF、PPTX 和 HTML 原件，可从讨论直接打开核对内容；均为本地演示资料。", attachmentRefs: refs(["PDF", "PPTX", "HTML"]) },
    { id: `${prefix}-handover`, author: "TaskDoor 示例", type: "member-post", createdAt: "2026-10-21T10:03:00+08:00", time: "2026-10-21 10:03",
      message: "【附件样例·交接配置】TXT、Markdown、JSON 和 XML 用于对照文字阅读与配置文件预览，不会执行配置或修改业务数据。", attachmentRefs: refs(["TXT", "MD", "JSON", "XML"]) },
    { id: `${prefix}-reply`, author: "TaskDoor 示例", type: "member-reply", createdAt: "2026-10-21T10:04:00+08:00", time: "2026-10-21 10:04", replyToActivityId: `${prefix}-handover`,
      message: "【附件样例·引用回复】这条示例回复继续引用同一份协作说明，不新增文件副本，便于查看回复关系与附件复用。", attachmentRefs: refs(["MD"]) },
  ];
}
