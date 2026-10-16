import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {LabCase} from '../src/test-lab/types.ts';

// The fork has its own aliases and CSS entrypoints; retain real components in this server render.
Object.assign(globalThis,{React});
const {createElement}=React;
registerHooks({
 resolve(specifier,context,nextResolve){
  if(specifier.startsWith('@taskdoor/'))return nextResolve(new URL(`../src/test-lab/${specifier.slice('@taskdoor/'.length)}.ts`,import.meta.url).href,context);
  return nextResolve(specifier,context);
 },
 load(url,context,nextLoad){
  if(url.endsWith('.css'))return {format:'module',source:'export {};',shortCircuit:true};
  return nextLoad(url,context);
 },
});
const {default:CaseAcceptance}=await import(new URL('../tools/evaluation/fork/extensions/CaseAcceptance.tsx',import.meta.url).href);
const {default:AnalysisWorkloadPreview}=await import(new URL('../tools/evaluation/fork/extensions/AnalysisWorkloadPreview.tsx',import.meta.url).href);

test('验收页面展示允许档、矛盾基准和具体业务条件',()=>{
 const item={id:'ui-reference',name:'参考展示',category:'分析',teamId:'team',actorId:'actor',description:'',archived:false,enabled:true,version:1,steps:[],assertions:[],reviewChecklist:[],expectedOutput:{version:1,checks:[
  {id:'analysis-reference-v2-progress',stepId:'s1',subject:'参考整体进度',criterion:'对照参考',expected:{展示完成度:100,原始完成度:null}},
  {id:'analysis-reference-v2-criteria',stepId:'s1',subject:'参考逐条完成度',criterion:'对照参考',expected:[{完成标准:'中英文交付',允许AI参考完成度:[25,50,75]}]},
  {id:'analysis-reference-v2-trend',stepId:'s1',subject:'参考燃起图与日期',criterion:'对照参考',expected:{历史节点:[]}},
  {id:'new-scope',stepId:'s1',subject:'新增范围验收',criterion:'英文增量单独补估并保留中文成果',expected:null},
 ]}} satisfies LabCase;
 const html=renderToStaticMarkup(createElement(CaseAcceptance,{item}));
 assert.ok(html.includes('允许 25% / 50% / 75%'));
 assert.ok(html.includes('需补数值基准'));
 assert.ok(html.includes('无历史节点（0 个）'));
 assert.ok(html.includes('新增范围验收'));
 assert.ok(html.includes('英文增量单独补估并保留中文成果'));
});

test('工时预览将空历史显示为零，并且两边缺日期不标一致',()=>{
 const html=renderToStaticMarkup(createElement(AnalysisWorkloadPreview,{progress:{comparison:{workload:[]}},reference:{历史节点:[]}}));
 const rows=html.match(/<tr>.*?<\/tr>/g)??[];
 const history=rows.find(row=>row.includes('历史节点数'))!;
 const due=rows.find(row=>row.includes('计划截止'))!;
 assert.ok(history.includes('无历史节点（0 个）'));
 assert.ok(history.includes('一致，仍需核对证据'));
 assert.ok(due.includes('未返回'));
 assert.ok(due.includes('未设固定参考'));
 assert.ok(!due.includes('一致'));
});

test('工时预览区分应无确认记录与缺失字段',()=>{
 const html=renderToStaticMarkup(createElement(AnalysisWorkloadPreview,{progress:{comparison:{timing:{completedOn:null}}},reference:{确认完成:null}}));
 const confirmed=(html.match(/<tr>.*?<\/tr>/g)??[]).find(row=>row.includes('用户确认完成'))!;
 assert.ok(confirmed.includes('尚无确认记录'));
 assert.ok(confirmed.includes('应无确认记录'));
 assert.ok(confirmed.includes('符合空值要求'));
});

test('严格无历史来源直接显示比较应为空及原因，不生成缺失日期对照',()=>{
 const html=renderToStaticMarkup(createElement(AnalysisWorkloadPreview,{progress:{comparison:null},reference:{comparison:null,reason:'没有真实历史与正式起点'}}));
 const rows=html.match(/<tr>.*?<\/tr>/g)??[];
 assert.equal(rows.filter(row=>row.includes('<td>')).length,1);
 assert.ok(rows.some(row=>row.includes('历史与排期比较')&&row.includes('符合空值要求')));
 assert.ok(html.includes('没有真实历史与正式起点'));
 assert.ok(!html.includes('未返回'));
});

test('严格来源真实字段显示创建、日期与全部节点参考',()=>{
 const creation={at:'2026-10-05',scopeMinutes:240};
 const workload=[{at:'2026-10-05',scopeMinutes:240,completedMinutes:0,scopeVersion:'s1'},{at:'2026-10-09',scopeMinutes:240,completedMinutes:120,scopeVersion:'s1'}];
 const planned={scopeVersion:'s1',points:[{at:'2026-10-05',completedMinutes:0},{at:'2026-10-12',completedMinutes:240}]};
 const reference={creation,workload,planned,forecast:[],startOn:'2026-10-05',dueOn:'2026-10-12',forecastOn:null};
 const progress={comparison:{creation,workload,expected:planned,forecastTrend:null,timing:{startOn:reference.startOn,dueOn:reference.dueOn,forecastOn:null}}};
 const html=renderToStaticMarkup(createElement(AnalysisWorkloadPreview,{progress,reference}));
 const rows=html.match(/<tr>.*?<\/tr>/g)??[];
 for(const label of ['创建日期','初始投入','正式开始','计划截止','历史节点数','计划节点数','预测节点数']){
  const row=rows.find(row=>row.includes(label))!;
  assert.ok(row,`${label}行存在`);
  assert.ok(row.includes('一致，仍需核对证据'),`${label}实际与预设一致`);
  assert.ok(!row.includes('未设固定参考'));
 }
 const forecast=rows.find(row=>row.includes('预计完成'))!;
 assert.ok(forecast.includes('应无预测日期'));
 assert.ok(forecast.includes('符合空值要求'));
});
