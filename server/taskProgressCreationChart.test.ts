import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {getTaskProgressDemoExample} from '../src/data/taskProgressDemo.ts';
import {getTaskProgressDisplay} from '../src/lib/taskProgressDisplay.ts';
import {getTaskProgressChart,getTaskProgressComparison} from '../src/lib/taskProgressComparison.ts';
import {TaskProgressComparison} from '../src/components/TaskProgressComparison.tsx';
import {normalizeWorkspaceNodes,workspaceNodes} from '../src/data/workspaceNodes.ts';
(globalThis as typeof globalThis & {React:typeof React}).React=React;

test('单次进度记录也从创建日显示初始总量，截止与预测不能截掉创建段',()=>{
  const series=getTaskProgressDemoExample('weekly-retro-actions')!;
  const before=structuredClone(series);
  const legacy=structuredClone(series);
  delete legacy.creation;
  assert.deepEqual(getTaskProgressDemoExample('weekly-retro-actions',legacy)?.creation,series.creation);
  assert.equal(legacy.creation,undefined);
  const model=getTaskProgressComparison(series)!;
  const chart=getTaskProgressChart({...model,dueOn:'2026-09-01',deltaDays:14});
  assert.equal(chart.start,'2026-08-31');
  assert.equal(chart.end,'2026-09-15');
  assert.equal(chart.scopeRows[0].scopeMinutes,120);
  assert.equal(chart.scopeRows[0].x,chart.startX);
  assert.match(chart.scopePath,/H /);
  assert.equal(chart.rows.length,1);
  assert.equal(chart.rows[0].at,'2026-09-14');
  assert.equal(chart.rows[0].completedMinutes,60);
  assert.ok(chart.rows[0].x>chart.startX);
  assert.match(chart.forecastPath,/^M /);
  const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series,progressTask:{createdAt:'2026-08-31T09:00:00+08:00',plannedStartOn:'2026-09-14',plannedEndOn:'2026-09-01'}}));
  assert.match(html,/创建/);
  assert.match(html,/2026-08-31/);
  assert.match(html,/初始总工作量/);
  assert.deepEqual(series,before);
});

test('实际创建记录优先，原始人天独立于完成量和后续范围变更，刷新后保留',()=>{
  const seed=workspaceNodes.find(t=>t.id==='weekly-retro-actions')!;
  assert.equal(seed.kind,'task');if(seed.kind!=='task')return;
  const at='2026-08-28T10:00:00+08:00';
  const baseline={at,minutes:120,version:1,scopeKey:seed.effortEstimate!.scopeKey};
  const task={...seed,createdAt:at,effortBaseline:{...baseline,minutes:90},effortEstimate:{...seed.effortEstimate!,version:2}};
  const restored=normalizeWorkspaceNodes(JSON.parse(JSON.stringify([task]))).find(t=>t.id===task.id)!;
  assert.equal(restored.kind,'task');if(restored.kind!=='task')return;
  assert.deepEqual(restored.effortBaseline,task.effortBaseline);
  const series=getTaskProgressDemoExample(task.id)!;
  const chart=getTaskProgressChart(getTaskProgressComparison(series)!,restored);
  assert.equal(chart.start,'2026-08-28');
  assert.equal(chart.scopeRows[0].scopeMinutes,90);
  assert.equal(chart.scopeRows.at(-1)!.scopeMinutes,120);
  assert.equal(chart.scopeRows.at(-1)!.addedMinutes,30);
  assert.equal(chart.rows[0].completedMinutes,60);
});

test('无创建估算不倒填当前量，修改截止不修改历史起点或预测',()=>{
  const series=getTaskProgressDemoExample('weekly-retro-actions')!;
  delete series.creation;
  const model=getTaskProgressComparison(series)!;
  const task={createdAt:'2026-08-30T10:00:00+08:00'};
  const a=getTaskProgressChart(model,task);
  const b=getTaskProgressChart({...model,dueOn:'2026-09-20'},task);
  assert.equal(a.start,'2026-08-30');
  assert.equal(b.start,a.start);
  assert.equal(b.end,'2026-09-20');
  assert.equal(a.scopeRows.length,1);
  assert.equal(a.scopeRows[0].at,'2026-09-14');
  assert.equal(a.forecastRows.at(-1)!.at,b.forecastRows.at(-1)!.at);
});


