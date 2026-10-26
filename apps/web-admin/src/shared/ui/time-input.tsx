import { useState, useCallback } from 'react'
import { Clock } from 'lucide-react'

import { Button } from './shadcn/button'
import { Input } from './shadcn/input'
import { Popover, PopoverContent, PopoverTrigger } from './shadcn/popover'
import { cn } from '@shared/lib/cn'

const TIME_PRESETS = (() => {
  const slots: string[] = []
  for (let h = 8; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
})()

function isValidTime(value: string): boolean {
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(value)
}

type TimeInputProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  disabled?: boolean
}

export function TimeInput({ value, onChange, id, className, disabled }: TimeInputProps) {
  const [open, setOpen] = useState(false)
  const [customValue, setCustomValue] = useState(value)

  const handlePresetClick = useCallback(
    (preset: string) => {
      onChange(preset)
      setOpen(false)
    },
    [onChange]
  )

  const handleCustomApply = useCallback(() => {
    if (isValidTime(customValue)) {
      onChange(customValue)
      setOpen(false)
    }
  }, [customValue, onChange])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next) setCustomValue(value || '09:00')
    },
    [value]
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-start gap-2 font-normal text-left',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{value ? value : 'Выберите время'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Быстрый выбор</p>
          <div className="grid max-h-48 grid-cols-3 gap-1 overflow-y-auto sm:grid-cols-4">
            {TIME_PRESETS.map(slot => (
              <button
                key={slot}
                type="button"
                onClick={() => handlePresetClick(slot)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-sm transition-colors',
                  value === slot
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Своё время</p>
          <div className="flex gap-2">
            <Input
              type="time"
              value={customValue}
              onChange={e => setCustomValue(e.target.value)}
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={handleCustomApply}>
              Применить
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
