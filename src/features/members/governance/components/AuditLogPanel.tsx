import { useState } from 'react'
import {
  auditActions,
  filterAuditEvents,
  governanceWrites,
  isAuditAction,
  isGovernanceAction,
  type AuditEvent,
} from '@/features/members/governance/lib/governance'
import { governanceMessages } from '@/features/members/governance/i18n/governance-messages'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { useCatalog } from '@/shared/i18n/catalog'
import type { PersonOption } from '@/shared/model/task-model'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
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
  const { locale } = useI18n()
  const t = useCatalog(governanceMessages)
  const [actor, setActor] = useState<string>(ANY)
  const [action, setAction] = useState<string>(ANY)
  const shown = filterAuditEvents(events, {
    ...(actor !== ANY ? { actorId: actor } : {}),
    ...(action === GOVERNANCE ? { actions: governanceWrites } : action !== ANY ? { actions: [action] } : {}),
  })
  const when = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
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
        <Select onValueChange={(value) => setActor(String(value))} value={actor}>
          <SelectTrigger aria-label={t('audit.filter.actor')} size="sm">
            <SelectValue>
              {actor === ANY ? t('audit.filter.anyone') : (members.find((person) => person.id === actor)?.name ?? t('members.former'))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value={ANY}>{t('audit.filter.anyone')}</SelectItem>
            {members.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <strong>{t('audit.filter.action')}</strong>
        <Select onValueChange={(value) => setAction(String(value))} value={action}>
          <SelectTrigger aria-label={t('audit.filter.action')} size="sm">
            <SelectValue>
              {action === ANY ? t('audit.filter.anyAction') : action === GOVERNANCE ? t('audit.filter.governanceWrites') : actionLabel(action)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value={ANY}>{t('audit.filter.anyAction')}</SelectItem>
            <SelectItem value={GOVERNANCE}>{t('audit.filter.governanceWrites')}</SelectItem>
            {auditActions.map((value) => (
              <SelectItem key={value} value={value}>
                {actionLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {shown.map((event) => (
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
                    <time dateTime={event.occurredAt}>{when.format(new Date(event.occurredAt))}</time>
                  </p>
                </div>
                <span className="audit-log-actor">{actorName(event)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
