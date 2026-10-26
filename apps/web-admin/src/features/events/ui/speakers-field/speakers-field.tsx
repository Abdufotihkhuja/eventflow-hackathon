import { useState } from 'react'
import {
  Plus,
  Trash2,
  User,
  Mail,
  Send,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus,
  Linkedin,
  Globe,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  Button,
  Card,
  FormDescription,
  FormLabel,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Badge,
} from '@shared/ui'
import { cn } from '@shared/lib/cn'
import { formatUserName } from '@shared/lib'
import {
  useSpeakersQuery,
  useCreateSpeaker,
  useUpdateSpeaker,
  useDeleteSpeaker,
  useInviteSpeaker,
  useResendSpeakerInvitation,
} from '@features/events/api'
import type { Speaker, InvitationStatus, CreateSpeakerRequest } from '@api/services'
import type { Translator } from '@eventflow/i18n'
import { useT } from '@eventflow/i18n/react'

// ================================
// Types
// ================================

type SpeakersFieldProps = {
  eventId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: any
}

type LocalSpeaker = {
  id: string
  firstName: string
  lastName: string
  position: string
  company: string
  bio: string
  avatarUrl: string
  linkedinUrl?: string
  websiteUrl?: string
}

// ================================
// Schemas
// ================================

const createInviteSpeakerSchema = (t: Translator) => z.object({
  email: z.string().email(t('events.batch1.speakerValidation.email')),
  firstName: z.string().min(1, t('events.batch1.speakerValidation.firstName')),
  lastName: z.string().min(1, t('events.batch1.speakerValidation.lastName')),
  position: z
    .string()
    .min(2, t('events.batch1.speakerValidation.min2'))
    .max(200, t('events.batch1.speakerValidation.max200')),
  company: z.string().optional(),
  bio: z.string().optional(),
  linkedinUrl: z.string().url(t('events.batch1.speakerValidation.url')).optional().or(z.literal('')),
  websiteUrl: z.string().url(t('events.batch1.speakerValidation.url')).optional().or(z.literal('')),
})

type InviteSpeakerFormValues = z.infer<ReturnType<typeof createInviteSpeakerSchema>>

const createAddSpeakerSchema = (t: Translator) => z.object({
  firstName: z.string().min(1, t('events.batch1.speakerValidation.firstName')),
  lastName: z.string().min(1, t('events.batch1.speakerValidation.lastName')),
  position: z.string().min(2, t('events.batch1.speakerValidation.min2')),
  company: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().email(t('events.batch1.speakerValidation.emailInvalid')).optional().or(z.literal('')),
  avatarUrl: z.string().url(t('events.batch1.speakerValidation.url')).optional().or(z.literal('')),
  linkedinUrl: z.string().url(t('events.batch1.speakerValidation.url')).optional().or(z.literal('')),
  websiteUrl: z.string().url(t('events.batch1.speakerValidation.url')).optional().or(z.literal('')),
})

type AddSpeakerFormValues = z.infer<ReturnType<typeof createAddSpeakerSchema>>

// ================================
// Status Badge Component
// ================================

const STATUS_CONFIG: Record<
  InvitationStatus | 'MANUAL',
  {
    labelKey: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: React.ReactNode
  }
