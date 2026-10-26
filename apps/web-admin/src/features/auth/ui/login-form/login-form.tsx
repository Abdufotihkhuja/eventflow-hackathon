import { useCallback, useEffect, useState } from 'react'

import { Building2, Eye, EyeOff } from 'lucide-react'

import { type MemberLoginResponse, type OrganizationLoginResponse } from '@api/index'
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@shared/ui'

import { useMemberLogin, useOrganizationLogin } from '../../api/use-login'
import type { LoginFormValues, LoginTypeValue } from '../../lib/schemas/login-schema'
import { useLoginForm } from '../../lib/use-login-form'

type LoginFormProps = {
  className?: string
  defaultLoginType?: LoginTypeValue
  onOrganizationSuccess?: (data: OrganizationLoginResponse) => void
  onMemberSuccess?: (data: MemberLoginResponse) => void
  onForgotPassword?: () => void
}

export function LoginForm({
  className,
  defaultLoginType = 'organization',
  onOrganizationSuccess,
  onMemberSuccess,
  onForgotPassword,
}: LoginFormProps) {
  const form = useLoginForm({
    defaultValues: { loginType: defaultLoginType },
  })

  const [showPassword, setShowPassword] = useState(false)
  const loginType = form.watch('loginType')

  // Мутация для организации
  const organizationLogin = useOrganizationLogin({
    onSuccess: (data, variables) => {
      onOrganizationSuccess?.(data)
      form.reset({
        email: variables.email,
        password: '',
        inn: '',
        rememberMe: variables.rememberMe,
        loginType: 'organization',
      })
    },
    onError: error => {
      form.setError('root', {
        type: 'server',
        message: error.message || 'Неверный email или пароль',
      })
    },
  })

  // Мутация для сотрудника
  const memberLogin = useMemberLogin({
    onSuccess: (data, variables) => {
      onMemberSuccess?.(data)
      form.reset({
        email: variables.email,
        password: '',
        inn: variables.inn,
        rememberMe: variables.rememberMe,
        loginType: 'member',
      })
    },
    onError: error => {
      form.setError('root', {
        type: 'server',
        message: error.message || 'Неверный email, пароль или ИНН организации',
      })
    },
  })

  const isPending = organizationLogin.isPending || memberLogin.isPending

  const handleSubmit = useCallback(
    async (values: LoginFormValues): Promise<void> => {
      form.clearErrors('root')

      const { loginType: type, inn, ...payload } = values

      try {
        if (type === 'organization') {
          await organizationLogin.mutateAsync(payload)
        } else {
          // Для сотрудника передаём ИНН организации
          await memberLogin.mutateAsync({
            ...payload,
            inn: inn || '',
          })
        }
      } catch {
        // Ошибка обработана в onError мутации
      }
    },
    [form, organizationLogin, memberLogin]
  )

  const rootError = form.formState.errors.root?.message

  // Очищаем ошибку при изменении полей
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
      <form
        onSubmit={form.handleSubmit(handleSubmit as never)}
        className={cn('space-y-6', className)}
      >
        {/* Переключатель типа входа */}
        <FormField
          control={form.control as never}
          name="loginType"
          render={({ field }) => (
            <FormItem>
              <Tabs
                value={field.value}
                onValueChange={value => field.onChange(value as LoginTypeValue)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="organization" className="text-sm">
                    Организация
                  </TabsTrigger>
                  <TabsTrigger value="member" className="text-sm">
                    Сотрудник
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          {/* ИНН организации — только для сотрудника */}
          {loginType === 'member' && (
            <FormField
              control={form.control as never}
              name="inn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    ИНН организации
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      placeholder="123456789"
                      maxLength={20}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Уточните ИНН у администратора вашей организации
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control as never}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {loginType === 'organization' ? 'Email организации' : 'Рабочий email'}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder={
                      loginType === 'organization' ? 'org@company.com' : 'employee@company.com'
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as never}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Пароль</FormLabel>
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
                        {showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      </span>
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <FormField
              control={form.control as never}
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
                    <FormLabel className="text-sm font-medium">Запомнить меня</FormLabel>
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
                onClick={onForgotPassword}
              >
                Забыли пароль?
              </Button>
            ) : null}
          </div>
        </div>

        {rootError ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
            <p className="text-sm font-medium text-destructive">{rootError}</p>
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? 'Входим...'
            : loginType === 'organization'
              ? 'Войти как организация'
              : 'Войти как сотрудник'}
        </Button>
      </form>
    </Form>
  )
}
