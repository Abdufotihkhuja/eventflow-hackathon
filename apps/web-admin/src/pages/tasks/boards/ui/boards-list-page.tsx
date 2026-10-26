/**
 * Страница списка досок задач
 * Подключена к реальному API
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Input,
  Skeleton,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui'
import { cn } from '@shared/lib'
import {
  KanbanSquare,
  Plus,
  Search,
  TrendingUp,
  ListChecks,
  Clock,
  Users,
  LayoutGrid,
  List,
  ArrowUpRight,
  Star,
  MoreHorizontal,
  FolderKanban,
  Loader2,
  Pencil,
  Archive,
  Trash2,
} from 'lucide-react'
import {
  useBoardsQuery,
  useToggleBoardFavorite,
  useCreateBoard,
  useUpdateBoard,
  useDeleteBoard,
  useArchiveBoard,
} from '@features/boards'
import type { BoardListItem } from '@api/services'
import { useT } from '@eventflow/i18n/react'

// Цвета для досок по умолчанию
const BOARD_COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']

function getBoardColor(board: BoardListItem, index: number): string {
  return board.backgroundColor || BOARD_COLORS[index % BOARD_COLORS.length]
}

export function BoardsListPage() {
  const t = useT()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Модалка создания доски
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardDescription, setNewBoardDescription] = useState('')

  // Модалка редактирования доски
  const [editingBoard, setEditingBoard] = useState<BoardListItem | null>(null)
  const [editBoardName, setEditBoardName] = useState('')
  const [editBoardDescription, setEditBoardDescription] = useState('')

  // Получаем доски с сервера
  const { data, isLoading, isError, error } = useBoardsQuery({ search: search || undefined })
  const toggleFavorite = useToggleBoardFavorite()
  const createBoard = useCreateBoard()
  const updateBoard = useUpdateBoard()
  const deleteBoard = useDeleteBoard()
  const archiveBoard = useArchiveBoard()

  // Фильтрация досок (уже фильтруются на сервере, но можно добавить локальную)
  const boards = useMemo(() => {
    // API может вернуть массив напрямую или объект { data: [...] }
    if (Array.isArray(data)) return data
    if (data && 'data' in data && Array.isArray((data as any).data)) return (data as any).data
    return []
  }, [data])

  // Статистика
  const stats = useMemo(() => {
    const allBoards = boards
    const totalTasks = allBoards.reduce(
      (acc: number, b: BoardListItem) => acc + (b._count?.tasks ?? b.tasksCount ?? 0),
      0
    )
    const inProgress = allBoards.reduce(
      (acc: number, b: BoardListItem) => acc + (b.inProgressTasksCount ?? 0),
      0
    )
    const completed = allBoards.reduce(
      (acc: number, b: BoardListItem) => acc + (b.completedTasksCount ?? 0),
      0
    )

    return {
      totalBoards: allBoards.length,
      totalTasks,
      inProgress,
      completed,
    }
  }, [boards])

  const handleBoardClick = (boardId: string) => {
    navigate(`/tasks/boards/${boardId}`)
  }

  const handleToggleFavorite = (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation()
    toggleFavorite.mutate(boardId)
  }

  const handleEditBoard = (boardId: string) => {
    const board = boards.find((b: BoardListItem) => b.id === boardId)
    if (board) {
      setEditingBoard(board)
      setEditBoardName(board.name)
      setEditBoardDescription(board.description || '')
    }
  }

  const handleSubmitEditBoard = async () => {
    if (!editingBoard || !editBoardName.trim()) return

    updateBoard.mutate(
      {
        boardId: editingBoard.id,
        data: {
          name: editBoardName.trim(),
          description: editBoardDescription.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditingBoard(null)
          setEditBoardName('')
          setEditBoardDescription('')
        },
      }
    )
  }

  const handleArchiveBoard = (boardId: string) => {
    archiveBoard.mutate(boardId)
  }

  const handleDeleteBoard = (boardId: string) => {
    if (window.confirm(t('tasks.batch1.boardsListPage.s001'))) {
      deleteBoard.mutate(boardId)
    }
  }

  const handleCreateBoard = () => {
    setIsCreateModalOpen(true)
  }

  const handleSubmitCreateBoard = async () => {
    if (!newBoardName.trim()) return

    try {
      const board = await createBoard.mutateAsync({
        name: newBoardName.trim(),
        description: newBoardDescription.trim() || undefined,
      })
      setIsCreateModalOpen(false)
      setNewBoardName('')
      setNewBoardDescription('')
      // Переходим на созданную доску
      navigate(`/tasks/boards/${board.id}`)
    } catch (err) {
      // Ошибка обработается через toast или показ в UI
      console.error(t('tasks.batch1.boardsListPage.s002'), err)
    }
  }

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false)
    setNewBoardName('')
    setNewBoardDescription('')
  }

  if (isLoading) {
    return <BoardsListSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive mb-4">{t('tasks.batch1.boardsListPage.s003')}{error?.message}</p>
        <Button onClick={() => window.location.reload()}>{t('tasks.batch1.boardsListPage.s004')}</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="bg-background px-4 py-8 mb-6 -mx-4 -mt-4 sm:px-6 sm:py-10 sm:mb-8 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-foreground tracking-tight sm:text-4xl">{t('tasks.batch1.boardsListPage.s006')}</h1>
              <p className="text-base text-muted-foreground max-w-xl sm:text-lg">{t('tasks.batch1.boardsListPage.s007')}</p>
            </div>

            <Button size="lg" className="gap-2 h-12 px-6" onClick={handleCreateBoard}>
              <Plus className="h-5 w-5" />{t('tasks.batch1.boardsListPage.s008')}</Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            <StatCard
              icon={KanbanSquare}
              label={t('tasks.batch1.boardsListPage.s009')}
              value={stats.totalBoards}
            />
            <StatCard
              icon={ListChecks}
              label={t('tasks.batch1.boardsListPage.s010')}
              value={stats.totalTasks}
            />
            <StatCard icon={Clock} label={t('tasks.batch1.boardsListPage.s011')} value={stats.inProgress} />
            <StatCard icon={TrendingUp} label={t('tasks.batch1.boardsListPage.s012')} value={stats.completed} />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('tasks.batch1.boardsListPage.s013')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-11 bg-card border-border"
            />
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'grid' | 'list')}>
              <TabsList className="bg-muted">
                <TabsTrigger
                  value="grid"
                  className="gap-2 data-[state=active]:bg-card"
                >
                  <LayoutGrid className="h-4 w-4" />{t('tasks.batch1.boardsListPage.s014')}</TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="gap-2 data-[state=active]:bg-card"
                >
                  <List className="h-4 w-4" />{t('tasks.batch1.boardsListPage.s015')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Boards Grid/List */}
        {boards.length === 0 && !isLoading ? (
          <EmptyState hasSearch={!!search} onCreate={handleCreateBoard} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {boards.map((board: BoardListItem, index: number) => {
              const totalTasks = board._count?.tasks ?? board.tasksCount ?? 0
              const completedTasks = board.completedTasksCount ?? 0
              const inProgressTasks = board.inProgressTasksCount ?? 0
              const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

              return (
                <BoardCard
                  key={board.id}
                  board={board}
                  color={getBoardColor(board, index)}
                  totalTasks={totalTasks}
                  completedTasks={completedTasks}
                  inProgressTasks={inProgressTasks}
                  progress={progress}
                  onClick={() => handleBoardClick(board.id)}
                  onToggleFavorite={e => handleToggleFavorite(e, board.id)}
                  isTogglingFavorite={toggleFavorite.isPending}
                  onEdit={() => handleEditBoard(board.id)}
                  onArchive={() => handleArchiveBoard(board.id)}
                  onDelete={() => handleDeleteBoard(board.id)}
                />
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {boards.map((board: BoardListItem, index: number) => {
              const totalTasks = board._count?.tasks ?? board.tasksCount ?? 0
              const completedTasks = board.completedTasksCount ?? 0
              const inProgressTasks = board.inProgressTasksCount ?? 0
              const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

              return (
                <BoardListRow
                  key={board.id}
                  board={board}
                  color={getBoardColor(board, index)}
                  totalTasks={totalTasks}
                  completedTasks={completedTasks}
                  inProgressTasks={inProgressTasks}
                  progress={progress}
                  onClick={() => handleBoardClick(board.id)}
                  onToggleFavorite={e => handleToggleFavorite(e, board.id)}
                  onEdit={() => handleEditBoard(board.id)}
                  onArchive={() => handleArchiveBoard(board.id)}
                  onDelete={() => handleDeleteBoard(board.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Create Board Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('tasks.batch1.boardsListPage.s016')}</DialogTitle>
            <DialogDescription>{t('tasks.batch1.boardsListPage.s017')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">{t('tasks.batch1.boardsListPage.s018')}</Label>
              <Input
                id="board-name"
                placeholder={t('tasks.batch1.boardsListPage.s019')}
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-description">{t('tasks.batch1.boardsListPage.s020')}</Label>
              <Textarea
                id="board-description"
                placeholder={t('tasks.batch1.boardsListPage.s021')}
                value={newBoardDescription}
                onChange={e => setNewBoardDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCreateModal}>{t('tasks.batch1.boardsListPage.s022')}</Button>
            <Button
              onClick={handleSubmitCreateBoard}
              disabled={!newBoardName.trim() || createBoard.isPending}
            >
              {createBoard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('tasks.batch1.boardsListPage.s023')}</>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />{t('tasks.batch1.boardsListPage.s008')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Board Modal */}
      <Dialog open={!!editingBoard} onOpenChange={open => !open && setEditingBoard(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('tasks.batch1.boardsListPage.s024')}</DialogTitle>
            <DialogDescription>{t('tasks.batch1.boardsListPage.s025')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-board-name">{t('tasks.batch1.boardsListPage.s018')}</Label>
              <Input
                id="edit-board-name"
                placeholder={t('tasks.batch1.boardsListPage.s019')}
                value={editBoardName}
                onChange={e => setEditBoardName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-board-description">{t('tasks.batch1.boardsListPage.s020')}</Label>
              <Textarea
                id="edit-board-description"
                placeholder={t('tasks.batch1.boardsListPage.s021')}
                value={editBoardDescription}
                onChange={e => setEditBoardDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBoard(null)}>{t('tasks.batch1.boardsListPage.s022')}</Button>
            <Button
              onClick={handleSubmitEditBoard}
              disabled={!editBoardName.trim() || updateBoard.isPending}
            >
              {updateBoard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('tasks.batch1.boardsListPage.s026')}</>
              ) : (
                t('tasks.batch1.boardsListPage.s027')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  )
}

// Board Card Component
interface BoardCardProps {
  board: BoardListItem
  color: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  progress: number
  onClick: () => void
  onToggleFavorite: (e: React.MouseEvent) => void
  isTogglingFavorite?: boolean
  onEdit?: () => void
  onArchive?: () => void
  onDelete?: () => void
}

function BoardCard({
  board,
  color,
  totalTasks,
  completedTasks,
  inProgressTasks,
  progress,
  onClick,
  onToggleFavorite,
  isTogglingFavorite,
  onEdit,
  onArchive,
  onDelete,
}: BoardCardProps) {
  const t = useT()
  return (
    <Card
      className={cn(
        'group relative cursor-pointer overflow-hidden transition duration-300',
        'border-border bg-card',
        'hover:shadow-sm hover:border-border'
      )}
      onClick={onClick}
    >
      {/* Color Top Bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
              style={{ backgroundColor: `${color}15` }}
            >
              <FolderKanban className="h-5 w-5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-muted-foreground transition-colors">
                {board.name}
              </h3>
              {board.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {board.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Избранное"
              className={cn(
                'h-9 w-9 transition-opacity',
                board.isFavorite
                  ? 'opacity-100 text-warning'
                  : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-visible:opacity-100'
              )}
              onClick={onToggleFavorite}
              disabled={isTogglingFavorite}
            >
              {isTogglingFavorite ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Star className={cn('h-4 w-4', board.isFavorite && 'fill-current')} />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('admin.tables.columns.actions')}
                  className="h-9 w-9 opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />{t('tasks.batch1.boardsListPage.s028')}</DropdownMenuItem>
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  {board.isArchived ? t('tasks.batch1.boardsListPage.s029') : t('tasks.batch1.boardsListPage.s030')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />{t('tasks.batch1.boardsListPage.s031')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t('tasks.batch1.boardsListPage.s032')}</span>
            <span className="text-xs font-semibold text-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{totalTasks}</p>
            <p className="text-xs text-muted-foreground">{t('tasks.batch1.boardsListPage.s033')}</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-lg font-bold text-warning">{inProgressTasks}</p>
            <p className="text-xs text-muted-foreground">{t('tasks.batch1.boardsListPage.s011')}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-success">{completedTasks}</p>
            <p className="text-xs text-muted-foreground">{t('tasks.batch1.boardsListPage.s034')}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{board._count?.members ?? board.membersCount ?? 0}{t('tasks.batch1.boardsListPage.s035')}</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{t('tasks.batch1.boardsListPage.s036')}<ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Card>
  )
}

// Board List Item Component
interface BoardListRowProps {
  board: BoardListItem
  color: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  progress: number
  onClick: () => void
  onToggleFavorite: (e: React.MouseEvent) => void
  onEdit?: () => void
  onArchive?: () => void
  onDelete?: () => void
}

function BoardListRow({
  board,
  color,
  totalTasks,
  completedTasks,
  inProgressTasks,
  progress,
  onClick,
  onToggleFavorite,
  onEdit,
  onArchive,
  onDelete,
}: BoardListRowProps) {
  const t = useT()
  return (
    <Card
      className={cn(
        'group cursor-pointer transition duration-200',
        'border-border bg-card',
        'hover:shadow-sm hover:border-border'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Color Indicator */}
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <FolderKanban className="h-6 w-6" style={{ color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground truncate">
              {board.name}
            </h3>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs">
              {board.columnsCount ?? 0}{t('tasks.batch1.boardsListPage.s037')}</Badge>
          </div>
          {board.description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {board.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="font-semibold text-foreground">{totalTasks}</p>
            <p className="text-xs text-muted-foreground">{t('tasks.batch1.boardsListPage.s038')}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-warning">{inProgressTasks}</p>
            <p className="text-xs text-muted-foreground">{t('tasks.batch1.boardsListPage.s039')}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-success">{completedTasks}</p>
            <p className="text-xs text-muted-foreground">{t('tasks.batch1.boardsListPage.s040')}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="hidden lg:block w-32">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Избранное"
            className={cn('h-9 w-9', board.isFavorite && 'text-warning')}
            onClick={onToggleFavorite}
          >
            <Star className={cn('h-4 w-4', board.isFavorite && 'fill-current')} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('admin.tables.columns.actions')}
                className="h-9 w-9"
                onClick={e => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />{t('tasks.batch1.boardsListPage.s028')}</DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                {board.isArchived ? t('tasks.batch1.boardsListPage.s029') : t('tasks.batch1.boardsListPage.s030')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />{t('tasks.batch1.boardsListPage.s031')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>
    </Card>
  )
}

// Empty State Component
function EmptyState({ hasSearch, onCreate }: { hasSearch: boolean; onCreate: () => void }) {
  const t = useT()
  return (
    <Card className="border-dashed border-2 border-border bg-muted">
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
          <KanbanSquare className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {hasSearch ? t('tasks.batch1.boardsListPage.s041') : t('tasks.batch1.boardsListPage.s042')}
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {hasSearch
            ? t('tasks.batch1.boardsListPage.s043')
            : t('tasks.batch1.boardsListPage.s044')}
        </p>
        {!hasSearch && (
          <Button className="gap-2" onClick={onCreate}>
            <Plus className="h-4 w-4" />{t('tasks.batch1.boardsListPage.s045')}</Button>
        )}
      </div>
    </Card>
  )
}

// Skeleton Loading Component
function BoardsListSkeleton() {
  return (
    <div className="space-y-8">
      <div className="bg-muted rounded-xl p-8 -mx-6 -mt-6 lg:-mx-8 lg:-mt-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-96" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default BoardsListPage
