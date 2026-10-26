import { useMemo, useRef, useState, type ChangeEvent } from 'react'
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
  Upload,
  Linkedin,
  Globe,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useT } from '@eventflow/i18n/react'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  FormDescription,
  FormLabel,
  ImageCropperDialog,
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
import { getMediaUrl } from '@api/config'
import { cn } from '@shared/lib/cn'
import { formatUserName } from '@shared/lib'
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
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  MultilingualTabsField,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
  TranslateFieldsToolbar,
  useTranslateBatch,
  type AppLocale,
  type BusinessTranslationFieldConfig,
  type TranslationApplyMode,
  type TranslationMeta,
  type TranslationValues,
} from '@features/translations'

const SPEAKER_TRANSLATION_FIELD_KEYS = ['position', 'company', 'bio'] as const
const SPEAKER_BUSINESS_LOCALES: readonly AppLocale[] = ['ru', 'uz', 'en']

// ================================
// Types
// ================================

type SpeakersFieldProps = {
  eventId?: string
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
  /** Локализованные position/company/bio (ru/uz/en). */
  translations?: import('@api/services').BusinessTranslationValues | null
  translationMeta?: import('@api/services').BusinessTranslationMeta | null
}

type SpeakerTranslationDraft = {
  translations: TranslationValues
  translationMeta: TranslationMeta
  /** Скаляры для form-validation: первая непустая локаль ru → uz → en */
  position: string
  company: string
  bio: string
}

/**
 * Хук для управления переводами position/company/bio в диалогах создания/инвайта
 * спикера. Возвращает state + handlers + computed source locale + Tilmoch handler.
 * Используется вместе с SpeakerTranslationsBlock для единообразного UX.
 */
function useSpeakerTranslationsDraft(initial?: {
  translations?: Record<string, Partial<Record<AppLocale, string>>> | null
  translationMeta?: Record<string, Partial<Record<AppLocale, unknown>>> | null
  position?: string | null
  company?: string | null
  bio?: string | null
}) {
  const initialValues = useMemo(
    () =>
      createBusinessTranslationValues(
        SPEAKER_TRANSLATION_FIELD_KEYS,
        initial?.translations ?? undefined,
        {
          position: initial?.position ?? '',
          company: initial?.company ?? '',
          bio: initial?.bio ?? '',
        },
      ),
    // initial — стартовые значения, перезаписывать на изменение не нужно
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const initialMeta = useMemo(
    () =>
      createBusinessTranslationMeta(
        SPEAKER_TRANSLATION_FIELD_KEYS,
        initial?.translationMeta ?? undefined,
        initialValues,
      ),
    [initialValues],
  )

  const [activeLocale, setActiveLocale] = useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] =
    useState<TranslationValues>(initialValues)
  const [translationMeta, setTranslationMeta] =
    useState<TranslationMeta>(initialMeta)
  const translateBatch = useTranslateBatch()

  const handleTranslationChange = (
    fieldKey: string,
    locale: AppLocale,
    value: string,
  ) => {
    const next = setBusinessTranslationValue(
      translationValues,
      translationMeta,
      fieldKey,
      locale,
      value,
    )
    setTranslationValues(next.values)
    setTranslationMeta(next.meta)
  }

  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    SPEAKER_TRANSLATION_FIELD_KEYS,
    activeLocale,
  )

  const pickPrimary = (fieldKey: string): string => {
    const v = translationValues[fieldKey]
    return (v?.ru?.trim() || v?.uz?.trim() || v?.en?.trim() || '').trim()
  }

  const reset = () => {
    setActiveLocale('ru')
    setTranslationValues(initialValues)
    setTranslationMeta(initialMeta)
  }

  const buildHandleAutoTranslate =
    (toastFns: { error: (msg: string) => void; info: (msg: string) => void; success: (msg: string) => void }, t: ReturnType<typeof useT>) =>
    (mode: TranslationApplyMode) => {
      if (!sourceLocale) {
        toastFns.error(t('common.translations.addTextBeforeTranslating'))
        return
      }
      const items = getBatchTranslationItems(
        translationValues,
        translationMeta,
        SPEAKER_TRANSLATION_FIELD_KEYS,
        sourceLocale,
        mode,
      )
      if (items.length === 0) {
        toastFns.info(t('common.translations.noEligibleFields'))
        return
      }
      const beforeValues = translationValues
      const beforeMeta = translationMeta
      translateBatch.mutate(
        {
          sourceLocale,
          targetLocales: SPEAKER_BUSINESS_LOCALES.filter(l => l !== sourceLocale),
          items,
        },
        {
          onSuccess: response => {
            const applied = applyBatchTranslationResults(
              beforeValues,
              beforeMeta,
              response,
              { mode },
            )
            const summary = summarizeAppliedBatch(beforeValues, beforeMeta, response, mode)
            setTranslationValues(applied.values)
            setTranslationMeta(applied.meta)
            toastFns.success(t('common.translations.translatedSummary', summary))
          },
          onError: error => {
            toastFns.error(error?.message ?? t('common.translations.serviceFailed'))
          },
        },
      )
    }

  return {
    activeLocale,
    setActiveLocale,
    translationValues,
    translationMeta,
    handleTranslationChange,
    sourceLocale,
    pickPrimary,
    reset,
    translateBatch,
    buildHandleAutoTranslate,
  }
}

