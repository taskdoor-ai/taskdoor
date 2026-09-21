import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(new URL("../src/components/TaskCreationConversation.tsx", import.meta.url), "utf8");
const choiceCardsSource = readFileSync(new URL("../src/components/TaskCreationChoiceCards.tsx", import.meta.url), "utf8");
const scenarioSource = readFileSync(new URL("../src/data/taskCreationScenarios.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const dependencyPickerSource = readFileSync(new URL("../src/components/TaskDependencyPicker.tsx", import.meta.url), "utf8");
const memberSelectorSource = readFileSync(new URL("../src/components/MemberSelector.tsx", import.meta.url), "utf8");
const personPickerSource = readFileSync(new URL("../src/components/PersonPicker.tsx", import.meta.url), "utf8");
const mockAssistantSource = readFileSync(new URL("../src/lib/mockTaskAssistant.ts", import.meta.url), "utf8");
const protocolSource = readFileSync(new URL("../src/lib/taskAssistantProtocol.ts", import.meta.url), "utf8");
const personAvatarSource = readFileSync(new URL("../src/components/PersonAvatar.tsx", import.meta.url), "utf8");
const taskDueDatePickerSource = readFileSync(new URL("../src/components/TaskDueDatePicker.tsx", import.meta.url), "utf8");
const taskDateRangePickerSource = readFileSync(new URL("../src/components/TaskDateRangePicker.tsx", import.meta.url), "utf8");
const workflowSource = readFileSync(new URL("../src/components/ui/ai-agent-response.tsx", import.meta.url), "utf8");
const confettiSource = readFileSync(new URL("../src/components/ui/motion-confetti.tsx", import.meta.url), "utf8");
const workspaceListSource = readFileSync(new URL("../src/components/WorkspaceList.tsx", import.meta.url), "utf8");
const workspaceDirectorySource = readFileSync(new URL("../src/components/WorkspaceDirectoryView.tsx", import.meta.url), "utf8");
const taskDetailSource = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");
const stylesheetSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("loading directly renders the 21st-style AgentWorkflow component", () => {
  assert.match(componentSource, /import \{ AgentWorkflow, type AgentPhase, type ToolDefinition \} from "\.\/ui\/ai-agent-response"/);
  assert.match(componentSource, /const taskCreationWorkflowFor = \(/);
  assert.match(componentSource, /!isAnalyzing && output && message\.role === "assistant" && index === messages\.length - 1 && <AgentWorkflow completed phases=\{taskCreationWorkflow\} tools=\{taskCreationTools\} workingLabel="TaskDoor 正在工作…" \/>/);
  assert.match(componentSource, /\{isAnalyzing && <AgentWorkflow phases=\{taskCreationWorkflow\} tools=\{taskCreationTools\} workingLabel="TaskDoor 正在工作…" \/>\}/);
  assert.match(componentSource, /<AgentWorkflow completed[^]*?<AIMessage/);
  assert.doesNotMatch(componentSource, /\(isAnalyzing \|\| output\) && <AgentWorkflow/);
  assert.doesNotMatch(componentSource, /function AgentDoorThinking\(\)/);
});

test("quick examples use shared task-creation scenarios with an accurate workflow count", () => {
  assert.match(scenarioSource, /label: "单任务 · 无子任务", prompt: "整理下周例会纪要"/);
  assert.match(scenarioSource, /label: "复杂项目 · 共 8 个任务"/);
  assert.match(scenarioSource, /label: "需求不明确 · 引导创建"/);
  assert.match(componentSource, /taskCreationScenarios\.map/);
  assert.match(componentSource, /aria-label="任务快捷指令"/);
  assert.match(componentSource, /1 个主任务 · \$\{subtaskCount\} 个子任务/);
  assert.match(componentSource, /expectedSubtaskCount = output\?\.draft\.subtasks\.length \?\? expectedMockSubtaskCount/);
});

test("task creation explains goal, team context, matched people and structure with actual mock data", () => {
  for (const label of ["分析任务目标", "分析团队情况", "匹配合适人员", "生成任务结构"]) {
    assert.match(componentSource, new RegExp(label));
  }
  assert.match(componentSource, /peopleRecommendations/);
  assert.match(componentSource, /recommendation\.reason/);
  assert.match(componentSource, /recentActivity/);
  assert.match(componentSource, /currentWork/);
  assert.match(componentSource, /parallelStartCount/);
  assert.match(componentSource, /dependentSubtaskCount/);
  assert.doesNotMatch(componentSource, /匹配团队责任/);
  assert.doesNotMatch(componentSource, /按责任范围核对负责人，而不是按姓名硬编码/);
});

test("composer has no sliding border streak and task detail uses a full layered gradient canvas", () => {
  assert.doesNotMatch(stylesheetSource, /\.animated-agent-chat\[data-state="analyzing"\] \.animated-agent-chat-shell::before/);
  assert.doesNotMatch(stylesheetSource, /@keyframes animated-agent-progress/);
  assert.match(stylesheetSource, /\.task-plan-panel \{[^}]*radial-gradient[^}]*linear-gradient/);
  assert.match(stylesheetSource, /\.task-plan-panel-hero \{[^}]*background: transparent/);
  assert.match(stylesheetSource, /\.task-plan-panel-body \{[^}]*background: transparent/);
});

test("task conversation docks the composer and scrolls messages inside a fixed viewport", () => {
  assert.match(stylesheetSource, /\.task-conversation-shell \{[^}]*height: 100dvh;[^}]*min-height: 0;[^}]*overflow: hidden;/s);
  assert.match(stylesheetSource, /\.task-conversation-workspace \{[^}]*height: 100%;[^}]*min-height: 0;[^}]*grid-template-rows: minmax\(0, 1fr\)/s);
  assert.match(stylesheetSource, /\.task-conversation-column \{[^}]*height: 100%;[^}]*min-height: 0;/s);
  assert.match(stylesheetSource, /\.task-conversation-messages \{[^}]*min-height: 0;[^}]*overflow-y: auto;/s);
  assert.match(stylesheetSource, /\.task-conversation-composer \{[^}]*position: relative;[^}]*flex: 0 0 auto;/s);
  assert.doesNotMatch(stylesheetSource, /\.task-conversation-composer \{[^}]*position: sticky;/s);
  assert.match(componentSource, /const messagesContainerRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(componentSource, /shouldAutoScrollRef\.current/);
  assert.match(componentSource, /container\.scrollTop = container\.scrollHeight/);
  assert.match(componentSource, /container\.scrollHeight - container\.scrollTop - container\.clientHeight <= 72/);
  assert.match(componentSource, /ref=\{messagesContainerRef\}/);
});

