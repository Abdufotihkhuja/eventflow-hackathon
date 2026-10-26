import { MessageSquareText } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { AnalyticsQuestion, AnalyticsQuestions } from '@api/services'
import { cn } from '@shared/lib'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '@shared/ui'

type Props = {
  questions: AnalyticsQuestions
}

/**
 * Per-question answer analytics.
 *
 *   SELECT / CHECKBOX  → proportional bar list per option
 *   NUMBER             → min / avg / max compact stats
 *   TEXT / TEXTAREA    → "answered/skipped" only (no individual answers, no PII leak)
 *
 * Each question renders as a row inside one card — keeps the analytics tab from exploding into
 * twenty separate cards when the registration form has many questions.
 */
export function QuestionsAnalyticsSection({ questions }: Props) {
  const t = useT()

  if (!questions.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('events.analytics.questions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={MessageSquareText}
            title={t('events.analytics.questions.noQuestionsTitle')}
            description={t('events.analytics.questions.noQuestionsDescription')}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('events.analytics.questions.title')}</CardTitle>
        <CardDescription>{t('events.analytics.questions.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {questions.questions.map((q, idx) => (
            <li key={q.questionId} className={cn('py-5 first:pt-0 last:pb-0', idx === 0 && 'pt-0')}>
              <QuestionRow question={q} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function QuestionRow({ question }: { question: AnalyticsQuestion }) {
  const t = useT()
  const total = question.answeredCount + question.skippedCount

  return (
    <div className="space-y-3">
      {/* Heading: question text + meta */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="min-w-0 text-sm font-medium text-foreground">
          {question.question}
        </p>
        <div className="flex shrink-0 items-baseline gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span
            className={cn(
              'inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px] normal-case tracking-normal',
              question.isRequired
                ? 'border-warning/40 bg-warning/10 text-warning'
                : 'border-border bg-muted/30 text-muted-foreground',
            )}
          >
            {question.isRequired
              ? t('events.analytics.questions.requiredBadge')
              : t('events.analytics.questions.optionalBadge')}
          </span>
          <span className="font-mono text-[11px] tabular-nums">
            {total > 0
              ? t('events.analytics.questions.answeredOf', {
                  answered: question.answeredCount,
                  total,
                })
              : t('events.analytics.questions.answeredCount', { count: question.answeredCount })}
          </span>
        </div>
      </div>

      {/* Body: type-specific */}
      <QuestionBody question={question} />
    </div>
  )
}

function QuestionBody({ question }: { question: AnalyticsQuestion }) {
  const t = useT()

  if (question.options && question.options.length > 0) {
    // SELECT/CHECKBOX
    const max = Math.max(...question.options.map(o => o.count), 1)
    return (
      <ul className="space-y-1.5">
        {question.options.map(opt => {
          const label =
            opt.option === '__other__' ? t('events.analytics.questions.otherBucket') : opt.option
          const pct = Math.round((opt.count / max) * 100)
          return (
            <li key={opt.option} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-foreground" title={label}>
                  {label}
                </span>
                <span
                  className={cn(
                    'shrink-0 font-mono text-[12px] tabular-nums',
                    opt.count === 0 ? 'text-muted-foreground/60' : 'text-muted-foreground',
                  )}
                >
                  {opt.count.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width]',
                    opt.count === 0 ? 'bg-transparent' : 'bg-primary/70',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  if (question.numberStats) {
    const { min, max, avg, count } = question.numberStats
    return (
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border/60 sm:grid-cols-4">
        <NumberCell label={t('events.analytics.questions.numberMin')} value={String(min)} />
        <NumberCell label={t('events.analytics.questions.numberAvg')} value={String(avg)} />
        <NumberCell label={t('events.analytics.questions.numberMax')} value={String(max)} />
        <NumberCell label={t('events.analytics.questions.numberCount')} value={String(count)} />
      </div>
    )
  }

  // TEXT / TEXTAREA — no aggregation, only counts (already shown in heading).
  return (
    <p className="text-xs italic text-muted-foreground">
      {t('events.analytics.questions.openAnswerNote')}
    </p>
  )
}

function NumberCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-base font-medium tabular-nums text-foreground">{value}</p>
    </div>
  )
}
