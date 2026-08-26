import { CheckSquare2, ChevronDown, ChevronRight, Folder, Home, Inbox, ListTodo, LogOut, Moon, PanelLeftClose, Search, Settings, Sparkles, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getChildren, workspaceRootId, type WorkspaceNode } from "../data/workspaceNodes";
import { demoTodoGroups, demoTodos } from "../data/demoTodos";
import { BrandMark } from "./BrandMark";
import { PersonAvatar } from "./PersonAvatar";

export type PrimarySection = "home" | "tasks" | "todos" | "ai" | "resources" | "settings";

type WorkspaceSidebarProps = {
  activeSection: PrimarySection;
  mobileOpen: boolean;
  nodes: WorkspaceNode[];
  onFolderSelect: (folderId: string) => void;
  onSecondaryCollapse: () => void;
  onSectionChange: (section: PrimarySection) => void;
  onTaskSelect: (taskId: string) => void;
  onTodoSelect: (todoId: string) => void;
  secondaryCollapsed: boolean;
  selectedFolderId: string;
  selectedTaskId: string | null;
  selectedTodoId: string;
  showSecondary: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
};

const primaryItems = [
  { id: "home" as const, icon: <Home size={18} />, label: "首页" },
  { id: "tasks" as const, icon: <ListTodo size={18} />, label: "任务" },
  { id: "todos" as const, icon: <CheckSquare2 size={18} />, label: "我的待办" },
  { id: "ai" as const, icon: <Sparkles size={19} />, label: "连接 AI" },
];

type FolderTreeProps = { level: number; nodes: WorkspaceNode[]; onSelect: (id: string) => void; onTaskSelect: (id: string) => void; selectedId: string; selectedTaskId: string | null };

function FolderTreeNode({ folder, level, nodes, onSelect, onTaskSelect, selectedId, selectedTaskId }: FolderTreeProps & { folder: Extract<WorkspaceNode, { kind: "folder" }> }) {
  const [open, setOpen] = useState(true);
  const hasChildren = getChildren(folder.id, nodes).some((node) => node.kind === "folder" || node.kind === "task");
  return <div><div className={`folder-tree-row ${selectedId === folder.id ? "active" : ""}`} style={{ paddingLeft: 10 + level * 16 }}><button aria-label={open ? `收起${folder.name}` : `展开${folder.name}`} className="folder-tree-toggle" disabled={!hasChildren} onClick={() => setOpen((value) => !value)} type="button">{hasChildren ? open ? <ChevronDown size={13} /> : <ChevronRight size={13} /> : <span />}</button><button className="folder-tree-select" onClick={() => onSelect(folder.id)} type="button"><Folder size={15} /><span>{folder.name}</span></button></div>{open && hasChildren && <FolderBranch folderId={folder.id} level={level + 1} nodes={nodes} onSelect={onSelect} onTaskSelect={onTaskSelect} selectedId={selectedId} selectedTaskId={selectedTaskId} />}</div>;
}

function FolderBranch({ folderId, level, nodes, onSelect, onTaskSelect, selectedId, selectedTaskId }: FolderTreeProps & { folderId: string }) {
  const folders = getChildren(folderId, nodes).filter((node) => node.kind === "folder");
  const tasks = getChildren(folderId, nodes).filter((node) => node.kind === "task");
  return <>
    {folderId === workspaceRootId && <button className={`folder-tree-root ${selectedId === folderId && !selectedTaskId ? "active" : ""}`} onClick={() => onSelect(folderId)} type="button"><Folder size={15} /><span>全部任务</span></button>}
    {folders.map((folder) => <FolderTreeNode folder={folder} key={folder.id} level={level} nodes={nodes} onSelect={onSelect} onTaskSelect={onTaskSelect} selectedId={selectedId} selectedTaskId={selectedTaskId} />)}
    {tasks.map((task) => <button className={`folder-tree-task ${selectedTaskId === task.id ? "active" : ""}`} key={task.id} onClick={() => onTaskSelect(task.id)} style={{ paddingLeft: 38 + level * 16 }} title={task.name} type="button"><ListTodo size={14} /><span>{task.name}</span></button>)}
  </>;
}

