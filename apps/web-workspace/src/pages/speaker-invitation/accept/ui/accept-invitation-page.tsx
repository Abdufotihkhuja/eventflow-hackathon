import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle, ArrowRight, LogOut } from 'lucide-react'
import { formatDateTime } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import { clearAuthTokens, getAccessToken } from '@api/config'
import { speakersService } from '@api/services'
import type { SpeakerInvitation } from '@api/services'
import type { ApiError } from '@api/index'
import { Button, Card } from '@shared/ui'

import { InvitationAuthGate } from '../../ui/invitation-auth-gate'

export default function AcceptInvitationPage() {
  const { locale, t } = useI18n()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<SpeakerInvitation | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Сессия читается из localStorage, поэтому после входа/регистрации на этой же
  // странице состояние нужно пересчитать вручную.
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAccessToken())
  // Бэкенд отдаёт 400, если email аккаунта не совпадает с приглашённым —
  // единственный выход отсюда — сменить аккаунт.
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

  const handleAccept = async () => {
    if (!token) return

    setAccepting(true)
    setError(null)

    try {
      await speakersService.acceptInvitation({ token })
      setAccepted(true)
    } catch (err) {
      const apiError = err as ApiError
      setWrongAccount(apiError?.status === 400)
      setError(apiError?.message || t('events.speakerInvitations.errors.acceptFailed'))
    } finally {
      setAccepting(false)
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

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success">
              <CheckCircle2 className="h-12 w-12 text-success-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t('events.speakerInvitations.acceptedTitle')}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {t('events.speakerInvitations.acceptedDescription', {
                  eventTitle: invitation?.eventTitle,
                })}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('events.speakerInvitations.organizerWillContact')}
              </p>
            </div>
            <div className="mt-6 w-full space-y-3">
              <Button asChild className="w-full">
                <a href={`https://eventflow.uz/events/${invitation?.eventId}`}>
                  {t('events.speakerInvitations.viewEvent')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
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
        <div className="bg-primary p-8 text-primary-foreground">
          <h1 className="text-3xl font-bold">{t('events.speakerInvitations.acceptTitle')}</h1>
          <p className="mt-2 text-primary-foreground/85">
            {t('events.speakerInvitations.invitedBy', {
              organizerName: invitation.organizationName,
            })}
          </p>
        </div>

        <div className="p-8">
          {/* Event Info */}
          <div className="mb-6 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{invitation.eventTitle}</h2>
              <p className="mt-1 text-muted-foreground">
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

          {/* Invitation Details */}
          <div className="mb-6 space-y-3 rounded-lg bg-muted p-4 text-sm">
            <h3 className="font-semibold text-foreground">
              {t('events.speakerInvitations.importantInfo')}
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              {/* 48 часов — MEMBER_INVITATION_EXPIRY_HOURS на бэкенде. */}
              <li>{t('events.speakerInvitations.validFor', { hours: 48 })}</li>
              <li>{t('events.speakerInvitations.calendarAfterAccept')}</li>
              <li>{t('events.speakerInvitations.profileAfterAccept')}</li>
            </ul>
          </div>

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
                <Button onClick={handleAccept} disabled={accepting} className="h-12 flex-1 text-lg">
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('events.speakerInvitations.accepting')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      {t('events.speakerInvitations.accept')}
                    </>
                  )}
                </Button>
                <Button asChild variant="outline" className="h-12 flex-1">
                  <Link to={`/speaker-invitation/reject?token=${token}`}>
                    <XCircle className="mr-2 h-5 w-5" />
                    {t('actions.reject')}
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
          <p>{t('events.speakerInvitations.ignoreIfMistake')}</p>
          <p className="mt-2">{t('workspace.footer.copyright')}</p>
        </div>
      </Card>
    </div>
  )
}
