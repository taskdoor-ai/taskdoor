import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";

test('成员列表提供单独编辑入口，历史快照保持只读', async () => {
  const { TeamDetails } = await import('../src/test-lab/views.tsx');
  const { seedLab } = await import('./test-lab/seeds.ts');
  const team = seedLab().teams[0];
  const editable = renderToStaticMarkup(createElement(TeamDetails, { team, onEditResponsibility: () => {} }));
  assert.match(editable, /编辑林洁的责任/);
  assert.equal((editable.match(/>编辑责任<\/button>/g) || []).length, team.members.length);
  const readonly = renderToStaticMarkup(createElement(TeamDetails, { team }));
  assert.doesNotMatch(readonly, /编辑责任/);
});

test('单成员责任表单不混入任务和其他成员字段', async () => {
  const { MemberResponsibilityFields } = await import('../src/test-lab/editors.tsx');
  assert.equal(typeof MemberResponsibilityFields,'function');
  const html = renderToStaticMarkup(createElement(MemberResponsibilityFields, { member: { id:'lin',name:'林洁',role:'内容策划',responsibilities:['脚本交付'],version:1 }, onChange: () => {} }));
  assert.match(html, /林洁/); assert.match(html, /脚本交付/); assert.match(html, /责任范围/);
  assert.doesNotMatch(html, /任务状态|证据作者|成员姓名/);
});

test("测试工作台写入使用独立 CSRF，冲突保留服务端错误", async () => {
  const { createLabClient, LabApiError } = await import("../src/test-lab/client.ts");
  let observed: RequestInit | undefined;
  const client = createLabClient("lab-token", async (_url, init) => {
    observed = init;
    return new Response(JSON.stringify({ error: "数据已更新" }), { status: 409 });
  });
  await assert.rejects(client.saveState({ expectedRevision: 7, teams: [], cases: [] }), (error: unknown) => error instanceof LabApiError && error.status === 409 && error.message === "数据已更新");
  assert.equal((observed?.headers as Record<string, string>)["x-test-lab-csrf"], "lab-token");
  assert.equal((observed?.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.equal(JSON.parse(String(observed?.body)).expectedRevision, 7);
});

test("人员视角由服务端计算，重跑请求使用调用方提供的新 requestId", async () => {
  const { createLabClient } = await import("../src/test-lab/client.ts");
  const calls: { url: string; init?: RequestInit }[] = [];
  const client = createLabClient("token", async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({}));
  });
  await client.view("team 1", "member/1");
  await client.run(["case-1"], "request-new");
  assert.match(calls[0].url, /teamId=team\+1&actorId=member%2F1/);
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { caseIds: ["case-1"], requestId: "request-new" });
});

test("复制团队为所有内部对象和关系分配独立标识", async () => {
  const { newTeam, newTask, copyTeam } = await import("../src/test-lab/model.ts");
  const team = newTeam();
  team.members = [{ id: "member-1", name: "林青", role: "负责人", responsibilities: ["验收"], version: 1 }];
  const parent = { ...newTask(), id: "parent", ownerId: "member-1", participantIds: ["member-1"] };
  team.tasks = [parent, { ...newTask(), id: "child", parentId: "parent", dependsOnTaskIds: ["parent"] }];
  team.evidence = [{ id: "e1", taskId: "parent", authorId: "member-1", kind: "确认", title: "验收确认", content: "已验收", createdAt: "", visibleToIds: ["member-1"], version: 1 }];
  const copy = copyTeam(team);
  assert.notEqual(copy.id, team.id);
  assert.notEqual(copy.members[0].id, "member-1");
  assert.equal(copy.tasks[0].ownerId, copy.members[0].id);
  assert.equal(copy.tasks[1].parentId, copy.tasks[0].id);
  assert.equal(copy.evidence[0].taskId, copy.tasks[0].id);
  assert.equal(copy.evidence[0].visibleToIds[0], copy.members[0].id);
  assert.equal(team.tasks[0].id, "parent");
});

