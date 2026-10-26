/**
 * Детальная информация о событии (Sheet)
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'
import {
  Banknote,
  CalendarDays,
  MapPin,
  Globe,
  Users,
  Ticket,
  Building2,
  Clock,
  Calendar,
  Check,
  Send,
  X,
  Loader2,
  AlertTriangle,
  Link as LinkIcon,
  FileText,
  Trash2,
} from 'lucide-react'

import type { AdminEvent } from '@api/services/superAdmin.types'
import { ACCESS_TYPE_LABEL_KEYS, EVENT_FORMAT_LABEL_KEYS, EVENT_TYPE_LABEL_KEYS } from '@entities/event'
import { cn } from '@shared/lib/cn'
import { getDescriptionText } from '@shared/lib'
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Separator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StatusPill,
  statusPillTone,
  Textarea,
} from '@shared/ui'
import { FeaturedEventToggle, useFeaturedEventMutation } from '@features/super-admin'
import { getBannerTemplateGradient, isBannerTemplate } from '@features/events/lib/banner-templates'
import { EventLocationMap } from '@features/events/ui/event-location-map'

type EventDetailSheetProps = {
  event: AdminEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (event: AdminEvent) => void
  onReject: (event: AdminEvent, reason?: string) => void
  onDelete: (event: AdminEvent, reason?: string) => void
  isPending?: boolean
}

const statusLabelKeys: Record<string, string> = {
  DRAFT: 'events.status.draft',
  PENDING_REVIEW: 'events.status.pendingReview',
  PUBLISHED: 'events.status.published',
  COMPLETED: 'events.status.completed',
  CANCELLED: 'events.status.cancelled',
}

export function EventDetailSheet({
  event,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onDelete,
  isPending,
}: EventDetailSheetProps) {
  const t = useT()
  const locale = useLocale()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const toggleFeatured = useFeaturedEventMutation()

  if (!event) return null

  const isPendingReview = event.status === 'PENDING_REVIEW'
  const isDraft = event.status === 'DRAFT'

  const handleReject = () => {
    onReject(event, reason || undefined)
    setRejectOpen(false)
    setReason('')
    onOpenChange(false)
  }

  const handleDelete = () => {
    onDelete(event, deleteReason || undefined)
    setDeleteOpen(false)
    setDeleteReason('')
    onOpenChange(false)
  }

  const handleApprove = () => {
    onApprove(event)
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <SheetTitle>{t('events.batch1.eventDetailSheet.s001')}</SheetTitle>
                <SheetDescription>{t('events.batch1.eventDetailSheet.s002')}</SheetDescription>
              </div>
              <FeaturedEventToggle
                isFeatured={event.isFeatured}
                onToggle={() => toggleFeatured.mutate(event.id)}
                isPending={toggleFeatured.isPending}
              />
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Cover & Title */}
            <div className="space-y-4">
              {event.coverImage && (
                <div className="overflow-hidden rounded-lg">
                  {isBannerTemplate(event.coverImage) ? (
                    <div
                      className={cn(
                        'aspect-video w-full',
                        getBannerTemplateGradient(event.coverImage) ?? 'bg-muted'
                      )}
                    />
                  ) : (
                    <img
                      src={event.coverImage}
                      alt={event.title}
                      className="aspect-video w-full object-cover"
                    />
                  )}
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold">{event.title}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusPill tone={statusPillTone(event.status)} size="sm">
                    {t(statusLabelKeys[event.status] ?? 'events.status.draft')}
                  </StatusPill>
                  <Badge variant="outline" className="text-xs">
                    {t(EVENT_FORMAT_LABEL_KEYS[event.format as keyof typeof EVENT_FORMAT_LABEL_KEYS])}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      event.type === 'FREE'
                        ? 'border-border text-success-soft-foreground'
                        : 'border-border text-info-soft-foreground'
                    )}
                  >
                    {t(EVENT_TYPE_LABEL_KEYS[event.type as keyof typeof EVENT_TYPE_LABEL_KEYS])}
                  </Badge>
                  {event.isFeatured && (
                    <StatusPill tone="warning" size="sm">
                      {t('events.batch1.eventDetailSheet.s003')}
                    </StatusPill>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Organization */}
            <Section title={t('events.batch1.eventDetailSheet.s004')} icon={<Building2 className="size-4" />}>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-muted text-xs font-medium">
                    {event.organization.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    to={`/admin/organizations?search=${encodeURIComponent(event.organization.companyName)}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {event.organization.companyName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{event.organization.email}</p>
                </div>
                <StatusPill
                  tone={statusPillTone(event.organization.verificationStatus)}
                  size="sm"
                  className="ml-auto"
                >
                  {event.organization.verificationStatus === 'APPROVED'
                    ? t('events.batch1.eventDetailSheet.s005')
                    : t('events.batch1.eventDetailSheet.s006')}
                </StatusPill>
              </div>
            </Section>

            <Separator />

            {/* Date & Time */}
            <Section title={t('events.batch1.eventDetailSheet.s007')} icon={<CalendarDays className="size-4" />}>
              <InfoRow
                icon={<Calendar />}
                label={t('events.batch1.eventDetailSheet.s008')}
                value={formatDateTime(event.startDate, locale)}
              />
              {event.endDate && (
                <InfoRow
                  icon={<Clock />}
                  label={t('events.batch1.eventDetailSheet.s009')}
                  value={formatDateTime(event.endDate, locale)}
                />
              )}
              {event.registrationDeadline && (
                <InfoRow
                  icon={<Clock />}
                  label={t('events.batch1.eventDetailSheet.s010')}
                  value={formatDateTime(event.registrationDeadline, locale)}
                />
              )}
            </Section>

            <Separator />

            {/* Location */}
            <Section title={t('events.batch1.eventDetailSheet.s011')} icon={<MapPin className="size-4" />}>
              <InfoRow
                icon={<Globe />}
                label={t('events.fields.format')}
                value={t(EVENT_FORMAT_LABEL_KEYS[event.format as keyof typeof EVENT_FORMAT_LABEL_KEYS])}
              />
              {event.venue && <InfoRow icon={<Building2 />} label={t('events.batch1.eventDetailSheet.s012')} value={event.venue} />}
              {event.address && <InfoRow icon={<MapPin />} label={t('events.batch1.eventDetailSheet.s013')} value={event.address} />}
              {event.city && <InfoRow icon={<MapPin />} label={t('events.batch1.eventDetailSheet.s014')} value={event.city} />}
              {event.onlineUrl && (
                <InfoRow
                  icon={<LinkIcon />}
                  label={t('events.batch1.eventDetailSheet.s015')}
                  value={
                    <a
                      href={event.onlineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >{t('events.batch1.eventDetailSheet.s016')}</a>
                  }
                />
              )}
              {event.latitude != null && event.longitude != null && (
                <div className="mt-3">
                  <EventLocationMap
                    latitude={event.latitude}
                    longitude={event.longitude}
                    caption={event.venue ?? event.address ?? undefined}
                    height={200}
                  />
                </div>
              )}
            </Section>

            <Separator />

            {/* Participants & Price */}
            <Section title={t('events.detailSheet.participantsAndPrice')} icon={<Users className="size-4" />}>
              <InfoRow
                icon={<Users />}
                label={t('events.batch1.eventDetailSheet.s017')}
                value={`${event._count.registrations}${event.maxParticipants ? ` / ${event.maxParticipants}` : ''}`}
              />
              <InfoRow
                icon={<Ticket />}
                label={t('events.info.accessType')}
                value={
                  ACCESS_TYPE_LABEL_KEYS[event.accessType as keyof typeof ACCESS_TYPE_LABEL_KEYS]
                    ? t(ACCESS_TYPE_LABEL_KEYS[event.accessType as keyof typeof ACCESS_TYPE_LABEL_KEYS])
                    : event.accessType
                }
              />
              {event.type === 'PAID' && event.price && (
                <InfoRow
                  icon={<Banknote />}
                  label={t('events.info.price')}
                  value={`${event.price.toLocaleString()} ${event.currency}`}
                />
              )}
            </Section>

            {/* Description */}
            {event.description && (
              <>
                <Separator />
                <Section title={t('events.batch1.eventDetailSheet.s018')} icon={<FileText className="size-4" />}>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {getDescriptionText(event.description)}
                  </p>
                </Section>
              </>
            )}

            {/* Rejection Reason */}
            {event.rejectionReason && (
              <>
                <Separator />
                <div className="rounded-lg border border-border bg-danger-soft p-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-danger-soft-foreground">
                    <AlertTriangle className="size-4" />{t('events.batch1.eventDetailSheet.s019')}</h4>
                  <p className="mt-2 text-sm text-danger-soft-foreground">{event.rejectionReason}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Dates */}
            <Section title={t('events.batch1.eventDetailSheet.s020')} icon={<Calendar className="size-4" />}>
              <InfoRow
                icon={<Calendar />}
                label={t('events.batch1.eventDetailSheet.s021')}
                value={formatDateTime(event.createdAt, locale)}
              />
              <InfoRow
                icon={<Calendar />}
                label={t('events.batch1.eventDetailSheet.s022')}
                value={formatDateTime(event.updatedAt, locale)}
              />
            </Section>

            {/* Actions */}
            <Separator />
            <div className="flex flex-col gap-2">
              {isDraft && (
                <Button className="w-full" onClick={handleApprove} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 size-4" />
                  )}
                  {t('admin.actions.publish')}
                </Button>
              )}
              {isPendingReview && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleApprove} disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 size-4" />
                    )}{t('events.batch1.eventDetailSheet.s023')}</Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setRejectOpen(true)}
                    disabled={isPending}
                  >
                    <X className="mr-2 size-4" />{t('events.batch1.eventDetailSheet.s024')}</Button>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
              >
                <Trash2 className="mr-2 size-4" />{t('events.batch1.eventDetailSheet.s025')}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('events.batch1.eventDetailSheet.s025')}</DialogTitle>
            <DialogDescription>{t('events.batch1.eventDetailSheet.s026')}<strong>«{event.title}»</strong>{t('events.batch1.eventDetailSheet.s027')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('events.batch1.eventDetailSheet.s028')}
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{t('events.batch1.eventDetailSheet.s029')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              <Trash2 className="mr-2 size-4" />{t('events.batch1.eventDetailSheet.s030')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('events.batch1.eventDetailSheet.s031')}</DialogTitle>
            <DialogDescription>{t('events.batch1.eventDetailSheet.s032')}<strong>«{event.title}»</strong>{t('events.batch1.eventDetailSheet.s033')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('events.batch1.eventDetailSheet.s034')}
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t('events.batch1.eventDetailSheet.s029')}</Button>
            <Button variant="destructive" onClick={handleReject}>
              <X className="mr-2 size-4" />{t('events.batch1.eventDetailSheet.s024')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ================================
// Helper Components
// ================================

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="[&>svg]:size-4">{icon}</span>
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
