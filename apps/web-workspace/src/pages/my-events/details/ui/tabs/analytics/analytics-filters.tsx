import { useId } from 'react'

import { Search, X } from 'lucide-react'
import { useLocale, useT } from '@eventflow/i18n/react'

import { RegistrationStatus } from '@entities/registration'
import type {
  AnalyticsAgeGroup,
  AnalyticsGenderFilter,
  AnalyticsRegionFilter,
  AnalyticsTestStatusFilter,
  EventAnalyticsQuery,
} from '@api/services'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

import { UZ_REGIONS } from './lib/uz-regions'

const AGE_KEYS: AnalyticsAgeGroup[] = [
  'UNDER_18',
  'AGE_18_21',
  'AGE_22_25',
  'AGE_26_30',
  'AGE_31_35',
  'AGE_36_45',
  'AGE_46_PLUS',
  'UNKNOWN',
]

const AGE_LABELS: Record<AnalyticsAgeGroup, string> = {
  UNDER_18: '< 18',
  AGE_18_21: '18–21',
  AGE_22_25: '22–25',
  AGE_26_30: '26–30',
  AGE_31_35: '31–35',
  AGE_36_45: '36–45',
  AGE_46_PLUS: '46+',
  UNKNOWN: '—',
}

const TEST_STATUS_KEYS: AnalyticsTestStatusFilter[] = [
  'NOT_STARTED',
  'COMPLETED',
  'PASSED',
  'FAILED',
]

const ALL = '__all__'

export type AnalyticsFiltersValue = EventAnalyticsQuery

type Props = {
  value: AnalyticsFiltersValue
  onChange: (next: AnalyticsFiltersValue) => void
  /** Hide the test-status filter if the event has no tests (server told us via meta). */
  showTestStatus: boolean
}

export function AnalyticsFilters({ value, onChange, showTestStatus }: Props) {
  const t = useT()
  const locale = useLocale()
  const inputId = useId()

  const set = <K extends keyof EventAnalyticsQuery>(key: K, v: EventAnalyticsQuery[K]) =>
    onChange({ ...value, [key]: v })

  const regionLabel = (key: AnalyticsRegionFilter): string => {
    if (key === '__unknown__') return t('events.analytics.demographics.bucketUnknown')
    const region = UZ_REGIONS.find(r => r.key === key)
    if (!region) return key
    if (locale === 'ru') return region.ru
    if (locale === 'uz') return region.uz
    return region.en
  }

  const hasFilters =
    !!value.dateFrom ||
    !!value.dateTo ||
    !!value.status ||
    !!value.gender ||
    !!value.ageGroup ||
    !!value.testStatus ||
    !!value.region ||
    !!(value.search && value.search.trim())

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t('events.analytics.filters.title')}
        </p>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onChange({})}
          >
            <X className="size-3" />
            {t('events.analytics.filters.reset')}
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <Label htmlFor={`${inputId}-search`} className="mb-1.5 text-xs text-muted-foreground">
            {t('events.analytics.filters.searchPlaceholder')}
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={`${inputId}-search`}
              value={value.search ?? ''}
              onChange={e => set('search', e.target.value)}
              placeholder={t('events.analytics.filters.searchPlaceholder')}
              className="h-9 pl-8"
            />
          </div>
        </div>

        {/* Date range */}
        <div>
          <Label htmlFor={`${inputId}-from`} className="mb-1.5 text-xs text-muted-foreground">
            {t('events.analytics.filters.dateFrom')}
          </Label>
          <Input
            id={`${inputId}-from`}
            type="date"
            value={value.dateFrom ?? ''}
            onChange={e => set('dateFrom', e.target.value || undefined)}
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor={`${inputId}-to`} className="mb-1.5 text-xs text-muted-foreground">
            {t('events.analytics.filters.dateTo')}
          </Label>
          <Input
            id={`${inputId}-to`}
            type="date"
            value={value.dateTo ?? ''}
            onChange={e => set('dateTo', e.target.value || undefined)}
            className="h-9"
          />
        </div>

        {/* Status */}
        <div>
          <Label className="mb-1.5 text-xs text-muted-foreground">
            {t('events.analytics.filters.status')}
          </Label>
          <Select
            value={value.status ?? ALL}
            onValueChange={v => set('status', v === ALL ? undefined : (v as RegistrationStatus))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('events.analytics.filters.anyStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('events.analytics.filters.anyStatus')}</SelectItem>
              <SelectItem value={RegistrationStatus.PENDING}>
                {t('events.analytics.overview.pending')}
              </SelectItem>
              <SelectItem value={RegistrationStatus.APPROVED}>
                {t('events.analytics.overview.approved')}
              </SelectItem>
              <SelectItem value={RegistrationStatus.REJECTED}>
                {t('events.analytics.overview.rejected')}
              </SelectItem>
              <SelectItem value={RegistrationStatus.CANCELLED}>
                {t('events.analytics.overview.cancelled')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gender */}
        <div>
          <Label className="mb-1.5 text-xs text-muted-foreground">
            {t('events.analytics.filters.gender')}
          </Label>
          <Select
            value={value.gender ?? ALL}
            onValueChange={v =>
              set('gender', v === ALL ? undefined : (v as AnalyticsGenderFilter))
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('events.analytics.filters.anyGender')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('events.analytics.filters.anyGender')}</SelectItem>
              <SelectItem value="MALE">{t('events.analytics.demographics.genderMale')}</SelectItem>
              <SelectItem value="FEMALE">
                {t('events.analytics.demographics.genderFemale')}
              </SelectItem>
              <SelectItem value="UNKNOWN">
                {t('events.analytics.demographics.bucketUnknown')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Age group */}
        <div>
          <Label className="mb-1.5 text-xs text-muted-foreground">
            {t('events.analytics.filters.ageGroup')}
          </Label>
          <Select
            value={value.ageGroup ?? ALL}
            onValueChange={v =>
              set('ageGroup', v === ALL ? undefined : (v as AnalyticsAgeGroup))
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('events.analytics.filters.anyAge')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('events.analytics.filters.anyAge')}</SelectItem>
              {AGE_KEYS.map(k => (
                <SelectItem key={k} value={k}>
                  {AGE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Region */}
        <div>
          <Label className="mb-1.5 text-xs text-muted-foreground">
            {t('events.analytics.filters.region')}
          </Label>
          <Select
            value={value.region ?? ALL}
            onValueChange={v =>
              set('region', v === ALL ? undefined : (v as AnalyticsRegionFilter))
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t('events.analytics.filters.anyRegion')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('events.analytics.filters.anyRegion')}</SelectItem>
              {UZ_REGIONS.map(r => (
                <SelectItem key={r.key} value={r.key}>
                  {regionLabel(r.key)}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value="__unknown__">{regionLabel('__unknown__')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Test status — only when event has tests */}
        {showTestStatus && (
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">
              {t('events.analytics.filters.testStatus')}
            </Label>
            <Select
              value={value.testStatus ?? ALL}
              onValueChange={v =>
                set('testStatus', v === ALL ? undefined : (v as AnalyticsTestStatusFilter))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t('events.analytics.filters.anyTestStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>
                  {t('events.analytics.filters.anyTestStatus')}
                </SelectItem>
                {TEST_STATUS_KEYS.map(k => (
                  <SelectItem key={k} value={k}>
                    {t(`events.analytics.filters.testStatus_${k}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
