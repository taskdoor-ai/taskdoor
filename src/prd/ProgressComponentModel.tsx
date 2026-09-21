import React, { useState } from "react";
import cases from "../../docs/product-v2/progress-scenarios.json";
import { ProgressComponentGuide } from "./ProgressComponentGuide";
import { ProgressComponentSample } from "./ProgressComponentSample";

export function ProgressComponentModel() {
  const [selected, setSelected] = useState("P03");
  const scenario = cases.find(item => item.id === selected)!;
  return <section className="prd-component-model" aria-label="组件位置与说明对照模型">
    <header className="prd-model-toolbar">
      <div><strong>任务进度组件</strong><p>左侧点选位置，右侧查看说明。</p></div>
      <label>示例场景<select aria-label="切换模型场景" value={selected} onChange={event => setSelected(event.target.value)}>{cases.map(item => <option value={item.id} key={item.id}>{item.id} {item.title}</option>)}</select></label>
    </header>
    <ProgressComponentGuide scenarioId={scenario.id}>
      <ProgressComponentSample key={scenario.id} scenario={scenario} onSimulate={setSelected}/>
    </ProgressComponentGuide>
  </section>;
}
