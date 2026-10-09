import { useEffect, useRef, useState } from 'react'
import { Check, KeyRound, Plus, Search, ShieldCheck } from 'lucide-react'
import {
  credentialScopes,
  dayFromToday,
  DEFAULT_TOKEN_DAYS,
  demoTokenSecret,
  expiryOf,
  MAX_TOKEN_DAYS,
  MAX_TOKEN_NAME,
  MAX_TOKEN_TASKS,
  MAX_TOKEN_WORKSPACES,
  ALL_WORKSPACES,
  type CredentialScope,
  type PersonalAccessToken,
  type TokenWorkspace as WorkspaceSummary,
  type TokenWorkspaces,
} from '@/features/credentials/lib/pat'
import { tokenMessages } from '@/features/credentials/i18n/token-messages'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { useCatalog } from '@/shared/i18n/catalog'
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
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { TokenExpiryPicker } from '@/features/credentials/components/TokenExpiryPicker'
import { toast } from '@/shared/ui/toast'
import '@/features/credentials/styles/access-tokens.css'

type MessageKey = keyof typeof tokenMessages
type TokenTask = { id: string; title: string }

const reachesAny = (reach: TokenWorkspaces, workspaces: WorkspaceSummary[]) =>
  reach.mode === 'ALL' ||
  reach.workspaceIds.some((id) => workspaces.some((workspace) => workspace.id === id))


/** Up to this many workspaces are cards; more are found and picked as tasks are. */
const CARD_WORKSPACES = 12

/** How many workspace names a row spells out before it counts the rest. */
const NAMED_WORKSPACES = 3

/**
 * Which workspaces a token reaches, in a row of the list: every one, the listed ones by name
 * (the first few, then a count; all of them in the tooltip), or none left -- every listed
 * workspace was deleted or left.
 */
function TokenWorkspaceLine({
  reach,
  workspaces,
}: {
  reach: TokenWorkspaces
  workspaces: WorkspaceSummary[]
}) {
  const t = useCatalog(tokenMessages)
  if (reach.mode === 'ALL') return <p>{t('tokens.workspacesAll')}</p>
  const names = reach.workspaceIds.flatMap((id) => {
    const found = workspaces.find((workspace) => workspace.id === id)
    return found ? [found.name] : []
  })
  if (!names.length) return <p>{t('tokens.workspacesGone')}</p>
  const separator = t('tokens.workspaceSeparator')
  const shown = names.slice(0, NAMED_WORKSPACES).join(separator)
  const rest = names.length - NAMED_WORKSPACES
  return (
    <p title={names.join(separator)}>
      {t('tokens.workspacesLimitedTo')} {shown}
      {rest > 0 ? ` ${t('tokens.workspacesMore', { rest, total: names.length })}` : ''}
    </p>
  )
}

/**
 * Your personal access tokens, for the Open API and MCP: every one you hold, whichever workspace
 * is open. Each is a ceiling: it can never do more than you can, and its workspaces, scopes and

/**
 * Your personal access tokens, as the production settings page draws them: every one you hold,
 * whichever team is open. Each is a ceiling: it can never do more than you can, and its teams,
 * scopes and tasks narrow it. The PM demo keeps them in this page only: creating shows a sample
 * secret once, and nothing is issued or revoked anywhere.
 */
