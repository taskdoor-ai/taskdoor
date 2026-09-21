import type { TaskNode } from "./workspaceNodes";
import type { TaskDetailMock } from "./taskDetailMocks";
import { getWeeklyRetroProgressDemo, progressDemoObservedAt } from "./taskProgressDemoFixtures";

/** The written evidence and progress snapshot describe the same fixed review. */
export function getWeeklyRetroDetailDemo(task: TaskNode): TaskDetailMock | undefined {
  const series = getWeeklyRetroProgressDemo(task.id);
  if (!series || task.createdFrom) return undefined;
  const basis = series.explanation;
  const time = task.id === "weekly-retro-decisions" ? "2026-09-14T12:00:00+08:00" : progressDemoObservedAt;
  const fileName = `${task.name}核对记录.md`;
  const message = task.id === "weekly-retro-decisions"
    ? "决定清单和原始依据已经逐条核对，D04 的确认台账已统一。我已确认完成。"
    : `${basis}${series.timing.basis}`;
  return {
    title: task.name, goal: task.goal ?? "", owner: task.ownerId, participants: task.participantIds ?? [],
    status: task.status, due: task.dueAt ?? "—", iconName: task.iconName, iconTone: task.iconTone,
    completionCriteria: task.completionCriteria, executionTips: task.executionTips, summary: message,
    participantInvitationStatus: Object.fromEntries((task.participantIds ?? []).map(id => [id, "accepted" as const])),
    activities: [
      { id: `${task.id}-review-snapshot`, author: task.ownerId, type: "member-post", createdAt: time, time: `${time.slice(0, 10)} ${time.slice(11, 16)}`, message, file: fileName },
      ...(task.id === "weekly-retro-decisions" ? [{ id: `${task.id}-review-confirmed`, author: "陈默", type: "status-change" as const, createdAt: time, time: "2026-09-14 12:00", message: "核对决定清单与原始依据后，将任务状态从进行中更新为已完成。" }] : []),
    ],
    commits: [{ id: `${task.id}-review-file`, author: task.ownerId, createdAt: time, time: `${time.slice(0, 10)} ${time.slice(11, 16)}`, message: "更新复盘核对记录，保留已确认事项和未收口的问题。", files: [fileName] }],
    files: [{ id: `${task.id}-review-evidence`, name: fileName, kind: "file", parentId: null, format: "MD", version: 1,
      updatedAt: `${time.slice(0, 10)} ${time.slice(11, 16)}`, content: `# ${task.name}\n\n更新：${time.slice(0, 10)} ${time.slice(11, 16)}\n\n## 当前交付\n\n${message}\n\n## 核对记录\n\n${series.workload.map(point => `- ${point.at}：${point.note}`).join("\n")}\n` }],
  };
}
