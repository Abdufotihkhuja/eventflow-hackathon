import { useT } from '@eventflow/i18n/react'

import type { AnalyticsBucket, AnalyticsDemographics } from '@api/services'
import { cn } from '@shared/lib'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui'

import { GenderDonut } from './gender-donut'
import { RegionsBarList } from './regions-bar-list'

type Props = {
  demographics: AnalyticsDemographics
}

/**
 * Demographics block.
 *
 *   Gender  — donut chart with centre figure (proper widget for 2-3 categorical buckets)
 *   Region  — Uzbekistan choropleth (geo data deserves a geo widget)
 *   Age     — ordered proportional bar list (correct for ordinal ranges; pie/donut would lose order)
 *
 * Empty states are honest per-section — if no participant has shared a gender, the donut area
 * shows a plain "no data" note rather than rendering a single 100% slice that lies about coverage.
 */
export function DemographicsCharts({ demographics }: Props) {
  const t = useT()

  const localiseAge = (b: AnalyticsBucket): AnalyticsBucket => {
    if (b.key === 'UNKNOWN') {
      return { ...b, label: t('events.analytics.demographics.bucketUnknown') }
    }
    return b
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('events.analytics.demographics.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top row: gender donut + region map. Stack on narrow viewports. */}
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-2">
            <SectionHeading title={t('events.analytics.demographics.genderTitle')} />
            {demographics.hasGenderData ? (
              <GenderDonut buckets={demographics.gender} />
            ) : (
              <EmptyNote text={t('events.analytics.demographics.noGender')} />
            )}
          </section>

          <section className="lg:col-span-3">
            <SectionHeading title={t('events.analytics.demographics.regionTitle')} />
            {demographics.hasRegionData ? (
              <RegionsBarList
                buckets={demographics.regions.map(({ key, count }) => ({ key, count }))}
                unknownCount={
                  demographics.regions.find(r => r.key === '__unknown__')?.count ?? 0
                }
                otherCount={
                  demographics.regions.find(r => r.key === '__other__')?.count ?? 0
                }
              />
            ) : (
              <EmptyNote text={t('events.analytics.demographics.noRegion')} />
            )}
          </section>
        </div>

        {/* Bottom: age — ordered list of ranges. */}
        <section>
          <SectionHeading title={t('events.analytics.demographics.ageTitle')} />
          {demographics.hasAgeData ? (
            <AgeList buckets={demographics.ageGroups.map(localiseAge)} />
          ) : (
            <EmptyNote text={t('events.analytics.demographics.noAge')} />
          )}
        </section>
      </CardContent>
    </Card>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {title}
    </p>
  )
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-xs italic text-muted-foreground">{text}</p>
}

function AgeList({ buckets }: { buckets: AnalyticsBucket[] }) {
  const visible = buckets.filter(b => b.count > 0)
  if (visible.length === 0) return null
  const total = visible.reduce((s, b) => s + b.count, 0)
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {visible.map(b => {
        const pct = total > 0 ? Math.round((b.count / total) * 100) : 0
        return (
          <li key={b.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-foreground">{b.label}</span>
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                {b.count.toLocaleString()}{' '}
                <span className="text-muted-foreground/60">· {pct}%</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full bg-primary/70 transition-[width]')}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