test('开始时间只取真实创建日，计划开始和首条进度不能覆盖它',()=>{
  const series=getTaskProgressDemoExample('weekly-retro-actions')!;
  const seed=workspaceNodes.find(t=>t.id==='weekly-retro-actions')!;
  assert.equal(seed.kind,'task');if(seed.kind!=='task')return;
  const before=structuredClone(series);
  for(const plannedStartOn of ['2026-09-14','2026-09-20','']) {
    const task={...seed,plannedStartOn};
    const display=getTaskProgressDisplay({series,task});
    assert.equal(display.startOn,'2026-08-31');
    const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series,progressTask:task}));
    assert.match(html,/data-date="2026-08-31"[^]*?data-kind="start">创建/);
    const chart=getTaskProgressChart({...getTaskProgressComparison(series)!,startOn:display.startOn},task);
    assert.equal(chart.rows[0].at,'2026-09-14');
    assert.equal(chart.scopeRows[0].completedMinutes,null);
    assert.ok(chart.rows[0].x>chart.startX);
  }
  assert.deepEqual(series,before);
});

test('历史起点改标创建，保留截图截止与真实历史及16天差值',()=>{
  const series=getTaskProgressDemoExample('fragrance-content')!;
  const before=structuredClone(series);
  const task={status:'进行中',plannedStartOn:'2026-09-01',plannedEndOn:'2026-08-30'};
  const display=getTaskProgressDisplay({series,task});
  assert.equal(display.startOn,null);
  assert.equal(display.dueOn,'2026-08-30');
  assert.equal(display.deltaDays,16);
  const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series,progressTask:task}));
  const axis=html.split('class="task-progress-chart-date-axis"')[1].split('</svg>')[0];
  assert.match(axis,/data-kind="record">创建/);
  assert.doesNotMatch(axis,/开始时间/);
  assert.doesNotMatch(html,/创建时间未记录|首条记录/);
  assert.equal(getTaskProgressComparison(series)!.dueOn,'2026-08-30');
  assert.deepEqual(series,before);
});

test('实际创建晚于截止或历史时保留异常日期，不篡改日期和已有观测',()=>{
  const series=getTaskProgressDemoExample('fragrance-content')!;
  const task={createdAt:'2026-09-10T10:00:00+08:00',plannedEndOn:'2026-08-30'};
  const display=getTaskProgressDisplay({series,task});
  const chart=getTaskProgressChart({...getTaskProgressComparison(series)!,startOn:display.startOn,dueOn:display.dueOn},task);
  assert.equal(display.startOn,'2026-09-10');
  assert.equal(display.dueOn,null);
  assert.match(display.scheduleIssue!,/截止.*创建/);
  assert.equal(chart.start,[task.createdAt.slice(0,10),series.workload[0].at].sort()[0]);
  assert.equal(chart.createdOn,'2026-09-10');
  assert.deepEqual(chart.rows.map(p=>[p.at,p.completedMinutes]),series.workload.map(p=>[p.at,p.completedMinutes]));
  const missing=getTaskProgressChart(getTaskProgressComparison(getTaskProgressDemoExample('weekly-retro-actions')!)!,{createdAt:'invalid'});
  assert.equal(missing.createdOn,null,'无效真实创建日期不能被演示创建日期补造');
  assert.equal(missing.scopeRows[0].at,'2026-09-14');
  assert.equal(missing.scopeRows[0].isCreation,false);
  const utcTask={createdAt:'2026-08-30T23:30:00Z'};
  assert.equal(getTaskProgressDisplay({series,task:utcTask}).startOn,'2026-08-31');
  assert.equal(getTaskProgressChart(getTaskProgressComparison(series)!,utcTask).createdOn,'2026-08-31');
});
