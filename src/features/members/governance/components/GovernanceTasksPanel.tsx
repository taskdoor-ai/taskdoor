import { useMemo, useState } from 'react'
import {
  archiveRows,
  governanceViews,
  MAX_GOVERNANCE_REASON,
  outcomeLine,
  rowsOf,
  summarize,
  tallyOutcomes,
  type GovernanceOutcome,
  type GovernanceTask,
  type GovernanceView,
} from '@/features/members/governance/lib/governance'
import { governanceMessages } from '@/features/members/governance/i18n/governance-messages'
import { MemberSelector } from '@/features/members/components/MemberSelector'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { useCatalog } from '@/shared/i18n/catalog'
import { statusMessageKey } from '@/shared/i18n/task-status'
import type { PersonOption } from '@/shared/model/task-model'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/input'
import { toast } from '@/shared/ui/toast'
import '@/features/members/governance/styles/governance.css'

type MessageKey = keyof typeof governanceMessages

/**
 * "Team tasks" in team settings (W3-015), for the team's Owner and administrators, drawn as the
 * production app draws it: the members panel's summary line, tabs and table, a checkbox per row
 * for bulk archiving, and a reason dialog for each action. In the PM demo every action changes
 * this page only; the tasks themselves are untouched.
 */
export function GovernanceTasksPanel({
  rows: initialRows,
  asOf,
  members,
}: {
  rows: GovernanceTask[]
  /** The instant the team's demo world stands at: "inactive" and "stale" are measured from it. */
  asOf: string
  /** The team's members, named in the viewer's language. */
  members: PersonOption[]
}) {
  const { locale, t: tc } = useI18n()
  const t = useCatalog(governanceMessages)
  const now = Date.parse(asOf)
  const [all, setAll] = useState(initialRows)
  const [archived, setArchived] = useState<ReadonlySet<string>>(new Set())
  const [view, setView] = useState<GovernanceView>('all')
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [archiving, setArchiving] = useState<GovernanceTask[] | null>(null)
  const [owning, setOwning] = useState<GovernanceTask | null>(null)
  const [joining, setJoining] = useState<GovernanceTask | null>(null)
  const [restoring, setRestoring] = useState<GovernanceTask | null>(null)
  const live = useMemo(() => all.filter((row) => !archived.has(row.id)), [all, archived])
  const rows = rowsOf(view, live, now)
  const counts = summarize(live, now)
  const when = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const statusText = (status: string) =>
    status in statusMessageKey ? tc(statusMessageKey[status as keyof typeof statusMessageKey]) : status
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name

  const changeView = (next: GovernanceView) => {
    setView(next)
    setSelected(new Set())
  }
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const update = (id: string, change: Partial<GovernanceTask>) =>
    setAll((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)))
  const ownerName = (row: GovernanceTask) =>
    row.ownerMemberId
      ? t('governance.ownerLine', { name: nameOf(row.ownerMemberId) ?? t('members.former') })
      : t('governance.noOwner')

  return (
    <section aria-labelledby="governance-tasks-title" className="team-members-panel governance-tasks-panel">
      <div className="responsibility-toolbar">
        <div>
          <h2 id="governance-tasks-title">{t('governance.title')}</h2>
        </div>
      </div>
      <p role="note">{t('governance.note')}</p>
      <div className="team-members-summary">
        <strong>{t('governance.total', { count: String(counts.total) })}</strong>
        <span>
          {t('governance.summary.unowned', { count: String(counts.unowned) })}
          {' · '}
          {t('governance.summary.stale', { count: String(counts.stale) })}
        </span>
      </div>
      <div aria-label={t('governance.views')} className="team-members-summary team-members-tabs" role="tablist">
        {governanceViews.map((value) => (
          <Button
            aria-selected={view === value}
            key={value}
            onClick={() => changeView(value)}
            role="tab"
            size="sm"
            type="button"
            variant={view === value ? 'secondary' : 'ghost'}
          >
            {t(`governance.view.${value}`)}
          </Button>
        ))}
      </div>
      {selected.size > 0 && (
        // Archive is the only bulk action: there is no bulk delete (W3-055).
        <div className="team-members-summary">
          <strong>
            {selected.size === 1
              ? t('governance.selected.one')
              : t('governance.selected', { count: String(selected.size) })}
          </strong>
          <div className="member-invited-actions">
            <Button onClick={() => setSelected(new Set())} size="sm" type="button" variant="ghost">
              {t('governance.clearSelection')}
            </Button>
            <Button
              onClick={() => setArchiving(rows.filter((row) => selected.has(row.id)))}
              size="sm"
              type="button"
              variant="outline"
            >
              {t('governance.archive')}
            </Button>
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <p role="status">{t(`governance.empty.${view}`)}</p>
      ) : (
        <div className="team-member-table">
          <div aria-hidden="true" className="team-member-list-head">
            <span>{t('governance.column.task')}</span>
            <span>{t('governance.column.stateOwner')}</span>
            <span>{t('governance.column.actions')}</span>
          </div>
          <ul aria-label={t('governance.list')} className="team-member-list">
            {rows.map((row) => {
              const deleted = Boolean(row.deletedAt)
              const name = (
                <span>
                  <strong>
                    {row.title}
                    {row.ownerClearedReason && (
                      <em className="invited">
                        {t(row.ownerClearedReason === 'CLAIM_POOL' ? 'governance.badge.claimPool' : 'governance.badge.memberExit')}
                      </em>
                    )}
                  </strong>
                  <small>
                    {row.subtreeSize > 1
                      ? row.subtreeSize === 2
                        ? t('governance.subtasks.one')
                        : t('governance.subtasks', { count: String(row.subtreeSize - 1) })
                      : t('governance.subtasks.none')}
                  </small>
                </span>
              )
              return (
                <li key={row.id}>
                  <div>
                    {deleted ? (
                      name
                    ) : (
                      <label className="creation-dependency-option">
                        <input
                          aria-label={t('governance.select', { title: row.title })}
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                          type="checkbox"
                        />
                        {name}
                      </label>
                    )}
                  </div>
                  <div className="team-member-responsibility">
                    <p className="team-member-responsibility-text">
                      {statusText(row.status)}
                      {' · '}
                      {deleted
                        ? t('governance.deleted', { date: when.format(new Date(row.deletedAt!)) })
                        : t('governance.lastActivity', { date: when.format(new Date(row.lastActivityAt)) })}
                      <br />
                      {ownerName(row)}
                    </p>
                  </div>
                  <div className="member-invited-actions governance-row-actions">
                    {deleted ? (
                      <Button aria-label={t('governance.restore.open', { title: row.title })} onClick={() => setRestoring(row)} size="sm" type="button" variant="ghost">
                        {t('trash.restore')}
                      </Button>
                    ) : (
                      <>
                        {row.ownership === 'UNOWNED' && (
                          <Button aria-label={t('governance.owner.open', { title: row.title })} onClick={() => setOwning(row)} size="sm" type="button" variant="ghost">
                            {t('governance.owner.confirm')}
                          </Button>
                        )}
                        <Button aria-label={t('governance.access.open', { title: row.title })} onClick={() => setJoining(row)} size="sm" type="button" variant="ghost">
                          {t('governance.access.confirm')}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {archiving && (
        <BulkArchiveDialog
          onClose={() => setArchiving(null)}
          onDone={(applied) => {
            setSelected(new Set())
            setArchived((current) => new Set([...current, ...applied]))
          }}
          rows={archiving}
          archived={archived}
        />
      )}
      {owning && (
        <ReasonDialog
          body={t('governance.owner.body')}
          confirm={t('governance.owner.confirm')}
          onClose={() => setOwning(null)}
          people={members}
          run={(_, ownerId) => {
            update(owning.id, { ownerMemberId: ownerId!, ownership: 'OWNED', ownerClearedReason: null })
            toast.success(t('governance.owner.done', { title: owning.title }))
          }}
          title={t('governance.owner.title', { title: owning.title })}
        />
      )}
      {joining && (
        <ReasonDialog
          body={t('governance.access.body')}
          confirm={t('governance.access.confirm')}
          onClose={() => setJoining(null)}
          run={() => toast.success(t('governance.access.done', { title: joining.title }))}
          title={t('governance.access.title', { title: joining.title })}
        />
      )}
      {restoring && (
        <ReasonDialog
          body={t('trash.governanceBody')}
          confirm={t('trash.governanceConfirm')}
          onClose={() => setRestoring(null)}
          run={() => update(restoring.id, { deletedAt: null })}
          title={t('trash.governanceTitle', { title: restoring.title })}
        />
      )}
    </section>
  )
}

/** The trash's governance reason dialog: a required reason for the audit log, and for assigning an owner, the member selector above it. */
function ReasonDialog({
  title,
  body,
  confirm,
  people,
  run,
  onClose,
}: {
  title: string
  body: string
  confirm: string
  people?: PersonOption[]
  run: (reason: string, personId?: string) => void
  onClose: () => void
}) {
  const t = useCatalog(governanceMessages)
  const [reason, setReason] = useState('')
  const [person, setPerson] = useState<string[]>([])
  const ready = reason.trim() && (!people || person.length === 1)
  return (
    <AlertDialog onOpenChange={(open) => !open && onClose()} open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        {people && (
          <MemberSelector
            allowInvitations={false}
            allowUnassigned={false}
            label={t('governance.owner.label')}
            max={1}
            members={people}
            onChange={setPerson}
            selected={person}
          />
        )}
        <label className="task-trash-reason">
          <span>{t('governance.reason')}</span>
          <Textarea
            maxLength={MAX_GOVERNANCE_REASON}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('governance.reasonPlaceholder')}
            required
            rows={3}
            value={reason}
          />
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel size="touch">{t('criteria.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!ready}
            onClick={(event) => {
              event.preventDefault()
              run(reason.trim(), person[0])
              onClose()
            }}
            size="touch"
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Archiving the chosen tasks: the reason dialog, then how many were archived, and why each other one was not. */
function BulkArchiveDialog({
  rows,
  archived,
  onClose,
  onDone,
}: {
  rows: GovernanceTask[]
  archived: ReadonlySet<string>
  onClose: () => void
  onDone: (applied: string[]) => void
}) {
  const t = useCatalog(governanceMessages)
  const [reason, setReason] = useState('')
  const [outcomes, setOutcomes] = useState<GovernanceOutcome[] | null>(null)
  const total = rows.reduce((sum, row) => sum + row.subtreeSize, 0)
  const titleOf = new Map(rows.map((row) => [row.id, row.title]))
  const run = () => {
    const result = archiveRows(rows, rows.map((row) => row.id), archived)
    setOutcomes(result)
    onDone(result.filter((item) => item.outcome === 'APPLIED').map((item) => item.taskId))
  }
  const tally = outcomes ? tallyOutcomes(outcomes) : null
  return (
    <AlertDialog onOpenChange={(open) => !open && onClose()} open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {tally
              ? t('governance.result', { applied: String(tally.applied), failed: String(tally.failed.length) })
              : rows.length === 1
                ? t('governance.archive.title.one')
                : t('governance.archive.title', { count: String(rows.length) })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tally
              ? tally.already === 0
                ? ''
                : tally.already === 1
                  ? t('governance.result.already.one')
                  : t('governance.result.already', { count: String(tally.already) })
              : total === 1
                ? t('governance.archive.body.one')
                : t('governance.archive.body', { total: String(total) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {tally ? (
          tally.failed.length > 0 && (
            <ul aria-label={t('governance.result.failedList')} className="restore-skipped">
              {tally.failed.map((item) => {
                const line = outcomeLine(item)
                return (
                  <li key={item.taskId}>
                    {titleOf.get(item.taskId) ?? item.taskId.slice(0, 8)}
                    {' · '}
                    {t(line.key as MessageKey, line.code ? { code: line.code } : {})}
                  </li>
                )
              })}
            </ul>
          )
        ) : (
          <label className="task-trash-reason">
            <span>{t('governance.reason')}</span>
            <Textarea
              maxLength={MAX_GOVERNANCE_REASON}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('governance.reasonPlaceholder')}
              required
              rows={3}
              value={reason}
            />
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} size="touch">
            {tally ? t('governance.close') : t('criteria.cancel')}
          </AlertDialogCancel>
          {!tally && (
            <AlertDialogAction
              disabled={!reason.trim()}
              onClick={(event) => {
                event.preventDefault()
                run()
              }}
              size="touch"
            >
              {t('governance.archive')}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
