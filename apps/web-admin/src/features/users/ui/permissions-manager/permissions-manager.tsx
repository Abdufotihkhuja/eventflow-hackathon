/**
 * Компонент для управления правами доступа пользователя
 */

import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Info } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { Permission, PERMISSION_GROUPS } from '@entities/user'
import { cn } from '@shared/lib/cn'
import {
  Checkbox,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@shared/ui'

type PermissionsManagerProps<T extends FieldValues> = {
  control: Control<T>
  name: Path<T>
  disabled?: boolean
}

export function PermissionsManager<T extends FieldValues>({
  control,
  name,
  disabled,
}: PermissionsManagerProps<T>) {
  const t = useT()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selectedPermissions = (field.value as Permission[]) || []

        const togglePermission = (permission: Permission) => {
          if (disabled) return

          const newPermissions = selectedPermissions.includes(permission)
            ? selectedPermissions.filter(p => p !== permission)
            : [...selectedPermissions, permission]

          field.onChange(newPermissions)
        }

        const toggleGroup = (groupPermissions: Permission[]) => {
          if (disabled) return

          const allSelected = groupPermissions.every(p => selectedPermissions.includes(p))

          const newPermissions = allSelected
            ? selectedPermissions.filter(p => !groupPermissions.includes(p))
            : [...new Set([...selectedPermissions, ...groupPermissions])]

          field.onChange(newPermissions)
        }

        return (
          <TooltipProvider>
            <div className="space-y-6">
              {PERMISSION_GROUPS.map(group => {
                const groupPermissionKeys = group.permissions.map(p => p.key)
                const allGroupSelected = groupPermissionKeys.every(p =>
                  selectedPermissions.includes(p)
                )
                const someGroupSelected = groupPermissionKeys.some(p =>
                  selectedPermissions.includes(p)
                )

                return (
                  <div
                    key={group.labelKey}
                    className="rounded-xl border border-border bg-muted/50 p-5 transition hover:border-border hover:shadow-sm"
                  >
                    {/* Group header */}
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-foreground">{t(group.labelKey)}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t(group.descriptionKey)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`group-${group.labelKey}`}
                          checked={someGroupSelected ? allGroupSelected : false}
                          onCheckedChange={() => toggleGroup(groupPermissionKeys)}
                          disabled={disabled}
                          className="h-5 w-5"
                        />
                        <Label
                          htmlFor={`group-${group.labelKey}`}
                          className={cn(
                            'cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground',
                            disabled && 'cursor-not-allowed opacity-50'
                          )}
                        >
                          {t('filters.all')}
                        </Label>
                      </div>
                    </div>

                    {/* Individual permissions */}
                    <div className="space-y-3">
                      {group.permissions.map(permission => {
                        const isChecked = selectedPermissions.includes(permission.key)

                        return (
                          <div
                            key={permission.key}
                            className={cn(
                              'flex items-start gap-3 rounded-lg border border-transparent bg-card p-3 transition',
                              isChecked
                                ? 'border-brand-secondary/20 bg-brand-secondary/5 shadow-sm'
                                : 'hover:border-border hover:bg-muted/50'
                            )}
                          >
                            <Checkbox
                              id={permission.key}
                              checked={isChecked}
                              onCheckedChange={() => togglePermission(permission.key)}
                              disabled={disabled}
                              className={cn('mt-0.5 h-4 w-4')}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={permission.key}
                                className={cn(
                                  'flex items-center gap-1.5 cursor-pointer text-sm font-medium text-foreground',
                                  disabled && 'cursor-not-allowed opacity-50'
                                )}
                              >
                                {t(permission.labelKey)}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    {t(permission.descriptionKey)}
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t(permission.descriptionKey)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </TooltipProvider>
        )
      }}
    />
  )
}