function SpeakerTranslationsBlock({
  draft,
  t,
}: {
  draft: ReturnType<typeof useSpeakerTranslationsDraft>
  t: ReturnType<typeof useT>
}) {
  const fields: BusinessTranslationFieldConfig[] = [
    {
      key: 'position',
      label: t('events.speakers.form.positionLabel'),
      placeholder: t('events.speakers.form.positionPlaceholder'),
      maxLength: 200,
    },
    {
      key: 'company',
      label: t('events.speakers.form.companyLabel'),
      placeholder: t('events.speakers.form.companyPlaceholder'),
      maxLength: 200,
    },
    {
      key: 'bio',
      label: t('events.speakers.form.bioLabel'),
      placeholder: t('events.speakers.form.bioPlaceholder'),
      maxLength: 2000,
      multiline: true,
      rows: 4,
    },
  ]

  const handleAutoTranslate = draft.buildHandleAutoTranslate(
    {
      error: msg => toast.error(msg),
      info: msg => toast.info(msg),
      success: msg => toast.success(msg),
    },
    t,
  )

  return (
    <div className="space-y-3">
      <MultilingualTabsField
        fields={fields}
        values={draft.translationValues}
        meta={draft.translationMeta}
        activeLocale={draft.activeLocale}
        onLocaleChange={draft.setActiveLocale}
        onValueChange={draft.handleTranslationChange}
      />
      <TranslateFieldsToolbar
        sourceLocale={draft.sourceLocale}
        activeLocale={draft.activeLocale}
        isPending={draft.translateBatch.isPending}
        disabled={!draft.sourceLocale}
        onTranslateEmpty={() => handleAutoTranslate('fill_empty')}
        onUpdateAuto={() => handleAutoTranslate('update_auto')}
      />
    </div>
  )
}

// ================================
// Schemas
// ================================

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

const createAddSpeakerSchema = (t: ReturnType<typeof useT>) =>
  z.object({
    firstName: z.string().min(1, t('events.validation.firstNameRequired')),
    lastName: z.string().min(1, t('events.validation.lastNameRequired')),
    position: z.string().min(2, t('events.validation.min2')),
    company: z.string().optional(),
    bio: z.string().optional(),
    email: z.string().email(t('validation.invalidEmail')).optional().or(z.literal('')),
    avatarUrl: z
      .string()
      .refine(
        value =>
          value.length === 0 ||
          value.startsWith('/') ||
          value.startsWith('http://') ||
          value.startsWith('https://'),
        t('validation.invalidUrl'),
      )
      .optional()
      .or(z.literal('')),
    linkedinUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal('')),
    websiteUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal('')),
  })

type AddSpeakerFormValues = z.infer<ReturnType<typeof createAddSpeakerSchema>>

