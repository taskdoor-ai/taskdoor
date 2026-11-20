import { ArrowDownWideNarrow, FolderPlus, LayoutGrid, List, ListTree, Plus, Search, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TaskFileNode } from '@/shared/model/task-model'
import { useGlobalUi } from '@/shared/i18n/global-ui'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { TaskFileTree, type TaskFileAction } from '@/features/tasks/files/components/TaskFileTree'
import {
  getNodePath,
  searchTaskFileTree,
  sortTaskFileNodes,
  type TaskFileSort,
} from '@/features/tasks/files/lib/task-file-tree'
import {
  TaskFileBreadcrumb,
  TaskFileFolderView,
  type TaskFileView,
} from '@/features/tasks/files/components/TaskFileFolderView'
import '@/features/tasks/styles/task-pane-toolbar.css'
import '@/features/tasks/styles/task-file-browser.css'
import '@/features/tasks/styles/task-file-views.css'

const viewStorageKey = 'taskdoor:task-file-view'
const sorts: Array<{ value: TaskFileSort; label: string }> = [
  { value: 'name', label: '名称' },
  { value: 'updated', label: '最新更新' },
  { value: 'created', label: '最新创建' },
  { value: 'size', label: '文件大小' },
]
function readSort(key: string): TaskFileSort {
  try {
    const value = localStorage.getItem(key)
    return sorts.some(item => item.value === value) ? value as TaskFileSort : 'name'
  } catch { return 'name' }
}
const views: Array<{ view: TaskFileView; label: string; icon: typeof List }> = [
  { view: 'tree', label: '树形', icon: ListTree },
  { view: 'list', label: '列表', icon: List },
  { view: 'grid', label: '网格', icon: LayoutGrid },
]
function readView(): TaskFileView {
  try {
    const saved = localStorage.getItem(viewStorageKey)
    return views.some((item) => item.view === saved) ? (saved as TaskFileView) : 'tree'
  } catch {
    return 'tree'
  }
}

/**
 * The Files tab's page (PM issue #60 item 6, Demo ef963ed4): search and New on one row, and the
 * tree expanded in place. Folders expand independently; a search shows matches inside closed
 * folders, and clearing it brings the folders back as they were. A file opens elsewhere (the
 * explorer's preview). `directoryId` is where New and Upload go: the folder last opened, moved up
 * when one of its ancestors is closed.
 *
 * After New, the viewer switches between the tree, a list and a grid (pm-sync-60 P6-016), kept in
 * this browser. The list and the grid show `directoryId` alone with its path above, so New and
 * Upload go to the folder shown; their search lists every match in the task, flat.
 */
