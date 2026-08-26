import { ArrowLeft, ArrowRight, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AiChainOfThought,
  AiChainOfThoughtContent,
  AiChainOfThoughtHeader,
  AiChainOfThoughtSearchResults,
  AiChainOfThoughtStep,
  type StepStatus,
} from "./components/ui/chain-of-thought";
import { InputBar, type InputAttachment } from "./components/InputBar";
import type { EnterpriseSource } from "./components/SourcesList";
import { BrandMark } from "./components/BrandMark";
import { WorkspaceSidebar, type PrimarySection } from "./components/WorkspaceSidebar";
import { WorkspaceList } from "./components/WorkspaceList";
import { PersonalWorkbench } from "./components/PersonalWorkbench";
import { CliConnectionDialog } from "./components/CliConnectionDialog";
import { TaskDetail } from "./components/TaskDetail";
import type { Member } from "./components/MemberSelector";
import { ResourceLibrary } from "./components/ResourceLibrary";
import { CollaborationBrief } from "./components/CollaborationBrief";
import { TaskOverviewCard } from "./components/TaskOverviewCard";
import { TaskCreationSuccess } from "./components/TaskCreationSuccess";
import type { TaskStatus } from "./components/TaskStatusBadge";
import { AiConnectionPage } from "./components/AiConnectionPage";
import { MyTodosPage } from "./components/MyTodosPage";
import { TagManagementPage } from "./components/TagManagementPage";
import { allCouponTodoKeys } from "./data/taskPlan";
import { initialTagGroups, normalizeTagGroups, type TagGroup } from "./data/tagGroups";
import { getFolderPath, workspaceNodes as initialWorkspaceNodes, workspaceRootId, type WorkspaceNode } from "./data/workspaceNodes";

type Phase = "empty" | "result";
type Theme = "light" | "dark";
type HomeView = "workbench" | "create";

type StoredTask = {
  contextIds: string[];
  createdAt: string;
  goal: string;
  id: "coupon-fix";
  owner: string[];
  participants: string[];
  planConfirmed?: boolean;
  planTodoKeys?: string[];
  status?: TaskStatus;
  title: string;
};

const createdTaskStorageKey = "agentdoor-created-task";
const localAiStorageKey = "agentdoor-local-ai-connected";
const tagGroupsStorageKey = "agentdoor-tag-groups";
const workspaceNodesStorageKey = "agentdoor-workspace-nodes";
const taskTodoKeySet = new Set(allCouponTodoKeys());

const loadStoredValue = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

const loadCreatedTask = (): StoredTask | null => {
  try {
    const value = localStorage.getItem(createdTaskStorageKey);
    return value ? JSON.parse(value) as StoredTask : null;
  } catch {
    return null;
  }
};

const defaultPrompt = "我的 Codex 已定位 POS 优惠券重复核销来自离线事件重放，并生成修复草案。需要交易域负责人确认退款与撤单规则，门店运营安排灰度验证。";
const mockPrompts: Array<{ label: string; prompt: string }> = [
  { label: "MVP 协作示例", prompt: defaultPrompt },
];

