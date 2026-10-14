export type ReferenceOptions = {
 field?: string;
 unit?: 'percent' | 'days' | 'count' | 'minutes';
 context?: Record<string, unknown>;
 rule?: string;
};
export type ReferenceDisplay = {
 kind: 'exact' | 'allowed' | 'unknown' | 'empty' | 'rule' | 'missing' | 'incomplete';
 label: string;
 value?: unknown;
 allowedValues?: number[];
 detail?: string;
};
export type ReferenceComparison = {status:'match'|'mismatch'|'unverified';label:string};

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isPercent = ({field,unit}: ReferenceOptions) => unit === 'percent' || ['percent','displayPercent','completionPercent','展示完成度','原始完成度','AI参考完成度','匹配百分比'].includes(field ?? '');
const isRawPercent = (field?: string) => field === '原始完成度' || field === 'completionPercent';
const emptyText = ({field,unit}: ReferenceOptions) => {
 if (unit === 'days' || field === '计划日期差') return '无法计算日期差';
 if (field === '确认完成' || field === 'completedOn') return '无确认记录';
 if (field === '预计完成' || field === 'forecastOn') return '无预测日期';
 if (field === '计划截止' || field === 'dueOn') return '未设计划截止';
 return '为空';
};
const countText = (count:number,field?:string) => count === 0 && (field === '历史节点' || field === '预测节点') ? `无${field}（0 个）` : `${count} 个`;
const valueText = (value:unknown,options:ReferenceOptions) => {
 if (options.unit === 'count' && (Array.isArray(value) || finite(value))) return countText(Array.isArray(value) ? value.length : value,options.field);
 if (finite(value) && isPercent(options)) return `${value}%`;
 if (finite(value) && options.unit === 'days') return `${value} 天`;
 if (finite(value) && options.unit === 'minutes') return `${value} 分钟`;
 if (typeof value === 'boolean') return value ? '是' : '否';
 return String(value);
};

/** Describe only the frozen reference. Actual model values must never fill a missing baseline. */
export function describeReference(value:unknown,options:ReferenceOptions = {}):ReferenceDisplay {
 const context=options.context;
 const allowed=context?.允许AI参考完成度 ?? context?.allowedPercents;
 if (isPercent(options) && Array.isArray(allowed) && allowed.length && allowed.every(finite)) {
  return {kind:'allowed',label:`允许 ${allowed.map(n=>`${n}%`).join(' / ')}`,allowedValues:allowed};
 }
 if (value === null && isRawPercent(options.field) && finite(context?.展示完成度 ?? context?.displayPercent)) {
  return {kind:'incomplete',label:'需补数值基准',detail:'已有展示完成度，但原始完成度参考为空；需要独立补充原始数值基准。'};
 }
 if (value === undefined) {
  const formula=typeof context?.计算依据 === 'string' ? context.计算依据 : typeof context?.formula === 'string' ? context.formula : undefined;
  const rule=options.rule ?? (typeof context?.判断规则 === 'string' ? context.判断规则 : undefined);
  if (formula || rule) return {kind:'rule',label:formula?'按公式核对':'按规则核对',detail:formula??rule};
  return {kind:'missing',label:isPercent(options)?'未设固定数值':'未设固定参考'};
 }
 if (value === null) {
  if (isPercent(options)) return {kind:'unknown',label:'应无法估计',value:null};
  return {kind:'empty',label:`应${emptyText(options)}`,value:null};
 }
 if (options.unit === 'count' && Array.isArray(value)) return {kind:'exact',label:countText(value.length,options.field),value:value.length};
 if (Array.isArray(value) && !value.length) return {kind:'empty',label:'应为空',value};
 return {kind:'exact',label:valueText(value,options),value};
}

export function formatActualValue(value:unknown,options:ReferenceOptions = {}):string {
 if (value === undefined) return '未返回';
 if (value === null) {
  if (isPercent(options)) return '无法估计';
  const empty=emptyText(options);
  return empty === '无确认记录' ? '尚无确认记录' : empty;
 }
 return valueText(value,options);
}

export function compareReference(actual:unknown,reference:ReferenceDisplay):ReferenceComparison {
 if (reference.kind === 'incomplete') return {status:'unverified',label:'需补参考基准'};
 if (reference.kind === 'rule') return {status:'unverified',label:reference.label};
 if (reference.kind === 'missing') return {status:'unverified',label:'未设固定参考'};
 if (actual === undefined) return {status:'unverified',label:'未返回，无法对照'};
 if (reference.kind === 'allowed') {
  const matches=finite(actual) && reference.allowedValues!.includes(actual);
  return {status:matches?'match':'mismatch',label:matches?'落在允许范围，仍需核对证据':'超出允许范围，需核对原因'};
 }
 const matches=Array.isArray(reference.value) ? Array.isArray(actual) && !actual.length && !reference.value.length : actual === reference.value;
 return {status:matches?'match':'mismatch',label:matches?(reference.kind==='exact'?'一致，仍需核对证据':'符合空值要求，仍需核对证据'):'存在偏差，需核对原因'};
}

