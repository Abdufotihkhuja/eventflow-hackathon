import { useState } from 'react'
import { Timer } from 'lucide-react'

import { Button } from './shadcn/button'
import { Input } from './shadcn/input'
import { Label } from './shadcn/label'
import { Popover, PopoverContent, PopoverTrigger } from './shadcn/popover'
import { cn } from '@shared/lib/cn'

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180] as const

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} мин`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`
}

type DurationInputProps = {
  value: number
  onChange: (value: number) => void
  id?: string
  className?: string
  disabled?: boolean
  min?: number
  max?: number
}

export function DurationInput({
  value,
  onChange,
  id,
  className,
  disabled,
  min = 1,
  max = 480,
}: DurationInputProps) {
  const [open, setOpen] = useState(false)
  const [customValue, setCustomValue] = useState(String(value))
  const isPreset = (DURATION_PRESETS as readonly number[]).includes(value)

  const handlePresetClick = (mins: number) => {
    onChange(mins)
    setOpen(false)
  }

  const handleCustomApply = () => {
    const parsed = parseInt(customValue, 10)
    if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed)
      setOpen(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) setCustomValue(String(value))
  }

  const displayText = isPreset ? formatDuration(value) : `${value} мин`

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
            className
          )}
        >
          <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Быстрый выбор</p>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
            {DURATION_PRESETS.map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => handlePresetClick(mins)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-sm transition-colors',
                  value === mins
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {mins} мин
              </button>
            ))}
          </div>
        </div>
        <div className="border-t p-3">
          <Label htmlFor="duration-custom" className="text-xs font-medium text-muted-foreground">
            Своё значение (мин)
          </Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="duration-custom"
              type="number"
              min={min}
              max={max}
              value={customValue}
              onChange={e => setCustomValue(e.target.value)}
              placeholder="Например: 75"
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