const collaborationMembers: Member[] = [
  { id: "周岚", name: "周岚", email: "zhoulan@agentdoor.local", role: "交易产品负责人", dynamicResponsibility: "退款、撤单与优惠券核销规则", availability: "今天可投入约 1.5 小时", currentWork: ["2 项决定阻塞协作者", "审核会员结算口径"], recentActivity: "近 30 天确认 6 项交易规则" },
  { id: "陈默", name: "陈默", email: "chenmo@agentdoor.local", role: "支付后端工程师", dynamicResponsibility: "交易重试可靠性与幂等治理", availability: "当前负载偏高，明天可投入", currentWork: ["处理支付重试线上问题", "评审发票降级方案"], recentActivity: "近期完成 3 项重试链路任务" },
  { id: "林洁", name: "林洁", email: "linjie@agentdoor.local", role: "门店运营经理", dynamicResponsibility: "试点门店灰度与现场协调", availability: "今天 15:00–17:00 有灰度窗口", currentWork: ["协调 12 家试点门店", "汇总异常样本"], recentActivity: "连续负责 4 次门店灰度" },
  { id: "高远", name: "高远", email: "gaoyuan@agentdoor.local", role: "库存平台工程师", dynamicResponsibility: "事件补偿与消息去重", availability: "本周仍可投入约 40%", currentWork: ["库存补偿机制", "审计字段回填"], recentActivity: "维护库存事件链路" },
  { id: "梁川", name: "梁川", email: "liangchuan@agentdoor.local", role: "质量负责人", dynamicResponsibility: "跨域验收与发布质量", availability: "明天下午可参与评审", currentWork: ["审核 3 项交付", "会员回算抽样"], recentActivity: "近 30 天完成 8 次发布验收" },
  { id: "许宁", name: "许宁", email: "xuning@agentdoor.local", role: "会员域负责人", dynamicResponsibility: "会员权益与等级结算", availability: "休假至 8 月 28 日", currentWork: ["职责暂由周岚代理"], recentActivity: "维护会员规则基线" },
  { id: "韩序", name: "韩序", email: "hanxu@agentdoor.local", role: "数据分析师", dynamicResponsibility: "经营异常分析与指标口径", availability: "今天可投入约 2 小时", currentWork: ["分析发票失败率", "构建灰度指标"], recentActivity: "近期交付 5 份异常分析" },
  { id: "苏禾", name: "苏禾", email: "suhe@agentdoor.local", role: "合规与审计", dynamicResponsibility: "财务字段与个人数据合规", availability: "需提前预约审核", currentWork: ["历史交易审计"], recentActivity: "仅在敏感数据任务中加入" },
];

const demoSources: EnterpriseSource[] = [
  {
    id: "schema",
    title: "POS 优惠券核销业务规则 v3.2.pdf",
    snippet: "交易完成后核销券实例；退款与撤单的恢复规则需要业务负责人确认。",
    meta: "零售业务资源库 / POS / 业务规则 · 周岚更新于 2 天前",
    type: "document",
  },
  {
    id: "incident",
    title: "离线交易重放事故复盘 2026-05-18.docx",
    snippet: "门店恢复联网后重新生成请求标识，同一券实例被重复消费。",
    meta: "零售技术资源库 / 事故复盘 · 陈默更新于 4 个月前",
    type: "document",
  },
  {
    id: "commit",
    title: "coupon-retry 重放修复草案.patch",
    snippet: "个人 Codex 生成的候选改动，使用订单与券实例组成稳定幂等键。",
    meta: "AI 工作成果库 / 待审核草案 · 由你刚刚上传",
    type: "change",
  },
];

