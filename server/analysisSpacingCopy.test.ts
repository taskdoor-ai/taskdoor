import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import { TaskProgressComparison } from "../src/components/TaskProgressComparison.tsx";
import { taskProgressComparisonExamples } from "../src/data/taskProgressComparisonExamples.ts";
(globalThis as typeof globalThis & {React:typeof React}).React=React;

test("AI分析标题到进度只保留紧凑的正常流间距，不叠加上下留白",()=>{
  const css=postcss.parse(readFileSync(new URL("../src/styles/task-detail-split.css",import.meta.url),"utf8"));
  const style:Record<string,string>={};
  css.walkRules(rule=>{if(rule.selector===".task-detail-split .task-detail-progress-section")rule.walkDecls(decl=>{style[decl.prop]=decl.value;});});
  const margin=parseFloat(style["margin-top"]??"0"),padding=parseFloat(style["padding-top"]??"0");
  assert.ok(Number.isFinite(margin)&&Number.isFinite(padding));
  assert.ok(margin>=0&&padding>=0&&margin+padding<=12,`effective spacing: ${margin}+${padding}px`);
  assert.ok(!style.position||style.position==="static"||style.position==="relative");
  assert.ok(!style.transform||style.transform==="none");
});

test("有效预测与范围待更新时，进度下均不出现投入或历史保留辅助句",()=>{
  const series=structuredClone(taskProgressComparisonExamples.find(item=>item.id==="behind")!);
  for(const compact of [true,false])for(const scopeMinutes of [series.workload.at(-1)!.scopeMinutes,3000,4800,null]){
    const before=structuredClone(series);
    const html=renderToStaticMarkup(React.createElement(TaskProgressComparison,{compact,series,currentScopeMinutes:scopeMinutes,currentEstimateLabel:`预计投入 ${scopeMinutes===3000?"6.25":"其他"} 人天`}));
    const progress=html.split('class="task-completion-progress"')[1].split('class="task-burnup-visual"')[0];
    assert.doesNotMatch(progress,/预计投入|已估部分|历史总量保留|预测待更新|当前估算已变更|task-progress-asof/);
    assert.match(html,/task-progress-legend-scope/);assert.match(html,/task-progress-legend-actual/);
    if(scopeMinutes===series.workload.at(-1)!.scopeMinutes)assert.match(html,/task-progress-chart-forecast-date/);
    else {assert.match(html,/data-progress-state="unknown"/);assert.doesNotMatch(html,/class="task-progress-chart-forecast-date"/);}
    assert.deepEqual(series,before);
  }
});
