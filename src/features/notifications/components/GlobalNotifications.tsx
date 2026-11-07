import { handoffNotificationKey, readHandoffNotifications, type HandoffNotification } from "@/features/members/lib/team-lifecycle-storage";
import { useI18n } from '@/shared/i18n/I18nProvider';
import { notificationCopy, notificationTeamName } from '@/ai/mock/prototype/notification-copy';
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { formatDisplayDateTime, formatLegacyDateLabel, formatRelativeDateTime } from "@/shared/lib/date-time";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PersonName } from "@/shared/ui/PersonAvatar";
import { Bell, Broom, Inbox, Users } from "lucide-react";
import { NotificationFilter, notificationReadFilterLabels as readFilterLabels, type NotificationReadFilter } from "@/features/notifications/components/NotificationFilter";
import { isNotificationReadTestMode, notificationExamples, notificationReadTestExamples, notificationTypeLabels, type WorkspaceNotification } from "@/ai/mock/data/notificationExamples";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import "@/features/notifications/styles/notifications.css";
import { getDiscussionReadIds, mergeNotificationReadIds, notificationReadStateKey, parseNotificationReadState, type DiscussionReadReceipt, type NotificationRegionTarget } from "@/features/notifications/lib/notification-read-state";
import { toast } from "@/shared/ui/toast";

const demoTeamId = "creator-commerce";
type ScopedNotification = WorkspaceNotification & { teamId: string };