function App() {
  const [restoredTask] = useState<StoredTask | null>(() => loadCreatedTask());
  const [phase, setPhase] = useState<Phase>("empty");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("agentdoor-theme") as Theme) || "light");
  const [input, setInput] = useState("");
  const [requestSummary, setRequestSummary] = useState("");
  const [attachments, setAttachments] = useState<InputAttachment[]>([]);
  const [creationSuccessOpen, setCreationSuccessOpen] = useState(false);
  const [taskExists, setTaskExists] = useState(Boolean(restoredTask));
  const [taskCreatedAt, setTaskCreatedAt] = useState<string | null>(restoredTask?.createdAt ?? null);
  const [selectedOwner, setSelectedOwner] = useState<string[]>(restoredTask?.owner ?? ["周岚"]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(restoredTask?.participants ?? ["陈默", "林洁"]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>(restoredTask?.contextIds ?? ["schema", "incident", "commit"]);
  const [taskName, setTaskName] = useState(restoredTask?.title ?? "评审并灰度验证 POS 优惠券重复核销修复草案");
  const [taskGoal, setTaskGoal] = useState(restoredTask?.goal ?? "基于现有根因定位和修复草案，完成 POS 优惠券重复核销修复，并通过退款、撤单和离线重试验证。");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(restoredTask?.status ?? "进行中");
  const [planConfirmed, setPlanConfirmed] = useState(restoredTask?.planConfirmed ?? false);
  const [planTodoKeys, setPlanTodoKeys] = useState<string[]>(() => {
    const restoredKeys = restoredTask?.planTodoKeys?.filter((key) => taskTodoKeySet.has(key)) ?? [];
    return restoredKeys.length ? restoredKeys : allCouponTodoKeys();
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>("coupon-fix");
  const [selectedResourceId, setSelectedResourceId] = useState("schema");
  const [selectedTodoId, setSelectedTodoId] = useState("boundary");
  const [selectedFolderId, setSelectedFolderId] = useState(workspaceRootId);
  const [workspaceNodes, setWorkspaceNodes] = useState<WorkspaceNode[]>(() => loadStoredValue(workspaceNodesStorageKey, initialWorkspaceNodes));
  const [tagGroups, setTagGroups] = useState<TagGroup[]>(() => normalizeTagGroups(loadStoredValue(tagGroupsStorageKey, initialTagGroups)));
  const [activeSection, setActiveSection] = useState<PrimarySection>("home");
  const [homeView, setHomeView] = useState<HomeView>("workbench");
  const [cliConnectionOpen, setCliConnectionOpen] = useState(false);
  const [localAiConnected, setLocalAiConnected] = useState(
    () => localStorage.getItem(localAiStorageKey) === "true",
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [secondaryCollapsed, setSecondaryCollapsed] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(5);
  const [traceOpen, setTraceOpen] = useState(false);
  const analysisTimers = useRef<number[]>([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("agentdoor-theme", theme);
  }, [theme]);

  useEffect(() => localStorage.setItem(workspaceNodesStorageKey, JSON.stringify(workspaceNodes)), [workspaceNodes]);
  useEffect(() => localStorage.setItem(tagGroupsStorageKey, JSON.stringify(tagGroups)), [tagGroups]);

  useEffect(() => {
    if (!taskExists || !taskCreatedAt) return;
    const task: StoredTask = {
      contextIds: selectedContextIds,
      createdAt: taskCreatedAt,
      goal: taskGoal,
      id: "coupon-fix",
      owner: selectedOwner,
      participants: selectedParticipants.filter((id) => !selectedOwner.includes(id)),
      planConfirmed,
      planTodoKeys,
      status: taskStatus,
      title: taskName,
    };
    localStorage.setItem(createdTaskStorageKey, JSON.stringify(task));
  }, [planConfirmed, planTodoKeys, selectedContextIds, selectedOwner, selectedParticipants, taskCreatedAt, taskExists, taskGoal, taskName, taskStatus]);

  useEffect(() => () => analysisTimers.current.forEach(window.clearTimeout), []);

  const clearAnalysisTimers = () => {
    analysisTimers.current.forEach(window.clearTimeout);
    analysisTimers.current = [];
  };

  const startAnalysis = (content: string) => {
    clearAnalysisTimers();
    setPlanConfirmed(false);
    const isComplexCollaboration = content.includes("POS") || content.includes("核销") || content.includes("灰度");
    setPlanTodoKeys(isComplexCollaboration ? allCouponTodoKeys() : []);
    setSelectedOwner(isComplexCollaboration ? ["周岚"] : []);
    setSelectedParticipants(isComplexCollaboration ? ["陈默", "林洁"] : []);
    setSelectedContextIds(isComplexCollaboration ? ["schema", "incident", "commit"] : []);
    if (isComplexCollaboration) {
      setTaskName("评审并灰度验证 POS 优惠券重复核销修复草案");
      setTaskGoal("基于现有根因定位和修复草案，完成 POS 优惠券重复核销修复，并通过退款、撤单和离线重试验证。");
    } else {
      const conciseGoal = content.trim().replace(/[。！？]+$/, "");
      setTaskName(conciseGoal.slice(0, 42) || "未命名任务");
      setTaskGoal(conciseGoal);
    }
    setRequestSummary(
      content.includes("POS")
        ? "POS 优惠券重复核销修复：确认退款与撤单规则，并完成门店灰度验证"
        : content.split(/[。！？\n]/)[0].trim().slice(0, 72),
    );
    setActiveSection("tasks");
    setHomeView("create");
    setPhase("result");
    setAnalysisStep(0);
    setTraceOpen(true);
    [1, 2, 3, 4, 5].forEach((step, index) => {
      const timer = window.setTimeout(() => {
        setAnalysisStep(step);
        if (step === 5) {
          const collapseTimer = window.setTimeout(() => setTraceOpen(false), 850);
          analysisTimers.current.push(collapseTimer);
        }
      }, 720 * (index + 1));
      analysisTimers.current.push(timer);
    });
  };

  const reset = () => {
    clearAnalysisTimers();
    setPhase("empty");
    setInput("");
    setRequestSummary("");
    setAttachments([]);
    setCreationSuccessOpen(false);
    setActiveSection("tasks");
    setSelectedTaskId("coupon-fix");
    setSecondaryCollapsed(true);
    setHomeView("create");
    setAnalysisStep(5);
    setTraceOpen(false);
    setPlanConfirmed(false);
    setPlanTodoKeys(allCouponTodoKeys());
  };

  const returnToTaskList = () => {
    clearAnalysisTimers();
    setCreationSuccessOpen(false);
    setActiveSection("tasks");
    setSelectedTaskId(null);
    setSecondaryCollapsed(false);
    setHomeView("workbench");
    setPhase("empty");
    setInput("");
    setRequestSummary("");
    setAttachments([]);
    setAnalysisStep(5);
    setTraceOpen(false);
  };

  const returnHomeAfterCreation = () => {
    clearAnalysisTimers();
    setCreationSuccessOpen(false);
    setActiveSection("home");
    setHomeView("workbench");
    setSelectedTaskId(null);
    setPhase("empty");
    setInput("");
    setRequestSummary("");
    setAttachments([]);
    setAnalysisStep(5);
    setTraceOpen(false);
  };

  const traceStatus = (index: number): StepStatus => {
    if (analysisStep > index) return "complete";
    if (analysisStep === index) return "active";
    return "pending";
  };

  const showSecondary = activeSection === "tasks" || activeSection === "todos" || activeSection === "resources";
  const selectedTreeTask = workspaceNodes.find((node) => node.kind === "task" && node.id === selectedTaskId);
  const selectedTaskPath = selectedTreeTask ? [...getFolderPath(selectedTreeTask.parentId ?? workspaceRootId, workspaceNodes).map((folder) => folder.name), selectedTreeTask.name] : [];

  return (
    <div className={`app-shell ${showSecondary && !secondaryCollapsed ? "nav-with-secondary" : "nav-rail-only"}`}>
      <WorkspaceSidebar
        activeSection={activeSection}
        mobileOpen={mobileNavOpen}
        nodes={workspaceNodes}
        secondaryCollapsed={secondaryCollapsed}
        onSecondaryCollapse={() => setSecondaryCollapsed(true)}
        onFolderSelect={(folderId) => {
          setSelectedFolderId(folderId);
          setSelectedTaskId(null);
          setActiveSection("tasks");
          setHomeView("workbench");
          setMobileNavOpen(false);
        }}
        onSectionChange={(section) => {
          if (section === "home") {
            returnHomeAfterCreation();
            setMobileNavOpen(false);
            return;
          }
          setSecondaryCollapsed(false);
          setActiveSection(section);
          if (section === "tasks") {
            setHomeView("workbench");
            setSelectedTaskId((current) => current ?? "coupon-fix");
          }
          setMobileNavOpen(false);
        }}
        onTodoSelect={(todoId) => {
          setSelectedTodoId(todoId);
          setActiveSection("todos");
          setMobileNavOpen(false);
        }}
        onTaskSelect={(taskId) => {
          setSelectedTaskId(taskId);
          setActiveSection("tasks");
          setHomeView("workbench");
          setMobileNavOpen(false);
        }}
        selectedFolderId={selectedFolderId}
        selectedTaskId={selectedTaskId}
        selectedTodoId={selectedTodoId}
        showSecondary={showSecondary}
        theme={theme}
        toggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
      />

      {mobileNavOpen && <button aria-label="关闭导航" className="nav-scrim" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button aria-label="打开导航" className="mobile-menu" onClick={() => setMobileNavOpen(true)} type="button"><Menu size={20} /></button>
          <div className="topbar-brand"><BrandMark /><span>Agentdoor</span></div>
        </header>

        {activeSection === "resources" ? (
          <ResourceLibrary selectedId={selectedResourceId} sources={demoSources} />
        ) : activeSection === "todos" ? (
          <MyTodosPage onOpenTask={(taskId) => { setActiveSection("tasks"); setSelectedTaskId(taskId); setSecondaryCollapsed(false); }} selectedTodoId={selectedTodoId} />
        ) : activeSection === "ai" ? (
          <AiConnectionPage />
        ) : activeSection === "settings" ? (
          <TagManagementPage
            groups={tagGroups}
            onChange={setTagGroups}
            onDeleteTag={(tag) => setWorkspaceNodes((nodes) => nodes.map((node) => node.kind === "task" ? { ...node, labels: node.labels?.filter((item) => item !== tag) } : node))}
            onRenameTag={(from, to) => setWorkspaceNodes((nodes) => nodes.map((node) => node.kind === "task" ? { ...node, labels: node.labels?.map((item) => item === from ? to : item) } : node))}
          />
        ) : activeSection === "tasks" && selectedTaskId ? (
          <TaskDetail
            key={selectedTaskId}
            contextIds={selectedTaskId === "coupon-fix" ? selectedContextIds : undefined}
            currentUser="周岚"
            members={collaborationMembers}
            onOwnerChange={selectedTaskId === "coupon-fix" ? (owner) => { setSelectedOwner(owner); setSelectedParticipants((current) => current.filter((id) => !owner.includes(id))); } : undefined}
            onParticipantsChange={selectedTaskId === "coupon-fix" ? setSelectedParticipants : undefined}
            owner={selectedTaskId === "coupon-fix" ? selectedOwner : undefined}
            pathLabels={selectedTaskPath}
            participants={selectedTaskId === "coupon-fix" ? selectedParticipants.filter((id) => !selectedOwner.includes(id)) : undefined}
            taskGoal={selectedTaskId === "coupon-fix" ? taskGoal : undefined}
            taskId={selectedTaskId as "coupon-fix" | "inventory-sync" | "member-settlement" | "invoice-validation" | "audit-fields" | "refund-archive"}
            taskStatus={selectedTaskId === "coupon-fix" ? taskStatus : undefined}
            taskTitle={selectedTaskId === "coupon-fix" ? taskName : undefined}
            tagGroups={tagGroups}
            tags={selectedTreeTask?.kind === "task" ? selectedTreeTask.labels ?? [] : []}
            plannedTodoKeys={selectedTaskId === "coupon-fix" ? planTodoKeys : undefined}
            onTaskStatusChange={selectedTaskId === "coupon-fix" ? setTaskStatus : undefined}
            onTaskTitleChange={selectedTaskId === "coupon-fix" ? setTaskName : undefined}
            onTagsChange={(labels) => setWorkspaceNodes((nodes) => nodes.map((node) => node.kind === "task" && node.id === selectedTaskId ? { ...node, labels } : node))}
          />
        ) : activeSection === "tasks" && homeView === "workbench" ? (
          <WorkspaceList
            folderId={selectedFolderId}
            nodes={workspaceNodes}
            tagGroups={tagGroups}
            onCreateTask={reset}
            onFolderSelect={(folderId) => {
              setSelectedFolderId(folderId);
              setSelectedTaskId(null);
            }}
            onNodeSelect={(node) => {
              if (node.kind === "task") setSelectedTaskId(node.id);
            }}
          />
        ) : activeSection === "tasks" && homeView === "create" && phase === "empty" ? (
          <section className="start-view">
            <div className="start-copy">
              <h1>你现在想解决什么问题？</h1>
              <p>不必先知道该找谁。Agentdoor 会先整理相关背景、资料与责任，再给出可解释的协作建议。</p>
            </div>
            <div className="composer-wrap">
              <InputBar
                attachments={attachments}
                onAttach={(files) => setAttachments((current) => [
                  ...current,
                  ...Array.from(files).map((file) => ({ id: crypto.randomUUID(), name: file.name, size: file.size })),
                ])}
                onChange={setInput}
                onRemoveAttachment={(id) => setAttachments((current) => current.filter((item) => item.id !== id))}
                onSend={startAnalysis}
                value={input}
              />
              <div className="example-prompts" aria-label="示例问题">
                {mockPrompts.map((item) => <button key={item.label} onClick={() => setInput(item.prompt)} type="button"><small>{item.label}</small><span>{item.prompt}</span><ArrowRight size={13} /></button>)}
              </div>
              <p className="privacy-note">仅在你已有的权限范围内查找。添加资料不会自动分享给其他人。</p>
            </div>
          </section>
        ) : activeSection === "home" && homeView === "workbench" ? (
          <PersonalWorkbench
            localAiConnected={localAiConnected}
            onConnectLocalAi={() => setCliConnectionOpen(true)}
            onCreateTask={reset}
          />
        ) : null}

        {phase === "result" && activeSection === "tasks" && homeView === "create" && (
          <section className="result-view">
            <div className="result-summary-bar">
              <button aria-label="返回工作空间" onClick={returnToTaskList} type="button">
                <ArrowLeft size={15} />
                <span>返回工作空间</span>
              </button>
              <div>
                <p>{requestSummary}</p>
              </div>
            </div>

            <div className="trace-wrap">
              <AiChainOfThought onOpenChange={setTraceOpen} open={traceOpen}>
                <AiChainOfThoughtHeader
                  completedCount={analysisStep}
                  stepCount={5}
                  title={analysisStep < 5 ? "正在准备协作建议" : "分析已完成"}
                >
                  <span className="chain-header-note">
                    {analysisStep < 5 ? "正在处理" : "3 个来源 · 可查看处理记录"}
                  </span>
                </AiChainOfThoughtHeader>
                <AiChainOfThoughtContent>
                  <AiChainOfThoughtStep
                    description="明确目标、交付结果和处理约束。"
                    status={traceStatus(0)}
                    title="理解任务"
                  />
                  <AiChainOfThoughtStep
                    description="识别完成任务前需要分别解决的关键问题。"
                    status={traceStatus(1)}
                    title="拆解问题"
                  />
                  <AiChainOfThoughtStep
                    description="在当前权限内，从业务资料、历史记录、代码和人员信息中寻找依据。"
                    status={traceStatus(2)}
                    title="查找相关依据"
                  >
                    {analysisStep >= 3 && (
                      <AiChainOfThoughtSearchResults results={demoSources.map(({ id, title, snippet }) => ({
                        title,
                        snippet,
                        url: `#resource-${id}`,
                      }))} />
                    )}
                  </AiChainOfThoughtStep>
                  <AiChainOfThoughtStep
                    description="对照多个来源，整理已确认事实、存在冲突的判断和仍缺失的信息。"
                    status={traceStatus(3)}
                    title="归纳事实与待确认项"
                  />
                  <AiChainOfThoughtStep
                    description="根据当前结论，确定下一步动作、负责人、审批要求和验证方式。"
                    status={traceStatus(4)}
                    title="规划后续处理"
                  />
                </AiChainOfThoughtContent>
              </AiChainOfThought>
            </div>

            <div className={`result-grid ${analysisStep < 5 ? "result-pending" : "result-ready"}`}>
              <div className="result-main">
                <CollaborationBrief
                  contextIds={selectedContextIds}
                  goal={taskGoal}
                  members={collaborationMembers}
                  name={taskName}
                  onContextChange={(ids) => { setSelectedContextIds(ids); setPlanConfirmed(false); }}
                  onGoalChange={(goal) => { setTaskGoal(goal); setPlanConfirmed(false); }}
                  onNameChange={(name) => { setTaskName(name); setPlanConfirmed(false); }}
                  onOwnerChange={(owner) => { setSelectedOwner(owner); setSelectedParticipants((current) => current.filter((id) => !owner.includes(id))); setPlanConfirmed(false); }}
                  onParticipantsChange={(participants) => { setSelectedParticipants(participants); setPlanConfirmed(false); }}
                  onPlanTodoKeysChange={(keys) => { setPlanTodoKeys(keys); setPlanConfirmed(false); }}
                  owner={selectedOwner}
                  participants={selectedParticipants.filter((id) => !selectedOwner.includes(id))}
                  planTodoKeys={planTodoKeys}
                  sources={demoSources}
                />
              </div>

              <div className="task-card-shell pending">
                <TaskOverviewCard
                  actionDisabled={!taskName.trim()}
                  actionLabel={!taskName.trim() ? "请填写任务名称" : "按当前草稿创建任务"}
                  members={collaborationMembers}
                  onAction={() => {
                    const createdAt = new Date().toISOString();
                    const task: StoredTask = {
                      contextIds: selectedContextIds,
                      createdAt,
                      goal: taskGoal,
                      id: "coupon-fix",
                      owner: selectedOwner,
                      participants: selectedParticipants.filter((id) => !selectedOwner.includes(id)),
                      planConfirmed: true,
                      planTodoKeys,
                      status: taskStatus,
                      title: taskName,
                    };
                    localStorage.setItem(createdTaskStorageKey, JSON.stringify(task));
                    setPlanConfirmed(true);
                    setTaskCreatedAt(createdAt);
                    setTaskExists(true);
                    setCreationSuccessOpen(true);
                  }}
                  onOwnerChange={(owner) => { setSelectedOwner(owner); setSelectedParticipants((current) => current.filter((id) => !owner.includes(id))); setPlanConfirmed(false); }}
                  onParticipantsChange={(participants) => { setSelectedParticipants(participants); setPlanConfirmed(false); }}
                  onTitleChange={setTaskName}
                  owner={selectedOwner}
                  participants={selectedParticipants}
                  showHandoff={false}
                  title={taskName}
                />
              </div>
            </div>
          </section>
        )}
      </main>
      {creationSuccessOpen && <TaskCreationSuccess
        cycle="按需推进"
        members={collaborationMembers}
        onClose={returnToTaskList}
        onContinue={() => {
          setCreationSuccessOpen(false);
          setActiveSection("tasks");
          setHomeView("workbench");
          setPhase("empty");
          setSelectedFolderId("delivery");
          setSelectedTaskId("coupon-fix");
          setSecondaryCollapsed(false);
        }}
        owner={selectedOwner}
        todoCount={planTodoKeys.filter((key) => taskTodoKeySet.has(key)).length}
        participants={selectedParticipants.filter((id) => !selectedOwner.includes(id))}
        title={taskName}
      />}
      {cliConnectionOpen && (
        <CliConnectionDialog
          onClose={() => setCliConnectionOpen(false)}
          onConnected={() => {
            localStorage.setItem(localAiStorageKey, "true");
            setLocalAiConnected(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
