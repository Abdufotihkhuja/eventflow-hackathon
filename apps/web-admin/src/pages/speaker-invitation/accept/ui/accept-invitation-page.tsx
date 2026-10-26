import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react'

import { speakersService } from '@api/services'
import type { SpeakerInvitation } from '@api/services'
import { Button, Card } from '@shared/ui'

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<SpeakerInvitation | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Токен приглашения не указан')
      setLoading(false)
      return
    }

    // Загружаем информацию о приглашении
    const loadInvitation = async () => {
      try {
        const data = await speakersService.getInvitation(token)
        setInvitation(data)
        setLoading(false)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Не удалось загрузить приглашение')
        setLoading(false)
      }
    }

    loadInvitation()
  }, [token])

  const handleAccept = async () => {
    if (!token) return

    setAccepting(true)
    setError(null)

    try {
      await speakersService.acceptInvitation({ token })
      setAccepted(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не удалось принять приглашение')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Загрузка приглашения...</p>
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
              <h1 className="text-2xl font-bold text-foreground">Ошибка</h1>
              <p className="mt-2 text-muted-foreground">{error}</p>
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">На главную</Link>
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
              <h1 className="text-3xl font-bold text-foreground">Приглашение принято!</h1>
              <p className="mt-3 text-lg text-muted-foreground">
                Спасибо, что согласились выступить на мероприятии{' '}
                <strong>{invitation?.eventTitle}</strong>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Организатор свяжется с вами для уточнения деталей
              </p>
            </div>
            <div className="mt-6 w-full space-y-3">
              <Button asChild className="w-full">
                <a href={`https://eventflow.uz/events/${invitation?.eventId}`}>
                  Посмотреть мероприятие
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
  const expiresAt = new Date(invitation.expiresAt)
  const isExpired = invitation.status === 'expired' || expiresAt < new Date()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl overflow-hidden shadow-soft-lg">
        {/* Header band */}
        <div className="bg-primary p-8 text-primary-foreground">
          <h1 className="text-3xl font-bold">Приглашение выступить</h1>
          <p className="mt-2 text-primary-foreground/85">
            Организация <strong>{invitation.organizerName}</strong> приглашает вас выступить в
            качестве спикера
          </p>
        </div>

        <div className="p-8">
          {/* Event Info */}
          <div className="mb-6 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{invitation.eventTitle}</h2>
              <p className="mt-1 text-muted-foreground">
                {eventDate.toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="rounded-lg border border-warning-soft bg-warning-soft p-4">
              <p className="text-sm font-medium text-warning-soft-foreground">
                <strong>Обратите внимание:</strong> Для принятия приглашения вам необходимо сначала
                зарегистрироваться в системе EventFlow.
              </p>
            </div>
          </div>

          {/* Invitation Details */}
          <div className="mb-6 space-y-3 rounded-lg bg-muted p-4 text-sm">
            <h3 className="font-semibold text-foreground">Важная информация:</h3>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                Это приглашение действительно в течение <strong>48 часов</strong>
              </li>
              <li>После принятия приглашения вы сможете увидеть мероприятие в своем календаре</li>
              <li>Вы сможете обновить информацию о себе в профиле спикера после принятия</li>
            </ul>
          </div>

          {/* Status Check */}
          {isExpired && (
            <div className="mb-6 rounded-lg border border-danger-soft bg-danger-soft p-4">
              <p className="text-sm font-medium text-danger-soft-foreground">
                К сожалению, срок действия этого приглашения истёк
              </p>
            </div>
          )}

          {invitation.status === 'accepted' && (
            <div className="mb-6 rounded-lg border border-success-soft bg-success-soft p-4">
              <p className="text-sm font-medium text-success-soft-foreground">Вы уже приняли это приглашение</p>
            </div>
          )}

          {invitation.status === 'rejected' && (
            <div className="mb-6 rounded-lg border border-border bg-muted p-4">
              <p className="text-sm font-medium text-muted-foreground">Вы отклонили это приглашение</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg border border-danger-soft bg-danger-soft p-4">
              <p className="text-sm font-medium text-danger-soft-foreground">{error}</p>
            </div>
          )}

          {/* Actions */}
          {invitation.status === 'pending' && !isExpired && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="h-12 flex-1 text-lg"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Принимаем...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Принять приглашение
                  </>
                )}
              </Button>
              <Button asChild variant="outline" className="h-12 flex-1">
                <Link to={`/speaker-invitation/reject?token=${token}`}>
                  <XCircle className="mr-2 h-5 w-5" />
                  Отклонить
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted px-8 py-4 text-center text-sm text-muted-foreground">
          <p>Если вы получили это письмо по ошибке, просто проигнорируйте его.</p>
          <p className="mt-2">© EventFlow — Платформа для управления мероприятиями</p>
        </div>
      </Card>
    </div>
  )
}
