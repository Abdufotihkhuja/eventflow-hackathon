/**
 * «Приглашения» for PRIVATE events: progress summary, status-grouped guest list
 * (pending first) and an invite dialog with email chips. Each guest gets a
 * personal one-use link; resend issues a new link and voids the old one.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, Loader2, RotateCw, UserPlus, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatDateTime } from '@eventflow/i18n'
import { useI18n } from '@eventflow/i18n/react'

import type { EventInvitation } from '@api/services'
import { cn } from '@shared/lib/cn'
import {
  Button,
  Card,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StatusPill,
  type StatusPillTone,
} from '@shared/ui'

import {
  usePrivateInvitationAction,
  usePrivateInvitationsQuery,
  useSendPrivateInvitations,
} from '../../api'
import { MAX_INVITATION_EMAILS, isEmail, parseEmailList } from '../../lib/parse-email-list'

export type PrivateInvitationsCardProps = {
  eventId: string
  eventTitle: string
  /** Links open the public page, which exists only once the event is published. */
  isPublished: boolean
  className?: string
}

type Status = EventInvitation['status']

const GROUPS: { status: Status; tone: StatusPillTone; barClass: string }[] = [
  { status: 'PENDING', tone: 'warning', barClass: 'bg-warning' },
  { status: 'ACCEPTED', tone: 'success', barClass: 'bg-success' },
  { status: 'REVOKED', tone: 'neutral', barClass: 'bg-border' },
]

