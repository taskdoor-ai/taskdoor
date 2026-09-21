import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { creatorCommerceMembers } from "../src/data/creatorCommerceScenario.ts";
import { initialPersonalCenterState, loadPersonalCenterState } from "../src/data/memberProfiles.ts";
import { taskDetailMocks } from "../src/data/taskDetailMocks.ts";
import { workspaceNodes, type TaskNode } from "../src/data/workspaceNodes.ts";
import { buildPersonalWorkbenchItems, buildPersonalWorkbenchModel } from "../src/lib/personalWorkbench.ts";

const sourcePath = (relativePath: string) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const readSource = (relativePath: string) => readFileSync(sourcePath(relativePath), "utf8");
const activeCopyFiles = [
  "src/App.tsx",
  "src/components/PersonalWorkbench.tsx",
  "src/components/GlobalNotifications.tsx",
  "src/components/WorkspaceList.tsx",
  "src/components/TaskCreationConversation.tsx",
  "src/data/taskDetailMocks.ts",
  "src/data/memberProfiles.ts",
] as const;
const legacyBusinessWords = /(零售|门店|退款|撤单|灰度|优惠券|发票|会员|开票|审计|对账)|(?:^|[^a-z])POS(?:[^a-z]|$)/i;
const functionBody = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `无法定位 ${start}`);
  return source.slice(startIndex, endIndex);
};

test("当前任务基准的主任务和八个子任务都有专属详情", () => {
  const tasks = workspaceNodes.filter((node): node is TaskNode => node.kind === "task" && node.id.startsWith("fragrance-"));

  assert.equal(tasks.length, 9);
  assert.deepEqual(Object.keys(taskDetailMocks).sort(), tasks.map((task) => task.id).sort());
  for (const task of tasks) {
    const detail = taskDetailMocks[task.id as keyof typeof taskDetailMocks];
    assert.ok(detail, `${task.id} 缺少详情`);
    assert.equal(detail.title, task.name);
    assert.equal(detail.owner, task.ownerId);
    assert.equal(detail.goal, task.goal);
    assert.ok(detail.files.length >= 3, `${task.id} 应有场景文件`);
    assert.ok(detail.activities.length >= 3, `${task.id} 应有协作动态`);
    for (const file of detail.files.filter((item) => item.kind === "file")) {
      const extension = file.name.split(".").pop()?.toUpperCase();
      assert.equal(file.format, extension, `${task.id} 的 ${file.name} 格式应由扩展名推断`);
    }
  }
});

test("任务列表包含一个无父子关系和依赖关系的独立任务", () => {
  const task = workspaceNodes.find((node) => node.kind === "task" && node.id === "weekly-retro-notes");

  assert.ok(task && task.kind === "task");
  assert.equal(task.parentTaskId, undefined);
  assert.deepEqual(task.dependsOnTaskIds, undefined);
});

test("任务列表与详情数据覆盖不同推进状态和协作密度", () => {
  const tasks = workspaceNodes.filter((node) => node.kind === "task");
  const statuses = new Set(tasks.map((task) => task.status));
  const fileCounts = new Set(Object.values(taskDetailMocks).map((detail) => detail.files.filter((item) => item.kind === "file").length));
  const commitCounts = new Set(Object.values(taskDetailMocks).map((detail) => detail.commits.length));

  assert.ok(statuses.size >= 5, "任务列表至少应覆盖五种代表性推进状态");
  assert.ok(fileCounts.size >= 3, "不同任务的详情文件数量不应完全相同");
  assert.ok(commitCounts.size >= 2, "不同任务的历史提交密度不应完全相同");
});

test("当前活跃页面与 Mock 详情不再出现旧零售业务文案", () => {
  for (const relativePath of activeCopyFiles) {
    const source = readSource(relativePath);
    assert.doesNotMatch(source, legacyBusinessWords, `${relativePath} 仍有旧业务词`);
  }
});

test("工作台、通知与任务入口覆盖达人带货的关键协作环节", () => {
  const visibleCopy = [
    readSource("src/components/PersonalWorkbench.tsx"),
    readSource("src/components/GlobalNotifications.tsx"),
    readSource("src/components/WorkspaceList.tsx"),
    readSource("src/components/TaskCreationConversation.tsx"),
  ].join("\n");

  for (const keyword of ["达人", "直播", "投流", "合规"]) assert.match(visibleCopy, new RegExp(keyword));
});

