import { GovernancePagination, GOVERNANCE_PAGE_SIZE } from '@/features/members/governance/components/GovernancePagination'
import { useMemo, useState } from 'react'
import { PersonAvatar } from '@/shared/ui/PersonAvatar'
import { TaskStatusBadge, taskStatusDefinition, type TaskStatus } from '@/shared/ui/TaskStatusBadge'
import {
  governanceViews,
  MAX_GOVERNANCE_REASON,
  rowsOf,
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



/** Team task metadata with filters, pagination, and reason-based management actions. */
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
  const [page, setPage] = useState(1)
  const [view, setView] = useState<GovernanceView>('all')
  const [owning, setOwning] = useState<GovernanceTask | null>(null)
  const [joining, setJoining] = useState<GovernanceTask | null>(null)
  const [restoring, setRestoring] = useState<GovernanceTask | null>(null)
  const live = useMemo(() => all.filter(row => !row.deletedAt), [all])
  const rows = rowsOf(view, live, now)
  const pageCount = Math.max(1, Math.ceil(rows.length / GOVERNANCE_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleRows = rows.slice((currentPage - 1) * GOVERNANCE_PAGE_SIZE, currentPage * GOVERNANCE_PAGE_SIZE)
  const when = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const statusText = (status: string) =>
    status in statusMessageKey ? tc(statusMessageKey[status as keyof typeof statusMessageKey]) : status
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name

  const changeView = (next: GovernanceView) => {
    setView(next)
    setPage(1)
  }
  const update = (id: string, change: Partial<GovernanceTask>) =>
    setAll((current) => current.map((row) => (row.id === id ? { ...row, ...change } : row)))

  return (
    <section aria-labelledby="governance-tasks-title" className="team-members-panel governance-tasks-panel">
      <div className="responsibility-toolbar">
        <div>
          <h2 id="governance-tasks-title">{t('governance.title')}</h2>
        </div>
      </div>
      <p role="note">{t('governance.note')}</p>
      <div className="team-members-summary">
        <strong>{t('governance.total', { count: String(rows.length) })}</strong>
      </div>
      <div aria-label={t('governance.views')} className="team-members-summary team-members-tabs" role="tablist">
        {governanceViews.filter((value) => value !== 'trash').map((value) => (
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
      {rows.length === 0 ? (
        <p role="status">{t(`governance.empty.${view}`)}</p>
      ) : (
        <div className="team-member-table">
          <div aria-hidden="true" className="team-member-list-head">
            <span>{t('governance.column.task')}</span>
            <span>{t('governance.column.state')}</span>
            <span>{t(view === 'trash' ? 'governance.column.deleted' : 'governance.column.activity')}</span>
            <span>{t('governance.column.owner')}</span>
            <span>{t('governance.column.actions')}</span>
          </div>
          <ul aria-label={t('governance.list')} className="team-member-list">
            {visibleRows.map((row) => {
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
                      : null}
                  </small>
                </span>
              )
              return (
                <li key={row.id}>
                  <div>
                    {name}
                  </div>
                  <div className="governance-task-state">
                    {Object.hasOwn(taskStatusDefinition, row.status) ? <TaskStatusBadge size="sm" value={row.status as TaskStatus} /> : <span>{statusText(row.status)}</span>}
                  </div>
                  <div className="governance-task-date">
                    <time dateTime={deleted ? row.deletedAt! : row.lastActivityAt}>{when.format(new Date(deleted ? row.deletedAt! : row.lastActivityAt))}</time>
                  </div>
                  <div className="governance-task-owner">
                    {row.ownerMemberId && <PersonAvatar name={nameOf(row.ownerMemberId) ?? t('members.former')} personId={row.ownerMemberId} size="xs" />}
                    <span>{row.ownerMemberId ? nameOf(row.ownerMemberId) ?? t('members.former') : t('governance.noOwner')}</span>
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
      {rows.length > 0 && <GovernancePagination label={t('governance.pagination')} page={currentPage} total={pageCount} onChange={setPage} />}
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
