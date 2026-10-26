/**
 * Side panel for a single contact request: full message, contact actions
 * (call / copy phone) and the status workflow. Real data only.
 */

import { Ban, CheckCircle2, Copy, Loader2, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'

import type { ContactRequest, ContactRequestStatus } from '@api/services'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@shared/ui'
import { formatDate, formatUserName, getUserInitials } from '@shared/lib'

const STATUS_LABEL: Record<ContactRequestStatus, string> = {
  NEW: 'contacts.status.new',
  IN_PROGRESS: 'contacts.status.inProgress',
  CLOSED: 'contacts.status.closed',
}

const STATUS_BADGE: Record<ContactRequestStatus, 'default' | 'secondary' | 'outline'> = {
  NEW: 'default',
  IN_PROGRESS: 'outline',
  CLOSED: 'secondary',
}

type ContactDetailSheetProps = {
  contact: ContactRequest | null
  onOpenChange: (open: boolean) => void
  onStatusChange: (contact: ContactRequest, status: ContactRequestStatus) => void
  isUpdating: boolean
}

function FieldLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

export function ContactDetailSheet({
  contact,
  onOpenChange,
  onStatusChange,
  isUpdating,
}: ContactDetailSheetProps) {
  const t = useT()

  const handleCopy = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      toast.success(t('toasts.contacts.phoneCopied'))
    } catch {
      toast.error(t('toasts.contacts.phoneCopyError'))
    }
  }

  return (
    <Sheet open={!!contact} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        {contact && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle>{t('contacts.detail.title')}</SheetTitle>
              <SheetDescription>
                {t('contacts.fields.created', { date: formatDate(contact.createdAt) })}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
              {/* Identity */}
              <div className="flex items-center gap-3">
                <Avatar className="size-11 shrink-0">
                  <AvatarImage src={contact.user.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-sm">
                    {getUserInitials(contact.user.firstName, contact.user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {formatUserName(contact.user.firstName, contact.user.lastName) ||
                      t('contacts.fields.unnamed')}
                  </p>
                  <Badge variant={STATUS_BADGE[contact.status]} className="mt-1">
                    {t(STATUS_LABEL[contact.status])}
                  </Badge>
                </div>
              </div>

              {/* Contact actions */}
              <div>
                <FieldLabel>{t('contacts.detail.contact')}</FieldLabel>
                <p className="font-mono text-sm text-foreground">{contact.phone}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${contact.phone}`} className="gap-1.5">
                      <Phone className="size-4" />
                      {t('contacts.actions.call')}
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleCopy(contact.phone)} className="gap-1.5">
                    <Copy className="size-4" />
                    {t('contacts.actions.copyPhone')}
                  </Button>
                </div>
              </div>

              {/* Message */}
              <div>
                <FieldLabel>{t('contacts.detail.message')}</FieldLabel>
                {contact.message ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {contact.message}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    {t('contacts.detail.noMessage')}
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p>{t('contacts.fields.created', { date: formatDate(contact.createdAt) })}</p>
                <p>{t('contacts.fields.updated', { date: formatDate(contact.updatedAt) })}</p>
              </div>
            </div>

            {/* Status workflow */}
            {contact.status !== 'CLOSED' && (
              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                {contact.status === 'NEW' && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isUpdating}
                    onClick={() => onStatusChange(contact, 'IN_PROGRESS')}
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 size-4" />
                    )}
                    {t('contacts.actions.moveToWork')}
                  </Button>
                )}
                <Button
                  className="flex-1"
                  disabled={isUpdating}
                  onClick={() => onStatusChange(contact, 'CLOSED')}
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Ban className="mr-2 size-4" />
                  )}
                  {t('contacts.actions.close')}
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
