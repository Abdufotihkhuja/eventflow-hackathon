import { useCallback, useRef, useState } from 'react'

import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Clock,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  ShieldX,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

import { getMediaUrl } from '@api/config'
import type { ApiError } from '@api/types'
import type { Organization } from '@api/services/auth.types'
import type { MemberProfile } from '@api/services/member.types'
import {
  useCurrentUser,
  isOrganizationUser,
  isMemberUser,
  useUploadLogo,
  useUploadMemberAvatar,
} from '@features/profile'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ImageCropperDialog,
  Skeleton,
} from '@shared/ui'
import { useT } from '@eventflow/i18n/react'

export default function SettingsPage() {
  const t = useT()
  const { data: currentUser, isLoading, error } = useCurrentUser()

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{t('settings.batch1.settingsPage.s001')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isMemberUser(currentUser)) {
    return <MemberSettingsView member={currentUser.data} isLoading={isLoading} />
  }

  if (isOrganizationUser(currentUser)) {
    return <OrganizationSettingsView organization={currentUser.data} isLoading={isLoading} />
  }

  return <SettingsSkeleton />
}

type OrganizationSettingsViewProps = {
  organization: Organization
  isLoading: boolean
}

function OrganizationSettingsView({ organization, isLoading }: OrganizationSettingsViewProps) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  const uploadLogo = useUploadLogo({
    onSuccess: () => toast.success(t('settings.batch1.settingsPage.s002')),
    onError: (error: ApiError) => toast.error(error.message || t('settings.batch1.settingsPage.s003')),
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.batch1.settingsPage.s004'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.batch1.settingsPage.s005'))
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

  const getInitials = () => {
    if (!organization?.organizationName) return '?'
    return organization.organizationName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const fmtDate = (dateString?: string) => {
    if (!dateString) return '—'
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: ru })
    } catch {
      return '—'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.batch1.settingsPage.s006')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.batch1.settingsPage.s007')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('settings.batch1.settingsPage.s008')}</CardTitle>
            <CardDescription>{t('settings.batch1.settingsPage.s009')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {isLoading ? (
                  <Skeleton className="size-20 rounded-full" />
                ) : (
                  <>
                    <Avatar className="size-20 border-2 border-border">
                      <AvatarImage src={getMediaUrl(organization?.logoUrl)} alt={organization?.organizationName} />
                      <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLogo.isPending}
                      className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {uploadLogo.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  </>
                )}
              </div>
              <div className="flex-1">
                {isLoading ? (
                  <>
                    <Skeleton className="mb-1 h-6 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold">{organization?.organizationName}</h3>
                    <p className="text-sm text-muted-foreground">{organization?.email}</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4">
              <InfoRow label={t('admin.tables.columns.email')} value={organization?.email} isLoading={isLoading} icon={<Mail className="size-4" />} />
              <InfoRow label={t('settings.batch1.settingsPage.s010')} value={organization?.phone || '—'} isLoading={isLoading} icon={<Phone className="size-4" />} />
              <InfoRow label={t('settings.batch1.settingsPage.s011')} value={organization?.description || t('settings.batch1.settingsPage.s012')} isLoading={isLoading} />
              <InfoRow label={t('settings.batch1.settingsPage.s013')} value={organization?.inn || t('settings.batch1.settingsPage.s014')} isLoading={isLoading} />
              <InfoRow label={t('settings.batch1.settingsPage.s015')} value={organization?.industry || t('settings.batch1.settingsPage.s016')} isLoading={isLoading} icon={<Briefcase className="size-4" />} />
              <InfoRow label={t('settings.batch1.settingsPage.s017')} value={organization?.companySize != null && organization?.companySize !== '' ? String(organization.companySize) : t('settings.batch1.settingsPage.s012')} isLoading={isLoading} icon={<User className="size-4" />} />
              <InfoRow label={t('settings.batch1.settingsPage.s018')} value={fmtDate(organization?.createdAt)} isLoading={isLoading} icon={<Calendar className="size-4" />} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.batch1.settingsPage.s019')}</CardTitle>
            <CardDescription>{t('settings.batch1.settingsPage.s020')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {organization?.isEmailVerified ? <ShieldCheck className="size-4 text-success" /> : <ShieldX className="size-4 text-warning" />}{t('settings.batch1.settingsPage.s021')}</p>
              {isLoading ? <Skeleton className="mt-1 h-6 w-20" /> : (
                <p className={`mt-1 text-lg font-semibold ${organization?.isEmailVerified ? 'text-success' : 'text-warning'}`}>
                  {organization?.isEmailVerified ? t('settings.batch1.settingsPage.s022') : t('settings.batch1.settingsPage.s023')}
                </p>
              )}
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">{t('settings.batch1.settingsPage.s024')}</p>
              {isLoading ? <Skeleton className="mt-1 h-6 w-32" /> : (
                <p className="mt-1 text-sm font-medium">{organization?.authProvider === 'EMAIL' ? 'Email' : organization?.authProvider}</p>
              )}
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5" />{t('settings.batch1.settingsPage.s025')}</p>
              {isLoading ? <Skeleton className="mt-1 h-6 w-32" /> : (
                <p className="mt-1 text-sm font-medium">{fmtDate(organization?.updatedAt)}</p>
              )}
            </div>
          </CardContent>
        </Card>
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
          title={t('settings.batch1.settingsPage.s026')}
          description={t('settings.batch1.settingsPage.s027')}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}

type MemberSettingsViewProps = {
  member: MemberProfile
  isLoading: boolean
}

function MemberSettingsView({ member, isLoading }: MemberSettingsViewProps) {
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  const uploadAvatar = useUploadMemberAvatar({
    onSuccess: () => toast.success(t('settings.batch1.settingsPage.s028')),
    onError: (error: ApiError) => toast.error(error.message || t('settings.batch1.settingsPage.s003')),
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.batch1.settingsPage.s004'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.batch1.settingsPage.s005'))
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

  const fmtDate = (dateString?: string) => {
    if (!dateString) return '—'
    try {
      return format(new Date(dateString), 'd MMMM yyyy', { locale: ru })
    } catch {
      return '—'
    }
  }

  const fullName = `${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.batch1.settingsPage.s006')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.batch1.settingsPage.s029')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('settings.batch1.settingsPage.s030')}</CardTitle>
            <CardDescription>{t('settings.batch1.settingsPage.s031')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {isLoading ? (
                  <Skeleton className="size-20 rounded-full" />
                ) : (
                  <>
                    <Avatar className="size-20 border-2 border-border">
                      <AvatarImage src={getMediaUrl(member?.avatarUrl)} alt={fullName} />
                      <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAvatar.isPending}
                      className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {uploadAvatar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  </>
                )}
              </div>
              <div className="flex-1">
                {isLoading ? (
                  <>
                    <Skeleton className="mb-1 h-6 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold">{fullName}</h3>
                    <p className="text-sm text-muted-foreground">{member?.email}</p>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4">
              <InfoRow label={t('admin.tables.columns.email')} value={member?.email} isLoading={isLoading} icon={<Mail className="size-4" />} />
              <InfoRow label={t('settings.batch1.settingsPage.s010')} value={member?.phone || '—'} isLoading={isLoading} icon={<Phone className="size-4" />} />
              <InfoRow label={t('settings.batch1.settingsPage.s032')} value={member?.position || t('settings.batch1.settingsPage.s016')} isLoading={isLoading} icon={<Briefcase className="size-4" />} />
              <InfoRow label={t('settings.batch1.settingsPage.s033')} value={member?.department || t('settings.batch1.settingsPage.s014')} isLoading={isLoading} icon={<Building2 className="size-4" />} />
              <InfoRow label={t('settings.batch1.settingsPage.s034')} value={fmtDate(member?.createdAt)} isLoading={isLoading} icon={<Calendar className="size-4" />} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.batch1.settingsPage.s035')}</CardTitle>
              <CardDescription>{t('settings.batch1.settingsPage.s036')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BadgeCheck className="size-4" />{t('settings.batch1.settingsPage.s037')}</p>
                {isLoading ? <Skeleton className="mt-1 h-6 w-32" /> : (
                  <p className="mt-1 text-sm font-medium">{member?.role?.name ?? '—'}</p>
                )}
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="size-4" />{t('settings.batch1.settingsPage.s019')}</p>
                {isLoading ? <Skeleton className="mt-1 h-6 w-24" /> : (
                  <Badge variant={member?.status === 'ACTIVE' ? 'default' : 'secondary'} className="mt-1">
                    {member?.status === 'ACTIVE' ? t('settings.batch1.settingsPage.s038') : member?.status === 'INVITED' ? t('settings.batch1.settingsPage.s039') : t('settings.batch1.settingsPage.s040')}
                  </Badge>
                )}
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />{t('settings.batch1.settingsPage.s041')}</p>
                {isLoading ? <Skeleton className="mt-1 h-6 w-32" /> : (
                  <p className="mt-1 text-sm font-medium">{fmtDate(member?.createdAt)}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.batch1.settingsPage.s042')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 border border-border">
                    <AvatarImage src={getMediaUrl(member?.organization?.logoUrl)} alt={member?.organization?.name} />
                    <AvatarFallback className="bg-muted text-sm">{member?.organization?.name?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member?.organization?.name}</p>
                    {member?.organization?.companyName && member.organization.companyName !== member.organization.name && (
                      <p className="truncate text-sm text-muted-foreground">{member.organization.companyName}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
          title={t('settings.batch1.settingsPage.s043')}
          description={t('settings.batch1.settingsPage.s044')}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}

type InfoRowProps = {
  label: string
  value?: string
  isLoading: boolean
  icon?: React.ReactNode
}

function InfoRow({ label, value, isLoading, icon }: InfoRowProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </label>
      {isLoading ? <Skeleton className="mt-1 h-6 w-48" /> : <p className="mt-1 font-medium">{value}</p>}
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
