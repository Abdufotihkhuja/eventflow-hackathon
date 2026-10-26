// ================================
// Board Types
// ================================

export const BoardVisibility = {
  PRIVATE: 'private',
  TEAM: 'team',
  PUBLIC: 'public',
} as const

export type BoardVisibility = (typeof BoardVisibility)[keyof typeof BoardVisibility]

/** Настройки отображения доски */
export type BoardSettings = {
  theme?: 'light' | 'dark'
  cardSize?: 'small' | 'medium' | 'large'
  showLabels?: boolean
  showMembers?: boolean
}

/** Сущность доски */
export type Board = {
  id: string
  name: string
  description?: string | null
  coverImage?: string | null
  backgroundColor?: string | null
  organizationId: string
  eventId?: string | null
  settings?: BoardSettings | null
  isArchived: boolean
  isFavorite?: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  // Статистика
  columnsCount?: number
  tasksCount?: number
  membersCount?: number
  completedTasksCount?: number
  inProgressTasksCount?: number
}

/** Колонка доски */
export type BoardColumn = {
  id: string
  boardId: string
  name: string
  color?: string | null
  position: number
  wipLimit?: number | null
  isDefault?: boolean
  tasksCount?: number
  createdAt: string
  updatedAt: string
  // Задачи в колонке (при детальном запросе)
  tasks?: BoardTask[]
}

/** Краткая информация о задаче для списка в колонке */
export type BoardTask = {
  id: string
  title: string
  description?: string | null
  type?: TaskType
  priority: TaskPriority
  position: number
  dueDate?: string | null
  startDate?: string | null
  estimatedHours?: number | null
  coverColor?: string | null
  commentsCount: number
  attachmentsCount: number
  checklistProgress?: {
    total: number
    completed: number
  } | null
  assignees?: TaskAssignee[]
  tags?: TaskTag[]
  createdAt: string
  updatedAt: string
}

/** Тип задачи */
export const TaskType = {
  TASK: 'task',
  BUG: 'bug',
  FEATURE: 'feature',
  STORY: 'story',
} as const

export type TaskType = (typeof TaskType)[keyof typeof TaskType]

/** Приоритет задачи */
export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority]

/** Исполнитель задачи */
export type TaskAssignee = {
  id: string
  firstName: string
  lastName: string
  avatar?: string | null
  email?: string
}

/** Тег задачи */
export type TaskTag = {
  id: string
  boardId: string
  name: string
  color: string
  createdAt: string
}

/** Участник доски */
export type BoardMember = {
  id: string
  boardId: string
  memberId: string
  role: BoardMemberRole
  member: {
    id: string
    email: string
    firstName: string
    lastName: string
    avatar?: string | null
  }
  joinedAt: string
}

export const BoardMemberRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const

export type BoardMemberRole = (typeof BoardMemberRole)[keyof typeof BoardMemberRole]

// ================================
// Request/Response Types
// ================================

// Boards
export type CreateBoardRequest = {
  name: string
  description?: string
  coverImage?: string
  backgroundColor?: string
  eventId?: string
  settings?: BoardSettings
}

export type UpdateBoardRequest = Partial<CreateBoardRequest>

export type GetBoardsParams = {
  page?: number
  limit?: number
  search?: string
  isArchived?: boolean
  isFavorite?: boolean
  eventId?: string
}

/** Доска в списке (с колонками и _count) */
export type BoardListItem = Board & {
  columns?: BoardColumn[]
  _count?: {
    tasks: number
    members: number
  }
}

/**
 * Ответ GET /boards - apiClient автоматически разворачивает data,
 * поэтому получаем просто массив
 */
export type GetBoardsResponse = BoardListItem[]

export type BoardDetailResponse = Board & {
  columns: BoardColumn[]
  members: BoardMember[]
}

/** Статистика доски */
export type BoardStatsResponse = {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasksCount: number
  tasksByPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  tasksByColumn: {
    columnId: string
    columnName: string
    count: number
  }[]
  tasksByAssignee: {
    memberId: string
    memberName: string
    count: number
  }[]
}

// Columns
export type CreateColumnRequest = {
  name: string
  color?: string
  wipLimit?: number
  isDefault?: boolean
}

export type UpdateColumnRequest = Partial<CreateColumnRequest>

export type ReorderColumnsRequest = {
  columnIds: string[]
}

// Board Members
export type AddBoardMemberRequest = {
  memberId: string
  role?: BoardMemberRole
}

export type UpdateBoardMemberRoleRequest = {
  role: BoardMemberRole
}

/** apiClient автоматически разворачивает data */
export type GetBoardMembersResponse = BoardMember[]
