import * as React from 'react'
import { UZ_CITY_CODES, getCityLabel } from '@eventflow/i18n'
import { useT } from '@eventflow/i18n/react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './shadcn/select'

export type CitySelectProps = {
  value: string | null | undefined
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * Локализованный Select для городов Узбекистана.
 * Хранит stable code (e.g. "tashkent"), отображает по UI-локали.
 */
export function CitySelect({
  value,
  onChange,
  placeholder,
  disabled,
  id,
  className,
}: CitySelectProps) {
  const t = useT()
  const cityLabel = getCityLabel(t)
  const fallbackPlaceholder = t('events.form.cityPlaceholder')

  // Опции сортированы по локализованному имени для лучшего UX.
  const options = React.useMemo(() => {
    const items = UZ_CITY_CODES.map(code => ({ code, label: cityLabel(code) }))
    return items.sort((a, b) => a.label.localeCompare(b.label))
  }, [cityLabel])

  return (
    <Select
      value={value ?? ''}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder ?? fallbackPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.code} value={opt.code}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
