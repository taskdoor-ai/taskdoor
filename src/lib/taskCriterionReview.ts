import type { WorkspaceNode } from '../data/workspaceNodes';
import { createTaskChangeActivity } from './taskActivity';
export type CriterionReview = {
  text: string;
  analysis?: { percent: number | null; evidence: string; observedAt: string };
  confirmation?: { by: string; at: string };
};
export function criterionReview(text: string, review?: CriterionReview) {
  return review?.text === text ? review : undefined;
}
export function criterionPercent(review?: CriterionReview): number | null {
  const analysis = review?.analysis;
  return analysis && analysis.evidence.trim() && Number.isFinite(Date.parse(analysis.observedAt)) && typeof analysis.percent === 'number' && Number.isFinite(analysis.percent) && analysis.percent >= 0 && analysis.percent <= 100 ? analysis.percent : null;
}
export function confirmTaskCriterion(nodes: WorkspaceNode[], taskId: string, expected: string[], index: number, confirmed: boolean, author: string) {
  const original = nodes.find(node => node.kind === 'task' && node.id === taskId);
  if (!original || original.kind !== 'task' || JSON.stringify(original.completionCriteria ?? []) !== JSON.stringify(expected) || !expected[index]?.trim()) throw new Error('Completion criteria changed. Reload and try again.');
  const previous = criterionReview(expected[index], original.criterionReviews?.[index]);
  if (Boolean(previous?.confirmation) === confirmed) return { nodes, original, activity: null };
  const at = new Date().toISOString();
  const criterionReviews = expected.map((text, i) => criterionReview(text, original.criterionReviews?.[i]) ?? { text });
  criterionReviews[index] = { ...criterionReviews[index], confirmation: confirmed ? { by: author, at } : undefined };
  const activity = createTaskChangeActivity({ author, type: 'task-definition-change', message: confirmed ? '确认完成标准' : '撤销完成标准确认', changes: [{ label: expected[index], before: previous?.confirmation ? `${previous.confirmation.by} · ${previous.confirmation.at}` : null, after: confirmed ? `${author} · ${at}` : null }] });
  return { nodes: nodes.map(node => node.id === taskId ? { ...original, criterionReviews, updatedAt: at } : node), original, activity };
}

/** Restore only records bound to the current criterion; malformed storage stays unconfirmed. */
export function parseCriterionReviews(value: unknown, criteria: string[]): CriterionReview[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return criteria.map((text, index) => {
    const raw = value[index];
    if (!raw || typeof raw !== 'object' || raw.text !== text) return { text };
    const result: CriterionReview = { text };
    if (raw.confirmation && typeof raw.confirmation.by === 'string' && raw.confirmation.by.trim() && typeof raw.confirmation.at === 'string' && Number.isFinite(Date.parse(raw.confirmation.at))) result.confirmation = { by: raw.confirmation.by, at: raw.confirmation.at };
    if (raw.analysis && typeof raw.analysis.evidence === 'string' && typeof raw.analysis.observedAt === 'string' && Number.isFinite(Date.parse(raw.analysis.observedAt))) {
      const percent = raw.analysis.percent;
      result.analysis = { evidence: raw.analysis.evidence, observedAt: raw.analysis.observedAt, percent: typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : null };
    }
    return result;
  });
}

/** Same coarse thresholds as the task progress display; 100 never implies human confirmation. */
export function criterionStage(review?: CriterionReview): number | null {
  const percent = criterionPercent(review);
  return percent === null ? null : percent === 0 ? 0 : percent < 25 ? 1 : percent < 50 ? 2 : percent < 90 ? 3 : 4;
}
