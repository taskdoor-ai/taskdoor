import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {taskProgressComparisonExamples} from '../src/data/taskProgressComparisonExamples.ts';
import {getTaskProgressDisplay} from '../src/lib/taskProgressDisplay.ts';
import {getTaskProgressComparison,getTaskProgressChart} from '../src/lib/taskProgressComparison.ts';
import {layoutBurnUpDateAxis} from '../src/components/TaskBurnUpTiming.tsx';
import {TaskProgressComparison} from '../src/components/TaskProgressComparison.tsx';
(globalThis as typeof globalThis & {React:typeof React}).React=React;
const series=taskProgressComparisonExamples.find(s=>s.id==='behind')!;
test('edge dates and captions stay centered on their line and node, inside the SVG at narrow and wide sizes',()=>{
 for(const completedAt of [undefined,'2026-09-21T10:00:00+08:00']){
  const task={status:completedAt?'已完成':'进行中',createdAt:'2026-09-01T09:00:00+08:00',plannedEndOn:'2026-09-18',completedAt};
  const display=getTaskProgressDisplay({series,task});
  const comparison=getTaskProgressComparison(display.historySeries)!;
  const chart=getTaskProgressChart({...comparison,startOn:display.startOn,dueOn:display.dueOn,forecastOn:display.forecastOn,completedOn:display.completedOn,finishOn:display.finishOn},task);
  const layout=layoutBurnUpDateAxis({model:display,...chart,asOf:comparison.latest.at});
  const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{series,progressTask:task}));
  const viewBox=html.match(/class="task-burnup-chart task-progress-comparison-chart"[^>]*viewBox="([^\"]+)"/)![1].split(' ').map(Number);
  const axis=html.split('class="task-progress-chart-date-axis"')[1];
  for(const label of layout.labels){
   assert.equal(label.anchor,'middle');assert.equal(label.labelX,label.x);
   assert.ok(label.left>=viewBox[0]&&label.right<=viewBox[0]+viewBox[2]);
   const group=axis.split(`data-date="${label.date}"`)[1].split('</g>')[0];
   assert.ok([...group.matchAll(/<text[^>]*>/g)].every(([tag])=>tag.includes(`x="${label.x}"`)&&tag.includes('text-anchor="middle"')));
   for(const width of [192,320,720]){
    assert.ok((label.left-viewBox[0])*width/viewBox[2]>=0);
    assert.ok((label.right-viewBox[0])*width/viewBox[2]<=width);
   }
  }
  const finish=layout.labels.find(l=>l.date===display.finishOn)!;
  assert.equal(finish.x,chart.finishX);
  assert.ok(html.includes(`class="task-progress-chart-${completedAt?'completed-date':'forecast-date'}" x1="${finish.x}" x2="${finish.x}"`));
  assert.ok(html.includes(`class="task-progress-chart-finish-node" x1="${finish.x}" x2="${finish.x}"`));
 }
});
test('detailed burnup fills available document width without a fixed small cap',()=>{
 const css=postcss.parse(readFileSync(new URL('../src/styles/task-detail-split.css',import.meta.url),'utf8'));
 const rule=css.nodes.find(n=>n.type==='rule'&&n.selector==='.task-detail-split .task-progress-history > .task-burnup-visual')!;
 const decls=Object.fromEntries((rule as postcss.Rule).nodes.filter(n=>n.type==='decl').map(n=>[(n as postcss.Declaration).prop,(n as postcss.Declaration).value]));
 assert.equal(decls.width,'100%');assert.equal(decls['max-width'],'none');assert.equal(decls['min-width'],'0');
});
