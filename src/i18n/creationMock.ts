import type { Locale } from './core';
import type { CreationPlanningResult } from '../lib/taskCreationPlanning';
import type { CreationForm, CreationTask } from '../lib/taskCreationForm';
import type { TaskCreationScenarioId } from '../data/taskCreationScenarios';
import { getEffortScopeKey } from '../lib/taskEffort';

export const creationScenarioEnglish: Record<TaskCreationScenarioId, { label: string; prompt: string }> = {
  'single-task': { label: 'Single task · no subtasks', prompt: 'Prepare the minutes for next week’s team meeting' },
  'complex-plan': { label: 'Complex project · 8 tasks', prompt: 'Plan a Douyin creator commerce campaign for a new sun-protection jacket, launching September 15 with a GMV target of 500,000. Cover creator selection, scripts and assets, livestream operations, inventory and pricing, advertising, analysis and compliance.' },
  'nested-plan': { label: 'Nested project · 4 levels', prompt: 'Prepare a creator commerce launch with commercial partnerships, content production, launch and review. Split content into scripting and video production, then split scripting into product selling points and livestream scripts.' },
  'clarify-requirement': { label: 'Unclear request · guided planning', prompt: 'Help me plan an event' },
  'similar-task': { label: 'Similar task · confirm before creating', prompt: 'Prepare a retrospective for the new product launch' },
  'existing-parent': { label: 'Existing parent · create a subtask', prompt: 'Prepare the media invitation list for the product launch' },
  'unassigned-owner': { label: 'No matching owner · invite a member', prompt: 'Deploy the office wireless network' },
};
type EnglishTask = { title: string; goal: string; completionCriteria: string[]; executionTips: string[] };
const task = (title: string, goal: string, criteria: string, tips: string): EnglishTask => ({ title, goal, completionCriteria: [criteria], executionTips: [tips] });
const partnership = task('Confirm creator partnerships', 'Secure suitable creators for the product campaign.', 'Deliver the confirmed creator list, commercial terms, agreements and schedule.', 'Screen audience fit and past delivery. Confirm fees, commissions, usage rights and availability in writing.');
const sellingPoints = task('Verify product selling points', 'Give the script a clear basis in verifiable product value.', 'Deliver verified selling points and supporting evidence.', 'Connect each claim to product specifications and evidence. Separate approved claims from information that still needs verification.');
const script = task('Write livestream scripts', 'Make product demonstrations, interactions and purchase guidance executable.', 'Deliver approved scripts covering the livestream flow, spoken content and interactions.', 'Sequence the opening, demonstrations, questions and purchase guidance. Include timing, promotion conditions and fallback responses.');
const launch = task('Run the launch', 'Publish on schedule and resolve operational issues promptly.', 'Complete the rehearsal, close issues, publish on the confirmed schedule and retain execution records.', 'Test links, promotions and inventory before release. Record incidents, owners and recovery times while monitoring the launch.');
const review = task('Deliver campaign analysis', 'Understand campaign results and define improvements for the next round.', 'Deliver reconciled sales and advertising data, findings, issues and follow-up actions.', 'Align refund and attribution windows before comparing channels. Turn findings into actions with owners and deadlines.');
const complex: EnglishTask[] = [
  task('Sun-protection jacket creator commerce campaign', 'Coordinate the Douyin creator campaign for a September 15 launch and GMV of 500,000, covering creators, content, operations, inventory, advertising, data and compliance.', 'Launch on September 15 with approved content and fulfillment ready. Reach GMV of 500,000 and deliver verifiable sales data and a retrospective.', 'Confirm the GMV measurement and refund window. Coordinate creator availability and inventory, then check assets, links, promotions and fulfillment before launch.'),
  partnership,
  task('Produce scripts and campaign assets', 'Provide accurate, approved promotional content for creators.', 'Deliver approved selling-point copy, livestream scripts and usable campaign assets.', 'Verify claims before drafting. Keep scripts, demonstrations and assets on the same approved version.'),
  launch,
  task('Confirm inventory, pricing and fulfillment', 'Keep product offers accurate and customer orders fulfillable.', 'Confirm final prices, promotion settings, stock, shipping and after-sales arrangements.', 'Check promotion stacking, sellable inventory and shipping times. Prepare responses to stockouts, returns and exchanges.'),
  task('Plan and run advertising', 'Reach the intended audience within the agreed budget and ROI measurement.', 'Deliver the approved media plan and execution records, with ROI checked using the agreed method.', 'Agree budget limits and ROI definitions. Test audiences and assets, set review frequency and stopping conditions, and record adjustments.'),
  review,
  task('Review content and contract compliance', 'Ensure campaign assets and agreements satisfy the applicable requirements.', 'Deliver asset and contract review records. Close required corrections before launch.', 'Check claims, licenses and contractual obligations. Recheck corrections and archive the approved versions.'),
];
const nested: EnglishTask[] = [
  task('Creator commerce launch', 'Complete creator partnerships, content production, launch and review to support product sales.', 'Accept partnership and content deliverables, execute the launch and deliver the results review.', 'Align campaign scope, sales measurement and launch dates before coordinating commercial, content and fulfillment work.'),
  partnership,
  task('Produce campaign content', 'Communicate the new product’s value accurately.', 'Approve scripts and video assets for launch.', 'Confirm claims first, then coordinate writing and filming using one approved version and designated reviewers.'),
  task('Plan the script', 'Help presenters explain selling points and guide purchases accurately.', 'Approve the product selling points and livestream script.', 'Turn verified selling points into a clear sequence of demonstrations, interactions and conversion guidance. Read through it with the presenter.'),
  sellingPoints, script,
  task('Film and deliver video assets', 'Provide campaign videos ready for publication.', 'Deliver approved videos that meet the publishing specifications.', 'Prepare storyboards and samples. Check framing, audio and lighting, then deliver captions, covers and usage rights with the videos.'),
  task('Complete launch and review', 'Launch successfully and retain lessons for future campaigns.', 'Complete launch operations, reconcile data and document clear review findings.', 'Check links, prices, inventory and schedules. Assign monitoring contacts and collect data over one consistent measurement window.'),
  launch, review,
];
const examples: Partial<Record<TaskCreationScenarioId, EnglishTask[]>> = {
  'complex-plan': complex, 'nested-plan': nested,
  'single-task': [task('Prepare next week’s meeting minutes', 'Give participants a shared understanding of the meeting decisions and next actions.', 'Share minutes covering topics, decisions and unresolved questions. Record an owner and agreed date for each action and confirm them with participants.', 'Extract topics, decisions and actions from the meeting notes. Verify owners and dates, and ask participants to clarify ambiguous conclusions.')],
  'unassigned-owner': [task('Deploy the office wireless network', 'Provide stable connectivity for office work and meetings.', 'Cover every office area, pass connection and video meeting tests, and deliver network configuration, usage and troubleshooting notes.', 'Check coverage areas, device counts and existing equipment. Configure and test each area, retain configuration records and verify recovery procedures.')],
  'similar-task': [task('Prepare the product launch retrospective', 'Summarize launch outcomes, key data, issues and next actions in a shared review.', 'Deliver a focused retrospective covering results, data, problems and next actions.', 'Check the scope and data window of existing reviews. Add the specific causes and improvements from this launch without duplicating conclusions.')],
  'existing-parent': [task('Prepare and confirm media invitations', 'Verify target media, contacts and invitation status, and confirm attendees before the launch.', 'Deliver a verified media list with contact details, invitation status and attendance confirmations.', 'Deduplicate the existing list and verify contacts and channels. Track pending replies separately from confirmed attendees.')],
};

