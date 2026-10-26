/**
 * Типы для досок задач (расширение основных типов)
 */

/** Представление доски */
export type BoardView = 'kanban' | 'list' | 'timeline'

/** Настройки доски */
export interface BoardSettings {
  defaultView: BoardView
  allowComments: boolean
  allowAttachments: boolean
  autoAssignCreator: boolean
  requireDueDate: boolean
}

/** Статистика доски */
export interface BoardStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasksCount: number
  averageCompletionTime?: number // в днях
}
