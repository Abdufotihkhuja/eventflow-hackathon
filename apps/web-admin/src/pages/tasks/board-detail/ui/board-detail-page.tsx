/**
 * Страница детальной информации о доске (канбан-вид)
 * Премиум UI/UX с полноэкранным режимом
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button, ScrollArea, ScrollBar, Badge, Input, Skeleton } from '@shared/ui'
import {
  ArrowLeft,
  Star,
  UserPlus,
  Filter,
  Search,
  Users,
  Grid3x3,
  List,
  ChevronRight,
  Plus,
  Zap,
  Clock,
  CheckCircle2,
  Settings,
  Share2,
  FolderKanban,
  Loader2,
} from 'lucide-react'
import { cn } from '@shared/lib'
import {
  useBoardQuery,
  useToggleBoardFavorite,
  useCreateColumn,
  useReorderColumns,
} from '@features/boards'
import { useMoveTask, useCreateTask, useDeleteTask } from '@features/tasks'
import { TaskCard } from '@features/tasks'
import { SortableKanbanColumn } from './sortable-kanban-column'
import { TaskDetailModal } from './task-detail-modal'
import type { BoardTask, BoardColumn } from '@api/services'

export function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // API Hooks
  const { data: board, isLoading, isError, error } = useBoardQuery(boardId)
  const toggleFavorite = useToggleBoardFavorite()
  const moveTask = useMoveTask()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()
  const createColumn = useCreateColumn()
  const reorderColumns = useReorderColumns()

  // Local state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localColumns, setLocalColumns] = useState<BoardColumn[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [showSearch, setShowSearch] = useState(false)
  const [showNewTaskInput, setShowNewTaskInput] = useState<string | null>(null) // columnId для быстрого создания
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedTask, setSelectedTask] = useState<BoardTask | null>(null)

  // Синхронизация локального состояния с сервером
  useEffect(() => {
    if (board?.columns) {
      setLocalColumns(board.columns)
    }
  }, [board?.columns])

  // Открытие задачи из query параметра (?task=taskId)
  useEffect(() => {
    const taskIdFromUrl = searchParams.get('task')
    if (taskIdFromUrl && localColumns.length > 0) {
      // Находим задачу во всех колонках
      for (const col of localColumns) {
        const task = col.tasks?.find(t => t.id === taskIdFromUrl)
        if (task) {
          setSelectedTask(task)
          // Убираем параметр из URL чтобы не открывалась повторно
          searchParams.delete('task')
          setSearchParams(searchParams, { replace: true })
          break
        }
      }
    }
  }, [localColumns, searchParams, setSearchParams])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Фильтрация задач по поиску
  const filteredColumns = useMemo(() => {
    if (!searchQuery) return localColumns

    const query = searchQuery.toLowerCase()
    return localColumns.map(column => ({
      ...column,
      tasks: column.tasks?.filter(
        t => t.title.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query)
      ),
    }))
  }, [localColumns, searchQuery])

  // Группируем задачи по колонкам для DnD
  const tasksByColumn = useMemo(() => {
    const grouped = new Map<string, BoardTask[]>()

    filteredColumns.forEach(column => {
      const columnTasks = (column.tasks || []).sort((a, b) => a.position - b.position)
      grouped.set(column.id, columnTasks)
    })

    return grouped
  }, [filteredColumns])

  // Все задачи для поиска активной
  const allTasks = useMemo(() => {
    return localColumns.flatMap(col => col.tasks || [])
  }, [localColumns])

  const activeTask = useMemo(() => {
    return allTasks.find(task => task.id === activeId)
  }, [activeId, allTasks])

  // Создание задачи
  const handleCreateTask = useCallback(
    (columnId: string, title: string) => {
      if (!boardId) return

      createTask.mutate({
        boardId,
        data: {
          columnId,
          title,
        },
      })
    },
    [boardId, createTask]
  )

  // Создание колонки
  const handleCreateColumn = useCallback(() => {
    if (!boardId || !newColumnName.trim()) return

    createColumn.mutate(
      {
        boardId,
        data: {
          name: newColumnName.trim(),
        },
      },
      {
        onSuccess: () => {
          setNewColumnName('')
          setIsAddingColumn(false)
        },
      }
    )
  }, [boardId, newColumnName, createColumn])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event

      if (!over) return

      const activeTaskId = active.id as string
      const overId = over.id as string

      // Найдем текущую колонку и задачу
      let sourceColumnId: string | null = null
      let activeTaskData: BoardTask | null = null

      for (const column of localColumns) {
        const task = column.tasks?.find(t => t.id === activeTaskId)
        if (task) {
          sourceColumnId = column.id
          activeTaskData = task
          break
        }
      }

      if (!activeTaskData || !sourceColumnId) return

      // Проверяем, перетаскиваем ли на колонку или на задачу
      const overColumn = localColumns.find(col => col.id === overId)
      let targetColumnId: string | null = null

      if (overColumn) {
        targetColumnId = overColumn.id
      } else {
        // Ищем колонку по задаче
        for (const column of localColumns) {
          if (column.tasks?.find(t => t.id === overId)) {
            targetColumnId = column.id
            break
          }
        }
      }

      // Если целевая колонка отличается от источника - перемещаем
      if (targetColumnId && targetColumnId !== sourceColumnId) {
        setLocalColumns(prev =>
          prev.map(column => {
            if (column.id === sourceColumnId) {
              return {
                ...column,
                tasks: column.tasks?.filter(t => t.id !== activeTaskId),
              }
            }
            if (column.id === targetColumnId) {
              return {
                ...column,
                tasks: [...(column.tasks || []), activeTaskData!],
              }
            }
            return column
          })
        )
      }
    },
    [localColumns]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)

      if (!over || !boardId) return

      const activeId = active.id as string
      const overId = over.id as string

      // Проверяем, перетаскиваем ли колонку
      if (activeId.startsWith('column-') && overId.startsWith('column-')) {
        const activeColumnId = activeId.replace('column-', '')
        const overColumnId = overId.replace('column-', '')

        if (activeColumnId !== overColumnId) {
          const oldIndex = localColumns.findIndex(col => col.id === activeColumnId)
          const newIndex = localColumns.findIndex(col => col.id === overColumnId)

          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedColumns = arrayMove(localColumns, oldIndex, newIndex)
            setLocalColumns(reorderedColumns.map((col, idx) => ({ ...col, position: idx })))

            // Отправляем новый порядок на сервер
            reorderColumns.mutate({
              boardId,
              data: {
                columnIds: reorderedColumns.map(col => col.id),
              },
            })
          }
        }
        return
      }

      // Перетаскивание задачи
      const activeTaskId = activeId

      // Найдем текущую колонку задачи
      let targetColumnId: string | null = null
      let targetPosition = 0

      for (const column of localColumns) {
        const taskIndex = column.tasks?.findIndex(t => t.id === activeTaskId)
        if (taskIndex !== undefined && taskIndex !== -1) {
          targetColumnId = column.id
          targetPosition = taskIndex
          break
        }
      }

      // Если перетащили на другую задачу - вычисляем позицию
      const overColumn = localColumns.find(col => col.id === overId)
      if (!overColumn) {
        for (const column of localColumns) {
          const overTaskIndex = column.tasks?.findIndex(t => t.id === overId)
          if (overTaskIndex !== undefined && overTaskIndex !== -1) {
            targetColumnId = column.id
            targetPosition = overTaskIndex
            break
          }
        }
      }

      if (!targetColumnId) return

      // Обновляем порядок в локальном состоянии
      if (active.id !== over.id) {
        setLocalColumns(prev =>
          prev.map(column => {
            if (column.id === targetColumnId) {
              const tasks = [...(column.tasks || [])]
              const oldIndex = tasks.findIndex(t => t.id === activeTaskId)
              const newIndex = tasks.findIndex(t => t.id === overId)

              if (oldIndex !== -1 && newIndex !== -1) {
                const reordered = arrayMove(tasks, oldIndex, newIndex)
                return {
                  ...column,
                  tasks: reordered.map((t, idx) => ({ ...t, position: idx })),
                }
              }
            }
            return column
          })
        )
      }

      // Отправляем мутацию на сервер
      moveTask.mutate({
        boardId,
        taskId: activeTaskId,
        data: {
          columnId: targetColumnId,
          position: targetPosition,
        },
      })
    },
    [localColumns, boardId, moveTask, reorderColumns]
  )

  const handleTaskClick = (taskId: string) => {
    // Находим задачу во всех колонках
    for (const col of localColumns) {
      const task = col.tasks?.find(t => t.id === taskId)
      if (task) {
        setSelectedTask(task)
        return
      }
    }
  }

  const handleEditTask = (taskId: string) => {
    // Открываем модалку с задачей для редактирования
    handleTaskClick(taskId)
  }

  const handleDeleteTask = (taskId: string) => {
    if (!boardId) return
    if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      deleteTask.mutate({ boardId, taskId })
    }
  }

  const handleDuplicateTask = (taskId: string) => {
    // TODO: Реализовать дублирование задачи
    console.log('Duplicate task:', taskId)
  }

  const handleOpenTaskInNewTab = (taskId: string) => {
    // Открываем доску с задачей в query параметре
    window.open(`/tasks/boards/${boardId}?task=${taskId}`, '_blank')
  }

  const handleToggleFavorite = () => {
    if (boardId) {
      toggleFavorite.mutate(boardId)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <div className="flex-shrink-0 border-b border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Error or not found
  if (isError || !board) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mb-6">
            <Grid3x3 className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Доска не найдена
          </h3>
          <p className="text-muted-foreground mb-8">
            {isError
              ? `Ошибка: ${(error as Error)?.message || 'Не удалось загрузить доску'}`
              : 'Возможно, доска была удалена или у вас нет доступа к ней'}
          </p>
          <Button onClick={() => navigate('/tasks/boards')} size="lg" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Вернуться к доскам
          </Button>
        </div>
      </div>
    )
  }

  // Calculate stats from columns
  const totalTasks = filteredColumns.reduce((acc, col) => acc + (col.tasks?.length || 0), 0)
  const stats = {
    total: totalTasks,
    inProgress: board.inProgressTasksCount ?? 0,
    done: board.completedTasksCount ?? 0,
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Enhanced Header */}
      <header className="flex-shrink-0 border-b border-border bg-card">
        <div className="px-4 lg:px-6 py-3">
          {/* Breadcrumbs */}
          <div className="mb-2 flex items-center gap-2 text-sm">
            <Link
              to="/tasks/boards"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Доски
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{board.name}</span>
          </div>

          {/* Main Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left Side */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Назад"
                className="h-9 w-9 rounded-lg"
                onClick={() => navigate('/tasks/boards')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-xl shadow-sm flex items-center justify-center"
                  style={{
                    backgroundColor: board.backgroundColor || '#6366f1',
                  }}
                >
                  <FolderKanban className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {board.name}
                  </h1>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {board.membersCount ?? board.members?.length ?? 0} участников
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {stats.total} задач
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Избранное"
                className={cn('h-9 w-9 rounded-lg', board.isFavorite && 'text-warning')}
                onClick={handleToggleFavorite}
                disabled={toggleFavorite.isPending}
              >
                <Star className={cn('h-4 w-4', board.isFavorite && 'fill-current')} />
              </Button>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div
                className={cn(
                  'transition duration-300 overflow-hidden',
                  showSearch ? 'w-48 sm:w-64' : 'w-9'
                )}
              >
                {showSearch ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Поиск задач..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onBlur={() => !searchQuery && setShowSearch(false)}
                      className="h-9 pl-9 pr-3 bg-muted border-0"
                    />
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Поиск"
                    className="h-9 w-9 rounded-lg"
                    onClick={() => setShowSearch(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex rounded-lg border border-border bg-muted p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Вид доски"
                  className={cn(
                    'h-9 w-9 rounded-md',
                    viewMode === 'board' && 'bg-card shadow-sm'
                  )}
                  onClick={() => setViewMode('board')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Вид списка"
                  className={cn(
                    'h-9 w-9 rounded-md',
                    viewMode === 'list' && 'bg-card shadow-sm'
                  )}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" size="sm" className="gap-2 h-9 rounded-lg hidden sm:flex">
                <Filter className="h-4 w-4" />
                Фильтры
              </Button>

              <Button variant="outline" size="sm" className="gap-2 h-9 rounded-lg hidden md:flex">
                <UserPlus className="h-4 w-4" />
                Пригласить
              </Button>

              <Button variant="outline" size="sm" aria-label="Поделиться" className="gap-2 h-9 rounded-lg hidden lg:flex">
                <Share2 className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" aria-label="Настройки" className="h-9 w-9 rounded-lg">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border sm:gap-4">
            <Badge
              variant="outline"
              className="gap-1.5 py-1 px-2.5 rounded-lg bg-card"
            >
              <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              {stats.total} всего
            </Badge>
            <Badge
              variant="outline"
              className="hidden gap-1.5 py-1 px-2.5 rounded-lg bg-card sm:flex"
            >
              <Clock className="h-3 w-3 text-warning" />
              {stats.inProgress} в работе
            </Badge>
            <Badge
              variant="outline"
              className="hidden gap-1.5 py-1 px-2.5 rounded-lg bg-card sm:flex"
            >
              <CheckCircle2 className="h-3 w-3 text-success" />
              {stats.done} готово
            </Badge>
            <div className="flex-1" />
            <Button
              size="sm"
              className="gap-2 h-8 rounded-lg"
              onClick={() => {
                // Открываем форму в первой колонке
                const firstColumn = filteredColumns[0]
                if (firstColumn) {
                  setShowNewTaskInput(firstColumn.id)
                }
              }}
            >
              <Plus className="h-4 w-4" />
              Новая задача
            </Button>
          </div>
        </div>
      </header>

      {/* Kanban Board - Fullscreen */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <ScrollArea className="h-full w-full">
            <div className="flex h-full gap-3 p-3 pb-6 sm:gap-5 sm:p-6 sm:pb-8">
              <SortableContext
                items={filteredColumns.map(col => `column-${col.id}`)}
                strategy={horizontalListSortingStrategy}
              >
                {filteredColumns.map(column => {
                  const columnTasks = tasksByColumn.get(column.id) || []
                  const taskIds = columnTasks.map((t: { id: string }) => t.id)

                  return (
                    <SortableKanbanColumn
                      key={column.id}
                      column={column}
                      tasks={columnTasks}
                      taskIds={taskIds}
                      onTaskClick={handleTaskClick}
                      onCreateTask={handleCreateTask}
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTask}
                      onDuplicateTask={handleDuplicateTask}
                      onOpenTaskInNewTab={handleOpenTaskInNewTab}
                      isCreatingTask={createTask.isPending}
                      boardColor={board.backgroundColor || '#6366f1'}
                      forceAddingTask={showNewTaskInput === column.id}
                      onAddingTaskChange={setShowNewTaskInput}
                    />
                  )
                })}
              </SortableContext>

              {/* Add Column */}
              <div className="flex-shrink-0 w-72 sm:w-80">
                {isAddingColumn ? (
                  <div className="bg-card rounded-xl border border-border p-3 space-y-3">
                    <Input
                      placeholder="Название колонки..."
                      value={newColumnName}
                      onChange={e => setNewColumnName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateColumn()
                        if (e.key === 'Escape') {
                          setIsAddingColumn(false)
                          setNewColumnName('')
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateColumn}
                        disabled={!newColumnName.trim() || createColumn.isPending}
                      >
                        {createColumn.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Добавить'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingColumn(false)
                          setNewColumnName('')
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full h-14 border-2 border-dashed border-border rounded-xl hover:border-border hover:bg-accent text-muted-foreground"
                    onClick={() => setIsAddingColumn(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить колонку
                  </Button>
                )}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-3 scale-105 opacity-95">
                <TaskCard task={activeTask} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        boardId={boardId}
        open={!!selectedTask}
        onOpenChange={open => !open && setSelectedTask(null)}
        onTaskUpdated={updated => {
          setSelectedTask(prev => (prev?.id === updated.id ? { ...prev, ...updated } : prev))
          setLocalColumns(prev =>
            prev.map(col => ({
              ...col,
              tasks: col.tasks?.map(t =>
                t.id === updated.id ? { ...t, ...updated } : t
              ),
            }))
          )
        }}
      />
    </div>
  )
}

export default BoardDetailPage
