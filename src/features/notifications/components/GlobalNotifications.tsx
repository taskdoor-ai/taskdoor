import { handoffNotificationKey, readHandoffNotifications, type HandoffNotification } from "@/features/members/lib/team-lifecycle-storage";
import { useI18n } from '@/shared/i18n/I18nProvider';
import { notificationCopy } from '@/ai/mock/prototype/notification-copy';
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { formatDisplayDateTime, formatLegacyDateLabel, formatRelativeDateTime } from "@/shared/lib/date-time";
import { useEffect, useMemo, useRef, useState } from "react";
import { PersonName } from "@/shared/ui/PersonAvatar";
import { Bell, Broom, Check, Filter, Inbox } from "lucide-react";
import { isNotificationReadTestMode, notificationExamples, notificationReadTestExamples, notificationTypeLabels, type WorkspaceNotification } from "@/ai/mock/data/notificationExamples";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import "@/features/notifications/styles/notifications.css";
import { getDiscussionReadIds, mergeNotificationReadIds, notificationReadStateKey, parseNotificationReadState, type DiscussionReadReceipt, type NotificationRegionTarget } from "@/features/notifications/lib/notification-read-state";
import { toast } from "@/shared/ui/toast";

type NotificationReadFilter = "all" | "unread" | "read";
const readFilterLabels: Record<NotificationReadFilter, string> = { all: "全部", read: "已读", unread: "未读" };

