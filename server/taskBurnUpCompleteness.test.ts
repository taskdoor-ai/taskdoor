import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { allTeamWorkspaceNodes } from '../src/data/teamWorkspaceScenarios.ts';
import { getTaskProgressDemoExample, getTaskProgressDemoEvidence } from '../src/data/taskProgressDemo.ts';
import { getTaskProgressComparison, getTaskProgressChart } from '../src/lib/taskProgressComparison.ts';
import { TaskProgressComparison } from '../src/components/TaskProgressComparison.tsx';
(globalThis as typeof globalThis & { React: typeof React }).React=React;

test('常规 Demo 均具备历史总量线，单次观察仅保留指定样例',()=>{
  const single=[];
  for(const task of allTeamWorkspaceNodes.filter(t=>t.kind==='task')){
    const s=getTaskProgressDemoExample(task.id),m=getTaskProgressComparison(s);if(!m)continue;
    if(m.history.length===1){single.push(task.id);continue;}
    const chart=getTaskProgressChart(m);
    assert.ok(chart.rows.at(-1)!.x>chart.rows[0].x,task.id);
    assert.match(chart.scopePath,/H /,task.id);
    const record=getTaskProgressDemoEvidence(task.id);
    if(record){assert.equal(m.latest.scopeMinutes,record.scopeMinutes);assert.equal(m.latest.completedMinutes,record.completedMinutes);assert.equal(m.latest.at,record.observedAt.slice(0,10));}
  }
  assert.deepEqual(single,['weekly-retro-actions']);
});

test('图例直接给出最近记录的总量与完成量，长日期跨度也能读到工作量',()=>{
  const s=getTaskProgressDemoExample('platform-weekly-release-risk-review')!;
  const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series:s}));
  assert.match(html,/task-progress-legend-scope[^>]*>总工作量 <strong>0\.19<\/strong>/);
  assert.match(html,/task-progress-legend-actual[^>]*>完成量 <strong>0<\/strong>/);
});

test('固定历史包含范围修订与等待，零进度不会为了画线被补成有产出',()=>{
  const asset=getTaskProgressComparison(getTaskProgressDemoExample('product-launch-promo-assets'))!;
  assert.ok(asset.history.some(row=>row.addedMinutes>0));
  const waiting=getTaskProgressComparison(getTaskProgressDemoExample('ccx-double11-segment-replay'))!;
  assert.ok(waiting.history.length>=3);assert.ok(waiting.history.every(row=>row.completedMinutes===0));
});

test('总量与完成量重叠时保留同一坐标的灰色外沿与蓝色内线',()=>{
  const s=getTaskProgressDemoExample('weekly-retro-decisions')!;
  s.workload=[{...s.workload.at(-1)!,at:'2026-09-12'},{...s.workload.at(-1)!}];
  const m=getTaskProgressComparison(s)!,c=getTaskProgressChart(m);
  assert.equal(c.scopeOverlapPath,c.completedPath);
  assert.notEqual(c.scopeOverlapPath,c.scopePath); // Creation has known scope, but no completion evidence.
  const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series:s}));
  assert.match(html,/class="task-progress-scope-overlap"/);
  assert.match(html,/class="task-progress-scope-point"[^>]*data-overlap="true"[^>]*r="6"/);
  assert.equal(c.rows[0].scopeY,c.rows[0].completedY);
});
