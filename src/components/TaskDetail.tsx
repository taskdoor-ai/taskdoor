import {
  ArrowRight,
  AtSign,
  Bot,
  ChevronDown,
  ChevronRight,
  File,
  FileText,
  Folder,
  Link2,
  Send,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { type TaskActivityMock, type TaskActivityType, type TaskDetailMock, type TaskFileNode } from "../data/taskDetailMocks";
import { findTagByName, type TagDefinition } from "../data/tagGroups";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { AiConnectionDialog, type AiConnectionRequest } from "./AiConnectionDialog";
import { MemberSelector, type Member } from "./MemberSelector";
import { MentionComposer } from "./MentionComposer";
import { PersonAvatar, type PersonInvitationStatus } from "./PersonAvatar";
import { TagBadge } from "./TagBadge";
import { TagPicker } from "./TagPicker";
import { TaskAppearancePicker } from "./TaskAppearancePicker";
import { TaskDateRangePicker, type TaskDateRange } from "./TaskDateRangePicker";
import { TaskIcon } from "./TaskIcon";
import { TaskRelationsSection, type TaskRelationSummary } from "./TaskRelationsSection";
import { TaskStatusBadge, type TaskStatus } from "./TaskStatusBadge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export type TaskAttentionTarget = {
  kind: "activity" | "commit" | "file" | "insight";
  targetId: string;
};

type TaskDetailTab = "overview" | "relations" | "files" | "activity";
type TaskActivityFilter = "all" | TaskActivityType | "code-commit";

type TaskDetailProps = {
  childTasks?: TaskRelationSummary[];
  currentUser?: string;
  currentUserId?: string;
  initialAttentionTarget?: TaskAttentionTarget | null;
  initialProposedOwnerId?: string;
  members: Member[];
  onInitialAttentionTargetHandled?: () => void;
  onOpenRelatedTask?: (taskId: string) => void;
  onOwnerChange?: (owner: string[]) => void;
  onOwnerProposalChange?: (ownerId?: string) => void;
  onParticipantsChange?: (participants: string[]) => void;
  onPathSelect?: (nodeId: string) => void;
  onTagsChange?: (tags: string[]) => void;
  onTaskAppearanceChange?: (appearance: { iconName: TaskIconName; iconTone: TaskIconTone }) => void;
  onTaskPeriodChange?: (range: TaskDateRange | null) => void;
  onTaskStatusChange?: (status: TaskStatus) => void;
  parentTask?: TaskRelationSummary;
  pathItems?: Array<{ id: string; label: string }>;
  plannedEndOn?: string;
  plannedStartOn?: string;
  tagDefinitions?: TagDefinition[];
  tags?: string[];
  task: TaskDetailMock;
  taskId: string;
};

const activityTypeLabels: Record<TaskActivityType | "code-commit", string> = {
  "ai-insight": "AI 建议",
  "code-commit": "代码提交",
  "member-post": "动态",
  "member-reply": "回复",
  "participant-added": "参与者加入",
  "schedule-change": "周期变更",
  "status-change": "状态变更",
};