export function TaskFileBrowser({
  taskId,
  files,
  directoryId,
  onDirectoryChange,
  expandedIds,
  onExpandedChange,
  onOpen,
  onAction,
  canDelete,
  onCreateFolder,
  onUpload,
  uploading,
  error,
  displayName,
  preferenceScope = 'anonymous',
}: {
  taskId?: string
  files: TaskFileNode[]
  directoryId: string | null
  onDirectoryChange: (id: string | null) => void
  expandedIds: Set<string>
  onExpandedChange: (ids: Set<string>) => void
  onOpen: (id: string, trigger: HTMLElement) => void
  canDelete?: (nodeId: string) => boolean
  onAction: (action: TaskFileAction) => void
  onCreateFolder: () => void
  onUpload: () => void
  uploading: boolean
  error?: string
  /** A node's name as shown (the discussion folder in the interface's language, #65). */
  displayName: (name: string) => string
  preferenceScope?: string
}) {
  const ui = useGlobalUi()
  const { locale } = useI18n()
  const sortStorageKey = `taskdoor:task-file-sort:${preferenceScope}`
  const [sortChoice, setSortChoice] = useState(() => ({ key: sortStorageKey, value: readSort(sortStorageKey) }))
  const sort = sortChoice.key === sortStorageKey ? sortChoice.value : readSort(sortStorageKey)
  // Account/team changes must not inherit the previous person's preference.
  if (sortChoice.key !== sortStorageKey) setSortChoice({ key: sortStorageKey, value: sort })
  const chooseSort = (value: unknown) => {
    const option = sorts.find(item => item.value === value)
    if (!option) return
    setSortChoice({ key: sortStorageKey, value: option.value })
    try { localStorage.setItem(sortStorageKey, option.value) } catch { /* Keep this visit's choice. */ }
  }
  const sortLabel = ui(sorts.find(item => item.value === sort)!.label)
  const [query, setQuery] = useState('')
  const [collapsedSearchIds, setCollapsedSearchIds] = useState(new Set<string>())
  const [view, setView] = useState(readView)
  const chooseView = (next: TaskFileView) => {
    setView(next)
    try {
      localStorage.setItem(viewStorageKey, next)
    } catch {
      /* The choice still holds for this visit. */
    }
  }
  const visible = searchTaskFileTree(files, '').nodes
  const directory = visible.find((file) => file.kind === 'folder' && file.id === directoryId)
  const path = directory ? getNodePath(visible, directory.id) : []
  const needle = query.trim()
  const result = searchTaskFileTree(files, query, displayName)
  const searchFolderIds = result.nodes
    .filter((node) => node.kind === 'folder')
    .map((node) => node.id)
  const flatMatches = sortTaskFileNodes(
    visible.filter((node) =>
      [displayName(node.name), node.name].some((name) =>
        name.toLocaleLowerCase().includes(needle.toLocaleLowerCase()),
      ),
    ),
    sort, locale, displayName,
  )
  const folderHasItems = visible.some((node) => node.parentId === (directory?.id ?? null))
  const treeExpandedIds = needle
    ? new Set(searchFolderIds.filter((id) => !collapsedSearchIds.has(id)))
    : expandedIds
  useEffect(() => {
    if (directoryId && !visible.some((file) => file.id === directoryId && file.kind === 'folder'))
      onDirectoryChange(null)
    // The folder New goes to is checked whenever the tree changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, directoryId, onDirectoryChange])
  const search = (value: string) => {
    setQuery(value)
    setCollapsedSearchIds(new Set())
  }
  const chooseDirectory = (id: string | null) => {
    onDirectoryChange(id)
    if (id)
      onExpandedChange(
        new Set([
          ...expandedIds,
          ...getNodePath(visible, id)
            .filter((node) => node.kind === 'folder')
            .map((node) => node.id),
        ]),
      )
  }
  const expand = (ids: Set<string>) => {
    if (needle) setCollapsedSearchIds(new Set(searchFolderIds.filter((id) => !ids.has(id))))
    else onExpandedChange(ids)
    const opened = [...ids].find((id) => !treeExpandedIds.has(id))
    if (opened) chooseDirectory(opened)
    else {
      const closedAncestor = path.find((node) => treeExpandedIds.has(node.id) && !ids.has(node.id))
      if (closedAncestor) onDirectoryChange(closedAncestor.parentId)
    }
  }

  return (
    <div className="task-file-directory-browser">
      <div className="task-file-browser-toolbar">
        <div className="task-file-browser-search-row">
          <div className="task-file-sidebar-search task-file-browser-search">
            <Input
              aria-label={ui('搜索当前任务文件')}
              className="task-file-search-input"
              leadingIcon={<Search />}
              onChange={(event) => search(event.target.value)}
              placeholder={ui('搜索')}
              value={query}
            />
            {query && (
              <Button
                aria-label={ui('清除搜索')}
                className="task-file-search-clear"
                onClick={() => search('')}
                size="icon-xs"
                variant="ghost"
              >
                <X />
              </Button>
            )}
          </div>
          {needle && (
            <small
              aria-label={ui('{0} 项', { 0: result.matches })}
              aria-live="polite"
              className="task-file-browser-count"
            >
              {result.matches}
            </small>
          )}
        </div>
        <div className="task-file-browser-actions">
          <div aria-label={ui('文件视图')} className="task-file-view-switch" role="group">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={ui('文件排序：{0}', { 0: sortLabel })}
                className="task-file-view-sort"
                render={<Button size="icon-sm" variant="ghost" />}
                title={ui('文件排序：{0}', { 0: sortLabel })}
              >
                <ArrowDownWideNarrow aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-max">
                <DropdownMenuRadioGroup value={sort} onValueChange={chooseSort}>
                  <DropdownMenuLabel>{ui('文件排序')}</DropdownMenuLabel>
                  {sorts.map(option => <DropdownMenuRadioItem key={option.value} value={option.value}>{ui(option.label)}</DropdownMenuRadioItem>)}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <span aria-hidden="true" className="task-file-view-switch-divider" />
            {views.map(({ view: item, label, icon: Icon }) => (
              <Button
                aria-label={ui(label)}
                aria-pressed={view === item}
                key={item}
                onClick={() => chooseView(item)}
                size="icon-sm"
                title={ui(label)}
                variant="ghost"
              >
                <Icon aria-hidden="true" />
              </Button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={ui('新建')}
              className="task-file-browser-add"
              render={<Button variant="default" />}
              title={ui('新建文件或文件夹')}
            >
              <Plus aria-hidden="true" data-icon="inline-start" />
              {ui('新建')}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2" onClick={onCreateFolder}>
                  <FolderPlus aria-hidden="true" size={16} />
                  {ui('文件夹')}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" disabled={uploading} onClick={onUpload}>
                  <Upload aria-hidden="true" size={16} />
                  {ui('文件')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {view !== 'tree' && !needle && (
        <TaskFileBreadcrumb
          directoryId={directory?.id ?? null}
          displayName={node => displayName(node.name)}
          files={visible}
          onDirectoryChange={onDirectoryChange}
        />
      )}
      {error && (
        <p className="task-file-save-error" role="alert">
          {error}
        </p>
      )}
      {view !== 'tree' && (needle ? flatMatches.length : folderHasItems) ? (
        <TaskFileFolderView
          taskId={taskId}
          sort={sort}
          directoryId={directory?.id ?? null}
          displayName={node => displayName(node.name)}
          files={visible}
          layout={view}
          {...(needle ? { matches: flatMatches } : {})}
          canDelete={canDelete} onAction={onAction}
          onDirectoryChange={(id) => {
            search('')
            onDirectoryChange(id)
          }}
          onOpen={onOpen}
        />
      ) : view === 'tree' && result.nodes.length ? (
        <TaskFileTree
          taskId={taskId}
          sort={sort}
          allNodes={visible}
          browser
          displayName={displayName}
          expandedIds={treeExpandedIds}
          nodes={result.nodes}
          canDelete={canDelete} onAction={onAction}
          onExpandedChange={expand}
          onSelect={(id, trigger) => {
            const file = visible.find((node) => node.id === id)
            chooseDirectory(file?.parentId ?? null)
            if (trigger) onOpen(id, trigger)
          }}
          selectedId={directory?.id ?? null}
        />
      ) : (
        <Empty className="task-file-browser-empty">
          <EmptyHeader>
            <EmptyMedia variant="icon">{needle ? <Search /> : <FolderPlus />}</EmptyMedia>
            <EmptyTitle>{needle ? ui('没有匹配的文件') : ui('暂无文件')}</EmptyTitle>
            <EmptyDescription>
              {needle
                ? ui('试试其他名称，或清除搜索。')
                : ui('上传文件，或新建文件夹整理任务资料。')}
            </EmptyDescription>
          </EmptyHeader>
          {needle && (
            <Button onClick={() => search('')} size="sm" variant="outline">
              {ui('清除搜索')}
            </Button>
          )}
        </Empty>
      )}
    </div>
  )
}
