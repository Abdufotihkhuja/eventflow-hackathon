/**
 * Форма создания/редактирования сотрудника
 */

import { type UseFormReturn } from 'react-hook-form'
import { AlertCircle, Loader2, Mail, Phone } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import {
  getOrganizationRoleDescription,
  getOrganizationRoleLabel,
  type OrganizationRole,
} from '@api/services'
import { cn } from '@shared/lib/cn'
import {
  Button,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@shared/ui'

type UserFormProps = {
  form: UseFormReturn<any, any, any>
  onSubmit: (values: any) => void
  isLoading?: boolean
  isEdit?: boolean
  roles?: OrganizationRole[]
  isRolesLoading?: boolean
  /** Server-side error to show inline (the global toast is hidden behind the sheet). */
  errorMessage?: string
}

export function UserForm({
  form,
  onSubmit,
  isLoading,
  isEdit,
  roles = [],
  isRolesLoading,
  errorMessage,
}: UserFormProps) {
  const t = useT()
  const getRoleLabel = getOrganizationRoleLabel(t)
  const getRoleDescription = getOrganizationRoleDescription(t)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Email - только для создания */}
        {!isEdit && (
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {t('users.form.email')}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('users.form.emailPlaceholder')}
                    type="email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t('users.form.emailDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Имя и Фамилия */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('users.form.firstName')}
                  <span className="text-destructive ml-1">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t('users.form.firstNamePlaceholder')} disabled={isLoading} {...field} />
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
                <FormLabel>
                  {t('users.form.lastName')}
                  <span className="text-destructive ml-1">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t('users.form.lastNamePlaceholder')} disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Роль */}
        <FormField
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('users.form.role')}
                <span className="text-destructive ml-1">*</span>
              </FormLabel>
              {isRolesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ''}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('users.form.selectRole')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id} className="cursor-pointer">
                        <div className="flex flex-col">
                          <span>{getRoleLabel(role)}</span>
                          {getRoleDescription(role) && (
                            <span className="text-xs text-muted-foreground">
                              {getRoleDescription(role)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormDescription>
                {field.value &&
                  getRoleDescription(roles.find(r => r.id === field.value) ?? null)}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Телефон */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {t('users.form.phone')}
              </FormLabel>
              <FormControl>
                <Input placeholder="+7 999 123 45 67" type="tel" disabled={isLoading} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Должность и Отдел */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('users.form.position')}</FormLabel>
                <FormControl>
                  <Input placeholder="Event Manager" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('users.form.department')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('users.form.departmentPlaceholder')} disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Inline server error (toast is hidden behind the sheet) */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={isLoading} onClick={() => form.reset()}>
            {t('actions.reset')}
          </Button>
          <Button type="submit" disabled={isLoading} className={cn('gap-2', isLoading && 'pr-5')}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? t('users.form.saveChanges') : t('users.form.createEmployee')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
