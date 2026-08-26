import { useEffect, useRef, useState, type DragEvent } from "react";
import { Archive, ArrowRight, CalendarRange, Database, FileCheck2, Flame, Hourglass, MessageSquareWarning, MessagesSquare, Send, ShieldCheck, Sparkles, Users, type LucideIcon } from "lucide-react";
import "@/personal-workbench-v3.css";
import { GradientBackground } from "@/components/ui/pipo-background";

type PersonalWorkbenchProps = { localAiConnected: boolean; onConnectLocalAi: () => void; onCreateTask: () => void };
type TaskNode = { id: string; title: string; meta: string; tag?: string; icon: LucideIcon; x: number; y: number };

const initialTasks: TaskNode[] = [
  { id: "refund", title: "确认退款与撤单规则", meta: "今天 16:00", tag: "待确认", icon: FileCheck2, x: 7, y: 16 },
  { id: "retry", title: "评审 retry 修复草案", meta: "今天 · 30m", icon: MessagesSquare, x: 24, y: 34 },
  { id: "samples", title: "整理灰度异常样本库", meta: "周四前 · 90m", tag: "深度工作", icon: Database, x: 70, y: 15 },
  { id: "permissions", title: "完善人工恢复权限模型", meta: "本周 · 60m", icon: ShieldCheck, x: 55, y: 36 },
  { id: "gray", title: "汇总今日门店灰度数据", meta: "林洁 · 15:00", tag: "已委派", icon: Users, x: 8, y: 69 },
  { id: "archive", title: "整理历史项目归档命名", meta: "有空时 · 20m", icon: Archive, x: 70, y: 69 },
];

const zones = [
  { id: "urgent-important", name: "重要且紧急", className: "pw3-dz1" },
  { id: "important", name: "重要不紧急", className: "pw3-dz2" },
  { id: "urgent", name: "紧急不重要", className: "pw3-dz3" },
  { id: "later", name: "不重要不紧急", className: "pw3-dz4" },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 12) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
};