export function GlobalNotifications({ besideNavigation = false, placement = "rail", showDemoNotifications = true, onOpenTask, teamId = "", teams, getTaskTitle, userId = "", discussionNotifications, discussionReadReceipt, onDiscussionReadHandled }: {
  teamId?: string; userId?: string;
  teams?: readonly { id: string; name: string }[];
  getTaskTitle?: (taskId: string, teamId: string) => string | undefined;
  besideNavigation?: boolean;
  placement?: "rail" | "topbar" | "sidebar";
  showDemoNotifications?: boolean;
  onOpenTask?: (taskId: string, target: NotificationRegionTarget | undefined, teamId: string) => void;
  discussionNotifications?: readonly WorkspaceNotification[];
  discussionReadReceipt?: DiscussionReadReceipt;
  onDiscussionReadHandled?: (sequence: number) => void;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const d = useDetailCopy();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [readIdsByTeam, setReadIdsByTeam] = useState(new Map<string, string[]>());
  const [readError, setReadError] = useState("");
  const showDemo = showDemoNotifications && (teams ? teams.some(team => team.id === demoTeamId) : !teamId || teamId === demoTeamId);
  const notificationTestMode = showDemo && typeof window !== "undefined" && isNotificationReadTestMode(window.location.search, Boolean(import.meta.env?.DEV));
  const fallbackTeamId = teams ? "" : teamId;
  const readKeys = useMemo(() => {
    const teamIds = notificationTestMode ? [demoTeamId] : teams?.map(team => team.id) ?? [fallbackTeamId];
    return new Map(teamIds.map(id => [id, notificationReadStateKey(id, userId) + (notificationTestMode ? ":r10-demo" : "")]));
  }, [teams, fallbackTeamId, userId, notificationTestMode]);
  const items = useMemo<ScopedNotification[]>(() => {
    const demoItems = notificationTestMode ? notificationReadTestExamples : showDemo ? notificationExamples : [];
    const discussionItems = notificationTestMode ? [] : discussionNotifications ?? [];
    return [...discussionItems, ...demoItems].flatMap(item => {
      const sourceTeamId = item.teamId ?? teamId;
      if (teams && !readKeys.has(sourceTeamId)) return [];
      return [{ ...item, teamId: sourceTeamId, read: item.read || (readIdsByTeam.get(sourceTeamId)?.includes(item.id) ?? false) }];
    });
  }, [discussionNotifications, showDemo, notificationTestMode, readIdsByTeam, readKeys, teamId, teams]);
  const observedItems = useRef(items);
  observedItems.current = items;
  const [activeFilter, setActiveFilter] = useState<NotificationReadFilter>("all");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [panelBounds, setPanelBounds] = useState<CSSProperties>({});
  useEffect(() => {
    if (!sheetOpen || !besideNavigation) return;
    const main = triggerRef.current?.closest(".task-workspace-shell")?.querySelector(".main-content");
    if (!main) return;
    const update = () => {
      const bounds = main.getBoundingClientRect();
      setPanelBounds({
        "--notification-navigation-edge": `${bounds.left + 1}px`,
        "--notification-panel-top": `${bounds.top + 1}px`,
        "--notification-panel-height": `${Math.max(0, bounds.height - 2)}px`,
        "--notification-panel-available-width": `${Math.max(0, bounds.width - 2)}px`,
      } as CSSProperties);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(main);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [sheetOpen, besideNavigation]);
  const [, refreshClock] = useState(0);
  useEffect(() => {
    if (!sheetOpen) return;
    const timer = window.setInterval(() => refreshClock(value => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, [sheetOpen]);
  const now = Date.now();
  useEffect(() => {
    const keys = new Set(readKeys.values());
    const reload = () => {
      const readIds = new Map<string, string[]>();
      let failed = false;
      for (const [id, key] of readKeys) {
        try { readIds.set(id, parseNotificationReadState(localStorage.getItem(key)).readIds); }
        catch { failed = true; }
      }
      setReadIdsByTeam(readIds);
      setReadError(failed ? ui("通知已读状态读取失败，请重试。") : "");
    };
    reload();
    const sync = (event: StorageEvent) => { if (event.key === null || keys.has(event.key)) reload(); };
    const syncLocal = (event: Event) => { if (keys.has((event as CustomEvent<string>).detail)) reload(); };
    window.addEventListener("storage", sync);
    window.addEventListener("taskdoor-notification-read-changed", syncLocal);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("taskdoor-notification-read-changed", syncLocal); };
  }, [readKeys, locale]);
  const persistRead = (sourceTeamId: string, ids: string[]) => {
    if (!ids.length) return true;
    try {
      const readKey = readKeys.get(sourceTeamId);
      if (!readKey || !sourceTeamId || !userId) throw new Error("Unread state unavailable");
      const current = parseNotificationReadState(localStorage.getItem(readKey));
      const next = mergeNotificationReadIds(current, ids);
      localStorage.setItem(readKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("taskdoor-notification-read-changed", { detail: readKey }));
      return true;
    } catch {
      setReadError(ui("已读状态保存失败，请重试。"));
      return false;
    }
  };
  useEffect(() => {
    if (!discussionReadReceipt) return;
    const sourceTeamId = discussionReadReceipt.teamId;
    if (readKeys.has(sourceTeamId)) {
      const ids = getDiscussionReadIds(observedItems.current, discussionReadReceipt, { teamId: sourceTeamId, userId });
      if (!persistRead(sourceTeamId, ids)) toast.error(ui("已读状态保存失败，请重试。"));
    }
    onDiscussionReadHandled?.(discussionReadReceipt.sequence);
    // A receipt applies only to this observed batch; later notifications need a new visible read.
  }, [discussionReadReceipt?.sequence, readKeys, userId]);

  const [handoffs, setHandoffs] = useState<HandoffNotification[]>([]);
  const [handoffError, setHandoffError] = useState("");
  const canSeeHandoff = (item: HandoffNotification) => item.recipientId === userId && readKeys.has(item.teamId);
  useEffect(() => {
    if (notificationTestMode) { setHandoffs([]); setHandoffError(""); return; }
    const reload = () => { try { setHandoffs(readHandoffNotifications(localStorage).filter(canSeeHandoff)); setHandoffError(""); } catch { setHandoffError(locale === "en" ? "Could not load handoff notifications." : "交接通知读取失败，请刷新后重试。"); } };
    reload(); window.addEventListener("agentdoor-handoff-notifications-changed", reload);
    const sync = (event: StorageEvent) => { if (event.key === handoffNotificationKey) reload(); };
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("agentdoor-handoff-notifications-changed", reload); window.removeEventListener("storage", sync); };
  }, [readKeys, userId, locale, notificationTestMode]);
  const handoffItems: ScopedNotification[] = handoffs.filter(canSeeHandoff).map(n => {
    const taskId = n.taskIds[0];
    const content = locale === "en"
      ? `You took over ${n.taskIds.length} unfinished tasks. See the handoff in task activity.`
      : `你已接手 ${n.taskIds.length} 项未完成任务，可在任务活动中查看交接说明。`;
    const task = taskId ? { id: taskId, title: getTaskTitle?.(taskId, n.teamId) ?? (locale === "en" ? "Open task" : "查看任务") } : undefined;
    return { id: n.id, teamId: n.teamId, kind: "handoff", content, task, createdAt: n.at, time: formatDisplayDateTime(n.at, { locale }) ?? "—", read: n.read };
  });
  const allItems = [...(notificationTestMode ? [] : handoffItems), ...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const persistHandoffRead = (item?: ScopedNotification) => {
    if (notificationTestMode) return;
    try {
      const next = readHandoffNotifications(localStorage).map(n => canSeeHandoff(n) && (!item || (n.id === item.id && n.teamId === item.teamId)) ? { ...n, read: true } : n);
      localStorage.setItem(handoffNotificationKey, JSON.stringify(next));
      setHandoffs(next.filter(canSeeHandoff));
      setHandoffError("");
    } catch { setHandoffError(locale === "en" ? "Could not save read status. Please retry." : "已读状态保存失败，请重试。"); }
  };

  const selectedTeam = teams?.find(team => team.id === selectedTeamId);
  const scopedItems = selectedTeam ? allItems.filter(item => item.teamId === selectedTeam.id) : allItems;
  const readCount = scopedItems.filter(item => item.read).length;
  const counts = { all: scopedItems.length, read: readCount, unread: scopedItems.length - readCount };
  const totalUnread = selectedTeam ? allItems.filter(item => !item.read).length : counts.unread;
  const visibleItems = scopedItems.filter(item => activeFilter === "all" || item.read === (activeFilter === "read"));
  const filterLabel = [
    selectedTeam && notificationTeamName(locale, selectedTeam.id, selectedTeam.name),
    ui(readFilterLabels[activeFilter]),
  ].filter(Boolean).join(" · ");

  const markAllRead = () => {
    persistHandoffRead();
    let failed = false;
    for (const sourceTeamId of readKeys.keys()) {
      const ids = items.filter(item => item.teamId === sourceTeamId && !item.read).map(item => item.id);
      if (!persistRead(sourceTeamId, ids)) failed = true;
    }
    if (failed) setReadError(ui("已读状态保存失败，请重试。"));
  };

  const markRead = (item: ScopedNotification) => {
    if (item.kind === "handoff") persistHandoffRead(item);
    else persistRead(item.teamId, [item.id]);
  };
  const resetTestUnread = () => {
    const readKey = readKeys.get(demoTeamId);
    if (!notificationTestMode || !readKey) return;
    try {
      const current = parseNotificationReadState(localStorage.getItem(readKey));
      const testIds = new Set(notificationReadTestExamples.map(item => item.id));
      const next = { ...current, readIds: current.readIds.filter(id => !testIds.has(id)) };
      localStorage.setItem(readKey, JSON.stringify(next));
      setActiveFilter("all");
      setSelectedTeamId("");
      window.dispatchEvent(new CustomEvent("taskdoor-notification-read-changed", { detail: readKey }));
    } catch {
      setReadError(ui("已读状态保存失败，请重试。"));
    }
  };
  return <Sheet onOpenChange={setSheetOpen} open={sheetOpen}>
    <SheetTrigger ref={triggerRef} render={<button aria-label={`${d("notifications")} (${totalUnread})`} className={placement === "sidebar" ? "notification-trigger notification-trigger-sidebar" : placement === "topbar" ? "notification-trigger notification-trigger-topbar" : "rail-item notification-trigger"} data-tooltip={placement === "rail" ? d('notifications') : undefined} title={placement === "topbar" ? d('notifications') : undefined} type="button" />}>
      <Bell aria-hidden="true" size={placement === "sidebar" ? 17 : 18} strokeWidth={placement === "sidebar" ? 1.7 : 2} />
      {placement === "sidebar" && <span className="notification-trigger-label">{d('notifications')}</span>}
      {totalUnread > 0 && <span aria-hidden="true" className={placement === "sidebar" ? "notification-trigger-count-inline" : "notification-trigger-count"}>{totalUnread > 99 ? "99+" : totalUnread}</span>}
    </SheetTrigger>
    <SheetContent className={besideNavigation ? "notification-panel-beside-navigation" : undefined} style={besideNavigation ? panelBounds : undefined} finalFocus={triggerRef} initialFocus={panelRef} ref={panelRef} side={besideNavigation || placement === "rail" ? "left" : "right"} tabIndex={-1}>
      <SheetHeader>
        <div><SheetTitle>{d('notifications')}</SheetTitle><SheetDescription>{ui("查看与你有关的协作动态。")}</SheetDescription></div>
        <div className="notification-header-actions">
          <button aria-label={ui("全部标为已读")} className="notification-mark-read" disabled={totalUnread === 0} onClick={markAllRead} title={ui("全部标为已读")} type="button"><Broom aria-hidden="true" /></button>
          <NotificationFilter activeFilter={activeFilter} counts={counts} filterLabel={filterLabel} onReadFilterChange={setActiveFilter} onTeamChange={setSelectedTeamId} portalContainer={panelRef} selectedTeamId={selectedTeam?.id ?? ""} teams={teams?.map(team => ({ id: team.id, name: notificationTeamName(locale, team.id, team.name) }))} />
        </div>
      </SheetHeader>

      <div className="notification-list-view">
        {notificationTestMode && <div className="notification-test-tools"><span>{locale === "en" ? "Test data: 3 mentions here, 1 in another task" : "测试数据：同区 3 条提及，其他任务 1 条"}</span><button onClick={resetTestUnread} type="button">{locale === "en" ? "Reset test unread" : "重置测试未读"}</button></div>}
        {readError && <p role="alert">{readError}</p>}
        {handoffError && <p role="alert">{handoffError}</p>}
        {visibleItems.length > 0 ? <div className="notification-list">
          {visibleItems.map(item => {
            const team = teams?.find(team => team.id === item.teamId);
            return <NotificationItem item={item} key={JSON.stringify([item.teamId, item.id])} now={now} onOpenTask={onOpenTask ? (taskId, target) => { onOpenTask(taskId, target, item.teamId); setSheetOpen(false); } : undefined} onRead={() => markRead(item)} teamName={team ? notificationTeamName(locale, team.id, team.name) : undefined} />;
          })}
        </div> : <div className="notification-empty"><Inbox aria-hidden="true" /><h2>{ui("没有通知：{filter}", { filter: filterLabel })}</h2><p>{activeFilter === "unread" && !selectedTeam ? ui("你已经读完了当前所有通知。") : ui("符合当前筛选条件的通知会出现在这里。")}</p></div>}
      </div>
    </SheetContent>
  </Sheet>;
}

export function NotificationItem({ item, teamName, onRead, onOpenTask, now = Date.now() }: {
  item: WorkspaceNotification;
  teamName?: string;
  onRead: () => void;
  onOpenTask?: (taskId: string, target?: NotificationRegionTarget) => void;
  now?: number;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  item = notificationCopy(locale, item);
  const timestamp = formatRelativeDateTime(item.createdAt, locale, now);
  const task = item.task;
  const taskLabel = task && <span>{task.title}</span>;
  const openTask = task && onOpenTask ? () => {
    if (!item.target) onRead();
    onOpenTask(task.id, item.target);
  } : undefined;
  const typeLabel = item.kind === "handoff" && locale === "en" ? "Task handoff" : ui(notificationTypeLabels[item.kind]);
  const labels = (item.people ?? []).map(person => `@${person.name}`);
  const parts = labels.length ? item.content.split(new RegExp(`(${labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g")) : [item.content];
  return <div className={`notification-item ${item.read ? "read" : "unread"}`}>
    <button aria-label={ui("标为已读：【{0}】{1}", {0: typeLabel, 1: [item.content, teamName, task?.title].filter(Boolean).join(" · ")})} className="notification-item-read" onClick={onRead} type="button" />
    <span className="notification-item-copy">
      {!item.read && <span aria-label={ui("未读")} className="notification-unread-dot" />}
      <span className="notification-item-text"><strong>【{typeLabel}】</strong>{parts.map((part, index) => {
        const person = item.people?.find(value => part === `@${value.name}`);
        if (person) return <PersonName className="notification-person-link" key={index} name={person.name} personId={person.id} prefix="@" profilePreviewFocusable />;
        return part;
      })}</span>
      {task && <>
        {" "}
        {openTask ? <span className="notification-task-link" onClick={openTask} onKeyDown={event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (!event.repeat) openTask();
        }} role="link" tabIndex={0} title={task.title}>{taskLabel}</span>
          : <span className="notification-task-reference" onClick={onRead} title={task.title}>{taskLabel}</span>}
      </>}
      {item.excerpt && <span className="notification-item-excerpt">{item.excerpt}</span>}
    </span>
    <span className="notification-item-meta">
      <time aria-label={timestamp?.full} dateTime={timestamp ? new Date(item.createdAt).toISOString() : undefined} tabIndex={timestamp ? 0 : undefined} title={timestamp?.full}>{timestamp?.label ?? formatLegacyDateLabel(item.time, locale, { now })}</time>
      {teamName && <span className="notification-item-team" onClick={onRead} title={teamName}><Users aria-hidden="true" /><span>{teamName}</span></span>}
    </span>
  </div>;
}
