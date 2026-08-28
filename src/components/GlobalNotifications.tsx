import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, Bot, Check, FileCheck2, Filter, GitPullRequestArrow, Inbox, MessageSquareText, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import "@/styles/notifications.css";

type NotificationBucket = "pending" | "progress" | "processed";
type NotificationReadFilter = "all" | "unread" | "read";
type NotificationKind = "assignment" | "handoff" | "insight" | "decision" | "update";

type NotificationItem = {
  actor: string;
  bucket: NotificationBucket;
  detail: string;
  effect: string;
  id: string;
  kind: NotificationKind;
  outcome?: string;
  read: boolean;
  source: string;
  summary: string;
  taskId?: string;
  time: string;
  title: string;
  whyNow: string;
};

const initialNotifications: NotificationItem[] = [
  {
    actor: "林洁",
    bucket: "pending",
    detail: "接受后，你负责 12 家门店的现场验证、异常样本整理与每日结果汇总。父任务仍由林洁负责。",
    effect: "接受只确认这项有界工作；不会扩大灰度范围、修改 POS、批准发布或自动获得不可见文件权限。",
    id: "gray-release-assignment",
    kind: "assignment",
    read: false,
    source: "任务 · POS 优惠券重复核销修复",
    summary: "邀请你负责「完成 12 家门店灰度验证」",
    time: "10 分钟前",
    title: "协作邀请",
    whyNow: "灰度方案已准备完成，需要在 8 月 29 日前返回验证结果。",
  },
  {
    actor: "叶舟",
    bucket: "pending",
    detail: "拟把现场异常收集、门店确认和每日汇总责任交给你；叶舟继续负责培训材料与常见问题更新。",
    effect: "双方同意同一范围后仍需检查文件权限和协议版本；检查通过前，原责任继续有效。",
    id: "store-handoff",
    kind: "handoff",
    read: false,
    source: "工作交接 · 门店灰度现场协调",
    summary: "请你确认一项责任移交",
    time: "35 分钟前",
    title: "责任移交",
    whyNow: "叶舟下周休假，现场协调需要明确接续人。",
  },
  {
    actor: "AgentDoor AI",
    bucket: "pending",
    detail: "当前结论只引用了修复说明，没有退款、撤单和离线重放异常路径的固定版本证据。",
    effect: "这里仅展示建议概览，不会替你完成任务或发布文件；具体处理回到来源任务进行。",
    id: "acceptance-evidence",
    kind: "insight",
    read: false,
    source: "AI 建议 · POS 优惠券重复核销修复",
    summary: "结果依据仍不完整",
    taskId: "coupon-fix",
    time: "1 小时前",
    title: "AI 建议",
    whyNow: "任务接近完成，当前证据不足以支持最终判断。",
  },
  {
    actor: "唐梨",
    bucket: "progress",
    detail: "唐梨已收到你提出的范围调整，当前只确认审核证据清单，不承担正式对外主张批准。",
    effect: "这是一条协作进展，不需要你立即回应。范围确认后会生成新的待处理事项。",
    id: "scope-update",
    kind: "update",
    read: false,
    source: "协作请求 · 新品传播主张审核",
    summary: "范围调整已送达对方",
    time: "今天 09:20",
    title: "协作进展",
    whyNow: "对方已经查看新的责任边界。",
  },
  {
    actor: "林洁",
    bucket: "processed",
    detail: "你已确认门店异常样本汇总，并保留两个待补充问题供父任务继续整合。",
    effect: "结果交付已记录；父任务是否完成仍由父任务负责人另行确认。",
    id: "result-returned",
    kind: "decision",
    outcome: "已确认结果，保留 2 个后续问题",
    read: true,
    source: "结果交回 · 门店异常样本汇总",
    summary: "一项结果交回已处理",
    time: "昨天 16:40",
    title: "已处理",
    whyNow: "处理记录保留用于后续接续。",
  },
];