test("工作台从团队任务数据生成独立的追加投放决策行动，并按稳定任务 ID 导航", () => {
  const source = readSource("src/components/PersonalWorkbench.tsx");
  const tasks = workspaceNodes.filter((node): node is TaskNode => node.kind === "task");
  const work = buildPersonalWorkbenchItems(buildPersonalWorkbenchModel({
    tasks,
    currentUserId: "周岚",
    asOf: "2026-09-01T09:00:00+08:00",
  }));
  const decision = work.items.find((item) => item.taskId === "fragrance-final-decision");

  assert.equal(decision?.title, "确认追加投放目标与最终决策");
  assert.equal(decision?.role, "execution");
  assert.match(source, /onOpenTask\(item\.taskId\)/);
  assert.match(source, /\{item\.title\}/);
  assert.doesNotMatch(source, /确认追加投放目标与最终决策/);
  assert.doesNotMatch(source, /确认第二轮投流预算与 GMV 目标/);
  assert.doesNotMatch(source, /正在打开香氛礼盒达人带货收尾/);
});

test("当前用户与达人带货运营团队采用内容电商负责人责任口径", () => {
  const currentMember = creatorCommerceMembers.find((member) => member.id === "周岚");
  const currentTeam = initialPersonalCenterState.teams[0];

  assert.equal(initialPersonalCenterState.profile.title, "内容电商负责人");
  assert.equal(currentTeam.name, "达人带货运营团队");
  assert.equal(currentTeam.role, "内容电商负责人");
  assert.equal(currentTeam.responsibilityDocument.content, currentMember?.dynamicResponsibility);
  assert.match(currentTeam.responsibilityDocument.content, /达人带货目标.*预算.*跨角色协调.*最终结果/);
});

