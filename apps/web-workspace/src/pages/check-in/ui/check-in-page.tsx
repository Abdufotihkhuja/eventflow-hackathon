/**
 * Страница check-in по QR коду из билета.
 * Документация: docs/CHECK_IN_FRONTEND.md
 * URL: /check-in или /check-in?code=<uuid>
 * Доступ: организатор, сотрудник (member).
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  Calendar,
  CalendarClock,
  Clock,
  Ticket,
  QrCode,
} from 'lucide-react'

import { API_BASE_URL } from '@api/config'
import { useAuth } from '@entities/auth'
import { useCheckInByCode } from '@features/events'
import type { CheckInByCodeResponse } from '@api/services/attendance.types'
import type { ApiError } from '@api/types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
} from '@shared/ui'
import { formatDate, formatTime } from '@shared/lib'

/** Сообщения об ошибках по коду ответа (docs/CHECK_IN_FRONTEND.md, раздел 4 и п. 6 офлайн) */
function getCheckInErrorMessage(
  t: ReturnType<typeof useT>,
  status: number | undefined,
  backendMessage?: string,
  isNetworkError?: boolean
): string {
  if (isNetworkError) return t('events.checkIn.errors.network')
  if (backendMessage) return backendMessage
  switch (status) {
    case 400:
      return t('events.checkIn.errors.notAllowed')
    case 403:
      return t('events.checkIn.errors.forbidden')
    case 404:
      return t('events.checkIn.errors.notFound')
    case 409:
      return t('events.checkIn.errors.alreadyCheckedIn')
    default:
      return t('events.checkIn.errors.default')
  }
}