/** Only freshly generated built-in fixtures pass here. Never translate saved or user-edited task fields. */
export function localizeFreshCreationPlan(result: CreationPlanningResult, locale: Locale, answers?: { goal?: string; deliverable?: string }): CreationPlanningResult {
  if (locale !== 'en') return result;
  if (result.stage === 'unavailable') return { ...result, message: 'This preview cannot generate a plan from that request. Your input was preserved. Choose a supported example below to continue.' };
  if (result.stage === 'clarify') return { ...result, questions: result.questions.map(question => question.field === 'goal'
    ? { ...question, title: 'What should this event achieve?', choices: ['Increase product awareness', 'Generate sales leads', 'Encourage repeat purchases'], placeholder: 'Describe the result you want to change, such as helping customers understand the new product.' }
    : { ...question, title: 'What needs to be delivered?', choices: ['Event plan and schedule', 'Plan, assets and retrospective', 'Execution checklist and ownership'], placeholder: 'Describe verifiable deliverables, such as an executable event plan and schedule.' }) };
  const id = result.form.scenarioId;
  const fixture = id ? examples[id] : undefined;
  const apply = (original: CreationTask, english?: EnglishTask): CreationTask => {
    if (!english) return original;
    const next = { ...original, ...english };
    if (original.effortEstimate) {
      const old = original.effortEstimate;
      const workMethod = 'Use AI and tools for preparation and checks; people execute, review and confirm the deliverables.';
      next.effortEstimate = { ...old, workMethod, reason: `Mock assumption: ${old.minutes === null ? 'Unconfirmed' : old.minutes / 60} hours of active human effort for preparation, execution and review. Excludes waiting and unattended processing.`, scopeKey: old.scopeKey === getEffortScopeKey(original, old.workMethod) ? getEffortScopeKey(next, workMethod) : old.scopeKey };
    }
    return next;
  };
  const clarified = id === 'clarify-requirement' ? task('Plan and deliver the event', answers?.goal ?? result.form.mainTask.goal, `Deliver: ${answers?.deliverable ?? ''}`, 'Confirm the event scope and deliverables first. Add the deadline in the draft plan.') : undefined;
  const form: CreationForm = { ...result.form, mainTask: apply(result.form.mainTask, clarified ?? fixture?.[0]), subtasks: result.form.subtasks.map((item, i) => apply(item, fixture?.[i + 1])), candidateReason: result.form.candidate ? result.form.candidateKind === 'parent' ? 'This deliverable may belong to the existing parent task. Check its scope and subtasks to avoid duplicate work.' : 'Review this existing task against the requested outcome and deliverables before deciding whether it is the same work.' : undefined };
  return { ...result, form, summary: result.stage === 'decision' ? 'Confirm the relationship with the existing task before continuing. No tasks have been created and duplicate checking is not complete.' : `Prepared ${form.subtasks.length + 1} draft tasks. Review goals, completion criteria, ownership and dates before confirming. Assignments are suggestions; no tasks have been created and duplicate checking is not complete.` };
}