test("已保存的旧个人中心基准会迁移到达人带货运营团队", () => {
  const legacyState = structuredClone(initialPersonalCenterState);
  legacyState.profile.title = "旧场景负责人";
  legacyState.teams[0].id = "retail";
  legacyState.teams[0].name = "旧场景团队";
  const values = new Map([["agentdoor-personal-center-v3", JSON.stringify(legacyState)]]);
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  try {
    const migrated = loadPersonalCenterState();
    assert.equal(migrated.profile.title, "内容电商负责人");
    assert.equal(migrated.teams[0].id, "creator-commerce");
    assert.equal(migrated.teams[0].name, "达人带货运营团队");
  } finally {
    if (originalDescriptor) Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("任务对话由场景定义启动并用紧凑卡片呈现一次性选择", () => {
  const source = readSource("src/components/TaskCreationConversation.tsx");
  const choiceSource = readSource("src/components/TaskCreationChoiceCards.tsx");

  assert.match(source, /taskCreationScenarios\.map/);
  assert.match(source, /handleScenarioStart\(suggestion\)/);
  assert.match(source, /TaskCreationChoiceCards/);
  assert.doesNotMatch(source, /完整项目 · 7 个子任务/);
  assert.match(choiceSource, /<button/);
  assert.match(choiceSource, /disabled=\{disabled\}/);
  assert.match(choiceSource, /className="task-creation-choice-card"/);
  assert.match(source, /!message\.scenarioChoiceSubmitted/);
  assert.match(source, /currentScenarioChoiceMessageId === message\.id/);
  assert.match(source, /currentScenarioChoiceMessageId !== messageId/);
  assert.match(source, /createMockTaskAssistantResponseForDraft\(request, transition\.draft, transition\.message\)/);
  assert.match(source, /人员已结合团队责任与相关经验完成匹配/);
  assert.doesNotMatch(source, /当前为预设 Mock 分工|回复任意内容/);
});

test("已有任务使用只读任务卡与动作组，对话态共用底部输入区", () => {
  const source = readSource("src/components/TaskCreationConversation.tsx");
  const choiceSource = readSource("src/components/TaskCreationChoiceCards.tsx");
  const styles = readSource("src/styles.css");

  assert.match(source, /TaskCreationExistingTaskCard/);
  assert.match(source, /scenarioCandidate/);
  assert.match(source, /message\.scenarioCandidate &&/);
  assert.match(source, /variant="actions"/);
  assert.equal(source.match(/\{composer\}/g)?.length, 1, "首屏与对话态必须复用唯一输入区");
  assert.match(source, /<div className="task-conversation-composer">\{composer\}<\/div>/);
  assert.match(choiceSource, /variant\?: "answers" \| "actions"/);
  assert.doesNotMatch(choiceSource, /task-creation-choice-indicator/);
  assert.match(styles, /\.task-conversation-workspace > \.task-conversation-column \{[^}]*display: grid;[^}]*grid-template-rows: minmax\(0, 1fr\) auto;/);
});

test("新建对话首屏居中，快捷提问排在唯一输入框下方", () => {
  const source = readSource("src/components/TaskCreationConversation.tsx");
  const styles = readSource("src/styles.css");
  const composerIndex = source.indexOf('<div className="task-conversation-composer">{composer}</div>');
  const suggestionsIndex = source.indexOf('aria-label="任务快捷指令"');

  assert.ok(composerIndex >= 0 && suggestionsIndex > composerIndex, "快捷提问应位于输入框之后");
  assert.match(source, /\{isStarting && <div aria-label="任务快捷指令"/);
  assert.equal(source.match(/\{composer\}/g)?.length, 1);
  assert.match(styles, /\.task-conversation-page\.is-starting \.task-conversation-column \{[^}]*grid-template-rows: auto auto auto;[^}]*align-content: safe center;/);
  assert.match(styles, /\.task-conversation-page\.is-starting \.task-conversation-composer \{[^}]*padding: 0;[^}]*background: transparent;/);
});

test("快捷场景先展示分析过程再呈现问题或任务结果", () => {
  const source = readSource("src/components/TaskCreationConversation.tsx");
  const inputSource = readSource("src/components/AnimatedAgentChatInput.tsx");
  const analyzeScenario = functionBody(source, "const analyzeScenarioTransition =", "const retryCurrentAnalysis =");
  const retryScenario = functionBody(source, "const retryCurrentAnalysis =", "const handleScenarioStart =");
  const startScenario = functionBody(source, "const handleScenarioStart =", "const handleScenarioChoice =");
  const chooseScenario = functionBody(source, "const handleScenarioChoice =", "const handleSend =");
  const sendScenario = functionBody(source, "const handleSend =", "const updateDraft =");

  assert.match(source, /const pendingScenarioAnalysisRef = useRef<PendingScenarioAnalysis \| null>\(null\)/);
  assert.match(analyzeScenario, /setIsAnalyzing\(true\)/);
  assert.match(analyzeScenario, /setWorkflowRequest\(request\)/);
  assert.match(analyzeScenario, /setWorkflowPreview\(preview\)/);
  assert.match(analyzeScenario, /pendingScenarioAnalysisRef\.current = pendingAnalysis/);
  assert.doesNotMatch(analyzeScenario, /createMockTaskAssistantResponse\(request\)/);
  assert.match(analyzeScenario, /await requestMockTaskAssistant\(request, controller\.signal, delayMs\)/);
  assert.match(analyzeScenario, /applyScenarioTransition\(transition, baseMessages, conversationId\)/);
  assert.match(retryScenario, /pendingScenarioAnalysisRef\.current/);
  assert.match(retryScenario, /analyzeScenarioTransition\(/);
  assert.match(startScenario, /void analyzeScenarioTransition\([^]*5_200\)/);
  assert.doesNotMatch(startScenario, /applyScenarioTransition\(/);
  assert.match(chooseScenario, /if \(isAnalyzing\) return/);
  assert.match(chooseScenario, /void analyzeScenarioTransition\(/);
  assert.match(sendScenario, /scenarioTransition\?\.type === "question"/);
  assert.match(sendScenario, /scenarioTransition\?\.type === "decision"/);
  assert.match(sendScenario, /if \(isAnalyzing \|\| pendingScenarioAnalysisRef\.current\) return/);
  assert.match(source, /const isScenarioRetryPending = Boolean\(error && pendingScenarioAnalysisRef\.current\)/);
  assert.match(source, /disabled=\{isScenarioRetryPending\}/);
  assert.match(source, /onClick=\{retryCurrentAnalysis\}/);
  assert.match(inputSource, /disabled\?: boolean/);
  assert.match(inputSource, /disabled=\{isAnalyzing \|\| disabled\}/);
});

test("切换场景会清空旧会话临时状态，已提交与历史选择卡不再重复呈现", () => {
  const source = readSource("src/components/TaskCreationConversation.tsx");
  const startScenario = functionBody(source, "const handleScenarioStart =", "const handleScenarioChoice =");
  const openHistory = functionBody(source, "const openConversation =", "const startNewConversation =");
  const historyChoiceCard = functionBody(source, "{messages.map((message, index)", "{isAnalyzing &&");

  for (const reset of [
    "submittedScenarioMessagesRef.current.clear()",
    "setSelectedParentTaskId(null)",
    "setOutput(null)",
    "setCreatedPlan(null)",
    "setWorkflowRequest(null)",
    "setWorkflowPreview(null)",
  ]) assert.ok(startScenario.includes(reset), `新场景缺少重置：${reset}`);
  assert.ok(startScenario.includes("setMessages([userMessage])"), "新场景必须替换旧请求消息");

  for (const reset of [
    "setScenarioSession(null)",
    "setScenarioTransition(null)",
    "setCurrentScenarioChoiceMessageId(null)",
    "submittedScenarioMessagesRef.current.clear()",
  ]) assert.ok(openHistory.includes(reset), `打开历史对话缺少重置：${reset}`);
  assert.ok(historyChoiceCard.includes("!message.scenarioChoiceSubmitted"));
  assert.ok(historyChoiceCard.includes("scenarioSession"));
  assert.ok(historyChoiceCard.includes("currentScenarioChoiceMessageId === message.id"));
});

test("全局通知提供邀请协助、成员加入和讨论提及三类示例", () => {
  const source = readSource("src/data/notificationExamples.ts");
  for (const kind of ["invitation", "member-joined", "mention"]) assert.ok(source.includes(`kind: "${kind}"`));
  assert.doesNotMatch(readSource("src/components/GlobalNotifications.tsx"), /respondToInvitation|>接受<|>拒绝</);
});

test("任务详情顶部状态始终允许手动更新当前任务", () => {
  const appSource = readSource("src/App.tsx");
  const detailSource = readSource("src/components/TaskDetail.tsx");

  assert.doesNotMatch(appSource, /selectedTaskId === "coupon-fix"/);
  assert.match(appSource, /onTaskStatusChange=\{selectedTreeTask\?\.kind === "task" \?/);
  assert.doesNotMatch(detailSource, /currentUserId !== confirmedOwnerId/);
  assert.match(detailSource, /editable=\{Boolean\(onTaskStatusChange\)\}/);
});

test("任务详情移除概览接线并由独立讨论承载协作", () => {
  const appSource = readSource("src/App.tsx");
  const detailSource = readSource("src/components/TaskDetail.tsx");

  assert.doesNotMatch(appSource, /overviewRole=|overviewCurrentTaskId=/);
  assert.doesNotMatch(detailSource, /TaskOverviewWorkspace|task-detail-panel-overview/);
  assert.match(detailSource, /<TaskDiscussion/);
  assert.match(detailSource, /getTaskDetailTabForTarget/);
});

test("子任务概览直接进入任务推进分析而主任务保留协作态势", () => {
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");

  assert.doesNotMatch(overviewSource, /当前推进判断|推进条件|建议下一步/);
  assert.match(overviewSource, /role !== "subtask"/);
});

test("子任务洞察只从当前任务候选集中生成", () => {
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");

  assert.match(overviewSource, /getOverviewInsightCandidateIds\(/);
  assert.match(overviewSource, /insightCandidateTasks\.find/);
});

test("标签与状态仅在详情顶部交换而画布节点保持简洁", () => {
  const detailSource = readSource("src/components/TaskDetail.tsx");
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");

  assert.match(detailSource, /className="task-detail-title-tags"/);
  assert.match(detailSource, /className="[^"]*\btask-detail-status-field\b[^"]*"/);
  assert.doesNotMatch(overviewSource, /task-overview-task-card-labels/);
  assert.doesNotMatch(overviewSource, /task-overview-canvas-node-status/);
});

test("画布中被弱化的卡片仍可点击并直接切换聚焦", () => {
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");

  assert.doesNotMatch(overviewSource, /<OverviewTaskCard disabled=\{muted\}/);
  assert.match(overviewSource, /onOpen=\{\(\) => setFocusedTaskId\(task\.id\)\}/);
});

test("画布聚焦后无关节点仅降低透明度并保留可切换提示", () => {
  const styleSource = readSource("src/styles.css");

  assert.match(styleSource, /\.task-overview-canvas-node\.is-muted \{[^}]*opacity: \.58;/s);
  assert.doesNotMatch(styleSource, /\.task-overview-canvas-node \{[^}]*animation:[^;}]*\sboth;/s);
  assert.match(styleSource, /\.task-overview-canvas-node\.is-muted:hover \{[^}]*opacity: \.76;/s);
  assert.match(styleSource, /\.task-overview-edge\.is-muted \{ opacity: \.28; \}/);
  assert.doesNotMatch(styleSource, /\.task-overview-canvas-node\.is-muted \{[^}]*filter:/s);
  assert.doesNotMatch(styleSource, /\.task-overview-canvas-node\.is-muted \.task-overview-task-card \{[^}]*background:/s);
  assert.match(styleSource, /\.task-overview-canvas-node\.is-muted \.task-overview-task-card::after \{[^}]*background: color-mix\(in srgb, var\(--ad-surface\) 46%, transparent\);[^}]*pointer-events: none;/s);
  assert.match(styleSource, /\.task-overview-canvas-node\.is-muted:hover \.task-overview-task-card::after \{ background: color-mix\(in srgb, var\(--ad-surface\) 28%, transparent\); \}/);
  assert.doesNotMatch(styleSource, /\.task-overview-canvas-node\.is-muted \{[^}]*pointer-events:\s*none/s);
});

test("画布中的真实依赖统一使用清晰的实心方向箭头", () => {
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");

  assert.match(overviewSource, /markerUnits="userSpaceOnUse"/);
  assert.match(overviewSource, /viewBox="0 0 10 10"/);
  assert.match(overviewSource, /d="M1 1\.5 8\.5 5 1 8\.5Z"/);
  assert.match(overviewSource, /markerEnd=\{`url\(#\$\{markerPrefix\}-\$\{waiting \? "waiting" : "ready"\}\)`\}/);
});

test("画布有效关系使用两个错峰粒子平稳流转", () => {
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");

  assert.match(overviewSource, /const canvasFlowDotOffsets = \[0, 0\.5\] as const;/);
  assert.match(overviewSource, /const canvasFlowDuration = 2\.2;/);
  assert.match(overviewSource, /relationshipActive && canvasFlowDotOffsets\.map\(\(offset, dotIndex\) =>/);
  assert.match(overviewSource, /dur=\{`\$\{canvasFlowDuration\}s`\}/);
  assert.doesNotMatch(overviewSource, /relationshipActive && <circle className="task-overview-edge-pulse"/);
});

test("画布支持拖拽视野但不允许拖动节点改关系", () => {
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");
  const styleSource = readSource("src/styles.css");

  assert.match(overviewSource, /onPointerDown=\{beginCanvasPan\}/);
  assert.match(overviewSource, /onPointerMove=\{moveCanvasPan\}/);
  assert.match(overviewSource, /onPointerUp=\{endCanvasPan\}/);
  assert.match(overviewSource, /onPointerCancel=\{endCanvasPan\}/);
  assert.match(overviewSource, /getCanvasPanPosition\(/);
  assert.match(styleSource, /\.task-overview-canvas-scroll \{[^}]*cursor: grab;/s);
  assert.match(styleSource, /\.task-overview-canvas-scroll\.is-panning \{[^}]*cursor: grabbing;/s);
  assert.doesNotMatch(overviewSource, /draggable=\{true\}/);
});

test("概览卡片状态颜色复用正式任务状态 token", () => {
  const tokenSource = readSource("styles/agentdoor-tokens.css");
  const styleSource = readSource("src/styles.css");

  for (const tone of ["neutral", "progress", "review", "warning", "success", "failed"]) {
    assert.match(tokenSource, new RegExp(`--ad-task-status-${tone}:`));
  }
  assert.match(styleSource, /task-status-badge\.warning[\s\S]*?color: var\(--ad-task-status-warning\)/);
  assert.match(styleSource, /task-overview-status-dot\.tone-blocked \{ background: var\(--ad-task-status-warning\); \}/);
  assert.match(styleSource, /task-overview-status-dot\.tone-in-progress \{ background: var\(--ad-task-status-progress\); \}/);
  assert.match(styleSource, /task-overview-status-dot\.tone-completed \{ background: var\(--ad-task-status-success\); \}/);
});

test("AI 洞察列表卡片只保留类型事项与操作入口", () => {
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");
  const insightCards = overviewSource.slice(
    overviewSource.indexOf('<div className="task-overview-insight-cards">'),
    overviewSource.indexOf("</section>", overviewSource.indexOf('<div className="task-overview-insight-cards">')),
  );

  assert.match(insightCards, /task-overview-insight-type/);
  assert.match(insightCards, /<h3>/);
  assert.match(insightCards, /<Button/);
  assert.doesNotMatch(insightCards, /<p>/);
  assert.doesNotMatch(insightCards, /<small>/);
});

test("AI 洞察一条一张卡片且操作区与标题形成层级", () => {
  const overviewSource = readSource("src/components/TaskOverviewWorkspace.tsx");
  const styleSource = readSource("src/styles.css");

  assert.equal(overviewSource.match(/className="task-overview-insight-actions"/g)?.length, 1);
  assert.equal(overviewSource.match(/<TaskOverviewInsightsPanel /g)?.length, 2);
  assert.match(styleSource, /\.task-overview-insight-cards \{[^}]*gap: var\(--ad-space-3\);[^}]*border: 0;[^}]*background: transparent;/);
  assert.match(styleSource, /\.task-overview-insight-cards > article \{[^}]*border: 1px solid[^}]*border-radius: var\(--ad-radius-card\);/);
  assert.doesNotMatch(styleSource, /\.task-overview-insight-cards > article \+ article \{ border-top:/);
  assert.match(styleSource, /\.task-overview-insight-actions \{[^}]*padding-top: var\(--ad-space-3\);[^}]*border-top: 1px solid/);
  assert.match(styleSource, /\.task-overview-insight-cards h3 \{[^}]*font-size: var\(--ad-text-body\);/);
  assert.match(styleSource, /\.task-overview-insight-actions \[data-slot="button"\] \{[^}]*font-size: var\(--ad-text-caption\);/);
});

test("无 retail 团队的合法 v3 数据仍刷新场景资料并保留其他团队", () => {
  const legacyState = structuredClone(initialPersonalCenterState);
  const platformTeam = legacyState.teams[1];
  const customTeam = structuredClone(platformTeam);
  customTeam.id = "custom-team";
  customTeam.name = "自定义团队";
  customTeam.inviteToken = "custom-team-token";
  legacyState.profile.title = "旧资料负责人";
  legacyState.profile.bio = "旧资料简介";
  legacyState.teams = [platformTeam, customTeam];
  const values = new Map([["agentdoor-personal-center-v3", JSON.stringify(legacyState)]]);
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
  });
  try {
    const migrated = loadPersonalCenterState();
    assert.equal(migrated.profile.title, initialPersonalCenterState.profile.title);
    assert.equal(migrated.profile.bio, initialPersonalCenterState.profile.bio);
    assert.deepEqual(migrated.teams.map((team) => team.id), ["creator-commerce", "platform", "supply-operations", "customer-success", "custom-team"]);
  } finally {
    if (originalDescriptor) Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("任务详情在讨论后保留子任务、文件和活动页签", () => {
  const detailSource = readSource("src/components/TaskDetail.tsx");
  assert.match(detailSource, /type TaskDetailTab = "discussion" \| "subtasks" \| "files" \| "activity"/);
  assert.match(detailSource, /\{ count: childTasks\.length, id: "subtasks", label: "子任务" \}/);
  assert.match(detailSource, /<TaskSubtaskList [^\n]*onOpenTask=\{onOpenRelatedTask\} tasks=\{childTasks\} \/>/);
  assert.ok(detailSource.indexOf('id: "discussion"') < detailSource.indexOf('id: "subtasks"'));
  assert.ok(detailSource.indexOf('id: "subtasks"') < detailSource.indexOf('id: "files"'));
});
