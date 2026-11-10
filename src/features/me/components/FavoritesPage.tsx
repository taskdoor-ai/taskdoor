import { useState, type KeyboardEvent, type ReactNode } from "react";
import { FileText, MessageSquareText, SquareCheckBig, Star } from "lucide-react";
import { useMockText } from "@/ai/task-display";
import type { FavoriteKind, FavoriteRecord } from "@/features/me/lib/favorites";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatRelativeDateTime } from "@/shared/lib/date-time";
import "@/features/me/styles/favorites.css";

/** A favorite with what the page shows about its task and team. */
export type FavoriteItem = FavoriteRecord & {
  key: string;
  taskName?: string;
  taskNumber?: number;
  teamName?: string;
};

type Tab = "all" | FavoriteKind;
const tabs: Tab[] = ["all", "task", "discussion", "file"];
const kindIcons = { task: SquareCheckBig, discussion: MessageSquareText, file: FileText };

/** The viewer's favorites across teams, each jumping back to the original. */
export function FavoritesPage({ items, showTeams, onOpen, onRemove, renderFileIcon }: {
  items: readonly FavoriteItem[];
  /** The file tree's own icon for a file name, so a saved file looks as it does in its task. */
  renderFileIcon?: (fileName: string) => ReactNode;
  showTeams: boolean;
  onOpen: (item: FavoriteItem) => void;
  onRemove: (item: FavoriteItem) => void;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const mock = useMockText();
  const [tab, setTab] = useState<Tab>("all");
  const tabLabel = (value: Tab) => ({ all: en ? "All" : "全部", task: en ? "Tasks" : "任务", discussion: en ? "Discussions" : "讨论", file: en ? "Files" : "文件" })[value];
  const visible = items.filter(item => tab === "all" || item.kind === tab);
  const now = Date.now();
  const moveTab = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
    setTab(next);
    document.getElementById(`favorites-tab-${next}`)?.focus();
  };
  const taskTitle = (item: FavoriteItem) => item.taskName ? mock.field(item.taskId, "title", item.taskName) : (en ? "Unavailable task" : "任务不可访问");
  const taskLine = (item: FavoriteItem) => {
    const number = item.taskNumber === undefined ? "" : ` #${item.taskNumber}`;
    return en ? `Task${number}: ${taskTitle(item)}` : `任务${number}：${taskTitle(item)}`;
  };
  const emptyTitle = tab === "all" ? (en ? "No favorites yet" : "还没有收藏")
    : en ? `No favorite ${tabLabel(tab).toLowerCase()}` : `还没有收藏的${tabLabel(tab)}`;

  return <article className="favorites-page">
    <div className="favorites-content">
      <header className="favorites-heading">
        <h1 id="favorites-heading" tabIndex={-1}>{en ? "Favorites" : "收藏"}</h1>
        <p>{en ? "Only you can see your favorites." : "收藏仅自己可见。"}</p>
      </header>
      <div aria-label={en ? "Favorite types" : "收藏类型"} className="favorites-tabs" role="tablist">
        {tabs.map(value => <button aria-controls="favorites-panel" aria-selected={tab === value} id={`favorites-tab-${value}`} key={value} onClick={() => setTab(value)} onKeyDown={moveTab} role="tab" tabIndex={tab === value ? 0 : -1} type="button">{tabLabel(value)}</button>)}
      </div>
      <section aria-labelledby={`favorites-tab-${tab}`} id="favorites-panel" role="tabpanel">
        {visible.length ? <ul className="favorites-list">
          {visible.map(item => {
            const Icon = kindIcons[item.kind];
            const title = item.kind === "task" ? taskTitle(item) : item.kind === "file" ? mock.text(item.label ?? "") : (item.label || (en ? "(No text)" : "（无文字内容）"));
            const context = [item.kind === "task" ? (item.taskNumber === undefined ? "" : `#${item.taskNumber}`) : taskLine(item), showTeams ? item.teamName : ""].filter(Boolean).join(" · ");
            const saved = formatRelativeDateTime(item.createdAt, locale, now);
            return <li className="favorites-item" data-kind={item.kind} key={item.key}>
              <button className="favorites-item-open" onClick={() => onOpen(item)} type="button">
                <span aria-hidden="true" className="favorites-item-icon">{item.kind === "file" && renderFileIcon ? renderFileIcon(item.label ?? "") : <Icon size={16} />}</span>
                <span className="favorites-item-text">
                  <span className="favorites-item-title">{title}</span>
                  {context && <span className="favorites-item-context">{context}</span>}
                </span>
                {saved && <time className="favorites-item-time" dateTime={new Date(item.createdAt).toISOString()} title={saved.full}>{saved.label}</time>}
              </button>
              <button aria-label={en ? `Remove from favorites: ${title}` : `取消收藏：${title}`} className="favorites-item-remove" onClick={() => onRemove(item)} title={en ? "Remove from favorites" : "取消收藏"} type="button"><Star aria-hidden="true" size={15} /></button>
            </li>;
          })}
        </ul> : <div className="favorites-empty">
          <Star aria-hidden="true" size={20} />
          <strong>{emptyTitle}</strong>
          <p>{en ? "Choose “Add to favorites” on a task, a discussion message or a file to keep it here." : "在任务、讨论或文件上选择「收藏」，它会出现在这里。"}</p>
        </div>}
      </section>
    </div>
  </article>;
}
