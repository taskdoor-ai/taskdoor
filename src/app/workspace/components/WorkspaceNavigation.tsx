import { AccentColorSetting } from "@/features/me/components/AccentColorSetting";
import { TaskNavigationTools } from "@/features/tasks/components/TaskNavigationTools";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { CircleDashed, LogOut, Menu, Plus, Settings2, Sparkles, Star, X } from "lucide-react";
import { GlobalNotifications } from "@/features/notifications/components/GlobalNotifications";
import type { DiscussionReadReceipt, NotificationRegionTarget } from "@/features/notifications/lib/notification-read-state";
import { getTaskStatusFilters, normalizeTaskWorkspaceFilters, type TaskListFilters, type TaskListScope } from "@/features/tasks/components/task-list-filters";
import { buildTaskListProjection } from "@/features/tasks/lib/task-list-projection";
import { taskCalendarDate } from "@/features/tasks/lib/task-schedule";
import type { PersonalCenterModule } from "@/app/workspace/components/PersonalInfoDialog";
import { TeamSwitcher, type SwitchableTeam } from "@/app/workspace/components/TeamSwitcher";
import type { PrimarySection } from "@/app/workspace/components/WorkspaceSidebar";
import { statusMessageKey } from "@/shared/i18n/task-status";
import { taskStatusDefinition, taskStatusOptions } from "@/shared/ui/TaskStatusBadge";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import type { PersonOption, TagDefinition, WorkspaceNode } from "@/shared/model/task-model";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import "@/app/workspace/styles/workspace-shell.css";

export type WorkspaceNavigationProps = {
  members: PersonOption[];
  onManageTags: () => void;
  onListFiltersChange: (filters: TaskListFilters) => void;
  onOpenRecycleBin: (onNavigate: () => void) => void;
  onOpenFavorites: (onNavigate: () => void) => void;
  activeTeamId: string;
  onConnectAi: () => void;
  onCreateTask: (onNavigate: () => void) => void;
  canCreateTask?: boolean;
  onOpenPersonalCenter: (module: PersonalCenterModule) => void;
  onTeamChange: (teamId: string) => void;
  onSignOut?: () => void;
  showDemoNotifications?: boolean;
  onOpenNotificationTask?: (taskId: string, target: NotificationRegionTarget | undefined, teamId: string, onNavigate: () => void) => void;
  discussionNotifications?: ComponentProps<typeof GlobalNotifications>["discussionNotifications"];
  getNotificationTaskTitle?: ComponentProps<typeof GlobalNotifications>["getTaskTitle"];
  discussionReadReceipt?: DiscussionReadReceipt;
  onDiscussionReadHandled?: (sequence: number) => void;
  teams: SwitchableTeam[];
  theme: "light" | "dark";
  toggleTheme: () => void;
  userId: string;
  userProfile: { name: string };
  filters: TaskListFilters;
  onFiltersChange: (filters: TaskListFilters) => void;
  nodes: WorkspaceNode[];
  tagDefinitions: TagDefinition[];
  query: string;
  activeSection: PrimarySection;
};

const scopeOptions = [
  { value: "all", message: "list.all" },
  { value: "owned", message: "list.owned" },
  { value: "participating", message: "list.participating" },
] as const;

const navigationWidthKey = "taskdoor-workspace-navigation-width";
const defaultNavigationWidth = 236;
const minNavigationWidth = 200;
const maxNavigationWidth = 360;
const clampNavigationWidth = (width: number) => Math.round(Math.min(maxNavigationWidth, Math.max(minNavigationWidth, width)));

function readNavigationWidth() {
  try {
    const stored = window.localStorage.getItem(navigationWidthKey);
    const width = stored?.trim() ? Number(stored) : NaN;
    return Number.isFinite(width) ? clampNavigationWidth(width) : defaultNavigationWidth;
  } catch {
    return defaultNavigationWidth;
  }
}