export function AccessTokensPanel({
  workspaces,
  initialTokens,
  tasksOf,
}: {
  /** The teams the person is in: what a token may be limited to, and how rows name them. */
  workspaces: WorkspaceSummary[]
  initialTokens: PersonalAccessToken[]
  /** The tasks of one team a token may be limited to. */
  tasksOf: (workspaceId: string) => TokenTask[]
}) {
  const { locale } = useI18n()
  const t = useCatalog(tokenMessages)
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const times = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
  const [all, setAll] = useState(initialTokens)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<CredentialScope[]>(['tasks:read'])
  const [expiry, setExpiry] = useState(() => dayFromToday(DEFAULT_TOKEN_DAYS))
  const [reach, setReach] = useState<TokenWorkspaces>(ALL_WORKSPACES)
  const [tasks, setTasks] = useState<TokenTask[]>([])
  const [search, setSearch] = useState('')
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [limited, setLimited] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState<MessageKey | null>(null)
  const [secret, setSecret] = useState<{ name: string; token: string } | null>(null)
  const [deleting, setDeleting] = useState<PersonalAccessToken | null>(null)
  const busy = false
  const copyButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (secret) copyButton.current?.focus()
  }, [secret])

  // Tasks can only be named inside one team: the task reach is there only then.
  const taskWorkspace =
    reach.mode === 'LISTED' && reach.workspaceIds.length === 1 ? reach.workspaceIds[0]! : null
  const taskTitle = (workspaceId: string, id: string) =>
    tasksOf(workspaceId).find((task) => task.id === id)?.title ?? t('dependencies.unavailable')
  // A different team (or none) drops the tasks picked in the last one.
  const changeReach = (next: TokenWorkspaces) => {
    const nextTaskWorkspace =
      next.mode === 'LISTED' && next.workspaceIds.length === 1 ? next.workspaceIds[0] : null
    if (nextTaskWorkspace !== taskWorkspace) {
      setTasks([])
      setLimited(false)
      setSearch('')
    }
    setReach(next)
  }
  const listed = reach.mode === 'LISTED' ? reach.workspaceIds : []
  const eligible = workspaces
  const toggleWorkspace = (id: string) =>
    changeReach({
      mode: 'LISTED',
      workspaceIds: listed.includes(id) ? listed.filter((item) => item !== id) : [...listed, id],
    })
  const needle = workspaceSearch.trim().toLocaleLowerCase(locale)
  const availableWorkspaces = eligible.filter(
    (workspace) =>
      !listed.includes(workspace.id) && workspace.name.toLocaleLowerCase(locale).includes(needle),
  )
  const chosenWorkspaces = listed.flatMap((id) => eligible.filter((item) => item.id === id))

  const tooFar = expiry > dayFromToday(MAX_TOKEN_DAYS)
  const past = expiry < dayFromToday(0)
  const valid =
    Boolean(name.trim()) &&
    scopes.length > 0 &&
    (reach.mode === 'ALL' || (listed.length > 0 && listed.length <= MAX_TOKEN_WORKSPACES)) &&
    Boolean(expiry) &&
    !tooFar &&
    !past &&
    (!limited || tasks.length > 0) &&
    tasks.length <= MAX_TOKEN_TASKS

  const create = () => {
    if (!valid) return
    const now = new Date().toISOString()
    const token: PersonalAccessToken = {
      id: `demo-token-${Date.now()}`,
      name: name.trim(),
      workspaces: reach,
      taskWorkspaceId: tasks.length ? taskWorkspace : null,
      taskIds: tasks.map((task) => task.id),
      scopes: credentialScopes.filter((scope) => scopes.includes(scope)),
      status: 'ACTIVE',
      createdAt: now,
      expiresAt: expiryOf(expiry),
      lastUsedAt: null,
    }
    setAll((current) => [token, ...current])
    setSecret({ name: token.name, token: demoTokenSecret() })
  }

  const remove = (token: PersonalAccessToken) => {
    setAll((current) => current.filter((item) => item.id !== token.id))
    setDeleting(null)
    toast.success(t('tokens.deleted', { name: token.name }))
  }

  const resetDraft = () => {
    setName('')
    setScopes(['tasks:read'])
    setExpiry(dayFromToday(DEFAULT_TOKEN_DAYS))
    setReach(ALL_WORKSPACES)
    setWorkspaceSearch('')
    setTasks([])
    setLimited(false)
    setSearch('')
    setNotice(null)
  }
  const closeDialog = (acknowledgedSecret = false) => {
    if (secret && !acknowledgedSecret) return
    setDialogOpen(false)
    setSecret(null)
    setCopied(false)
    resetDraft()
  }
  const text = search.trim().toLocaleLowerCase(locale)
  const available = (taskWorkspace ? tasksOf(taskWorkspace) : [])
    .filter((item) => !tasks.some((task) => task.id === item.id))
    .filter((item) => !text || item.title.toLocaleLowerCase(locale).includes(text))
    .slice(0, 50)

  return (
    <section aria-labelledby="access-tokens-title" className="access-token-page">
      <div className="access-token-heading">
        <div>
          <h2 id="access-tokens-title">{t('tokens.title')}</h2>
          <p>{t('tokens.lead')}</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            resetDraft()
            setDialogOpen(true)
          }}
        >
          <Plus aria-hidden="true" />
          {t('tokens.new')}
        </Button>
      </div>
      {notice === 'tokens.deleteFailed' && (
        <p className="personal-edit-error" role="alert">
          {t(notice)}
        </p>
      )}
      {all.length === 0 ? (
        <div className="access-token-empty" role="status">
          <span className="access-token-empty-icon">
            <KeyRound aria-hidden="true" />
          </span>
          <strong>{t('tokens.none')}</strong>
          <p>{t('tokens.emptyHint')}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetDraft()
              setDialogOpen(true)
            }}
          >
            {t('tokens.new')}
          </Button>
        </div>
      ) : (
        <ul aria-label={t('tokens.list')} className="access-token-list">
          {all.map((token) => (
            <li data-status={token.status} key={token.id}>
              <div className="access-token-row-main">
                <span className="access-token-row-icon">
                  <KeyRound aria-hidden="true" />
                </span>
                <div className="access-token-row-body">
                  <div className="access-token-row-title">
                    <strong>{token.name}</strong>
                    <span className="access-token-status">
                      {t(`tokens.status.${token.status}`)}
                    </span>
                  </div>
                  <p>{token.scopes.map((scope) => t(`tokens.scope.${scope}`)).join(' · ')}</p>
                  <TokenWorkspaceLine reach={token.workspaces} workspaces={workspaces} />
                  {/* A token with no workspace left reaches no task either: no line says otherwise. */}
                  {reachesAny(token.workspaces, workspaces) && (
                    <p>
                      {token.taskIds.length && token.taskWorkspaceId ? (
                        <>
                          {t('tokens.limitedTo')}{' '}
                          {token.taskIds.map((id) => taskTitle(token.taskWorkspaceId!, id)).join(', ')}
                        </>
                      ) : (
                        t('tokens.tasksAll')
                      )}
                    </p>
                  )}
                  <small>
                    {t('tokens.created', { date: dates.format(new Date(token.createdAt)) })} ·{' '}
                    {t('tokens.expiresOn', { date: dates.format(new Date(token.expiresAt)) })} ·{' '}
                    {token.lastUsedAt
                      ? t('tokens.lastUsed', { date: times.format(new Date(token.lastUsedAt)) })
                      : t('tokens.neverUsed')}
                  </small>
                </div>
              </div>
              <Button
                aria-label={t('tokens.delete', { name: token.name })}
                disabled={busy}
                onClick={() => setDeleting(token)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {t('tokens.deleteShort')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent
          className="access-token-dialog"
          overlayClassName="access-token-overlay"
          overlayForceRender
          showCloseButton={!busy && !secret}
        >
          {secret ? (
            <div className="access-token-complete">
              <span className="access-token-complete-icon">
                <ShieldCheck aria-hidden="true" />
              </span>
              <DialogHeader>
                <DialogTitle>{t('tokens.secretTitle', { name: secret.name })}</DialogTitle>
                <DialogDescription>{t('tokens.secretOnce')}</DialogDescription>
              </DialogHeader>
              <code tabIndex={0} className="access-token-secret-value">
                {secret.token}
              </code>
              <div className="access-token-dialog-footer">
                <Button type="button" variant="outline" onClick={() => closeDialog(true)}>
                  {t('tokens.secretDone')}
                </Button>
                <Button
                  type="button"
                  ref={copyButton}
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(secret.token)
                      .then(() => {
                        setCopied(true)
                        toast.success(t('tokens.copied'))
                      })
                      .catch(() => toast.error(t('tokens.copyFailed')))
                  }
                >
                  {copied ? <Check aria-hidden="true" /> : null}
                  {copied ? t('tokens.copied') : t('tokens.copy')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('tokens.create')}</DialogTitle>
                <DialogDescription>{t('tokens.createHint')}</DialogDescription>
              </DialogHeader>
              <form
                aria-label={t('tokens.create')}
                className="access-token-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void create()
                }}
              >
                <div className="access-token-form-scroll">
                  <label className="access-token-name">
                    <span>{t('tokens.name')}</span>
                    <Input
                      autoFocus
                      maxLength={MAX_TOKEN_NAME}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t('tokens.namePlaceholder')}
                      value={name}
                    />
                  </label>
                  <fieldset className="access-token-section">
                    <legend>{t('tokens.expires')}</legend>
                    <TokenExpiryPicker value={expiry} onChange={setExpiry} />
                    {tooFar && <small role="alert">{t('tokens.tooFar')}</small>}
                    {past && <small role="alert">{t('tokens.invalid')}</small>}
                  </fieldset>
                  <fieldset className="access-token-section">
                    <legend>{t('tokens.scopes')}</legend>
                    <p>{t('tokens.scopesHint')}</p>
                    <div className="access-token-scopes">
                      {credentialScopes.map((scope) => (
                        <label key={scope}>
                          <input
                            checked={scopes.includes(scope)}
                            onChange={() =>
                              setScopes((current) =>
                                current.includes(scope)
                                  ? current.filter((item) => item !== scope)
                                  : [...current, scope],
                              )
                            }
                            type="checkbox"
                          />
                          <span>
                            <strong>{scope}</strong>
                            <small>{t(`tokens.scope.${scope}`)}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="access-token-section">
                    <legend>{t('tokens.workspaces')}</legend>
                    <div className="access-token-reach">
                      <label>
                        <input
                          type="radio"
                          name="token-workspaces"
                          checked={reach.mode === 'ALL'}
                          onChange={() => changeReach(ALL_WORKSPACES)}
                        />
                        <span>{t('tokens.workspacesAll')}</span>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="token-workspaces"
                          checked={reach.mode === 'LISTED'}
                          disabled={eligible.length === 0}
                          onChange={() => changeReach({ mode: 'LISTED', workspaceIds: [] })}
                        />
                        <span>{t('tokens.workspacesSome')}</span>
                      </label>
                    </div>
                    {eligible.length === 0 && <p>{t('tokens.workspacesNone')}</p>}
                    {reach.mode === 'LISTED' && eligible.length <= CARD_WORKSPACES && (
                      <div className="access-token-scopes">
                        {eligible.map((workspace) => (
                          <label key={workspace.id}>
                            <input
                              checked={listed.includes(workspace.id)}
                              disabled={
                                !listed.includes(workspace.id) &&
                                listed.length >= MAX_TOKEN_WORKSPACES
                              }
                              onChange={() => toggleWorkspace(workspace.id)}
                              type="checkbox"
                            />
                            <span>
                              <strong>{workspace.name}</strong>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    {reach.mode === 'LISTED' && eligible.length > CARD_WORKSPACES && (
                      // Too many for cards: the task reach's own find-and-pick panes.
                      <div className="access-token-transfer">
                        <div className="access-token-transfer-pane">
                          <strong>
                            {t('tokens.availableWorkspaces', { count: availableWorkspaces.length })}
                          </strong>
                          <div className="access-token-search">
                            <Search aria-hidden="true" />
                            <Input
                              aria-label={t('tokens.findWorkspace')}
                              onChange={(event) => setWorkspaceSearch(event.target.value)}
                              placeholder={t('tokens.findWorkspace')}
                              type="search"
                              value={workspaceSearch}
                            />
                          </div>
                          {availableWorkspaces.length ? (
                            <ul>
                              {availableWorkspaces.map((workspace) => (
                                <li key={workspace.id}>
                                  <button
                                    type="button"
                                    aria-label={t('tokens.addWorkspace', { name: workspace.name })}
                                    disabled={listed.length >= MAX_TOKEN_WORKSPACES}
                                    onClick={() => toggleWorkspace(workspace.id)}
                                  >
                                    <span>{workspace.name}</span>
                                    <Plus aria-hidden="true" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>{t('tokens.noWorkspaceResults')}</p>
                          )}
                        </div>
                        <div className="access-token-transfer-pane">
                          <strong>
                            {t('tokens.selectedWorkspaces', { count: chosenWorkspaces.length })}
                          </strong>
                          {chosenWorkspaces.length > 0 && (
                            <ul>
                              {chosenWorkspaces.map((workspace) => (
                                <li key={workspace.id}>
                                  <button
                                    type="button"
                                    aria-label={t('tokens.removeWorkspace', {
                                      name: workspace.name,
                                    })}
                                    onClick={() => toggleWorkspace(workspace.id)}
                                  >
                                    <span>{workspace.name}</span>
                                    <span aria-hidden="true">×</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                    {reach.mode === 'LISTED' && eligible.length > MAX_TOKEN_WORKSPACES && (
                      <small>{t('tokens.workspaceLimit', { count: MAX_TOKEN_WORKSPACES })}</small>
                    )}
                    {reach.mode === 'LISTED' && listed.length === 0 && (
                      <small className="access-token-validation" role="alert">
                        {t('tokens.selectWorkspace')}
                      </small>
                    )}
                  </fieldset>
                  <fieldset className="access-token-section">
                    <legend>{t('tokens.tasks')}</legend>
                    {taskWorkspace === null ? (
                      <p>{t('tokens.tasksNeedOneWorkspace')}</p>
                    ) : (
                      <>
                        <p>{t('tokens.tasksHint')}</p>
                        <div className="access-token-reach">
                          <label>
                            <input
                              type="radio"
                              name="token-reach"
                              checked={!limited}
                              onChange={() => {
                                setLimited(false)
                                setTasks([])
                              }}
                            />
                            <span>{t('tokens.tasksAll')}</span>
                          </label>
                          <label>
                            <input
                              type="radio"
                              name="token-reach"
                              checked={limited}
                              onChange={() => setLimited(true)}
                            />
                            <span>{t('tokens.tasksSome')}</span>
                          </label>
                        </div>
                        {limited && (
                          <div className="access-token-transfer">
                            <div className="access-token-transfer-pane">
                              <strong>{t('tokens.available', { count: available.length })}</strong>
                              <div className="access-token-search">
                                <Search aria-hidden="true" />
                                <Input
                                  aria-label={t('tokens.findTask')}
                                  onChange={(event) => setSearch(event.target.value)}
                                  placeholder={t('tokens.findTask')}
                                  type="search"
                                  value={search}
                                />
                              </div>
                              {available.length ? (
                                <ul>
                                  {available.map((item) => (
                                    <li key={item.id}>
                                      <button
                                        type="button"
                                        aria-label={t('tokens.addTask', { title: item.title })}
                                        disabled={tasks.length >= MAX_TOKEN_TASKS}
                                        onClick={() =>
                                          setTasks((current) =>
                                            current.some((task) => task.id === item.id)
                                              ? current
                                              : [...current, { id: item.id, title: item.title }],
                                          )
                                        }
                                      >
                                        <span>{item.title}</span>
                                        <Plus aria-hidden="true" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>{t('tokens.noResults')}</p>
                              )}
                            </div>
                            <div className="access-token-transfer-pane">
                              <strong>{t('tokens.selected', { count: tasks.length })}</strong>
                              {tasks.length ? (
                                <ul>
                                  {tasks.map((task) => (
                                    <li key={task.id}>
                                      <button
                                        type="button"
                                        aria-label={t('tokens.removeTask', { title: task.title })}
                                        onClick={() =>
                                          setTasks((current) =>
                                            current.filter((item) => item.id !== task.id),
                                          )
                                        }
                                      >
                                        <span>{task.title}</span>
                                        <span aria-hidden="true">×</span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>{t('tokens.selectTask')}</p>
                              )}
                              <small>{t('tokens.taskLimit', { count: MAX_TOKEN_TASKS })}</small>
                            </div>
                          </div>
                        )}
                        {limited && tasks.length === 0 && (
                          <small className="access-token-validation" role="alert">
                            {t('tokens.selectTask')}
                          </small>
                        )}
                      </>
                    )}
                  </fieldset>
                  {notice && (
                    <p className="personal-edit-error" role="alert">
                      {t(notice)}
                    </p>
                  )}
                </div>
                <div className="access-token-dialog-footer">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => closeDialog()}
                    disabled={busy}
                  >
                    {t('tokens.cancel')}
                  </Button>
                  <Button disabled={busy || !valid} type="submit">
                    {busy ? t('tokens.creating') : t('tokens.create')}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
      {deleting && (
        <AlertDialog onOpenChange={(open) => !open && !busy && setDeleting(null)} open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('tokens.deleteTitle', { name: deleting.name })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  deleting.status === 'ACTIVE'
                    ? 'tokens.deleteActiveBody'
                    : 'tokens.deleteInactiveBody',
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy} size="touch">
                {t('criteria.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault()
                  void remove(deleting)
                }}
                size="touch"
                variant="destructive"
              >
                {t('tokens.deleteShort')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  )
}
