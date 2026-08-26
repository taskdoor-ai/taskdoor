import { App } from "@modelcontextprotocol/ext-apps";
import "./task-card.css";

type Source = { id: string; title: string; summary?: string };
type Draft = { draftId: string; status: "draft" | "created"; title: string; goal: string; owner: string; participants: string[]; startDate: string; dueDate: string; sources: Source[]; taskId?: string; createdAt?: string };
const root = document.querySelector<HTMLElement>("#app")!;
const app = new App({ name: "AgentDoor task approval", version: "1.0.0" });
const esc = (s: string) => s.replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]!);
const data = (r: { structuredContent?: unknown }) => (r.structuredContent as { task?: Draft } | undefined)?.task ?? null;
const svg = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const icons = { back:svg("m15 18-6-6 6-6M9 12h10"), bulb:svg("M9 18h6M10 22h4M8.5 14.5C7 13.4 6 11.6 6 9.5a6 6 0 1 1 12 0c0 2.1-1 3.9-2.5 5-.6.5-.9 1.2-.9 2H9.4c0-.8-.3-1.5-.9-2z"), edit:svg("m4 20 4.2-1 10.7-10.7-3.2-3.2L5 15.8zM14.8 6l3.2 3.2"), finger:svg("M12 11V6a2 2 0 0 1 4 0v5M8 12V8a2 2 0 0 1 4 0v3M16 12V9a2 2 0 0 1 4 0v5c0 5-3 8-7 8h-1c-3 0-5-1.5-7-4l-2-3a2 2 0 0 1 3-2l2 2v-3a2 2 0 0 1 4 0"), arrow:svg("M7 17 17 7M8 7h9v9"), check:svg("m5 12 4 4L19 6"), down:svg("m8 10 4 4 4-4") };
const shortDate = (v:string) => { const [,m,d]=v.split("-"); return `${Number(m)} 月 ${Number(d)} 日`; };
const avatar = (name:string,i=0) => `<span class="avatar a${i%4}" title="${esc(name)}">${esc(name.slice(-2))}</span>`;
const file = (s:Source) => { const ext=s.title.toLowerCase().endsWith(".pdf")?"PDF":s.title.toLowerCase().endsWith(".docx")?"DOCX":"FILE"; return `<span class="file-icon"><i></i><i></i><i></i><b>${ext}</b></span>`; };

function render(task: Draft) {
  const created=task.status==="created"; const participants=task.participants.filter(n=>n!==task.owner);
  root.innerHTML=`<main class="workspace">
    <header class="topbar"><button>${icons.back}<span>返回工作台</span></button><h1>${esc(task.title)}</h1></header>
    <section class="analysis"><span class="bulb">${icons.bulb}</span><strong>分析已完成</strong><b>5/5</b><span class="note">${task.sources.length} 个来源 · 可查看处理记录 ${icons.down}</span></section>
    <div class="layout"><div class="form">
      <section class="field"><h2>任务名称</h2><div class="editable"><strong contenteditable="true" data-field="title">${esc(task.title)}</strong><button>${icons.edit}</button></div></section>
      <section class="field"><h2>目标</h2><div class="editable goal"><strong contenteditable="true" data-field="goal">${esc(task.goal)}</strong><button>${icons.edit}</button></div></section>
      <section class="field info"><header><h2>信息</h2><span>已选择 ${task.sources.length}/${task.sources.length}</span></header><div class="files">
        <div class="file-head"><span></span><b>文件</b><b>同步摘要</b><b>共享方式</b><b>选择</b></div>
        ${task.sources.length?task.sources.map(s=>`<article>${file(s)}<span class="file-name"><small>企业文件</small><strong>${esc(s.title)}</strong></span><p>${esc(s.summary??"作为任务背景同步给协作者。")}</p><em>摘要与原文引用</em><span class="selected">${icons.check}</span></article>`).join(""):`<div class="empty">暂未关联信息来源</div>`}
      </div></section>
    </div><aside class="summary">
      <header><span class="finger">${icons.finger}</span><h2>${esc(task.title)}</h2></header><div class="divider"></div>
      <div class="people"><section><span>拥有者</span>${avatar(task.owner)}</section><section><span>参与者</span><div class="avatars">${participants.length?participants.map((n,i)=>avatar(n,i+1)).join(""):`<small>暂无参与者</small>`}</div></section></div>
      <div class="cycle"><span>周期</span><strong>${shortDate(task.startDate)}至 ${shortDate(task.dueDate)}</strong></div>
      ${created?`<div class="receipt"><span>${icons.check}</span><div><strong>任务已创建</strong><small>${esc(task.taskId??"")} · 已写入 AgentDoor</small></div></div>`:`<button class="confirm" id="confirm"><span>确认并创建任务</span>${icons.arrow}</button>`}
    </aside></div></main>`;
  document.querySelectorAll<HTMLElement>("[contenteditable]").forEach(el=>el.addEventListener("input",()=>{ const v=el.textContent?.trim(); if(!v)return; if(el.dataset.field==="title"){task.title=v;document.querySelector<HTMLElement>(".summary>header h2")!.textContent=v;document.querySelector<HTMLElement>(".topbar h1")!.textContent=v}else task.goal=v;}));
  document.querySelector<HTMLButtonElement>("#confirm")?.addEventListener("click",async e=>{const b=e.currentTarget as HTMLButtonElement;b.disabled=true;b.querySelector("span")!.textContent="正在创建任务…";try{const r=await app.callServerTool({name:"agentdoor_create_task",arguments:{draft_id:task.draftId,title:task.title,goal:task.goal}});const next=data(r);if(!next)throw new Error("创建响应缺少任务数据");render(next);await app.updateModelContext({content:[{type:"text",text:`用户已确认并创建任务 ${next.taskId}：${next.title}`}]});}catch(err){b.disabled=false;b.querySelector("span")!.textContent="重试创建任务";b.title=err instanceof Error?err.message:"创建失败";}});
}
app.ontoolresult=r=>{const task=data(r);if(task)render(task)}; app.connect();
