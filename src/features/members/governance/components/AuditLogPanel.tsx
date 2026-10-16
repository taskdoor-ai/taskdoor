import { useI18n } from "@/shared/i18n/I18nProvider";
import { GovernancePagination, GOVERNANCE_PAGE_SIZE } from '@/features/members/governance/components/GovernancePagination'
import { useState } from 'react'
import { MemberListIdentity } from '@/features/members/components/MemberListIdentity'
import { PersonFilterSelect } from '@/features/members/components/PersonFilterSelect'
import { Bot } from 'lucide-react'
import {
  auditActions,
  filterAuditEvents,
  governanceWrites,
  isAuditAction,
  isGovernanceAction,
  type AuditEvent,
} from '@/features/members/governance/lib/governance'
import { governanceMessages } from '@/features/members/governance/i18n/governance-messages'
import { useCatalog } from '@/shared/i18n/catalog'
import { formatDisplayDateTime } from '@/shared/lib/date-time'
import { useResponsiveControlSize } from '@/shared/lib/useResponsiveControlSize'
import type { PersonOption } from '@/shared/model/task-model'
import { ListFilterSelect } from '@/shared/ui/list-filter-select'
import { SelectItem } from '@/shared/ui/select'
import '@/features/members/governance/styles/governance.css'

type MessageKey = keyof typeof governanceMessages
const ANY = '*'
/** The governance writes at once (the "Governance actions" filter). */
const GOVERNANCE = 'governance'

/**
 * "Audit log" in team settings (W3-015), for the team's Owner and administrators, drawn as the
 * production app draws it: the members table with a filter by who and by action. The PM demo
 * shows a fixed set of the team's recent events.
 */
export function AuditLogPanel({ events, members, onOpenTask }: { events: AuditEvent[]; members: PersonOption[]; onOpenTask: (taskId: string) => void }) {
  const t = useCatalog(governanceMessages)
  const { locale } = useI18n();
  const controlSize = useResponsiveControlSize()
  const [page, setPage] = useState(1)
  const [actor, setActor] = useState<string>(ANY)
  const [action, setAction] = useState<string>(ANY)
  const shown = filterAuditEvents(events, {
    ...(actor !== ANY ? { actorId: actor } : {}),
    ...(action === GOVERNANCE ? { actions: governanceWrites } : action !== ANY ? { actions: [action] } : {}),
  })
  const pageCount = Math.max(1, Math.ceil(shown.length / GOVERNANCE_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleEvents = shown.slice((currentPage - 1) * GOVERNANCE_PAGE_SIZE, currentPage * GOVERNANCE_PAGE_SIZE)
  const actorName = (event: AuditEvent) =>
    event.actorType === 'SYSTEM'
      ? t('audit.system')
      : (members.find((member) => member.id === event.actorId)?.name ?? t('members.former'))
  const actionLabel = (value: string) =>
    isAuditAction(value) ? t(`audit.action.${value}` as MessageKey) : t('audit.other', { code: value })

  return (
    <section aria-labelledby="audit-log-title" className="team-members-panel audit-log-panel">
      <div className="responsibility-toolbar">
        <div>
          <h2 id="audit-log-title">{t('audit.title')}</h2>
        </div>
      </div>
      <p role="note">{t('audit.note')}</p>
      <div className="team-members-summary team-members-tabs">
        <strong>{t('audit.filter.actor')}</strong>
        <PersonFilterSelect
          ariaLabel={t('audit.filter.actor')}
          members={members}
          menuLabel={t('audit.filter.actor')}
          onChange={(value) => { setActor(value); setPage(1) }}
          scopeOption={{ id: ANY, label: t('audit.filter.anyone') }}
          size={controlSize}
          value={actor}
        />
        <strong>{t('audit.filter.action')}</strong>
        <ListFilterSelect
          align="start"
          ariaLabel={t('audit.filter.action')}
          label={action === ANY ? t('audit.filter.anyAction') : action === GOVERNANCE ? t('audit.filter.governanceWrites') : actionLabel(action)}
          onChange={(value) => { setAction(value); setPage(1) }}
          size={controlSize}
          value={action}
        >
          <SelectItem value={ANY}>{t('audit.filter.anyAction')}</SelectItem>
          <SelectItem value={GOVERNANCE}>{t('audit.filter.governanceWrites')}</SelectItem>
          {auditActions.map((value) => (
            <SelectItem key={value} value={value}>
              {actionLabel(value)}
            </SelectItem>
          ))}
        </ListFilterSelect>
      </div>
      {shown.length === 0 ? (
        <p role="status">{t('audit.empty')}</p>
      ) : (
        <div className="team-member-table">
          <div aria-hidden="true" className="team-member-list-head">
            <span>{t('audit.column.action')}</span>
            <span>{t('audit.column.task')}</span>
            <span>{t('audit.column.time')}</span>
            <span>{t('audit.column.actor')}</span>
          </div>
          <ul aria-label={t('audit.list')} className="team-member-list">
            {visibleEvents.map((event) => (
              <li key={event.id}>
                <div>
                  <span>
                    <strong>
                      {actionLabel(event.action)}
                      {isGovernanceAction(event.action) && <em className="invited">{t('audit.badge.governance')}</em>}
                    </strong>
                  </span>
                </div>
                <div className="audit-log-task">
                  {!event.taskId ? (
                    <span aria-hidden="true">—</span>
                  ) : event.taskTitle ? (
                    <button aria-label={t('audit.openTask', { title: event.taskTitle })} onClick={() => onOpenTask(event.taskId!)} title={event.taskTitle} type="button">
                      {event.taskTitle}
                    </button>
                  ) : (
                    <span className="audit-log-task-gone">{t('audit.taskUnavailable')}</span>
                  )}
                </div>
                <div className="team-member-responsibility">
                  <p className="team-member-responsibility-text">
                    <time dateTime={event.occurredAt} title={formatDisplayDateTime(event.occurredAt, { locale, year: 'always' }) ?? undefined}>{formatDisplayDateTime(event.occurredAt, { locale }) ?? '—'}</time>
                  </p>
                </div>
                <span className="audit-log-actor">
                  {event.actorType === 'SYSTEM'
                    ? <span className="member-list-identity"><span aria-hidden="true" className="audit-log-system-avatar"><Bot size={16} /></span><span>{actorName(event)}</span></span>
                    : <MemberListIdentity name={actorName(event)} personId={event.actorId} profile={members.find(member => member.id === event.actorId)} showProfilePreview={members.some(member => member.id === event.actorId)} />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {shown.length > 0 && <GovernancePagination label={t('audit.pagination')} page={currentPage} total={pageCount} onChange={setPage} />}
    </section>
  )
}
