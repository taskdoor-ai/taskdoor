import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Bookmark, FileText, MessageSquareText, Search, SearchX, SquareCheckBig, Users } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { mockTeamName, useMockText } from "@/ai/task-display";
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
export function FavoritesPage({ items, onOpen, onRemove, renderFileIcon }: {
  items: readonly FavoriteItem[];
  /** The file tree's own icon for a file name, so a saved file looks as it does in its task. */
  renderFileIcon?: (fileName: string) => ReactNode;
  onOpen: (item: FavoriteItem) => void;
  onRemove: (item: FavoriteItem) => void;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const mock = useMockText();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const tabLabel = (value: Tab) => ({ all: en ? "All" : "全部", task: en ? "Tasks" : "任务", discussion: en ? "Discussions" : "讨论", file: en ? "Files" : "文件" })[value];
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
  const itemTitle = (item: FavoriteItem) => item.kind === "task" ? taskTitle(item) : item.kind === "file" ? mock.text(item.label ?? "") : (item.label || (en ? "(No text)" : "（无文字内容）"));
  const needle = query.trim().toLowerCase();
  // Search covers what a row shows: its title, its task's name and number, and its team.
  const matches = (item: FavoriteItem) => !needle || [itemTitle(item), taskTitle(item), item.taskNumber === undefined ? "" : `#${item.taskNumber}`, item.teamName ?? "", item.teamName ? mockTeamName(locale, item.teamId, item.teamName) : ""].some(text => text.toLowerCase().includes(needle));
  const visible = items.filter(item => (tab === "all" || item.kind === tab) && matches(item));
  const emptyTitle = tab === "all" ? (en ? "No favorites yet" : "还没有收藏")
    : en ? `No favorite ${tabLabel(tab).toLowerCase()}` : `还没有收藏的${tabLabel(tab)}`;

  return <article className="favorites-page">
    <div className="favorites-content">
      <header className="favorites-heading">
        <h1 id="favorites-heading" tabIndex={-1}>{en ? "Favorites" : "收藏"}</h1>
        <p>{en ? "Only you can see your favorites." : "收藏仅自己可见。"}</p>
      </header>
      <div className="favorites-toolbar">
        <div aria-label={en ? "Favorite types" : "收藏类型"} className="favorites-tabs" role="tablist">
          {tabs.map(value => <button aria-controls="favorites-panel" aria-selected={tab === value} id={`favorites-tab-${value}`} key={value} onClick={() => setTab(value)} onKeyDown={moveTab} role="tab" tabIndex={tab === value ? 0 : -1} type="button">{tabLabel(value)}</button>)}
        </div>
        {items.length > 0 && <div className="favorites-search">
          <Search aria-hidden="true" size={16} />
          <Input aria-label={en ? "Search favorites" : "搜索收藏"} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape" && query) { event.preventDefault(); setQuery(""); } }} placeholder={en ? "Search favorites" : "搜索收藏"} type="search" value={query} />
        </div>}
      </div>
      <section aria-labelledby={`favorites-tab-${tab}`} id="favorites-panel" role="tabpanel">
        {visible.length ? <ul className="favorites-list">
          {visible.map(item => {
            const Icon = kindIcons[item.kind];
            const title = itemTitle(item);
            const context = item.kind === "task" ? (item.taskNumber === undefined ? "" : `#${item.taskNumber}`) : taskLine(item);
            const teamName = item.teamName ? mockTeamName(locale, item.teamId, item.teamName) : "";
            const saved = formatRelativeDateTime(item.createdAt, locale, now);
            return <li className="favorites-item" data-kind={item.kind} key={item.key}>
              <button className="favorites-item-open" onClick={() => onOpen(item)} type="button">
                <span aria-hidden="true" className="favorites-item-icon">{item.kind === "file" && renderFileIcon ? renderFileIcon(item.label ?? "") : <Icon size={16} />}</span>
                <span className="favorites-item-text">
                  <span className="favorites-item-title">{title}</span>
                  {context && <span className="favorites-item-context">{context}</span>}
                </span>
                <span className="favorites-item-meta">
                  {saved && <time dateTime={new Date(item.createdAt).toISOString()} title={saved.full}>{saved.label}</time>}
                  {/* The team, marked as the inbox marks it: favorites come from every team. */}
                  {teamName && <span className="favorites-item-team" title={teamName}><Users aria-hidden="true" /><span>{teamName}</span></span>}
                </span>
              </button>
              <button aria-label={en ? `Remove from favorites: ${title}` : `取消收藏：${title}`} className="favorites-item-remove" onClick={() => onRemove(item)} title={en ? "Remove from favorites" : "取消收藏"} type="button"><Bookmark aria-hidden="true" size={15} /></button>
            </li>;
          })}
        </ul> : needle && items.some(item => tab === "all" || item.kind === tab) ? <div className="favorites-empty">
          <SearchX aria-hidden="true" size={20} />
          <strong>{en ? "No matching favorites" : "没有匹配的收藏"}</strong>
          <p>{en ? "Try another word, or clear the search." : "换个关键词试试，或清除搜索。"}</p>
          <Button onClick={() => setQuery("")} size="sm" type="button" variant="outline">{en ? "Clear search" : "清除搜索"}</Button>
        </div> : <div className="favorites-empty">
          <Bookmark aria-hidden="true" size={20} />
          <strong>{emptyTitle}</strong>
          <p>{en ? "Choose “Add to favorites” on a task, a discussion message or a file to keep it here." : "在任务、讨论或文件上选择「收藏」，它会出现在这里。"}</p>
        </div>}
      </section>
    </div>
  </article>;
}
