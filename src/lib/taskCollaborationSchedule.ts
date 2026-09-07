import type { PersonOption } from "../data/sharedTypes";

export type CollaborationScheduleTask = {
  clientId?: string;
  title: string;
  ownerId: string;
  participantIds: string[];
  startDate: string;
  endDate: string;
  dependsOnClientIds?: string[];
};

/** These are other candidates in this draft, not accepted assignments or calendar events. */
export type CollaborationScheduleCandidate = {
  clientId: string;
  title: string;
  ownerId: string;
  participantIds?: string[];
  startDate: string;
  endDate: string;
};

export type CollaborationSchedulePerson = {
  id: string;
  name: string;
  profileKnown: boolean;
  role: string | null;
  responsibility: string | null;
  availability: string | null;
  currentWork: string[] | null;
  otherTasks: Array<{ clientId: string; title: string }> | null;
};

export type CollaborationScheduleDependency = {
  clientId: string;
  title: string;
  deadlineLabel: string;
  needsReview: boolean;
  message: string;
};

export type TaskCollaborationScheduleReport = {
  status: "pending" | "review-dependencies";
  statusLabel: "排期待确认" | "需核对前置时间";
  sourceLabel: string;
  dateLabel: string;
  dateNotes: string[];
  owner: CollaborationSchedulePerson | null;
  participants: CollaborationSchedulePerson[];
  dependencies: CollaborationScheduleDependency[];
  limitations: string[];
};

const providedText = (value: string | undefined) => value?.trim() ? value : null;
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

/** Read-only evidence from local draft/profile data; never infers capacity from profile prose. */
export function describeTaskCollaborationSchedule(task: CollaborationScheduleTask, members: PersonOption[], tasks?: CollaborationScheduleCandidate[]): TaskCollaborationScheduleReport {
  const candidates = new Map<string, CollaborationScheduleCandidate>();
  for (const candidate of tasks ?? []) if (!candidates.has(candidate.clientId)) candidates.set(candidate.clientId, candidate);
  const person = (id: string): CollaborationSchedulePerson => {
    const profile = members.find(member => member.id === id);
    const currentWork = profile?.currentWork?.filter(value => value.trim());
    return {
      id,
      name: providedText(profile?.name) ?? "未知成员",
      profileKnown: Boolean(profile),
      role: providedText(profile?.role),
      responsibility: providedText(profile?.dynamicResponsibility),
      availability: providedText(profile?.availability),
      currentWork: currentWork?.length ? [...currentWork] : null,
      otherTasks: task.clientId && tasks ? [...candidates.values()]
        .filter(candidate => candidate.clientId !== task.clientId && candidate.ownerId === id)
        .map(candidate => ({ clientId: candidate.clientId, title: providedText(candidate.title) ?? "未命名任务" })) : null,
    };
  };

  const validStart = validDate(task.startDate);
  const validEnd = validDate(task.endDate);
  const dateNotes: string[] = [];
  if (task.startDate && !validStart) dateNotes.push("开始日期无效，需核对。");
  if (task.endDate && !validEnd) dateNotes.push("截止日期无效，需核对。");
  if (validStart && validEnd && task.startDate > task.endDate) dateNotes.push("本任务开始日期晚于截止日期，需核对。");
  if (validStart && !task.endDate) dateNotes.push(`计划开始：${task.startDate}`);

  const dependencies = [...new Set(task.dependsOnClientIds ?? [])].filter(Boolean).map((clientId): CollaborationScheduleDependency => {
    const predecessor = candidates.get(clientId);
    const title = providedText(predecessor?.title) ?? "前置任务资料未知";
    const base = { clientId, title, needsReview: false };
    if (!predecessor) return { ...base, deadlineLabel: "交付时间未知", message: "前置任务不在当前方案中，交付时间未知，请核对依赖。" };
    if (!predecessor.endDate) return { ...base, deadlineLabel: "不设固定时间", message: `前置任务「${title}」未设固定截止时间，需确认交付安排。` };
    if (!validDate(predecessor.endDate)) return { ...base, deadlineLabel: "截止时间待核对", message: `前置任务「${title}」截止日期无效，需核对。` };
    // Only compare stated deadlines. A start date alone does not prove the task cannot begin in parallel.
    const needsReview = validEnd && predecessor.endDate > task.endDate;
    return {
      ...base,
      needsReview,
      deadlineLabel: `截止 ${predecessor.endDate}`,
      message: needsReview ? `前置任务「${title}」截止晚于本任务，需核对交付时间。` : `前置任务「${title}」的交付衔接仍待确认。`,
    };
  });
  const needsReview = dependencies.some(dependency => dependency.needsReview);

  return {
    status: needsReview ? "review-dependencies" : "pending",
    statusLabel: needsReview ? "需核对前置时间" : "排期待确认",
    sourceLabel: "成员资料 · 更新时间未提供",
    dateLabel: !task.endDate ? "不设固定时间" : !validEnd ? "截止时间待核对" : validStart ? `${task.startDate} 至 ${task.endDate}` : `${task.endDate} 截止`,
    dateNotes,
    owner: task.ownerId ? person(task.ownerId) : null,
    participants: [...new Set(task.participantIds)].filter(id => id && id !== task.ownerId).map(person),
    dependencies,
    limitations: ["人选待接受，候选分工不代表已承诺排期。", "缺少可用工作时段，未核对真实日历。"],
  };
}
