/**
 * Super Admin — маска доступа организации (тонкое управление правами).
 * GET/PUT /api/v1/super-admin/organizations/:orgId/access-mask.
 *
 * Каталог прав сгруппирован по модулю (префикс до «:»). Чекбокс отмечен =
 * право РАЗРЕШЕНО (по роли/тарифу), снят = ЗАКРЫТО маской для всей
 * организации, включая владельца. Пустая маска = поведение как раньше.
 * Маска только УБИРАЕТ права; выдача — управление ролями организации.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, ShieldOff } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { useAccessMask, useAdminOrganization, useSetAccessMask } from '@features/super-admin'
import { getApiErrorMessage } from '@features/super-admin'
import {
  Button,
  Card,
  Checkbox,
  ErrorState,
  Label,
  PageHeader,
  Skeleton,
  Switch,
  Textarea,
} from '@shared/ui'

/** Человекочитаемая метка кода: i18n по модулю/действию, фолбэк — сырой код. */
function humanizeModule(t: ReturnType<typeof useT>, moduleKey: string): string {
  const label = t(`admin.accessMask.modules.${moduleKey}`)
  // t возвращает ключ как есть, если перевода нет — тогда показываем сам код.
  return label.startsWith('admin.accessMask.modules.') ? moduleKey : label
}

function humanizeAction(t: ReturnType<typeof useT>, actionKey: string): string {
  const label = t(`admin.accessMask.actionLabels.${actionKey}`)
  return label.startsWith('admin.accessMask.actionLabels.') ? actionKey : label
}

interface ModuleGroup {
  moduleKey: string
  codes: { code: string; action: string }[]
}

function groupByModule(codes: string[]): ModuleGroup[] {
  const map = new Map<string, { code: string; action: string }[]>()
  for (const code of codes) {
    const [moduleKey, action = ''] = code.split(':')
    if (!map.has(moduleKey)) map.set(moduleKey, [])
    map.get(moduleKey)!.push({ code, action })
  }
  return [...map.entries()]
    .map(([moduleKey, list]) => ({ moduleKey, codes: list }))
    .sort((a, b) => a.moduleKey.localeCompare(b.moduleKey))
}

export default function OrgAccessMaskPage() {
  const t = useT()
  const { orgId = '' } = useParams<{ orgId: string }>()

  const organization = useAdminOrganization(orgId || null)
  const mask = useAccessMask(orgId || null)
  const setMask = useSetAccessMask(orgId)

  // Локальный набор ЗАКРЫТЫХ кодов; синхронизируется с сервером при загрузке.
  const [denied, setDenied] = useState<Set<string>>(new Set())
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (mask.data) {
      setDenied(new Set(mask.data.deniedCodes))
      setReason('')
    }
  }, [mask.data])

  const groups = useMemo(
    () => (mask.data ? groupByModule(mask.data.allCodes) : []),
    [mask.data]
  )

  const serverDenied = useMemo(
    () => new Set(mask.data?.deniedCodes ?? []),
    [mask.data]
  )
  const isDirty = useMemo(() => {
    if (denied.size !== serverDenied.size) return true
    for (const c of denied) if (!serverDenied.has(c)) return true
    return false
  }, [denied, serverDenied])

  if (mask.isLoading) {
    return <AccessSkeleton />
  }

  if (mask.isError || !mask.data) {
    return (
      <ErrorState
        title={t('admin.accessMask.loadError')}
        description={t('admin.accessMask.loadErrorHint')}
        onRetry={() => mask.refetch()}
        retryLabel={t('admin.toasts.retryAgain')}
      />
    )
  }

  const toggleCode = (code: string, allowed: boolean) => {
    setDenied(prev => {
      const next = new Set(prev)
      if (allowed) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const toggleModule = (group: ModuleGroup, allowed: boolean) => {
    setDenied(prev => {
      const next = new Set(prev)
      for (const { code } of group.codes) {
        if (allowed) next.delete(code)
        else next.add(code)
      }
      return next
    })
  }

  const canSave = isDirty && !setMask.isPending

  const handleSave = () => {
    if (!canSave) return
    setMask.mutate({ deniedCodes: [...denied], reason: reason.trim() || undefined })
  }

  const handleReset = () => {
    setDenied(new Set(serverDenied))
    setReason('')
  }

  const deniedCount = denied.size

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('admin.accessMask.eyebrow')}
        title={organization.data?.name ?? t('admin.accessMask.title')}
        description={t('admin.accessMask.title')}
        meta={
          <Link
            to={`/admin/organizations/${orgId}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {t('admin.accessMask.back')}
          </Link>
        }
      />

      <Card>
        <div className="flex items-start gap-3">
          <ShieldOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t('admin.accessMask.explainerTitle')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('admin.accessMask.explainerBody')}
            </p>
            <p className="mt-2 text-xs font-medium text-foreground">
              {deniedCount === 0
                ? t('admin.accessMask.noneDenied')
                : t('admin.accessMask.deniedCount', { count: deniedCount })}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('admin.accessMask.limitsHint')}{' '}
              <Link
                to={`/admin/organizations/${orgId}/billing`}
                className="font-medium text-primary hover:underline"
              >
                {t('admin.accessMask.limitsLink')}
              </Link>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(group => {
          const moduleDeniedCount = group.codes.filter(c => denied.has(c.code)).length
          const allAllowed = moduleDeniedCount === 0
          return (
            <Card key={group.moduleKey}>
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {humanizeModule(t, group.moduleKey)}
                  </h3>
                  {moduleDeniedCount > 0 && (
                    <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                      {t('admin.accessMask.moduleDenied', { count: moduleDeniedCount })}
                    </p>
                  )}
                </div>
                <Switch
                  checked={allAllowed}
                  onCheckedChange={checked => toggleModule(group, checked)}
                  aria-label={t('admin.accessMask.toggleModule')}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {group.codes.map(({ code, action }) => {
                  const allowed = !denied.has(code)
                  return (
                    <label
                      key={code}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={allowed}
                        onCheckedChange={checked => toggleCode(code, checked === true)}
                      />
                      <span className={allowed ? 'text-foreground' : 'text-muted-foreground line-through'}>
                        {humanizeAction(t, action)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Причина + сохранение (sticky снизу) */}
      <Card className="sticky bottom-4 z-10 border-primary/30 shadow-lg">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="access-reason">{t('admin.accessMask.reasonLabel')}</Label>
            <Textarea
              id="access-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('admin.accessMask.reasonPlaceholder')}
              rows={2}
              maxLength={500}
              className="resize-none"
            />
          </div>
          {setMask.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(setMask.error, t('admin.accessMask.loadError'))}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || setMask.isPending}
              onClick={handleReset}
            >
              {t('admin.accessMask.reset')}
            </Button>
            <Button type="button" disabled={!canSave} onClick={handleSave}>
              {setMask.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  {t('admin.accessMask.saving')}
                </>
              ) : (
                t('admin.accessMask.save')
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function AccessSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    </div>
  )
}
