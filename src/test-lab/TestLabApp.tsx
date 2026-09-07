import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Beaker, BookOpen, ChevronRight, Copy, Download, FileCheck2, FolderClosed, Plus, RefreshCw, Settings2, UsersRound } from "lucide-react";
import { createLabClient, LabApiError } from "./client";
import { CaseEditorFields, Field, TeamEditorFields, MemberResponsibilityFields, TaskCreateFields } from "./editors";
import { copyCase, copyTeam, displayIndustry, downloadJson, isActiveRun, newCase, newTask, newTeam, runLabels, uid } from "./model";
import { CaseDetails, ConfigDetails, Empty, RunDetails, TeamDetails } from "./views";
import { maxActiveTeamLimit, type LabBootstrap, type LabCase, type LabRun, type LabState, type LabTask, type LabTeam, type LabView } from "./types";

type Page = "teams" | "cases" | "runs" | "settings";
type Editor = { type: "team"; value: LabTeam; revision: number } | { type: "responsibility"; value: LabTeam; memberId: string; revision: number } | { type: "task"; teamId:string; value:LabTask; revision:number } | { type: "case"; value: LabCase; revision: number } | { type: "import"; revision: number };
type Confirmation = { title: string; description: string; action: () => Promise<void>; label: string };
const pageNames = { teams: "团队沙箱", cases: "用例库", runs: "运行报告", settings: "API 设置" };
const pageDescriptions = { teams: "按团队管理成员责任、任务及任务下的文件和讨论，模拟不同人员视角。", cases: "每个用例归属一个团队，并以该团队成员的视角重复运行。", runs: "保留每次真实调用的首次输出、断言结果与人工核对。", settings: "检查服务端连接配置与运行边界。" };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "操作失败，请重试。";
const replaceById = <T extends { id: string }>(items: T[], item: T) => items.some((old) => old.id === item.id) ? items.map((old) => old.id === item.id ? item : old) : [...items, item];

