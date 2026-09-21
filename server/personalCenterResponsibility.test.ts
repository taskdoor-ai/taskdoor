import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { initialPersonalCenterState, loadPersonalCenterState } from "../src/data/memberProfiles";
import { applyResponsibilityProposal, rebaseResponsibilityUpdateProposal, splitResponsibilityContent } from "../src/lib/responsibilityProposals";

const componentSource = readFileSync(new URL("../src/components/PersonalCenterPage.tsx", import.meta.url), "utf8");
const dialogSource = readFileSync(new URL("../src/components/PersonalInfoDialog.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const buttonSource = readFileSync(new URL("../src/components/ui/button.tsx", import.meta.url), "utf8");
const selectComponentSource = readFileSync(new URL("../src/components/ui/select.tsx", import.meta.url), "utf8");
const stylesheetSource = readFileSync(new URL("../src/styles/personal-center.css", import.meta.url), "utf8");
const toastStylesheetSource = readFileSync(new URL("../src/styles/toast.css", import.meta.url), "utf8");

test("members table lets team admins edit one active member responsibility at a time", () => {
  assert.match(
    componentSource,
    /className="team-member-list-head"><span>用户<\/span><span>责任<\/span><span>角色<\/span>/,
  );
  assert.match(
    componentSource,
    /const responsibility = resolveTeamMemberResponsibility\(membership, member\);/,
  );
  assert.match(
    componentSource,
    /const \[editingMembershipId, setEditingMembershipId\] = useState<string \| null>\(null\)/,
  );
  assert.match(componentSource, /aria-label=\{`编辑\$\{member\?\.name \?\? membership\.email\}的责任`\}/);
  assert.match(componentSource, /<Pencil\b[^>]*aria-hidden="true"/);
  assert.match(componentSource, /className="team-member-responsibility-editor"[\s\S]*?>取消<\/Button>[\s\S]*?>保存<\/Button>/);
  assert.match(componentSource, /canManage && membership\.status === "active"/);
  assert.doesNotMatch(componentSource, /team-member-responsibility[^>]*contentEditable/);
});

test("responsibility column has readable desktop and narrow-screen layouts", () => {
  const narrowStyles = stylesheetSource.slice(
    stylesheetSource.indexOf("@media (max-width: 760px)"),
    stylesheetSource.indexOf("@media (max-width: 640px)"),
  );

  assert.match(
    stylesheetSource,
    /\.team-member-list-head, \.team-member-list li \{[^}]*grid-template-columns:\s*minmax\(220px, \.9fr\)\s+minmax\(240px, 1\.15fr\)\s+minmax\(150px, \.38fr\)/s,
  );
  assert.match(stylesheetSource, /\.team-member-responsibility \{[^}]*display:\s*flex[^}]*min-width:\s*0/s);
  assert.match(stylesheetSource, /\.team-member-responsibility-text \{[^}]*display:\s*-webkit-box[^}]*overflow:\s*hidden[^}]*-webkit-line-clamp:\s*2/s);
  assert.match(
    stylesheetSource,
    /@media \(max-width: 1120px\) \{[\s\S]*?\.team-member-list-head, \.team-member-list li \{[^}]*grid-template-columns:\s*minmax\(160px, \.9fr\)\s+minmax\(0, 1\.15fr\)\s+minmax\(120px, \.38fr\)/s,
  );
  assert.match(
    narrowStyles,
    /\.team-member-list-head \{\s*display:\s*none[^}]*}[\s\S]*?\.team-member-list li \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)[^}]*}[\s\S]*?\.team-member-responsibility \{[^}]*grid-column:\s*1\s*\/\s*-1/s,
  );
  assert.doesNotMatch(narrowStyles, /-webkit-line-clamp:\s*unset|overflow:\s*visible|display:\s*block/);
});

