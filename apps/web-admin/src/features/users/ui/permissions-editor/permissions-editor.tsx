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

import type { OrgPermission, OrganizationRole } from '@api/services'

// Используем OrgPermission (из organization.types) для API прав
type Permission = OrgPermission
import { cn } from '@shared/lib/cn'
import {
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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

// Метки для CRUD операций
const ACTION_LABELS: Record<string, string> = {
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

// Названия модулей (категорий)
const MODULE_LABELS: Record<string, string> = {
  events: 'users.permissionEditor.modules.events',
  members: 'users.permissionEditor.modules.members',
  roles: 'users.permissionEditor.modules.roles',
  registrations: 'users.permissionEditor.modules.registrations',
  attendance: 'users.permissionEditor.modules.attendance',
  certificates: 'users.permissionEditor.modules.certificates',
  speakers: 'users.permissionEditor.modules.speakers',
  agenda: 'users.permissionEditor.modules.agenda',
  mail: 'users.permissionEditor.modules.mail',
  boards: 'users.permissionEditor.modules.boards',
  tasks: 'users.permissionEditor.modules.tasks',
  organization: 'users.permissionEditor.modules.organization',
  analytics: 'users.permissionEditor.modules.analytics',
  settings: 'users.permissionEditor.modules.settings',
  questions: 'users.permissionEditor.modules.questions',
  tickets: 'users.permissionEditor.modules.tickets',
  columns: 'users.permissionEditor.modules.columns',
  comments: 'users.permissionEditor.modules.comments',
  checklists: 'users.permissionEditor.modules.checklists',
  tags: 'users.permissionEditor.modules.tags',
  attachments: 'users.permissionEditor.modules.attachments',
  uploads: 'users.permissionEditor.modules.uploads',
}

// Описания модулей (категорий)
const MODULE_DESCRIPTIONS: Record<string, string> = {
  events: 'users.permissionEditor.moduleDescriptions.events',
  members: 'users.permissionEditor.moduleDescriptions.members',
  roles: 'users.permissionEditor.moduleDescriptions.roles',
  registrations: 'users.permissionEditor.moduleDescriptions.registrations',
  attendance: 'users.permissionEditor.moduleDescriptions.attendance',
  certificates: 'users.permissionEditor.moduleDescriptions.certificates',
  speakers: 'users.permissionEditor.moduleDescriptions.speakers',
  agenda: 'users.permissionEditor.moduleDescriptions.agenda',
  mail: 'users.permissionEditor.moduleDescriptions.mail',
  boards: 'users.permissionEditor.moduleDescriptions.boards',
  tasks: 'users.permissionEditor.moduleDescriptions.tasks',
  organization: 'users.permissionEditor.moduleDescriptions.organization',
  analytics: 'users.permissionEditor.moduleDescriptions.analytics',
  settings: 'users.permissionEditor.moduleDescriptions.settings',
  questions: 'users.permissionEditor.moduleDescriptions.questions',
  tickets: 'users.permissionEditor.moduleDescriptions.tickets',
  columns: 'users.permissionEditor.moduleDescriptions.columns',
  comments: 'users.permissionEditor.moduleDescriptions.comments',
  checklists: 'users.permissionEditor.moduleDescriptions.checklists',
  tags: 'users.permissionEditor.moduleDescriptions.tags',
  attachments: 'users.permissionEditor.moduleDescriptions.attachments',
  uploads: 'users.permissionEditor.moduleDescriptions.uploads',
}

export function PermissionsEditor({
  permissions,
  rolePermissions,
  memberPermissions,
  onChange,
  isLoading,
  isSaving,
  disabled,
  role,
}: PermissionsEditorProps) {
  const t = useT()

  // Группируем права по категориям
  const groups = useMemo<PermissionGroup[]>(() => {
    const groupMap = new Map<string, Permission[]>()

    permissions.forEach(p => {
      const category = p.category || 'other'
      if (!groupMap.has(category)) {
        groupMap.set(category, [])
      }
      groupMap.get(category)!.push(p)
    })

    return Array.from(groupMap.entries()).map(([code, perms]) => ({
      code,
      name: MODULE_LABELS[code] ? t(MODULE_LABELS[code]) : code,
      description: MODULE_DESCRIPTIONS[code] ? t(MODULE_DESCRIPTIONS[code]) : '',
      permissions: perms.sort((a, b) => a.name.localeCompare(b.name)),
    }))
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

  // Получить label для действия
  const getActionLabel = (permission: Permission) => {
    // Пытаемся извлечь action из code (например events:create -> create)
    const parts = permission.code.split(':')
    const action = parts[parts.length - 1]
    return ACTION_LABELS[action] ? t(ACTION_LABELS[action]) : permission.name
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Информация о роли */}
        {role && (
          <div className="flex items-start gap-3 rounded-lg border border-info/20 bg-info-soft p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-info-soft-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-info-soft-foreground">
                {t('users.permissionEditor.baseRole', { role: role.name })}
              </p>
              <p className="mt-0.5 text-xs text-info-soft-foreground/80">
                {t('users.permissionEditor.baseRoleDescription')}
              </p>
            </div>
          </div>
        )}

        {/* Группы прав */}
        {groups.map(group => {
          const isFullySelected = isGroupFullySelected(group)
          const isPartiallySelected = isGroupPartiallySelected(group)
          // Количество прав: от роли / индивидуальные
          const roleCount = group.permissions.filter(p => isRolePermission(p.id)).length
          const memberCount = group.permissions.filter(p => isMemberPermission(p.id)).length
          const activeCount = roleCount + memberCount

          return (
            <Collapsible key={group.code} defaultOpen={activeCount > 0}>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                {/* Заголовок группы */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/80">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={isFullySelected || isPartiallySelected}
                      onCheckedChange={() => toggleGroup(group)}
                      disabled={disabled || isSaving}
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

                {/* Права группы */}
                <CollapsibleContent>
                  <div className="border-t border-border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                      {group.permissions.map(permission => {
                        const isRole = isRolePermission(permission.id)
                        const isMember = isMemberPermission(permission.id)
                        const isActive = isRole || isMember

                        return (
                          <div
                            key={permission.id}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
                              isActive
                                ? isRole
                                  ? 'bg-info-soft/60'
                                  : 'bg-success-soft/60'
                                : 'hover:bg-muted/50'
                            )}
                          >
                            <Checkbox
                              id={permission.id}
                              checked={isActive}
                              onCheckedChange={() => togglePermission(permission.id)}
                              disabled={disabled || isSaving || isRole}
                              className={cn(
                                isRole && 'border-info data-[state=checked]:bg-info',
                                isMember && 'border-success data-[state=checked]:bg-success'
                              )}
                            />
                            <label
                              htmlFor={permission.id}
                              className={cn(
                                'flex-1 min-w-0 cursor-pointer',
                                (disabled || isSaving || isRole) && 'cursor-not-allowed'
                              )}
                            >
                              <span className="text-sm text-muted-foreground">
                                {getActionLabel(permission)}
                              </span>
                            </label>
                            {permission.description && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  {permission.description}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {isRole && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Shield className="h-3.5 w-3.5 text-info shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {t('users.permissionEditor.rolePermission', { role: role?.name })}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )
                      })}
                    </div>
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
            <div className="h-3 w-3 rounded-sm bg-info" />
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
