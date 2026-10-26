// ================================
// Organizations Types
// ================================

export type Organization = {
  id: string
  name: string
  slug: string
  description?: string
  logo?: string
  logoUrl?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  inn?: string
  organizationName?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Статус сотрудника организации (uppercase из API)
 */
export const MemberStatus = {
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  SUSPENDED: 'SUSPENDED',
} as const

export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus]

export const MEMBER_STATUS_LABEL_KEYS: Record<MemberStatus, string> = {
  [MemberStatus.ACTIVE]: 'users.status.active',
  [MemberStatus.INVITED]: 'users.status.invited',
  [MemberStatus.SUSPENDED]: 'users.status.suspended',
}

/**
 * Роль организации
 */
export type OrganizationRole = {
  id: string
  organizationId: string
  name: string
  description?: string
  /** Может быть массивом строк (id) или объектов RolePermission */
  permissions?: string[] | RolePermission[]
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Сотрудник организации (из API organization-members)
 */
export type OrganizationMember = {
  id: string
  organizationId: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  position?: string | null
  department?: string | null
  avatarUrl?: string | null
  roleId: string
  role: OrganizationRole
  status: MemberStatus
  /** Индивидуальные права — массив объектов MemberPermission */
  permissions?: MemberPermission[]
  invitationSent?: boolean
  invitationToken?: string | null
  tokenExpiresAt?: string | null
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type Permission = {
  id: string
  code: string
  name: string
  description?: string
  category: string
  createdAt: string
}

/**
 * Связь member-permission из API
 */
export type MemberPermission = {
  memberId: string
  permissionId: string
  permission: Permission
}

/**
 * Связь role-permission из API
 */
export type RolePermission = {
  roleId: string
  permissionId: string
  permission: Permission
}

// ================================
// Request/Response Types
// ================================

// Organizations
export type CreateOrganizationRequest = {
  name: string
  slug?: string
  description?: string
  logo?: File
  website?: string
  email?: string
  phone?: string
  address?: string
}

export type UpdateOrganizationRequest = Partial<CreateOrganizationRequest> & {
  organizationName?: string
  inn?: string
  description?: string
  phone?: string
  address?: string
  website?: string
  logoUrl?: string
}

export type GetOrganizationsParams = {
  page?: number
  limit?: number
  search?: string
}

export type GetOrganizationsResponse = {
  organizations: Organization[]
  total: number
  page: number
  limit: number
}

// ================================
// Organization Members (API: /api/v1/organizations/members)
// ================================

/**
 * Запрос на создание сотрудника
 * POST /api/v1/organizations/members
 */
export type CreateMemberRequest = {
  email: string
  password?: string
  firstName: string
  lastName: string
  phone?: string
  position?: string
  department?: string
  roleId: string
  sendInvitation?: boolean
}

/**
 * Запрос на обновление сотрудника
 * PATCH /api/v1/organizations/members/{memberId}
 */
export type UpdateMemberRequest = {
  firstName?: string
  lastName?: string
  phone?: string
  position?: string
  department?: string
  roleId?: string
  status?: MemberStatus
}

/**
 * Запрос на обновление прав сотрудника
 * PATCH /api/v1/organizations/members/{memberId}/permissions
 */
export type UpdateMemberPermissionsRequest = {
  permissionIds: string[]
}

/**
 * Параметры для получения списка сотрудников
 * GET /api/v1/organizations/members
 */
export type GetMembersParams = {
  page?: number
  limit?: number
  search?: string
  status?: MemberStatus
  roleId?: string
}

/**
 * Ответ со списком сотрудников (API возвращает массив напрямую)
 */
export type GetMembersResponse = OrganizationMember[]

/**
 * Ответ с одним сотрудником (API возвращает объект напрямую)
 */
export type MemberResponse = OrganizationMember

// ================================
// Organization Roles (API: /api/v1/organizations/roles)
// ================================

export type CreateRoleRequest = {
  name: string
  description?: string
  permissions: string[]
}

export type UpdateRoleRequest = Partial<CreateRoleRequest>

// API возвращает массив напрямую
export type GetRolesResponse = OrganizationRole[]

// ================================
// Permissions (API: /api/v1/permissions)
// ================================

/** API возвращает массив напрямую */
export type GetPermissionsResponse = Permission[]

// ================================
// Dashboard организатора (API: GET /organizations/dashboard/stats)
// ================================

/** Элемент с изменением за период (активные события, открытые билеты и т.д.) */
export type DashboardStatChangeItem = {
  value: number
  changePercent: number
  changeAbsolute: number
  period: string
}

export type DashboardEventsStats = {
  active: DashboardStatChangeItem
  total: number
  drafts: number
  completed: number
}

export type DashboardTicketsStats = {
  open: DashboardStatChangeItem
  total: number
  completed: number
}

export type DashboardParticipantsStats = {
  newCount: number
  momChangePercent: number
  total: number
}

export type DashboardConversionStats = {
  registrationRate: number
  attendanceRate: number
  totalRegistrations: number
  approvedRegistrations: number
}

export type DashboardStats = {
  events: DashboardEventsStats
  tickets: DashboardTicketsStats
  participants: DashboardParticipantsStats
  conversion: DashboardConversionStats
}

export type DashboardActivityItem = {
  id: string
  type: string
  description: string
  entityName: string
  entityId: string
  createdAt: string
  timeAgo: string
}

export type GetDashboardActivityParams = {
  limit?: number
}

export type GetDashboardActivityResponse = {
  items: DashboardActivityItem[]
  totalCount: number
  periodStart: string
  periodEnd: string
}

// ================================
// Подписчики (API: /organizations/followers)
// ================================

export type Follower = {
  id: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  followedAt: string
}

export type GetFollowersParams = {
  page?: number
  limit?: number
  search?: string
}

export type GetFollowersResponse = {
  data: Follower[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type FollowersStats = {
  total: number
}

// ================================
// Заявки на связь (API: /organizations/contacts)
// ================================

export type ContactRequestStatus = 'NEW' | 'IN_PROGRESS' | 'CLOSED'

export type ContactRequestUser = {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

export type ContactRequest = {
  id: string
  user: ContactRequestUser
  phone: string
  message: string | null
  status: ContactRequestStatus
  createdAt: string
  updatedAt: string
}

export type GetContactsParams = {
  page?: number
  limit?: number
  status?: ContactRequestStatus
  search?: string
}

export type GetContactsResponse = {
  data: ContactRequest[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type ContactsStats = {
  total: number
  byStatus?: Record<ContactRequestStatus, number>
}

export type UpdateContactStatusRequest = {
  status: ContactRequestStatus
}
