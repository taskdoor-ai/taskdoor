import { ChevronRight, Folder } from 'lucide-react'
import type { TaskFileNode } from '@/shared/model/task-model'
import { useGlobalUi } from '@/shared/i18n/global-ui'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { useTeamTimeZone } from '@/shared/lib/useTeamTimeZone'
import { formatDisplayDateTime } from '@/shared/lib/date-time'
import { formatFileSize } from '@/shared/lib/file-size'
import {
  getNodePath,
  getPreviewKind,
  sortTaskFileNodes,
  type TaskFileSort,
} from '@/features/tasks/files/lib/task-file-tree'
import { TaskFileThumbnail } from '@/features/tasks/files/components/TaskFileThumbnail'
import { TaskFileName } from '@/features/tasks/files/components/TaskFileName'
import {
  TaskFileNodeMenu,
  type TaskFileAction,
} from '@/features/tasks/files/components/TaskFileTree'
import { cn } from '@/shared/lib/utils'

export type TaskFileView = 'tree' | 'list' | 'grid'

/** The path above the list and the grid: 任务文件 / A / B, each step going back to it. */
export function TaskFileBreadcrumb({
  files,
  directoryId,
  onDirectoryChange,
  displayName,
}: {
  files: TaskFileNode[]
  directoryId: string | null
  onDirectoryChange: (id: string | null) => void
  /** A node's name as shown (the discussion folder in the interface's language, #65). */
  displayName: (node: TaskFileNode) => string
}) {
  const ui = useGlobalUi()
  const path = directoryId ? getNodePath(files, directoryId) : []
  const steps = [{ id: null as string | null, name: ui('任务文件') }].concat(
    path.map((node) => ({ id: node.id, name: displayName(node) })),
  )
  return (
    <nav aria-label={ui('文件路径')} className="task-file-breadcrumb">
      <ol>
        {steps.map((step, index) => {
          const current = index === steps.length - 1
          return (
            <li key={step.id ?? 'root'}>
              {index > 0 && <ChevronRight aria-hidden="true" size={13} />}
              <button
                aria-current={current ? 'page' : undefined}
                className="task-file-breadcrumb-step"
                onClick={() => onDirectoryChange(step.id)}
                type="button"
              >
                {step.name}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * The list and the grid (pm-sync-60 P6-016): one folder at a time, a folder entered by clicking
 * it. While searching, every match in the task, flat, each with the path it sits in. A file opens
 * in the large preview; each node has the tree's menu. Grid cards are the discussion attachment
 * cards (size and cover rules); a folder card shows the folder and how many items it holds.
 */
export function TaskFileFolderView({
  taskId,
  layout,
  files,
  directoryId,
  matches,
  onDirectoryChange,
  onOpen,
  onAction,
  canDelete,
  displayName,
  sort = 'name',
}: {
  taskId?: string
  layout: 'list' | 'grid'
  /** Every visible node of the task. */
  files: TaskFileNode[]
  directoryId: string | null
  /** The search's matches, flat; undefined when not searching. */
  matches?: TaskFileNode[]
  onDirectoryChange: (id: string | null) => void
  onOpen: (id: string, trigger: HTMLElement) => void
  canDelete?: (nodeId: string) => boolean
  sort?: TaskFileSort
  onAction: (action: TaskFileAction) => void
  /** A node's name as shown (the discussion folder in the interface's language, #65). */
  displayName: (node: TaskFileNode) => string
}) {
  const ui = useGlobalUi()
  const { locale } = useI18n()
  const timeZone = useTeamTimeZone()
  const items = matches ?? files.filter((node) => node.parentId === directoryId)
  // Names may be localized (for example the discussion folder); compare what is displayed.
  const names = new Map(files.map(node => [node.name, displayName(node)]))
  const orderedItems = sortTaskFileNodes(items, sort, locale, name => names.get(name) ?? name)
  const where = (node: TaskFileNode) =>
    [ui('任务文件')]
      .concat(
        (node.parentId ? getNodePath(files, node.parentId) : []).map((step) => displayName(step)),
      )
      .join(' / ')
  return (
    <ul
      aria-label={ui('当前文件夹')}
      className={cn('task-file-folder-view', `task-file-folder-${layout}`)}
    >
      {orderedItems.map((node) => {
        const name = displayName(node)
        const childCount = files.filter((item) => item.parentId === node.id).length
        const open = (trigger: HTMLElement) =>
          node.kind === 'folder' ? onDirectoryChange(node.id) : onOpen(node.id, trigger)
        const countLabel = node.kind === 'folder' && childCount > 0 ? ui('{0} 项', { 0: childCount }) : ''
        const count = countLabel && (
          <small aria-label={countLabel} className="task-file-folder-count">
            {childCount}
          </small>
        )
        const size = node.kind === 'file' ? formatFileSize(node.sizeBytes, { fallback: node.sizeLabel ?? '' }) : ''
        const detail = countLabel || size
        const updatedAt = layout === 'list' ? formatDisplayDateTime(node.updatedAt, { locale, timeZone }) : null
        return (
          <li
            aria-label={name}
            className="task-file-folder-item"
            data-file-id={node.id}
            data-node-kind={node.kind}
            key={node.id}
          >
            <button
              aria-label={ui('打开{0}', { 0: name })}
              className="task-file-folder-open"
              data-preview={
                node.kind === 'file' && getPreviewKind(node.name, node.mimeType) === 'image'
                  ? 'image'
                  : 'file'
              }
              onClick={(event) => open(event.currentTarget)}
              type="button"
            >
              <span aria-hidden="true" className="task-file-folder-cover">
                {node.kind === 'folder' ? (
                  <Folder className="task-file-folder-icon" size={layout === 'grid' ? 22 : 18} />
                ) : (
                  <TaskFileThumbnail file={node} />
                )}
              </span>
              <span className="task-file-folder-label">
                <TaskFileName className="task-file-folder-name" name={name} />
                {matches && <small className="task-file-folder-where">{where(node)}</small>}
                {layout === 'grid' && (count || <small>{size}</small>)}
              </span>
              {layout === 'list' && (
                <>
                  <small className="task-file-folder-size">{detail}</small>
                  <small className="task-file-folder-updated">{updatedAt}</small>
                </>
              )}
            </button>
            <TaskFileNodeMenu taskId={taskId} canDelete={canDelete?.(node.id)} className="task-file-folder-more" node={node} onAction={onAction} />
          </li>
        )
      })}
    </ul>
  )
}
