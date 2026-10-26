/**
 * Боковая панель с деталями задачи
 * Премиум UI с интерактивными элементами
 */

import { Card, Badge, Button, Avatar, AvatarFallback, AvatarImage, Separator } from '@shared/ui'
import {
  User,
  Calendar,
  Clock,
  FileText,
  Tag,
  Link as LinkIcon,
  ChevronDown,
  Plus,
  AlertCircle,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { cn } from '@shared/lib'
import type { Task, Board } from '@entities/task'
import { TaskActions } from './task-actions'
import { useLocale, useT } from '@eventflow/i18n/react'

interface TaskDetailSidebarProps {
  task: Task
  board: Board | null
}

export function TaskDetailSidebar({ task, board }: TaskDetailSidebarProps) {
  const t = useT()
  const locale = useLocale()
  // Расчет прогресса времени
  const timeProgress =
    task.timeTracking?.estimated && task.timeTracking?.spent
      ? Math.min((task.timeTracking.spent / task.timeTracking.estimated) * 100, 100)
      : 0

  // Проверка дедлайна
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
  const daysUntilDue = task.dueDate
    ? Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-5 lg:sticky lg:top-24">
      {/* Quick Actions */}
      <Card className="overflow-hidden border border-border shadow-soft bg-card">
        <div className="p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />{t('tasks.batch1.taskDetailSidebar.s001')}</h3>
          <TaskActions task={task} />
        </div>
      </Card>

      {/* Assignee */}
      <Card className="overflow-hidden border border-border shadow-soft bg-card">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{t('tasks.batch1.taskDetailSidebar.s002')}</h3>
            </div>
            <Button variant="ghost" size="icon" aria-label="Свернуть" className="h-9 w-9">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {task.assigneeName ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <Avatar className="h-11 w-11 border-2 border-border shadow-sm">
                <AvatarImage src={task.assigneeAvatar} />
                <AvatarFallback className="bg-brand-soft text-brand-soft-foreground font-bold">
                  {task.assigneeName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {task.assigneeName}
                </p>
                <p className="text-xs text-muted-foreground">{t('tasks.batch1.taskDetailSidebar.s003')}</p>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full h-12 border-dashed text-muted-foreground">
              <Plus className="h-4 w-4 mr-2" />{t('tasks.batch1.taskDetailSidebar.s004')}</Button>
          )}
        </div>
      </Card>

      {/* Due Date */}
      <Card
        className={cn(
          'overflow-hidden border border-border shadow-soft',
          isOverdue ? 'bg-danger-soft' : 'bg-card'
        )}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className={cn('h-4 w-4', isOverdue ? 'text-destructive' : 'text-muted-foreground')} />
              <h3
                className={cn(
                  'font-semibold',
                  isOverdue
                    ? 'text-destructive'
                    : 'text-foreground'
                )}
              >{t('tasks.batch1.taskDetailSidebar.s005')}</h3>
              {isOverdue && (
                <Badge variant="destructive" className="h-5 text-[10px]">{t('tasks.batch1.taskDetailSidebar.s006')}</Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" aria-label="Свернуть" className="h-9 w-9">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {task.dueDate ? (
            <div
              className={cn(
                'p-4 rounded-xl border',
                isOverdue
                  ? 'bg-danger-soft border-border'
                  : 'bg-info-soft border-border'
              )}
            >
              <p
                className={cn(
                  'text-lg font-semibold',
                  isOverdue ? 'text-destructive' : 'text-info-soft-foreground'
                )}
              >
                {new Date(task.dueDate).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p
                className={cn(
                  'text-sm mt-1 capitalize',
                  isOverdue ? 'text-destructive' : 'text-info-soft-foreground'
                )}
              >
                {new Date(task.dueDate).toLocaleDateString(locale, {
                  weekday: 'long',
                })}
              </p>
              {daysUntilDue !== null && (
                <p
                  className={cn(
                    'text-xs mt-2 flex items-center gap-1',
                    isOverdue ? 'text-destructive' : 'text-info-soft-foreground'
                  )}
                >
                  {isOverdue ? (
                    <>
                      <AlertCircle className="h-3 w-3" />{t('tasks.batch1.taskDetailSidebar.s007')}{Math.abs(daysUntilDue)}{t('tasks.batch1.taskDetailSidebar.s008')}</>
                  ) : daysUntilDue === 0 ? (
                    t('tasks.batch1.taskDetailSidebar.s009')
                  ) : daysUntilDue === 1 ? (
                    t('tasks.batch1.taskDetailSidebar.s010')
                  ) : (
                    t('tasks.batch1.taskDetailSidebar.daysLeft', { count: daysUntilDue })
                  )}
                </p>
              )}
            </div>
          ) : (
            <Button variant="outline" className="w-full h-12 border-dashed text-muted-foreground">
              <Plus className="h-4 w-4 mr-2" />{t('tasks.batch1.taskDetailSidebar.s011')}</Button>
          )}
        </div>
      </Card>

      {/* Time Tracking */}
      {task.timeTracking && (task.timeTracking.estimated || task.timeTracking.spent) && (
        <Card className="overflow-hidden border border-border shadow-soft bg-card">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{t('tasks.batch1.taskDetailSidebar.s012')}</h3>
            </div>

            <div className="space-y-3">
              {task.timeTracking.estimated && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                  <span className="text-sm text-muted-foreground">{t('tasks.batch1.taskDetailSidebar.s013')}</span>
                  <span className="font-semibold text-foreground">
                    {task.timeTracking.estimated}{t('tasks.batch1.taskDetailSidebar.s014')}</span>
                </div>
              )}

              {task.timeTracking.spent !== undefined && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                  <span className="text-sm text-muted-foreground">{t('tasks.batch1.taskDetailSidebar.s015')}</span>
                  <span className="font-semibold text-foreground">
                    {task.timeTracking.spent}{t('tasks.batch1.taskDetailSidebar.s014')}</span>
                </div>
              )}

              {task.timeTracking.remaining !== undefined && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-success-soft">
                  <span className="text-sm font-medium text-success-soft-foreground">{t('tasks.batch1.taskDetailSidebar.s016')}</span>
                  <span className="font-bold text-success-soft-foreground">
                    {task.timeTracking.remaining}{t('tasks.batch1.taskDetailSidebar.s014')}</span>
                </div>
              )}

              {/* Progress Bar */}
              {task.timeTracking.estimated && task.timeTracking.spent !== undefined && (
                <div className="mt-4 p-3 rounded-xl bg-muted">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{t('tasks.batch1.taskDetailSidebar.s017')}</span>
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        timeProgress >= 100 ? 'text-destructive' : 'text-success'
                      )}
                    >
                      {timeProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition duration-500',
                        timeProgress >= 100
                          ? 'bg-destructive'
                          : timeProgress >= 75
                            ? 'bg-warning'
                            : 'bg-success'
                      )}
                      style={{ width: `${Math.min(timeProgress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full mt-2">
                <TrendingUp className="h-4 w-4 mr-2" />{t('tasks.batch1.taskDetailSidebar.s018')}</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Attachments */}
      <Card className="overflow-hidden border border-border shadow-soft bg-card">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{t('tasks.batch1.taskDetailSidebar.s019')}</h3>
              {task.attachmentsCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {task.attachmentsCount}
                </Badge>
              )}
            </div>
          </div>

          {task.attachmentsCount > 0 ? (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-muted flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info-soft flex items-center justify-center">
                  <FileText className="h-5 w-5 text-info-soft-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.attachmentsCount}{t('tasks.batch1.taskDetailSidebar.s020')}</p>
                  <p className="text-xs text-muted-foreground">{t('tasks.batch1.taskDetailSidebar.s021')}</p>
                </div>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full h-12 border-dashed text-muted-foreground">
              <Plus className="h-4 w-4 mr-2" />{t('tasks.batch1.taskDetailSidebar.s022')}</Button>
          )}
        </div>
      </Card>

      {/* Labels */}
      <Card className="overflow-hidden border border-border shadow-soft bg-card">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{t('tasks.batch1.taskDetailSidebar.s023')}</h3>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {task.labels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {task.labels.map(label => (
                <Badge
                  key={label.id}
                  className="h-7 px-3 text-xs font-medium text-white shadow-sm rounded-lg"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          ) : (
            <Button variant="outline" className="w-full h-10 border-dashed text-muted-foreground text-sm">
              <Plus className="h-4 w-4 mr-2" />{t('tasks.batch1.taskDetailSidebar.s024')}</Button>
          )}
        </div>
      </Card>

      {/* Links */}
      {task.links.length > 0 && (
        <Card className="overflow-hidden border border-border shadow-soft bg-card">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{t('tasks.batch1.taskDetailSidebar.s025')}</h3>
              </div>
              <Button variant="ghost" size="icon" aria-label={t('actions.add')} className="h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {task.links.map(link => (
                <div
                  key={link.id}
                  className="p-3 rounded-xl bg-muted hover:bg-accent transition-colors cursor-pointer"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {link.type === 'blocks' && t('tasks.batch1.taskDetailSidebar.s026')}
                    {link.type === 'is_blocked_by' && t('tasks.batch1.taskDetailSidebar.s027')}
                    {link.type === 'relates_to' && t('tasks.batch1.taskDetailSidebar.s028')}
                    {link.type === 'duplicates' && t('tasks.batch1.taskDetailSidebar.s029')}
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {link.targetTaskTitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Meta Information */}
      <Card className="overflow-hidden border border-border shadow-soft bg-muted">
        <div className="p-5">
          <h3 className="font-medium text-muted-foreground text-sm mb-3">{t('tasks.batch1.taskDetailSidebar.s030')}</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('tasks.batch1.taskDetailSidebar.s031')}</span>
              <span className="font-medium text-foreground">
                {new Date(task.createdAt).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('tasks.batch1.taskDetailSidebar.s032')}</span>
              <span className="font-medium text-foreground">
                {new Date(task.updatedAt).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            {board && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('tasks.batch1.taskDetailSidebar.s033')}</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: board.color }}
                    />
                    <span className="font-medium text-foreground">
                      {board.title}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
