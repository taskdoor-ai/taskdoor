import { useId, useRef, useState, type RefObject } from "react";
import { Check, CheckCheck, ChevronRight, Filter, Search, Users } from "lucide-react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

export const notificationReadFilterLabels = { all: "全部", unread: "未读", read: "已读" };
export type NotificationReadFilter = keyof typeof notificationReadFilterLabels;

type Props = {
  activeFilter: NotificationReadFilter;
  selectedTeamId: string;
  teams?: readonly { id: string; name: string }[];
  counts: Record<NotificationReadFilter, number>;
  filterLabel: string;
  onReadFilterChange: (value: NotificationReadFilter) => void;
  onTeamChange: (id: string) => void;
  portalContainer: RefObject<HTMLDivElement | null>;
};

export function NotificationFilter({ activeFilter, selectedTeamId, teams, counts, filterLabel, onReadFilterChange, onTeamChange, portalContainer }: Props) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<"read" | "team">("read");
  const [query, setQuery] = useState("");
  const firstCategory = useRef<HTMLButtonElement>(null);
  const detailId = useId();
  const radioName = useId();
  const readLabel = en ? "Read status" : "已读状态";
  const teamLabel = ui("所属团队");
  const title = category === "read" ? readLabel : teamLabel;
  const teamOptions = [{ id: "", name: ui("全部团队") }, ...(teams ?? [])].filter(team => team.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const canClear = category === "read" ? activeFilter !== "all" : Boolean(selectedTeamId);
  const focusSelectedOption = () => {
    window.requestAnimationFrame(() => {
      const detail = document.getElementById(detailId);
      (detail?.querySelector<HTMLInputElement>('input:checked') ?? detail?.querySelector<HTMLInputElement>('input'))?.focus({ preventScroll: true });
    });
  };
  const chooseCategory = (next: "read" | "team", focusDetail = false) => {
    setCategory(next);
    setQuery("");
    if (focusDetail) focusSelectedOption();
  };
  const clearCategory = () => {
    if (category === "read") onReadFilterChange("all");
    else { setQuery(""); onTeamChange(""); }
    focusSelectedOption();
  };

  return <Popover modal={false} open={open} onOpenChange={next => {
    setOpen(next);
    if (!next) { setCategory("read"); setQuery(""); }
  }}>
    <PopoverTrigger render={<button aria-label={ui("筛选通知，当前{0}", { 0: filterLabel })} className="notification-filter-trigger" data-filtered={Boolean(selectedTeamId) || activeFilter !== "all" || undefined} title={ui("筛选通知")} type="button" />}><Filter aria-hidden="true" /></PopoverTrigger>
    <PopoverContent align="end" aria-label={ui("筛选通知")} className="notification-filter-panel" collisionPadding={12} initialFocus={firstCategory} portalContainer={portalContainer} positionMethod="fixed" positionerClassName="notification-filter-positioner" sideOffset={8}>
      <div aria-label={en ? "Filter categories" : "筛选分类"} className="notification-filter-categories">
        <button aria-controls={detailId} aria-pressed={category === "read"} className="notification-filter-category" onClick={() => chooseCategory("read")} onKeyDown={event => {
          if (event.key === "ArrowRight") { event.preventDefault(); chooseCategory("read", true); }
        }} ref={firstCategory} type="button"><CheckCheck aria-hidden="true" /><span>{readLabel}</span><ChevronRight aria-hidden="true" /></button>
        {Boolean(teams?.length) && <button aria-controls={detailId} aria-pressed={category === "team"} className="notification-filter-category" onClick={() => chooseCategory("team")} onKeyDown={event => {
          if (event.key === "ArrowRight") { event.preventDefault(); chooseCategory("team", true); }
        }} type="button"><Users aria-hidden="true" /><span>{teamLabel}</span><ChevronRight aria-hidden="true" /></button>}
      </div>
      <div aria-label={title} className="notification-filter-detail" id={detailId} onKeyDown={event => {
        if (event.key === "ArrowLeft" && !(event.target instanceof HTMLInputElement && event.target.type === "text")) {
          event.preventDefault();
          document.getElementById(detailId)?.previousElementSibling?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
        }
      }}>
        <div className="notification-filter-detail-heading"><strong>{title}</strong><button disabled={!canClear} onClick={clearCategory} type="button">{en ? "Clear" : "清除"}</button></div>
        {category === "team" && <div className="notification-filter-search"><Input aria-label={en ? "Search teams" : "搜索团队"} leadingIcon={<Search />} onChange={event => setQuery(event.target.value)} placeholder={en ? "Search teams…" : "搜索团队…"} value={query} /></div>}
        <div aria-label={title} className="notification-filter-values" role="radiogroup">
          {category === "read" ? (["all", "unread", "read"] as const).map(value => <label className="notification-filter-option" key={value}>
            <input checked={activeFilter === value} name={radioName} onChange={() => onReadFilterChange(value)} type="radio" value={value} />
            <Check aria-hidden="true" /><span>{ui(notificationReadFilterLabels[value])}</span><small>{counts[value]}</small>
          </label>) : teamOptions.map(team => <label className="notification-filter-option" key={team.id}>
            <input checked={selectedTeamId === team.id} name={radioName} onChange={() => onTeamChange(team.id)} type="radio" value={team.id} />
            <Check aria-hidden="true" /><span>{team.name}</span>
          </label>)}
          {category === "team" && !teamOptions.length && <p className="notification-filter-empty">{en ? "No matching teams" : "没有匹配的团队"}</p>}
        </div>
      </div>
    </PopoverContent>
  </Popover>;
}
