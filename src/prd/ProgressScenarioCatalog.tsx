import React, { useEffect, useState } from "react";
import cases from "../../docs/product-v2/progress-scenarios.json";

import { ProgressComponentSample } from "./ProgressComponentSample";

const groups = [...new Set(cases.map(item=>item.group))];



export function ProgressScenarioCatalog() {
  const [selected,setSelected]=useState(()=>{
    const id=new URLSearchParams(window.location.search).get("scenario");
    return cases.some(item=>item.id === id) ? id! : "P03";
  });
  const [query,setQuery]=useState("");
  const [event,setEvent]=useState("");
  useEffect(()=>{
    const reveal=(event:MessageEvent)=>{
      if (event.source !== window.parent || event.data?.type !== "prd-progress-scenario") return;
      const id=event.data.scenario;
      if (!cases.some(item=>item.id === id)) return;
      setSelected(id);setQuery("");setEvent("");
    };
    window.addEventListener("message",reveal);
    return ()=>window.removeEventListener("message",reveal);
  },[]);
  const scenario=cases.find(item=>item.id === selected)!;
  const filtered=cases.filter(item=>`${item.id} ${item.title} ${item.when} ${item.acceptance}`.toLowerCase().includes(query.trim().toLowerCase()));
  const select=(id:string)=>{setSelected(id);setEvent("");};
  const simulate=(id:string)=>{setSelected(id);setQuery("");setEvent("已切换演示状态；未发起真实计算或保存。");};
  return <section className="prd-progress-catalog" id="progress-scenarios" aria-labelledby="progress-catalog-title">
    <header className="prd-catalog-heading"><div><h1 id="progress-catalog-title">任务进度 · 场景样式库</h1><p>{cases.length} 个场景：触发条件、组件样式、文案与验收。</p></div></header>
    <p className="prd-catalog-boundary">固定数据演示完整进度组件，可展开子任务。加载与重试仅作样式演示。</p>
    <div className="prd-catalog-layout">
      <nav className="prd-catalog-index" aria-label="进度场景索引">
        <label htmlFor="progress-scenario-search">查找场景</label><input id="progress-scenario-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="例如：待预测、修改、失败" type="search"/>
        {groups.filter(group=>filtered.some(item=>item.group === group)).map(group=><section key={group}><h2>{group}</h2>{filtered.filter(item=>item.group === group).map(item=><button type="button" key={item.id} aria-pressed={item.id === selected} onClick={()=>select(item.id)}><span>{item.id}</span>{item.title}</button>)}</section>)}
        {filtered.length === 0 && <p>未找到场景，请换个关键词。</p>}
      </nav>
      <article className="prd-catalog-detail" aria-labelledby="progress-scenario-title">
        <header><span>{scenario.group} / {scenario.id}</span><h2 id="progress-scenario-title">{scenario.title}</h2><p><strong>触发条件：</strong>{scenario.when}</p></header>
        <dl className="prd-scenario-copy"><div><dt>工作量区域</dt><dd>{scenario.work}</dd></div><div><dt>完成时间区域</dt><dd>{scenario.time}</dd></div></dl>
        <p className="prd-model-entry"><a href="./agentdoor-prd.html#progress-component-model" target="_top">打开组件位置模型 ↗</a><span>左侧点选位置，右侧对照说明。</span></p>
        <div className="prd-state-samples"><ProgressComponentSample key={scenario.id} scenario={scenario} onSimulate={simulate}/></div>
        {(scenario.fixture === "loading" || scenario.fixture === "updating") && <div className="prd-simulation-controls"><span>PRD 演示返回结果</span><button type="button" onClick={()=>simulate("P01")}>演示成功</button><button type="button" onClick={()=>simulate(scenario.fixture === "updating" ? "P26" : "P25")}>演示失败</button></div>}
        <p className="prd-catalog-event" role="status">{event}</p>
        <dl className="prd-scenario-rules">{[["显示与隐藏",scenario.visible],["操作与入口",scenario.action],["恢复条件",scenario.recovery],["燃起图与历史",scenario.history],["验收标准",scenario.acceptance]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </article>
    </div>
  </section>;
}
