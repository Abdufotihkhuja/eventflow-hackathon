import { useCallback, useEffect, useRef, useState } from 'react'

import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Building2, Camera, CheckCircle2, Loader2, Mail, Phone, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { getMediaUrl } from '@api/config'
import type { Organization } from '@api/services/auth.types'
import {
  useUpdateProfile,
  useUploadLogo,
  useDeleteLogo,
  useCompleteOrgOnboarding,
  useProfileForm,
  ProfileForm,
  type ProfileFormValues,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ImageCropperDialog,
  Skeleton,
} from '@shared/ui'

import { EmailVerificationCard } from './email-verification-card'
import { VerificationStatusCard } from './verification-status-card'

type OrganizationProfileViewProps = {
  organization: Organization
  isLoading: boolean
}

export function OrganizationProfileView({ organization, isLoading }: OrganizationProfileViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  const profileForm = useProfileForm({
    defaultValues: {
      organizationName: organization?.organizationName ?? '',
      description: organization?.description ?? '',
      phone: organization?.phone ?? '',
      inn: organization?.inn ?? '',
      industry: organization?.industry ?? '',
      companySize:
        organization?.companySize != null && organization.companySize !== ''
          ? String(organization.companySize)
          : '',
    },
  })

  useEffect(() => {
    if (organization) {
      profileForm.reset({
        organizationName: organization.organizationName,
        description: organization.description ?? '',
        phone: organization.phone ?? '',
        inn: organization.inn ?? '',
        industry: organization.industry ?? '',
        companySize:
          organization.companySize != null && organization.companySize !== ''
            ? String(organization.companySize)
            : '',
      })
    }
  }, [organization, profileForm])

  const updateProfile = useUpdateProfile({
    onSuccess: () => toast.success('Профиль успешно обновлён'),
    onError: (err: { message?: string }) => toast.error(err.message || 'Не удалось обновить профиль'),
  })

  const uploadLogo = useUploadLogo({
    onSuccess: () => toast.success('Логотип загружен'),
    onError: (err: { message?: string }) => toast.error(err.message || 'Не удалось загрузить логотип'),
  })

  const deleteLogo = useDeleteLogo({
    onSuccess: () => toast.success('Логотип удалён'),
    onError: (err: { message?: string }) => toast.error(err.message || 'Не удалось удалить логотип'),
  })

  const completeOnboarding = useCompleteOrgOnboarding({
    onSuccess: () => toast.success('Настройка профиля завершена'),
    onError: (err: { message?: string }) => toast.error(err.message || 'Не удалось завершить настройку'),
  })

  const handleProfileSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate({
      organizationName: values.organizationName,
      description: values.description || null,
      phone: values.phone || null,
      inn: values.inn || null,
      industry: values.industry || null,
      companySize: values.companySize ? Number(values.companySize) : null,
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Максимальный размер — 5 МБ')
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

  const getInitials = (name?: string | null) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Профиль организации</h1>
        <p className="mt-1 text-sm text-muted-foreground">Управляйте данными вашей организации</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            Логотип и контакты
          </CardTitle>
          <CardDescription>Загрузите логотип и укажите контактную информацию</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="group relative">
              {isLoading ? (
                <Skeleton className="size-24 rounded-full" />
              ) : (
                <>
                  <Avatar className="size-24 border-2 border-border">
                    <AvatarImage src={getMediaUrl(organization?.logoUrl)} alt={organization?.organizationName} />
                    <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                      {getInitials(organization?.organizationName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn('absolute inset-0 flex items-center justify-center rounded-full', 'bg-black/60 opacity-0 transition-opacity group-hover:opacity-100')}>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploadLogo.isPending} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLogo.isPending}
                      className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                    >
                      {uploadLogo.isPending ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
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
                  <div>
                    <h3 className="text-lg font-semibold">{organization?.organizationName}</h3>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="size-3.5" />
                      {organization?.email}
                    </p>
                    {organization?.phone && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="size-3.5" />
                        {organization.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadLogo.isPending}>
                      {uploadLogo.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                      Загрузить
                    </Button>
                    {organization?.logoUrl && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={deleteLogo.isPending}>
                            {deleteLogo.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-destructive" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить логотип?</AlertDialogTitle>
                            <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteLogo.mutate()}>Удалить</AlertDialogAction>
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

      {!isLoading && !organization?.isEmailVerified && organization?.email && (
        <EmailVerificationCard email={organization.email} />
      )}

      <VerificationStatusCard
        status={organization?.verificationStatus}
        rejectionReason={organization?.rejectionReason}
        verifiedAt={organization?.verifiedAt}
        isEmailVerified={organization?.isEmailVerified}
        isLoading={isLoading}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            Информация об организации
          </CardTitle>
          <CardDescription>Обновите данные вашей организации. Эти данные отображаются публично.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <ProfileForm form={profileForm} onSubmit={handleProfileSubmit} isLoading={updateProfile.isPending} />
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
              <p className="font-medium">Завершить настройку профиля</p>
              <p className="text-sm text-muted-foreground">Подтвердите, что вы заполнили все необходимые данные</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={completeOnboarding.isPending} onClick={() => completeOnboarding.mutate()} className="shrink-0">
            {completeOnboarding.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Завершить настройку
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
          title="Обрезка логотипа"
          description="Выберите область для логотипа организации"
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
