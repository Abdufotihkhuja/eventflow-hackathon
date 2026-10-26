/**
 * Поле «Код приглашения» для формы регистрации на событие.
 * Показывается только при accessType === INVITE_ONLY и requiresInviteCode === true (данные GET public/events/:id/can-register).
 * Опционально подставляет код из URL ?inviteCode= при первом рендере.
 */

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useCanRegisterQuery } from '../../api'
import { Input, Label } from '@shared/ui'

export type EventRegistrationInviteFieldProps = {
  eventId: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  /** Подставить код из URL ?inviteCode= при загрузке (по умолчанию true) */
  fillFromUrl?: boolean
  className?: string
}

export function EventRegistrationInviteField({
  eventId,
  value,
  onChange,
  error,
  disabled = false,
  fillFromUrl = true,
  className,
}: EventRegistrationInviteFieldProps) {
  const [searchParams] = useSearchParams()
  const { data: canRegister, isLoading } = useCanRegisterQuery(eventId)
  const filledFromUrl = useRef(false)

  const requiresInviteCode =
    canRegister?.accessType === 'INVITE_ONLY' && canRegister?.requiresInviteCode === true

  useEffect(() => {
    if (!fillFromUrl || !requiresInviteCode || filledFromUrl.current) return
    const fromUrl = searchParams.get('inviteCode')?.trim()
    if (fromUrl && !value) {
      filledFromUrl.current = true
      onChange(fromUrl)
    }
  }, [fillFromUrl, requiresInviteCode, value, searchParams, onChange])

  if (isLoading || !requiresInviteCode) return null

  return (
    <div className={className}>
      <Label htmlFor="event-invite-code">Код приглашения</Label>
      <Input
        id="event-invite-code"
        type="text"
        placeholder="Введите код приглашения"
        value={value}
        onChange={e => onChange(e.target.value.trim())}
        disabled={disabled}
        className="mt-1.5"
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={error ? 'event-invite-code-error' : undefined}
      />
      {error && (
        <p id="event-invite-code-error" className="mt-1.5 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
