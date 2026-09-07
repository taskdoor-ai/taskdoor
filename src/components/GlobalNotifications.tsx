import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, Broom, Check, Filter, Inbox } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import "@/styles/notifications.css";

type NotificationReadFilter = "all" | "unread" | "read";
type NotificationResponse = "pending" | "accepted" | "declined";

type NotificationBase = {
  id: string;
  read: boolean;
  time: string;
  title: string;
};

type InvitationNotification = NotificationBase & {
  actor: string;
  completionCriteria: string[];
  dueAt: string;
  kind: "invitation";
  response: NotificationResponse;
};

type AiUpdateNotification = NotificationBase & {
  discoveredAt: string;
  kind: "ai-update";
  summary: string;
  taskId: string;
};

type NotificationItem = InvitationNotification | AiUpdateNotification;

const initialNotifications: NotificationItem[] = [
  {
    actor: "陈默",
    completionCriteria: [
      "第二批达人名单按合作优先级完成确认",
      "目标预算与合作档期形成可执行结论",
    ],
    dueAt: "2026 / 09 / 30",
    id: "creator-business-assignment",
    kind: "invitation",
    read: false,
    response: "pending",
    time: "10 分钟前",
    title: "确认第二批达人名单与合作档期",
  },
  {
    discoveredAt: "今天 09:10",
    id: "creator-schedule-conflict",
    kind: "ai-update",
    read: false,
    summary: "第二批达人中有 3 位合作档期与双十一排期冲突，可能影响后续签约。",
    taskId: "fragrance-creator-business",
    time: "22 分钟前",
    title: "确认第二批达人名单与合作档期",
  },
];

const readFilterLabels: Record<NotificationReadFilter, string> = { all: "全部", read: "已读", unread: "未读" };

