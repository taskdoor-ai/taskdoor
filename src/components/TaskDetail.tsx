import { Activity, Bot, Check, ChevronDown, ChevronRight, Circle, File, FileText, Folder, GitCommitHorizontal, ListTodo, MessageSquare, Send, Tag, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { taskDetailMocks, type TaskDetailId, type TaskFileNode } from "../data/taskDetailMocks";
import { findTagByName, type TagGroup } from "../data/tagGroups";
import { TagBadge } from "./TagBadge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./ui/select";
import { MemberSelector, type Member } from "./MemberSelector";
import { PersonAvatar } from "./PersonAvatar";
import { TaskDateRangePicker } from "./TaskDateRangePicker";
import { TaskStatusBadge, type TaskStatus } from "./TaskStatusBadge";

type TaskDetailProps = {
  contextIds?: string[];
  currentUser?: string;
  members: Member[];
  onOwnerChange?: (owner: string[]) => void;
  onParticipantsChange?: (participants: string[]) => void;
  owner?: string[];
  participants?: string[];
  pathLabels?: string[];
  plannedTodoKeys?: string[];
  taskId: TaskDetailId;
  taskGoal?: string;
  taskStatus?: TaskStatus;
  taskTitle?: string;
  tagGroups?: TagGroup[];
  tags?: string[];
  onTaskStatusChange?: (status: TaskStatus) => void;
  onTaskTitleChange?: (title: string) => void;
  onTagsChange?: (tags: string[]) => void;
};

function FileTreeBranch({ expanded, level, nodes, onSelect, onToggle, parentId, selectedId }: { expanded: Set<string>; level: number; nodes: TaskFileNode[]; onSelect: (id: string) => void; onToggle: (id: string) => void; parentId: string | null; selectedId: string }) {
  return <>{nodes.filter((node) => node.parentId === parentId).map((node) => node.kind === "folder" ? <div key={node.id}>
    <button className="task-file-tree-folder" onClick={() => onToggle(node.id)} style={{ paddingLeft: 10 + level * 16 }} type="button">{expanded.has(node.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}<Folder size={14} /><span>{node.name}</span></button>
    {expanded.has(node.id) && <FileTreeBranch expanded={expanded} level={level + 1} nodes={nodes} onSelect={onSelect} onToggle={onToggle} parentId={node.id} selectedId={selectedId} />}
  </div> : <button className={`task-file-tree-file ${selectedId === node.id ? "active" : ""}`} key={node.id} onClick={() => onSelect(node.id)} style={{ paddingLeft: 31 + level * 16 }} type="button"><FileText size={14} /><span><strong>{node.name}</strong><small>{node.format} · {node.updatedAt}</small></span></button>)}</>;
}

export function TaskDetail({ currentUser = "周岚", members, onOwnerChange, onParticipantsChange, onTaskStatusChange, onTagsChange, owner, participants, pathLabels, tagGroups = [], tags = [], taskGoal, taskId, taskStatus, taskTitle }: TaskDetailProps) {
  const mock = taskDetailMocks[taskId];
  const task = { ...mock, goal: taskGoal ?? mock.goal, status: taskStatus ?? mock.status, title: taskTitle ?? mock.title };
  const [activeTab, setActiveTab] = useState<"overview" | "files" | "todos" | "activity" | "commits">("overview");
  const [currentOwner, setCurrentOwner] = useState(owner?.length ? owner : [task.owner]);
  const [currentParticipants, setCurrentParticipants] = useState(participants ?? task.participants);
  const [todos, setTodos] = useState(task.todos);
  const [activities, setActivities] = useState(task.activities);
  const [message, setMessage] = useState("");
  const [tagPickerValue, setTagPickerValue] = useState("");
  const folders = task.files.filter((node) => node.kind === "folder");
  const firstFile = task.files.find((node) => node.kind === "file");
  const [selectedFileId, setSelectedFileId] = useState(firstFile?.id ?? "");
  const [expandedFolders, setExpandedFolders] = useState(() => new Set(folders.map((folder) => folder.id)));
  const selectedFile = task.files.find((node) => node.id === selectedFileId && node.kind === "file");
  const fileCount = task.files.filter((node) => node.kind === "file").length;
  const rootFolders = folders.filter((folder) => folder.parentId === null);
  const recentFiles = task.files.filter((node) => node.kind === "file").slice(-3);
  const incompleteTodos = todos.filter((todo) => todo.status !== "已完成");
  const participantMembers = useMemo(() => members.filter((member) => !currentOwner.includes(member.id)), [currentOwner, members]);
  const changeOwner = (value: string[]) => { setCurrentOwner(value); setCurrentParticipants((items) => items.filter((id) => !value.includes(id))); onOwnerChange?.(value); };
  const changeParticipants = (value: string[]) => { setCurrentParticipants(value); onParticipantsChange?.(value); };
  const toggleFolder = (id: string) => setExpandedFolders((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const openFile = (id: string) => { setSelectedFileId(id); setActiveTab("files"); };
  const publish = () => { if (!message.trim()) return; setActivities((items) => [{ id: crypto.randomUUID(), author: currentUser, message: message.trim(), time: "刚刚", type: "human" }, ...items]); setMessage(""); };

  return <section className="task-detail-view">
    <header className="task-detail-header">
      <div className="task-detail-kicker">{pathLabels?.length ? <nav aria-label="任务路径" className="task-detail-path">{pathLabels.map((label, index) => <span key={`${label}-${index}`}>{index > 0 && <ChevronRight size={12} />}<em>{label}</em></span>)}</nav> : null}</div>
      <div className="task-detail-title-row"><span aria-hidden="true" className="task-card-status-icon task-detail-task-icon"><ListTodo /></span><h1>{task.title}</h1></div>
      <p className="task-detail-goal">{task.goal}</p>
      <div className="task-detail-tags"><Tag size={14} /><span className="task-detail-tag-label">标签</span>{tags.map((name) => { const definition = findTagByName(tagGroups, name); return definition ? <TagBadge key={definition.id} onRemove={() => onTagsChange?.(tags.filter((item) => item !== name))} size="sm" tag={definition} /> : null; })}<Select onValueChange={(value) => { const name = value as string; if (name && !tags.includes(name)) onTagsChange?.([...tags, name]); setTagPickerValue(""); }} value={tagPickerValue || null}><SelectTrigger aria-label="添加标签" className="task-tag-select" size="sm"><SelectValue placeholder="添加标签" /></SelectTrigger><SelectContent align="start">{tagGroups.map((group) => <SelectGroup key={group.id}><SelectLabel>{group.name}</SelectLabel>{group.tags.filter((item) => !tags.includes(item.name)).map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectGroup>)}</SelectContent></Select></div>
      <div className="task-overview-meta"><div className="task-overview-people"><div className="task-overview-role-selectors"><div className="task-overview-person-group"><small>拥有者</small><MemberSelector hideHeader label="拥有者" max={1} members={members} onChange={changeOwner} selected={currentOwner} /></div><div className="task-overview-person-group"><small>参与者</small><MemberSelector hideHeader label="参与者" max={3} members={participantMembers} onChange={changeParticipants} selected={currentParticipants} /></div></div></div><div className="task-overview-state"><TaskStatusBadge editable onChange={onTaskStatusChange} value={task.status} /></div><TaskDateRangePicker initialEnd="2026-08-28" initialStart="2026-08-18" key={taskId} /></div>
    </header>

    <nav aria-label="任务详情" className="task-detail-tabs">{[
      ["overview", "概览", ""], ["files", "文件", String(fileCount)], ["todos", "子任务", String(incompleteTodos.length)], ["activity", "动态", String(activities.length)], ["commits", "提交记录", String(task.commits.length)],
    ].map(([id, label, count]) => <button aria-selected={activeTab === id} className={activeTab === id ? "active" : ""} key={id} onClick={() => setActiveTab(id as typeof activeTab)} role="tab" type="button"><span>{label}</span>{count && <small>{count}</small>}</button>)}</nav>

    {activeTab === "overview" && <div className="task-minimal-overview">
      <section className="task-detail-section first-section"><div className="task-section-heading"><h2>任务概览</h2></div><p className="task-section-intro">围绕目标、责任、文件和子任务推进；任务可以从个人事项按需生长为多层协作结构。</p><div className="task-overview-summary-grid"><article><small>当前状态</small><strong>{task.status}</strong><p>{task.summary}</p></article><article><small>待处理子任务</small><strong>{incompleteTodos.length} 项</strong><p>{incompleteTodos[0]?.title ?? "当前没有待处理子任务"}</p></article><article><small>文件</small><strong>{fileCount} 个</strong><p>{folders.length} 个文件夹，支持按需获取</p></article></div></section>
      <section className="task-detail-section"><div className="task-section-heading"><h2>我的当前责任</h2><button onClick={() => setActiveTab("todos")} type="button">查看子任务 <ChevronRight size={12} /></button></div><div className="task-current-responsibility"><PersonAvatar name={currentOwner[0] ?? task.owner} size="md" /><div><small>{currentOwner[0] ?? task.owner} 当前负责</small><strong>{incompleteTodos.find((todo) => todo.assignee === (currentOwner[0] ?? task.owner))?.title ?? "跟进任务目标与验收结果"}</strong><p>{incompleteTodos.find((todo) => todo.assignee === (currentOwner[0] ?? task.owner))?.file ?? "请在文件与动态中补充最新依据"}</p></div></div></section>
      <section className="task-detail-section"><div className="task-section-heading"><h2>最近文件</h2><button onClick={() => setActiveTab("files")} type="button">查看全部 <ChevronRight size={12} /></button></div><div className="task-recent-files">{recentFiles.map((file) => <button key={file.id} onClick={() => openFile(file.id)} type="button"><FileText size={15} /><span><strong>{file.name}</strong><small>{file.format} · {file.updatedAt}</small></span><ChevronRight size={13} /></button>)}</div></section>
      <section className="task-detail-section"><div className="task-section-heading"><h2>验收条件</h2></div><ul className="task-acceptance-list">{task.acceptance.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul></section>
    </div>}

    {activeTab === "files" && <section className="task-detail-section first-section"><div className="task-section-heading"><h2>任务文件</h2><span>{rootFolders.length} 个一级文件夹 · {fileCount} 个文件</span></div><p className="task-section-intro">文件支持多层级组织；规则、证据和成果保留在同一任务目录中。</p><div className="task-file-browser"><aside className="task-file-tree"><FileTreeBranch expanded={expandedFolders} level={0} nodes={task.files} onSelect={setSelectedFileId} onToggle={toggleFolder} parentId={null} selectedId={selectedFileId} /></aside><article className="task-file-preview">{selectedFile ? <><header><File size={16} /><div><strong>{selectedFile.name}</strong><small>{selectedFile.format} · 更新于 {selectedFile.updatedAt}</small></div></header><pre>{selectedFile.content}</pre></> : <div className="task-file-empty">请选择一个文件</div>}</article></div></section>}

    {activeTab === "todos" && <section className="task-detail-section first-section"><div className="task-section-heading"><h2>子任务</h2><span>{incompleteTodos.length} 项待处理</span></div><p className="task-section-intro">子任务仍然是任务，可继续拆解，并关联完成所需的文件与证据。</p><div className="task-simple-todos">{todos.map((todo) => <article key={todo.id}><button aria-label={`切换子任务：${todo.title}`} onClick={() => setTodos((items) => items.map((item) => item.id === todo.id ? { ...item, status: item.status === "已完成" ? "待处理" : "已完成" } : item))} type="button">{todo.status === "已完成" ? <Check size={12} /> : <Circle size={12} />}</button><div><strong>{todo.title}</strong><p><PersonAvatar name={todo.assignee} size="xs" />{todo.assignee}<span>{todo.due}</span><button onClick={() => { const file = task.files.find((item) => item.name === todo.file); if (file) openFile(file.id); }} type="button"><FileText size={11} />{todo.file}</button></p></div><em>{todo.status}</em></article>)}</div></section>}

    {activeTab === "activity" && <section className="task-detail-section first-section"><div className="task-section-heading"><h2>任务动态</h2></div><p className="task-section-intro">成员和 AI 围绕任务、待办及文件分享进展。</p><div className="task-activity-composer"><input onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") publish(); }} placeholder="分享进展或 @ 协作者" value={message} /><button disabled={!message.trim()} onClick={publish} type="button"><Send size={14} /></button></div><div className="task-simple-activities">{activities.map((item) => <article key={item.id}>{item.type === "ai" ? <span className="task-activity-ai"><Bot size={14} /></span> : <PersonAvatar name={item.author} size="sm" />}<div><strong>{item.author}<time>{item.time}</time></strong><p>{item.message}</p>{item.file && <button onClick={() => { const file = task.files.find((node) => node.name === item.file); if (file) openFile(file.id); }} type="button"><FileText size={11} />{item.file}</button>}</div></article>)}</div></section>}

    {activeTab === "commits" && <section className="task-detail-section first-section"><div className="task-section-heading"><h2>提交记录</h2></div><p className="task-section-intro">任务元数据、待办和文件的修改统一记录，保留操作者与时间。</p><div className="task-simple-commits">{task.commits.map((commit) => <article key={commit.id}><span><GitCommitHorizontal size={15} /></span><div><strong>{commit.message}</strong><p><PersonAvatar name={commit.author} size="xs" />{commit.author}<time>{commit.time}</time></p><ul>{commit.files.map((file) => <li key={file}><FileText size={11} />{file}</li>)}</ul></div></article>)}</div></section>}
  </section>;
}
