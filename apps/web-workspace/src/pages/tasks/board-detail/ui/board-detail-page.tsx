/**
 * Страница детальной информации о доске (канбан-вид)
 * Премиум UI/UX с полноэкранным режимом
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
import { Button, ScrollArea, ScrollBar, Input, Skeleton } from '@shared/ui'
import { ArrowLeft, KanbanSquare, Loader2, Plus, Search, Star, Users } from 'lucide-react'
import { cn } from '@shared/lib'
import { useT } from '@eventflow/i18n/react'
import {
  useBoardQuery,
  useToggleBoardFavorite,
  useCreateColumn,
  useReorderColumns,
} from '@features/boards'
import { useMoveTask, useCreateTask, useDeleteTask } from '@features/tasks'
import { TaskCard } from '@features/tasks'
import { TaskBoardReadOnlyBanner, useTaskBoardGate } from '@features/billing'
import { SortableKanbanColumn } from './sortable-kanban-column'
import { TaskDetailModal } from './task-detail-modal'
import type { BoardTask, BoardColumn } from '@api/services'

export function BoardDetailPage() {
  const t = useT()
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // API Hooks
  const { data: board, isLoading, isError } = useBoardQuery(boardId)
  const toggleFavorite = useToggleBoardFavorite()
  const moveTask = useMoveTask()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()
  const createColumn = useCreateColumn()
  const reorderColumns = useReorderColumns()

  // C-10 (CR-12): Task Board вне тарифа → доска только для чтения. Записи
  // всё равно режет сервер (403 BILLING_FEATURE_GATED) — это честный UX-слой.
  const { locked: boardReadOnly } = useTaskBoardGate()

  // Local state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localColumns, setLocalColumns] = useState<BoardColumn[]>([])
  const [searchQuery, setSearchQuery] = useState('')
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
    if (window.confirm(t('tasks.boardDetail.deleteTaskConfirm'))) {
      deleteTask.mutate({ boardId, taskId })
    }
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
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
        <div className="flex-shrink-0 border-b border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Error or not found
  if (isError || !board) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="mx-auto max-w-md p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <KanbanSquare className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {t('tasks.boardDetail.notFound')}
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            {t('tasks.boardDetail.notFoundDescription')}
          </p>
          <Button onClick={() => navigate('/tasks/boards')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('tasks.boardDetail.backToBoards')}
          </Button>
        </div>
      </div>
    )
  }

  // Calculate stats from columns
  const totalTasks = filteredColumns.reduce((acc, col) => acc + (col.tasks?.length || 0), 0)
  const membersCount = board.membersCount ?? board.members?.length ?? 0

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => navigate('/tasks/boards')}
            aria-label={t('tasks.boardDetail.backToBoards')}
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
              style={
                board.backgroundColor
                  ? { backgroundColor: `${board.backgroundColor}1a`, color: board.backgroundColor }
                  : undefined
              }
            >
              <KanbanSquare className="size-3.5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight text-foreground">
                {board.name}
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" />
                  {membersCount}
                </span>
                <span>
                  {totalTasks} {t('tasks.boardDetail.tasksCount')}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={cn('size-9 shrink-0', board.isFavorite ? 'text-primary' : 'text-muted-foreground')}
            onClick={handleToggleFavorite}
            disabled={toggleFavorite.isPending || boardReadOnly}
            aria-pressed={board.isFavorite}
          >
            <Star className={cn('size-4', board.isFavorite && 'fill-primary')} />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-40 sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('tasks.filters.searchPlaceholder')}
                className="h-9 pl-9"
              />
            </div>
            {!boardReadOnly && (
              <Button
                size="sm"
                onClick={() => {
                  const firstColumn = filteredColumns[0]
                  if (firstColumn) setShowNewTaskInput(firstColumn.id)
                }}
              >
                <Plus className="size-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t('tasks.boardDetail.newTask')}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* C-10: доска только для чтения на текущем тарифе. */}
      {boardReadOnly && (
        <div className="border-b border-border px-3 py-3 sm:px-6">
          <TaskBoardReadOnlyBanner />
        </div>
      )}

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
                  const taskIds = columnTasks.map((task: { id: string }) => task.id)

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
                      onOpenTaskInNewTab={handleOpenTaskInNewTab}
                      isCreatingTask={createTask.isPending}
                      boardColor={board.backgroundColor ?? undefined}
                      forceAddingTask={showNewTaskInput === column.id}
                      onAddingTaskChange={setShowNewTaskInput}
                      readOnly={boardReadOnly}
                    />
                  )
                })}
              </SortableContext>

              {/* Add Column */}
              {!boardReadOnly && (
              <div className="flex-shrink-0 w-72 sm:w-80">
                {isAddingColumn ? (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                    <Input
                      placeholder={t('tasks.boardDetail.columnNamePlaceholder')}
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
                          t('tasks.boardDetail.add')
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
                        {t('tasks.boardDetail.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="h-14 w-full rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-strong hover:bg-muted hover:text-foreground"
                    onClick={() => setIsAddingColumn(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('tasks.boardDetail.addColumn')}
                  </Button>
                )}
              </div>
              )}
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
              tasks: col.tasks?.map(task =>
                task.id === updated.id ? { ...task, ...updated } : task
              ),
            }))
          )
        }}
      />
    </div>
  )
}

export default BoardDetailPage
