/**
 * Поле для неотрицательных чисел.
 *
 * В отличие от `<Input type="number" />` не даёт набрать «-», «e», «+» и пробелы:
 * браузер такие символы считает валидными для number-инпута, а форма потом
 * ругается на «минимум 1». Здесь всё лишнее отсекается прямо при вводе,
 * поэтому в форму попадает либо число, либо `undefined` (поле пустое).
 */

import { forwardRef, useState } from 'react'
import type { ChangeEvent, FocusEvent } from 'react'

import { Input, type InputProps } from './shadcn/input'

export type NumberInputProps = Omit<InputProps, 'type' | 'value' | 'onChange'> & {
  value?: number | string | null
  onValueChange: (value: number | undefined) => void
  /** Разрешить дробную часть (например, для цен в валютах с копейками). */
  allowDecimal?: boolean
}

function sanitize(raw: string, allowDecimal: boolean): string {
  const digitsOnly = raw.replace(/[^\d.,]/g, '')
  if (!allowDecimal) return digitsOnly.replace(/[.,]/g, '')

  const [whole, ...rest] = digitsOnly.replace(/,/g, '.').split('.')
  return rest.length ? `${whole}.${rest.join('')}` : whole
}

function toNumber(value: string): number | undefined {
  if (!value || value === '.') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, allowDecimal = false, onBlur, ...props }, ref) => {
    // Пока поле в фокусе показываем ровно то, что набрал пользователь
    // («10.» или «007» ещё не равны числу из формы), после blur — значение формы.
    const [draft, setDraft] = useState<string | null>(null)

    const display = draft ?? (value === null || value === undefined ? '' : String(value))

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const next = sanitize(event.target.value, allowDecimal)
      setDraft(next)
      onValueChange(toNumber(next))
    }

    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      setDraft(null)
      onBlur?.(event)
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        autoComplete="off"
        {...props}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    )
  }
)

NumberInput.displayName = 'NumberInput'
