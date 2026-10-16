import { useCreationI18n } from "@/shared/i18n/creation-messages";
import { Fragment } from "react";
import { History, PanelLeftClose, Plus } from "lucide-react";
import type { CreationSession } from "@/features/tasks/lib/task-creation-sessions";
import { Button } from "@/shared/ui/button";
import { formatDisplayDate, formatDisplayDateTime, formatDisplayTime } from "@/shared/lib/date-time";

export function TaskCreationSessionList({ id, sessions, selectedId, disabled, error, onClose, onNew, onSelect }: {
  id: string;
  sessions: CreationSession[];
  selectedId: string;
  disabled: boolean;
  error: string;
  onClose: () => void;
  onNew: () => void;
  onSelect: (session: CreationSession) => void;
}) {
  const { c, localize, locale } = useCreationI18n();
  const day = (timestamp: number) => formatDisplayDate(timestamp, { locale }) ?? "—";
  return <aside aria-label={c("conversationHistory")} className="creation-session-sidebar" id={id} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header><strong>{c("conversationHistory")}</strong><Button aria-label={c("hideHistory")} onClick={onClose} size="icon-sm" title={c("hideHistory")} type="button" variant="ghost"><PanelLeftClose aria-hidden="true" /></Button></header>
    <Button className="creation-session-new" disabled={disabled} onClick={onNew} size="sm" type="button" variant="outline"><Plus aria-hidden="true" />{c("newConversation")}</Button>
    {error && <p className="creation-session-error" role="alert">{localize(error)}</p>}
    <div className="creation-session-list">
      {sessions.length ? sessions.map((session, index) => {
        const planning = session.workspace.planning;
        const title = planning?.stage === "review" || planning?.stage === "decision" ? planning.form.mainTask.title || session.workspace.request : session.workspace.request;
        return <Fragment key={session.id}>
          {(index === 0 || day(sessions[index - 1].updatedAt) !== day(session.updatedAt)) && <small className="creation-session-date">{day(session.updatedAt) === day(Date.now()) ? c("today") : day(session.updatedAt)}</small>}
          <button aria-current={selectedId === session.id ? "page" : undefined} className="creation-session-item" disabled={disabled} onClick={() => onSelect(session)} title={title} type="button">
            <strong>{title}</strong><span>{session.created ? c("createdTasks", { v0: session.created.createdCount }) : c("noTasksCreated")} · <time dateTime={new Date(session.updatedAt).toISOString()} title={formatDisplayDateTime(session.updatedAt, { locale, year: "always" }) ?? undefined}>{formatDisplayTime(session.updatedAt, { locale }) ?? "—"}</time></span>
          </button>
        </Fragment>;
      }) : !error && <div className="creation-session-empty"><History aria-hidden="true" /><strong>{c("noConversationsYet")}</strong><span>{c("requestsAreSavedHereAutomatically")}</span></div>}
    </div>
    <footer>{disabled ? c("finishEditingOrStopGenerationBeforeSwitching") : c("savedInThisBrowserOnly")}</footer>
  </aside>;
}
