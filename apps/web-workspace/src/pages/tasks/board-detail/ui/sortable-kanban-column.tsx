/**
 * Обёртка для KanbanColumn с поддержкой drag & drop
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import type { BoardColumn, BoardTask } from '@api/services'

interface SortableKanbanColumnProps {
  column: BoardColumn
  tasks: BoardTask[]
  taskIds: string[]
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
  /** C-10: Task Board вне тарифа — просмотр без мутационных аффордансов. */
  readOnly?: boolean
}

export function SortableKanbanColumn({
  column,
  tasks,
  taskIds,
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
  readOnly,
}: SortableKanbanColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      column,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <SortableContext items={taskIds}>
        <KanbanColumn
          column={column}
          tasks={tasks}
          onTaskClick={onTaskClick}
          onCreateTask={onCreateTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onDuplicateTask={onDuplicateTask}
          onOpenTaskInNewTab={onOpenTaskInNewTab}
          isCreatingTask={isCreatingTask}
          boardColor={boardColor}
          forceAddingTask={forceAddingTask}
          onAddingTaskChange={onAddingTaskChange}
          readOnly={readOnly}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </SortableContext>
    </div>
  )
}
