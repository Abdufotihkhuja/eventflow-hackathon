/**
 * Обёртка TaskCard с drag & drop функциональностью
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from '@features/tasks'
import type { BoardTask } from '@api/services'

interface SortableTaskCardProps {
  task: BoardTask
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onOpenInNewTab?: () => void
}

export function SortableTaskCard({
  task,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onOpenInNewTab,
}: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <TaskCard
        task={task}
        onClick={onClick}
        isDragging={isDragging}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onOpenInNewTab={onOpenInNewTab}
      />
    </div>
  )
}