const referenceId = /^(analysis|people)-reference-v\d+-/;
const genericAnalysisSubjects = new Set(['整体进度','逐条标准完成度','燃起图数据结构','预计完成与计划差值','当前情况','下一步建议']);
export function acceptanceCheckSections<T extends {id:string;subject:string;expected:unknown}>(checks:T[]):{primary:T[];details:T[];hasReferences:boolean} {
 const hasReferences=checks.some(check=>referenceId.test(check.id));
 if (!hasReferences) return {primary:checks,details:[],hasReferences};
 const details=checks.filter(check=>/^analysis-v\d+-/.test(check.id) && genericAnalysisSubjects.has(check.subject) && check.expected === null);
 const detailIds=new Set(details.map(check=>check.id));
 return {primary:checks.filter(check=>!detailIds.has(check.id)),details,hasReferences};
}

type ReferenceCase = Pick<LabCase,'assertions'|'expectedOutput'>;
const record=(value:unknown):Record<string,unknown>|undefined=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:undefined;
export function analysisProgressReference(item:ReferenceCase,stepId:string):{display:ReferenceDisplay;raw?:ReferenceDisplay} {
 const checks=item.expectedOutput?.checks??[];
 const strict=checks.find(check=>check.stepId===stepId&&check.subject==='经业务证据核对的进度基准');
 const check=strict??checks.find(check=>check.stepId===stepId&&check.subject==='参考整体进度');
 const context=record(check?.expected);
 const fromAssertion=(path:string)=>item.assertions.find(a=>a.stepId===stepId&&a.path===path&&a.operator==='equals');
 const display=describeReference(check?context?.[strict?'displayPercent':'展示完成度']:fromAssertion('result.progress.displayPercent')?.expected,{field:strict?'displayPercent':'展示完成度',unit:'percent',context,rule:check?.criterion});
 const rawAssertion=fromAssertion('result.progress.completionPercent');
 const raw=check||rawAssertion?describeReference(check?context?.[strict?'completionPercent':'原始完成度']:rawAssertion?.expected,{field:strict?'completionPercent':'原始完成度',unit:'percent',context,rule:check?.criterion}):undefined;
 if(strict&&typeof context?.formula==='string') {
  if(display.kind==='rule')display.label='按工作量计算';
  if(raw?.kind==='rule')raw.label='按工作量计算';
 }
 return {display,raw};
}

export function analysisCriterionReference(item:ReferenceCase,stepId:string,index:number,criterionText:string):ReferenceDisplay {
 const rows=item.expectedOutput?.checks.find(check=>check.stepId===stepId&&check.subject==='参考逐条完成度')?.expected;
 const context=Array.isArray(rows)?rows.map(record).find(row=>row?.完成标准===criterionText):undefined;
 if(context)return describeReference(context.AI参考完成度,{field:'AI参考完成度',unit:'percent',context});
 const assertions=item.assertions.filter(a=>a.stepId===stepId&&a.path===`result.criterionAssessments.${index}.percent`);
 const exact=assertions.find(a=>a.operator==='equals');
 if(exact)return describeReference(exact.expected,{unit:'percent'});
 const lower=assertions.find(a=>a.operator==='gte'),upper=assertions.find(a=>a.operator==='lte');
 if(lower||upper){
  const allowed=[0,25,50,75,100].filter(n=>(!lower||finite(lower.expected)&&n>=lower.expected)&&(!upper||finite(upper.expected)&&n<=upper.expected));
  if(allowed.length)return describeReference(undefined,{unit:'percent',context:{allowedPercents:allowed}});
 }
 return describeReference(undefined,{unit:'percent'});
}

export function analysisWorkloadReference(value:unknown):{mode:'legacy'|'sources'|'empty';values:Record<string,unknown>;detail?:string} {
 const source=record(value)??{};
 if(Object.hasOwn(source,'comparison')&&source.comparison===null)return {mode:'empty',values:{comparison:null},detail:typeof source.reason==='string'?source.reason:undefined};
 if(['creation','workload','planned','forecast'].some(key=>Object.hasOwn(source,key))) {
  const creation=record(source.creation),planned=record(source.planned);
  return {mode:'sources',values:{创建日期:creation?.at,初始投入:creation?.scopeMinutes,正式开始:source.startOn,计划截止:source.dueOn,预计完成:source.forecastOn,历史节点:source.workload,计划节点:planned?.points,预测节点:source.forecast}};
 }
 return {mode:'legacy',values:source};
}
import type {LabCase} from '@/test-lab/types';
