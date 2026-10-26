/**
 * Колонка канбан-доски с премиум UI
 * Поддержка drag & drop и WIP лимитов
 */

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Button, ScrollArea, Badge } from '@shared/ui'
import { Plus, MoreHorizontal, GripVertical, ListChecks } from 'lucide-react'
import { cn } from '@shared/lib'
import { SortableTaskCard } from './sortable-task-card'
import type { BoardColumn as ApiBoardColumn, BoardTask } from '@api/services'

interface KanbanColumnProps {
  column: ApiBoardColumn
  tasks: BoardTask[]
  onTaskClick: (taskId: string) => void
  onCreateTask: (columnId: string, title: string) => void
  onEditTask?: (taskId: string) => void
  onDeleteTask?: (taskId: string) => void
  onDuplicateTask?: (taskId: string) => void
  onOpenTaskInNewTab?: (taskId: string) => void
  isCreatingTask?: boolean
  boardColor?: string
  forceAddingTask?: boolean
  onAddingTaskChange?: (columnId: string | null) => void
  dragHandleProps?: Record<string, unknown>
}

// Стили колонок на основе позиции (первая колонка = backlog, последняя = done)
// Поверхность колонок нейтральная (bone-and-ink); цвет передаётся через точку-индикатор.
function getColumnStyles(position: number, color?: string | null) {
  // Если у колонки есть свой цвет - используем его для точки-индикатора
  if (color) {
    return {
      bg: 'bg-muted',
      border: 'border-border',
      dotColor: color,
    }
  }

  // Дефолтные точки-индикаторы по позиции
  const dotColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#a855f7', '#10b981']

  return {
    bg: 'bg-muted',
    border: 'border-border',
    dotColor: dotColors[position % dotColors.length],
  }
}

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onOpenTaskInNewTab,
  isCreatingTask,
  boardColor,
  forceAddingTask,
  onAddingTaskChange,
  dragHandleProps,
}: KanbanColumnProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Форма открыта если родитель передал forceAddingTask для этой колонки
  const isAddingTask = forceAddingTask

  const setIsAddingTask = (value: boolean) => {
    if (onAddingTaskChange) {
      onAddingTaskChange(value ? column.id : null)
    }
  }

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const hasLimit = column.wipLimit !== undefined && column.wipLimit !== null
  const isOverLimit = hasLimit && tasks.length > column.wipLimit!
  const limitProgress = hasLimit ? (tasks.length / column.wipLimit!) * 100 : 0

  const styles = getColumnStyles(column.position, column.color)

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return

    onCreateTask(column.id, newTaskTitle.trim())
    setNewTaskTitle('')
    setIsAddingTask(false)
  }

  return (
    <div
      className={cn(
        'flex w-80 flex-shrink-0 flex-col rounded-2xl border transition duration-300',
        styles.bg,
        styles.border,
        isOver && 'ring-2 ring-offset-2',
        isOver && 'ring-ring'
      )}
      style={{
        boxShadow: isOver ? `0 0 0 2px ${boardColor}40` : undefined,
      }}
    >
      {/* Column Header */}
      <div className="flex flex-col p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Переместить колонку"
              className="h-9 w-9 flex-shrink-0 cursor-grab hover:bg-accent active:cursor-grabbing rounded-md"
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </Button>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: column.color || styles.dotColor }}
              />
              <h3 className="font-semibold text-sm text-foreground truncate">
                {column.name}
              </h3>
              <Badge
                variant="secondary"
                className={cn(
                  'h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-md',
                  isOverLimit
                    ? 'bg-danger-soft text-danger-soft-foreground'
                    : 'bg-card text-muted-foreground'
                )}
              >
                {tasks.length}
                {hasLimit && (
                  <span className="text-muted-foreground">/{column.wipLimit}</span>
                )}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Добавить задачу"
              className="h-9 w-9 rounded-lg hover:bg-accent"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Действия с колонкой"
              className="h-9 w-9 rounded-lg hover:bg-accent"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* WIP Limit Progress Bar */}
        {hasLimit && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
              <div
                className={cn(
                  'h-full transition duration-500 rounded-full',
                  isOverLimit ? 'bg-destructive' : limitProgress > 75 ? 'bg-warning' : 'bg-info'
                )}
                style={{ width: `${Math.min(limitProgress, 100)}%` }}
              />
            </div>
            {isOverLimit && (
              <p className="text-[10px] text-destructive mt-1 font-medium">Превышен лимит WIP</p>
            )}
          </div>
        )}
      </div>

      {/* Tasks Container */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={setNodeRef} className="space-y-3 p-3 min-h-[200px]">
          {tasks.length === 0 && !isAddingTask ? (
            <EmptyColumnState onAddClick={() => setIsAddingTask(true)} />
          ) : (
            <>
              {tasks.map(task => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                  onEdit={() => onEditTask?.(task.id)}
                  onDelete={() => onDeleteTask?.(task.id)}
                  onDuplicate={() => onDuplicateTask?.(task.id)}
                  onOpenInNewTab={() => onOpenTaskInNewTab?.(task.id)}
                />
              ))}

              {/* Quick Add Task Input */}
              {isAddingTask && (
                <div className="rounded-xl border-2 border-dashed border-border bg-card p-3 shadow-sm">
                  <textarea
                    autoFocus
                    placeholder="Введите название задачи..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddTask()
                      } else if (e.key === 'Escape') {
                        setIsAddingTask(false)
                        setNewTaskTitle('')
                      }
                    }}
                    className="w-full resize-none text-sm outline-none placeholder:text-muted-foreground bg-transparent"
                    rows={2}
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim() || isCreatingTask}
                      className="h-8 rounded-lg"
                    >
                      {isCreatingTask ? 'Создание...' : 'Добавить'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingTask(false)
                        setNewTaskTitle('')
                      }}
                      className="h-8 rounded-lg"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Add Task Footer */}
      {tasks.length > 0 && !isAddingTask && (
        <div className="p-3 pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingTask(true)}
            className="w-full h-9 rounded-lg border border-dashed border-border hover:bg-accent text-muted-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить задачу
          </Button>
        </div>
      )}
    </div>
  )
}

// Empty State для колонки
function EmptyColumnState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ListChecks className="size-5" />
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">Нет задач</p>
      <p className="text-xs text-muted-foreground mb-4 px-4">
        Перетащите задачу сюда или создайте новую
      </p>
      <Button variant="outline" size="sm" onClick={onAddClick} className="h-8 rounded-lg">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Создать задачу
      </Button>
    </div>
  )
}
