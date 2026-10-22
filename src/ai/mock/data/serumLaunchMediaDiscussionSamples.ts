import type { TaskFileNode, TaskNode } from "@/shared/model/task-model";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import { getSerumLaunchCommonFileAssets } from "@/ai/mock/data/serumLaunchCommonFileAssets";

export const SERUM_LAUNCH_MEDIA_DISCUSSION_PACK_ID = "serum-launch-media-discussion-samples-20261021-v1";
const taskId = "ccx-serum-launch";
const prefix = `${taskId}-media-discussion-sample-20261021`;
const folderId = `${prefix}-folder`;
const fixedAt = "2026-10-21T10:05:00+08:00";

/** A separate incremental pack never reapplies the earlier discussion sample pack. */
export function getSerumLaunchMediaDiscussionFiles(task: Pick<TaskNode, "id">): TaskFileNode[] {
  if (task.id !== taskId) return [];
  const files = getSerumLaunchCommonFileAssets({ id: taskId, teamId: "creator-commerce" }, true)
    .filter(file => file.format === "MP3" || file.format === "MP4")
    .map(file => ({ ...structuredClone(file), id: `${prefix}-${file.format!.toLowerCase()}`, parentId: folderId, builtinPackId: SERUM_LAUNCH_MEDIA_DISCUSSION_PACK_ID, updatedAt: fixedAt }));
  return [{ id: folderId, kind: "folder", name: "讨论", parentId: null, updatedAt: fixedAt, builtinPackId: SERUM_LAUNCH_MEDIA_DISCUSSION_PACK_ID }, ...files];
}

export function getSerumLaunchMediaDiscussionActivities(task: Pick<TaskNode, "id">): CollaborationMessage[] {
  if (task.id !== taskId) return [];
  return [{
    id: `${prefix}-post`, author: "TaskDoor 示例", type: "member-post", createdAt: fixedAt, time: "2026-10-21 10:05",
    message: "【附件样例·音视频】MP3 首发简报和 MP4 总览用于体验播放、进度、音量与视频全屏；均为本地演示资料，点击后手动播放。",
    attachmentRefs: getSerumLaunchMediaDiscussionFiles(task).filter(file => file.kind === "file").map(file => ({ fileId: file.id, name: file.name, version: 1 })),
  }];
}