test("my responsibility follows personal information in the personal settings navigation", () => {
  const navSource = dialogSource.slice(dialogSource.indexOf("<nav>"), dialogSource.indexOf("</nav>") + "</nav>".length);
  const personalSettingsStart = navSource.indexOf("<span>个人设置</span>");
  const teamSettingsStart = navSource.indexOf("<span>团队设置</span>");
  const personalSettingsSource = navSource.slice(personalSettingsStart, teamSettingsStart);
  const teamSettingsSource = navSource.slice(teamSettingsStart);

  assert.ok(personalSettingsStart >= 0, "设置导航应保留个人设置分组");
  assert.ok(teamSettingsStart > personalSettingsStart, "团队设置应位于个人设置之后");
  assert.ok(
    personalSettingsSource.indexOf('changeModule("profile")') < personalSettingsSource.indexOf('changeModule("responsibility")'),
    "我的责任应紧随个人信息，归入个人设置",
  );
  assert.match(personalSettingsSource, />个人信息<\/span>[\s\S]*?>我的责任<\/span>/);
  assert.doesNotMatch(teamSettingsSource, /changeModule\("responsibility"\)|>我的责任<\/span>/);
});

test("responsibility view is a single wide document editor with team switching in its toolbar", () => {
  const panelSource = componentSource.slice(
    componentSource.indexOf("export function PersonalResponsibilityPanel"),
    componentSource.indexOf("function ResponsibilityStatementList"),
  );
  const dialogPanelCall = dialogSource.slice(
    dialogSource.indexOf('<PersonalResponsibilityPanel'),
    dialogSource.indexOf('/>', dialogSource.indexOf('<PersonalResponsibilityPanel')) + 2,
  );
  const workspaceRule = stylesheetSource.match(/\.personal-responsibility-workspace \{[^}]*}/s)?.[0] ?? "";
  const statementListRule = stylesheetSource.match(/\.responsibility-document-copy > ul \{[^}]*}/s)?.[0] ?? "";

  assert.doesNotMatch(componentSource, /function ResponsibilitySuggestions|responsibility-suggestions/);
  assert.doesNotMatch(panelSource, /<aside/);
  assert.match(panelSource, /onActiveTeamChange:\s*\(teamId:\s*string\)\s*=>\s*void/);
  assert.match(dialogPanelCall, /onActiveTeamChange=\{onActiveTeamChange\}/);
  assert.match(dialogPanelCall, /onRequestContextChange=\{requestResponsibilityAction\}/);
  assert.match(panelSource, /className="responsibility-toolbar"[\s\S]*?<TeamSelect\b/);
  assert.match(
    panelSource,
    /const changeTeam = \(teamId: string\)[\s\S]*?onRequestContextChange\(\(\) => \{[\s\S]*?resetResponsibilityDraft\(\)[\s\S]*?onActiveTeamChange\(teamId\)/,
  );
  assert.match(panelSource, /<TeamSelect\b[\s\S]*?onValueChange=\{\(value\) => changeTeam\(String\(value\)\)\}[\s\S]*?value=\{selectedTeam\.id\}/);
  assert.match(panelSource, /<SelectTrigger\b[^>]*aria-label=\{`切换责任所属团队，当前为\$\{selectedTeam\.name\}`\}/);
  assert.doesNotMatch(workspaceRule, /max-width:\s*var\(--ad-reading-max\)/);
  assert.doesNotMatch(workspaceRule, /grid-template-columns/);
  assert.doesNotMatch(statementListRule, /max-width:\s*var\(--ad-reading-max\)/);
});

