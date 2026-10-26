import { Calendar } from 'lucide-react'

import { Input } from './shadcn/input'
import { TimeInput } from './time-input'
import { cn } from '@shared/lib/cn'

/**
 * Значение: YYYY-MM-DDTHH:mm (формат для datetime-local).
 * Конвертация в ISO — только при отправке через toISO8601Z.
 */
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

type DateTimeInputProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  disabled?: boolean
}

export function DateTimeInput({ value, onChange, id, className, disabled }: DateTimeInputProps) {
  const { date, time } = parseDateTime(value)

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    onChange(toDateTimeString(newDate, time))
  }

  const handleTimeChange = (newTime: string) => {
    onChange(toDateTimeString(date, newTime))
  }

  return (
    <div
      className={cn('flex flex-col gap-2 sm:flex-row', className)}
      role="group"
      aria-label="Дата и время"
    >
      <div className="relative flex-1 min-w-0">
        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          type="date"
          value={date}
          onChange={handleDateChange}
          disabled={disabled}
          className="pl-9 h-10"
        />
      </div>
      <TimeInput
        value={time}
        onChange={handleTimeChange}
        disabled={disabled}
        className="w-full sm:w-[140px] shrink-0"
      />
    </div>
  )
}
