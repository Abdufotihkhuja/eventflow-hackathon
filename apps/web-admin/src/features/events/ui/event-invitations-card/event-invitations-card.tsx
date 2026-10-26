/**
 * Блок «Приглашения» для событий INVITE_ONLY: ссылка, копирование, отправка на email, регенерация кода.
 */

import { useState, useCallback } from 'react'
import { Check, Copy, Loader2, Mail, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { useInviteLinkQuery, useSendInvitation, useRegenerateInviteCode } from '../../api'
import { cn } from '@shared/lib/cn'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@shared/ui'

export type EventInvitationsCardProps = {
  eventId: string
  eventTitle: string
  className?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function useCopyFeedback(delayMs = 2000) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(
    async (text: string, successLabel: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success(successLabel)
        setTimeout(() => setCopied(false), delayMs)
      } catch {
        toast.error('Не удалось скопировать')
      }
    },
    [delayMs]
  )
  return { copied, copy }
}

export function EventInvitationsCard({
  eventId,
  eventTitle,
  className,
}: EventInvitationsCardProps) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  const {
    data: inviteData,
    isLoading: linkLoading,
    isError: linkError,
  } = useInviteLinkQuery(eventId, true)
  const sendInvitation = useSendInvitation(eventId)
  const regenerate = useRegenerateInviteCode()

  const { copied: linkCopied, copy: copyLink } = useCopyFeedback()
  const { copied: codeCopied, copy: copyCode } = useCopyFeedback()

  const handleCopyLink = () => {
    if (inviteData?.inviteLink) copyLink(inviteData.inviteLink, 'Ссылка скопирована')
  }

  const handleCopyCode = () => {
    if (inviteData?.inviteCode) copyCode(inviteData.inviteCode, 'Код скопирован')
  }

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)
    const trimmed = email.trim()
    if (!trimmed) {
      setEmailError('Введите email')
      return
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Введите корректный email')
      return
    }
    sendInvitation.mutate(trimmed, {
      onSuccess: () => {
        setEmail('')
        setSendDialogOpen(false)
      },
    })
  }

  return (
    <Card className={cn('p-5', className)}>
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Приглашения</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Поделитесь ссылкой или отправьте приглашение на email. Получатель сможет
            зарегистрироваться по ссылке с уже подставленным кодом.
          </p>
        </div>

        {linkLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Загрузка ссылки приглашения...
          </div>
        )}

        {linkError && (
          <p className="text-sm text-destructive">
            Не удалось загрузить ссылку приглашения. Проверьте, что событие имеет тип доступа
            «Только по приглашению».
          </p>
        )}

        {inviteData && !linkLoading && (
          <>
            {/* Ссылка */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ссылка для регистрации</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteData.inviteLink}
                  className="font-mono text-sm"
                  aria-label="Ссылка приглашения"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleCopyLink}
                  aria-label="Копировать ссылку"
                  title="Копировать ссылку"
                >
                  {linkCopied ? (
                    <Check className="h-4 w-4 text-success" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
            </div>

            {/* Код */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Код приглашения</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteData.inviteCode}
                  className="font-mono"
                  aria-label="Код приглашения"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleCopyCode}
                  aria-label="Копировать код"
                  title="Копировать код"
                >
                  {codeCopied ? (
                    <Check className="h-4 w-4 text-success" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
            </div>

            {/* Действия */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Отправить на email
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" aria-describedby="send-invitation-desc">
                  <DialogHeader>
                    <DialogTitle>Отправить приглашение</DialogTitle>
                    <DialogDescription id="send-invitation-desc">
                      На указанный email будет отправлено письмо со ссылкой на регистрацию для
                      мероприятия «{eventTitle}».
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSendSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invitation-email">Email</Label>
                      <Input
                        id="invitation-email"
                        type="email"
                        placeholder="guest@example.com"
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value)
                          setEmailError(null)
                        }}
                        disabled={sendInvitation.isPending}
                        autoComplete="email"
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? 'invitation-email-error' : undefined}
                        className={cn(emailError && 'border-destructive')}
                      />
                      {emailError && (
                        <p
                          id="invitation-email-error"
                          className="text-sm text-destructive"
                          role="alert"
                        >
                          {emailError}
                        </p>
                      )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSendDialogOpen(false)}
                        disabled={sendInvitation.isPending}
                      >
                        Отмена
                      </Button>
                      <Button type="submit" disabled={sendInvitation.isPending}>
                        {sendInvitation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Отправка...
                          </>
                        ) : (
                          'Отправить'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={regenerate.isPending}
                onClick={() => regenerate.mutate(eventId)}
              >
                {regenerate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Регенерировать код
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