export default function CheckInPage() {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, isOrganization, isMember } = useAuth()

  const codeFromUrl = searchParams.get('code')
  const [hasTriggered, setHasTriggered] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [lastSuccessData, setLastSuccessData] = useState<CheckInByCodeResponse | null>(null)

  const checkInMutation = useCheckInByCode()

  const canPerformCheckIn = isAuthenticated && (isOrganization || isMember)

  const clearCodeFromUrl = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const handleSuccessAndReadyForNext = useCallback(() => {
    setLastSuccessData(null)
    setManualCode('')
    checkInMutation.reset()
  }, [checkInMutation])

  // Автоматический check-in при загрузке с code в URL (вариант 5.1.1)
  useEffect(() => {
    if (!codeFromUrl) return
    if (!canPerformCheckIn) return
    if (hasTriggered) return
    if (checkInMutation.isSuccess || checkInMutation.isError) return

    setHasTriggered(true)
    checkInMutation.mutate(codeFromUrl)
  }, [codeFromUrl, canPerformCheckIn, hasTriggered, checkInMutation])

  // После успеха: сохраняем результат, очищаем URL, сбрасываем мутацию
  useEffect(() => {
    if (checkInMutation.isSuccess && checkInMutation.data) {
      setLastSuccessData(checkInMutation.data)
      clearCodeFromUrl()
      checkInMutation.reset()
    }
  }, [checkInMutation.isSuccess, checkInMutation.data, clearCodeFromUrl, checkInMutation])

  const submitManualCode = () => {
    const value = manualCode.trim()
    if (!value) return
    checkInMutation.mutate(value)
  }

  // Не авторизован
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {t('events.checkIn.authRequiredTitle')}
            </CardTitle>
            <CardDescription>{t('events.checkIn.authRequiredDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('events.checkIn.authRequiredHint')}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/login')} className="flex-1">
                {t('navigation.login')}
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
                {t('actions.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Нет прав (не организатор, не сотрудник, не супер-админ)
  if (!canPerformCheckIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {t('events.checkIn.forbiddenTitle')}
            </CardTitle>
            <CardDescription>{t('events.checkIn.forbiddenDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('events.checkIn.forbiddenHint')}
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              {t('events.checkIn.backHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Выполняется запрос
  if (checkInMutation.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('events.checkIn.processingTitle')}
            </CardTitle>
            <CardDescription>{t('events.checkIn.processingDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Успех: показываем сохранённый результат и «Готов к следующему»
  if (lastSuccessData) {
    const data = lastSuccessData
    const participant = data.participant
    const baseUrl = API_BASE_URL.replace(/\/$/, '')
    const brandedUrl = data.ticketUrls.branded
      ? `${baseUrl}${data.ticketUrls.branded.startsWith('/') ? '' : '/'}${data.ticketUrls.branded}`
      : ''
    const simpleUrl = data.ticketUrls.simple
      ? `${baseUrl}${data.ticketUrls.simple.startsWith('/') ? '' : '/'}${data.ticketUrls.simple}`
      : ''

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-success-soft bg-success-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success-soft-foreground">
              <CheckCircle2 className="h-6 w-6" />
              {t('events.checkIn.successTitle')}
            </CardTitle>
            <CardDescription className="text-success-soft-foreground">
              {t('events.checkIn.successDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <UserCheck className="h-5 w-5 text-primary" />
                {participant.firstName} {participant.lastName}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                {participant.email && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Email:</span>
                    <span>{participant.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-card p-4">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t('events.checkIn.checkInTime')}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(data.attendance.checkInAt)}
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {formatTime(data.attendance.checkInAt)}
                </div>
                {/* Куда засчитана отметка: оператору важно видеть, что попал
                    именно в то окно, которое сейчас идёт. */}
                <div className="mt-2 flex items-center gap-2 border-t border-border pt-2 text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {data.checkpoint ? (
                    <span className="font-medium text-foreground">
                      {data.checkpoint.name}
                    </span>
                  ) : (
                    <span>{t('events.checkIn.noCheckpoint')}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-card p-4">
              <div className="mb-3 flex items-center gap-2 font-medium">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                {t('events.checkIn.tickets')}
              </div>
              <div className="flex gap-2">
                {brandedUrl && (
                  <Button asChild size="sm" className="flex-1">
                    <a href={brandedUrl} target="_blank" rel="noopener noreferrer">
                      {t('events.checkIn.brandedTicket')}
                    </a>
                  </Button>
                )}
                {simpleUrl && (
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <a href={simpleUrl} target="_blank" rel="noopener noreferrer">
                      {t('events.checkIn.simpleTicket')}
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleSuccessAndReadyForNext} className="w-full" size="lg">
                {t('events.checkIn.nextParticipant')}
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {t('events.checkIn.dashboard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Ошибка check-in: сообщение по статусу (п. 4 доки) и офлайн (п. 6)
  if (checkInMutation.isError) {
    const err = checkInMutation.error as ApiError | undefined
    const message = getCheckInErrorMessage(t, err?.status, err?.message, err?.isNetworkError)
    const codeToRetry = codeFromUrl ?? manualCode.trim()

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-danger-soft bg-danger-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              {t('events.checkIn.errorTitle')}
            </CardTitle>
            <CardDescription className="text-destructive">{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              {codeToRetry && (
                <Button
                  onClick={() => checkInMutation.mutate(codeToRetry)}
                  variant="destructive"
                  className="w-full"
                >
                  {t('actions.retry')}
                </Button>
              )}
              <Button
                onClick={() => {
                  checkInMutation.reset()
                  setManualCode('')
                  clearCodeFromUrl()
                }}
                variant="outline"
                className="w-full"
              >
                {t('events.checkIn.enterAnotherCode')}
              </Button>
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                {t('events.checkIn.dashboard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Нет code в URL: форма ручного ввода (вариант C — гибрид, п. 5.2)
  if (!codeFromUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t('events.checkIn.manualTitle')}
            </CardTitle>
            <CardDescription>
              {t('events.checkIn.manualDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="check-in-code">
                {t('events.checkIn.codeLabel')}
              </label>
              <Input
                id="check-in-code"
                placeholder={t('events.checkIn.codePlaceholder')}
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitManualCode()}
                className="font-mono"
              />
            </div>
            <Button
              onClick={submitManualCode}
              className="w-full"
              size="lg"
              disabled={!manualCode.trim()}
            >
              {t('events.checkIn.submit')}
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              {t('events.checkIn.dashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