function TodoSidebar({ onCollapse, onTodoSelect, selectedTodoId }: { onCollapse: () => void; onTodoSelect: (todoId: string) => void; selectedTodoId: string }) {
  const [activeView, setActiveView] = useState<"pending" | "completed">("pending");
  const [query, setQuery] = useState("");
  const matchesView = (todo: (typeof demoTodos)[number]) => activeView === "completed" ? todo.status === "已完成" : todo.status !== "已完成";
  const visible = demoTodos.filter((todo) => matchesView(todo) && `${todo.title} ${todo.taskTitle} ${todo.taskPath}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = demoTodoGroups.map((group) => ({ ...group, todos: visible.filter((todo) => todo.taskId === group.taskId) })).filter((group) => group.todos.length);
  const changeView = (view: "pending" | "completed") => {
    setActiveView(view);
    const first = demoTodos.find((todo) => view === "completed" ? todo.status === "已完成" : todo.status !== "已完成");
    if (first) onTodoSelect(first.id);
  };
  return <aside className="secondary-sidebar todo-sidebar"><header className="secondary-header"><div className="secondary-title-row"><h2>我的待办</h2><span><button aria-label="收起目录" onClick={onCollapse} type="button"><PanelLeftClose size={16} /></button></span></div></header><label className="secondary-search"><Search size={15} /><input aria-label="搜索我的待办" onChange={(event) => setQuery(event.target.value)} placeholder="搜索" value={query} /></label><nav aria-label="我的待办目录" className="secondary-sections"><section><p>状态</p><button aria-pressed={activeView === "pending"} className={`secondary-item ${activeView === "pending" ? "active" : ""}`} onClick={() => changeView("pending")} type="button"><span className="secondary-item-icon"><Inbox size={16} /></span><span><strong>待处理</strong><small>{demoTodos.filter((todo) => todo.status !== "已完成").length}</small></span></button><button aria-pressed={activeView === "completed"} className={`secondary-item ${activeView === "completed" ? "active" : ""}`} onClick={() => changeView("completed")} type="button"><span className="secondary-item-icon"><CheckSquare2 size={16} /></span><span><strong>已完成</strong><small>{demoTodos.filter((todo) => todo.status === "已完成").length}</small></span></button></section><section className="sidebar-groups"><p>按关联任务</p>{groups.map((group) => <div className="sidebar-group" key={group.taskId}><div className="sidebar-group-trigger"><ChevronDown size={14} /><Folder size={14} /><span>{group.taskTitle}</span><small>{group.todos.length}</small></div><div className="sidebar-group-items">{group.todos.map((todo) => <button className={`sidebar-file-item todo-sidebar-item ${selectedTodoId === todo.id ? "active" : ""}`} key={todo.id} onClick={() => onTodoSelect(todo.id)} type="button"><span><CheckSquare2 size={14} /></span><p><strong>{todo.title}</strong><small>{todo.taskPath} · {todo.due}</small></p></button>)}</div></div>)}</section></nav></aside>;
}

export function WorkspaceSidebar({ activeSection, mobileOpen, nodes, onFolderSelect, onSecondaryCollapse, onSectionChange, onTaskSelect, onTodoSelect, secondaryCollapsed, selectedFolderId, selectedTaskId, selectedTodoId, showSecondary, theme, toggleTheme }: WorkspaceSidebarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const secondaryVisible = showSecondary && !secondaryCollapsed;

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (event: MouseEvent) => { if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userMenuOpen]);

  return <div className={`workspace-nav ${mobileOpen ? "open" : ""} ${secondaryVisible ? "with-secondary" : "rail-only"}`}>
    <aside aria-label="一级导航" className="primary-rail">
      <button aria-label="Agentdoor 首页" className="rail-brand" onClick={() => onSectionChange("home")} type="button"><BrandMark /></button>
      <nav>{primaryItems.map((item) => <button aria-label={item.label} className={`rail-item ${item.id === "ai" ? "rail-connect-ai" : ""} ${activeSection === item.id ? "active" : ""}`} key={item.id} onClick={() => onSectionChange(item.id)} title={item.label} type="button">{item.icon}</button>)}</nav>
      <div className="rail-bottom"><button aria-label="切换主题" className="rail-item" onClick={toggleTheme} type="button">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button><div className="rail-user-dropdown" ref={userMenuRef}>{userMenuOpen && <div className="rail-user-menu"><header><PersonAvatar name="周岚" size="sm" /><span><strong>周岚</strong><small>产品负责人</small></span></header><div className="rail-user-menu-actions"><button onClick={() => { onSectionChange("settings"); setUserMenuOpen(false); }} type="button"><Settings size={15} />标签管理</button><button className="danger" type="button"><LogOut size={15} />退出登录</button></div></div>}<button className="rail-user-trigger" onClick={() => setUserMenuOpen((value) => !value)} type="button"><PersonAvatar name="周岚" size="sm" status="online" /></button></div></div>
    </aside>
    {secondaryVisible && activeSection === "todos" && <TodoSidebar onCollapse={onSecondaryCollapse} onTodoSelect={onTodoSelect} selectedTodoId={selectedTodoId} />}
    {secondaryVisible && activeSection !== "todos" && <aside className="secondary-sidebar workspace-folder-sidebar"><header className="secondary-header"><div className="secondary-title-row"><h2>任务</h2><span><button aria-label="收起目录" onClick={onSecondaryCollapse} type="button"><PanelLeftClose size={16} /></button></span></div></header><nav aria-label="任务层级" className="folder-tree"><FolderBranch folderId={workspaceRootId} level={0} nodes={nodes} onSelect={onFolderSelect} onTaskSelect={onTaskSelect} selectedId={selectedFolderId} selectedTaskId={selectedTaskId} /></nav></aside>}
  </div>;
}