export function WorkspaceNavigation({ onListFiltersChange, members, onManageTags, onOpenRecycleBin, onOpenFavorites, activeTeamId, onConnectAi, onCreateTask, canCreateTask = true, onOpenPersonalCenter, onTeamChange, onSignOut, onOpenNotificationTask, discussionNotifications, discussionReadReceipt, getNotificationTaskTitle, onDiscussionReadHandled, showDemoNotifications = true, teams, theme, toggleTheme, userId, userProfile, filters, onFiltersChange, nodes, tagDefinitions, query, activeSection }: WorkspaceNavigationProps) {
  const { t, locale } = useI18n();
  const taskFiltersActive = activeSection === "tasks" || activeSection === "home";
  const timeZone = useTeamTimeZone();
  const [calendarDay, setCalendarDay] = useState(() => taskCalendarDate(new Date().toISOString(), timeZone));
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navigationWidth, setNavigationWidth] = useState(readNavigationWidth);
  const [resizing, setResizing] = useState(false);
  const resizeDragRef = useRef<{ pointerId: number; startX: number; startWidth: number; handle: HTMLDivElement } | null>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const closeTriggerRef = useRef<HTMLButtonElement>(null);
  const normalizedFilters = useMemo(() => normalizeTaskWorkspaceFilters(filters), [filters]);
  const selectedStatuses = getTaskStatusFilters(normalizedFilters);
  const projection = useMemo(() => buildTaskListProjection(nodes, query, normalizedFilters, tagDefinitions, userId, task => task.name, timeZone), [nodes, query, normalizedFilters, tagDefinitions, userId, timeZone, calendarDay]);
  const navigationLabel = t("list.nav");
  const closeLabel = locale === "en" ? "Close navigation" : "关闭导航";
  const resizeLabel = locale === "en" ? "Resize navigation" : "调整侧边栏宽度";
  const finishResize = useCallback(() => {
    const drag = resizeDragRef.current;
    resizeDragRef.current = null;
    setResizing(false);
    if (drag?.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(navigationWidthKey, String(navigationWidth)); } catch { /* Resizing remains available without storage. */ }
  }, [navigationWidth]);

  useEffect(() => {
    if (mobile) finishResize();
    return finishResize;
  }, [mobile, finishResize]);

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (mobile || window.matchMedia("(max-width: 900px)").matches || event.button !== 0 || !event.isPrimary || resizeDragRef.current) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: navigationWidth, handle: event.currentTarget };
    setResizing(true);
  };
  const moveResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = resizeDragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    setNavigationWidth(clampNavigationWidth(drag.startWidth + event.clientX - drag.startX));
  };
  const endResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeDragRef.current?.pointerId !== event.pointerId) return;
    if (event.type === "pointerup") moveResize(event);
    finishResize();
  };
  const resizeWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const nextWidth = event.key === "ArrowLeft" ? navigationWidth - 16 : event.key === "ArrowRight" ? navigationWidth + 16 : event.key === "Home" ? minNavigationWidth : event.key === "End" ? maxNavigationWidth : null;
    if (nextWidth === null) return;
    event.preventDefault();
    setNavigationWidth(clampNavigationWidth(nextWidth));
  };

  useEffect(() => {
    const updateDay = () => setCalendarDay(taskCalendarDate(new Date().toISOString(), timeZone));
    updateDay();
    const timer = window.setInterval(updateDay, 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setDrawerOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const closeNavigation = (restoreFocus = true) => {
    setDrawerOpen(false);
    if (mobile && restoreFocus) window.requestAnimationFrame(() => menuTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (!mobile || !drawerOpen) return;
    closeTriggerRef.current?.focus();
    const main = navigationRef.current?.closest(".task-workspace-shell")?.querySelector<HTMLElement>(":scope > .main-content");
    const wasInert = main?.inert;
    if (main) main.inert = true;
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      // Nested menus and dialogs own Escape and their own focus cycle.
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-slot="dropdown-menu-content"], [data-slot="popover-content"], [data-slot="dialog-content"], [data-slot="sheet-content"]')) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        menuTriggerRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(navigationRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !navigationRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !navigationRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyboard);
    return () => {
      if (main) main.inert = wasInert ?? false;
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, [mobile, drawerOpen]);

  const chooseFilters = (next: TaskListFilters) => {
    onFiltersChange(normalizeTaskWorkspaceFilters(next));
    closeNavigation();
  };
  const chooseScope = (scope: TaskListScope) => chooseFilters({ ...normalizedFilters, scope });

  return <>
    <button aria-controls="workspace-navigation" aria-expanded={drawerOpen} aria-haspopup="dialog" aria-label={navigationLabel} className="workspace-navigation-menu-trigger" onClick={() => setDrawerOpen(true)} ref={menuTriggerRef} type="button"><Menu aria-hidden="true" size={20} /></button>
    {mobile && drawerOpen && <button aria-label={closeLabel} className="workspace-navigation-backdrop" onClick={() => closeNavigation()} tabIndex={-1} type="button" />}
    <aside aria-label={navigationLabel} aria-hidden={mobile && !drawerOpen || undefined} aria-modal={mobile && drawerOpen || undefined} className="workspace-navigation" data-open={drawerOpen} data-resizing={resizing || undefined} id="workspace-navigation" inert={mobile && !drawerOpen} ref={navigationRef} role={mobile ? "dialog" : undefined} style={{ "--ad-workspace-navigation-width": `${navigationWidth}px` } as CSSProperties}>
      <div className="workspace-navigation-top">
        <div className="workspace-navigation-team"><TeamSwitcher activeTeamId={activeTeamId} onTeamChange={teamId => { onTeamChange(teamId); closeNavigation(); }} teams={teams} variant="topbar" /><button aria-label={closeLabel} className="workspace-navigation-close" onClick={() => closeNavigation()} ref={closeTriggerRef} type="button"><X aria-hidden="true" size={18} /></button></div>
        <button className="workspace-navigation-item workspace-navigation-create" disabled={!canCreateTask} onClick={() => onCreateTask(() => closeNavigation(false))} type="button">
          <Plus aria-hidden="true" size={17} strokeWidth={1.7} /><span>{t("list.new")}</span>
        </button>
      </div>
      <nav aria-label={t("list.quickFilters")} className="workspace-navigation-filters">
        <div aria-label={t("list.scopeFilter")} className="workspace-navigation-group" role="group">
          {scopeOptions.map(({ value, message }) => <button aria-pressed={taskFiltersActive && normalizedFilters.scope === value} className="workspace-navigation-item" key={value} onClick={() => chooseScope(value)} type="button"><span>{t(message)}</span></button>)}
        </div>

        <button aria-current={activeSection === "recycle-bin" ? "page" : undefined} className="workspace-navigation-item" onClick={() => onOpenRecycleBin(closeNavigation)} type="button"><span>{locale === "en" ? "Recycle bin" : "回收站"}</span></button>
        <TaskNavigationTools filters={normalizedFilters} members={members} onFiltersChange={onListFiltersChange} onManageTags={() => { closeNavigation(); onManageTags(); }} projection={projection} touch={mobile}>

        <div aria-label={t("list.statusFilter")} className="workspace-navigation-group" role="group">
          <button aria-pressed={taskFiltersActive && selectedStatuses.length === 0} className="workspace-navigation-item" onClick={() => chooseFilters({ ...normalizedFilters, status: "all", statuses: [], completion: "all" })} type="button"><CircleDashed aria-hidden="true" size={16} /><span>{t("list.allStatuses")}</span>{projection.statusCounts.all > 0 && <small>{projection.statusCounts.all}</small>}</button>
          {taskStatusOptions.map(status => { const definition = taskStatusDefinition[status]; const Icon = definition.icon; return <button aria-pressed={taskFiltersActive && selectedStatuses.includes(status)} className="workspace-navigation-item" data-tone={definition.tone} key={status} onClick={() => chooseFilters({ ...normalizedFilters, status: "all", statuses: selectedStatuses.includes(status) ? selectedStatuses.filter(value => value !== status) : [...selectedStatuses, status], completion: "all" })} type="button"><Icon aria-hidden="true" size={16} /><span>{t(statusMessageKey[status])}</span>{(projection.statusCounts.byStatus[status] ?? 0) > 0 && <small>{projection.statusCounts.byStatus[status]}</small>}</button>; })}
        </div>
        </TaskNavigationTools>
      </nav>
      <div className="workspace-navigation-bottom">
        <button aria-haspopup="dialog" className="workspace-navigation-item workspace-navigation-ai" id="workspace-ai-trigger" onClick={() => onConnectAi()} title={t("ai.guide")} type="button"><Sparkles aria-hidden="true" size={17} strokeWidth={1.7} /><span>{t("ai.connect")}</span></button>
        <div className="workspace-navigation-account-row">
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={t("account.open")} className="workspace-account-trigger" id="workspace-account-trigger" title={`${userProfile.name} · ${t("account.menu")}`}><PersonAvatar name={userProfile.name} personId={userId} profilePreviewFocusable={false} showProfilePreview={false} size="sm" /><span className="workspace-account-name">{userProfile.name}</span></DropdownMenuTrigger>
            <DropdownMenuContent align="start" aria-label={t("account.menu")} className="workspace-account-menu" side="top" sideOffset={8}><ThemeToggle onToggle={toggleTheme} theme={theme} /><AccentColorSetting /><LanguageSwitcher menu /><DropdownMenuItem onClick={() => onOpenFavorites(closeNavigation)}><Star aria-hidden="true" /><span>{locale === "en" ? "Favorites" : "收藏"}</span></DropdownMenuItem><DropdownMenuItem onClick={() => { onOpenPersonalCenter("profile"); closeNavigation(); }}><Settings2 aria-hidden="true" /><span>{t("account.settings")}</span></DropdownMenuItem><DropdownMenuItem onClick={onSignOut} variant="destructive"><LogOut aria-hidden="true" /><span>{t("account.signOut")}</span></DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
          <GlobalNotifications besideNavigation teamId={activeTeamId} teams={teams} userId={userId} key={userId} discussionNotifications={discussionNotifications} discussionReadReceipt={discussionReadReceipt} getTaskTitle={getNotificationTaskTitle} onDiscussionReadHandled={onDiscussionReadHandled} onOpenTask={onOpenNotificationTask ? (taskId, target, teamId) => onOpenNotificationTask(taskId, target, teamId, closeNavigation) : undefined} placement="topbar" showDemoNotifications={showDemoNotifications} />
        </div>
      </div>
      <div aria-controls="workspace-navigation" aria-label={resizeLabel} aria-orientation="vertical" aria-valuemax={maxNavigationWidth} aria-valuemin={minNavigationWidth} aria-valuenow={navigationWidth} className="workspace-navigation-resize-handle" onDoubleClick={() => setNavigationWidth(defaultNavigationWidth)} onKeyDown={resizeWithKeyboard} onLostPointerCapture={endResize} onPointerCancel={endResize} onPointerDown={startResize} onPointerMove={moveResize} onPointerUp={endResize} role="separator" tabIndex={mobile ? -1 : 0} />
    </aside>
  </>;
}