export function GlobalNotifications({ placement = "rail", showDemoNotifications = true, onOpenTask, teamId = "", userId = "", discussionReadReceipt, onDiscussionReadHandled }: {
  teamId?: string; userId?: string;
  placement?: "rail" | "topbar";
  showDemoNotifications?: boolean;
  onOpenTask?: (taskId: string, target?: NotificationRegionTarget) => void;
  discussionReadReceipt?: DiscussionReadReceipt;
  onDiscussionReadHandled?: (sequence: number) => void;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const d = useDetailCopy();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [readError, setReadError] = useState("");
  const notificationTestMode = showDemoNotifications && typeof window !== "undefined" && isNotificationReadTestMode(window.location.search, Boolean(import.meta.env?.DEV));
  const readKey = notificationReadStateKey(teamId, userId) + (notificationTestMode ? ":r10-demo" : "");
  const items = useMemo(() => (showDemoNotifications ? notificationTestMode ? notificationReadTestExamples : notificationExamples : []).map(item => readIds.includes(item.id) ? { ...item, read: true } : item), [showDemoNotifications, notificationTestMode, readIds]);
  const observedItems = useRef(items);
  observedItems.current = items;
  const [activeFilter, setActiveFilter] = useState<NotificationReadFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, refreshClock] = useState(0);
  useEffect(() => {
    if (!sheetOpen) return;
    const timer = window.setInterval(() => refreshClock(value => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, [sheetOpen]);
  const now = Date.now();
  useEffect(() => {
    const reload = () => {
      try {
        setReadIds(parseNotificationReadState(localStorage.getItem(readKey)).readIds);
        setReadError("");
      } catch {
        setReadError(ui("通知已读状态读取失败，请重试。"));
      }
    };
    reload();
    const sync = (event: StorageEvent) => { if (event.key === readKey || event.key === null) reload(); };
    const syncLocal = (event: Event) => { if ((event as CustomEvent<string>).detail === readKey) reload(); };
    window.addEventListener("storage", sync);
    window.addEventListener("taskdoor-notification-read-changed", syncLocal);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("taskdoor-notification-read-changed", syncLocal); };
  }, [readKey, locale]);
  const persistRead = (ids: string[]) => {
    if (!ids.length) return true;
    try {
      if (!teamId || !userId) throw new Error("Unread state unavailable");
      const current = parseNotificationReadState(localStorage.getItem(readKey));
      const next = mergeNotificationReadIds(current, ids);
      localStorage.setItem(readKey, JSON.stringify(next));
      setReadIds(next.readIds);
      setReadError("");
      window.dispatchEvent(new CustomEvent("taskdoor-notification-read-changed", { detail: readKey }));
      return true;
    } catch {
      setReadError(ui("已读状态保存失败，请重试。"));
      return false;
    }
  };
  useEffect(() => {
    if (!discussionReadReceipt) return;
    const ids = getDiscussionReadIds(observedItems.current, discussionReadReceipt, { teamId, userId });
    if (!persistRead(ids)) toast.error(ui("已读状态保存失败，请重试。"));
    onDiscussionReadHandled?.(discussionReadReceipt.sequence);
    // A receipt applies only to this observed batch; later notifications need a new visible read.
  }, [discussionReadReceipt?.sequence, teamId, userId]);

  const [handoffs, setHandoffs] = useState<HandoffNotification[]>([]);
  const [handoffError, setHandoffError] = useState("");
  useEffect(() => {
    if (notificationTestMode) { setHandoffs([]); setHandoffError(""); return; }
    const reload = () => { try { setHandoffs(readHandoffNotifications(localStorage).filter(n => n.teamId === teamId && n.recipientId === userId)); setHandoffError(""); } catch { setHandoffError(locale === "en" ? "Could not load handoff notifications." : "交接通知读取失败，请刷新后重试。"); } };
    reload(); window.addEventListener("agentdoor-handoff-notifications-changed", reload);
    const sync = (event: StorageEvent) => { if (event.key === handoffNotificationKey) reload(); };
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("agentdoor-handoff-notifications-changed", reload); window.removeEventListener("storage", sync); };
  }, [teamId, userId, locale, notificationTestMode]);
  const handoffItems: WorkspaceNotification[] = handoffs.map(n => ({ id: n.id, kind: "handoff", content: locale === "en" ? `You have taken over ${n.taskIds.length} unfinished tasks. Open a task to see the handoff in its activity. Open task` : `你已接手 ${n.taskIds.length} 项未完成任务，可在任务活动中查看交接说明。查看任务`, createdAt: n.at, time: formatDisplayDateTime(n.at, { locale }) ?? "—", read: n.read, task: n.taskIds.length ? { id: n.taskIds[0], title: locale === "en" ? "Open task" : "查看任务" } : undefined }));
  const allItems = [...(notificationTestMode ? [] : handoffItems), ...items];
  const persistHandoffRead = (id?: string) => { if (notificationTestMode) return; try { const next = readHandoffNotifications(localStorage).map(n => n.teamId === teamId && n.recipientId === userId && (!id || n.id === id) ? { ...n, read: true } : n); localStorage.setItem(handoffNotificationKey, JSON.stringify(next)); setHandoffs(next.filter(n => n.teamId === teamId && n.recipientId === userId)); } catch { setHandoffError(locale === "en" ? "Could not save read status. Please retry." : "已读状态保存失败，请重试。"); } };

  const counts = useMemo(() => ({
    all: allItems.length,
    read: allItems.filter((item) => item.read).length,
    unread: allItems.filter((item) => !item.read).length,
  }), [items, handoffs]);
  const visibleItems = allItems.filter((item) => activeFilter === "all" || (activeFilter === "read" ? item.read : !item.read));

  useEffect(() => {
    if (!filterOpen) return;
    const closeFilter = (event: MouseEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", closeFilter);
    return () => document.removeEventListener("mousedown", closeFilter);
  }, [filterOpen]);

  const markAllRead = () => {
    persistHandoffRead();
    persistRead(items.filter(item => !item.read).map(item => item.id));
  };

  const markRead = (item: WorkspaceNotification) => {
    if (item.kind === "handoff") persistHandoffRead(item.id);
    else persistRead([item.id]);
  };
  const resetTestUnread = () => {
    if (!notificationTestMode) return;
    try {
      const current = parseNotificationReadState(localStorage.getItem(readKey));
      const testIds = new Set(notificationReadTestExamples.map(item => item.id));
      const next = { ...current, readIds: current.readIds.filter(id => !testIds.has(id)) };
      localStorage.setItem(readKey, JSON.stringify(next));
      setReadIds(next.readIds);
      setReadError("");
      setActiveFilter("all");
      window.dispatchEvent(new CustomEvent("taskdoor-notification-read-changed", { detail: readKey }));
    } catch {
      setReadError(ui("已读状态保存失败，请重试。"));
    }
  };
  const changeSheetOpen = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setFilterOpen(false);
  };

  return <Sheet onOpenChange={changeSheetOpen} open={sheetOpen}>
    <SheetTrigger ref={triggerRef} render={<button aria-label={`${d("notifications")} (${counts.unread})`} className={placement === "topbar" ? "notification-trigger notification-trigger-topbar" : "rail-item notification-trigger"} data-tooltip={placement === "rail" ? d('notifications') : undefined} title={placement === "topbar" ? d('notifications') : undefined} type="button" />}>
      <Bell aria-hidden="true" size={18} />
      {counts.unread > 0 && <span aria-hidden="true" className="notification-trigger-count">{counts.unread > 99 ? "99+" : counts.unread}</span>}
    </SheetTrigger>
    <SheetContent finalFocus={triggerRef} initialFocus={panelRef} ref={panelRef} side={placement === "topbar" ? "right" : "left"} tabIndex={-1}>
      <SheetHeader>
        <div><SheetTitle>{d('notifications')}</SheetTitle><SheetDescription>{ui("查看与你有关的协作动态。")}</SheetDescription></div>
        <div className="notification-header-actions">
          <button aria-label={ui("全部标为已读")} className="notification-mark-read" disabled={counts.unread === 0} onClick={markAllRead} title={ui("全部标为已读")} type="button"><Broom aria-hidden="true" /></button>
          <div className="notification-filter" ref={filterRef}>
            <button aria-expanded={filterOpen} aria-haspopup="menu" aria-label={ui("筛选通知，当前{0}", {0: ui(readFilterLabels[activeFilter])})} className={`notification-filter-trigger ${activeFilter !== "all" ? "active" : ""}`} onClick={() => setFilterOpen((open) => { const nextOpen = !open; if (nextOpen) window.requestAnimationFrame(() => filterRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus()); return nextOpen; })} ref={filterTriggerRef} title={ui("筛选通知")} type="button"><Filter aria-hidden="true" /></button>
            {filterOpen && <div aria-label={ui("通知已读状态")} className="notification-filter-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setFilterOpen(false); filterTriggerRef.current?.focus(); } }} role="menu">
              {(["all", "unread", "read"] as const).map((filter) => <button aria-checked={activeFilter === filter} className="notification-filter-option" key={filter} onClick={() => { setActiveFilter(filter); setFilterOpen(false); filterTriggerRef.current?.focus(); }} role="menuitemradio" type="button"><Check aria-hidden="true" /><span>{ui(readFilterLabels[filter])}</span><small>{counts[filter]}</small></button>)}
            </div>}
          </div>
        </div>
      </SheetHeader>

      <div className="notification-list-view">
        {notificationTestMode && <div className="notification-test-tools"><span>{locale === "en" ? "Test data: 3 mentions here, 1 in another task" : "测试数据：同区 3 条提及，其他任务 1 条"}</span><button onClick={resetTestUnread} type="button">{locale === "en" ? "Reset test unread" : "重置测试未读"}</button></div>}
        {readError && <p role="alert">{readError}</p>}
        {handoffError && <p role="alert">{handoffError}</p>}
        {visibleItems.length > 0 ? <div className="notification-list">
          {visibleItems.map(item => <NotificationItem item={item} key={item.id} now={now} onOpenTask={onOpenTask ? (taskId, target) => { onOpenTask(taskId, target); changeSheetOpen(false); } : undefined} onRead={() => markRead(item)} />)}
        </div> : <div className="notification-empty"><Inbox aria-hidden="true" /><h2>{ui("没有通知：{filter}", { filter: ui(readFilterLabels[activeFilter]) })}</h2><p>{activeFilter === "unread" ? ui("你已经读完了当前所有通知。") : ui("符合当前筛选条件的通知会出现在这里。")}</p></div>}
      </div>
    </SheetContent>
  </Sheet>;
}

export function NotificationItem({ item, onRead, onOpenTask, now = Date.now() }: { item: WorkspaceNotification; onRead: () => void; onOpenTask?: (taskId: string, target?: NotificationRegionTarget) => void; now?: number }) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  item = notificationCopy(locale, item);
  const timestamp = formatRelativeDateTime(item.createdAt, locale, now);
  const task = item.task;
  const labels = [...(item.people ?? []).map(person => `@${person.name}`), ...(task ? [task.title] : [])];
  const parts = labels.length ? item.content.split(new RegExp(`(${labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g")) : [item.content];
  return <div className={`notification-item ${item.read ? "read" : "unread"}`}>
    <button aria-label={ui("标为已读：【{0}】{1}", {0: (item.kind === "handoff" && locale === "en" ? "Task handoff" : ui(notificationTypeLabels[item.kind])), 1: item.content})} className="notification-item-read" onClick={onRead} type="button" />
    <span className="notification-item-copy">
      {!item.read && <span aria-label={ui("未读")} className="notification-unread-dot" />}
      <span className="notification-item-text"><strong>【{(item.kind === "handoff" && locale === "en" ? "Task handoff" : ui(notificationTypeLabels[item.kind]))}】</strong>{parts.map((part, index) => {
        const person = item.people?.find(value => part === `@${value.name}`);
        if (person) return <PersonName className="notification-person-link" key={index} name={person.name} personId={person.id} prefix="@" profilePreviewFocusable />;
        if (task && part === task.title && onOpenTask) return <button className="notification-task-link" key={index} onClick={() => { if (!item.target) onRead(); onOpenTask(task.id, item.target); }} role="link" type="button">{task.title}</button>;
        return part;
      })}</span>
    </span>
    <time aria-label={timestamp?.full} dateTime={timestamp ? new Date(item.createdAt).toISOString() : undefined} tabIndex={timestamp ? 0 : undefined} title={timestamp?.full}>{timestamp?.label ?? formatLegacyDateLabel(item.time, locale, { now })}</time>
  </div>;
}
