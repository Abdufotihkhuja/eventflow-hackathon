/**
 * Блок «Приглашения» для событий INVITE_ONLY: ссылка, копирование, отправка на email, регенерация кода.
 */

import { useState, useCallback, useMemo } from 'react'
import { Check, Copy, Loader2, Mail, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useT } from '@eventflow/i18n/react'

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
} from '@shared/ui'

export type EventInvitationsCardProps = {
  eventId: string
  eventTitle: string
  className?: string
}

function useCopyFeedback(delayMs = 2000) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const copy = useCallback(
    async (text: string, successLabel: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success(successLabel)
        setTimeout(() => setCopied(false), delayMs)
      } catch {
        toast.error(t('toasts.events.copiedError'))
      }
    },
    [delayMs, t]
  )
  return { copied, copy }
}

export function EventInvitationsCard({
  eventId,
  eventTitle,
  className,
}: EventInvitationsCardProps) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false)

  const {
    data: inviteData,
    isLoading: linkLoading,
    isError: linkError,
  } = useInviteLinkQuery(eventId, true)
  const sendInvitation = useSendInvitation(eventId)
  const regenerate = useRegenerateInviteCode()

  const { copied: linkCopied, copy: copyLink } = useCopyFeedback()
  const { copied: codeCopied, copy: copyCode } = useCopyFeedback()

  const t = useT()

  const sendSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .min(1, t('validation.required'))
          .email(t('validation.invalidEmail')),
      }),
    [t]
  )
  type SendFormValues = z.infer<typeof sendSchema>

  const form = useForm<SendFormValues>({
    resolver: zodResolver(sendSchema),
    defaultValues: { email: '' },
  })

  const handleCopyLink = () => {
    if (inviteData?.inviteLink) copyLink(inviteData.inviteLink, t('events.invitations.linkCopied'))
  }

  const handleCopyCode = () => {
    if (inviteData?.inviteCode) copyCode(inviteData.inviteCode, t('events.invitations.codeCopied'))
  }

  const handleSendSubmit = (values: SendFormValues) => {
    sendInvitation.mutate(values.email.trim(), {
      onSuccess: () => {
        form.reset({ email: '' })
        setSendDialogOpen(false)
      },
    })
  }

  return (
    <Card className={cn('p-5', className)}>
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t('events.invitations.title')}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('events.invitations.description')}
          </p>
        </div>

        {linkLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            {t('events.invitations.loadingLink')}
          </div>
        )}

        {linkError && (
          <p className="text-sm text-destructive">
            {t('events.invitations.loadLinkError')}
          </p>
        )}

        {inviteData && !linkLoading && (
          <>
            {/* Ссылка */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {t('events.invitations.registrationLink')}
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteData.inviteLink}
                  className="font-mono text-sm"
                  aria-label={t('events.invitations.invitationLinkAria')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleCopyLink}
                  aria-label={t('events.invitations.copyLink')}
                  title={t('events.invitations.copyLink')}
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
              <Label className="text-xs text-muted-foreground">
                {t('events.invitations.invitationCode')}
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteData.inviteCode}
                  className="font-mono"
                  aria-label={t('events.invitations.invitationCodeAria')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleCopyCode}
                  aria-label={t('events.invitations.copyCode')}
                  title={t('events.invitations.copyCode')}
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
              <Dialog
                open={sendDialogOpen}
                onOpenChange={open => {
                  setSendDialogOpen(open)
                  if (!open) form.reset({ email: '' })
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="gap-2">
                    <Mail className="h-4 w-4" />
                    {t('events.invitations.sendToEmail')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" aria-describedby="send-invitation-desc">
                  <DialogHeader>
                    <DialogTitle>{t('events.invitations.sendDialogTitle')}</DialogTitle>
                    <DialogDescription id="send-invitation-desc">
                      {t('events.invitations.sendDialogDescription', { eventTitle })}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSendSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="guest@example.com"
                                autoComplete="email"
                                disabled={sendInvitation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSendDialogOpen(false)}
                          disabled={sendInvitation.isPending}
                        >
                          {t('actions.cancel')}
                        </Button>
                        <Button type="submit" disabled={sendInvitation.isPending}>
                          {sendInvitation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('events.invitations.sending')}
                            </>
                          ) : (
                            t('actions.submit')
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
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
                {t('events.invitations.regenerateCode')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
