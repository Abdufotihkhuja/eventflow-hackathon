import { useCallback, useEffect, useRef, useState } from 'react'

import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Phone,
  Shield,
  Trash2,
  Upload,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import { getOrganizationRoleLabel } from '@api/services'
import type { MemberProfile } from '@api/services/member.types'
import {
  useUpdateMemberProfile,
  useUpdateMemberPrivacy,
  useUploadMemberAvatar,
  useDeleteMemberAvatar,
  useCompleteMemberOnboarding,
  useMemberProfileForm,
  MemberProfileForm,
  type MemberProfileFormValues,
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
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ImageCropperDialog,
  PageHeader,
  Skeleton,
  Switch,
} from '@shared/ui'

type MemberProfileViewProps = {
  member: MemberProfile
  isLoading: boolean
}

export function MemberProfileView({ member, isLoading }: MemberProfileViewProps) {
  const t = useT()
  const getRoleLabel = getOrganizationRoleLabel(t)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  const profileForm = useMemberProfileForm({
    defaultValues: {
      firstName: member?.firstName ?? '',
      lastName: member?.lastName ?? '',
      phone: member?.phone ?? '',
      position: member?.position ?? '',
      department: member?.department ?? '',
      bio: member?.bio ?? '',
      location: member?.location ?? '',
    },
  })

  useEffect(() => {
    if (member) {
      profileForm.reset({
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone ?? '',
        position: member.position ?? '',
        department: member.department ?? '',
        bio: member.bio ?? '',
        location: member.location ?? '',
      })
    }
  }, [member, profileForm])

  const updateProfile = useUpdateMemberProfile({
    onSuccess: () => toast.success(t('toasts.profile.updated')),
    onError: (err: { message?: string }) => toast.error(err.message || t('toasts.profile.updateError')),
  })

  const updatePrivacy = useUpdateMemberPrivacy({
    onSuccess: () => toast.success(t('toasts.profile.updated')),
    onError: (err: { message?: string }) => toast.error(err.message || t('toasts.profile.updateError')),
  })

  const uploadAvatar = useUploadMemberAvatar({
    onSuccess: () => toast.success(t('toasts.profile.avatarUploaded')),
    onError: (err: { message?: string }) => toast.error(err.message || t('toasts.profile.avatarUploadError')),
  })

  const deleteAvatar = useDeleteMemberAvatar({
    onSuccess: () => toast.success(t('toasts.profile.avatarDeleted')),
    onError: (err: { message?: string }) => toast.error(err.message || t('toasts.profile.avatarDeleteError')),
  })

  const completeOnboarding = useCompleteMemberOnboarding({
    onSuccess: () => toast.success(t('toasts.profile.onboardingCompleted')),
    onError: (err: { message?: string }) => toast.error(err.message || t('toasts.profile.onboardingError')),
  })

  const handleProfileSubmit = (values: MemberProfileFormValues) => {
    updateProfile.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || null,
      position: values.position || null,
      department: values.department || null,
      bio: values.bio || null,
      location: values.location || null,
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
      const file = new File([blob], 'avatar.png', { type: 'image/png' })
      uploadAvatar.mutate(file)
      if (cropSrc) URL.revokeObjectURL(cropSrc)
      setCropSrc(null)
    },
    [uploadAvatar, cropSrc]
  )

  const getInitials = () => {
    const first = member?.firstName?.[0] ?? ''
    const last = member?.lastName?.[0] ?? ''
    return (first + last).toUpperCase() || '?'
  }

  const fullName = `${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="default" className="bg-success-soft text-success-soft-foreground hover:bg-success-soft/80">
            <CheckCircle className="mr-1 size-3" />
            {t('profile.status.active')}
          </Badge>
        )
      case 'INACTIVE':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 size-3" />
            {t('profile.status.inactive')}
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="outline" className="border-warning text-warning-soft-foreground">
            <Clock className="mr-1 size-3" />
            {t('profile.status.pending')}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const groupPermissions = (permissions: string[]) => {
    const groups: Record<string, string[]> = {}
    permissions.forEach(perm => {
      const [category] = perm.split(':')
      if (!groups[category]) groups[category] = []
      groups[category].push(perm)
    })
    return groups
  }

  const permissionGroups = member?.permissions ? groupPermissions(member.permissions) : {}

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('profile.page.accountKicker')}
        title={t('profile.page.memberTitle')}
        description={t('profile.page.memberDescription')}
        actions={!isLoading && member?.status ? getStatusBadge(member.status) : undefined}
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            {t('profile.cards.photoAndContacts')}
          </CardTitle>
          <CardDescription>{t('profile.cards.photoAndContactsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="group relative">
              {isLoading ? (
                <Skeleton className="size-24 rounded-full" />
              ) : (
                <>
                  <Avatar className="size-24 border-2 border-border">
                    <AvatarImage src={getMediaUrl(member?.avatarUrl)} alt={fullName} />
                    <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn('absolute inset-0 flex items-center justify-center rounded-full', 'bg-black/60 opacity-0 transition-opacity group-hover:opacity-100')}>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploadAvatar.isPending} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAvatar.isPending}
                      className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                    >
                      {uploadAvatar.isPending ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{fullName}</h3>
                      {member?.role && (
                        <Badge variant="outline" className="font-normal">
                          <Shield className="mr-1 size-3" />
                          {getRoleLabel(member.role)}
                        </Badge>
                      )}
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="size-3.5" />
                      {member?.email}
                      {member?.showEmail ? (
                        <Eye className="ml-1 size-3 text-success" title={t('profile.visibility.emailVisible')} />
                      ) : (
                        <EyeOff className="ml-1 size-3 text-muted-foreground/50" title={t('profile.visibility.emailHidden')} />
                      )}
                    </p>
                    {member?.phone && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="size-3.5" />
                        {member.phone}
                        {member?.showPhone ? (
                          <Eye className="ml-1 size-3 text-success" title={t('profile.visibility.phoneVisible')} />
                        ) : (
                          <EyeOff className="ml-1 size-3 text-muted-foreground/50" title={t('profile.visibility.phoneHidden')} />
                        )}
                      </p>
                    )}
                    {(member?.position || member?.department) && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Briefcase className="size-3.5" />
                        {member?.position || t('profile.misc.notSpecified')}
                        {member?.department && ` · ${member.department}`}
                      </p>
                    )}
                    {member?.createdAt && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="size-3.5" />
                        {t('profile.misc.registered', {
                          date: format(new Date(member.createdAt), 'd MMMM yyyy', { locale: ru }),
                        })}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadAvatar.isPending}>
                      {uploadAvatar.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                      {t('profile.actions.uploadPhoto')}
                    </Button>
                    {member?.avatarUrl && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={deleteAvatar.isPending}>
                            {deleteAvatar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-destructive" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('profile.dialogs.deletePhotoTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('profile.dialogs.irreversible')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAvatar.mutate()}>
                              {t('actions.delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              {t('profile.cards.organization')}
            </CardTitle>
            <CardDescription>{t('profile.cards.organizationDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <Avatar className="size-14 border border-border">
                  <AvatarImage src={getMediaUrl(member?.organization?.logoUrl)} alt={member?.organization?.name} />
                  <AvatarFallback className="bg-muted text-lg">
                    {member?.organization?.name?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <p className="font-medium">{member?.organization?.name}</p>
                  {member?.organization?.companyName && member.organization.companyName !== member.organization.name && (
                    <p className="text-sm text-muted-foreground">{member.organization.companyName}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Eye className="size-5 text-primary" />
              {t('profile.cards.privacy')}
            </CardTitle>
            <CardDescription>{t('profile.cards.privacyDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t('profile.visibility.publicProfile')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('profile.visibility.publicProfileHint')}
                    </p>
                  </div>
                  <Switch
                    checked={member?.isPublicProfile ?? false}
                    disabled={updatePrivacy.isPending}
                    onCheckedChange={checked => updatePrivacy.mutate({ isPublicProfile: checked })}
                    aria-label={t('profile.visibility.publicProfile')}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t('profile.visibility.showEmail')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('profile.visibility.showEmailHint')}
                    </p>
                  </div>
                  <Switch
                    checked={member?.showEmail ?? false}
                    disabled={updatePrivacy.isPending}
                    onCheckedChange={checked => updatePrivacy.mutate({ showEmail: checked })}
                    aria-label={t('profile.visibility.showEmail')}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t('profile.visibility.showPhone')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('profile.visibility.showPhoneHint')}
                    </p>
                  </div>
                  <Switch
                    checked={member?.showPhone ?? false}
                    disabled={updatePrivacy.isPending}
                    onCheckedChange={checked => updatePrivacy.mutate({ showPhone: checked })}
                    aria-label={t('profile.visibility.showPhone')}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            {t('profile.cards.permissions')}
          </CardTitle>
          <CardDescription>
            {t('profile.cards.permissionsDescription', {
              count: member?.permissions?.length ?? 0,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : member?.permissions && member.permissions.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(permissionGroups).map(([category, permissions]) => (
                <div key={category}>
                  <h4 className="mb-2 text-sm font-medium capitalize text-muted-foreground">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {permissions.map(perm => (
                      <Badge key={perm} variant="outline" className="font-mono text-xs">{perm}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('profile.cards.noPermissions')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            {t('profile.cards.personalData')}
          </CardTitle>
          <CardDescription>{t('profile.cards.personalDataDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <MemberProfileForm form={profileForm} onSubmit={handleProfileSubmit} isLoading={updateProfile.isPending} />
          )}
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <CheckCircle2 className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{t('profile.onboarding.title')}</p>
              <p className="text-sm text-muted-foreground">
                {t('profile.onboarding.memberDescription')}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={completeOnboarding.isPending} onClick={() => completeOnboarding.mutate()} className="shrink-0">
            {completeOnboarding.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                {t('profile.actions.completeSetup')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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
          title={t('profile.crop.photoTitle')}
          description={t('profile.crop.photoDescription')}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