export function GlobalNotifications({ onOpenTaskInsight, placement = "rail" }: {
  onOpenTaskInsight?: (taskId: string) => void;
  placement?: "rail" | "topbar";
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<NotificationReadFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    all: items.length,
    read: items.filter((item) => item.read).length,
    unread: items.filter((item) => !item.read).length,
  }), [items]);
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const visibleItems = items.filter((item) => activeFilter === "all" || (activeFilter === "read" ? item.read : !item.read));

  useEffect(() => {
    if (!filterOpen) return;
    const closeFilter = (event: MouseEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", closeFilter);
    return () => document.removeEventListener("mousedown", closeFilter);
  }, [filterOpen]);

  const markAllRead = () => {
    setItems((current) => current.map((item) => item.read ? item : { ...item, read: true }));
  };

  const respondToInvitation = (item: InvitationNotification, response: Exclude<NotificationResponse, "pending">) => {
    setItems((current) => current.map((currentItem) => currentItem.id === item.id && currentItem.kind === "invitation"
      ? { ...currentItem, read: true, response }
      : currentItem));
    setSelectedId(null);
  };

  const openItem = (item: NotificationItem) => {
    setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, read: true } : currentItem));
    setSelectedId(item.id);
  };

  const resetDetail = () => {
    setSelectedId(null);
  };

  const changeSheetOpen = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      resetDetail();
      setFilterOpen(false);
    }
  };

  const openRelatedTask = (item: AiUpdateNotification) => {
    onOpenTaskInsight?.(item.taskId);
    changeSheetOpen(false);
  };

  return <Sheet onOpenChange={changeSheetOpen} open={sheetOpen}>
    <SheetTrigger ref={triggerRef} render={<button aria-label={`通知，${counts.unread} 项未读`} className={placement === "topbar" ? "notification-trigger notification-trigger-topbar" : "rail-item notification-trigger"} data-tooltip={placement === "rail" ? "通知" : undefined} title={placement === "topbar" ? "通知" : undefined} type="button" />}>
      <Bell aria-hidden="true" size={18} />
      {counts.unread > 0 && <span aria-hidden="true" className="notification-trigger-count">{counts.unread > 99 ? "99+" : counts.unread}</span>}
    </SheetTrigger>
    <SheetContent finalFocus={triggerRef} initialFocus={panelRef} ref={panelRef} side={placement === "topbar" ? "right" : "left"} tabIndex={-1}>
      <SheetHeader className={selectedItem ? "notification-header-detail" : undefined}>
        {selectedItem && <Button aria-label="返回通知列表" className="notification-back" onClick={resetDetail} size="icon-sm" type="button" variant="ghost"><ArrowLeft aria-hidden="true" /></Button>}
        <div>
          <SheetTitle>{selectedItem ? selectedItem.kind === "invitation" ? "协作邀请" : "AI 诊断" : "通知"}</SheetTitle>
          <SheetDescription>{selectedItem
            ? selectedItem.kind === "invitation" ? `${selectedItem.actor} · ${selectedItem.time}` : `AI 发现 · ${selectedItem.time}`
            : "协作邀请与 AI 发现的重要变化。"}</SheetDescription>
        </div>
        {!selectedItem && <div className="notification-header-actions">
          <button aria-label="全部标为已读" className="notification-mark-read" disabled={counts.unread === 0} onClick={markAllRead} title="全部标为已读" type="button"><Broom aria-hidden="true" /></button>
          <div className="notification-filter" ref={filterRef}>
            <button aria-expanded={filterOpen} aria-haspopup="menu" aria-label={`筛选通知，当前${readFilterLabels[activeFilter]}`} className={`notification-filter-trigger ${activeFilter !== "all" ? "active" : ""}`} onClick={() => setFilterOpen((open) => { const nextOpen = !open; if (nextOpen) window.requestAnimationFrame(() => filterRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus()); return nextOpen; })} ref={filterTriggerRef} title="筛选通知" type="button"><Filter aria-hidden="true" /></button>
            {filterOpen && <div aria-label="通知已读状态" className="notification-filter-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setFilterOpen(false); filterTriggerRef.current?.focus(); } }} role="menu">
              {(["all", "unread", "read"] as const).map((filter) => <button aria-checked={activeFilter === filter} className="notification-filter-option" key={filter} onClick={() => { setActiveFilter(filter); setFilterOpen(false); filterTriggerRef.current?.focus(); }} role="menuitemradio" type="button"><Check aria-hidden="true" /><span>{readFilterLabels[filter]}</span><small>{counts[filter]}</small></button>)}
            </div>}
          </div>
        </div>}
      </SheetHeader>

      {selectedItem ? <div className="notification-detail">
        {selectedItem.kind === "invitation" ? <>
          <section className="notification-invitation-heading">
            <span>任务名称</span>
            <h2 className="notification-invitation-title">{selectedItem.title}</h2>
          </section>

          <section className="notification-criteria">
            <h3>完成标准</h3>
            <ul>{selectedItem.completionCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
          </section>

          <dl className="notification-deadline">
            <div><dt>截止时间</dt><dd>{selectedItem.dueAt}</dd></div>
          </dl>

          {selectedItem.response === "pending" ? <div className="notification-detail-actions">
            <Button onClick={() => respondToInvitation(selectedItem, "declined")} type="button" variant="outline">拒绝</Button>
            <Button onClick={() => respondToInvitation(selectedItem, "accepted")} type="button">接受</Button>
          </div> : <div className="notification-response">
            <p>{selectedItem.response === "accepted" ? "已接受该任务邀请。" : "已拒绝该任务邀请。"}</p>
            <Button onClick={resetDetail} type="button" variant="outline">返回通知</Button>
          </div>}
        </> : <section className="notification-ai-update">
          <div>
            <h3>结论</h3>
            <p>{selectedItem.summary}</p>
          </div>
          <dl>
            <div><dt>任务</dt><dd><button className="notification-task-link" onClick={() => openRelatedTask(selectedItem)} type="button">{selectedItem.title}</button></dd></div>
          </dl>
        </section>}
      </div> : <div className="notification-list-view">
        {visibleItems.length > 0 ? <div className="notification-list">
          {visibleItems.map((item) => <button className={`notification-item ${item.read ? "read" : "unread"}`} key={item.id} onClick={() => openItem(item)} type="button">
            <span className="notification-item-copy">
              <span className="notification-item-event">
                {!item.read && <span aria-hidden="true" className="notification-unread-dot" />}
                <span className="notification-item-event-copy">{item.kind === "invitation"
                  ? <><strong>【协作邀请】</strong>{item.actor}邀请你参与任务</>
                  : <><strong>【AI 诊断】</strong>发现一项需要你留意的变化</>}</span>
                <time>{item.time}</time>
              </span>
              <span className="notification-item-context"><small>{item.title}</small></span>
            </span>
          </button>)}
        </div> : <div className="notification-empty"><Inbox aria-hidden="true" /><h2>没有{readFilterLabels[activeFilter]}通知</h2><p>{activeFilter === "unread" ? "你已经读完了当前所有通知。" : "符合当前筛选条件的通知会出现在这里。"}</p></div>}
      </div>}
    </SheetContent>
  </Sheet>;
}
