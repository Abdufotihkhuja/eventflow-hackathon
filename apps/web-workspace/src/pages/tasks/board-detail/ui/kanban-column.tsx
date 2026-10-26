/**
 * Kanban column with drag & drop and WIP limits.
 */

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Button, ScrollArea, Badge } from '@shared/ui'
import { Plus, GripVertical, ListChecks } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'
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
  /** Reserved for callers; column chrome is neutral by design. */
  boardColor?: string
  forceAddingTask?: boolean
  onAddingTaskChange?: (columnId: string | null) => void
  dragHandleProps?: Record<string, unknown>
  /** C-10: Task Board вне тарифа — просмотр без add-task аффордансов. */
  readOnly?: boolean
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
  forceAddingTask,
  onAddingTaskChange,
  dragHandleProps,
  readOnly = false,
}: KanbanColumnProps) {
  const t = useT()
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const isAddingTask = forceAddingTask && !readOnly

  const setIsAddingTask = (value: boolean) => {
    onAddingTaskChange?.(value ? column.id : null)
  }

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const hasLimit = column.wipLimit !== undefined && column.wipLimit !== null
  const isOverLimit = hasLimit && tasks.length > column.wipLimit!
  const limitProgress = hasLimit ? (tasks.length / column.wipLimit!) * 100 : 0

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    onCreateTask(column.id, newTaskTitle.trim())
    setNewTaskTitle('')
    setIsAddingTask(false)
  }

  return (
    <div
      className={cn(
        'flex w-80 flex-shrink-0 flex-col rounded-xl border border-border bg-muted/40 transition-shadow',
        isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* Column Header */}
      <div className="flex flex-col border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 flex-shrink-0 cursor-grab rounded-md active:cursor-grabbing"
              {...dragHandleProps}
              aria-label={column.name}
            >
              <GripVertical className="size-4 text-muted-foreground" />
            </Button>

            {column.color && (
              <span
                aria-hidden
                className="size-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: column.color }}
              />
            )}
            <h3 className="truncate text-sm font-semibold text-foreground">{column.name}</h3>
            <Badge
              variant="secondary"
              className={cn(
                'h-5 min-w-[20px] rounded-md px-1.5 text-[10px] font-bold',
                isOverLimit && 'bg-destructive/10 text-destructive'
              )}
            >
              {tasks.length}
              {hasLimit && <span className="text-muted-foreground">/{column.wipLimit}</span>}
            </Badge>
          </div>

          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 flex-shrink-0 rounded-md"
              onClick={() => setIsAddingTask(true)}
              aria-label={t('tasks.column.addTask')}
            >
              <Plus className="size-4" />
            </Button>
          )}
        </div>

        {/* WIP Limit Progress Bar */}
        {hasLimit && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition duration-500',
                  isOverLimit ? 'bg-destructive' : limitProgress > 75 ? 'bg-warning' : 'bg-foreground'
                )}
                style={{ width: `${Math.min(limitProgress, 100)}%` }}
              />
            </div>
            {isOverLimit && (
              <p className="mt-1 text-[10px] font-medium text-destructive">
                {t('tasks.column.wipExceeded')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tasks Container */}
      <ScrollArea className="min-h-0 flex-1">
        <div ref={setNodeRef} className="min-h-[200px] space-y-3 p-3">
          {tasks.length === 0 && !isAddingTask ? (
            <EmptyColumnState onAddClick={readOnly ? undefined : () => setIsAddingTask(true)} />
          ) : (
            <>
              {tasks.map(task => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                  onEdit={() => onEditTask?.(task.id)}
                  onDelete={() => onDeleteTask?.(task.id)}
                  onDuplicate={onDuplicateTask ? () => onDuplicateTask(task.id) : undefined}
                  onOpenInNewTab={() => onOpenTaskInNewTab?.(task.id)}
                />
              ))}

              {/* Quick Add Task Input */}
              {isAddingTask && (
                <div className="rounded-xl border-2 border-dashed border-border bg-card p-3 shadow-sm">
                  <textarea
                    autoFocus
                    placeholder={t('tasks.column.taskTitlePlaceholder')}
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
                    className="w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    rows={2}
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim() || isCreatingTask}
                    >
                      {isCreatingTask ? t('tasks.column.adding') : t('tasks.column.add')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingTask(false)
                        setNewTaskTitle('')
                      }}
                    >
                      {t('tasks.column.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Add Task Footer */}
      {!readOnly && tasks.length > 0 && !isAddingTask && (
        <div className="p-3 pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingTask(true)}
            className="h-9 w-full rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground"
          >
            <Plus className="mr-2 size-4" />
            {t('tasks.column.addTask')}
          </Button>
        </div>
      )}
    </div>
  )
}

function EmptyColumnState({ onAddClick }: { onAddClick?: () => void }) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ListChecks className="size-5" />
      </div>
      <p className="mb-1 text-sm font-medium text-foreground">{t('tasks.column.empty')}</p>
      <p className="mb-4 px-4 text-xs text-muted-foreground">{t('tasks.column.emptyHint')}</p>
      {onAddClick && (
        <Button variant="outline" size="sm" onClick={onAddClick}>
          <Plus className="mr-1.5 size-3.5" />
          {t('tasks.column.createTask')}
        </Button>
      )}
    </div>
  )
}
