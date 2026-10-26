/**
 * S-10: сводка выручки (/admin/billing → таб «Выручка»).
 *
 * Период — пресеты 7/30/90 дней + кастомные date-инпуты (границы дня в
 * локальной зоне → ISO с Z). Тотал + разбивки по типу (PLAN_FEE…ADJUSTMENT)
 * и каналу (managed-фаза = только MANUAL — честный баннер, когда других
 * каналов нет). Суммы — тийины строками через formatMinorAmount (BigInt,
 * D-3); отрицательные (REFUND/ADJUSTMENT/реверсы) — destructive-тоном.
 */

import { useState } from 'react'
import { Coins } from 'lucide-react'
import { formatDate, plural } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'

import type { RevenuePeriodQuery } from '@api/services'
import { useRevenueSummary, getApiErrorMessage } from '@features/super-admin'
import { ENTRIES_PLURAL, formatMinorAmount } from '@shared/lib'
import { Button, Card, EmptyState, ErrorState, Input, Skeleton } from '@shared/ui'

const PRESET_DAYS = [7, 30, 90] as const
type PresetDays = (typeof PRESET_DAYS)[number]
type PresetId = PresetDays | 'custom'

/** from за N дней до текущего момента; to бэкенд подставит сам (= сейчас). */
function presetRange(days: PresetDays): RevenuePeriodQuery {
  return { from: new Date(Date.now() - days * 86_400_000).toISOString() }
}

/** Календарные границы кастомного периода: начало/конец дня в локальной зоне. */
function customRange(fromDay: string, toDay: string): RevenuePeriodQuery | null {
  const from = new Date(`${fromDay}T00:00:00`)
  const to = new Date(`${toDay}T23:59:59.999`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null
  return { from: from.toISOString(), to: to.toISOString() }
}

export function RevenueSection() {
  const t = useT()
  const locale = useLocale()

  const [preset, setPreset] = useState<PresetId>(30)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [range, setRange] = useState<RevenuePeriodQuery>(() => presetRange(30))

  const summary = useRevenueSummary(range)

  const selectPreset = (days: PresetDays) => {
    setPreset(days)
    setRange(presetRange(days))
  }

  const changeCustom = (fromDay: string, toDay: string) => {
    setPreset('custom')
    setCustomFrom(fromDay)
    setCustomTo(toDay)
    const next = customRange(fromDay, toDay)
    if (next) setRange(next)
  }

  const customInvalid =
    preset === 'custom' &&
    customFrom !== '' &&
    customTo !== '' &&
    customRange(customFrom, customTo) === null

  const data = summary.data
  const totalNegative = data?.totalMinor.startsWith('-') ?? false
  // Честная деградация managed-фазы: провайдеры не подключены, пока в
  // byChannel нет ни одной строки кроме MANUAL.
  const manualOnly =
    !!data && data.byChannel.length > 0 && data.byChannel.every(row => row.channel === 'MANUAL')

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('admin.billing.revenue.title')}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('admin.billing.revenue.description')}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_DAYS.map(days => (
              <Button
                key={days}
                type="button"
                size="sm"
                variant={preset === days ? 'default' : 'outline'}
                onClick={() => selectPreset(days)}
              >
                {t(`admin.billing.revenue.presets.d${days}`)}
              </Button>
            ))}
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              {t('admin.billing.revenue.fromLabel')}
            </span>
            <Input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={e => changeCustom(e.target.value, customTo)}
              aria-label={t('admin.billing.revenue.fromLabel')}
              className="h-8 w-40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">
              {t('admin.billing.revenue.toLabel')}
            </span>
            <Input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={e => changeCustom(customFrom, e.target.value)}
              aria-label={t('admin.billing.revenue.toLabel')}
              className="h-8 w-40"
            />
          </label>
        </div>
        {customInvalid && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {t('admin.billing.revenue.invalidRange')}
          </p>
        )}

        {summary.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : summary.isError ? (
          <ErrorState
            title={t('admin.billing.revenue.loadError')}
            description={getApiErrorMessage(summary.error, t('admin.billing.panel.loadErrorHint'))}
            onRetry={() => void summary.refetch()}
            retryLabel={t('admin.toasts.retryAgain')}
            className="mt-4"
          />
        ) : data ? (
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('admin.billing.revenue.totalLabel')}
              </p>
              <p
                className={`mt-1 text-3xl font-semibold tabular-nums tracking-tight ${
                  totalNegative ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {formatMinorAmount(data.totalMinor, 'UZS', locale)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('admin.billing.revenue.periodSummary', {
                  from: formatDate(data.from, locale),
                  to: formatDate(data.to, locale),
                  entries: plural(locale, data.entries, ENTRIES_PLURAL),
                })}
              </p>
            </div>

            {manualOnly && (
              <div className="rounded-md bg-info-soft px-3 py-2 text-sm text-info-soft-foreground">
                {t('admin.billing.revenue.manualOnly')}
              </div>
            )}

            {data.entries === 0 ? (
              <EmptyState
                icon={Coins}
                title={t('admin.billing.revenue.empty')}
                description={t('admin.billing.revenue.emptyHint')}
                className="py-8"
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <BreakdownTable
                  title={t('admin.billing.revenue.byTypeTitle')}
                  firstColumn={t('admin.billing.revenue.colType')}
                  rows={data.byType.map(row => ({
                    key: row.type,
                    label: t(`admin.billing.revenue.types.${row.type}`),
                    amountMinor: row.amountMinor,
                    entries: row.entries,
                  }))}
                />
                <BreakdownTable
                  title={t('admin.billing.revenue.byChannelTitle')}
                  firstColumn={t('admin.billing.revenue.colChannel')}
                  rows={data.byChannel.map(row => ({
                    key: row.channel,
                    label: t(`admin.billing.revenue.channels.${row.channel}`),
                    amountMinor: row.amountMinor,
                    entries: row.entries,
                  }))}
                />
              </div>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  )
}

/** Разбивка (по типу / по каналу): метка, сумма (минус — destructive), записи. */
function BreakdownTable(props: {
  title: string
  firstColumn: string
  rows: { key: string; label: string; amountMinor: string; entries: number }[]
}) {
  const t = useT()
  const locale = useLocale()

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-foreground">{props.title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{props.firstColumn}</th>
              <th className="py-2 pr-4 font-medium">{t('admin.billing.revenue.colAmount')}</th>
              <th className="py-2 font-medium">{t('admin.billing.revenue.colEntries')}</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map(row => {
              const negative = row.amountMinor.startsWith('-')
              return (
                <tr key={row.key} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-foreground">{row.label}</td>
                  <td
                    className={`py-2.5 pr-4 tabular-nums ${
                      negative ? 'font-medium text-destructive' : ''
                    }`}
                  >
                    {formatMinorAmount(row.amountMinor, 'UZS', locale)}
                  </td>
                  <td className="py-2.5 tabular-nums text-muted-foreground">{row.entries}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
