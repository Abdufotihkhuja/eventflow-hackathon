import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  ArrowRight,
  Camera,
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import type { Organization } from '@api/services/auth.types'
import type { ApiError } from '@api/types'
import {
  ProfileForm,
  useCompleteOrgOnboarding,
  useDeleteLogo,
  useProfileForm,
  useUpdateProfile,
  useUploadLogo,
  type ProfileSubmitValues,
} from '@features/profile'
import { cn } from '@shared/lib/cn'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  ImageCropperDialog,
  PageHeader,
} from '@shared/ui'

import { EmailVerificationCard } from './email-verification-card'
import { SettingsNav, type SettingsNavItem } from './settings-nav'
import { SettingsSection } from './settings-section'
import { VerificationStatusCard } from './verification-status-card'

type OrganizationSettingsViewProps = {
  organization: Organization
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export function OrganizationSettingsView({ organization }: OrganizationSettingsViewProps) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  const profileForm = useProfileForm({
    defaultValues: {
      organizationName: organization.organizationName ?? '',
      description: organization.description ?? '',
      phone: organization.phone ?? '',
      inn: organization.inn ?? '',
      industry: organization.industry ?? '',
      companySize:
        organization.companySize != null && organization.companySize !== ''
          ? String(organization.companySize)
          : '',
      address: organization.address ?? '',
      website: organization.website ?? '',
    },
  })

  useEffect(() => {
    profileForm.reset({
      organizationName: organization.organizationName ?? '',
      description: organization.description ?? '',
      phone: organization.phone ?? '',
      inn: organization.inn ?? '',
      industry: organization.industry ?? '',
      companySize:
        organization.companySize != null && organization.companySize !== ''
          ? String(organization.companySize)
          : '',
      address: organization.address ?? '',
      website: organization.website ?? '',
    })
  }, [organization, profileForm])

  const updateProfile = useUpdateProfile({
    onSuccess: () => toast.success(t('toasts.profile.updated')),
    onError: (err: ApiError) => toast.error(err.message || t('toasts.profile.updateError')),
  })

  const uploadLogo = useUploadLogo({
    onSuccess: () => toast.success(t('toasts.profile.logoUploaded')),
    onError: (err: ApiError) => toast.error(err.message || t('toasts.profile.logoUploadError')),
  })

  const deleteLogo = useDeleteLogo({
    onSuccess: () => toast.success(t('toasts.profile.logoDeleted')),
    onError: (err: ApiError) => toast.error(err.message || t('toasts.profile.logoDeleteError')),
  })

  const completeOnboarding = useCompleteOrgOnboarding({
    onSuccess: () => toast.success(t('toasts.profile.onboardingCompleted')),
    onError: (err: ApiError) => toast.error(err.message || t('toasts.profile.onboardingError')),
  })

  const handleProfileSubmit = (values: ProfileSubmitValues) => {
    updateProfile.mutate({
      organizationName: values.organizationName,
      description: values.description || null,
      translations: values.translations,
      translationMeta: values.translationMeta,
      phone: values.phone || null,
      inn: values.inn || null,
      industry: values.industry || null,
      companySize: values.companySize ? Number(values.companySize) : null,
      address: values.address || null,
      website: values.website || null,
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('toasts.profile.selectImage'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('toasts.profile.maxImageSize'))
      return
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(URL.createObjectURL(file))
    setCropOpen(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropComplete = useCallback(
    (blob: Blob) => {
      const file = new File([blob], 'logo.png', { type: 'image/png' })
      uploadLogo.mutate(file)
      if (cropSrc) URL.revokeObjectURL(cropSrc)
      setCropSrc(null)
    },
    [uploadLogo, cropSrc]
  )

  const navItems: SettingsNavItem[] = [
    { id: 'profile', label: t('settings.sections.profile') },
    { id: 'team', label: t('settings.sections.team') },
    { id: 'billing', label: t('billing.settingsLink.title') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${t('settings.organizationKicker')} · ${organization.organizationName}`}
        title={t('workspace.layout.routes.settings.title')}
        description={t('settings.org.description')}
      />

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <SettingsNav items={navItems} />

        <div className="min-w-0 space-y-5">
          <SettingsSection
            id="profile"
            title={t('settings.sections.profile')}
            description={t('settings.sections.profileDescription')}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="group relative shrink-0">
                <Avatar className="size-20 rounded-xl border border-border">
                  <AvatarImage
                    src={getMediaUrl(organization.logoUrl)}
                    alt={organization.organizationName}
                    className="rounded-xl"
                  />
                  <AvatarFallback className="rounded-xl bg-secondary text-xl font-semibold text-foreground">
                    {getInitials(organization.organizationName)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'absolute inset-0 flex items-center justify-center rounded-xl bg-black/55 opacity-0 transition-opacity group-hover:opacity-100'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploadLogo.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLogo.isPending}
                    className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                    aria-label={t('profile.actions.upload')}
                  >
                    {uploadLogo.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="truncate text-[15px] font-semibold text-foreground">
                    {organization.organizationName}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{organization.email}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('settings.profile.emailReadonly')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLogo.isPending}
                  >
                    {uploadLogo.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 size-4" />
                    )}
                    {t('profile.actions.upload')}
                  </Button>
                  {organization.logoUrl && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={deleteLogo.isPending}>
                          {deleteLogo.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4 text-destructive" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('profile.dialogs.deleteLogoTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('profile.dialogs.irreversible')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteLogo.mutate()}>
                            {t('actions.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <ProfileForm
                form={profileForm}
                onSubmit={handleProfileSubmit}
                isLoading={updateProfile.isPending}
                rawTranslations={organization.translations}
                rawTranslationMeta={organization.translationMeta}
                fallbackCompanyName={organization.organizationName}
                fallbackDescription={organization.description}
              />
            </div>
          </SettingsSection>

          {!organization.isEmailVerified && organization.email && (
            <EmailVerificationCard email={organization.email} />
          )}

          <VerificationStatusCard
            status={organization.verificationStatus}
            rejectionReason={organization.rejectionReason}
            verifiedAt={organization.verifiedAt}
            isEmailVerified={organization.isEmailVerified}
            isLoading={false}
          />

          <SettingsSection
            id="team"
            title={t('settings.sections.team')}
            description={t('settings.sections.teamDescription')}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary text-muted-foreground">
                  <Users className="size-5" />
                </div>
                <p className="text-sm text-muted-foreground">{t('settings.team.manageHint')}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link to="/users">
                  {t('settings.team.openTeam')}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection
            id="billing"
            title={t('billing.settingsLink.title')}
            description={t('billing.settingsLink.description')}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-secondary text-muted-foreground">
                  <CreditCard className="size-5" />
                </div>
                <p className="text-sm text-muted-foreground">{t('billing.description')}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link to="/settings/billing">
                  {t('billing.settingsLink.cta')}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </SettingsSection>

          {!organization.isOnboardingCompleted && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-card text-muted-foreground">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t('profile.onboarding.title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.onboarding.organizationDescription')}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={completeOnboarding.isPending}
                onClick={() => completeOnboarding.mutate()}
                className="shrink-0"
              >
                {completeOnboarding.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 size-4" />
                    {t('profile.actions.completeSetup')}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {cropSrc && (
        <ImageCropperDialog
          open={cropOpen}
          onOpenChange={open => {
            setCropOpen(open)
            if (!open && cropSrc) {
              URL.revokeObjectURL(cropSrc)
              setCropSrc(null)
            }
          }}
          imageSrc={cropSrc}
          aspect={1}
          cropShape="round"
          title={t('profile.crop.logoTitle')}
          description={t('profile.crop.logoDescription')}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