export function PersonalWorkbench({ localAiConnected, onConnectLocalAi }: PersonalWorkbenchProps) {
  const [time, setTime] = useState("");
  const [tasks, setTasks] = useState(initialTasks);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1800);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, zoneName: string) => {
    event.preventDefault();
    if (!draggedId || !mapRef.current) return;
    const bounds = mapRef.current.getBoundingClientRect();
    const x = Math.min(78, Math.max(3, ((event.clientX - bounds.left - 105) / bounds.width) * 100));
    const y = Math.min(84, Math.max(10, ((event.clientY - bounds.top - 30) / bounds.height) * 100));
    setTasks((current) => current.map((task) => task.id === draggedId ? { ...task, x, y } : task));
    setDraggedId(null);
    setActiveZone(null);
    notify(`已移动到“${zoneName}”`);
  };

  return <main className="pw3"><GradientBackground /><div className="pw3-workspace">
    <header className="pw3-mast"><div><div className="pw3-date">Friday, August 21 · Personal attention system</div><div className="pw3-title"><h1>{getGreeting()}，周岚</h1><p>今天也从最重要的事开始。</p></div></div></header>

    <section className="pw3-dayline"><div className="pw3-now"><div className="pw3-time">{time}</div><small>今日<br />可用 3h 20m</small></div><div className="pw3-track"><div className="pw3-nowline" /><div className="pw3-event pw3-ev1">修复评审</div><div className="pw3-event pw3-ev2">门店灰度同步</div><div className="pw3-event pw3-ev3">规则确认截止</div><div className="pw3-hours"><span>09</span><span>11</span><span>13</span><span>15</span><span>17</span><span>19</span></div></div><div className="pw3-capacity"><strong>64%</strong><span>今日完成度</span></div></section>

    <div className="pw3-layout"><div><section className="pw3-focus"><div className="pw3-focus-index"><b>01</b><span>Focus now</span></div><div className="pw3-focus-copy"><small>今日首要任务 · 阻塞 2 位协作者</small><h2>确认退款与撤单的幂等规则</h2><p>完成这个决定，修复方案才能进入门店灰度。</p></div><div className="pw3-focus-action"><button type="button" onClick={() => notify("正在打开任务上下文")}>继续处理&nbsp; <ArrowRight className="inline size-3" /></button></div></section>

      <section className="pw3-map-panel"><header className="pw3-map-head"><div><div className="pw3-eyebrow">Attention map</div><h3>待办不是列表，是一张注意力地图</h3></div><div className="pw3-legend"><span><i className="pw3-dot" style={{ background: "var(--red)" }} />紧急</span><span><i className="pw3-dot" style={{ background: "var(--blue)" }} />重要</span><span>拖动重新判断</span></div></header>
        <div className="pw3-map" ref={mapRef}><span className="pw3-axis pw3-axis-top">重要程度 ↑</span><span className="pw3-axis pw3-axis-left">紧急程度 ↑</span>
          <div className="pw3-q-label pw3-ql1"><span><Flame /></span>立即处理</div><div className="pw3-q-label pw3-ql2"><span><CalendarRange /></span>安排时间</div><div className="pw3-q-label pw3-ql3"><span><Send /></span>协作委派</div><div className="pw3-q-label pw3-ql4"><span><Archive /></span>稍后再看</div>
          {zones.map((zone) => <div key={zone.id} className={`pw3-dropzone ${zone.className} ${activeZone === zone.id ? "is-over" : ""}`} onDragEnter={() => setActiveZone(zone.id)} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setActiveZone(null); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, zone.name)} />)}
          {tasks.map((task) => { const Icon = task.icon; return <article key={task.id} draggable onDragStart={() => setDraggedId(task.id)} onDragEnd={() => { setDraggedId(null); setActiveZone(null); }} className={`pw3-task ${draggedId === task.id ? "is-dragging" : ""}`} style={{ left: `${task.x}%`, top: `${task.y}%` }}><div className="pw3-task-top"><span className="pw3-task-icon"><Icon /></span><strong>{task.title}</strong></div><div className="pw3-task-meta"><span>{task.meta}</span>{task.tag && <span className="pw3-pill">{task.tag}</span>}</div></article>; })}
        </div>
      </section></div>

      <aside className="pw3-side"><section className="pw3-signal"><header className="pw3-signal-head"><div><MessageSquareWarning /><h3>等待我的决定</h3></div><span className="pw3-badge">3</span></header><div className="pw3-decision"><strong>确认任务结论与遗留问题</strong><p>已等待 2 小时 · 阻塞后续待办</p><div className="pw3-decision-actions"><button className="pw3-yes" onClick={() => notify("已确认任务结论")}>确认</button><button className="pw3-view">查看上下文</button></div></div><div className="pw3-decision"><strong>批准 12 家门店灰度范围</strong><p>林洁正在等待 · 45 分钟</p><div className="pw3-decision-actions"><button className="pw3-yes" onClick={() => notify("已批准灰度范围")}>批准</button><button className="pw3-view">查看</button></div></div></section>
        <section className="pw3-signal pw3-waiting"><header className="pw3-signal-head"><div><Hourglass /><h3>等待他人推进</h3></div><span className="pw3-badge">4</span></header><div className="pw3-person"><span className="pw3-person-img">林</span><div><strong>灰度数据汇总</strong><small>承诺今天 15:00</small></div><span className="pw3-status">进行中</span></div><div className="pw3-person"><span className="pw3-person-img">陈</span><div><strong>审计字段补充</strong><small>最后更新 28 分钟前</small></div><span className="pw3-status">待提交</span></div></section>
        <section className="pw3-signal pw3-insight"><header className="pw3-signal-head"><div><Sparkles /><h3>AI 注意力建议</h3></div></header><p>你今天的会议会切断两段深度工作。建议把权限模型集中安排在 16:30 后。</p><button type="button" onClick={() => { if (localAiConnected) notify("建议已加入时间轴"); else onConnectLocalAi(); }}>{localAiConnected ? "应用到时间轴 →" : "连接本地 AI →"}</button></section>
        <div className="pw3-metrics"><div className="pw3-mini"><strong>6</strong><span>今日待办</span></div><div className="pw3-mini"><strong>2</strong><span>即将截止</span></div><div className="pw3-mini"><strong>3h</strong><span>专注时间</span></div></div>
      </aside></div>
  </div><div className={`pw3-toast ${toast ? "is-visible" : ""}`} role="status">{toast}</div></main>;
}
