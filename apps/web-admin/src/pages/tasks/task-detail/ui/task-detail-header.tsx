/**
 * Заголовок страницы задачи с основной информацией
 * Премиум дизайн с градиентами и эффектами
 */

import { useState } from 'react'
import { useT } from '@eventflow/i18n/react'
import { Badge, Button, Card } from '@shared/ui'
import {
  Edit3,
  Copy,
  Share2,
  MoreVertical,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Bookmark,
} from 'lucide-react'
import { cn } from '@shared/lib'
import { TASK_TYPE_LABEL_KEYS, TASK_PRIORITY_LABEL_KEYS, TASK_STATUS_LABEL_KEYS } from '@entities/task'
import type { Task, Board } from '@entities/task'

interface TaskDetailHeaderProps {
  task: Task
  board: Board | null
}

// Конфиг приоритетов
const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  highest: {
    color: 'text-danger-soft-foreground',
    bg: 'bg-danger-soft',
    border: 'border-border',
  },
  high: {
    color: 'text-warning-soft-foreground',
    bg: 'bg-warning-soft',
    border: 'border-border',
  },
  medium: {
    color: 'text-warning-soft-foreground',
    bg: 'bg-warning-soft',
    border: 'border-border',
  },
  low: {
    color: 'text-info-soft-foreground',
    bg: 'bg-info-soft',
    border: 'border-border',
  },
  lowest: {
    color: 'text-neutral-soft-foreground',
    bg: 'bg-neutral-soft',
    border: 'border-border',
  },
}

// Конфиг статусов
const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; bg: string }> = {
  backlog: { icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted' },
  todo: { icon: Circle, color: 'text-info', bg: 'bg-info-soft' },
  in_progress: { icon: Clock, color: 'text-warning', bg: 'bg-warning-soft' },
  in_review: {
    icon: AlertCircle,
    color: 'text-info',
    bg: 'bg-info-soft',
  },
  done: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success-soft',
  },
}

export function TaskDetailHeader({ task, board }: TaskDetailHeaderProps) {
  const t = useT()
  const [isSaved, setIsSaved] = useState(false)

  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
  const StatusIcon = statusConfig.icon

  return (
    <Card className="overflow-hidden border border-border shadow-soft bg-card">
      {/* Color Bar */}
      <div className="h-1" style={{ backgroundColor: board?.color || '#3b82f6' }} />

      {/* Content */}
      <div className="p-6 lg:p-8">
        {/* Meta Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {/* Type */}
          <Badge
            variant="secondary"
            className="h-7 px-2.5 text-xs font-medium rounded-lg bg-muted"
          >
            {t(TASK_TYPE_LABEL_KEYS[task.type])}
          </Badge>

          {/* Status */}
          <Badge
            variant="secondary"
            className={cn('h-7 gap-1.5 px-2.5 text-xs font-medium rounded-lg', statusConfig.bg)}
          >
            <StatusIcon className={cn('h-3.5 w-3.5', statusConfig.color)} />
            <span className={statusConfig.color}>{t(TASK_STATUS_LABEL_KEYS[task.status])}</span>
          </Badge>

          {/* Priority */}
          <Badge
            variant="outline"
            className={cn(
              'h-7 gap-1.5 px-2.5 text-xs font-medium rounded-lg',
              priorityConfig.bg,
              priorityConfig.border
            )}
          >
            <div
              className={cn('h-2 w-2 rounded-full', {
                'bg-destructive': task.priority === 'highest',
                'bg-warning': task.priority === 'high' || task.priority === 'medium',
                'bg-info': task.priority === 'low',
                'bg-muted-foreground': task.priority === 'lowest',
              })}
            />
            <span className={priorityConfig.color}>{t(TASK_PRIORITY_LABEL_KEYS[task.priority])}</span>
          </Badge>

          {/* Board */}
          {board && (
            <Badge
              variant="outline"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium rounded-lg border-border"
            >
              <div
                className="h-2.5 w-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: board.color }}
              />
              <span className="text-muted-foreground">{board.title}</span>
            </Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-6 leading-tight">
          {task.title}
        </h1>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
          <Button className="gap-2 h-10 rounded-lg shadow-sm">
            <Edit3 className="h-4 w-4" />
            {t('actions.edit')}
          </Button>
          <Button variant="outline" className="gap-2 h-10 rounded-lg">
            <Copy className="h-4 w-4" />
            {t('tasks.actions.copy')}
          </Button>
          <Button variant="outline" className="gap-2 h-10 rounded-lg">
            <Share2 className="h-4 w-4" />
            {t('tasks.actions.share')}
          </Button>
          <Button
            variant="outline"
            className={cn(
              'gap-2 h-10 rounded-lg',
              isSaved && 'text-warning-soft-foreground border-border bg-warning-soft'
            )}
            onClick={() => setIsSaved(!isSaved)}
          >
            <Bookmark className={cn('h-4 w-4', isSaved && 'fill-current')} />
            {isSaved ? t('tasks.actions.saved') : t('actions.save')}
          </Button>
          <Button variant="ghost" size="icon" aria-label={t('admin.tables.columns.actions')} className="h-10 w-10 rounded-lg ml-auto">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