test("工作台入口隔离，首屏展示真实状态且不提供密钥输入", async () => {
  const { TestLabApp } = await import("../src/test-lab/TestLabApp.tsx");
  const initial = { state: { version: 1 as const, revision: 0, teams: [], cases: [], runs: [] }, config: { configured: false, model: "test-model", endpoint: "https://api.example.test/v1", maxBatchSize: 4, maxOutputTokens: 1000, timeoutMs: 10000, storage: "isolated" }, csrfToken: "private-csrf", skills: [] };
  const html = renderToStaticMarkup(createElement(TestLabApp, { initial }));
  assert.match(html, /团队沙箱/);
  assert.match(html, /用例库/);
  assert.match(html, /运行报告/);
  assert.match(html, /模型与 API/);
  assert.match(html, /暂无团队/);
  assert.doesNotMatch(html, /private-csrf|type="password"/);
  const entry = readFileSync(new URL("../test-lab.html", import.meta.url), "utf8");
  assert.match(entry, /src\/test-lab\/main.tsx/);
  assert.doesNotMatch(entry, /src\/main.tsx/);
});

test("团队页突出活跃数量，并在十个团队时停用新增入口", async()=>{
  const {TestLabApp}=await import("../src/test-lab/TestLabApp.tsx");
  const {seedLab}=await import("./test-lab/seeds.ts");
  const state=seedLab(),source=state.teams[0];
  state.teams=Array.from({length:10},(_,index)=>({...structuredClone(source),id:`team-${index}`,name:`团队 ${index+1}`}));
  state.cases=[];
  const initial={state,config:{configured:false,model:"",endpoint:"",maxBatchSize:4,maxOutputTokens:1000,timeoutMs:10000,storage:"isolated"},csrfToken:"token",skills:[]};
  const html=renderToStaticMarkup(createElement(TestLabApp,{initial}));
  assert.match(html,/活跃团队 10 \/ 10/);
  assert.match(html,/新增团队上限为 10 个活跃团队/);
});

test("团队列表把线上协作行业代码显示为清晰的中文行业标签", async()=>{
  const {TestLabApp}=await import("../src/test-lab/TestLabApp.tsx");
  const {seedLab}=await import("./test-lab/seeds.ts");
  const state=seedLab();state.teams[0].industry="hiring_onboarding";state.cases=[];
  const initial={state,config:{configured:false,model:"",endpoint:"",maxBatchSize:4,maxOutputTokens:1000,timeoutMs:10000,storage:"isolated"},csrfToken:"token",skills:[]};
  const html=renderToStaticMarkup(createElement(TestLabApp,{initial}));
  for(const label of ["招聘与入职","法律服务","自媒体短视频"])assert.match(html,new RegExp(label));
  assert.doesNotMatch(html,/>hiring_onboarding</);
});

test("团队和用例使用字段表单，运行结果分开呈现输入输出及核对", async () => {
  const { TeamEditorFields, CaseEditorFields } = await import("../src/test-lab/editors.tsx");
  const { newTeam, newCase, newTask } = await import("../src/test-lab/model.ts");
  const team = newTeam(); team.tasks = [newTask()];
  const html = renderToStaticMarkup(createElement(TeamEditorFields, { value: team, onChange: () => {} }));
  for (const label of ["团队名称", "成员与责任", "完成标准", "执行建议", "前置任务", "预计工时", "可见范围", "创建人", "任务文件", "任务讨论"]) assert.match(html, new RegExp(label));
  const caseHtml = renderToStaticMarkup(createElement(CaseEditorFields, { value: newCase(team), teams: [team], skills: [], onChange: () => {} }));
  for (const label of ["用例名称", "执行步骤", "自动断言", "人工核对项", "高级事件 JSON"]) assert.match(caseHtml, new RegExp(label));
});

test("新增任务明确选择所属团队、创建人和负责人", async () => {
  const { TaskCreateFields } = await import("../src/test-lab/editors.tsx");
  const { newTask } = await import("../src/test-lab/model.ts");
  const { seedLab } = await import("./test-lab/seeds.ts");
  const team=seedLab().teams[0];
  const html=renderToStaticMarkup(createElement(TaskCreateFields,{team,value:newTask(team.members[0].id),onChange:()=>{}}));
  for(const label of ["所属团队","创建人","负责人","任务标题","完成标准","执行建议"])assert.match(html,new RegExp(label));
});

