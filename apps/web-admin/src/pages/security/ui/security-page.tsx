import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { KeyRound, ShieldAlert, Trash2, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react'

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
  Skeleton,
} from '@shared/ui'

export default function SecurityPage() {
  const navigate = useNavigate()
  const { data: currentUser, isLoading } = useCurrentUser()
  const isMember = isMemberUser(currentUser)

  const [deletePassword, setDeletePassword] = useState('')
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const passwordForm = usePasswordForm()

  const changePassword = useChangePassword({
    onSuccess: () => {
      toast.success('Пароль успешно изменён')
      passwordForm.reset()
    },
    onError: (error: ApiError) => toast.error(error.message || 'Ошибка смены пароля'),
  })

  const deleteAccount = useDeleteAccount({
    onSuccess: () => {
      toast.success('Аккаунт удалён')
      clearAuthTokens()
      clearAppQueryCache()
      navigate('/login', { replace: true })
    },
    onError: (error: ApiError) => toast.error(error.message || 'Ошибка удаления аккаунта'),
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
      toast.error('Введите пароль для подтверждения')
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
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Безопасность</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Управление паролем и безопасностью аккаунта
        </p>
      </div>

      {/* Смена пароля */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            Изменить пароль
          </CardTitle>
          <CardDescription>
            Для безопасности рекомендуем использовать надёжный пароль длиной не менее 8 символов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm
            form={passwordForm}
            onSubmit={handlePasswordSubmit}
            isLoading={changePassword.isPending}
          />
        </CardContent>
      </Card>

      {/* Опасная зона — только для организаций, member не может удалить свой аккаунт */}
      {!isMember && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              Опасная зона
            </CardTitle>
            <CardDescription>Действия в этом разделе необратимы. Будьте осторожны.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-medium">Удалить аккаунт</h4>
                <p className="text-sm text-muted-foreground">
                  После удаления все данные организации будут безвозвратно удалены
                </p>
              </div>

              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="size-4" />
                    Удалить аккаунт
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-destructive" />
                      Удалить аккаунт навсегда?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>
                          Это действие <strong>необратимо</strong>. Все данные вашей организации,
                          включая события, пользователей и настройки, будут удалены навсегда.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="delete-password">Введите пароль для подтверждения</Label>
                          <div className="relative">
                            <Input
                              id="delete-password"
                              type={showDeletePassword ? 'text' : 'password'}
                              value={deletePassword}
                              onChange={e => setDeletePassword(e.target.value)}
                              placeholder="Ваш текущий пароль"
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
                    <AlertDialogCancel onClick={handleDeleteDialogClose}>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteAccount.isPending || !deletePassword.trim()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteAccount.isPending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Удаление...
                        </>
                      ) : (
                        'Удалить навсегда'
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
              Удаление аккаунта
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Для удаления вашего аккаунта обратитесь к администратору организации. Самостоятельное
              удаление аккаунта сотрудника недоступно.
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