test("clarification choices use a compact single-column selection list", () => {
  assert.match(choiceCardsSource, /role="group"/);
  assert.match(choiceCardsSource, /className="task-creation-choice-card"/);
  assert.doesNotMatch(choiceCardsSource, /task-creation-choice-indicator/);
  assert.match(choiceCardsSource, /task-creation-choice-copy/);
  assert.match(choiceCardsSource, /ChevronRight/);
  assert.match(choiceCardsSource, /variant\?: "answers" \| "actions"/);
  assert.match(stylesheetSource, /\.task-creation-choice-cards \{[^}]*grid-template-columns: minmax\(0, 1fr\)/s);
  assert.doesNotMatch(stylesheetSource, /\.task-creation-choice-cards \{[^}]*auto-fit/s);
  assert.match(stylesheetSource, /\.task-creation-choice-card \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/s);
  assert.match(componentSource, /!message\.scenarioChoiceSubmitted/);
  assert.match(componentSource, /currentScenarioChoiceMessageId === message\.id/);
});

test("AgentWorkflow owns the reasoning trace and staged playback", () => {
  assert.match(workflowSource, /export type AgentPhase/);
  assert.match(workflowSource, /export function AgentWorkflow/);
  assert.match(workflowSource, /type: "reasoning"/);
  assert.match(workflowSource, /aria-label=\{workingLabel\}/);
  assert.match(workflowSource, /setInterval/);
  assert.match(workflowSource, /isActive[^]*?`已工作 \$\{phaseDuration\(phase\)\.toFixed\(1\)\} 秒`/);
  assert.match(workflowSource, /setOpenPhases\(\{ 0: true \}\)/);
  assert.match(workflowSource, /useState<Record<number, boolean>>\(completed \? \{\} : \{ 0: true \}\)/);
  assert.match(workflowSource, /if \(completed\) \{[^]*?setOpenPhases\(\{\}\)/);
  assert.match(workflowSource, /setOpenTraces\(\{\}\)/);
  assert.match(workflowSource, /aria-expanded=\{isTraceOpen\}/);
  assert.match(workflowSource, /toggleTrace/);
  assert.match(workflowSource, /BrainCircuit/);
  assert.match(componentSource, /UserRoundCheck/);
  assert.match(componentSource, /ListTree/);
  assert.match(workflowSource, /Thought for \$\{reasoningDuration\(trace\)\.toFixed\(1\)\}s/);
  assert.match(componentSource, /toolName: "people-match"/);
  assert.match(componentSource, /toolName: "task-structure"/);
  assert.match(componentSource, /tools=\{taskCreationTools\}/);
  assert.match(workflowSource, /prefers-reduced-motion/);
  assert.match(workflowSource, /className="flex w-full max-w-2xl flex-col gap-2 text-sm"/);
  assert.match(workflowSource, /className="grid gap-1\.5" key=\{phaseIndex\}/);
  assert.match(workflowSource, /agent-workflow-gradient-text/);
  assert.match(workflowSource, /traceLabel\(trace\.primary, isTraceActive\)/);
  assert.match(workflowSource, /traceLabel\(trace\.primary \?\? definition\.label, isTraceActive\)/);
  assert.match(workflowSource, /trace\.secondary && !isTraceActive/);
  assert.doesNotMatch(workflowSource, /workingLabel\.split\(""\)/);
  assert.match(workflowSource, /const pixelDotDelays = Array\.from\(\{ length: 9 \}/);
  assert.match(workflowSource, /\(column \+ Math\.abs\(row - 1\)\) \* 90/);
  assert.match(workflowSource, /grid-cols-\[repeat\(3,3px\)\][^"]*gap-\[1\.5px\]/);
  assert.match(workflowSource, /agent-workflow-grid-dot/);
  assert.match(stylesheetSource, /@keyframes agent-workflow-pixel-on/);
  assert.match(stylesheetSource, /@keyframes agent-workflow-shimmer/);
  assert.match(stylesheetSource, /\.agent-workflow-grid-dot/);
  assert.match(stylesheetSource, /650ms cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
  assert.match(stylesheetSource, /1\.5s linear infinite/);
  assert.match(stylesheetSource, /transform: scale\(0\.9\)/);
  assert.match(stylesheetSource, /transform: scale\(1\.1\)/);
  assert.match(stylesheetSource, /background-clip:\s*text/);
  assert.match(stylesheetSource, /background-position: 200% 0/);
  assert.match(stylesheetSource, /background-position: -200% 0/);
  assert.match(stylesheetSource, /var\(--ad-route\)/);
  assert.match(stylesheetSource, /\.task-assistant-output \{[^}]*margin-top: calc\(var\(--ad-space-3\) \* -1\)/);
  assert.doesNotMatch(stylesheetSource, /\.task-assistant-output-time/);
  assert.doesNotMatch(stylesheetSource, /agent-workflow-letter-float/);
  assert.doesNotMatch(workflowSource, /overflow-hidden rounded-xl border border-border\/70 bg-background shadow-sm/);
  assert.doesNotMatch(stylesheetSource, /\.agentdoor-thinking/);
});

test("mock loading is slow enough to inspect the complete trace", () => {
  assert.match(mockAssistantSource, /delayMs = 5_200/);
  assert.match(workflowSource, /}, 900\)/);
  assert.match(workflowSource, /if \(traceSteps\.length === 0\) return null/);
});

test("task draft defaults to a compact decision surface", () => {
  assert.match(componentSource, /className="task-assistant-output-summary"/);
  assert.match(stylesheetSource, /--task-conversation-content-max: 600px/);
  assert.match(stylesheetSource, /\.ai-message \{[^}]*var\(--task-conversation-content-max\)/);
  assert.match(stylesheetSource, /\.task-assistant-output \{[^}]*var\(--task-conversation-content-max\)/);
  assert.match(componentSource, /task-conversation-workspace\$\{isDetailOpen \? " has-detail" : ""\}/);
  assert.match(componentSource, /className="task-plan-panel is-open"/);
  assert.match(componentSource, /\{!isStarting && isDetailOpen && output && <TaskPlanPanel/);
  assert.match(componentSource, /子任务/);
  assert.match(componentSource, /需等待/);
  assert.match(componentSource, /dependencyTitles\.length \? "需等待" : "无前置依赖"/);
  assert.match(componentSource, /前置依赖/);
  assert.match(componentSource, /dependsOnSubtaskIndexes/);
  assert.match(componentSource, /onClick=\{\(\) => createdPlan \? onOpenTask\(createdPlan\.mainTaskId\) : setIsDetailOpen\(true\)\}/);
  assert.doesNotMatch(componentSource, /task-assistant-guidance/);
  assert.doesNotMatch(componentSource, /AgentDoor 任务草案|可编辑|回复上方问题，或点击卡片直接修改/);
  assert.match(componentSource, /buttonClassName=\{`task-assistant-confirm\$\{createdPlan \? " is-created" : ""\}`\}/);
  assert.match(componentSource, /createdPlan \? <>[^]*查看详情[^]*确认创建<ArrowRight/);
  assert.match(componentSource, /className="task-assistant-output-owner"><small>负责人<\/small><MemberSelector allowUnassigned/);
  assert.doesNotMatch(componentSource, /className="task-assistant-output-facts"[\s\S]{0,500}<small>截止日期<\/small>/);
  assert.match(componentSource, /主任务 1 · 子任务 \{output\.draft\.subtasks\.length\}/);
  assert.doesNotMatch(componentSource, /task-assistant-output-time|outputTimestamp/);
  assert.match(componentSource, /\[\.\.\.messages\]\.reverse\(\)\.find\(\(message\) => message\.role === "assistant"\)/);
  assert.match(componentSource, /\{message === outputMessage && taskOutputCard\}\s*<div className="task-conversation-turn"[^>]*>\s*<AIMessage/);
  assert.match(componentSource, /timestamp=\{messageTimeFormatter\.format\(new Date\(message\.createdAt\)\)\}/);
  assert.match(componentSource, /<div className="task-conversation-composer">\{composer\}<\/div>/);
  assert.doesNotMatch(componentSource, /!createdPlan && <div className="task-conversation-composer"/);
  assert.match(componentSource, /if \(createdPlan\) \{[^]*onOpenTask\(createdPlan\.mainTaskId\)/);
  assert.match(componentSource, /setCreatedPlan\(result\);\s*\} catch \(caught\)/);
  assert.doesNotMatch(componentSource, /setCreatedPlan\(result\);\s*setIsDetailOpen\(false\)/);
  assert.match(componentSource, /\{!isStarting && isDetailOpen && output && <TaskPlanPanel/);
  assert.doesNotMatch(componentSource, /isDetailOpen && output && !createdPlan/);
  assert.doesNotMatch(componentSource, /setCreatedPlan\(result\);\s*setIsDetailOpen\(false\);\s*onOpenTask\(result\.mainTaskId\)/);
  assert.match(mockAssistantSource, /已按团队责任整理好任务方案，可以直接创建，也可以点击卡片调整/);
  assert.doesNotMatch(mockAssistantSource, /我已按团队责任整理好任务草案，还需要你确认两点/);
  assert.doesNotMatch(componentSource, /<details className="task-plan-disclosure">/);
  assert.doesNotMatch(componentSource, /执行步骤|task-step-number/);
  assert.doesNotMatch(stylesheetSource, /\.task-step-track::before/);
  assert.doesNotMatch(componentSource, /task-quality-grid/);
  assert.doesNotMatch(componentSource, /task-people-recommendations/);
  assert.doesNotMatch(componentSource, /qualityToneLabels/);
  assert.match(componentSource, /recommendation\.reason/);
});

test("task creation celebrates once before the button becomes a detail link", () => {
  assert.match(componentSource, /import \{ Confetti \} from "\.\/ui\/motion-confetti"/);
  assert.match(componentSource, /<Confetti[^]*celebrate=\{!createdPlan\}[^]*onClick=\{confirmCreate\}/);
  assert.doesNotMatch(componentSource, /confettiBurst|confirmButtonRef|getBoundingClientRect/);
  assert.doesNotMatch(componentSource, /className="task-creation-receipt"/);
  assert.match(confettiSource, /import \{ animate, motion \} from "motion\/react"/);
  assert.match(confettiSource, /import \{ createPortal \} from "react-dom"/);
  assert.match(confettiSource, /particleCount = 60/);
  assert.match(confettiSource, /const keyframeCount = 40/);
  assert.match(confettiSource, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(confettiSource, /<motion\.button/);
  assert.match(confettiSource, /event\.currentTarget\.getBoundingClientRect\(\)/);
  assert.match(confettiSource, /createPortal\(<div aria-hidden="true" className="confetti-portal">/);
  assert.match(confettiSource, /whileHover=\{disabled \? undefined : \{ scale: 1\.05 \}\}/);
  assert.match(confettiSource, /style=\{\{ left: burst\.x, top: burst\.y \}\}/);
  assert.match(stylesheetSource, /\.task-assistant-confirm-stage \{[^}]*grid-column: 2/);
});

test("task detail edits the main task inline without a separate edit mode", () => {
  assert.doesNotMatch(componentSource, /isMainTaskEditing/);
  assert.doesNotMatch(componentSource, />编辑任务</);
  assert.doesNotMatch(componentSource, />完成编辑</);
  assert.doesNotMatch(componentSource, /className="task-plan-panel-main-editor"/);
  assert.match(componentSource, /<h3 className="task-plan-panel-kicker task-subtask-kicker">子任务<span>\(\{draft\.subtasks\.length\}\)<\/span><\/h3>/);
  assert.doesNotMatch(componentSource, /分工与交付/);
  assert.match(componentSource, /aria-label="任务名称"/);
  assert.match(componentSource, /className="task-plan-panel-title-input"/);
  assert.match(componentSource, /aria-label="任务目标"/);
  assert.match(componentSource, /className="task-plan-panel-goal-input"/);
  assert.match(componentSource, /className="task-plan-panel-overview-strip"/);
  assert.match(componentSource, /className="task-plan-panel-owner"/);
  assert.match(componentSource, /className="task-plan-panel-participant-summary"/);
  assert.match(componentSource, /className="task-plan-panel-participant-summary">\s*<small>参与人<\/small>/);
  assert.match(componentSource, /className="task-plan-panel-participant-summary">\s*<small>参与人<\/small>\s*<MemberSelector displayMax=\{4\} hideHeader hideSelectedName label="参与人"[\s\S]*?stacked \/>/);
  assert.doesNotMatch(componentSource, />暂无<\/span>/);
  assert.match(personAvatarSource, /new ResizeObserver\(updateVisibleCount\)/);
  assert.match(componentSource, /<MemberSelector allowUnassigned hideHeader hideSelectedName label="负责人" max=\{1\}/);
  assert.match(componentSource, /<TaskDueDatePicker/);
  assert.match(componentSource, /<TagPicker onChange=\{\(labels\) => updateMainTask\(\{ labels \}\)\}/);
  assert.match(componentSource, /className="task-plan-panel-tags"/);
  assert.match(componentSource, /className="is-due"/);
  assert.match(componentSource, /className="is-due"><TaskDueDatePicker/);
  assert.doesNotMatch(componentSource, /task-plan-panel-overview-label/);
  assert.match(stylesheetSource, /\.task-plan-panel-overview-strip \{[^}]*grid-auto-rows: minmax\(96px, auto\)/);
  assert.match(stylesheetSource, /\.task-plan-panel-overview-strip > div \{[^}]*align-content: start;/);
  assert.match(stylesheetSource, /\.task-plan-panel-overview-strip > div > small,\s*\.task-plan-panel-overview-strip \.is-due \.task-due-date-label \{[^}]*color: var\(--ad-ink-tertiary\);[^}]*font-size: var\(--ad-text-label\);[^}]*line-height: 16px;/);
  assert.match(stylesheetSource, /\.task-plan-panel-overview-strip \.is-due \.task-due-date-picker,[\s\S]*?align-self: start;/);
  assert.match(componentSource, /draft\.mainTask\.participantIds/);
  assert.doesNotMatch(componentSource, /className="task-plan-panel-participants"/);
  assert.doesNotMatch(componentSource, /className="task-plan-main-editor"/);
  assert.doesNotMatch(componentSource, />主任务设置</);
  assert.match(componentSource, /className="task-plan-panel-main-identity"/);
  assert.match(componentSource, /<TaskIcon iconName=\{mainVisual\.iconName\} size="lg" tone=\{mainVisual\.iconTone\}/);
  assert.match(componentSource, /className="task-plan-panel is-open" data-tone=\{mainVisual\.iconTone\}/);
  assert.match(stylesheetSource, /\.task-plan-panel \{[^}]*linear-gradient/);
  assert.match(stylesheetSource, /\.task-plan-panel-hero \{[^}]*background: transparent/);
  assert.doesNotMatch(componentSource, /className="is-structure"/);
  assert.doesNotMatch(stylesheetSource, /\.task-plan-panel-attribute-strip/);
});

test("task editors use one date-range picker and keep ownership optional", () => {
  assert.match(componentSource, /showParticipants\?: boolean/);
  assert.match(componentSource, /showParticipants = true/);
  assert.match(componentSource, /\{showParticipants && <div className="task-draft-field task-draft-field-wide"/);
  assert.match(componentSource, /showParticipants=\{false\}/);
  assert.match(componentSource, /allowUnassigned hideHeader hideSelectedName label="负责人" max=\{1\} min=\{0\}/);
  assert.match(componentSource, /<TaskDueDatePicker initialValue=\{draft\.endDate\}/);
  assert.match(componentSource, /const taskIsValid = \(task: TaskDraft\) => Boolean\(\s*task\.title\.trim\(\)\s*&& task\.goal\.trim\(\),\s*\)/);
  assert.doesNotMatch(componentSource, /task\.goal\.trim\(\)\s*&& task\.endDate/);
  assert.doesNotMatch(componentSource, /type="date"/);
  assert.match(memberSelectorSource, /allowUnassigned\?: boolean/);
  assert.match(memberSelectorSource, /className="member-selector-remove"/);
  assert.match(memberSelectorSource, /<PersonPicker ariaLabel=\{`添加\$\{label\}`\}/);
  assert.match(memberSelectorSource, /showProfilePreview=\{showTriggerProfilePreview\}/);
  assert.match(memberSelectorSource, /showInvitationStatus \? invitationStatusById\[member\.id\] \?\? "accepted" : undefined/);
  assert.match(componentSource, /selected=\{mainOwner \? \[mainOwner\.id\] : \[\]\} showInvitationStatus=\{false\}/);
  assert.match(memberSelectorSource, /\{!hideSelectedName && <strong><PersonName name=\{member\.name\} profile=\{member\} \/><\/strong>\}/);
  assert.match(personPickerSource, /data-hide-name=\{hideSelectedName \|\| undefined\}/);
  assert.match(personPickerSource, /triggerVariant === "add" \? <>[^]*\{!hideSelectedName && <strong/);
  assert.match(componentSource, /label="截止时间"/);
  assert.doesNotMatch(componentSource, /className="is-due"><small>到期时间<\/small>/);
  assert.doesNotMatch(componentSource, /className="task-draft-field is-due"><span>到期时间<\/span>/);
  assert.match(taskDateRangePickerSource, /import \{ createPortal \} from "react-dom"/);
  assert.match(taskDateRangePickerSource, /!rootRef\.current\?\.contains\(target\) && !popoverRef\.current\?\.contains\(target\)/);
  assert.match(taskDateRangePickerSource, /document\.addEventListener\("scroll", updatePosition, true\)/);
  assert.match(taskDateRangePickerSource, /createPortal\(<div aria-label="选择开始和结束时间"/);
  assert.match(stylesheetSource, /\.task-date-range-popover-fixed \{[^}]*position: fixed;[^}]*z-index: 1200/);
  assert.match(taskDateRangePickerSource, />添加时间</);
  assert.match(taskDateRangePickerSource, />至</);
  assert.match(componentSource, /className="task-subtask-owner-control"[^]*<MemberSelector allowUnassigned hideHeader hideSelectedName[^]*showTriggerProfilePreview=\{false\}/);
  assert.match(componentSource, /<TaskDraftEditor attributesFirst[^]*showOwner=\{false\} showParticipants=\{false\}/);
  assert.doesNotMatch(componentSource, /className="task-subtask-owner"/);
  assert.doesNotMatch(mockAssistantSource, /!task\.ownerId \|\| !context\.validMemberIds\.has\(task\.ownerId\)/);
  assert.match(componentSource, /task-draft-attribute-row\$\{showOwner \? "" : " without-owner"\}/);
  assert.match(stylesheetSource, /\.task-draft-attribute-row\.without-owner \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(stylesheetSource, /\.task-subtask-trigger > \.ad-accordion-chevron \{[^}]*right: var\(--ad-space-4\)/);
  assert.match(componentSource, /className="task-plan-panel-tags"[^]*?className="is-due"/);
});

test("creation tasks use one deadline beside labels", () => {
  assert.match(componentSource, /<TaskDueDatePicker initialValue=\{draft\.endDate\}[^]*label="截止时间"[^]*startDate: ""/);
  assert.doesNotMatch(componentSource, /<TaskDateRangePicker/);
  assert.match(stylesheetSource, /\.task-draft-attribute-row\.without-owner \{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
});

test("mock task appearance is semantic and creation persists real workspace nodes", () => {
  assert.match(protocolSource, /iconName: taskIconNameSchema\.optional\(\)/);
  assert.match(protocolSource, /iconTone: taskIconToneSchema\.optional\(\)/);
  assert.match(mockAssistantSource, /iconName: "target"/);
  assert.match(mockAssistantSource, /iconName: "briefcase", iconTone: "pink"/);
  assert.match(mockAssistantSource, /iconName: "file-check", iconTone: "green"/);
  assert.match(componentSource, /const subtaskVisuals: TaskVisual\[\]/);
  assert.match(componentSource, /data-tone=\{taskVisual\.iconTone\}/);
  assert.match(componentSource, /<TaskIcon iconName=\{taskVisual\.iconName\} size="lg" tone=\{taskVisual\.iconTone\}/);
  assert.match(componentSource, /key=\{`subtask-\$\{index\}`\}/);
  assert.match(appSource, /createWorkspaceTasksFromDraft\(workspaceNodesRef\.current, draft, \{ parentTaskId, currentUserId, teamId: activeTeamId \}\)/);
  assert.match(appSource, /setWorkspaceNodes\(result\.nodes\)/);
  assert.doesNotMatch(appSource, /getCreationPreviewTaskId/);
  assert.match(stylesheetSource, /\.task-subtask\[data-tone="pink"\]/);
});

test("the 21st-style avatar group limits visible members and exposes overflow", () => {
  assert.match(personAvatarSource, /maxVisible = people\.length/);
  assert.match(personAvatarSource, /const visiblePeople = people\.slice\(0, fitAvailable \? fittedMaxVisible : maxVisible\)/);
  assert.match(personAvatarSource, /const hiddenCount = Math\.max\(0, people\.length - visiblePeople\.length\)/);
  assert.match(personAvatarSource, /className="person-avatar-overflow"/);
  assert.match(personAvatarSource, /\+\{hiddenCount\}/);
});

test("prerequisite dependencies are selection-only and cycle-safe", () => {
  assert.match(componentSource, /<TaskDependencyPicker/);
  assert.match(componentSource, /onChange=\{\(dependsOnSubtaskIndexes\)/);
  assert.match(componentSource, /wouldCreateDependencyCycle/);
  assert.match(dependencyPickerSource, /aria-label="选择前置依赖"/);
  assert.match(dependencyPickerSource, /aria-pressed=\{checked\}/);
  assert.match(dependencyPickerSource, /清除全部/);
  assert.match(dependencyPickerSource, /会形成循环依赖/);
  assert.match(dependencyPickerSource, /移除前置依赖/);
  assert.match(dependencyPickerSource, />添加依赖</);
  assert.match(dependencyPickerSource, />无前置依赖</);
  assert.doesNotMatch(dependencyPickerSource, /未设置前置任务/);
  assert.doesNotMatch(dependencyPickerSource, />设置</);
  assert.doesNotMatch(stylesheetSource, /\.task-dependency-add \{[^}]*border: 1px dashed/);
  assert.match(stylesheetSource, /\.task-dependency-option-check \{[^}]*width: 18px;[^}]*height: 18px/);
  assert.match(stylesheetSource, /\.task-dependency-option \{[^}]*grid-template-columns: 18px minmax\(0, 1fr\)/);
  assert.match(stylesheetSource, /\.task-dependency-chip > span \{[^}]*user-select: none/);
});

test("task list uses tone-aware decision cards without a left accent rail", () => {
  assert.match(workspaceDirectorySource, /data-tone=\{task\.iconTone \?\? "neutral"\}/);
  assert.match(workspaceDirectorySource, /<TaskIcon iconName=\{task\.iconName\} size="lg"/);
  assert.match(workspaceDirectorySource, /workspace-directory-task-heading"><strong>\{task\.name\}<\/strong><\/span>/);
  assert.match(workspaceDirectorySource, /workspace-directory-task-meta">[^]*aria-label=\{`状态：\$\{task\.status\}`\}[^]*<TaskStatusBadge size="sm" value=\{task\.status\}/);
  assert.doesNotMatch(workspaceDirectorySource, /<small>状态<\/small>|<small>负责人<\/small>|<small>标签<\/small>/);
  assert.match(workspaceDirectorySource, /<small>主任务<\/small><strong>\{parentTask\.name\}<\/strong>/);
  assert.match(workspaceDirectorySource, /<small>子任务<\/small><strong>\{childCount\}<\/strong>/);
  assert.match(workspaceDirectorySource, /const timeRange = getTaskTimeRangeLabel\(task\)/);
  assert.match(workspaceDirectorySource, /\{timeRange && <span className="workspace-directory-task-time"/);
  assert.doesNotMatch(workspaceDirectorySource, /TaskDateRangePicker/);
  assert.doesNotMatch(workspaceDirectorySource, /workspace-directory-columns/);
  assert.doesNotMatch(stylesheetSource, /\.workspace-directory-task::before/);
  assert.match(stylesheetSource, /\.workspace-directory-task\[data-tone="blue"\]/);
  assert.doesNotMatch(workspaceListSource, /任务草稿|先记下要推进的事/);
});

test("task detail shares the creation-card hierarchy and canonical controls", () => {
  assert.match(taskDetailSource, /className="task-detail-header" data-tone=\{task\.iconTone \?\? "neutral"\}/);
  assert.match(taskDetailSource, /className="task-detail-hero-card"/);
  assert.match(taskDetailSource, /<small>负责人<\/small><MemberSelector[^]*hideSelectedName/);
  assert.match(taskDetailSource, /<small>参与人<\/small><MemberSelector[^]*hideSelectedName/);
  assert.match(taskDetailSource, /aria-label="任务标签" className="task-detail-title-tags"/);
  assert.match(taskDetailSource, /className="[^"]*\btask-detail-status-field\b[^"]*"[^]*<small>状态<\/small>/);
  assert.match(taskDetailSource, /<TaskDueDatePicker[^]*label="截止时间"/);
  assert.match(taskDetailSource, /initialValue=\{plannedEndOn \?\? toDateInputValue\(task\.due\)\}/);
  assert.match(taskDetailSource, /endDate \? \{ end: endDate, start: "" \} : null/);
  assert.match(stylesheetSource, /\.task-minimal-overview \{[^}]*grid-template-columns: minmax\(0, \.9fr\) minmax\(0, 1\.1fr\)/);
  assert.match(stylesheetSource, /\.task-detail-tabs \{[^}]*border-bottom: 1px solid var\(--ad-border\)[^}]*border-radius: 0/);
  assert.match(stylesheetSource, /\.task-detail-tabs button\.active::after \{[^}]*height: 2px;[^}]*background: var\(--ad-route\)/);
});
