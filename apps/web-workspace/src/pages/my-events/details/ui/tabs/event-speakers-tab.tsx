import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLocale, useT } from '@eventflow/i18n/react'

import { resolveLocalizedField } from '@entities/event'
import {
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
  Upload,
  Linkedin,
  Globe,
  Briefcase,
  MoreHorizontal,
  Pencil,
} from 'lucide-react'

import {
  Button,
  Card,
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
  FormLabel,
  FormMessage,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  ImageCropperDialog,
} from '@shared/ui'
import { getMediaUrl } from '@api/config'
import { cn } from '@shared/lib/cn'
import { formatUserName, getUserInitials } from '@shared/lib'
import {
  useSpeakersQuery,
  useCreateSpeaker,
  useUpdateSpeaker,
  useDeleteSpeaker,
  useInviteSpeaker,
  useResendSpeakerInvitation,
  useUploadSpeakerAvatar,
} from '@features/events/api'
import type { Speaker, InvitationStatus, CreateSpeakerRequest } from '@api/services'

// ================================
// Types & Schemas
// ================================

type EventSpeakersTabProps = {
  eventId: string
}

const createInviteSpeakerSchema = (t: ReturnType<typeof useT>) =>
  z.object({
    email: z.string().email(t('validation.invalidEmail')),
    firstName: z.string().min(1, t('events.validation.firstNameRequired')),
    lastName: z.string().min(1, t('events.validation.lastNameRequired')),
    position: z
      .string()
      .min(2, t('events.validation.min2'))
      .max(200, t('events.validation.max200')),
    company: z.string().optional(),
    bio: z.string().optional(),
    linkedinUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal('')),
    websiteUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal('')),
  })

type InviteSpeakerFormValues = z.infer<ReturnType<typeof createInviteSpeakerSchema>>

const createAvatarUrlSchema = (t: ReturnType<typeof useT>) =>
  z
    .string()
    .refine(
      value =>
        value.length === 0 ||
        value.startsWith('/') ||
        value.startsWith('http://') ||
        value.startsWith('https://'),
      t('validation.invalidUrl')
    )

const createAddSpeakerSchema = (t: ReturnType<typeof useT>) =>
  z.object({
    firstName: z.string().min(1, t('events.validation.firstNameRequired')),
    lastName: z.string().min(1, t('events.validation.lastNameRequired')),
    position: z.string().min(2, t('events.validation.min2')),
    company: z.string().optional(),
    bio: z.string().optional(),
    avatarUrl: createAvatarUrlSchema(t).optional().or(z.literal('')),
    linkedinUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal('')),
    websiteUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal('')),
  })

type AddSpeakerFormValues = z.infer<ReturnType<typeof createAddSpeakerSchema>>

// ================================
// Status Config
// ================================

type SpeakerStatus = InvitationStatus | 'MANUAL'

const getStatusConfig = (t: ReturnType<typeof useT>) =>
  ({
    MANUAL: { label: t('events.speakers.status.manual'), variant: 'secondary', color: 'text-muted-foreground' },
    NONE: { label: t('events.speakers.status.none'), variant: 'secondary', color: 'text-muted-foreground' },
    PENDING: { label: t('events.speakers.status.pending'), variant: 'outline', color: 'text-warning' },
    ACCEPTED: { label: t('events.speakers.status.accepted'), variant: 'default', color: 'text-success' },
    REJECTED: { label: t('events.speakers.status.rejected'), variant: 'destructive', color: 'text-destructive' },
    EXPIRED: { label: t('events.speakers.status.expired'), variant: 'outline', color: 'text-muted-foreground' },
  }) satisfies Record<
    SpeakerStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }
  >

const STATUS_ICONS: Record<SpeakerStatus, React.ReactNode> = {
  MANUAL: <User className="h-3.5 w-3.5" />,
  NONE: <User className="h-3.5 w-3.5" />,
  PENDING: <Clock className="h-3.5 w-3.5" />,
  ACCEPTED: <CheckCircle2 className="h-3.5 w-3.5" />,
  REJECTED: <XCircle className="h-3.5 w-3.5" />,
  EXPIRED: <XCircle className="h-3.5 w-3.5 opacity-50" />,
}

function getSpeakerStatus(speaker: Speaker): SpeakerStatus {
  const status = speaker.invitationStatus
  if (status == null || status === '') return 'MANUAL'

  switch (status) {
    case 'NONE':
    case 'PENDING':
    case 'ACCEPTED':
    case 'REJECTED':
    case 'EXPIRED':
      return status
    default:
      return 'NONE'
  }
}

