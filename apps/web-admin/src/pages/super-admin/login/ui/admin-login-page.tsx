import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import {
  clearAuthTokens,
  setAuthTokens,
  setPlatformElevationToken,
} from '@api/config'
import { adminSdk } from '@api/adminSdk'
import { authService } from '@api/services'
import { clearAppQueryCache } from '@shared/lib/query-client'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@shared/ui'
import { LanguageSwitcher } from '@widgets/admin-layout'

type LoginFormValues = {
  email: string
  password: string
}

export default function AdminLoginPage() {
  const t = useT()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginFormValues) => {
      const response = await authService.loginSuperAdmin(payload)

      clearAppQueryCache()
      setAuthTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      })

      const session = await authService.getSessionMe()
      const actorType = authService.resolveCurrentActorType(session)

      if (actorType !== 'super_admin' || !session.platformRole) {
        clearAuthTokens()
        throw new Error(t('admin.auth.noPlatformAccess'))
      }

      const elevation = await adminSdk.elevations.request({
        mode: 'WRITE',
        reason: 'Open platform administration console',
      })
      if (!elevation.token) {
        clearAuthTokens()
        throw new Error(t('admin.auth.noPlatformAccess'))
      }
      setPlatformElevationToken(elevation.token)

      return response
    },
    onSuccess: () => {
      toast.success(t('admin.auth.welcomeToast'))
      window.location.href = '/admin'
    },
    onError: (error: Error) => {
      form.setError('root', {
        type: 'server',
        message: error.message || t('admin.auth.invalidCredentials'),
      })
    },
  })

  const onSubmit = (data: LoginFormValues) => {
    form.clearErrors('root')
    loginMutation.mutate(data)
  }

  const rootError = form.formState.errors.root?.message

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-md border border-border bg-card text-foreground"
          >
            <Shield className="size-5" />
          </div>
          <div className="text-center">
            <h1 className="text-base font-semibold">Super Admin</h1>
            <p className="text-sm text-muted-foreground">{t('admin.auth.panelSubtitle')}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-1 text-center">
            <h2 className="text-xl font-semibold tracking-tight">{t('admin.auth.title')}</h2>
            <CardDescription>{t('admin.auth.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  rules={{ required: t('admin.auth.emailRequired') }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          autoComplete="email"
                          placeholder="admin@eventflow.uz"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  rules={{ required: t('admin.auth.passwordRequired') }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('admin.auth.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(prev => !prev)}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4 text-muted-foreground" />
                            ) : (
                              <Eye className="size-4 text-muted-foreground" />
                            )}
                            <span className="sr-only">
                              {showPassword
                                ? t('admin.auth.hidePassword')
                                : t('admin.auth.showPassword')}
                            </span>
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {rootError && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
                    <p className="text-sm font-medium text-destructive">{rootError}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t('admin.auth.submitting')}
                    </>
                  ) : (
                    t('admin.auth.submit')
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <a
            href={import.meta.env.VITE_WORKSPACE_APP_URL ?? 'http://app.localhost/login'}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            ← {t('admin.auth.backToWorkspaceLogin')}
          </a>
        </p>

        <p className="mt-4 text-center text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} EventFlow. {t('admin.auth.copyright')}
        </p>
      </div>
    </div>
  )
}
