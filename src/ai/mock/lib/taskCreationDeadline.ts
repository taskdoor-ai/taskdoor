import type { Locale } from "@/shared/i18n/core";
import type { ScenarioContext } from "@/ai/mock/lib/taskCreationScenario";
import { assignTaskByResponsibility } from "@/ai/mock/lib/responsibilityAssignment";
import { createCreationForm, withCreationParticipantDefaults, type CreationForm } from "@/features/tasks/lib/task-creation-form";
import { getEffortScopeKey, getTaskEffortState } from "@/features/tasks/lib/task-effort";

export const mockDeadlineCreationRequests = {
  finite: "根据已有会议记录，整理本次会议纪要并共享给参会人",
  ongoing: "持续维护团队常见问题，帮助成员找到当前有效答案",
} as const;

const englishRequests = {
  finite: "Use the existing meeting notes to prepare and share the minutes with participants",
  ongoing: "Keep the team FAQ up to date so members can find current answers",
} as const;

/** Two explicit fixtures, not a natural-language date or task parser. */
export function createMockDeadlineExample(request: string, context: ScenarioContext, locale: Locale): CreationForm | null {
  const kind = (Object.keys(mockDeadlineCreationRequests) as Array<keyof typeof mockDeadlineCreationRequests>)
    .find(key => request.trim() === mockDeadlineCreationRequests[key] || request.trim() === englishRequests[key]);
  if (!kind) return null;
  const en = locale === "en";
  const form = createCreationForm(request, context);
  const finite = kind === "finite";
  const task = {
    ...form.mainTask,
    title: finite ? en ? "Prepare and share the meeting minutes" : "整理并共享本次会议纪要" : en ? "Maintain the team FAQ" : "持续维护团队常见问题",
    goal: finite
      ? en ? "Give participants a shared understanding of the decisions and next actions recorded in the meeting." : "让参会成员准确理解本次会议决定与后续行动，能够据此继续推进工作。"
      : en ? "Help team members find current answers to recurring questions and distinguish them from outdated guidance." : "让团队成员能够找到当前有效答案，分清现行说明与过期内容。",
    completionCriteria: finite
      ? en ? ["The minutes reflect the topics, decisions and unresolved questions in the supplied notes.", "Known action owners and agreed dates are preserved; unknowns are marked for clarification, and the minutes are shared with participants."]
        : ["纪要与已有会议记录一致，包含议题、已作出的决定及未解决问题。", "保留记录中已明确的行动负责人和约定时间，未知项标明待核对，并将纪要共享给参会人。"]
      : en ? ["Confirmed changes are reflected in the FAQ, with current guidance distinguishable from archived content.", "The FAQ entry points and referenced links remain accessible to team members."]
        : ["已确认的变化反映到常见问题中，现行答案与过期内容可辨别。", "团队成员可访问常见问题入口及所引用的有效链接。"],
    executionTips: finite
      ? [en ? "Use the supplied notes to draft the minutes, check them against the original record, and share them with participants." : "根据已有记录整理初稿，对照原文核对决定与行动项，再共享给参会人。"]
      : [en ? "Update answers when confirmed guidance changes. This ongoing responsibility has no single final deadline." : "按已确认变化持续更新答案；这是持续工作，不设整体最终截止。"],
  };
  task.ownerId = assignTaskByResponsibility(task, context.members).ownerId;
  if (finite) task.effortEstimate = {
    minutes: 90, basis: "mock", confirmed: false, version: 1,
    workMethod: en ? "AI-assisted drafting with human checking and sharing" : "AI 辅助整理初稿，人工核对与共享",
    reason: en ? "Fixture assumption: 45 minutes to draft, 30 minutes to check and 15 minutes to share. Excludes waiting for replies." : "演示估算假设：初稿整理45分钟、原文核对30分钟、共享15分钟；不计等待回复。",
    scopeKey: "",
  };
  if (task.effortEstimate) task.effortEstimate.scopeKey = getEffortScopeKey(task, task.effortEstimate.workMethod);
  return withCreationParticipantDefaults({ ...form, mainTask: task }, context.currentUserId);
}

function nextWeekday(date: Date): void {
  do { date.setUTCDate(date.getUTCDate() + 1); } while (date.getUTCDay() === 0 || date.getUTCDay() === 6);
}

/** Initial generation only. Revisions never call this helper or refill cleared dates. */
export function withMockCreationDeadline(form: CreationForm, currentDate: string, locale: Locale): CreationForm {
  if (form.mainTask.endDate) return form;
  const finite = form.request.trim() === mockDeadlineCreationRequests.finite || form.request.trim() === englishRequests.finite;
  const retrospective = form.scenarioId === "similar-task";
  if (!finite && !retrospective) return form;
  const date = new Date(`${currentDate}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(currentDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== currentDate) return form;
  nextWeekday(date);
  if (retrospective) nextWeekday(date);
  const endDate = date.toISOString().slice(0, 10);
  const tip = locale === "en"
    ? `AI suggested deadline: ${endDate}. ${finite ? "Assumes a working window to draft, check and share the supplied notes." : "Assumes launch data is available, with separate windows to prepare and check the retrospective."} Uses Monday–Friday as a planning assumption; actual calendars and member availability have not been checked. You can change or clear this date.`
    : `AI 建议截止：${endDate}。${finite ? "假设接下来有整理、核对已有记录并共享的工作窗口。" : "假设发布数据已齐备，分别留出复盘整理与核对修改的工作窗口。"}按周一至周五作为排期假设，未核对实际日历及成员可用时间，可修改或清空。`;
  const original = form.mainTask;
  const task = { ...original, endDate, executionTips: [...original.executionTips, tip] };
  const state = getTaskEffortState(original);
  if (original.effortEstimate && (state === "proposed" || state === "confirmed")) {
    task.effortEstimate = { ...original.effortEstimate, confirmed: false, scopeKey: getEffortScopeKey(task, original.effortEstimate.workMethod) };
  }
  return { ...form, mainTask: task };
}