> = {
  MANUAL: { labelKey: 'events.batch1.speakerStatus.manual', variant: 'secondary', icon: <User className="h-3 w-3" /> },
  PENDING: { labelKey: 'events.batch1.speakerStatus.pending', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  ACCEPTED: { labelKey: 'events.batch1.speakerStatus.accepted', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  REJECTED: { labelKey: 'events.batch1.speakerStatus.rejected', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  EXPIRED: {
    labelKey: 'events.batch1.speakerStatus.expired',
    variant: 'outline',
    icon: <XCircle className="h-3 w-3 opacity-50" />,
  },
}

function getSpeakerStatus(speaker: Speaker): InvitationStatus | 'MANUAL' {
  return speaker.invitationStatus || 'MANUAL'
}

function SpeakerStatusBadge({ status }: { status: InvitationStatus | 'MANUAL' }) {
  const t = useT()
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className="gap-1 text-xs">
      {config.icon}
      {t(config.labelKey)}
    </Badge>
  )
}

// ================================
// Add Speaker Dialog
// ================================

function AddSpeakerDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AddSpeakerFormValues) => void
  isPending: boolean
}) {
  const t = useT()
  const addSpeakerSchema = createAddSpeakerSchema(t)
  const form = useForm<AddSpeakerFormValues>({
    resolver: zodResolver(addSpeakerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      position: '',
      company: '',
      bio: '',
      email: '',
      avatarUrl: '',
      linkedinUrl: '',
      websiteUrl: '',
    },
  })

  const handleSubmit = (data: AddSpeakerFormValues) => {
    onSubmit(data)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('events.batch1.speakersField.s001')}</DialogTitle>
          <DialogDescription>{t('events.batch1.speakersField.s002')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.batch1.speakersField.s003')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.batch1.speakersField.s004')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.batch1.speakersField.s005')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.batch1.speakersField.s006')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.batch1.speakersField.s007')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.batch1.speakerPlaceholders.position')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.batch1.speakersField.s008')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.batch1.speakerPlaceholders.company')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.tables.columns.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('events.batch1.speakerPlaceholders.email')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.batch1.speakersField.s009')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('events.batch1.speakerPlaceholders.avatarUrl')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.batch1.speakersField.s010')}</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder={t('events.batch1.speakersField.s011')}
                      className={cn(
                        'min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm',
                        'focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>{t('events.batch1.speakersField.s012')}</FormLabel>
              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder={t('events.batch1.speakerPlaceholders.linkedinUrl')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder={t('events.batch1.speakerPlaceholders.websiteUrl')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('events.batch1.speakersField.s013')}</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('events.batch1.speakersField.s014')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ================================
// Invite Speaker Dialog
// ================================

function InviteSpeakerDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: InviteSpeakerFormValues) => void
  isPending: boolean
}) {
  const t = useT()
  const inviteSpeakerSchema = createInviteSpeakerSchema(t)
  const form = useForm<InviteSpeakerFormValues>({
    resolver: zodResolver(inviteSpeakerSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      position: '',
      company: '',
      bio: '',
      linkedinUrl: '',
      websiteUrl: '',
    },
  })

  const handleSubmit = (data: InviteSpeakerFormValues) => {
    onSubmit(data)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-secondary" />{t('events.batch1.speakersField.s015')}</DialogTitle>
          <DialogDescription>{t('events.batch1.speakersField.s016')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.tables.columns.email')} *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t('events.batch1.speakerPlaceholders.email')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.batch1.speakersField.s003')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.batch1.speakersField.s004')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.batch1.speakersField.s005')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.batch1.speakersField.s006')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.batch1.speakersField.s007')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.batch1.speakerPlaceholders.position')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.batch1.speakersField.s008')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.batch1.speakerPlaceholders.company')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.batch1.speakersField.s017')}</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder={t('events.batch1.speakersField.s011')}
                      className={cn(
                        'min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm',
                        'focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel className="text-sm font-medium">{t('events.batch1.speakersField.s018')}</FormLabel>
              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-10"
                          placeholder={t('events.batch1.speakerPlaceholders.linkedinUrl')}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-10" placeholder={t('events.batch1.speakerPlaceholders.websiteUrl')} {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('events.batch1.speakersField.s013')}</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}{t('events.batch1.speakersField.s019')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ================================
// Speaker Card for API Mode
// ================================

function SpeakerCard({
  speaker,
  eventId,
  onDelete,
  isDeleting,
}: {
  speaker: Speaker
  eventId: string
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const resendInvitation = useResendSpeakerInvitation(eventId)
  const updateSpeaker = useUpdateSpeaker(eventId)

  const [editData, setEditData] = useState({
    firstName: speaker.firstName,
    lastName: speaker.lastName,
    position: speaker.position,
    company: speaker.company || '',
    bio: speaker.bio || '',
    linkedinUrl: speaker.linkedinUrl || '',
    websiteUrl: speaker.websiteUrl || '',
  })

  const handleSave = () => {
    updateSpeaker.mutate(
      { speakerId: speaker.id, data: editData },
      { onSuccess: () => setExpanded(false) }
    )
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10">
            {speaker.avatarUrl ? (
              <img
                src={speaker.avatarUrl}
                alt={formatUserName(speaker.firstName, speaker.lastName)}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-brand-secondary" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {formatUserName(speaker.firstName, speaker.lastName)}
            </p>
            <p className="text-sm text-muted-foreground">
              {speaker.position}
              {speaker.company && ` · ${speaker.company}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SpeakerStatusBadge status={getSpeakerStatus(speaker)} />

          {speaker.invitationStatus === 'PENDING' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                resendInvitation.mutate(speaker.id)
              }}
              disabled={resendInvitation.isPending}
              title={t('events.batch1.speakersField.s020')}
            >
              {resendInvitation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onDelete(speaker.id)
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border bg-muted/30 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s021')}</label>
              <Input
                value={editData.firstName}
                onChange={e => setEditData({ ...editData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s022')}</label>
              <Input
                value={editData.lastName}
                onChange={e => setEditData({ ...editData, lastName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s023')}</label>
              <Input
                value={editData.position}
                onChange={e => setEditData({ ...editData, position: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s008')}</label>
              <Input
                value={editData.company}
                onChange={e => setEditData({ ...editData, company: e.target.value })}
              />
            </div>
            {speaker.invitedEmail && (
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('admin.tables.columns.email')}</label>
                <Input value={speaker.invitedEmail} disabled className="bg-muted" />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s010')}</label>
            <textarea
              value={editData.bio}
              onChange={e => setEditData({ ...editData, bio: e.target.value })}
              className={cn(
                'min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm',
                'focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20'
              )}
            />
          </div>

          <div className="space-y-2">
            <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s012')}</label>
            <Input
                placeholder={t('events.batch1.speakerPlaceholders.linkedinLabel')}
              value={editData.linkedinUrl}
              onChange={e => setEditData({ ...editData, linkedinUrl: e.target.value })}
            />
            <Input
              placeholder={t('events.batch1.speakerPlaceholders.websiteLabel')}
              value={editData.websiteUrl}
              onChange={e => setEditData({ ...editData, websiteUrl: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(false)}>{t('events.batch1.speakersField.s013')}</Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={updateSpeaker.isPending}>
              {updateSpeaker.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('events.batch1.speakersField.s024')}</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ================================
// Local Speaker Card (for create mode)
// ================================

function LocalSpeakerCard({
  speaker,
  index,
  onUpdate,
  onDelete,
  errors,
}: {
  speaker: LocalSpeaker
  index: number
  onUpdate: (id: string, field: string, value: string) => void
  onDelete: (id: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors?: any
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10">
            <User className="h-5 w-5 text-brand-secondary" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {formatUserName(speaker.firstName, speaker.lastName) ||
                t('events.batch1.speakerFallback', { index: index + 1 })}
            </p>
            {speaker.position && <p className="text-sm text-muted-foreground">{speaker.position}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errors && <span className="text-xs text-destructive">{t('events.batch1.speakersField.s025')}</span>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onDelete(speaker.id)
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border bg-muted/30 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s003')}</label>
              <Input
                placeholder={t('events.batch1.speakersField.s004')}
                value={speaker.firstName}
                onChange={e => onUpdate(speaker.id, 'firstName', e.target.value)}
              />
              {errors?.firstName && (
                <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s005')}</label>
              <Input
                placeholder={t('events.batch1.speakersField.s006')}
                value={speaker.lastName}
                onChange={e => onUpdate(speaker.id, 'lastName', e.target.value)}
              />
              {errors?.lastName && (
                <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s007')}</label>
              <Input
                placeholder={t('events.batch1.speakerPlaceholders.position')}
                value={speaker.position}
                onChange={e => onUpdate(speaker.id, 'position', e.target.value)}
              />
              {errors?.position && (
                <p className="mt-1 text-xs text-destructive">{errors.position.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s008')}</label>
              <Input
                placeholder={t('events.batch1.speakerPlaceholders.company')}
                value={speaker.company}
                onChange={e => onUpdate(speaker.id, 'company', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s026')}</label>
              <Input
                placeholder={t('events.batch1.speakerPlaceholders.avatarUrl')}
                value={speaker.avatarUrl}
                onChange={e => onUpdate(speaker.id, 'avatarUrl', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s010')}</label>
            <textarea
              placeholder={t('events.batch1.speakersField.s011')}
              className={cn(
                'min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm',
                'focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20'
              )}
              value={speaker.bio}
              onChange={e => onUpdate(speaker.id, 'bio', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">{t('events.batch1.speakersField.s012')}</label>
            <div className="space-y-2">
              <Input
                placeholder={t('events.batch1.speakerPlaceholders.linkedinUrl')}
                value={speaker.linkedinUrl}
                onChange={e => onUpdate(speaker.id, 'linkedinUrl', e.target.value)}
              />
              <Input
                placeholder={t('events.batch1.speakerPlaceholders.websiteUrl')}
                value={speaker.websiteUrl}
                onChange={e => onUpdate(speaker.id, 'websiteUrl', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ================================
// Main Component
// ================================

export function SpeakersField({ eventId, form }: SpeakersFieldProps) {
  const t = useT()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // API mode (when editing existing event)
  const isApiMode = !!eventId
  const { data: speakersData, isLoading } = useSpeakersQuery(eventId)
  const createSpeaker = useCreateSpeaker(eventId || '')
  const deleteSpeaker = useDeleteSpeaker(eventId || '')
  const inviteSpeaker = useInviteSpeaker(eventId || '')

  // Local mode (when creating new event)
  const localSpeakers: LocalSpeaker[] = form?.watch('speakers') || []

  const handleAddSpeaker = (data: AddSpeakerFormValues) => {
    if (isApiMode) {
      const requestData: CreateSpeakerRequest = {
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position,
        company: data.company || undefined,
        bio: data.bio || undefined,
        avatarUrl: data.avatarUrl || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        websiteUrl: data.websiteUrl || undefined,
      }
      createSpeaker.mutate(requestData, {
        onSuccess: () => setAddDialogOpen(false),
      })
    } else {
      const newSpeaker: LocalSpeaker = {
        id: `speaker-${Date.now()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position,
        company: data.company || '',
        bio: data.bio || '',
        avatarUrl: data.avatarUrl || '',
        linkedinUrl: data.linkedinUrl || '',
        websiteUrl: data.websiteUrl || '',
      }
      form.setValue('speakers', [...localSpeakers, newSpeaker])
      setAddDialogOpen(false)
    }
  }

  const handleInviteSpeaker = (data: InviteSpeakerFormValues) => {
    inviteSpeaker.mutate(data, {
      onSuccess: () => setInviteDialogOpen(false),
    })
  }

  const handleDeleteSpeaker = (id: string) => {
    if (isApiMode) {
      setDeletingId(id)
      deleteSpeaker.mutate(id, {
        onSettled: () => setDeletingId(null),
      })
    } else {
      form.setValue(
        'speakers',
        localSpeakers.filter(s => s.id !== id)
      )
    }
  }

  const handleUpdateLocalSpeaker = (id: string, field: string, value: string) => {
    const updated = localSpeakers.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value }
      }
      return s
    })
    form.setValue('speakers', updated)
  }

  const speakers = isApiMode ? speakersData?.speakers || [] : localSpeakers

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <FormLabel>{t('events.batch1.speakersField.s027')}</FormLabel>
          <FormDescription>{t('events.batch1.speakersField.s028')}</FormDescription>
        </div>

        {isApiMode ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInviteDialogOpen(true)}
            >
              <Mail className="mr-2 h-4 w-4" />{t('events.batch1.speakersField.s029')}</Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />{t('events.batch1.speakersField.s014')}</Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />{t('events.batch1.speakersField.s001')}</Button>
        )}
      </div>

      {isLoading ? (
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t('events.batch1.speakersField.s030')}</p>
        </Card>
      ) : speakers.length === 0 ? (
        <Card className="p-8 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">{t('events.batch1.speakersField.s031')}</p>
          {isApiMode ? (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInviteDialogOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" />{t('events.batch1.speakersField.s015')}</Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />{t('events.batch1.speakersField.s032')}</Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setAddDialogOpen(true)}
            >{t('events.batch1.speakersField.s033')}</Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {isApiMode
            ? (speakers as Speaker[]).map(speaker => (
                <SpeakerCard
                  key={speaker.id}
                  speaker={speaker}
                  eventId={eventId!}
                  onDelete={handleDeleteSpeaker}
                  isDeleting={deletingId === speaker.id}
                />
              ))
            : (speakers as LocalSpeaker[]).map((speaker, index) => (
                <LocalSpeakerCard
                  key={speaker.id}
                  speaker={speaker}
                  index={index}
                  onUpdate={handleUpdateLocalSpeaker}
                  onDelete={handleDeleteSpeaker}
                  errors={form.formState.errors.speakers?.[index]}
                />
              ))}
        </div>
      )}

      {/* Dialogs */}
      <AddSpeakerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddSpeaker}
        isPending={createSpeaker.isPending}
      />

      {isApiMode && (
        <InviteSpeakerDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onSubmit={handleInviteSpeaker}
          isPending={inviteSpeaker.isPending}
        />
      )}
    </div>
  )
}