export function PrivateInvitationsCard({
  eventId,
  eventTitle,
  isPublished,
  className,
}: PrivateInvitationsCardProps) {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: invitations = [], isLoading, isError } = usePrivateInvitationsQuery(eventId)

  const byStatus = useMemo(() => {
    const map: Record<Status, EventInvitation[]> = { PENDING: [], ACCEPTED: [], REVOKED: [] }
    for (const invitation of invitations) map[invitation.status].push(invitation)
    return map
  }, [invitations])

  return (
    <Card className={cn('space-y-4 p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            {t('events.privateInvitations.title')}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isPublished
              ? t('events.privateInvitations.description')
              : t('events.privateInvitations.publishFirst')}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          disabled={!isPublished}
          onClick={() => setDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          {t('events.privateInvitations.invite')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t('events.privateInvitations.loading')}
        </div>
      )}
      {isError && (
        <p className="text-sm text-destructive">{t('events.privateInvitations.loadError')}</p>
      )}

      {!isLoading && !isError && invitations.length > 0 && (
        <>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            {GROUPS.map(g => (
              <span
                key={g.status}
                className={g.barClass}
                style={{ width: `${(byStatus[g.status].length / invitations.length) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 tabular-nums">
            {GROUPS.map(g => (
              <div key={g.status} className="flex flex-col">
                <strong className="text-xl font-extrabold leading-tight">
                  {byStatus[g.status].length}
                </strong>
                <span className="text-xs text-muted-foreground">
                  {t(`events.privateInvitations.status.${g.status}`)}
                </span>
              </div>
            ))}
          </div>

          <div className="divide-y divide-border">
            {GROUPS.map(g =>
              byStatus[g.status].length === 0 ? null : (
                <InvitationGroup
                  key={g.status}
                  title={t(`events.privateInvitations.group.${g.status}`)}
                  count={byStatus[g.status].length}
                  defaultOpen={g.status === 'PENDING'}
                >
                  {byStatus[g.status].map(invitation => (
                    <InvitationRow
                      key={invitation.id}
                      eventId={eventId}
                      invitation={invitation}
                      tone={g.tone}
                      canSend={isPublished}
                    />
                  ))}
                </InvitationGroup>
              )
            )}
          </div>
        </>
      )}

      {!isLoading && !isError && invitations.length === 0 && isPublished && (
        <p className="text-sm text-muted-foreground">{t('events.privateInvitations.empty')}</p>
      )}

      <InviteDialog
        eventId={eventId}
        eventTitle={eventTitle}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  )
}

function InvitationGroup({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string
  count: number
  defaultOpen: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2.5 text-left text-sm font-semibold">
        <span>
          {title} <span className="ml-1 font-medium text-muted-foreground tabular-nums">{count}</span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-2">{children}</CollapsibleContent>
    </Collapsible>
  )
}

function InvitationRow({
  eventId,
  invitation,
  tone,
  canSend,
}: {
  eventId: string
  invitation: EventInvitation
  tone: StatusPillTone
  canSend: boolean
}) {
  const { t, locale } = useI18n()
  const action = usePrivateInvitationAction(eventId)
  const busy = action.isPending

  const meta =
    invitation.status === 'ACCEPTED' && invitation.acceptedAt
      ? t('events.privateInvitations.registeredAt', {
          date: formatDateTime(invitation.acceptedAt, locale),
        })
      : t('events.privateInvitations.sentAt', {
          date: formatDateTime(invitation.lastSentAt, locale),
          count: invitation.sendCount,
        })

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border py-2 first:border-t-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-all text-sm">{invitation.email}</span>
          <StatusPill tone={tone} size="sm">
            {t(`events.privateInvitations.pill.${invitation.status}`)}
          </StatusPill>
        </div>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      {invitation.status !== 'ACCEPTED' && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={busy || !canSend}
            onClick={() => action.mutate({ id: invitation.id, action: 'resend' })}
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            {invitation.status === 'REVOKED'
              ? t('events.privateInvitations.inviteAgain')
              : t('events.privateInvitations.resend')}
          </Button>
          {invitation.status === 'PENDING' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => action.mutate({ id: invitation.id, action: 'revoke' })}
            >
              {t('events.privateInvitations.revoke')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function InviteDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
}: {
  eventId: string
  eventTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const send = useSendPrivateInvitations(eventId)
  const [draft, setDraft] = useState('')

  const schema = useMemo(
    () =>
      z.object({
        emails: z
          .array(z.string())
          .min(1, t('events.privateInvitations.dialog.atLeastOne'))
          .max(
            MAX_INVITATION_EMAILS,
            t('events.privateInvitations.dialog.tooMany', { max: MAX_INVITATION_EMAILS })
          )
          .refine(list => list.every(isEmail), t('events.privateInvitations.dialog.fixInvalid')),
      }),
    [t]
  )
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { emails: [] } })
  const emails = form.watch('emails')
  const invalid = emails.filter(e => !isEmail(e))
  const error = form.formState.errors.emails?.message

  const setEmails = (next: string[]) =>
    form.setValue('emails', next, { shouldValidate: form.formState.isSubmitted })

  const commit = (text: string) => {
    const added = parseEmailList(text, emails)
    if (added.length) setEmails([...emails, ...added])
    setDraft('')
  }

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      form.reset({ emails: [] })
      setDraft('')
    }
  }

  // A typed-but-not-yet-committed address counts too: users press Send without Enter.
  const submit = () => {
    const pending = parseEmailList(draft, emails)
    if (pending.length) {
      setEmails([...emails, ...pending])
      setDraft('')
    }
    void form.handleSubmit(values =>
      send.mutate(values.emails, { onSuccess: () => close(false) })
    )()
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg" aria-describedby="private-invite-desc">
        <DialogHeader>
          <DialogTitle>{t('events.privateInvitations.dialog.title')}</DialogTitle>
          <DialogDescription id="private-invite-desc">
            {t('events.privateInvitations.dialog.description', { eventTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="private-invite-email" className="text-sm font-medium">
            {t('events.privateInvitations.dialog.emailsLabel')}
          </label>
          <div
            className={cn(
              'flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring',
              error && 'border-destructive'
            )}
          >
            {emails.map(email => {
              const ok = isEmail(email)
              return (
                <span
                  key={email}
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm',
                    ok ? 'bg-muted' : 'bg-danger-soft text-destructive'
                  )}
                >
                  {email}
                  <button
                    type="button"
                    className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-2"
                    aria-label={t('events.privateInvitations.dialog.remove', { email })}
                    onClick={() => setEmails(emails.filter(e => e !== email))}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              )
            })}
            <input
              id="private-invite-email"
              value={draft}
              autoComplete="off"
              disabled={send.isPending}
              placeholder={emails.length ? '' : 'guest@example.com'}
              className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
              onChange={e => {
                const value = e.target.value
                if (/[\s,;]$/.test(value)) commit(value)
                else setDraft(value)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commit(draft)
                } else if (e.key === 'Backspace' && !draft && emails.length) {
                  setEmails(emails.slice(0, -1))
                }
              }}
              onPaste={e => {
                e.preventDefault()
                commit(`${draft} ${e.clipboardData.getData('text')}`)
              }}
              onBlur={() => draft && commit(draft)}
            />
          </div>
          {invalid.length > 0 ? (
            <p className="text-sm text-destructive">
              {t('events.privateInvitations.dialog.invalid', { emails: invalid.join(', ') })}
            </p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('events.privateInvitations.dialog.hint', { max: MAX_INVITATION_EMAILS })}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => close(false)} disabled={send.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={submit} disabled={send.isPending || invalid.length > 0}>
            {send.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {t('events.privateInvitations.dialog.send', { count: emails.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
