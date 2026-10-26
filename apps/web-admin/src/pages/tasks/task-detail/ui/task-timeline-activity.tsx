/**
 * Временная шкала активности задачи
 * Премиум дизайн истории изменений
 */

import { useState } from 'react'
import { Card, Button, Badge } from '@shared/ui'
import {
  Clock,
  Edit3,
  CheckCircle2,
  MessageCircle,
  UserPlus,
  Flag,
  ArrowRight,
  ChevronDown,
  GitCommit,
} from 'lucide-react'
import { cn } from '@shared/lib'
import type { Task } from '@entities/task'

interface TaskTimelineActivityProps {
  task: Task
}

// Типы активности и их конфиги
const ACTIVITY_CONFIG = {
  created: {
    icon: CheckCircle2,
    color: 'bg-success',
    bgColor: 'bg-success-soft',
    textColor: 'text-success-soft-foreground',
    label: 'Создано',
  },
  updated: {
    icon: Edit3,
    color: 'bg-info',
    bgColor: 'bg-info-soft',
    textColor: 'text-info-soft-foreground',
    label: 'Обновлено',
  },
  commented: {
    icon: MessageCircle,
    color: 'bg-info',
    bgColor: 'bg-info-soft',
    textColor: 'text-info-soft-foreground',
    label: 'Комментарий',
  },
  status_changed: {
    icon: ArrowRight,
    color: 'bg-warning',
    bgColor: 'bg-warning-soft',
    textColor: 'text-warning-soft-foreground',
    label: 'Статус',
  },
  assigned: {
    icon: UserPlus,
    color: 'bg-info',
    bgColor: 'bg-info-soft',
    textColor: 'text-info-soft-foreground',
    label: 'Назначен',
  },
  priority_changed: {
    icon: Flag,
    color: 'bg-destructive',
    bgColor: 'bg-danger-soft',
    textColor: 'text-danger-soft-foreground',
    label: 'Приоритет',
  },
}

export function TaskTimelineActivity({ task }: TaskTimelineActivityProps) {
  const [showAll, setShowAll] = useState(false)

  // Mock activity data
  const activities = [
    {
      id: '1',
      type: 'created' as const,
      userName: 'Вы',
      action: 'создали эту задачу',
      timestamp: task.createdAt,
    },
    {
      id: '2',
      type: 'assigned' as const,
      userName: 'Система',
      action: 'назначила исполнителя Алексей Смирнов',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'updated' as const,
      userName: 'Алексей Смирнов',
      action: 'обновил описание задачи',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      type: 'commented' as const,
      userName: 'Мария Петрова',
      action: 'оставила комментарий',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      type: 'status_changed' as const,
      userName: 'Вы',
      action: 'изменили статус на "В работе"',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '6',
      type: 'priority_changed' as const,
      userName: 'Вы',
      action: 'изменили приоритет на "Высокий"',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ]

  const displayedActivities = showAll ? activities : activities.slice(0, 4)

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diff = now.getTime() - past.getTime()

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7))

    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} мин. назад`
    if (hours < 24) return `${hours} ч. назад`
    if (days < 7) return `${days} дн. назад`
    return `${weeks} нед. назад`
  }

  return (
    <Card className="overflow-hidden border border-border shadow-soft bg-card">
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <GitCommit className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            История активности
          </h2>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-8 w-0.5 bg-border" />

          {/* Activities */}
          <div className="space-y-6">
            {displayedActivities.map(activity => {
              const config = ACTIVITY_CONFIG[activity.type]
              const Icon = config.icon

              return (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm',
                      config.color
                    )}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>

                  {/* Content */}
                  <div className={cn('flex-1 rounded-xl p-4 transition-colors', config.bgColor)}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-sm">
                        <span className={cn('font-semibold', config.textColor)}>
                          {activity.userName}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          {activity.action}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'h-5 text-[10px] font-semibold rounded-md',
                            config.bgColor,
                            config.textColor
                          )}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Show More Button */}
        {activities.length > 4 && (
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-6 h-11 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl"
          >
            {showAll ? (
              <>
                Свернуть
                <ChevronDown className="h-4 w-4 ml-2 rotate-180" />
              </>
            ) : (
              <>
                Показать ещё {activities.length - 4}
                <ChevronDown className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}
