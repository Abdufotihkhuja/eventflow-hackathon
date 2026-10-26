import type { UseFormReturn } from 'react-hook-form'
import { Building2, Briefcase, Phone, User } from 'lucide-react'

import { Button } from '@shared/ui/shadcn/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@shared/ui/shadcn/form'
import { Input } from '@shared/ui/shadcn/input'

import type { MemberProfileFormValues } from '../../lib/schemas/member-profile-schema'

type MemberProfileFormProps = {
  form: UseFormReturn<MemberProfileFormValues>
  onSubmit: (values: MemberProfileFormValues) => void
  isLoading?: boolean
}

/**
 * Форма редактирования профиля сотрудника (member).
 */
export function MemberProfileForm({ form, onSubmit, isLoading = false }: MemberProfileFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Имя
                </FormLabel>
                <FormControl>
                  <Input placeholder="Введите имя" {...field} disabled={isLoading} />
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
                <FormLabel className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Фамилия
                </FormLabel>
                <FormControl>
                  <Input placeholder="Введите фамилию" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Телефон
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Должность
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Например: Менеджер"
                    {...field}
                    value={field.value ?? ''}
                    disabled={isLoading}
                  />
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
                <FormLabel className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Отдел
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Например: Маркетинг"
                    {...field}
                    value={field.value ?? ''}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isLoading}>
            Отменить
          </Button>
          <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
            {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
