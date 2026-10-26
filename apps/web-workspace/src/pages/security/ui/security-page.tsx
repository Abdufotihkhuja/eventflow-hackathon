import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  KeyRound,
  ShieldAlert,
  Trash2,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  MonitorSmartphone,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import {
  usePasswordForm,
  PasswordForm,
  useChangePassword,
  useDeleteAccount,
  useCurrentUser,
  isMemberUser,
  type PasswordFormValues,
} from '@features/profile'
import { clearAuthTokens } from '@api/config'
import type { ApiError } from '@api/types'
import { clearAppQueryCache } from '@shared/lib/query-client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  PageHeader,
  Skeleton,
} from '@shared/ui'

import { SessionsSection } from './sessions-section'

export default function SecurityPage() {
  const navigate = useNavigate()
  const t = useT()
  const { data: currentUser, isLoading } = useCurrentUser()
  const isMember = isMemberUser(currentUser)

  const [deletePassword, setDeletePassword] = useState('')
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const passwordForm = usePasswordForm()

  const changePassword = useChangePassword({
    onSuccess: () => {
      toast.success(t('toasts.security.passwordChanged'))
      passwordForm.reset()
    },
    onError: (error: ApiError) => toast.error(error.message || t('toasts.security.passwordChangeError')),
  })

  const deleteAccount = useDeleteAccount({
    onSuccess: () => {
      toast.success(t('toasts.security.accountDeleted'))
      clearAuthTokens()
      clearAppQueryCache()
      navigate('/login', { replace: true })
    },
    onError: (error: ApiError) => toast.error(error.message || t('toasts.security.accountDeleteError')),
  })

  const handlePasswordSubmit = (values: PasswordFormValues) => {
    changePassword.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      confirmPassword: values.confirmPassword,
    })
  }

  const handleDeleteAccount = () => {
    if (!deletePassword.trim()) {
      toast.error(t('toasts.security.passwordRequired'))
      return
    }
    deleteAccount.mutate({ password: deletePassword })
  }

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false)
    setDeletePassword('')
    setShowDeletePassword(false)
  }

  if (isLoading) {
    return <SecuritySkeleton />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('security.page.kicker')}
        title={t('security.page.title')}
        description={t('security.page.description')}
      />

      {/* Смена пароля */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            {t('security.password.title')}
          </CardTitle>
          <CardDescription>{t('security.password.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm
            form={passwordForm}
            onSubmit={handlePasswordSubmit}
            isLoading={changePassword.isPending}
          />
        </CardContent>
      </Card>

      {/* Активные сессии */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="size-5 text-primary" />
            {t('security.sessions.title')}
          </CardTitle>
          <CardDescription>{t('security.sessions.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsSection />
        </CardContent>
      </Card>

      {/* Опасная зона — только для организаций, member не может удалить свой аккаунт */}
      {!isMember && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              {t('security.danger.title')}
            </CardTitle>
            <CardDescription>{t('security.danger.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-medium">{t('security.danger.deleteAccount')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('security.danger.deleteDescription')}
                </p>
              </div>

              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="size-4" />
                    {t('security.danger.deleteAccount')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-destructive" />
                      {t('security.danger.dialogTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>{t('security.danger.dialogDescription')}</p>
                        <div className="space-y-2">
                          <Label htmlFor="delete-password">
                            {t('security.danger.passwordLabel')}
                          </Label>
                          <div className="relative">
                            <Input
                              id="delete-password"
                              type={showDeletePassword ? 'text' : 'password'}
                              value={deletePassword}
                              onChange={e => setDeletePassword(e.target.value)}
                              placeholder={t('security.danger.passwordPlaceholder')}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowDeletePassword(!showDeletePassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showDeletePassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleDeleteDialogClose}>
                      {t('actions.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteAccount.isPending || !deletePassword.trim()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteAccount.isPending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          {t('security.danger.deleting')}
                        </>
                      ) : (
                        t('security.danger.confirmDelete')
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Информация для member */}
      {isMember && (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <ShieldAlert className="size-5" />
              {t('security.danger.memberDeleteTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('security.danger.memberDeleteDescription')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SecuritySkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