test("team switch shows names without team logos", () => {
  const panelSource = componentSource.slice(
    componentSource.indexOf("export function PersonalResponsibilityPanel"),
    componentSource.indexOf("function ResponsibilityStatementList"),
  );
  const selectStart = panelSource.indexOf("<TeamSelect", panelSource.indexOf('className="responsibility-team-control"'));
  const selectEnd = panelSource.indexOf("</TeamSelect>", selectStart) + "</TeamSelect>".length;
  const selectSource = panelSource.slice(selectStart, selectEnd);

  assert.match(
    selectSource,
    /<SelectTrigger\b[^>]*className="responsibility-team-select"[^>]*>[\s\S]*?<SelectValue>\{selectedTeam\.name\}<\/SelectValue>[\s\S]*?<\/SelectTrigger>/,
    "触发器应保留完整团队名",
  );
  assert.doesNotMatch(selectSource, /<TeamLogo\b/, "团队切换器不应展示 Logo");
  assert.doesNotMatch(selectSource, /<SelectContent\b[^>]*alignItemWithTrigger=\{false\}/, "应保留 Base UI 默认的选中项与触发器对齐能力");
  assert.match(
    selectComponentSource,
    /data-slot="select-content"[\s\S]{0,700}?w-\(--anchor-width\)/,
    "Select 弹层应保持与触发器相同的锚点宽度",
  );
  assert.match(
    selectSource,
    /state\.teams\.map\([\s\S]*?<SelectItem\b[^>]*className="responsibility-team-option"[^>]*value=\{team\.id\}[^>]*>\{team\.name\}<\/SelectItem>/,
    "每个 SelectItem 应只显示完整团队名",
  );
  assert.match(selectComponentSource, /<SelectPrimitive\.ItemIndicator[\s\S]*?<CheckIcon\b/, "当前团队项应由 Base UI 显示勾选标记");
  assert.doesNotMatch(stylesheetSource, /\.responsibility-team-option \.team-logo-|\.responsibility-team-select > \.team-logo-sm/);
});

test("responsibility is edited as one large text document instead of separate rows", () => {
  const panelSource = componentSource.slice(
    componentSource.indexOf("export function PersonalResponsibilityPanel"),
    componentSource.indexOf("function ResponsibilityStatementList"),
  );
  const statementSource = componentSource.slice(
    componentSource.indexOf("function ResponsibilityStatementList"),
    componentSource.indexOf("function ResponsibilityUpdatePanel"),
  );

  assert.match(panelSource, /const \[responsibilityDraft, setResponsibilityDraft\] = useState\(selectedTeam\.responsibilityDocument\.content\)/);
  assert.match(panelSource, /const saveResponsibilityDocument = \(\)[\s\S]*?const content = responsibilityDraft\.trim\(\)[\s\S]*?responsibilityDocument: \{[\s\S]*?content,/);
  assert.match(
    statementSource,
    /<Textarea\b[\s\S]*?aria-label="责任说明"[\s\S]*?id="responsibility-document-editor"[\s\S]*?rows=\{8\}[\s\S]*?value=\{draft\}[\s\S]*?\/>/,
    "应以一个大文本框承载整份责任正文",
  );
  assert.match(statementSource, /className="responsibility-document-editor-actions"[\s\S]*?disabled=\{!dirty\}[\s\S]*?>取消<\/Button>[\s\S]*?disabled=\{!dirty\}[\s\S]*?>保存<\/Button>/);
  assert.match(statementSource, /<Textarea[\s\S]*?<div className="responsibility-document-editor-footer">[\s\S]*?最近由 \{document\.updatedBy\} 更新于 \{document\.updatedAt\}[\s\S]*?responsibility-document-editor-actions/);
  assert.doesNotMatch(panelSource, /<footer>本机原型，最近由/);
  assert.match(panelSource, /toast\.success\(message\)/, "责任保存使用全局操作提示");
  assert.match(toastStylesheetSource, /\.ad-toast-viewport \{[^}]*top:\s*max\(var\(--ad-space-6, 24px\)[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)/s, "操作结果 Toast 应统一显示在顶部居中");
  assert.doesNotMatch(stylesheetSource, /\.personal-center-toast/, "页面不再维护独立的浮动提示");
  assert.doesNotMatch(statementSource, /responsibility-statement-row|编辑责任：|添加一条责任|<Pencil\b/);
  assert.doesNotMatch(panelSource, /editingParagraphIndex|editingParagraphDraft|deleteParagraphIndex/);
});

test("an existing responsibility exposes its update through a visible AI suggestion disclosure", () => {
  const statementSource = componentSource.slice(componentSource.indexOf("function ResponsibilityStatementList"));
  const triggerStart = statementSource.lastIndexOf("<Button", statementSource.indexOf('className="responsibility-update-trigger"'));
  const triggerEnd = statementSource.indexOf("</Button>", triggerStart) + "</Button>".length;
  const triggerSource = statementSource.slice(triggerStart, triggerEnd);

  assert.match(statementSource, /const currentClaims = claims\.map\(\(claim\) => rebaseResponsibilityUpdateProposal\(document, claim\)\)/);
  assert.match(statementSource, /id="responsibility-ai-suggestions-trigger"/);
  assert.match(statementSource, /aria-label=\{suggestionsOpen \? "收起 AI 建议" : "查看 AI 建议"\}/);
  assert.match(statementSource, /aria-expanded=\{/);
  assert.match(statementSource, /aria-controls="responsibility-ai-suggestions"/);
  assert.match(statementSource, /id=\{`responsibility-update-panel-\$\{claim\.id}`\}/);
  assert.match(statementSource, /className="responsibility-update-panel"/);
  assert.match(statementSource, /suggestionsOpen && currentClaims\.length \? <ul[\s\S]*?<ResponsibilityUpdatePanel/);
  assert.match(statementSource, /claim\.description/);
  assert.match(statementSource, />查看依据</);
  assert.match(statementSource, /onClick=\{\(\) => onResolve\(claim, "accepted"\)\}[\s\S]{0,300}>更新<\/Button>/);
  assert.match(triggerSource, /size="sm"/);
  assert.match(triggerSource, /variant="inference"/);
  assert.match(triggerSource, /<Sparkles\b[^>]*aria-hidden="true"[^>]*\/>\s*(?:<span[^>]*>)?AI 建议(?:<\/span>)?\s*<\/Button>/);
  assert.doesNotMatch(triggerSource, /RefreshCw/);

  assert.match(
    buttonSource,
    /inference:\s*"[^"]*bg-\[var\(--ad-inference-soft\)\][^"]*!text-\[color:var\(--ad-inference\)\][^"]*"/,
    "AI 建议按钮应使用黄色 inference 语义 token",
  );
  assert.match(
    stylesheetSource,
    /\.responsibility-update-panel \{[^}]*border-left:\s*2px solid var\(--ad-inference\)[^}]*background:\s*color-mix\(in srgb, var\(--ad-inference-soft\)/s,
    "展开面板应延续黄色 inference 语义",
  );
});

test("every evidence item is a separate summary row with a view arrow action", () => {
  const evidenceSource = componentSource.slice(componentSource.indexOf("function ResponsibilityEvidenceList"));
  const evidenceRowRule = stylesheetSource.match(/\.responsibility-evidence-row \{[^}]*}/s)?.[0] ?? "";

  assert.match(appSource, /<PersonalCenterModal\b[^>]*onOpenEvidence=\{openTask\}/, "依据查看应复用真实任务打开能力");
  assert.match(dialogSource, /onOpenEvidence:\s*\(taskId:\s*string\)\s*=>\s*void/);
  assert.match(dialogSource, /<PersonalResponsibilityPanel\b[^>]*onOpenEvidence=\{onOpenEvidence\}/);
  assert.match(componentSource, /export function PersonalResponsibilityPanel[\s\S]{0,650}?onOpenEvidence:\s*\(taskId:\s*string\)\s*=>\s*void/);
  assert.match(evidenceSource, /claim\.evidence\.map\(\(evidence\) => <li className="responsibility-evidence-row"/);
  assert.match(evidenceSource, /<strong>\{evidence\.label\}<\/strong><small>\{evidence\.meta\}<\/small>/);
  assert.match(
    evidenceSource,
    /evidence\.taskId\s*\?\s*<Button\b(?=[^>]*onClick=\{\(\) => onOpenEvidence\(evidence\.taskId[^)]*\)\})[^>]*aria-label=\{`查看依据：\$\{evidence\.label\}`\}[\s\S]{0,320}?>查看[\s\S]{0,120}?<ArrowRight\b[^>]*aria-hidden="true"[\s\S]{0,120}?:\s*null/,
    "只有可定位到真实任务的依据才应显示“查看 →”按钮",
  );
  assert.match(evidenceRowRule, /grid-template-columns:\s*minmax\(0, 1fr\) auto|justify-content:\s*space-between/);
});

test("creator update evidence maps to real tasks before exposing view actions", () => {
  const team = initialPersonalCenterState.teams.find((item) => item.id === "creator-commerce");
  assert.ok(team);
  const updateClaim = team.observedClaims.find((claim) => claim.proposal?.operation === "update");
  assert.ok(updateClaim);
  assert.deepEqual(
    updateClaim.evidence?.map((evidence) => evidence.taskId),
    ["fragrance-creator-wrapup", "fragrance-growth"],
  );
});

test("responsibility evidence keeps the update time without the local synthetic task explanation", () => {
  const evidence = initialPersonalCenterState.teams.flatMap((team) => team.observedClaims.flatMap((claim) => claim.evidence ?? []));
  assert.equal(evidence.some((item) => item.meta.includes("本地合成任务")), false);
  assert.equal(evidence.find((item) => item.id === "factory-pvt-gate")?.meta, "今天");
});

test("loading saved responsibility evidence removes the legacy local synthetic task explanation", () => {
  const saved = JSON.parse(JSON.stringify(initialPersonalCenterState)) as typeof initialPersonalCenterState;
  const evidence = saved.teams
    .flatMap((team) => team.observedClaims)
    .flatMap((claim) => claim.evidence ?? [])
    .find((item) => item.id === "factory-pvt-gate");
  assert.ok(evidence);
  evidence.meta = "本地合成任务 · 今天";
  const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => key === "agentdoor-personal-center-v6" ? JSON.stringify(saved) : null,
    },
  });
  try {
    const loaded = loadPersonalCenterState();
    const loadedEvidence = loaded.teams
      .flatMap((team) => team.observedClaims)
      .flatMap((claim) => claim.evidence ?? [])
      .find((item) => item.id === "factory-pvt-gate");
    assert.equal(loadedEvidence?.meta, "今天");
  } finally {
    if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("a proposed addition is one compact row with evidence and a single plus confirmation", () => {
  const statementSource = componentSource.slice(componentSource.indexOf("function ResponsibilityStatementList"));
  const addRowSource = componentSource.slice(
    componentSource.indexOf("function ResponsibilityAddRow"),
    componentSource.indexOf("function ResponsibilityConflictRow"),
  );

  assert.match(statementSource, /className="responsibility-add-row"/);
  assert.match(statementSource, /className="responsibility-statement-marker is-proposed"/);
  assert.match(statementSource, /if \(proposal\?\.operation === "add"\) return <ResponsibilityAddRow[\s\S]*return <ResponsibilityConflictRow/);
  assert.match(statementSource, /id=\{`responsibility-proposal-\$\{claim\.id}-apply`\}/);
  assert.match(statementSource, /aria-label=\{`添加责任：\$\{claim\.description}`\}/);
  assert.match(statementSource, /<Plus[^>]*aria-hidden="true"/);
  assert.match(statementSource, /aria-label=\{`新增责任依据/);
  assert.equal(addRowSource.match(/<Plus\b/g)?.length, 1);
  assert.equal(addRowSource.match(/onResolve\(claim, "accepted"\)/g)?.length, 1);
  assert.doesNotMatch(addRowSource, /<Textarea|>添加<\/Button>|新增责任<\/label>/);
});

test("add and update proposals apply distinct document operations", () => {
  const team = initialPersonalCenterState.teams.find((item) => item.id === "creator-commerce");
  assert.ok(team);
  const updateClaim = team.observedClaims.find((claim) => claim.proposal?.operation === "update");
  const addClaim = team.observedClaims.find((claim) => claim.proposal?.operation === "add");
  assert.ok(updateClaim);
  assert.ok(addClaim);

  const updated = applyResponsibilityProposal(team.responsibilityDocument, updateClaim, "更新后的责任");
  assert.equal(updated.status, "applied");
  assert.deepEqual(splitResponsibilityContent(updated.content), ["更新后的责任"]);
  assert.equal("previousText" in updated ? updated.previousText : undefined, "达人带货目标、预算、跨角色协调与最终结果");

  const added = applyResponsibilityProposal(team.responsibilityDocument, addClaim, "新增的责任");
  assert.equal(added.status, "applied");
  assert.deepEqual(splitResponsibilityContent(added.content), ["达人带货目标、预算、跨角色协调与最终结果", "新增的责任"]);
});

test("one-click proposal actions are idempotent", () => {
  const team = initialPersonalCenterState.teams.find((item) => item.id === "creator-commerce");
  assert.ok(team);
  const updateClaim = team.observedClaims.find((claim) => claim.proposal?.operation === "update");
  const addClaim = team.observedClaims.find((claim) => claim.proposal?.operation === "add");
  assert.ok(updateClaim);
  assert.ok(addClaim);
  assert.equal(updateClaim.proposal?.operation, "update");
  const updateProposal = updateClaim.proposal;

  const unchangedUpdate = applyResponsibilityProposal(
    team.responsibilityDocument,
    updateClaim,
    updateProposal.target.expectedText,
  );
  assert.equal(unchangedUpdate.status, "duplicate");
  assert.equal(unchangedUpdate.content, team.responsibilityDocument.content);

  const duplicateAdd = applyResponsibilityProposal(
    team.responsibilityDocument,
    addClaim,
    team.responsibilityDocument.content,
  );
  assert.equal(duplicateAdd.status, "duplicate");
  assert.equal(duplicateAdd.content, team.responsibilityDocument.content);
});

test("an outdated update proposal cannot overwrite the responsibility document", () => {
  const team = initialPersonalCenterState.teams.find((item) => item.id === "creator-commerce");
  assert.ok(team);
  const updateClaim = team.observedClaims.find((claim) => claim.proposal?.operation === "update");
  assert.ok(updateClaim);
  const staleDocument = { ...team.responsibilityDocument, revisionId: "RESP-CREATOR-NEW" };
  const result = applyResponsibilityProposal(staleDocument, updateClaim, "不应写入");
  assert.equal(result.status, "conflict");
  assert.equal(result.content, team.responsibilityDocument.content);
});

test("an update proposal can safely rebase when its exact target is unchanged", () => {
  const team = initialPersonalCenterState.teams.find((item) => item.id === "creator-commerce");
  assert.ok(team);
  const updateClaim = team.observedClaims.find((claim) => claim.proposal?.operation === "update");
  assert.ok(updateClaim);
  const newerDocument = { ...team.responsibilityDocument, revisionId: "RESP-CREATOR-NEW" };
  const rebasedClaim = rebaseResponsibilityUpdateProposal(newerDocument, updateClaim);
  assert.equal(rebasedClaim.proposal?.operation === "update" ? rebasedClaim.proposal.baseRevisionId : undefined, newerDocument.revisionId);
  assert.equal(applyResponsibilityProposal(newerDocument, rebasedClaim, "安全更新后的责任").status, "applied");

  const changedDocument = { ...newerDocument, content: "原责任已经变化" };
  const unchangedClaim = rebaseResponsibilityUpdateProposal(changedDocument, updateClaim);
  assert.equal(applyResponsibilityProposal(changedDocument, unchangedClaim, "不应写入").status, "conflict");
});

test("legacy v5 claims keep their append semantics instead of being guessed as updates", () => {
  const legacy = JSON.parse(JSON.stringify(initialPersonalCenterState)) as typeof initialPersonalCenterState;
  const legacyClaim = legacy.teams[0].observedClaims[0];
  legacyClaim.description = "平台证据显示，你持续承担相关目标与预算确认。";
  delete legacyClaim.proposal;
  const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => key === "agentdoor-personal-center-v5" ? JSON.stringify(legacy) : null,
    },
  });
  try {
    const migrated = loadPersonalCenterState();
    const migratedClaim = migrated.teams[0].observedClaims.find((claim) => claim.id === legacyClaim.id);
    assert.equal(migratedClaim?.description, legacyClaim.description);
    assert.equal(migratedClaim?.proposal?.operation, "add");
  } finally {
    if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("malformed and multi-line proposals cannot silently change the document", () => {
  const team = initialPersonalCenterState.teams[0];
  const addClaim = team.observedClaims.find((claim) => claim.proposal?.operation === "add");
  assert.ok(addClaim);
  const malformedClaim = { ...addClaim, proposal: undefined };
  assert.equal(applyResponsibilityProposal(team.responsibilityDocument, malformedClaim, "不应添加").status, "invalid");
  assert.equal(applyResponsibilityProposal(team.responsibilityDocument, addClaim, "第一条\n第二条").status, "invalid");
});
