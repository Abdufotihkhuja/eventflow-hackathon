import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { XCircle, Loader2, CheckCircle2, LogOut } from 'lucide-react'
import { formatDateTime } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import { clearAuthTokens, getAccessToken } from '@api/config'
import { speakersService } from '@api/services'
import type { SpeakerInvitation } from '@api/services'
import type { ApiError } from '@api/index'
import { Button, Card } from '@shared/ui'
import { cn } from '@shared/lib/cn'

import { InvitationAuthGate } from '../../ui/invitation-auth-gate'

export default function RejectInvitationPage() {
  const { locale, t } = useI18n()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<SpeakerInvitation | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Сессия читается из localStorage — после входа/регистрации на этой же
  // странице состояние нужно пересчитать вручную.
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAccessToken())
  // 400 от бэкенда здесь означает «email аккаунта не совпадает с приглашённым».
  const [wrongAccount, setWrongAccount] = useState(false)

  useEffect(() => {
    if (!token) {
      setError(t('events.speakerInvitations.errors.missingToken'))
      setLoading(false)
      return
    }

    // Загружаем информацию о приглашении
    const loadInvitation = async () => {
      try {
        const data = await speakersService.getInvitation(token)
        setInvitation(data)
        setLoading(false)
      } catch (err) {
        setError((err as ApiError)?.message || t('events.speakerInvitations.errors.loadFailed'))
        setLoading(false)
      }
    }

    loadInvitation()
  }, [token, t])

  const handleReject = async () => {
    if (!token) return

    setRejecting(true)
    setError(null)

    try {
      await speakersService.rejectInvitation({ token, reason: reason || undefined })
      setRejected(true)
    } catch (err) {
      const apiError = err as ApiError
      setWrongAccount(apiError?.status === 400)
      setError(apiError?.message || t('events.speakerInvitations.errors.rejectFailed'))
    } finally {
      setRejecting(false)
    }
  }

  const handleSwitchAccount = () => {
    clearAuthTokens()
    // Перезагружаем ту же ссылку: токен остаётся в URL, гейт покажет форму входа.
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">{t('events.speakerInvitations.loading')}</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft">
              <XCircle className="h-10 w-10 text-danger-soft-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('common.error')}</h1>
              <p className="mt-2 text-muted-foreground">{error}</p>
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">{t('navigation.home')}</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (rejected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t('events.speakerInvitations.rejectedTitle')}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {t('events.speakerInvitations.rejectedDescription')}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('events.speakerInvitations.thanksForReview')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  const eventDate = new Date(invitation.eventStartDate)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl overflow-hidden shadow-soft-lg">
        {/* Header band */}
        <div className="bg-destructive p-8 text-destructive-foreground">
          <h1 className="text-3xl font-bold">{t('events.speakerInvitations.rejectTitle')}</h1>
          <p className="mt-2 text-destructive-foreground/85">
            {t('events.speakerInvitations.rejectPrompt')}
          </p>
        </div>

        <div className="p-8">
          {/* Event Info */}
          <div className="mb-6 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{invitation.eventTitle}</h2>
              <p className="mt-1 text-muted-foreground">
                {t('events.speakerInvitations.organizer', {
                  organizerName: invitation.organizationName,
                })}
              </p>
              <p className="text-muted-foreground">
                {formatDateTime(eventDate, locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Reason Input */}
          {isAuthenticated && !wrongAccount && (
            <div className="mb-6">
              <label htmlFor="reason" className="mb-2 block text-sm font-medium text-muted-foreground">
                {t('events.speakerInvitations.rejectReasonLabel')}
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={t('events.speakerInvitations.rejectReasonPlaceholder')}
                className={cn(
                  'min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                  'focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/30'
                )}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('events.speakerInvitations.characterCount', { count: reason.length, max: 500 })}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg border border-danger-soft bg-danger-soft p-4">
              <p className="text-sm font-medium text-danger-soft-foreground">{error}</p>
            </div>
          )}

          {/* Actions */}
          {isAuthenticated ? (
            wrongAccount ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('events.speakerInvitations.wrongAccountDescription', {
                    email: invitation.invitedEmail ?? '',
                  })}
                </p>
                <Button variant="outline" className="h-12 w-full" onClick={handleSwitchAccount}>
                  <LogOut className="mr-2 h-5 w-5" />
                  {t('events.speakerInvitations.logoutAndSwitch')}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleReject}
                  disabled={rejecting}
                  variant="destructive"
                  className="h-12 flex-1 text-lg"
                >
                  {rejecting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('events.speakerInvitations.rejecting')}
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-5 w-5" />
                      {t('events.speakerInvitations.reject')}
                    </>
                  )}
                </Button>
                <Button asChild variant="outline" className="h-12 flex-1">
                  <Link to={`/speaker-invitation/accept?token=${token}`}>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {t('events.speakerInvitations.backToAccept')}
                  </Link>
                </Button>
              </div>
            )
          ) : (
            <InvitationAuthGate
              invitation={invitation}
              onAuthenticated={() => {
                setError(null)
                setIsAuthenticated(true)
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted px-8 py-4 text-center text-sm text-muted-foreground">
          <p>{t('events.speakerInvitations.rejectFooter')}</p>
          <p className="mt-2">{t('workspace.footer.copyright')}</p>
        </div>
      </Card>
    </div>
  )
}
