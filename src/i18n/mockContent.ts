import readingDemo from './mock/readingDemo.json';
import createdProgress from './mock/createdProgress.json';
import progressRecords from './mock/progressRecords.json';
import tasks from './mock/tasks.json';
import criteria from './mock/criteria.json';
import taskCriteria from './mock/taskCriteria.json';
import coreRecords from './mock/coreRecords.json';
import fileNames from './mock/fileNames.json';
import type { Locale } from './core';
export type MockTaskCopy = { title: { zh: string; en: string }; goal: { zh: string; en: string }; records?: Readonly<Record<string, string | undefined>> };
export const mockTaskCatalog: Readonly<Record<string, MockTaskCopy>> = tasks;
/** Exact baseline matches only. IDs, stored fields and edited text remain untouched. */
export function mockTaskField(locale: Locale, id: string, field: 'title' | 'goal', value: string, additional: Readonly<Record<string, MockTaskCopy>> = {}) {
  const copy = (mockTaskCatalog[id] ?? additional[id])?.[field];
  return locale === 'en' && copy && value === copy.zh ? copy.en : value;
}
export const mockTeamNames: Record<string, [string, string]> = {
  'creator-commerce': ['达人带货运营团队', 'Creator Commerce'],
  platform: ['协作平台团队', 'Collaboration Platform'],
  'supply-operations': ['智能硬件试产团队', 'Hardware Operations'],
  'customer-success': ['企业客户成功团队', 'Enterprise Customer Success'],
};
export function mockTeamName(locale: Locale, id: string, value: string) {
  const pair = mockTeamNames[id];
  return locale === 'en' && pair?.[0] === value ? pair[1] : value;
}
const people: Record<string, string> = {
  '高远':'Yuan Gao','周岚':'Lan Zhou','陈默':'Mo Chen','林洁':'Jie Lin','顾遥':'Yao Gu','梁川':'Chuan Liang','许宁':'Ning Xu','韩序':'Xu Han','苏禾':'He Su',
  '程砚':'Yan Cheng','乔安':'An Qiao','唐澈':'Che Tang','叶宁':'Ning Ye','宋衡':'Heng Song','顾言':'Yan Gu','许悦':'Yue Xu',
};
export function mockPersonName(locale: Locale, id: string | undefined, value: string) {
  // Built-in principals use their Chinese name as the immutable ID.
  return locale === 'en' && id === value && people[value] ? people[value] : value;
}
export function mockRecordText(locale: Locale, taskId: string, value: string, additional: Readonly<Record<string, MockTaskCopy>> = {}) {
  if (locale !== 'en') return value;
  const task = mockTaskCatalog[taskId] ?? additional[taskId];
  if (!task) return value;
  const demo = (readingDemo as Record<string, Record<string, string>>)[taskId]?.[value];
  if (demo) return demo;
  if (task.records?.[value]) return task.records[value];
  const createdProgressCopy = additional[taskId] && createdProgress.find(copy => copy.zh === value);
  if (createdProgressCopy) return createdProgressCopy.en;
  if (additional[taskId] && value.startsWith('按截至该日各子任务最近记录汇总。')) {
    let translated = value.replace('按截至该日各子任务最近记录汇总。', 'Aggregated from the latest subtask records as of this date. ');
    for (const copy of [...createdProgress].sort((a, b) => b.zh.length - a.zh.length)) translated = translated.replaceAll(copy.zh, copy.en);
    if (!/[\u4e00-\u9fff]/.test(translated)) return translated.replaceAll('；', '; ');
  }
  const baselineCriteria = (taskCriteria as Record<string, string[]>)[taskId];
  if (baselineCriteria?.includes(value)) return (criteria as Record<string, string>)[value] ?? value;
  const record = (coreRecords as Record<string, Array<{text: string; en: string}>>)[taskId]?.find(item => item.text === value);
  if (record) return record.en;
  const progressRecord = (progressRecords as Record<string, Array<{zh: string; en: string}>>)[taskId]?.find(copy => copy.zh === value);
  if (progressRecord) return progressRecord.en;
  const fileName = (fileNames as Record<string, string>)[value];
  if (fileName) return fileName;
  const pairs: Array<[string, string]> = [
    [task.title.zh, task.title.en], [task.goal.zh, task.goal.en],
    [`更新“${task.title.zh}”的范围、依据与交付结果。`, `Updated the scope, evidence, and deliverables for “${task.title.en}”.`],
    [`已补充“${task.title.zh}”的最新核对信息，等待 Task Owner 确认下一步。`, `Updated the review notes for “${task.title.en}”. Waiting for the owner to confirm next steps.`],
    ['收到，我会在本轮完成前核对并回传结论。', 'Got it. I will review this and share my findings before this round is complete.'],
    [`发现“${task.title.zh}”仍有一项结果依据需要补齐，建议在提交结果前核对。`, `One piece of outcome evidence is still missing for “${task.title.en}”. Check it before submitting the result.`],
    ['调整了任务的计划截止时间。', 'Updated the planned due date.'],
    ['更新了任务范围、结果判断与当前依据。', 'Updated the task scope, outcome assessment, and supporting evidence.'],
    ['需求与规则', 'Requirements and rules'], ['证据与记录','Evidence and records'], ['交付成果','Deliverables'], ['历史版本','Version history'],
  ];
  for (const [zh, en] of pairs) if (value === zh) return en;
  for (const [zh, en] of [['交付确认','Delivery sign-off'], ['业务规则','Business rules'], ['核对记录','Review notes']] as const) {
    const prefix = `${task.title.zh}${zh}`;
    if (value.startsWith(prefix) && /^\.[a-z0-9]+$/i.test(value.slice(prefix.length))) return `${task.title.en} - ${en}${value.slice(prefix.length)}`;
  }
  return value;
}
const tagNames: Record<string, [string, string]> = {
  'creator-commerce-business': ['达人商务','Creator partnerships'],
  'creator-commerce-content': ['内容制作','Content production'],
  'creator-commerce-live': ['直播执行','Livestream operations'],
  'creator-commerce-product': ['商品运营','Merchandising'],
  'creator-commerce-growth': ['投流增长','Paid growth'],
  'creator-commerce-data': ['数据复盘','Analytics'],
  'creator-commerce-compliance': ['合规审核','Compliance review'],
  'creator-commerce-priority': ['高优先级','High priority'],
};
export function mockTagName(locale: Locale, id: string, value: string) {
  const pair = tagNames[id];
  return locale === 'en' && pair?.[0] === value ? pair[1] : value;
}