const kindIcon = {
  assignment: GitPullRequestArrow,
  decision: FileCheck2,
  handoff: ShieldAlert,
  insight: Sparkles,
  update: MessageSquareText,
} satisfies Record<NotificationKind, typeof Bell>;

const readFilterLabels: Record<NotificationReadFilter, string> = { all: "全部", read: "已读", unread: "未读" };

const declineReasons = ["当前承诺冲突", "需要重新排优先级", "缺少必要权限或资料", "范围不适合"];

export function GlobalNotifications({ onOpenTaskInsight }: { onOpenTaskInsight: (taskId: string) => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<NotificationReadFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState<string | null>(null);

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

  const updateItem = (id: string, update: Partial<NotificationItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...update, read: true } : item));
  };

  const finishItem = (item: NotificationItem, outcome: string, bucket: NotificationBucket = "processed") => {
    updateItem(item.id, { bucket, outcome });
    setSelectedId(null);
    setDeclining(false);
    setDeclineReason(null);
  };

  const openItem = (item: NotificationItem) => {
    updateItem(item.id, { read: true });
    setSelectedId(item.id);
    setDeclining(false);
    setDeclineReason(null);
  };

  const resetDetail = () => {
    setSelectedId(null);
    setDeclining(false);
    setDeclineReason(null);
  };

  return <Sheet onOpenChange={(open) => { setSheetOpen(open); if (!open) { resetDetail(); setFilterOpen(false); } }} open={sheetOpen}>
    <SheetTrigger render={<button aria-label={`通知，${counts.unread} 项未读`} className="rail-item notification-trigger" title="通知" type="button" />}>
      <Bell aria-hidden="true" size={18} />
      {counts.unread > 0 && <span aria-hidden="true" className="notification-trigger-count">{counts.unread > 99 ? "99+" : counts.unread}</span>}
    </SheetTrigger>
    <SheetContent initialFocus={panelRef} ref={panelRef} tabIndex={-1}>
      <SheetHeader>
        {selectedItem && <Button aria-label="返回通知列表" className="notification-back" onClick={resetDetail} size="icon-sm" type="button" variant="ghost"><ArrowLeft aria-hidden="true" /></Button>}
        <div>
          <SheetTitle>{selectedItem ? selectedItem.title : "通知"}</SheetTitle>
          <SheetDescription>{selectedItem ? selectedItem.kind === "insight" ? "查看建议概览，并前往来源任务处理。" : "在这里完成回应，不需要先进入任务或文件。" : "协作请求、AI 建议和相关动态。"}</SheetDescription>
        </div>
        {!selectedItem && <div className="notification-filter" ref={filterRef}>
          <button aria-expanded={filterOpen} aria-haspopup="menu" aria-label={`筛选通知，当前${readFilterLabels[activeFilter]}`} className={`notification-filter-trigger ${activeFilter !== "all" ? "active" : ""}`} onClick={() => setFilterOpen((open) => { const nextOpen = !open; if (nextOpen) window.requestAnimationFrame(() => filterRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus()); return nextOpen; })} ref={filterTriggerRef} title="筛选通知" type="button"><Filter aria-hidden="true" /></button>
          {filterOpen && <div aria-label="通知已读状态" className="notification-filter-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setFilterOpen(false); filterTriggerRef.current?.focus(); } }} role="menu">
            {(["all", "unread", "read"] as const).map((filter) => <button aria-checked={activeFilter === filter} className="notification-filter-option" key={filter} onClick={() => { setActiveFilter(filter); setFilterOpen(false); filterTriggerRef.current?.focus(); }} role="menuitemradio" type="button"><Check aria-hidden="true" /><span>{readFilterLabels[filter]}</span><small>{counts[filter]}</small></button>)}
          </div>}
        </div>}
      </SheetHeader>

      {selectedItem ? <div className="notification-detail">
        <div className={`notification-detail-mark ${selectedItem.kind}`} aria-hidden="true">{selectedItem.kind === "insight" ? <Bot /> : (() => { const Icon = kindIcon[selectedItem.kind]; return <Icon />; })()}</div>
        <div className="notification-detail-heading">
          <span>{selectedItem.source}</span>
          <h2>{selectedItem.summary}</h2>
          <p>{selectedItem.actor} · {selectedItem.time}</p>
        </div>

        {declining ? <section className="notification-decline">
          <h3>拒绝这项工作</h3>
          <p>你可以直接拒绝，不需要解释个人原因。以下原因仅用于帮助继续规划，选择不是必填项。</p>
          <div className="notification-reason-options" role="group" aria-label="可选拒绝原因">
            {declineReasons.map((reason) => <button aria-pressed={declineReason === reason} className="notification-reason-option" key={reason} onClick={() => setDeclineReason(declineReason === reason ? null : reason)} type="button">{reason}</button>)}
          </div>
          <div className="notification-privacy-note"><ShieldAlert aria-hidden="true" /><p><strong>私密保护</strong><span>发起人只会看到“已拒绝，请重新安排”以及你主动选择公开的结构化结果；不会看到响应耗时或历史拒绝记录。</span></p></div>
          <div className="notification-detail-actions"><Button onClick={() => finishItem(selectedItem, declineReason ? `已拒绝 · ${declineReason}` : "已拒绝 · 未提供原因")} type="button">确认拒绝</Button><Button onClick={() => { setDeclining(false); setDeclineReason(null); }} type="button" variant="outline">返回</Button></div>
        </section> : <>
          <dl className="notification-context">
            <div><dt>为什么现在提醒</dt><dd>{selectedItem.whyNow}</dd></div>
            <div><dt>范围与上下文</dt><dd>{selectedItem.detail}</dd></div>
            <div><dt>{selectedItem.kind === "insight" ? "信息边界" : "处理后的边界"}</dt><dd>{selectedItem.effect}</dd></div>
            {selectedItem.outcome && <div><dt>处理结果</dt><dd>{selectedItem.outcome}</dd></div>}
          </dl>

          {selectedItem.bucket === "pending" && <div className="notification-detail-actions">
            {selectedItem.kind === "insight" ? <Button onClick={() => { if (selectedItem.taskId) { setSheetOpen(false); onOpenTaskInsight(selectedItem.taskId); } }} type="button">前往任务查看</Button> : <>
              <Button onClick={() => finishItem(selectedItem, "已接受 · 待正式权限与版本检查")} type="button">接受</Button>
              <Button onClick={() => setDeclining(true)} type="button" variant="outline">拒绝</Button>
            </>}
          </div>}
          {selectedItem.bucket !== "pending" && <div className="notification-detail-actions"><Button onClick={resetDetail} type="button" variant="outline">返回通知</Button></div>}
        </>}
      </div> : <div className="notification-list-view">
        {visibleItems.length > 0 ? <div className="notification-list">
          {visibleItems.map((item) => {
            const Icon = kindIcon[item.kind];
            return <button className={`notification-item ${item.read ? "read" : "unread"}`} key={item.id} onClick={() => openItem(item)} type="button">
              <span className={`notification-item-icon ${item.kind}`}>{item.kind === "insight" ? <Bot aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
              <span className="notification-item-copy"><span><strong>{item.title}</strong><time>{item.time}</time></span><b>{item.summary}</b><small>{item.source}</small>{item.outcome && <em>{item.outcome}</em>}</span>
            </button>;
          })}
        </div> : <div className="notification-empty"><Inbox aria-hidden="true" /><h2>没有{readFilterLabels[activeFilter]}通知</h2><p>{activeFilter === "unread" ? "你已经读完了当前所有通知。" : "符合当前筛选条件的通知会出现在这里。"}</p></div>}
      </div>}
    </SheetContent>
  </Sheet>;
}
