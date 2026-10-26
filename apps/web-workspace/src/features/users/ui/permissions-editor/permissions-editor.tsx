/**
 * Редактор индивидуальных прав сотрудника
 *
 * Группирует права по модулям и позволяет:
 * - Выбрать все права модуля (checkbox на группу)
 * - Выбрать отдельные CRUD операции (checkbox на каждое право)
 */

import { useMemo } from 'react'
import { ChevronDown, Info, Loader2, Shield, ShieldCheck } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { getOrganizationRoleLabel, type OrgPermission, type OrganizationRole } from '@api/services'

// Используем OrgPermission (из organization.types) для API прав
type Permission = OrgPermission
import { cn } from '@shared/lib/cn'
import {
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  EmptyState,
  ErrorState,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@shared/ui'

type PermissionsEditorProps = {
  /** Все доступные права */
  permissions: Permission[]
  /** Права роли (базовые) */
  rolePermissions: string[]
  /** Индивидуальные права сотрудника */
  memberPermissions: string[]
  /** Callback при изменении индивидуальных прав */
  onChange: (permissions: string[]) => void
  /** Загружается ли список прав */
  isLoading?: boolean
  /** Ошибка загрузки списка прав */
  isError?: boolean
  /** Текст ошибки загрузки списка прав */
  errorMessage?: string
  /** Повторить загрузку списка прав */
  onRetry?: () => void
  /** Сохраняются ли изменения */
  isSaving?: boolean
  /** Заблокирован ли редактор */
  disabled?: boolean
  /** Выбранная роль */
  role?: OrganizationRole
}

// Группы прав по модулям
type PermissionGroup = {
  name: string
  code: string
  description: string
  permissions: Permission[]
}

const ACTION_LABEL_KEYS: Record<string, string> = {
  create: 'users.permissionEditor.actions.create',
  read: 'users.permissionEditor.actions.read',
  update: 'users.permissionEditor.actions.update',
  delete: 'users.permissionEditor.actions.delete',
  manage: 'users.permissionEditor.actions.manage',
  view: 'users.permissionEditor.actions.view',
  edit: 'users.permissionEditor.actions.edit',
  publish: 'users.permissionEditor.actions.publish',
  approve: 'users.permissionEditor.actions.approve',
  reject: 'users.permissionEditor.actions.reject',
  send: 'users.permissionEditor.actions.send',
  export: 'users.permissionEditor.actions.export',
  import: 'users.permissionEditor.actions.import',
  checkin: 'users.permissionEditor.actions.checkin',
  generate: 'users.permissionEditor.actions.generate',
  archive: 'users.permissionEditor.actions.archive',
  assign: 'users.permissionEditor.actions.assign',
  move: 'users.permissionEditor.actions.move',
  invite: 'users.permissionEditor.actions.invite',
}

// Названия модулей
const MODULE_LABEL_KEY_PREFIX = 'users.permissionEditor.modules'
const MODULE_DESCRIPTION_KEY_PREFIX = 'users.permissionEditor.moduleDescriptions'

const MODULE_ORDER = [
  'dashboard',
  'events',
  'participants',
  'checkin',
  'board',
  'blog',
  'followers',
  'requests',
  'places',
  'users',
  'settings',
  'billing',
  'analytics',
] as const

type PermissionModuleCode = (typeof MODULE_ORDER)[number]

const CATEGORY_TO_MODULE: Record<string, PermissionModuleCode> = {
  dashboard: 'dashboard',
  events: 'events',
  speakers: 'events',
  agenda: 'events',
  questions: 'events',
  tickets: 'events',
  certificates: 'events',
  artifact_recipients: 'events',
  recipient_roles: 'events',
  mail: 'events',
  registrations: 'participants',
  attendance: 'checkin',
  boards: 'board',
  columns: 'board',
  tasks: 'board',
  comments: 'board',
  checklists: 'board',
  tags: 'board',
  attachments: 'board',
  blog: 'blog',
  followers: 'followers',
  contacts: 'requests',
  places: 'places',
  members: 'users',
  roles: 'users',
  settings: 'settings',
  organization: 'settings',
  uploads: 'settings',
  billing: 'billing',
  analytics: 'analytics',
}

const MODULE_INDEX = new Map<string, number>(MODULE_ORDER.map((code, index) => [code, index]))

// Названия ресурсов (префикс кода права до «:») берутся из i18n —
// users.permissionEditor.resources.{resource}. Под-заголовок ресурса даёт
// контекст, чтобы короткие действия («Создание», «Просмотр») были однозначны.
const RESOURCE_LABEL_KEY_PREFIX = 'users.permissionEditor.resources'

function getResourceCode(permission: Permission): string {
  return permission.code.split(':')[0] || 'other'
}

type ResourceSubgroup = { resource: string; permissions: Permission[] }

// Разбивает права модуля на под-группы по ресурсу, сохраняя исходный порядок
// (права уже отсортированы по code, поэтому действия идут в CRUD-порядке).
function groupByResource(permissions: Permission[]): ResourceSubgroup[] {
  const map = new Map<string, Permission[]>()
  for (const permission of permissions) {
    const resource = getResourceCode(permission)
    if (!map.has(resource)) map.set(resource, [])
    map.get(resource)!.push(permission)
  }
  return Array.from(map.entries()).map(([resource, perms]) => ({
    resource,
    permissions: perms,
  }))
}

function resolvePermissionModule(permission: Permission): PermissionModuleCode {
  return CATEGORY_TO_MODULE[permission.category || ''] ?? 'settings'
}

// Sort by code so a module's permissions cluster by resource (events:*, then
// speakers:*, …) in a predictable CRUD order, instead of mixing resources.
function getPermissionSortName(permission: Permission): string {
  return permission.code
}

export function PermissionsEditor({
  permissions,
  rolePermissions,
  memberPermissions,
  onChange,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isSaving,
  disabled,
  role,
}: PermissionsEditorProps) {
  const t = useT()
  const getRoleLabel = getOrganizationRoleLabel(t)

  // Группируем backend-категории в понятные продуктовые модули.
  const groups = useMemo<PermissionGroup[]>(() => {
    const groupMap = new Map<string, Permission[]>()

    permissions.forEach(p => {
      const moduleCode = resolvePermissionModule(p)
      if (!groupMap.has(moduleCode)) {
        groupMap.set(moduleCode, [])
      }
      groupMap.get(moduleCode)!.push(p)
    })

    return Array.from(groupMap.entries())
      .map(([code, perms]) => ({
        code,
        name: t(`${MODULE_LABEL_KEY_PREFIX}.${code}`),
        description: t(`${MODULE_DESCRIPTION_KEY_PREFIX}.${code}`),
        permissions: perms.sort((a, b) =>
          getPermissionSortName(a).localeCompare(getPermissionSortName(b))
        ),
      }))
      .sort(
        (a, b) =>
          (MODULE_INDEX.get(a.code) ?? Number.MAX_SAFE_INTEGER) -
          (MODULE_INDEX.get(b.code) ?? Number.MAX_SAFE_INTEGER)
      )
  }, [permissions, t])

  // Все активные права (роль + индивидуальные) — используем id
  const activePermissions = useMemo(() => {
    const set = new Set([...rolePermissions, ...memberPermissions])
    return set
  }, [rolePermissions, memberPermissions])

  // Проверка, является ли право базовым (от роли)
  const isRolePermission = (id: string) => rolePermissions.includes(id)

  // Проверка, является ли право индивидуальным
  const isMemberPermission = (id: string) => memberPermissions.includes(id)

  // Проверка, активно ли право
  const isPermissionActive = (id: string) => activePermissions.has(id)

  // Проверка, выбраны ли все права группы
  const isGroupFullySelected = (group: PermissionGroup) =>
    group.permissions.every(p => isPermissionActive(p.id))

  // Проверка, выбраны ли некоторые права группы
  const isGroupPartiallySelected = (group: PermissionGroup) =>
    group.permissions.some(p => isPermissionActive(p.id)) && !isGroupFullySelected(group)

  // Переключение отдельного права
  const togglePermission = (id: string) => {
    if (disabled || isSaving) return
    // Нельзя отключить право роли
    if (isRolePermission(id)) return

    if (isMemberPermission(id)) {
      // Удаляем индивидуальное право
      onChange(memberPermissions.filter(p => p !== id))
    } else {
      // Добавляем индивидуальное право
      onChange([...memberPermissions, id])
    }
  }

  // Переключение всей группы
  const toggleGroup = (group: PermissionGroup) => {
    if (disabled || isSaving) return

    const groupIds = group.permissions.map(p => p.id)
    // Права, которые можно изменять (не от роли)
    const changeable = groupIds.filter(id => !isRolePermission(id))

    if (changeable.length === 0) return

    const allChangeableSelected = changeable.every(id => isMemberPermission(id))

    if (allChangeableSelected) {
      // Удаляем все изменяемые права группы
      onChange(memberPermissions.filter(p => !changeable.includes(p)))
    } else {
      // Добавляем недостающие изменяемые права
      const toAdd = changeable.filter(id => !isMemberPermission(id))
      onChange([...memberPermissions, ...toAdd])
    }
  }

  // Подпись действия в рамках ресурса («Создание», «Просмотр»). Внутри одного
  // ресурса действия уникальны, поэтому коротких меток достаточно; полный
  // контекст («…событий») даёт под-заголовок ресурса. Фолбэк — permission.name.
  const getActionLabel = (permission: Permission) => {
    const action = permission.code.split(':').pop() ?? ''
    const labelKey = ACTION_LABEL_KEYS[action]
    return labelKey ? t(labelKey) : permission.name
  }

  const roleInfo = role ? (
    <div className="flex items-start gap-3 rounded-lg border border-info-soft bg-info-soft p-4">
      <ShieldCheck className="mt-0.5 h-5 w-5 text-info shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-info-soft-foreground">
          {t('users.permissionEditor.baseRole', { role: getRoleLabel(role) })}
        </p>
        <p className="mt-0.5 text-xs text-info-soft-foreground">
          {t('users.permissionEditor.baseRoleDescription')}
        </p>
      </div>
    </div>
  ) : null

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (isError && permissions.length === 0) {
    const description = errorMessage
      ? `${t('users.permissionEditor.loadErrorDescription')} ${errorMessage}`
      : t('users.permissionEditor.loadErrorDescription')

    return (
      <div className="space-y-4">
        {roleInfo}
        <ErrorState
          title={t('users.permissionEditor.loadErrorTitle')}
          description={description}
          retryLabel={t('users.permissionEditor.retry')}
          onRetry={onRetry}
        />
      </div>
    )
  }

  if (permissions.length === 0) {
    return (
      <div className="space-y-4">
        {roleInfo}
        <EmptyState
          icon={Shield}
          title={t('users.permissionEditor.emptyCatalogTitle')}
          description={t('users.permissionEditor.emptyCatalogDescription')}
        />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Информация о роли */}
        {roleInfo}

        {/* Группы прав */}
        {groups.map(group => {
          const isFullySelected = isGroupFullySelected(group)
          const isPartiallySelected = isGroupPartiallySelected(group)
          // Количество прав: от роли / индивидуальные
          const roleCount = group.permissions.filter(p => isRolePermission(p.id)).length
          const memberCount = group.permissions.filter(p => isMemberPermission(p.id)).length
          const activeCount = roleCount + memberCount
          const changeableCount = group.permissions.filter(p => !isRolePermission(p.id)).length

          return (
            <Collapsible key={group.code} defaultOpen={activeCount > 0}>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {/* Заголовок группы */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={isFullySelected || isPartiallySelected}
                      onCheckedChange={() => toggleGroup(group)}
                      disabled={disabled || isSaving || changeableCount === 0}
                      className={cn(
                        'shrink-0',
                        isPartiallySelected && 'data-[state=checked]:bg-muted-foreground'
                      )}
                    />
                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-primary transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{group.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({activeCount}/{group.permissions.length})
                          </span>
                        </div>
                        {group.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                  </div>
                </div>

                {/* Права группы — матрица «ресурс → действия» */}
                <CollapsibleContent>
                  <div className="divide-y divide-border border-t border-border">
                    {groupByResource(group.permissions).map(sub => (
                      <div key={sub.resource} className="px-3 py-2.5">
                        <div className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t(`${RESOURCE_LABEL_KEY_PREFIX}.${sub.resource}`)}
                        </div>
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                          {sub.permissions.map(permission => {
                            const isRole = isRolePermission(permission.id)
                            const isMember = isMemberPermission(permission.id)
                            const isActive = isRole || isMember

                            return (
                              <div
                                key={permission.id}
                                className={cn(
                                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors',
                                  isMember
                                    ? 'bg-success-soft'
                                    : isRole
                                      ? 'bg-muted/50'
                                      : 'hover:bg-muted'
                                )}
                              >
                                <Checkbox
                                  id={permission.id}
                                  checked={isActive}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                  disabled={disabled || isSaving || isRole}
                                  className={cn(
                                    'shrink-0',
                                    isRole &&
                                      'border-muted-foreground/40 data-[state=checked]:border-muted-foreground/50 data-[state=checked]:bg-muted-foreground/50',
                                    isMember &&
                                      'border-success data-[state=checked]:border-success data-[state=checked]:bg-success'
                                  )}
                                />
                                <label
                                  htmlFor={permission.id}
                                  className={cn(
                                    'min-w-0 flex-1 cursor-pointer',
                                    (disabled || isSaving || isRole) && 'cursor-not-allowed'
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'text-sm',
                                      isActive ? 'text-foreground' : 'text-muted-foreground'
                                    )}
                                  >
                                    {getActionLabel(permission)}
                                  </span>
                                </label>
                                {permission.description && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      {permission.description}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {isRole && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {t('users.permissionEditor.rolePermission', {
                                        role: getRoleLabel(role),
                                      })}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}

        {/* Индикатор сохранения */}
        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('users.permissionEditor.savingChanges')}
          </div>
        )}

        {/* Легенда */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>{t('users.permissionEditor.roleRights')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-success" />
            <span>{t('users.permissionEditor.individualRights')}</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
