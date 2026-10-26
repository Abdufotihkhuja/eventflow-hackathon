/**
 * Boards list — Kanban boards for planning event work.
 * Backed by the real boards API (@features/boards).
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import {
  ArrowUpRight,
  Archive,
  KanbanSquare,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
} from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageHeader,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@shared/ui'
import { cn } from '@shared/lib'
import {
  useArchiveBoard,
  useBoardsQuery,
  useCreateBoard,
  useDeleteBoard,
  useToggleBoardFavorite,
  useUpdateBoard,
} from '@features/boards'
import {
  LimitPrompt,
  mapBillingError,
  TaskBoardLockedState,
  TaskBoardReadOnlyBanner,
  useTaskBoardGate,
} from '@features/billing'
import type { BoardListItem } from '@api/services'

type ViewMode = 'grid' | 'list'

function boardCounts(board: BoardListItem) {
  const total = board._count?.tasks ?? board.tasksCount ?? 0
  const done = board.completedTasksCount ?? 0
  const inProgress = board.inProgressTasksCount ?? 0
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const members = board._count?.members ?? board.membersCount ?? 0
  return { total, done, inProgress, progress, members }
}

export function BoardsListPage() {
  const t = useT()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const [editingBoard, setEditingBoard] = useState<BoardListItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const { data, isLoading, isError, refetch } = useBoardsQuery({ search: search || undefined })
  const toggleFavorite = useToggleBoardFavorite()
  const createBoard = useCreateBoard()
  const updateBoard = useUpdateBoard()
  const deleteBoard = useDeleteBoard()
  const archiveBoard = useArchiveBoard()

  // C-10 (CR-12): Task Board вне тарифа → пустой список = locked-экран,
  // существующие доски = read-only (экспорт доступен, данные не удаляются).
  // Энфорсмент всё равно серверный — это только честный UX-слой.
  const { locked: boardsLocked, isLoading: isGateLoading } = useTaskBoardGate()

  const boards = useMemo<BoardListItem[]>(() => {
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: BoardListItem[] }).data
    }
    return []
  }, [data])

  const openCreate = () => {
    setNewName('')
    setNewDescription('')
    setIsCreateOpen(true)
  }

  const submitCreate = async () => {
    if (!newName.trim()) return
    try {
      const board = await createBoard.mutateAsync({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      })
      setIsCreateOpen(false)
      navigate(`/tasks/boards/${board.id}`)
    } catch {
      // surfaced via toast / mutation error
    }
  }

  const openEdit = (board: BoardListItem) => {
    setEditingBoard(board)
    setEditName(board.name)
    setEditDescription(board.description ?? '')
  }

  const submitEdit = () => {
    if (!editingBoard || !editName.trim()) return
    updateBoard.mutate(
      {
        boardId: editingBoard.id,
        data: { name: editName.trim(), description: editDescription.trim() || undefined },
      },
      { onSuccess: () => setEditingBoard(null) }
    )
  }

  const handleDelete = (board: BoardListItem) => {
    if (window.confirm(t('tasks.boards.deleteConfirm'))) {
      deleteBoard.mutate(board.id)
    }
  }

  const actions = (
    <>
      <Tabs value={viewMode} onValueChange={value => setViewMode(value as ViewMode)}>
        <TabsList>
          <TabsTrigger value="grid" className="gap-1.5" aria-label={t('tasks.boards.view.grid')}>
            <LayoutGrid className="size-4" />
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5" aria-label={t('tasks.boards.view.list')}>
            <List className="size-4" />
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {!boardsLocked && (
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 size-4" />
          {t('tasks.boards.create')}
        </Button>
      )}
    </>
  )

  // C-11: 403 BILLING_FEATURE_GATED при создании (для тех, кто не видит
  // энтайтлменты, — например, member без billing:view).
  const createBillingError = createBoard.isError ? mapBillingError(createBoard.error) : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('tasks.title')}
        title={t('tasks.boards.title')}
        description={t('tasks.boards.description')}
        actions={actions}
      />

      {/* Read-only режим: доски существуют (грандфазер/даунгрейд), фича вне тарифа. */}
      {boardsLocked && boards.length > 0 && <TaskBoardReadOnlyBanner />}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={t('tasks.boards.searchPlaceholder')}
          className="pl-9"
        />
      </div>

      {isLoading || isGateLoading ? (
        <BoardsSkeleton />
      ) : isError ? (
        <ErrorState
          title={t('tasks.boards.error.title')}
          description={t('tasks.boards.error.description')}
          onRetry={() => refetch()}
          retryLabel={t('tasks.boards.error.retry')}
        />
      ) : boards.length === 0 && boardsLocked && !search ? (
        // C-10: досок нет и фича вне тарифа → полный честный locked-экран.
        <TaskBoardLockedState />
      ) : boards.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title={search ? t('tasks.boards.empty.searchTitle') : t('tasks.boards.empty.title')}
          description={
            search ? t('tasks.boards.empty.searchDescription') : t('tasks.boards.empty.description')
          }
          action={
            search ? undefined : { label: t('tasks.boards.empty.create'), onClick: openCreate }
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {boards.map(board => (
            <BoardCard
              key={board.id}
              board={board}
              readOnly={boardsLocked}
              onOpen={() => navigate(`/tasks/boards/${board.id}`)}
              onToggleFavorite={() => toggleFavorite.mutate(board.id)}
              isTogglingFavorite={toggleFavorite.isPending}
              onEdit={() => openEdit(board)}
              onArchive={() => archiveBoard.mutate(board.id)}
              onDelete={() => handleDelete(board)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {boards.map(board => (
            <BoardRow
              key={board.id}
              board={board}
              readOnly={boardsLocked}
              onOpen={() => navigate(`/tasks/boards/${board.id}`)}
              onToggleFavorite={() => toggleFavorite.mutate(board.id)}
              onEdit={() => openEdit(board)}
              onArchive={() => archiveBoard.mutate(board.id)}
              onDelete={() => handleDelete(board)}
            />
          ))}
        </div>
      )}

      {/* Create board */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('tasks.boards.createDialog.title')}</DialogTitle>
            <DialogDescription>{t('tasks.boards.createDialog.description')}</DialogDescription>
          </DialogHeader>
          {createBillingError && (
            <LimitPrompt error={createBillingError} onClose={() => createBoard.reset()} />
          )}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="board-name">{t('tasks.boards.createDialog.nameLabel')}</Label>
              <Input
                id="board-name"
                autoFocus
                value={newName}
                onChange={event => setNewName(event.target.value)}
                placeholder={t('tasks.boards.createDialog.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-description">
                {t('tasks.boards.createDialog.descriptionLabel')}
              </Label>
              <Textarea
                id="board-description"
                rows={3}
                value={newDescription}
                onChange={event => setNewDescription(event.target.value)}
                placeholder={t('tasks.boards.createDialog.descriptionPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t('tasks.boards.createDialog.cancel')}
            </Button>
            <Button onClick={submitCreate} disabled={!newName.trim() || createBoard.isPending}>
              {createBoard.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('tasks.boards.createDialog.submitting')}
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" />
                  {t('tasks.boards.createDialog.submit')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit board */}
      <Dialog open={!!editingBoard} onOpenChange={open => !open && setEditingBoard(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('tasks.boards.editDialog.title')}</DialogTitle>
            <DialogDescription>{t('tasks.boards.editDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-board-name">{t('tasks.boards.createDialog.nameLabel')}</Label>
              <Input
                id="edit-board-name"
                autoFocus
                value={editName}
                onChange={event => setEditName(event.target.value)}
                placeholder={t('tasks.boards.createDialog.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-description">
                {t('tasks.boards.createDialog.descriptionLabel')}
              </Label>
              <Textarea
                id="edit-board-description"
                rows={3}
                value={editDescription}
                onChange={event => setEditDescription(event.target.value)}
                placeholder={t('tasks.boards.createDialog.descriptionPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBoard(null)}>
              {t('tasks.boards.createDialog.cancel')}
            </Button>
            <Button onClick={submitEdit} disabled={!editName.trim() || updateBoard.isPending}>
              {updateBoard.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('tasks.boards.editDialog.saving')}
                </>
              ) : (
                t('tasks.boards.editDialog.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type BoardActionsProps = {
  board: BoardListItem
  /** C-10: read-only — избранное и меню мутаций скрыты. */
  readOnly?: boolean
  onOpen: () => void
  onToggleFavorite: () => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}

function BoardMenu({
  board,
  onEdit,
  onArchive,
  onDelete,
}: Pick<BoardActionsProps, 'board' | 'onEdit' | 'onArchive' | 'onDelete'>) {
  const t = useT()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" onClick={event => event.stopPropagation()}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={event => event.stopPropagation()}>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 size-4" />
          {t('tasks.boards.menu.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onArchive}>
          <Archive className="mr-2 size-4" />
          {board.isArchived ? t('tasks.boards.menu.unarchive') : t('tasks.boards.menu.archive')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 size-4" />
          {t('tasks.boards.menu.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FavoriteButton({
  active,
  busy,
  onClick,
}: {
  active?: boolean
  busy?: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('size-8', active ? 'text-primary' : 'text-muted-foreground')}
      onClick={event => {
        event.stopPropagation()
        onClick()
      }}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Star className={cn('size-4', active && 'fill-primary')} />
      )}
    </Button>
  )
}

function BoardCard({
  board,
  readOnly,
  onOpen,
  onToggleFavorite,
  isTogglingFavorite,
  onEdit,
  onArchive,
  onDelete,
}: BoardActionsProps & { isTogglingFavorite?: boolean }) {
  const t = useT()
  const { total, done, inProgress, progress, members } = boardCounts(board)

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="group cursor-pointer p-5 transition-shadow hover:shadow-soft-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
            style={
              board.backgroundColor
                ? { backgroundColor: `${board.backgroundColor}1a`, color: board.backgroundColor }
                : undefined
            }
          >
            <KanbanSquare className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{board.name}</h3>
            {board.description && (
              <p className="truncate text-xs text-muted-foreground">{board.description}</p>
            )}
          </div>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 items-center">
            <FavoriteButton
              active={board.isFavorite}
              busy={isTogglingFavorite}
              onClick={onToggleFavorite}
            />
            <BoardMenu board={board} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} />
          </div>
        )}
      </div>

      <div className="mt-5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('tasks.boards.card.progress')}</span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
        <Stat value={total} label={t('tasks.boards.card.total')} />
        <Stat value={inProgress} label={t('tasks.boards.card.inProgress')} />
        <Stat value={done} label={t('tasks.boards.card.done')} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" />
          {members}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {t('tasks.boards.card.open')}
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </Card>
  )
}

function BoardRow({ board, readOnly, onOpen, onToggleFavorite, onEdit, onArchive, onDelete }: BoardActionsProps) {
  const t = useT()
  const { total, done, inProgress, members } = boardCounts(board)

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      className="flex cursor-pointer items-center gap-4 p-3 transition-shadow hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
        style={
          board.backgroundColor
            ? { backgroundColor: `${board.backgroundColor}1a`, color: board.backgroundColor }
            : undefined
        }
      >
        <KanbanSquare className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{board.name}</h3>
          {typeof board.columnsCount === 'number' && (
            <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
              {board.columnsCount} {t('tasks.boards.card.columns')}
            </Badge>
          )}
        </div>
        {board.description && (
          <p className="truncate text-xs text-muted-foreground">{board.description}</p>
        )}
      </div>

      <div className="hidden items-center gap-6 text-xs md:flex">
        <Stat value={total} label={t('tasks.boards.card.total')} compact />
        <Stat value={inProgress} label={t('tasks.boards.card.inProgress')} compact />
        <Stat value={done} label={t('tasks.boards.card.done')} compact />
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Users className="size-3.5" />
          {members}
        </span>
      </div>

      {!readOnly && (
        <div className="flex shrink-0 items-center">
          <FavoriteButton active={board.isFavorite} onClick={onToggleFavorite} />
          <BoardMenu board={board} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} />
        </div>
      )}
    </Card>
  )
}

function Stat({ value, label, compact }: { value: number; label: string; compact?: boolean }) {
  return (
    <div className={compact ? 'text-center' : 'space-y-0.5'}>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function BoardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-48 rounded-xl" />
      ))}
    </div>
  )
}

export default BoardsListPage
