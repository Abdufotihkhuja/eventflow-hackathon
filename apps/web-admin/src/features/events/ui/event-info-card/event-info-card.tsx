/**
 * Карточка «Важная информация» для страницы события (организатор и супер-админ).
 * Единый блок: даты, формат, тип доступа, участники, дедлайн, тип события.
 *
 * Все строки локализованы через локальный словарь на 3 языка (ru/uz/en) —
 * не зависит от runtime-состояния @eventflow/i18n. Date-fns форматирует
 * через нативную локаль текущего языка интерфейса.
 */

import * as React from 'react'
import { format } from 'date-fns'
import { enUS, ru, uz } from 'date-fns/locale'
import { Calendar, Clock, Ticket, Users, MapPin, Video } from 'lucide-react'
import { useLocale, useT } from '@eventflow/i18n/react'

import {
  getAccessTypeLabel,
  getEventFormatLabel,
  getEventTypeLabel,
} from '@entities/event'
import { cn } from '@shared/lib/cn'
import { Card } from '@shared/ui'

export type EventInfoCardProps = {
  startDate: string
  endDate?: string | null
  format: 'ONLINE' | 'OFFLINE' | 'HYBRID'
  accessType: 'OPEN' | 'REQUEST' | 'INVITE_ONLY' | 'PRIVATE'
  registrationsCount: number
  maxParticipants?: number | null
  registrationDeadline?: string | null
  type: 'FREE' | 'PAID'
  inviteCode?: string | null
  price?: number | string | null
  currency?: string | null
  className?: string
}

type UiLocale = 'ru' | 'uz' | 'en'
type CardLabels = {
  importantInfo: string
  startDate: string
  endDate: string
  format: string
  accessType: string
  inviteCode: string
  participants: string
  registrationDeadline: string
  type: string
  price: string
}

const CARD_LABELS: Record<UiLocale, CardLabels> = {
  ru: {
    importantInfo: 'Важная информация',
    startDate: 'Дата начала',
    endDate: 'Дата окончания',
    format: 'Формат',
    accessType: 'Тип доступа',
    inviteCode: 'Код приглашения',
    participants: 'Участники',
    registrationDeadline: 'Дедлайн регистрации',
    type: 'Тип',
    price: 'Стоимость',
  },
  uz: {
    importantInfo: "Muhim ma'lumot",
    startDate: 'Boshlanish sanasi',
    endDate: 'Tugash sanasi',
    format: 'Format',
    accessType: 'Kirish turi',
    inviteCode: 'Taklif kodi',
    participants: 'Ishtirokchilar',
    registrationDeadline: "Ro'yxatdan o'tish muddati",
    type: 'Turi',
    price: 'Narxi',
  },
  en: {
    importantInfo: 'Important information',
    startDate: 'Start date',
    endDate: 'End date',
    format: 'Format',
    accessType: 'Access type',
    inviteCode: 'Invite code',
    participants: 'Participants',
    registrationDeadline: 'Registration deadline',
    type: 'Type',
    price: 'Price',
  },
}

const DATE_FNS_LOCALES = { ru, uz, en: enUS } as const
const LONG_DATE_FORMAT: Record<UiLocale, string> = {
  ru: 'd MMMM yyyy, HH:mm',
  uz: 'd MMMM yyyy, HH:mm',
  en: 'MMMM d, yyyy, HH:mm',
}
const SHORT_DATE_FORMAT: Record<UiLocale, string> = {
  ru: 'd MMM yyyy, HH:mm',
  uz: 'd MMM yyyy, HH:mm',
  en: 'MMM d, yyyy, HH:mm',
}

function isUiLocale(value: string): value is UiLocale {
  return value === 'ru' || value === 'uz' || value === 'en'
}

function useResolvedLocale(): UiLocale {
  const locale = useLocale()
  return isUiLocale(locale) ? locale : 'ru'
}

function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function EventInfoCard({
  startDate,
  endDate,
  format: eventFormat,
  accessType,
  registrationsCount,
  maxParticipants,
  registrationDeadline,
  type,
  inviteCode,
  price,
  currency,
  className,
}: EventInfoCardProps) {
  const t = useT()
  const uiLocale = useResolvedLocale()
  const labels = CARD_LABELS[uiLocale]
  const dateLocale = DATE_FNS_LOCALES[uiLocale]

  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null

  return (
    <Card className={cn('p-4', className)}>
      <h3 className="mb-4 text-sm font-semibold text-foreground">{labels.importantInfo}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoRow
          icon={Calendar}
          label={labels.startDate}
          value={format(start, LONG_DATE_FORMAT[uiLocale], { locale: dateLocale })}
        />
        {end && (
          <InfoRow
            icon={Calendar}
            label={labels.endDate}
            value={format(end, LONG_DATE_FORMAT[uiLocale], { locale: dateLocale })}
          />
        )}
        <InfoRow
          icon={eventFormat === 'ONLINE' ? Video : MapPin}
          label={labels.format}
          value={getEventFormatLabel(t)(eventFormat)}
        />
        <InfoRow
          icon={Ticket}
          label={labels.accessType}
          value={getAccessTypeLabel(t)(accessType)}
        />
        {inviteCode && (
          <InfoRow icon={Ticket} label={labels.inviteCode} value={inviteCode} />
        )}
        <InfoRow
          icon={Users}
          label={labels.participants}
          value={
            maxParticipants
              ? `${registrationsCount} / ${maxParticipants}`
              : String(registrationsCount)
          }
        />
        {registrationDeadline && (
          <InfoRow
            icon={Clock}
            label={labels.registrationDeadline}
            value={format(new Date(registrationDeadline), SHORT_DATE_FORMAT[uiLocale], {
              locale: dateLocale,
            })}
          />
        )}
        <InfoRow icon={Ticket} label={labels.type} value={getEventTypeLabel(t)(type)} />
        {type === 'PAID' && price != null && Number(price) > 0 && (
          <InfoRow
            icon={Ticket}
            label={labels.price}
            value={`${Number(price).toLocaleString()} ${currency ?? 'UZS'}`}
          />
        )}
      </div>
    </Card>
  )
}