const getStatusConfig = (t: ReturnType<typeof useT>) =>
  ({
    MANUAL: {
      label: t('events.speakers.status.manual'),
      variant: 'secondary',
      icon: <User className="h-3 w-3" />,
    },
    PENDING: {
      label: t('events.speakers.status.pending'),
      variant: 'outline',
      icon: <Clock className="h-3 w-3" />,
    },
    ACCEPTED: {
      label: t('events.speakers.status.accepted'),
      variant: 'default',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    REJECTED: {
      label: t('events.speakers.status.rejected'),
      variant: 'destructive',
      icon: <XCircle className="h-3 w-3" />,
    },
    EXPIRED: {
      label: t('events.speakers.status.expired'),
      variant: 'outline',
      icon: <XCircle className="h-3 w-3 opacity-50" />,
    },
  }) satisfies Record<
    InvitationStatus | 'MANUAL',
    {
      label: string
      variant: 'default' | 'secondary' | 'destructive' | 'outline'
      icon: React.ReactNode
    }
  >

function getSpeakerStatus(speaker: Speaker): InvitationStatus | 'MANUAL' {
  return speaker.invitationStatus || 'MANUAL'
}

function SpeakerStatusBadge({ status }: { status: InvitationStatus | 'MANUAL' }) {
  const t = useT()
  const STATUS_CONFIG = getStatusConfig(t)
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className="gap-1 text-xs">
      {config.icon}
      {config.label}
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
  onSubmit: (data: AddSpeakerFormValues, draft: SpeakerTranslationDraft) => void
  isPending: boolean
}) {
  const t = useT()
  const draft = useSpeakerTranslationsDraft()
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
      email: '',
      avatarUrl: '',
      linkedinUrl: '',
      websiteUrl: '',
    },
  })

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

  // Скаляры position/company/bio синхронизируются с translations,
  // чтобы Zod-валидация (.min(2) для position) проходила.
  React.useEffect(() => {
    form.setValue('position', draft.pickPrimary('position'), { shouldValidate: true })
    form.setValue('company', draft.pickPrimary('company'))
    form.setValue('bio', draft.pickPrimary('bio'))
  }, [draft.translationValues, form])

  const handleSubmit = (data: AddSpeakerFormValues) => {
    const submission: SpeakerTranslationDraft = {
      translations: draft.translationValues,
      translationMeta: draft.translationMeta,
      position: draft.pickPrimary('position'),
      company: draft.pickPrimary('company'),
      bio: draft.pickPrimary('bio'),
    }
    onSubmit(data, submission)
    form.reset()
    draft.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('events.speakers.form.addTitle')}</DialogTitle>
          <DialogDescription>{t('events.speakers.form.addDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Имена и email — без локализации */}
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('events.speakers.form.emailLabel')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="speaker@example.com" {...field} />
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

            {/* Должность / компания / биография — мультиязычные с Tilmoch */}
            <SpeakerTranslationsBlock draft={draft} t={t} />

            {/* Hidden form fields для Zod validation (синхронизируются из draft) */}
            <FormMessage>
              {form.formState.errors.position?.message ||
                form.formState.errors.company?.message ||
                form.formState.errors.bio?.message}
            </FormMessage>

            <div className="space-y-2">
              <FormLabel>{t('events.speakers.form.socialsLabel')}</FormLabel>
              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/username" {...field} />
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
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={isPending || uploadSpeakerAvatar.isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('actions.add')}
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
  onSubmit: (data: InviteSpeakerFormValues, draft: SpeakerTranslationDraft) => void
  isPending: boolean
}) {
  const t = useT()
  const draft = useSpeakerTranslationsDraft()
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

  React.useEffect(() => {
    form.setValue('position', draft.pickPrimary('position'), { shouldValidate: true })
    form.setValue('company', draft.pickPrimary('company'))
    form.setValue('bio', draft.pickPrimary('bio'))
  }, [draft.translationValues, form])

  const handleSubmit = (data: InviteSpeakerFormValues) => {
    const submission: SpeakerTranslationDraft = {
      translations: draft.translationValues,
      translationMeta: draft.translationMeta,
      position: draft.pickPrimary('position'),
      company: draft.pickPrimary('company'),
      bio: draft.pickPrimary('bio'),
    }
    onSubmit(data, submission)
    form.reset()
    draft.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-secondary" />
            {t('events.speakers.form.inviteTitle')}
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
                    <Input type="email" placeholder="speaker@example.com" {...field} />
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

            {/* Должность / компания / биография — мультиязычные с Tilmoch */}
            <SpeakerTranslationsBlock draft={draft} t={t} />
            <FormMessage>
              {form.formState.errors.position?.message ||
                form.formState.errors.company?.message ||
                form.formState.errors.bio?.message}
            </FormMessage>

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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
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
  const translateBatch = useTranslateBatch()

  const [editData, setEditData] = useState({
    firstName: speaker.firstName,
    lastName: speaker.lastName,
    linkedinUrl: speaker.linkedinUrl || '',
    websiteUrl: speaker.websiteUrl || '',
  })

  const [activeLocale, setActiveLocale] = useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] = useState<TranslationValues>(() =>
    createBusinessTranslationValues(SPEAKER_TRANSLATION_FIELD_KEYS, speaker.translations, {
      position: speaker.position,
      company: speaker.company,
      bio: speaker.bio,
    })
  )
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta>(() =>
    createBusinessTranslationMeta(
      SPEAKER_TRANSLATION_FIELD_KEYS,
      speaker.translationMeta,
      translationValues,
    )
  )

  const translationFields = useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: 'position',
        label: t('events.speakers.form.positionLabel'),
        placeholder: t('events.speakers.form.positionPlaceholder'),
        maxLength: 200,
      },
      {
        key: 'company',
        label: t('events.speakers.form.companyLabel'),
        placeholder: t('events.speakers.form.companyPlaceholder'),
        maxLength: 200,
      },
      {
        key: 'bio',
        label: t('events.speakers.form.bioLabel'),
        placeholder: t('events.speakers.form.bioPlaceholder'),
        maxLength: 2000,
        multiline: true,
        rows: 4,
      },
    ],
    [t],
  )

  const handleTranslationChange = (fieldKey: string, locale: AppLocale, value: string) => {
    const next = setBusinessTranslationValue(
      translationValues,
      translationMeta,
      fieldKey,
      locale,
      value,
    )
    setTranslationValues(next.values)
    setTranslationMeta(next.meta)
  }

  const pickPrimary = (fieldKey: string, current: string | undefined): string => {
    const ru = translationValues[fieldKey]?.ru?.trim()
    const uz = translationValues[fieldKey]?.uz?.trim()
    const en = translationValues[fieldKey]?.en?.trim()
    return ru || uz || en || (current ?? '')
  }

  const sourceLocaleForTranslate = resolveBusinessSourceLocale(
    translationValues,
    SPEAKER_TRANSLATION_FIELD_KEYS,
    activeLocale,
  )

  const handleAutoTranslate = (mode: TranslationApplyMode) => {
    if (!sourceLocaleForTranslate) {
      toast.error(t('common.translations.addTextBeforeTranslating'))
      return
    }

    const items = getBatchTranslationItems(
      translationValues,
      translationMeta,
      SPEAKER_TRANSLATION_FIELD_KEYS,
      sourceLocaleForTranslate,
      mode,
    )
    if (items.length === 0) {
      toast.info(t('common.translations.noEligibleFields'))
      return
    }

    const beforeValues = translationValues
    const beforeMeta = translationMeta
    translateBatch.mutate(
      {
        sourceLocale: sourceLocaleForTranslate,
        targetLocales: SPEAKER_BUSINESS_LOCALES.filter(l => l !== sourceLocaleForTranslate),
        items,
      },
      {
        onSuccess: response => {
          const applied = applyBatchTranslationResults(beforeValues, beforeMeta, response, {
            mode,
          })
          const summary = summarizeAppliedBatch(beforeValues, beforeMeta, response, mode)
          setTranslationValues(applied.values)
          setTranslationMeta(applied.meta)
          toast.success(t('common.translations.translatedSummary', summary))
        },
        onError: error => {
          toast.error(error?.message ?? t('common.translations.serviceFailed'))
        },
      },
    )
  }

  const handleSave = () => {
    updateSpeaker.mutate(
      {
        speakerId: speaker.id,
        data: {
          ...editData,
          position: pickPrimary('position', speaker.position),
          company: pickPrimary('company', speaker.company),
          bio: pickPrimary('bio', speaker.bio),
          translations: translationValues,
          translationMeta,
        },
      },
      { onSuccess: () => setExpanded(false) },
    )
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/40"
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
              title={t('events.speakers.form.resendInviteTitle')}
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
        <div className="space-y-4 border-t border-border bg-muted/50 p-4">
          {/* Имена и email — без локализации */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                {t('events.speakers.form.firstName')}
              </label>
              <Input
                value={editData.firstName}
                onChange={e => setEditData({ ...editData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                {t('events.speakers.form.lastName')}
              </label>
              <Input
                value={editData.lastName}
                onChange={e => setEditData({ ...editData, lastName: e.target.value })}
              />
            </div>
            {speaker.invitedEmail && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  {t('events.speakers.form.emailLabel')}
                </label>
                <Input value={speaker.invitedEmail} disabled className="bg-muted" />
              </div>
            )}
          </div>

          {/* Должность / компания / биография — мультиязычные */}
          <MultilingualTabsField
            fields={translationFields}
            values={translationValues}
            meta={translationMeta}
            activeLocale={activeLocale}
            onLocaleChange={setActiveLocale}
            onValueChange={handleTranslationChange}
          />
          <TranslateFieldsToolbar
            sourceLocale={sourceLocaleForTranslate}
            activeLocale={activeLocale}
            isPending={translateBatch.isPending}
            disabled={!sourceLocaleForTranslate}
            onTranslateEmpty={() => handleAutoTranslate('fill_empty')}
            onUpdateAuto={() => handleAutoTranslate('update_auto')}
          />

          <div className="space-y-2">
            <label className="mb-1 block text-sm font-medium text-muted-foreground">
              {t('events.speakers.form.socialsLabel')}
            </label>
            <Input
              placeholder="LinkedIn URL"
              value={editData.linkedinUrl}
              onChange={e => setEditData({ ...editData, linkedinUrl: e.target.value })}
            />
            <Input
              placeholder="Website URL"
              value={editData.websiteUrl}
              onChange={e => setEditData({ ...editData, websiteUrl: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(false)}>
              {t('actions.cancel')}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={updateSpeaker.isPending}>
              {updateSpeaker.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('actions.save')}
            </Button>
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
  onUpdateTranslations,
  onDelete,
  errors,
}: {
  speaker: LocalSpeaker
  index: number
  onUpdate: (id: string, field: string, value: string) => void
  onUpdateTranslations: (id: string, draft: SpeakerTranslationDraft) => void
  onDelete: (id: string) => void
  errors?: any
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const draft = useSpeakerTranslationsDraft({
    translations: speaker.translations as Record<
      string,
      Partial<Record<AppLocale, string>>
    > | null | undefined,
    translationMeta: speaker.translationMeta as Record<
      string,
      Partial<Record<AppLocale, unknown>>
    > | null | undefined,
    position: speaker.position,
    company: speaker.company,
    bio: speaker.bio,
  })

  // На любое изменение translations пушим вверх — parent держит speakers array.
  React.useEffect(() => {
    onUpdateTranslations(speaker.id, {
      translations: draft.translationValues,
      translationMeta: draft.translationMeta,
      position: draft.pickPrimary('position'),
      company: draft.pickPrimary('company'),
      bio: draft.pickPrimary('bio'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.translationValues, draft.translationMeta])

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10">
            <User className="h-5 w-5 text-brand-secondary" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {formatUserName(speaker.firstName, speaker.lastName) ||
                `${t('events.speakers.form.speakerLabel')} ${index + 1}`}
            </p>
            {speaker.position && <p className="text-sm text-muted-foreground">{speaker.position}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errors && (
            <span className="text-xs text-destructive">{t('events.speakers.form.requiredFields')}</span>
          )}
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
        <div className="space-y-4 border-t border-border bg-muted/50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                {t('events.speakers.form.firstNameLabel')}
              </label>
              <Input
                placeholder={t('events.speakers.form.firstNamePlaceholder')}
                value={speaker.firstName}
                onChange={e => onUpdate(speaker.id, 'firstName', e.target.value)}
              />
              {errors?.firstName && (
                <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                {t('events.speakers.form.lastNameLabel')}
              </label>
              <Input
                placeholder={t('events.speakers.form.lastNamePlaceholder')}
                value={speaker.lastName}
                onChange={e => onUpdate(speaker.id, 'lastName', e.target.value)}
              />
              {errors?.lastName && (
                <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                {t('events.speakers.form.avatarUrlLabel')}
              </label>
              <Input
                placeholder="https://example.com/avatar.jpg"
                value={speaker.avatarUrl}
                onChange={e => onUpdate(speaker.id, 'avatarUrl', e.target.value)}
              />
            </div>
          </div>

          {/* Должность / компания / биография — мультиязычные с Tilmoch */}
          <SpeakerTranslationsBlock draft={draft} t={t} />
          {errors?.position && (
            <p className="mt-1 text-xs text-destructive">{errors.position.message}</p>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              {t('events.speakers.form.socialsLabel')}
            </label>
            <div className="space-y-2">
              <Input
                placeholder="https://linkedin.com/in/username"
                value={speaker.linkedinUrl}
                onChange={e => onUpdate(speaker.id, 'linkedinUrl', e.target.value)}
              />
              <Input
                placeholder="https://example.com"
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

  const handleAddSpeaker = (
    data: AddSpeakerFormValues,
    draft: SpeakerTranslationDraft,
  ) => {
    if (isApiMode) {
      const requestData: CreateSpeakerRequest = {
        firstName: data.firstName,
        lastName: data.lastName,
        position: draft.position || data.position,
        company: draft.company || data.company || undefined,
        bio: draft.bio || data.bio || undefined,
        avatarUrl: data.avatarUrl || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        websiteUrl: data.websiteUrl || undefined,
        translations: draft.translations as never,
        translationMeta: draft.translationMeta as never,
      }
      createSpeaker.mutate(requestData, {
        onSuccess: () => setAddDialogOpen(false),
      })
    } else {
      const newSpeaker: LocalSpeaker = {
        id: `speaker-${Date.now()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        position: draft.position || data.position,
        company: draft.company || data.company || '',
        bio: draft.bio || data.bio || '',
        avatarUrl: data.avatarUrl || '',
        linkedinUrl: data.linkedinUrl || '',
        websiteUrl: data.websiteUrl || '',
        translations: draft.translations as never,
        translationMeta: draft.translationMeta as never,
      }
      form.setValue('speakers', [...localSpeakers, newSpeaker])
      setAddDialogOpen(false)
    }
  }

  const handleInviteSpeaker = (
    data: InviteSpeakerFormValues,
    draft: SpeakerTranslationDraft,
  ) => {
    inviteSpeaker.mutate(
      {
        ...data,
        position: draft.position || data.position,
        company: draft.company || data.company,
        bio: draft.bio || data.bio,
      },
      { onSuccess: () => setInviteDialogOpen(false) },
    )
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

  const handleUpdateLocalSpeakerTranslations = (
    id: string,
    draft: SpeakerTranslationDraft,
  ) => {
    const updated = localSpeakers.map(s => {
      if (s.id === id) {
        return {
          ...s,
          position: draft.position,
          company: draft.company,
          bio: draft.bio,
          translations: draft.translations,
          translationMeta: draft.translationMeta,
        }
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
          <FormLabel>{t('events.tabs.speakers')}</FormLabel>
          <FormDescription>{t('events.speakers.form.sectionDescription')}</FormDescription>
        </div>

        {isApiMode ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInviteDialogOpen(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              {t('events.speakers.form.inviteAction')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t('actions.add')}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('events.speakers.form.addTitle')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t('events.speakers.tab.loading')}</p>
        </Card>
      ) : speakers.length === 0 ? (
        <Card className="p-8 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t('events.speakers.tab.emptyTitle')}</p>
          {isApiMode ? (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInviteDialogOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                {t('events.speakers.form.inviteTitle')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {t('events.speakers.form.addManuallyAction')}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setAddDialogOpen(true)}
            >
              {t('events.speakers.form.addFirstAction')}
            </Button>
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
                  onUpdateTranslations={handleUpdateLocalSpeakerTranslations}
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
