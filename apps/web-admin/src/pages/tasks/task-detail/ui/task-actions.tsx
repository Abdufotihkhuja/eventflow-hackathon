/**
 * Компонент для управления действиями с задачей
 * Изменение статуса, приоритета и других свойств
 */

import { useState } from 'react'
import { useT } from '@eventflow/i18n/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@shared/ui'
import { CheckCircle, Circle, Clock, AlertCircle, Flag, Trash2, Copy, Archive } from 'lucide-react'
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUS_LABEL_KEYS,
  TASK_PRIORITY_LABEL_KEYS,
} from '@entities/task'
import type { Task } from '@entities/task'

interface TaskActionsProps {
  task: Task
  onStatusChange?: (status: string) => void
  onPriorityChange?: (priority: string) => void
}

export function TaskActions({ task, onStatusChange, onPriorityChange }: TaskActionsProps) {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)

  const statusIcons = {
    [TASK_STATUSES.BACKLOG]: Circle,
    [TASK_STATUSES.TODO]: Clock,
    [TASK_STATUSES.IN_PROGRESS]: Circle,
    [TASK_STATUSES.IN_REVIEW]: AlertCircle,
    [TASK_STATUSES.DONE]: CheckCircle,
  }

  const currentStatusIcon = statusIcons[task.status]
  const CurrentStatusIcon = currentStatusIcon

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="w-full px-4 py-2 rounded-lg bg-muted hover:bg-accent transition-colors text-left text-sm font-medium text-foreground">
          {t('admin.tables.columns.actions')}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Status Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CurrentStatusIcon className="mr-2 h-4 w-4" />
            <span>{t('tasks.fields.status')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {Object.entries(TASK_STATUSES).map(([, value]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => {
                  onStatusChange?.(value)
                  setIsOpen(false)
                }}
                className={task.status === value ? 'bg-accent' : ''}
              >
                <span>{t(TASK_STATUS_LABEL_KEYS[value])}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Priority Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Flag className="mr-2 h-4 w-4" />
            <span>{t('tasks.fields.priority')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {Object.entries(TASK_PRIORITIES).map(([, value]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => {
                  onPriorityChange?.(value)
                  setIsOpen(false)
                }}
                className={task.priority === value ? 'bg-accent' : ''}
              >
                <span>{t(TASK_PRIORITY_LABEL_KEYS[value])}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Other Actions */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('tasks.actions.otherActions')}
        </DropdownMenuLabel>

        <DropdownMenuItem>
          <Copy className="mr-2 h-4 w-4" />
          <span>{t('tasks.actions.duplicate')}</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Archive className="mr-2 h-4 w-4" />
          <span>{t('tasks.actions.archive')}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>{t('actions.delete')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
