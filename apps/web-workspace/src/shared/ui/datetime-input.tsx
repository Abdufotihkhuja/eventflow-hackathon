import * as React from 'react'

import { Calendar as CalendarIcon } from 'lucide-react'
import { format, isValid } from 'date-fns'
import { enUS, ru, uz } from 'date-fns/locale'

import { useLocale } from '@eventflow/i18n/react'

import { Button } from './shadcn/button'
import { Calendar } from './shadcn/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './shadcn/popover'
import { TimeInput } from './time-input'
import { cn } from '@shared/lib/cn'

/**
 * DateTimeInput
 *
 * The value/onChange contract is identical to the previous native-input
 * version (a YYYY-MM-DDTHH:mm string), so every existing call-site
 * (create-event-form, edit-event-form, registration-deadline-field)
 * keeps working without changes.
 *
 * Previously this was a shadcn-styled <Input type="date"> — the field
 * looked like ours, but the popup calendar was browser-native. In dark
 * mode that meant a Chrome-grey calendar dropped in next to our
 * bone/ink/ember design tokens, with browser-default headers and a
 * locale we couldn't influence. Replaced with shadcn <Calendar>
 * (react-day-picker v10) inside <Popover>: the popup now picks up our
 * theme variables, supports the same three locales as the rest of the
 * cabinet (en/ru/uz), and respects keyboard navigation through Radix.
 */

const DATE_FNS_LOCALES = { ru, uz, en: enUS } as const

function parseDateTime(value: string): { date: string; time: string } {
  if (!value || !value.includes('T')) {
    return { date: '', time: '09:00' }
  }
  const [date, timePart] = value.split('T')
  const time = timePart?.slice(0, 5) ?? '09:00'
  return { date: date || '', time }
}

function toDateTimeString(date: string, time: string): string {
  if (!date?.trim()) return ''
  return `${date}T${time || '09:00'}`
}

/** YYYY-MM-DD → Date in local TZ (no implicit UTC parsing). */
function isoDateOnlyToLocalDate(iso: string): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return undefined
  const dt = new Date(y, m - 1, d)
  return isValid(dt) ? dt : undefined
}

/** Date → YYYY-MM-DD in local TZ. */
function localDateToIsoDateOnly(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type DateTimeInputProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  disabled?: boolean
}

export function DateTimeInput({
  value,
  onChange,
  id,
  className,
  disabled,
}: DateTimeInputProps): React.JSX.Element {
  const { date, time } = parseDateTime(value)
  const uiLocale = useLocale()
  const dateLocale =
    DATE_FNS_LOCALES[uiLocale as keyof typeof DATE_FNS_LOCALES] ?? enUS
  const selectedDate = isoDateOnlyToLocalDate(date)

  const buttonLabel = selectedDate
    ? format(selectedDate, 'd MMMM yyyy', { locale: dateLocale })
    : ''

  const handleDateSelect = (next: Date | undefined): void => {
    if (!next) return
    onChange(toDateTimeString(localDateToIsoDateOnly(next), time))
  }

  const handleTimeChange = (newTime: string): void => {
    onChange(toDateTimeString(date, newTime))
  }

  return (
    <div
      className={cn('flex flex-col gap-2 sm:flex-row', className)}
      role="group"
      aria-label="Дата и время"
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'flex-1 min-w-0 justify-start text-left font-normal h-10 px-3',
              !selectedDate && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {buttonLabel || (
                <span className="text-muted-foreground">
                  {/* Placeholder — kept as plain text since the rest of the
                      form uses inline placeholders rather than i18n keys
                      for this micro-copy. */}
                  ДД.ММ.ГГГГ
                </span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={dateLocale}
            weekStartsOn={1}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <TimeInput
        value={time}
        onChange={handleTimeChange}
        disabled={disabled}
        className="w-full sm:w-[140px] shrink-0"
      />
    </div>
  )
}