function FileTreeBranch({ expanded, level, nodes, onSelect, onToggle, parentId, selectedId }: {
  expanded: Set<string>;
  level: number;
  nodes: TaskFileNode[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  parentId: string | null;
  selectedId: string;
}) {
  return <>{nodes.filter((node) => node.parentId === parentId).map((node) => node.kind === "folder" ? <div key={node.id}>
    <button className="task-file-tree-folder" onClick={() => onToggle(node.id)} style={{ paddingLeft: 10 + level * 16 }} type="button">
      {expanded.has(node.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      <Folder size={14} />
      <span>{node.name}</span>
    </button>
    {expanded.has(node.id) && <FileTreeBranch expanded={expanded} level={level + 1} nodes={nodes} onSelect={onSelect} onToggle={onToggle} parentId={node.id} selectedId={selectedId} />}
  </div> : <button className={`task-file-tree-file ${selectedId === node.id ? "active" : ""}`} id={`task-file-${node.id}`} key={node.id} onClick={() => onSelect(node.id)} style={{ paddingLeft: 31 + level * 16 }} type="button">
    <FileText size={14} />
    <span><strong>{node.name}</strong><small>{node.format} · {node.updatedAt}</small></span>
  </button>)}</>;
}

function TaskFileDocumentViewer({ file, onSelectText }: { file: TaskFileNode; onSelectText: () => void }) {
  const blocks = (file.content ?? "当前文件没有可预览的正文。")
    .split(/\n{2,}/)
    .map((text) => ({ kind: text.startsWith("#") ? "heading" : text.startsWith("-") ? "list" : "paragraph", text }));

  return <div className="document-viewer-canvas without-annotations">
    <article onMouseUp={onSelectText}>
      <header><small>{file.format} · 当前任务可见版本</small><h3>{file.name}</h3></header>
      <div className="document-original-content">{blocks.map((block, index) => <div className={`document-block ${block.kind}`} id={`task-file-block-${file.id}-${index}`} key={`${file.id}:${index}`}>
        {block.kind === "heading"
          ? <h4>{block.text.replace(/^#+\s*/, "")}</h4>
          : block.kind === "list"
            ? <ul>{block.text.split("\n").map((item) => <li key={item}>{item.replace(/^-\s*/, "")}</li>)}</ul>
            : <p>{block.text}</p>}
      </div>)}</div>
      <footer>这里展示当前任务可见的原文；内容与访问权限不变。</footer>
    </article>
  </div>;
}

function parseActivityDetail(detail: string) {
  const quoteMatch = detail.match(/\n\n引用「([^」]+)」：([\s\S]+)$/);
  const withoutQuote = quoteMatch ? detail.slice(0, quoteMatch.index) : detail;
  const mentionMatch = withoutQuote.match(/^@([^\s]+)\s+/);
  return {
    mention: mentionMatch?.[1],
    message: mentionMatch ? withoutQuote.slice(mentionMatch[0].length) : withoutQuote,
    quote: quoteMatch?.[2],
    source: quoteMatch?.[1],
  };
}

function TaskActivityFileLink({ fileId, fileName, onOpen }: { fileId?: string; fileName: string; onOpen: (fileId: string) => void }) {
  return <button aria-label={fileId ? `查看文件：${fileName}` : `文件不可用：${fileName}`} className="activity-message-source" disabled={!fileId} onClick={() => { if (fileId) onOpen(fileId); }} type="button">
    <FileText aria-hidden="true" size={11} /><span>{fileName}</span>
  </button>;
}

export function TaskDetail({
  childTasks = [],
  currentUser = "周岚",
  currentUserId = "周岚",
  initialAttentionTarget = null,
  initialProposedOwnerId,
  members,
  onInitialAttentionTargetHandled,
  onOpenRelatedTask,
  onOwnerChange,
  onOwnerProposalChange,
  onParticipantsChange,
  onPathSelect,
  onTagsChange,
  onTaskAppearanceChange,
  onTaskPeriodChange,
  onTaskStatusChange,
  parentTask,
  pathItems,
  plannedEndOn,
  plannedStartOn,
  tagDefinitions = [],
  tags = [],
  task,
  taskId,
}: TaskDetailProps) {
  const relationCount = childTasks.length + (parentTask ? 1 : 0);
  const folders = task.files.filter((node) => node.kind === "folder");
  const rootFolders = folders.filter((folder) => folder.parentId === null);
  const firstFile = task.files.find((node) => node.kind === "file");
  const fileCount = task.files.filter((node) => node.kind === "file").length;
  const initialTab: TaskDetailTab = initialAttentionTarget?.kind === "file"
    ? "files"
    : initialAttentionTarget?.kind === "activity" || initialAttentionTarget?.kind === "commit"
      ? "activity"
      : "overview";

  const [activeTab, setActiveTab] = useState<TaskDetailTab>(initialTab);
  const [currentOwner, setCurrentOwner] = useState([task.owner]);
  const [pendingOwnerId, setPendingOwnerId] = useState(initialProposedOwnerId);
  const [currentParticipants, setCurrentParticipants] = useState(task.participants);
  const [participantInvitationStatus, setParticipantInvitationStatus] = useState<Record<string, PersonInvitationStatus>>(() => Object.fromEntries(task.participants.map((id) => [id, task.participantInvitationStatus?.[id] ?? "accepted"])));
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [activities, setActivities] = useState(task.activities);
  const [activityFilter, setActivityFilter] = useState<TaskActivityFilter>("all");
  const [selectedFileId, setSelectedFileId] = useState(initialAttentionTarget?.kind === "file" ? initialAttentionTarget.targetId : firstFile?.id ?? "");
  const [expandedFolders, setExpandedFolders] = useState(() => new Set(folders.map((folder) => folder.id)));
  const [selectionDraft, setSelectionDraft] = useState<{ location: string; source: string; text: string; x: number; y: number } | null>(null);
  const [selectionQuestion, setSelectionQuestion] = useState("");
  const [activityMention, setActivityMention] = useState("");
  const [replyingToActivityId, setReplyingToActivityId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [aiRequest, setAiRequest] = useState<AiConnectionRequest | null>(null);

  const confirmedOwnerId = currentOwner[0] ?? task.owner;
  const displayedOwnerId = pendingOwnerId ?? confirmedOwnerId;
  const ownerInvitationStatus: PersonInvitationStatus = pendingOwnerId ? "pending" : "accepted";
  const participantMembers = useMemo(() => members.filter((member) => !currentOwner.includes(member.id)), [currentOwner, members]);
  const activityPeople = Array.from(new Set([currentOwner[0] ?? task.owner, ...currentParticipants]));
  const selectedFile = task.files.find((node) => node.id === selectedFileId && node.kind === "file");
  const rootActivities = activities.filter((activity) => !activity.replyToActivityId);
  const latestAiInsight = rootActivities.find((activity) => activity.type === "ai-insight");
  const insightSourceFile = latestAiInsight?.file ? task.files.find((node) => node.kind === "file" && node.name === latestAiInsight.file) : undefined;
  const taskActivityItems = [
    ...rootActivities.map((activity) => ({ id: `activity:${activity.id}`, kind: "activity" as const, activity })),
    ...task.commits.map((commit) => ({ id: `commit:${commit.id}`, kind: "commit" as const, commit })),
  ];
  const activityFilterOptions = Array.from(new Set(taskActivityItems.map((item) => item.kind === "commit" ? "code-commit" as const : item.activity.type)));
  const filteredTaskActivityItems = taskActivityItems.filter((item) => activityFilter === "all"
    || (item.kind === "commit" ? activityFilter === "code-commit" : item.activity.type === activityFilter));

  useEffect(() => {
    if (!initialAttentionTarget) return;
    if (initialAttentionTarget.kind === "file") {
      setSelectedFileId(initialAttentionTarget.targetId);
      setActiveTab("files");
      const timer = window.setTimeout(() => {
        document.getElementById(`task-file-${initialAttentionTarget.targetId}`)?.focus({ preventScroll: true });
        onInitialAttentionTargetHandled?.();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (initialAttentionTarget.kind === "insight") {
      setActiveTab("overview");
      const timer = window.setTimeout(() => {
        const target = document.getElementById("task-overview-insights");
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        target?.focus({ preventScroll: true });
        onInitialAttentionTargetHandled?.();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    setActiveTab("activity");
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`task-${initialAttentionTarget.kind}-${initialAttentionTarget.targetId}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
      onInitialAttentionTargetHandled?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialAttentionTarget, onInitialAttentionTargetHandled]);

  useEffect(() => {
    if (activeTab === "relations" && relationCount === 0) setActiveTab("overview");
  }, [activeTab, relationCount]);

  const changeOwner = (value: string[]) => {
    const nextOwnerId = value[0];
    if (!nextOwnerId) return;
    if (onOwnerProposalChange) {
      const proposal = nextOwnerId === (currentOwner[0] ?? task.owner) ? undefined : nextOwnerId;
      setPendingOwnerId(proposal);
      onOwnerProposalChange(proposal);
      return;
    }
    setCurrentOwner(value);
    setCurrentParticipants((items) => items.filter((id) => !value.includes(id)));
    setParticipantInvitationStatus((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !value.includes(id))));
    onOwnerChange?.(value);
  };

  const changeParticipants = (value: string[]) => {
    setParticipantInvitationStatus((current) => Object.fromEntries(value.map((id) => [id, current[id] ?? "pending"])));
    setCurrentParticipants(value);
    onParticipantsChange?.(value);
  };

  const changeStatus = (value: TaskStatus) => {
    if (!onTaskStatusChange || currentUserId !== confirmedOwnerId) return;
    setCurrentStatus(value);
    onTaskStatusChange(value);
  };

  const appendActivity = (message: string, replyToActivityId?: string) => {
    const activity: TaskActivityMock = {
      id: crypto.randomUUID(),
      author: currentUser,
      message,
      time: "刚刚",
      type: replyToActivityId ? "member-reply" : "member-post",
      ...(replyToActivityId ? { replyToActivityId } : {}),
    };
    setActivities((items) => [activity, ...items]);
  };

  const toggleFolder = (id: string) => setExpandedFolders((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const openFile = (id: string) => {
    setSelectedFileId(id);
    setActiveTab("files");
    window.setTimeout(() => document.getElementById(`task-file-${id}`)?.focus({ preventScroll: true }), 0);
  };

  const captureFileSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || !selectedFile) return;
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    if (!rect) return;
    setSelectionDraft({
      location: "文件正文选区",
      source: selectedFile.name,
      text: text.slice(0, 600),
      x: Math.max(12, Math.min(window.innerWidth - 414, rect.left)),
      y: Math.max(12, Math.min(window.innerHeight - 220, rect.bottom + 10)),
    });
  };

  const publishSelectionActivity = () => {
    if (!selectionDraft) return;
    const mention = activityMention ? `@${activityMention} ` : "";
    const question = selectionQuestion.trim() || "这段信息会影响当前结论，请确认应该如何处理。";
    appendActivity(`${mention}${question}\n\n引用「${selectionDraft.source}」：${selectionDraft.text}`);
    setSelectionDraft(null);
    setSelectionQuestion("");
    setActivityMention("");
    window.getSelection()?.removeAllRanges();
    setActiveTab("activity");
  };

  const publishReply = (activityId: string) => {
    if (!replyDraft.trim()) return;
    appendActivity(replyDraft.trim(), activityId);
    setReplyDraft("");
    setReplyingToActivityId(null);
  };

  const tabs: Array<{ count?: number; id: TaskDetailTab; label: string }> = [
    { id: "overview", label: "概览" },
    ...(relationCount > 0 ? [{ count: relationCount, id: "relations" as const, label: "关联任务" }] : []),
    { count: fileCount, id: "files", label: "文件" },
    { count: taskActivityItems.length, id: "activity", label: "活动" },
  ];

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: TaskDetailTab) => {
    const currentIndex = tabs.findIndex((item) => item.id === currentTab);
    const nextIndex = event.key === "ArrowRight"
      ? (currentIndex + 1) % tabs.length
      : event.key === "ArrowLeft"
        ? (currentIndex - 1 + tabs.length) % tabs.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    window.requestAnimationFrame(() => document.getElementById(`task-detail-tab-${nextTab.id}`)?.focus({ preventScroll: true }));
  };

  return <section className="task-detail-view">
    <header className="task-detail-header">
      <div className="task-detail-kicker">{pathItems?.length ? <nav aria-label="任务路径" className="task-detail-path">{pathItems.map((item, index) => <span key={item.id}>
        {index > 0 && <ChevronRight aria-hidden="true" size={12} />}
        {index < pathItems.length - 1 ? <button onClick={() => onPathSelect?.(item.id)} type="button">{item.label}</button> : <em aria-current="page">{item.label}</em>}
      </span>)}</nav> : null}</div>
      <div className="task-detail-title-row">
        {onTaskAppearanceChange ? <TaskAppearancePicker iconName={task.iconName} onChange={onTaskAppearanceChange} tone={task.iconTone} /> : <TaskIcon iconName={task.iconName} size="lg" tone={task.iconTone} />}
        <h1>{task.title}</h1>
      </div>
      <p className="task-detail-goal">{task.goal}</p>
      <div className="task-detail-tags">
        <Tag size={14} />
        <span className="task-detail-tag-label">标签</span>
        {tags.map((name) => {
          const definition = findTagByName(tagDefinitions, name);
          return definition ? <TagBadge key={definition.id} onRemove={onTagsChange ? () => onTagsChange(tags.filter((item) => item !== name)) : undefined} size="sm" tag={definition} /> : null;
        })}
        <TagPicker onChange={(names) => onTagsChange?.(names)} selected={tags} tags={tagDefinitions} />
      </div>
      <div className="task-overview-meta">
        <div className="task-overview-people"><div className="task-overview-role-selectors">
          <div className="task-overview-person-group"><small>任务 Owner</small><MemberSelector disabled={!onOwnerChange && !onOwnerProposalChange} hideHeader invitationStatusById={{ [displayedOwnerId]: ownerInvitationStatus }} label="任务 Owner" max={1} members={members} min={1} onChange={changeOwner} selected={[displayedOwnerId]} /></div>
          <div className="task-overview-person-group"><small>参与者</small><MemberSelector hideHeader invitationStatusById={participantInvitationStatus} label="参与者" max={3} members={participantMembers} onChange={changeParticipants} selected={currentParticipants} /></div>
        </div></div>
        <div className="task-overview-state"><TaskStatusBadge editable={Boolean(onTaskStatusChange) && currentUserId === confirmedOwnerId} onChange={changeStatus} value={currentStatus} /></div>
        <TaskDateRangePicker initialEnd={plannedEndOn ?? (task.due !== "—" ? "2026-08-28" : "")} initialStart={plannedStartOn ?? (task.due !== "—" ? "2026-08-18" : "")} key={`${taskId}:${plannedStartOn}:${plannedEndOn}:${task.due}`} onChange={onTaskPeriodChange} />
      </div>
    </header>

    <div aria-label="任务详情" className="task-detail-tabs" role="tablist">{tabs.map(({ count, id, label }) => <button
      aria-controls={`task-detail-panel-${id}`}
      aria-selected={activeTab === id}
      className={activeTab === id ? "active" : ""}
      id={`task-detail-tab-${id}`}
      key={id}
      onClick={() => setActiveTab(id)}
      onKeyDown={(event) => handleTabKeyDown(event, id)}
      role="tab"
      tabIndex={activeTab === id ? 0 : -1}
      type="button"
    ><span>{label}</span>{count !== undefined && <small>{count}</small>}</button>)}</div>

    {activeTab === "overview" && <div aria-labelledby="task-detail-tab-overview" className="task-minimal-overview" id="task-detail-panel-overview" role="tabpanel">
      <section aria-labelledby="task-overview-progress-heading" className="task-detail-section first-section task-overview-progress" id="task-overview-progress">
        <div className="task-section-heading"><h2 id="task-overview-progress-heading">当前进展</h2><TaskStatusBadge value={currentStatus} /></div>
        <p className="task-overview-progress-summary">{task.summary}</p>
        <div aria-label="任务概况" className="task-overview-progress-facts">
          <span><strong>{fileCount}</strong><small>文件</small></span>
          <span><strong>{taskActivityItems.length}</strong><small>活动</small></span>
          <span><strong>{relationCount}</strong><small>关联任务</small></span>
        </div>
        <p className="task-section-intro">{currentStatus === "已完成" ? "任务已完成；新的结果或问题可以继续记录在活动中。" : "围绕任务目标继续推进，重要结果与问题记录在活动中。"}</p>
      </section>
      <section aria-labelledby="task-overview-insights-heading" className="task-detail-section task-overview-insights" id="task-overview-insights" tabIndex={-1}>
        <div className="task-section-heading"><h2 id="task-overview-insights-heading"><Bot aria-hidden="true" size={18} />AI 建议</h2><span className="task-overview-insight-source"><Bot aria-hidden="true" size={13} />基于当前任务可见事实</span></div>
        {latestAiInsight ? <article className="task-overview-insight tone-inference">
          <span aria-hidden="true" className="task-overview-insight-icon"><Bot size={15} /></span>
          <div className="task-overview-insight-content">
            <div className="task-overview-insight-label"><small>需要关注</small><em>不自动改动任务</em></div>
            <strong>{parseActivityDetail(latestAiInsight.message).message}</strong>
            <span className="task-overview-insight-evidence"><small>依据</small>{insightSourceFile ? `${insightSourceFile.name} · ${insightSourceFile.updatedAt}` : `任务活动 · ${latestAiInsight.time}`}</span>
          </div>
          <aside aria-label="建议操作"><div className="task-overview-insight-actions"><Button onClick={() => insightSourceFile ? openFile(insightSourceFile.id) : setActiveTab("activity")} size="xs" type="button">{insightSourceFile ? "查看依据" : "查看活动"}<ArrowRight data-icon="inline-end" /></Button></div></aside>
        </article> : <p className="task-section-intro">当前没有基于可见事实触发的新建议。</p>}
      </section>
    </div>}

    {activeTab === "relations" && <div aria-labelledby="task-detail-tab-relations" id="task-detail-panel-relations" role="tabpanel">
      <TaskRelationsSection childTasks={childTasks} onOpenTask={onOpenRelatedTask} parentTask={parentTask} />
    </div>}

    {activeTab === "files" && <section aria-labelledby="task-detail-tab-files" className="task-detail-section first-section" id="task-detail-panel-files" role="tabpanel">
      <div className="task-section-heading"><h2>文件</h2><span>{rootFolders.length} 个一级文件夹 · {fileCount} 个文件</span></div>
      <p className="task-section-intro">查看当前任务关联的文件；选中正文，可带着原文向协作者发起对话。</p>
      <div className="task-file-browser">
        <aside className="task-file-tree"><FileTreeBranch expanded={expandedFolders} level={0} nodes={task.files} onSelect={setSelectedFileId} onToggle={toggleFolder} parentId={null} selectedId={selectedFileId} /></aside>
        <article className="task-file-preview">{selectedFile ? <>
          <header><File size={16} /><div><strong>{selectedFile.name}</strong><small>{selectedFile.format} · 更新于 {selectedFile.updatedAt}</small></div></header>
          <TaskFileDocumentViewer file={selectedFile} onSelectText={captureFileSelection} />
          <footer className="task-file-selection-hint"><AtSign size={13} />选中一段正文，可带着来源向协作者发起对话。</footer>
        </> : <div className="task-file-empty">请选择一个文件</div>}</article>
      </div>
      {selectionDraft && <div className="selection-discussion-composer" style={{ left: selectionDraft.x, top: selectionDraft.y }}>
        <div className="selection-discussion-quote"><span><small>{selectionDraft.source} · {selectionDraft.location}</small><q>{selectionDraft.text}</q></span></div>
        <div className="selection-discussion-body">
          <div className="selection-discussion-mentions"><AtSign size={12} />{activityPeople.filter((person) => person !== currentUser).map((person) => <button aria-pressed={activityMention === person} className={activityMention === person ? "active" : ""} key={person} onClick={() => setActivityMention(activityMention === person ? "" : person)} type="button"><PersonAvatar name={person} size="xs" />{person}</button>)}</div>
          <input aria-label="围绕选中内容提出问题" onChange={(event) => setSelectionQuestion(event.target.value)} placeholder="你希望协作者确认什么？" value={selectionQuestion} />
          <button className="selection-discussion-send" onClick={publishSelectionActivity} type="button">发起对话<Send size={12} /></button>
          <button className="selection-discussion-cancel" onClick={() => { setSelectionDraft(null); setSelectionQuestion(""); window.getSelection()?.removeAllRanges(); }} type="button">取消</button>
        </div>
      </div>}
    </section>}

    {activeTab === "activity" && <section aria-labelledby="task-detail-tab-activity" className="task-detail-section task-activity-section first-section" id="task-detail-panel-activity" role="tabpanel">
      <div className="task-section-heading"><h2>任务活动</h2><span>{taskActivityItems.length} 条活动</span></div>
      <p className="task-section-intro">记录进展、问题、任务调整与代码提交；关联文件保留可追溯来源。</p>
      <div className="task-activity-composer"><MentionComposer actionLabel="发布" onSubmit={(message) => appendActivity(message)} people={activityPeople.filter((person) => person !== currentUser)} placeholder="分享进展或提出问题，使用 @ 提及协作者…" /></div>
      <div className="task-activity-toolbar">
        <Select onValueChange={(value) => setActivityFilter(String(value) as TaskActivityFilter)} value={activityFilter}>
          <SelectTrigger aria-label="筛选活动类型" className="task-activity-filter-select" size="sm"><SelectValue>{activityFilter === "all" ? "全部类型" : activityTypeLabels[activityFilter]}</SelectValue></SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}><SelectItem value="all">全部类型</SelectItem>{activityFilterOptions.map((type) => <SelectItem key={type} value={type}>{activityTypeLabels[type]}</SelectItem>)}</SelectContent>
        </Select>
        <span>显示 {filteredTaskActivityItems.length} / {taskActivityItems.length} 条</span>
      </div>
      {taskActivityItems.length === 0 ? <div className="task-file-empty">还没有任务活动</div> : filteredTaskActivityItems.length === 0 ? <div className="task-file-empty">没有符合当前筛选条件的活动</div> : <ol className="task-activity-feed">{filteredTaskActivityItems.map((timelineItem) => {
        if (timelineItem.kind === "commit") {
          const { commit } = timelineItem;
          return <li className="activity-message commit-event" id={`task-commit-${commit.id}`} key={timelineItem.id} tabIndex={-1}>
            <PersonAvatar name={commit.author} size="sm" />
            <div className="activity-message-content"><header><strong>{commit.author}</strong><span className="activity-event-kind code-commit">代码提交</span><time>{commit.time}</time></header>
              <p>{commit.message}</p>
              {commit.files.length > 0 && <div className="task-commit-files">{commit.files.map((fileName) => {
                const file = task.files.find((item) => item.kind === "file" && item.name === fileName);
                return <TaskActivityFileLink fileId={file?.id} fileName={fileName} key={fileName} onOpen={openFile} />;
              })}</div>}
            </div>
          </li>;
        }
        const item = timelineItem.activity;
        const activityDetail = parseActivityDetail(item.message);
        const replies = activities.filter((activity) => activity.replyToActivityId === item.id);
        const activityFile = item.file ? task.files.find((node) => node.kind === "file" && node.name === item.file) : undefined;
        return <li className="activity-message" id={`task-activity-${item.id}`} key={timelineItem.id} tabIndex={-1}>
          {item.type === "ai-insight" ? <span className="task-activity-ai"><Bot aria-hidden="true" size={14} /></span> : <PersonAvatar name={item.author} size="sm" />}
          <div className="activity-message-content"><header>
            <strong>{item.author}</strong>
            <span className={`activity-event-kind ${item.type}`}>{item.type === "ai-insight" && <Sparkles aria-hidden="true" size={10} />}{activityTypeLabels[item.type]}</span>
            {activityDetail.mention && <span className="activity-message-mention">@{activityDetail.mention}</span>}
            <time>{item.time}</time>
            <Button aria-label={`连接 AI 处理 ${item.author} 的活动`} className="activity-ai-action ai-connect-icon-button" onClick={() => setAiRequest({
              title: "处理任务活动",
              description: "把当前活动和最小任务上下文带到个人 Agent。",
              instruction: `分析这条任务活动并给出可核对的下一步：${activityDetail.message}`,
              expectedOutput: "一份保留来源、区分事实与建议的处理结果",
              context: [{ label: "任务", value: task.title }, { label: "作者", value: item.author }, ...(item.file ? [{ label: "关联文件", value: item.file }] : [])],
              workObject: { kind: "任务活动", title: `${item.author} 的活动`, content: activityDetail.message, meta: activityDetail.source },
            })} size="icon-sm" title="连接 AI" type="button" variant="ai"><Sparkles aria-hidden="true" /></Button>
          </header>
            <p>{activityDetail.message}</p>
            {activityDetail.quote && <button className="activity-inline-reference" onClick={() => { const file = task.files.find((node) => node.name === activityDetail.source); if (file) openFile(file.id); }} type="button"><q>{activityDetail.quote}</q><span className="activity-inline-reference-footer"><small><Link2 size={10} />{activityDetail.source}</small><span className="activity-inline-reference-action">查看原文<ArrowRight size={11} /></span></span></button>}
            {item.file && !activityDetail.quote && <TaskActivityFileLink fileId={activityFile?.id} fileName={item.file} onOpen={openFile} />}
            <button className="activity-replies-toggle" onClick={() => setReplyingToActivityId(replyingToActivityId === item.id ? null : item.id)} type="button">{replies.length ? `${replies.length} 条回复` : "回复"}</button>
            {replies.length > 0 && <div className="activity-replies">{replies.map((reply) => <article className="activity-reply" key={reply.id}><PersonAvatar name={reply.author} size="xs" /><div><header><strong>{reply.author}</strong><span>回复 <b>{item.author}</b></span><time>{reply.time}</time></header><p>{reply.message}</p></div></article>)}</div>}
            {replyingToActivityId === item.id && <div className="activity-reply-composer"><PersonAvatar name={currentUser} size="xs" /><input aria-label={`回复 ${item.author}`} autoFocus onChange={(event) => setReplyDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") publishReply(item.id); }} placeholder={`回复 ${item.author}…`} value={replyDraft} /><button aria-label="发送回复" className="send-reply-button" disabled={!replyDraft.trim()} onClick={() => publishReply(item.id)} type="button"><Send size={13} /></button><button aria-label="取消回复" onClick={() => { setReplyingToActivityId(null); setReplyDraft(""); }} type="button"><X size={13} /></button></div>}
          </div>
        </li>;
      })}</ol>}
    </section>}

    {aiRequest && <AiConnectionDialog onClose={() => setAiRequest(null)} onConnect={() => setAiRequest(null)} request={aiRequest} />}
  </section>;
}
