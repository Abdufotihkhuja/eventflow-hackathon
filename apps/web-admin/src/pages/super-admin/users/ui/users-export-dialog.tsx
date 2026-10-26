/**
 * Диалог выгрузки пользователей в XLSX.
 *
 * Админ отмечает нужные колонки — файл собирает бэкенд по всей текущей выборке
 * (фильтры вкладки/поиска/верификации), а не по видимой странице. Порядок
 * колонок в файле задаёт каталог на бэкенде, поэтому порядок галочек здесь
 * значения не имеет.
 */

import { useEffect, useMemo, useState } from 'react'
import { useT } from '@eventflow/i18n/react'
import { Download, Loader2 } from 'lucide-react'

import type { AdminUserExportField } from '@api/services/superAdmin.types'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  ScrollArea,
} from '@shared/ui'

/** Группы колонок в порядке отображения; ключи совпадают с вайтлистом API. */
const FIELD_GROUPS: Array<{
  id: 'identity' | 'profile' | 'social' | 'organization' | 'system'
  fields: AdminUserExportField[]
}> = [
  {
    id: 'identity',
    fields: [
      'firstName',
      'lastName',
      'email',
      'phone',
      'gender',
      'dateOfBirth',
      'age',
    ],
  },
  {
    id: 'profile',
    fields: [
      'location',
      'region',
      'languages',
      'profileStatus',
      'workOrStudyPlace',
      'specialization',
      'skills',
      'shortBio',
      'bio',
    ],
  },
  {
    id: 'social',
    fields: ['linkedinUrl', 'instagramUrl', 'facebookUrl', 'websiteUrl'],
  },
  { id: 'organization', fields: ['organizationName', 'roleName'] },
  {
    id: 'system',
    fields: [
      'authProvider',
      'isEmailVerified',
      'state',
      'createdAt',
      'updatedAt',
      'id',
    ],
  },
]

const ALL_FIELDS: AdminUserExportField[] = FIELD_GROUPS.flatMap(g => g.fields)

/** Набор при открытии — то, что нужно в 90% выгрузок. */
const DEFAULT_FIELDS: AdminUserExportField[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'createdAt',
]

type UsersExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Сколько пользователей попадёт в файл при текущих фильтрах. */
  matchingCount?: number
  /** Показывать ли подсказку про активные фильтры. */
  hasFilters?: boolean
  isPending?: boolean
  onExport: (fields: AdminUserExportField[]) => void
}

export function UsersExportDialog({
  open,
  onOpenChange,
  matchingCount,
  hasFilters,
  isPending,
  onExport,
}: UsersExportDialogProps) {
  const t = useT()
  const [selected, setSelected] = useState<AdminUserExportField[]>(DEFAULT_FIELDS)

  // Каждое открытие начинается с дефолтного набора: выгрузка — разовое
  // действие, тянуть в неё выбор из прошлого раза скорее сбивает.
  useEffect(() => {
    if (open) setSelected(DEFAULT_FIELDS)
  }, [open])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const toggle = (field: AdminUserExportField) => {
    setSelected(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    )
  }

  const toggleGroup = (fields: AdminUserExportField[], checked: boolean) => {
    setSelected(prev =>
      checked
        ? [...new Set([...prev, ...fields])]
        : prev.filter(f => !fields.includes(f))
    )
  }

  const allSelected = selected.length === ALL_FIELDS.length

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (isPending) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('admin.usersExport.title')}</DialogTitle>
          <DialogDescription>
            {matchingCount === undefined
              ? t('admin.usersExport.description')
              : t(
                  hasFilters
                    ? 'admin.usersExport.descriptionFiltered'
                    : 'admin.usersExport.descriptionCount',
                  { count: matchingCount }
                )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <p className="text-sm text-muted-foreground">
            {t('admin.usersExport.selectedCount', {
              count: selected.length,
              total: ALL_FIELDS.length,
            })}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(allSelected ? [] : ALL_FIELDS)}
          >
            {t(
              allSelected
                ? 'admin.usersExport.clearAll'
                : 'admin.usersExport.selectAll'
            )}
          </Button>
        </div>

        <ScrollArea className="max-h-[52vh] pr-3">
          <div className="space-y-5">
            {FIELD_GROUPS.map(group => {
              const groupChecked = group.fields.every(f => selectedSet.has(f))
              return (
                <section key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`export-group-${group.id}`}
                      checked={groupChecked}
                      onCheckedChange={checked =>
                        toggleGroup(group.fields, checked === true)
                      }
                      className="size-4"
                    />
                    <Label
                      htmlFor={`export-group-${group.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {t(`admin.usersExport.groups.${group.id}`)}
                    </Label>
                  </div>

                  <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                    {group.fields.map(field => (
                      <div key={field} className="flex items-center gap-2">
                        <Checkbox
                          id={`export-field-${field}`}
                          checked={selectedSet.has(field)}
                          onCheckedChange={() => toggle(field)}
                          className="size-4"
                        />
                        <Label
                          htmlFor={`export-field-${field}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {t(`admin.usersExport.fields.${field}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {t('admin.actions.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isPending || selected.length === 0}
            onClick={() => onExport(selected)}
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="mr-2 size-4" aria-hidden="true" />
            )}
            {t('admin.usersExport.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
