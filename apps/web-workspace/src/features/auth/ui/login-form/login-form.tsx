import { useCallback, useEffect, useState } from 'react'

import { Eye, EyeOff } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { cn } from '@shared/lib/cn'
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@shared/ui'

import { useUnifiedLogin, type UnifiedLoginResult } from '../../api/use-unified-login'
import type { LoginFormValues } from '../../lib/schemas/login-schema'
import { useLoginForm } from '../../lib/use-login-form'

type LoginFormProps = {
  className?: string
  /** Заранее заполнить email (например, из приглашения) */
  defaultEmail?: string
  /** Сделать поле email только для чтения (сценарий приглашения) */
  readOnlyEmail?: boolean
  /** Скрыть «Запомнить меня» и «Забыли пароль» (компактный вид) */
  compact?: boolean
  onSuccess?: (result: UnifiedLoginResult) => void
  onForgotPassword?: (email: string) => void
}

export function LoginForm({
  className,
  defaultEmail,
  readOnlyEmail = false,
  compact = false,
  onSuccess,
  onForgotPassword,
}: LoginFormProps) {
  const t = useT()
  const form = useLoginForm({
    defaultValues: { email: defaultEmail ?? '', rememberMe: !compact },
  })

  const [showPassword, setShowPassword] = useState(false)

  const login = useUnifiedLogin({
    onSuccess: (result, variables) => {
      onSuccess?.(result)
      form.reset({ email: variables.email, password: '', rememberMe: variables.rememberMe })
    },
    onError: error => {
      form.setError('root', {
        type: 'server',
        message: error.message || t('security.login.organizationError'),
      })
    },
  })

  const handleSubmit = useCallback(
    async (values: LoginFormValues): Promise<void> => {
      form.clearErrors('root')
      try {
        await login.mutateAsync(values)
      } catch {
        // Ошибка обработана в onError мутации
      }
    },
    [form, login]
  )

  const rootError = form.formState.errors.root?.message

  useEffect(() => {
    if (!rootError) {
      return
    }

    const subscription = form.watch(() => {
      if (form.formState.errors.root) {
        form.clearErrors('root')
      }
    })

    return () => subscription.unsubscribe()
  }, [form, rootError])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={cn('space-y-6', className)}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('security.login.email')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    readOnly={readOnlyEmail}
                    className={cn(readOnlyEmail && 'bg-muted text-muted-foreground')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('security.login.password')}</FormLabel>
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
                          ? t('security.login.hidePassword')
                          : t('security.login.showPassword')}
                      </span>
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!compact && (
            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={checked => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <div className="leading-none">
                      <FormLabel className="text-sm font-medium">
                        {t('security.login.rememberMe')}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {onForgotPassword ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => onForgotPassword(form.getValues('email'))}
                >
                  {t('security.login.forgotPassword')}
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {rootError ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
            <p className="text-sm font-medium text-destructive">{rootError}</p>
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? t('security.login.signingIn') : t('security.login.submit')}
        </Button>
      </form>
    </Form>
  )
}