test("团队详情展示任务级文件讨论以及该团队的用例", async () => {
  const { TeamDetails } = await import("../src/test-lab/views.tsx");
  const { seedLab } = await import("./test-lab/seeds.ts");
  const state=seedLab();const team=state.teams[0];
  const html=renderToStaticMarkup(createElement(TeamDetails,{team,cases:state.cases}));
  for(const label of ["创建人","任务文件","任务讨论","该团队的测试用例",state.cases[0].name])assert.match(html,new RegExp(label));
});

test("复制多步骤用例保留顺序，并将自动断言指向新步骤", async () => {
  const { newCase, newStep, copyCase } = await import("../src/test-lab/model.ts");
  const source = newCase(); source.steps.push(newStep());
  source.assertions = [{ id: "assertion", stepId: source.steps[1].id, label: "有结果", path: "result", operator: "exists", expected: null }];
  const copied = copyCase(source);
  assert.notEqual(copied.id, source.id);
  assert.notEqual(copied.steps[1].id, source.steps[1].id);
  assert.equal(copied.assertions[0].stepId, copied.steps[1].id);
  assert.notEqual(copied.assertions[0].id, source.assertions[0].id);
});

test("历史用例明确提示只做资料迁移，旧模拟情节不伪装为已支持", async () => {
  const { CaseDetails } = await import("../src/test-lab/views.tsx");
  const { newCase } = await import("../src/test-lab/model.ts");
  const html = renderToStaticMarkup(createElement(CaseDetails, { item: { ...newCase(), legacyInput: { text: "旧数据" }, legacyExpected: { result: true }, enabled: false }, skills: [] }));
  assert.match(html, /不会自动发送给模型/);
  assert.match(html, /旧版模拟提交与 ACL 情节尚未实现/);
  assert.match(html, /原始用例输入（只读）/);
  assert.match(html, /原始期望（只读）/);
});

test("报告分别展示实际输入、首次输出、断言、人工复核与前后沙箱", async () => {
  const { RunDetails } = await import("../src/test-lab/views.tsx");
  const { newCase, newTeam } = await import("../src/test-lab/model.ts");
  const team = newTeam(); const item = newCase(team);
  const run: import("../src/test-lab/types.ts").LabRun = {
    id: "run", batchId: "batch", requestId: "request", caseId: item.id, caseName: item.name, actorId: "actor", teamId: team.id,
    status: "needs_review", createdAt: "2026-09-03T00:00:00Z", startedAt: null, finishedAt: null, model: "test-model", endpoint: "test-endpoint", caseSnapshot: item, teamSnapshot: team, review: null, error: null,
    steps: [{ stepId: item.steps[0].id, skillId: item.steps[0].skillId, input: { prompt: "实际发送" }, output: { result: "通过" }, rawOutput: '<script>alert("never execute")</script>', error: null, assertions: [{ id: "a", label: "输出存在", status: "passed", actual: true, expected: true, message: "符合" }], structure: "passed", structureErrors: [], durationMs: 1100, usage: { inputTokens: null, outputTokens: null, totalTokens: null }, skillHash: "hash", promptHash: "hash", before: team, after: team }],
  };
  const html = renderToStaticMarkup(createElement(RunDetails, { run, onReview: async () => {}, busy: false }));
  for (const label of ["实际输入", "首次输出（原始返回）", "自动断言", "人工核对", "前后沙箱对照", "未知"]) assert.ok(html.includes(label));
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("仅活动运行轮询，编辑期间保留草稿及版本冲突反馈", () => {
  const source = readFileSync(new URL("../src/test-lab/TestLabApp.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!activeRunIds\) return/);
  assert.match(source, /editorRef\.current \?/);
  assert.match(source, /expectedRevision: edit\.revision/);
  assert.match(source, /草稿仍保留/);
  assert.match(source, /导出草稿/);
  assert.doesNotMatch(source, /window\.(prompt|confirm)|localStorage/);
  assert.match(source, /const requestId = uid\(\);/);
  assert.match(source, /client\.run\(runSetup\.ids,runSetup\.requestId,selection\)/);
});
