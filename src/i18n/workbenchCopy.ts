import { priorityReasonFor, type PersonalWorkbenchItem } from '../lib/personalWorkbench';
import type { Locale } from './core';

/** Compose system guidance from facts; never translate arbitrary user criteria. */
export function workbenchPriorityReason(locale: Locale, item: PersonalWorkbenchItem, mockText: (text: string) => string = text => text): string {
  if (locale !== 'en') return priorityReasonFor(item);
  const context = item.priorityContext;
  const dueLabel = item.dueLabel?.replace(/^(\d{1,2}) 月 (\d{1,2}) 日/, (_, month: string, day: string) => `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1] ?? month} ${day}`);
  const date = dueLabel ? ` (${dueLabel})` : '';
  const parts: string[] = [];
  if (item.dueState === 'overdue') parts.push(`Past the due date${date}.`);
  else if (item.dueState === 'today') parts.push(`Due today${date}.`);
  else if (item.dueState === 'upcoming' && item.dueLabel) parts.push(`Due ${dueLabel}.`);
  const dependencies = [
    context?.pendingDependencyCount ? `${context.pendingDependencyCount} dependent deliverables are incomplete` : '',
    context?.missingDependencyCount ? `${context.missingDependencyCount} dependency records are unavailable; review delivery requirements` : '',
  ].filter(Boolean).join('; ');
  const risk = item.focus === 'status-conflict' ? 'The task status conflicts with dependency or subtask records. Review what is complete'
    : dependencies || (item.focus === 'blocked' ? 'Marked as blocked. Clarify what is needed to unblock the task'
      : item.focus === 'dependency' ? 'Subtask dependencies are incomplete. Review the requirements'
        : item.focus === 'evidence' || item.status === '待审核' ? 'Review the deliverables against the acceptance criteria'
          : item.focus === 'unknown' ? 'Some information is missing. Gather the evidence needed to assess this task' : '');
  if (risk) parts.push(`${risk}.`);
  if (context?.childCount) parts.push(`Direct subtasks: ${context.childCount} total; ${context.completedChildCount} marked complete; ${context.remainingChildCount} awaiting wrap-up${context.cancelledChildCount ? `; ${context.cancelledChildCount} canceled` : ''}. Review the overall delivery.`);
  if (context?.completionCriterion) {
    const chars = Array.from(mockText(context.completionCriterion).replace(/[。！？；.!?;]+$/u, ''));
    parts.push(`Review: “${chars.slice(0, 64).join('')}${chars.length > 64 ? '…' : ''}”.`);
  } else if (context) parts.push('No acceptance criteria have been set. Define the deliverables and how they will be checked.');
  else if (!parts.length) parts.push(item.role === 'coordination' ? 'You coordinate subtask deliverables. Review the overall result.' : 'No specific delivery records are available. Confirm the expected result.');
  return parts.join(' ');
}