// ================================
// Add Speaker Dialog
// ================================

function AddSpeakerDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  editingSpeaker,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AddSpeakerFormValues) => void
  isPending: boolean
  editingSpeaker?: Speaker | null
}) {
  const t = useT()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const uploadSpeakerAvatar = useUploadSpeakerAvatar()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)

  const form = useForm<AddSpeakerFormValues>({
    resolver: zodResolver(createAddSpeakerSchema(t)),
    defaultValues: {
      firstName: '',
      lastName: '',
      position: '',
      company: '',
      bio: '',
      avatarUrl: '',
      linkedinUrl: '',
      websiteUrl: '',
    },
  })

  // Обновляем форму когда меняется editingSpeaker
  useEffect(() => {
    setUploadError(null)
    setUploadProgress(0)

    if (editingSpeaker) {
      form.reset({
        firstName: editingSpeaker.firstName || '',
        lastName: editingSpeaker.lastName || '',
        position: editingSpeaker.position || '',
        company: editingSpeaker.company || '',
        bio: editingSpeaker.bio || '',
        avatarUrl: editingSpeaker.avatarUrl || '',
        linkedinUrl: editingSpeaker.linkedinUrl || '',
        websiteUrl: editingSpeaker.websiteUrl || '',
      })
    } else {
      form.reset({
        firstName: '',
        lastName: '',
        position: '',
        company: '',
        bio: '',
        avatarUrl: '',
        linkedinUrl: '',
        websiteUrl: '',
      })
    }
  }, [editingSpeaker, form])

  const handleSelectAvatar = () => {
    avatarInputRef.current?.click()
  }

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSizeBytes = 5 * 1024 * 1024

    if (!allowedTypes.includes(file.type)) {
      setUploadError(t('events.speakers.upload.invalidType'))
      return
    }

    if (file.size > maxSizeBytes) {
      setUploadError(t('events.speakers.upload.maxSize'))
      return
    }

    setUploadError(null)
    setCropSourceUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setCropDialogOpen(true)
  }

  const handleAvatarCropComplete = (blob: Blob) => {
    const file = new File([blob], 'speaker-avatar.png', { type: 'image/png' })
    setCropDialogOpen(false)
    setCropSourceUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setUploadProgress(0)

    uploadSpeakerAvatar.mutate(
      { file, onProgress: setUploadProgress },
      {
        onSuccess: uploadedFile => {
          form.setValue('avatarUrl', uploadedFile.url, {
            shouldValidate: true,
            shouldDirty: true,
          })
          form.clearErrors('avatarUrl')
        },
        onError: () => {
          setUploadError(t('events.speakers.upload.error'))
        },
      },
    )
  }

  const handleSubmit = (data: AddSpeakerFormValues) => {
    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <UserPlus className="h-5 w-5" />
            </div>
            <span>
              {editingSpeaker ? t('events.speakers.form.editTitle') : t('events.speakers.form.addTitle')}
            </span>
          </DialogTitle>
          <DialogDescription>
            {editingSpeaker
              ? t('events.speakers.form.editDescription')
              : t('events.speakers.form.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('events.speakers.form.firstNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.speakers.form.firstNamePlaceholder')} {...field} />
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
                    <FormLabel>{t('events.speakers.form.lastNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.speakers.form.lastNamePlaceholder')} {...field} />
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
                    <FormLabel>{t('events.speakers.form.positionLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.speakers.form.positionPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.speakers.form.companyLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('events.speakers.form.companyPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.speakers.form.photoLabel')}</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14">
                          <AvatarImage
                            src={getMediaUrl(field.value || undefined)}
                            alt="avatar-preview"
                          />
                          <AvatarFallback>
                            <User className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAvatar}
                            disabled={uploadSpeakerAvatar.isPending}
                          >
                            {uploadSpeakerAvatar.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="mr-2 h-4 w-4" />
                            )}
                            {t('events.speakers.upload.action')}
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                form.setValue('avatarUrl', '', {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                })
                              }
                            >
                              {t('actions.delete')}
                            </Button>
                          )}
                        </div>
                      </div>

                      {uploadSpeakerAvatar.isPending && (
                        <p className="text-xs text-muted-foreground">
                          {t('events.speakers.upload.progress', { progress: uploadProgress })}
                        </p>
                      )}
                      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />

                      {cropSourceUrl && (
                        <ImageCropperDialog
                          open={cropDialogOpen}
                          onOpenChange={open => {
                            setCropDialogOpen(open)
                            if (!open) {
                              setCropSourceUrl(prev => {
                                if (prev) URL.revokeObjectURL(prev)
                                return null
                              })
                            }
                          }}
                          imageSrc={cropSourceUrl}
                          aspect={1}
                          cropShape="round"
                          outputWidth={800}
                          outputHeight={800}
                          title={t('events.speakers.upload.cropTitle')}
                          description={t('events.speakers.upload.cropDescription')}
                          onCropComplete={handleAvatarCropComplete}
                        />
                      )}

                      <Input
                        placeholder={t('events.speakers.form.photoUrlPlaceholder')}
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
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.speakers.form.aboutLabel')}</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder={t('events.speakers.form.aboutPlaceholder')}
                      className={cn(
                        'min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                        'placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel className="text-sm font-medium">
                {t('events.speakers.form.socialsLabel')}
              </FormLabel>
              <div className="grid gap-3">
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
                            placeholder="linkedin.com/in/username"
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
                          <Input className="pl-10" placeholder="example.com" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={isPending || uploadSpeakerAvatar.isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSpeaker ? t('actions.save') : t('actions.add')}
              </Button>
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
  const form = useForm<InviteSpeakerFormValues>({
    resolver: zodResolver(createInviteSpeakerSchema(t)),
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <span>{t('events.speakers.form.inviteTitle')}</span>
          </DialogTitle>
          <DialogDescription>
            {t('events.speakers.form.inviteDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.speakers.form.emailRequiredLabel')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-10"
                        type="email"
                        placeholder="speaker@company.com"
                        {...field}
                      />
                    </div>
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
                    <FormLabel>{t('events.speakers.form.firstNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.speakers.form.firstNamePlaceholder')} {...field} />
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
                    <FormLabel>{t('events.speakers.form.lastNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.speakers.form.lastNamePlaceholder')} {...field} />
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
                    <FormLabel>{t('events.speakers.form.positionLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.speakers.form.positionPlaceholder')} {...field} />
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
                    <FormLabel>{t('events.speakers.form.companyLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('events.speakers.form.companyPlaceholder')} {...field} />
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
                  <FormLabel>{t('events.speakers.form.biographyLabel')}</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder={t('events.speakers.form.bioPlaceholder')}
                      className={cn(
                        'min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
                        'placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel className="text-sm font-medium">
                {t('events.speakers.form.optionalSocialsLabel')}
              </FormLabel>
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
                          placeholder="https://linkedin.com/in/username"
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
                        <Input className="pl-10" placeholder="https://example.com" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-2"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {t('events.speakers.form.sendInviteAction')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ================================
// Speaker Card
// ================================

function SpeakerCard({
  speaker,
  eventId,
  onEdit,
}: {
  speaker: Speaker
  eventId: string
  onEdit: (speaker: Speaker) => void
}) {
  const t = useT()
  const locale = useLocale()
  const deleteSpeaker = useDeleteSpeaker(eventId)
  const resendInvitation = useResendSpeakerInvitation(eventId)

  const localizedPosition = resolveLocalizedField(
    speaker.translations,
    'position',
    locale,
    speaker.position,
  )
  const localizedCompany = resolveLocalizedField(
    speaker.translations,
    'company',
    locale,
    speaker.company,
  )
  const localizedBio = resolveLocalizedField(speaker.translations, 'bio', locale, speaker.bio)

  const speakerStatus = getSpeakerStatus(speaker)
  const STATUS_CONFIG = getStatusConfig(t)
  const statusConfig = STATUS_CONFIG[speakerStatus] ?? STATUS_CONFIG.NONE

  return (
    <Card className="group relative overflow-hidden transition hover:border-border hover:shadow-md">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 ring-2 ring-background shadow-lg sm:h-16 sm:w-16">
            <AvatarImage
              src={getMediaUrl(speaker.avatarUrl)}
              alt={formatUserName(speaker.firstName, speaker.lastName)}
            />
            <AvatarFallback className="bg-foreground text-sm font-semibold text-background sm:text-lg">
              {getUserInitials(speaker.firstName, speaker.lastName)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-foreground truncate">
                  {formatUserName(speaker.firstName, speaker.lastName)}
                </h4>
                <p className="text-sm text-foreground font-medium truncate">
                  {localizedPosition}
                </p>
              </div>
              <Badge variant={statusConfig.variant} className="gap-1 shrink-0">
                {STATUS_ICONS[speakerStatus]}
                {statusConfig.label}
              </Badge>
            </div>

            {localizedCompany && (
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                <span className="truncate">{localizedCompany}</span>
              </div>
            )}

            {localizedBio && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{localizedBio}</p>
            )}

            {/* Social Links */}
            {(speaker.linkedinUrl || speaker.websiteUrl) && (
              <div className="flex items-center gap-2 mt-3">
                {speaker.linkedinUrl && (
                  <a
                    href={speaker.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted hover:bg-info-soft hover:text-info transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {speaker.websiteUrl && (
                  <a
                    href={speaker.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(speaker)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('actions.edit')}
              </DropdownMenuItem>
              {speaker.invitationStatus === 'PENDING' && (
                <DropdownMenuItem
                  onClick={() => resendInvitation.mutate(speaker.id)}
                  disabled={resendInvitation.isPending}
                >
                  <RefreshCw
                    className={cn('mr-2 h-4 w-4', resendInvitation.isPending && 'animate-spin')}
                  />
                  {t('events.speakers.form.resendInviteTitle')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => deleteSpeaker.mutate(speaker.id)}
                disabled={deleteSpeaker.isPending}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )
}

// ================================
// Empty State
// ================================

function EmptyState({ onInvite, onAdd }: { onInvite: () => void; onAdd: () => void }) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <User className="h-8 w-8" />
      </div>
      <h3 className="mt-6 text-xl font-semibold text-foreground">
        {t('events.speakers.tab.emptyTitle')}
      </h3>
      <p className="mt-2 text-center text-muted-foreground max-w-sm">
        {t('events.speakers.tab.emptyDescription')}
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onAdd} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {t('events.speakers.form.addManuallyAction')}
        </Button>
        <Button onClick={onInvite} className="gap-2">
          <Mail className="h-4 w-4" />
          {t('events.speakers.form.inviteByEmailAction')}
        </Button>
      </div>
    </div>
  )
}

// ================================
// Main Component
// ================================

export function EventSpeakersTab({ eventId }: EventSpeakersTabProps) {
  const t = useT()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null)

  const { data: speakersData, isLoading } = useSpeakersQuery(eventId)
  const createSpeaker = useCreateSpeaker(eventId)
  const updateSpeaker = useUpdateSpeaker(eventId)
  const inviteSpeaker = useInviteSpeaker(eventId)

  // API может вернуть { speakers: [] } или просто []
  const speakers = Array.isArray(speakersData) ? speakersData : speakersData?.speakers || []

  const handleAddSpeaker = (data: AddSpeakerFormValues) => {
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

    if (editingSpeaker) {
      updateSpeaker.mutate(
        { speakerId: editingSpeaker.id, data: requestData },
        {
          onSuccess: () => {
            setAddDialogOpen(false)
            setEditingSpeaker(null)
          },
        }
      )
    } else {
      createSpeaker.mutate(requestData, {
        onSuccess: () => setAddDialogOpen(false),
      })
    }
  }

  const handleInviteSpeaker = (data: InviteSpeakerFormValues) => {
    inviteSpeaker.mutate(data, {
      onSuccess: () => setInviteDialogOpen(false),
    })
  }

  const handleEdit = (speaker: Speaker) => {
    setEditingSpeaker(speaker)
    setAddDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('events.speakers.tab.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t('events.speakers.tab.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {speakers.length > 0
              ? t('events.speakers.tab.count', { count: speakers.length })
              : t('events.speakers.tab.description')}
          </p>
        </div>
        {speakers.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('actions.add')}
            </Button>
            <Button
              size="sm"
              onClick={() => setInviteDialogOpen(true)}
              className="gap-2"
            >
              <Mail className="mr-2 h-4 w-4" />
              {t('events.speakers.form.inviteAction')}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {speakers.length === 0 ? (
        <EmptyState
          onInvite={() => setInviteDialogOpen(true)}
          onAdd={() => setAddDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {speakers.map(speaker => (
            <SpeakerCard key={speaker.id} speaker={speaker} eventId={eventId} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddSpeakerDialog
        open={addDialogOpen}
        onOpenChange={open => {
          setAddDialogOpen(open)
          if (!open) setEditingSpeaker(null)
        }}
        onSubmit={handleAddSpeaker}
        isPending={createSpeaker.isPending || updateSpeaker.isPending}
        editingSpeaker={editingSpeaker}
      />

      <InviteSpeakerDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSubmit={handleInviteSpeaker}
        isPending={inviteSpeaker.isPending}
      />
    </div>
  )
}