export function TestLabApp({ initial }: { initial?: LabBootstrap }) {
  const [bootstrap, setBootstrap] = useState<LabBootstrap | null>(initial || null);
  const [page, setPage] = useState<Page>("teams");
  const [selectedTeamId, setSelectedTeamId] = useState(initial?.state.teams[0]?.id || "");
  const [selectedCaseId, setSelectedCaseId] = useState(initial?.state.cases[0]?.id || "");
  const [selectedRunId, setSelectedRunId] = useState(initial?.state.runs[0]?.id || "");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [category, setCategory] = useState("");
  const [caseTeamId,setCaseTeamId]=useState("");
  const [runStatus, setRunStatus] = useState("");
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [actorId, setActorId] = useState("");
  const [view, setView] = useState<LabView | null>(null);
  const [viewError, setViewError] = useState("");
  const [viewLoading, setViewLoading] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!initial);
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const previousEditor = useRef<Editor | null>(null);
  const client = useMemo(() => createLabClient(bootstrap?.csrfToken), [bootstrap?.csrfToken]);
  const state = bootstrap?.state;

  async function refresh() {
    setLoading(true); setError("");
    try { const fresh = await client.bootstrap(); setBootstrap(fresh); setSelectedTeamId((id) => id || fresh.state.teams[0]?.id || ""); setSelectedCaseId((id) => id || fresh.state.cases[0]?.id || ""); setSelectedRunId((id) => id || fresh.state.runs[0]?.id || ""); }
    catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (!initial) void refresh(); }, []);
  useEffect(() => {
    if (previousEditor.current && !editor) void refresh();
    previousEditor.current = editor;
  }, [editor]);

  const activeRunIds = state?.runs.filter((run) => isActiveRun(run.status)).map((run) => run.id).join(",") || "";
  useEffect(() => {
    if (!activeRunIds) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const fresh = await client.bootstrap();
        if (!stopped) setBootstrap((current) => {
          if (!current) return fresh;
          if (fresh.state.revision < current.state.revision) return current;
          return editorRef.current ? { ...current, config: fresh.config, csrfToken: fresh.csrfToken, state: { ...current.state, runs: fresh.state.runs } } : fresh;
        });
      } catch (err) { if (!stopped) setError(`运行状态刷新失败：${errorMessage(err)}。稍后会重试。`); }
      if (!stopped) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 2000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [activeRunIds, client]);

  const selectedTeam = state?.teams.find((item) => item.id === selectedTeamId);
  useEffect(() => {
    if (!actorId || !selectedTeam || page !== "teams") { setView(null); setViewLoading(false); setViewError(""); return; }
    let stopped = false;
    setView(null); setViewError(""); setViewLoading(true);
    client.view(selectedTeam.id, actorId).then((result) => { if (!stopped) setView(result); }).catch((err: unknown) => { if (!stopped) setViewError(errorMessage(err)); }).finally(() => { if (!stopped) setViewLoading(false); });
    return () => { stopped = true; };
  }, [actorId, selectedTeam, client, page]);

  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  function applyState(next: LabState) { setBootstrap((current) => current ? { ...current, state: next } : current); }
  async function saveEntity(edit: Editor, value: LabTeam | LabTask | LabCase | { teams: LabTeam[]; cases: LabCase[] }) {
    if (!state) return;
    let teams = state.teams; let cases = state.cases;
    if (edit.type === "team" || edit.type === "responsibility") teams = replaceById(teams, value as LabTeam);
    if(edit.type==="task"){
      const team=teams.find((item)=>item.id===edit.teamId);if(!team)throw new Error("所属团队不存在，请刷新后重试。");
      const task=value as LabTask;if(!task.createdById)throw new Error("请选择创建任务的团队成员。");
      teams=replaceById(teams,{...team,tasks:[...team.tasks,task]});
    }
    if (edit.type === "case") cases = replaceById(cases, { ...(value as LabCase), version: (value as LabCase).version + 1 });
    if (edit.type === "import") {
      const imported = value as { teams: LabTeam[]; cases: LabCase[] };
      teams = imported.teams.reduce((all, team) => replaceById(all, team), teams);
      cases = imported.cases.reduce((all, item) => replaceById(all, item), cases);
    }
    const next = await client.saveState({ expectedRevision: edit.revision, teams, cases });
    applyState(next); setEditor(null); setNotice(edit.type === "responsibility" ? "成员责任已保存，后续测试使用新责任，历史报告保持不变。" : edit.type==="task"?"任务已创建在所选团队中，可继续补充任务文件和讨论。":"已保存到隔离测试存储。");
    if (edit.type === "team") { setSelectedTeamId((value as LabTeam).id); setActorId(""); }
    if(edit.type==="task"){setSelectedTeamId(edit.teamId);setActorId("");}
    if (edit.type === "case") setSelectedCaseId((value as LabCase).id);
  }
  function archiveTeam(team: LabTeam) {
    setConfirmation({ title: team.archived ? "恢复团队" : "归档团队", description: `「${team.name}」${team.archived ? "将重新出现在活动团队列表。" : "将从活动列表隐藏，数据和历史报告仍然保留。"}`, label: team.archived ? "恢复团队" : "归档团队", action: async () => {
      if (!state) return; applyState(await client.saveState({ expectedRevision: state.revision, teams: replaceById(state.teams, { ...team, archived: !team.archived }), cases: state.cases })); setNotice("团队状态已更新。");
    } });
  }
  function archiveCase(item: LabCase) {
    setConfirmation({ title: item.archived ? "恢复用例" : "归档用例", description: `「${item.name}」${item.archived ? "将恢复至活动用例列表。" : "将不再参与运行，历史结果仍然保留。"}`, label: item.archived ? "恢复用例" : "归档用例", action: async () => {
      if (!state) return; applyState(await client.saveState({ expectedRevision: state.revision, teams: state.teams, cases: replaceById(state.cases, { ...item, archived: !item.archived, version: item.version + 1 }) })); setNotice("用例状态已更新。");
    } });
  }
  function requestRun(caseIds: string[]) {
    const ids = [...new Set(caseIds)];
    if (!ids.length) { setError("请先选择至少一个可运行用例。"); return; }
    if (!bootstrap?.config.configured) { setError("PPIO 尚未在服务端配置，请先查看 API 设置。"); return; }
    if (ids.length > bootstrap.config.maxBatchSize) { setError(`单批最多运行 ${bootstrap.config.maxBatchSize} 个用例，请缩小选择范围。`); return; }
    if ((state?.cases.filter((item) => ids.includes(item.id)).reduce((total, item) => total + item.steps.length, 0) || 0) > 20) { setError("单批最多执行 20 个步骤，请减少所选用例。"); return; }
    const requestId = uid();
    setConfirmation({ title: `运行 ${ids.length} 个用例`, description: "将使用保存后的用例与隔离团队快照发起真实 PPIO 请求，可能产生费用。运行期间的事件不会写回原团队。", label: "确认运行", action: async () => {
      const runs = await client.run(ids, requestId);
      setBootstrap((current) => current ? { ...current, state: { ...current.state, runs: [...runs, ...current.state.runs.filter((old) => !runs.some((run) => run.id === old.id))] } } : current);
      setSelectedRunId(runs[0]?.id || ""); navigate("runs"); setNotice(`已提交 ${runs.length} 个用例。`);
      try { const fresh = await client.bootstrap(); setBootstrap(fresh); } catch { setError("运行已提交，但最新状态读取失败；请刷新，勿重复提交。"); }
    } });
  }
  async function updateRun(run: LabRun) {
    setBootstrap((current) => current ? { ...current, state: { ...current.state, runs: replaceById(current.state.runs, run) } } : current);
    try { const fresh = await client.bootstrap(); setBootstrap(fresh); } catch { setError("操作已完成，但最新数据读取失败；请刷新后再编辑。"); }
  }
  function navigate(next: Page) { setPage(next); setSearch(""); setNotice(""); }
  const matching = (text: string) => text.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  const activeTeamCount=state?.teams.filter((team)=>!team.archived).length||0;
  const teams = state?.teams.filter((team) => (showArchived || !team.archived) && matching(`${team.name} ${team.industry} ${displayIndustry(team.industry)}`)) || [];
  const cases = state?.cases.filter((item) => {const team=state.teams.find((candidate)=>candidate.id===item.teamId);return (showArchived||(!item.archived&&!team?.archived))&&(!category||item.category===category)&&(!caseTeamId||item.teamId===caseTeamId)&&matching(`${item.name} ${item.description}`);}) || [];
  const runnable = cases.filter((item) => item.enabled && !item.archived && !state?.teams.find((team) => team.id === item.teamId)?.archived);
  const runs = state?.runs.filter((run) => (!runStatus || run.status === runStatus) && matching(`${run.caseName} ${run.model}`)) || [];
  const selectedCase = state?.cases.find((item) => item.id === selectedCaseId);
  const selectedRun = state?.runs.find((run) => run.id === selectedRunId);

  return <div className="lab-app">
    <aside className="lab-sidebar"><a className="lab-brand" href="/test-lab.html"><span className="lab-brand-symbol">a</span><span>AgentDoor<small>测试工作台</small></span></a><span className="lab-environment"><span /> 隔离测试环境</span>
      <nav aria-label="测试工作台导航">{([{ id: "teams", icon: UsersRound }, { id: "cases", icon: BookOpen }, { id: "runs", icon: FileCheck2 }, { id: "settings", icon: Settings2 }] as const).map(({ id, icon: Icon }) => <button key={id} className={page === id ? "is-active" : ""} aria-label={pageNames[id]} title={pageNames[id]} aria-current={page === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={17} /><span>{pageNames[id]}</span>{state && id !== "settings" && <small>{id==="teams"?activeTeamCount:state[id].length}</small>}</button>)}</nav>
      <div className="lab-sidebar-footer"><Beaker size={17} /><p>真实 API · 独立数据<br /><small>不会写入业务工作区</small></p><a href="/">返回 AgentDoor <ChevronRight size={13} /></a></div>
    </aside>
    <main className="lab-main"><header className="lab-page-heading"><div><p className="lab-breadcrumb">测试工作台 <ChevronRight size={13} /> {pageNames[page]}</p><h1>{pageNames[page]}</h1><p>{pageDescriptions[page]}</p></div><button title="刷新服务端数据" className="lab-icon-button" disabled={loading || busy} onClick={() => void refresh()}><RefreshCw size={16} className={loading ? "lab-spinning" : ""} /><span>刷新</span></button></header>
      {error && <div role="alert" className="lab-alert lab-alert-error">{error}<button aria-label="关闭错误提示" onClick={() => setError("")}>×</button></div>}
      {notice && <div role="status" className="lab-alert lab-alert-success">{notice}</div>}
      {!bootstrap && (loading ? <Empty title="正在加载测试工作台">从独立测试服务读取团队、用例与报告…</Empty> : <Empty title="工作台暂时不可用">请确认测试服务已启动，然后点击刷新重试。</Empty>)}
      {bootstrap && state && <>
        {page === "settings" ? <ConfigDetails config={bootstrap.config} /> : <>
          <div className="lab-toolbar"><label className="lab-search"><span className="lab-sr-only">搜索{pageNames[page]}</span><input type="search" placeholder={`搜索${page === "teams" ? "团队或行业" : page === "cases" ? "用例名称或描述" : "用例名称或模型"}`} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            {page==="teams"&&<span className={`lab-team-limit ${activeTeamCount>=maxActiveTeamLimit?"is-full":""}`}>活跃团队 {activeTeamCount} / {maxActiveTeamLimit}</span>}
            {page !== "runs" && <label className="lab-check"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />显示归档</label>}
            {page === "cases" && <><select aria-label="用例团队筛选" value={caseTeamId} onChange={(event)=>setCaseTeamId(event.target.value)}><option value="">全部团队</option>{state.teams.map((team)=><option key={team.id} value={team.id}>{team.name}</option>)}</select><select aria-label="用例分类筛选" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">全部分类</option>{[...new Set(state.cases.map((item) => item.category))].map((item) => <option key={item}>{item}</option>)}</select></>}
            {page === "runs" && <select aria-label="运行状态筛选" value={runStatus} onChange={(event) => setRunStatus(event.target.value)}><option value="">全部状态</option>{Object.entries(runLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}
            <div className="lab-toolbar-actions">
              {page !== "runs" && <><button onClick={() => downloadJson(`agentdoor-${page}.json`, page === "teams" ? { teams: state.teams, cases: [] } : { teams: state.teams.filter((team) => state.cases.some((item) => item.teamId === team.id)), cases: state.cases })}><Download size={14} />导出</button><button onClick={() => setEditor({ type: "import", revision: state.revision })}>导入 JSON</button></>}
              {page === "teams" && <button className="lab-primary" disabled={activeTeamCount>=maxActiveTeamLimit} title={activeTeamCount>=maxActiveTeamLimit?`新增团队上限为 ${maxActiveTeamLimit} 个活跃团队`:"新增团队"} onClick={() => setEditor({ type: "team", value: newTeam(), revision: state.revision })}><Plus size={15} />新增团队</button>}
              {page === "cases" && <><button disabled={busy} onClick={() => setConfirmation({ title: "导入内置用例", description: "读取项目内置测试用例并加入独立用例库，不会运行模型或修改业务数据。重复导入由服务器去重。", label: "导入用例", action: async () => { const result = await client.importLibrary(); applyState(result.state); setNotice(`已导入 ${result.imported} 个用例。`); } })}>导入内置库</button><button className="lab-primary" onClick={() => setEditor({ type: "case", value: newCase(state.teams.find((team) => !team.archived)), revision: state.revision })}><Plus size={15} />新增用例</button></>}
            </div>
          </div>
          {page === "cases" && <div className="lab-batch-bar"><label className="lab-check"><input type="checkbox" checked={runnable.length > 0 && runnable.every((item) => selectedCases.includes(item.id))} onChange={(event) => setSelectedCases(event.target.checked ? [...new Set([...selectedCases, ...runnable.map((item) => item.id)])] : selectedCases.filter((id) => !runnable.some((item) => item.id === id)))} />全选筛选结果</label><span>已选 {selectedCases.length} · 单批最多 {bootstrap.config.maxBatchSize}</span><button disabled={!runnable.length} onClick={() => setSelectedCases(runnable.slice(0, bootstrap.config.maxBatchSize).map((item) => item.id))}>选择小批次</button>{selectedCases.length > 0 && <button onClick={() => setSelectedCases([])}>清空</button>}<button className="lab-primary" disabled={busy || !selectedCases.length} onClick={() => requestRun(selectedCases)}>运行所选</button></div>}
          <div className="lab-workspace"><section className="lab-list" aria-label={`${pageNames[page]}列表`}>
            <div className="lab-list-heading"><span>{page === "teams" ? "团队" : page === "cases" ? "用例" : "历史运行"}</span><small>{page === "teams" ? teams.length : page === "cases" ? cases.length : runs.length} 项</small></div>
            {page === "teams" && (teams.length ? teams.map((team) => <button className={`lab-list-row ${team.id === selectedTeamId ? "is-selected" : ""}`} key={team.id} onClick={() => { setSelectedTeamId(team.id); setActorId(""); }}><span className="lab-row-icon"><UsersRound size={18} /></span><span><strong>{team.name}</strong><small><span className="lab-industry-chip">{displayIndustry(team.industry)}</span>{team.members.length} 人 · {team.tasks.length} 个任务{team.archived && " · 已归档"}</small></span><ChevronRight size={14} /></button>) : <Empty title="暂无团队">新增团队，或导入团队 JSON。</Empty>)}
            {page === "cases" && (cases.length ? cases.map((item) => <div className={`lab-case-row ${item.id === selectedCaseId ? "is-selected" : ""}`} key={item.id}><input aria-label={`选择用例 ${item.name}`} type="checkbox" disabled={!runnable.some((candidate) => candidate.id === item.id)} checked={selectedCases.includes(item.id)} onChange={(event) => setSelectedCases(event.target.checked ? [...selectedCases, item.id] : selectedCases.filter((id) => id !== item.id))} /><button className="lab-list-row" onClick={() => setSelectedCaseId(item.id)}><span><strong>{item.name}</strong><small>{state.teams.find((team)=>team.id===item.teamId)?.name||"团队不存在"} · {item.category} · {item.steps.length} 步{!item.enabled && " · 已停用"}{item.archived && " · 已归档"}</small></span><ChevronRight size={14} /></button></div>) : <Empty title="暂无用例">为团队创建用例，或导入内置测试库。</Empty>)}
            {page === "runs" && (runs.length ? runs.map((run) => <button className={`lab-list-row ${run.id === selectedRunId ? "is-selected" : ""}`} key={run.id} onClick={() => setSelectedRunId(run.id)}><span><strong>{run.caseName}</strong><small>{new Date(run.createdAt).toLocaleString("zh-CN")}</small></span><span className={`lab-status status-${run.status}`}>{runLabels[run.status]}</span></button>) : <Empty title="暂无运行报告">在用例库中选择用例后运行。</Empty>)}
          </section>
          <section className="lab-detail" aria-label={`${pageNames[page]}详情`}>
            {page === "teams" && (selectedTeam ? <><div className="lab-detail-heading"><div><small>团队沙箱{selectedTeam.archived && " · 已归档"}</small><h2>{selectedTeam.name}</h2></div><div className="lab-actions"><button className="lab-primary" disabled={!selectedTeam.members.length||selectedTeam.archived} title={!selectedTeam.members.length?"请先添加团队成员":"在此团队创建任务"} onClick={()=>setEditor({type:"task",teamId:selectedTeam.id,value:newTask(actorId&&selectedTeam.members.some((member)=>member.id===actorId)?actorId:selectedTeam.members[0]?.id||null),revision:state.revision})}><Plus size={14}/>新增任务</button><button disabled={!selectedTeam.members.length||selectedTeam.archived} onClick={()=>setEditor({type:"case",value:newCase(selectedTeam),revision:state.revision})}>新增用例</button><button onClick={() => setEditor({ type: "team", value: structuredClone(selectedTeam), revision: state.revision })}>编辑团队</button><button title="复制团队" onClick={() => setEditor({ type: "team", value: copyTeam(selectedTeam), revision: state.revision })}><Copy size={14} />复制</button><button onClick={() => archiveTeam(selectedTeam)}><FolderClosed size={14} />{selectedTeam.archived ? "恢复" : "归档"}</button></div></div>
              <div className="lab-view-selector"><Field label="查看人员视角"><select value={actorId} onChange={(event) => setActorId(event.target.value)}><option value="">沙箱管理视角（全部测试数据）</option>{selectedTeam.members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role || "未设角色"}</option>)}</select></Field></div>
              {actorId ? viewLoading ? <Empty title="正在读取人员视角">由服务器过滤可见任务与任务资料…</Empty> : viewError ? <p role="alert" className="lab-alert lab-alert-error">人员视角不可用：{viewError}</p> : view && view.actorId === actorId && view.team.id === selectedTeam.id ? <><p className="lab-alert">模拟权限视角 · 服务器过滤了 {view.hiddenTaskCount} 个不可见任务。此模式只读，不代表真实登录用户。</p><TeamDetails team={view.team} /></> : null : <TeamDetails team={selectedTeam} cases={state.cases} onOpenCase={(caseId)=>{setSelectedCaseId(caseId);setCaseTeamId(selectedTeam.id);navigate("cases");}} onEditResponsibility={(memberId) => setEditor({ type: "responsibility", value: structuredClone(selectedTeam), memberId, revision: state.revision })} />}
            </> : <Empty title="选择一个团队">在左侧列表查看团队、任务和证据。</Empty>)}
            {page === "cases" && (selectedCase ? <><div className="lab-detail-heading"><div><small>{selectedCase.category}</small><h2>{selectedCase.name}</h2></div><div className="lab-actions"><button disabled={busy || !selectedCase.enabled || selectedCase.archived} className="lab-primary" onClick={() => requestRun([selectedCase.id])}>运行用例</button><button onClick={() => setEditor({ type: "case", value: structuredClone(selectedCase), revision: state.revision })}>编辑</button><button onClick={() => setEditor({ type: "case", value: copyCase(selectedCase), revision: state.revision })}>复制</button><button onClick={() => archiveCase(selectedCase)}>{selectedCase.archived ? "恢复" : "归档"}</button></div></div><CaseDetails item={selectedCase} team={state.teams.find((team) => team.id === selectedCase.teamId)} skills={bootstrap.skills} /></> : <Empty title="选择一个用例">查看步骤、自动断言与人工核对项。</Empty>)}
            {page === "runs" && (selectedRun ? <><div className="lab-detail-heading"><div><small>运行报告 · {selectedRun.id.slice(0, 8)}</small><h2>{selectedRun.caseName}</h2></div><div className="lab-actions"><button disabled={busy} onClick={() => requestRun([selectedRun.caseId])}>重跑同例</button>{isActiveRun(selectedRun.status) && <button disabled={busy} onClick={() => void perform(async () => { await updateRun(await client.cancel(selectedRun.id)); setNotice("已请求取消运行；上游计费可能已经发生。"); })}>取消运行</button>}<button onClick={() => downloadJson(`run-${selectedRun.id}.json`, selectedRun)}>导出报告</button></div></div><p className="lab-muted">重跑使用当前已保存用例，并创建新的请求与报告，不覆盖本次记录。</p><RunDetails key={selectedRun.id} run={selectedRun} busy={busy} onReview={(verdict, note) => perform(async () => { await updateRun(await client.review(selectedRun.id, verdict, note)); setNotice("人工核对结果已保存。"); })} /></> : <Empty title="选择一次运行">查看真实输入、首次输出和核对结果。</Empty>)}
          </section></div>
        </>}
        <footer className="lab-page-footer"><span>独立测试数据 · 修订 {state.revision}</span><span>{activeRunIds ? "活动运行自动刷新中" : "没有活动运行，轮询已暂停"}</span></footer>
      </>}
    </main>
    {editor && bootstrap && <EditorDialog key={editor.type === "import" ? "import" : editor.value.id} editor={editor} teams={bootstrap.state.teams} skills={bootstrap.skills} onClose={() => setEditor(null)} onSave={(value) => saveEntity(editor, value)} />}
    {confirmation && <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />}
  </div>;
}

function Modal({ title, children, onClose, className = "" }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (dialog && !dialog.open) dialog.showModal(); }, []);
  return <dialog ref={ref} className={`lab-dialog ${className}`} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}><header className="lab-dialog-heading"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="关闭对话框">×</button></header>{children}</dialog>;
}
function EditorDialog({ editor, teams, skills, onClose, onSave }: { editor: Editor; teams: LabTeam[]; skills: LabBootstrap["skills"]; onClose: () => void; onSave: (value: LabTeam | LabTask | LabCase | { teams: LabTeam[]; cases: LabCase[] }) => Promise<void> }) {
  const [team, setTeam] = useState(editor.type === "team" || editor.type === "responsibility" ? editor.value : null);
  const member = editor.type === "responsibility" ? team?.members.find((m) => m.id === editor.memberId) : null;
  const taskTeam=editor.type==="task"?teams.find((item)=>item.id===editor.teamId):null;
  const [task,setTask]=useState(editor.type==="task"?editor.value:null);
  const [item, setItem] = useState(editor.type === "case" ? editor.value : null);
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [dirty, setDirty] = useState(false);
  const close = () => { if (busy) return; if (dirty) setDiscard(true); else onClose(); };
  async function submit() {
    setError(""); setBusy(true);
    try {
      let value: LabTeam | LabTask | LabCase | { teams: LabTeam[]; cases: LabCase[] };
      if (team) value = team;
      else if(task)value=task;
      else if (item) value = item;
      else { const imported: unknown = JSON.parse(json); if (!imported || typeof imported !== "object" || Array.isArray(imported)) throw new Error("导入格式为 { teams: [...], cases: [...] }。"); const record = imported as Record<string, unknown>; if (!Array.isArray(record.teams) || !Array.isArray(record.cases)) throw new Error("teams 和 cases 均须为数组。团队或用例可使用空数组。"); if ([...record.teams, ...record.cases].some((entry) => !entry || typeof entry !== "object" || typeof entry.id !== "string")) throw new Error("每个团队和用例均需有效 id；数据尚未写入。"); value = { teams: record.teams as LabTeam[], cases: record.cases as LabCase[] }; }
      await onSave(value);
    } catch (err) { setError(err instanceof LabApiError && err.status === 409 ? `版本冲突：${err.message}。草稿仍保留，请先导出草稿，再关闭并刷新列表后重新导入或编辑。` : errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <Modal title={editor.type === "responsibility" ? "编辑成员责任" : editor.type === "team" ? "编辑团队沙箱" : editor.type==="task"?"创建测试任务":editor.type === "case" ? "编辑测试用例" : "导入团队与用例"} onClose={close}>
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }}><div className="lab-dialog-body">
      {error && <p role="alert" className="lab-alert lab-alert-error">{error}</p>}
      {team && editor.type === "team" && <TeamEditorFields value={team} onChange={(value) => { setTeam(value); setDirty(true); }} />}
      {team && member && <MemberResponsibilityFields member={member} onChange={(responsibilities) => { setTeam({ ...team, members: team.members.map((m) => m.id === member.id ? { ...m, responsibilities } : m) }); setDirty(true); }} />}
      {task&&taskTeam&&<TaskCreateFields team={taskTeam} value={task} onChange={(value)=>{setTask(value);setDirty(true);}}/>}
      {task&&!taskTeam&&<p role="alert" className="lab-alert lab-alert-error">所属团队不存在，请关闭后刷新。</p>}
      {item && <CaseEditorFields value={item} teams={teams} skills={skills} onChange={(value) => { setItem(value); setDirty(true); }} />}
      {editor.type === "import" && <><p className="lab-alert">导入将按 ID 合并，同 ID 的团队或用例会被替换。不会导入运行报告；所有数据最终由服务器验证后保存。</p><Field label="选择 JSON 文件"><input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then((text) => { setJson(text); setDirty(true); }).catch(() => setError("无法读取文件。")); }} /></Field><Field label="团队与用例 JSON" hint={'格式：{ "teams": [], "cases": [] }；可以直接粘贴导出的文件内容。'}><textarea className="lab-code" rows={16} required value={json} onChange={(event) => { setJson(event.target.value); setDirty(true); }} /></Field></>}
      {discard && <div className="lab-alert lab-discard" role="alert"><span>草稿尚未保存，确定放弃本次编辑？</span><button type="button" onClick={() => setDiscard(false)}>继续编辑</button><button type="button" className="lab-danger-link" onClick={onClose}>放弃草稿</button></div>}
    </div><footer className="lab-dialog-footer"><span>只写入测试环境</span><button type="button" disabled={busy} onClick={() => { try { downloadJson("test-lab-draft.json", team ? { teams: [team], cases: [] } : task?{teamId:taskTeam?.id||null,task}:item ? { teams: [], cases: [item] } : JSON.parse(json)); } catch { setError("请先修正 JSON 格式，再导出草稿。"); } }}>导出草稿</button><button type="button" disabled={busy} onClick={close}>取消</button><button className="lab-primary" disabled={busy||Boolean(task&&!taskTeam)} type="submit">{busy ? "保存中…" : editor.type === "import" ? "验证并导入" : editor.type==="task"?"创建任务":"保存"}</button></footer></form>
  </Modal>;
}
function ConfirmDialog({ confirmation, onClose }: { confirmation: Confirmation; onClose: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <Modal title={confirmation.title} onClose={() => { if (!busy) onClose(); }} className="lab-confirm"><div className="lab-dialog-body"><p>{confirmation.description}</p>{error && <p role="alert" className="lab-alert lab-alert-error">{error}</p>}</div><footer className="lab-dialog-footer"><button disabled={busy} onClick={onClose}>取消</button><button className="lab-primary" disabled={busy} onClick={() => { setBusy(true); setError(""); void confirmation.action().then(onClose).catch((err: unknown) => setError(errorMessage(err))).finally(() => setBusy(false)); }}>{busy ? "处理中…" : confirmation.label}</button></footer></Modal>;
}
