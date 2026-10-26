/**
 * Task card for the Kanban board.
 */

import { useMemo, useState } from 'react'
import {
  Card,
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui'
import { cn } from '@shared/lib'
import {
  Clock,
  MessageSquare,
  Paperclip,
  CheckSquare,
  AlertCircle,
  Calendar,
  GripVertical,
  MoreHorizontal,
  ArrowUpRight,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'
import type { BoardTask } from '@api/services'

interface TaskCardProps {
  task: BoardTask
  onClick?: () => void
  isDragging?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onOpenInNewTab?: () => void
}

// Priority → dot colour. API uses UPPERCASE (LOW, MEDIUM, HIGH, CRITICAL);
// lowercase aliases cover legacy values.
const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-destructive',
  HIGH: 'bg-warning',
  MEDIUM: 'bg-foreground/50',
  LOW: 'bg-border',
  critical: 'bg-destructive',
  urgent: 'bg-destructive',
  high: 'bg-warning',
  medium: 'bg-foreground/50',
  low: 'bg-border',
}

function getTaskPriorityKey(priority: string) {
  const normalizedPriority = priority.toLowerCase()
  if (normalizedPriority === 'critical') return 'highest'
  return normalizedPriority
}

export function TaskCard({
  task,
  onClick,
  isDragging = false,
  onEdit,
  onDelete,
  onDuplicate,
  onOpenInNewTab,
}: TaskCardProps) {
  const t = useT()
  const [isHovered, setIsHovered] = useState(false)

  const checklistProgress = task.checklistProgress

  const deadlineStatus = useMemo(() => {
    if (!task.dueDate) return null

    const now = new Date()
    const dueDate = new Date(task.dueDate)
    const diffInDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays < 0)
      return {
        type: 'overdue',
        label: t('tasks.deadline.overdue'),
        color: 'text-destructive bg-destructive/10',
      }
    if (diffInDays === 0)
      return {
        type: 'today',
        label: t('tasks.deadline.today'),
        color: 'text-warning bg-warning/10',
      }
    if (diffInDays === 1)
      return {
        type: 'tomorrow',
        label: t('tasks.deadline.tomorrow'),
        color: 'text-warning bg-warning/10',
      }
    if (diffInDays <= 3)
      return {
        type: 'soon',
        label: t('tasks.deadline.days', { count: diffInDays }),
        color: 'text-foreground bg-muted',
      }

    return {
      type: 'normal',
      label: dueDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      color: 'text-muted-foreground bg-muted',
    }
  }, [task.dueDate, t])

  const priorityDot =
    PRIORITY_DOT[task.priority] ||
    PRIORITY_DOT[String(task.priority).toUpperCase()] ||
    PRIORITY_DOT.MEDIUM
  const checklistComplete =
    !!checklistProgress && checklistProgress.completed === checklistProgress.total

  return (
    <TooltipProvider delayDuration={300}>
      <Card
        className={cn(
          'group relative cursor-pointer overflow-hidden border border-border bg-card transition-shadow duration-200',
          'hover:shadow-soft-lg hover:border-strong',
          isDragging && 'rotate-2 scale-105 opacity-90 shadow-soft-lg'
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-3.5">
          {/* Drag Handle */}
          <div
            className={cn(
              'absolute left-1 top-1/2 -translate-y-1/2 transition-opacity',
              isHovered && !isDragging ? 'opacity-100' : 'opacity-0'
            )}
          >
            <div className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md border border-border bg-card shadow-sm active:cursor-grabbing">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>

          {/* Quick Actions */}
          <div
            className={cn(
              'absolute right-2 top-2 flex items-center gap-0.5 transition-opacity',
              isHovered && !isDragging ? 'opacity-100' : 'opacity-0'
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md border border-border bg-card shadow-sm"
                  aria-label={t('actions.title')}
                  onClick={e => {
                    e.stopPropagation()
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('actions.edit')}
                </DropdownMenuItem>
                {onDuplicate && (
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    {t('actions.duplicate')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('actions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md border border-border bg-card shadow-sm"
                  aria-label={t('tasks.actions.openInNewTab')}
                  onClick={e => {
                    e.stopPropagation()
                    onOpenInNewTab?.()
                  }}
                >
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('tasks.actions.openInNewTab')}</TooltipContent>
            </Tooltip>
          </div>

          {/* Header - Type & Priority */}
          <div className="mb-2.5 flex items-center gap-2">
            {task.type && (
              <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                {t(`tasks.type.${task.type}`)}
              </Badge>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  <span className={cn('size-2 rounded-full', priorityDot)} aria-hidden />
                  {t(`tasks.priorityShort.${getTaskPriorityKey(task.priority)}`)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {t('tasks.fields.priority')}:{' '}
                {t(`tasks.priority.${getTaskPriorityKey(task.priority)}`)}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Title */}
          <h4 className="mb-2.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {task.title}
          </h4>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white shadow-sm"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Checklist Progress */}
          {checklistProgress && checklistProgress.total > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckSquare className="h-3 w-3" />
                  <span className="font-medium">
                    {checklistProgress.completed}/{checklistProgress.total}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    checklistComplete ? 'text-success' : 'text-muted-foreground'
                  )}
                >
                  {Math.round((checklistProgress.completed / checklistProgress.total) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition duration-500',
                    checklistComplete ? 'bg-success' : 'bg-foreground'
                  )}
                  style={{
                    width: `${(checklistProgress.completed / checklistProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            {/* Meta Info */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {/* Deadline */}
              {deadlineStatus && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center gap-1 rounded px-1.5 py-0.5 font-medium',
                        deadlineStatus.color
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      <span>{deadlineStatus.label}</span>
                      {deadlineStatus.type === 'overdue' && <AlertCircle className="h-3 w-3" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('tasks.deadline.due')}:{' '}
                    {new Date(task.dueDate!).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Comments */}
              {task.commentsCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{task.commentsCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('tasks.metrics.comments', { count: task.commentsCount })}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Attachments */}
              {task.attachmentsCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      <span>{task.attachmentsCount}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('tasks.metrics.attachments', { count: task.attachmentsCount })}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Time estimate */}
              {task.estimatedHours && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono">{task.estimatedHours}h</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('tasks.metrics.estimate', { hours: task.estimatedHours })}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Assignees */}
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex -space-x-1.5">
                {task.assignees.slice(0, 3).map(assignee => {
                  const fullName = `${assignee.firstName} ${assignee.lastName}`
                  return (
                    <Tooltip key={assignee.id}>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0">
                          {assignee.avatar ? (
                            <img
                              src={assignee.avatar}
                              alt={fullName}
                              className="h-6 w-6 rounded-full border-2 border-card shadow-sm ring-1 ring-border"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-brand-soft text-brand-soft-foreground text-[10px] font-bold shadow-sm ring-1 ring-border">
                              {assignee.firstName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{fullName}</TooltipContent>
                    </Tooltip>
                  )
                })}
                {task.assignees.length > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  )
}
