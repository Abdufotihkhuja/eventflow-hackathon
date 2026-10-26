import type { UseFormReturn } from 'react-hook-form'
import { Building2, Briefcase, Hash, Phone, Users } from 'lucide-react'

import { Button } from '@shared/ui/shadcn/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@shared/ui/shadcn/form'
import { Input } from '@shared/ui/shadcn/input'
import { Textarea } from '@shared/ui/shadcn/textarea'

import type { ProfileFormValues } from '../../lib/schemas/profile-schema'

type ProfileFormProps = {
  form: UseFormReturn<ProfileFormValues>
  onSubmit: (values: ProfileFormValues) => void
  isLoading?: boolean
}

/**
 * Форма редактирования профиля организации.
 * Включает поля: название, описание, телефон.
 */
export function ProfileForm({ form, onSubmit, isLoading = false }: ProfileFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Название организации
              </FormLabel>
              <FormControl>
                <Input placeholder="Введите название организации" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Расскажите о вашей организации..."
                  className="min-h-[120px] resize-none"
                  disabled={isLoading}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Краткая информация об организации (макс. 500 символов)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <FormField
          control={form.control}
          name="inn"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                ИНН организации
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="123456789"
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                  maxLength={20}
                />
              </FormControl>
              {!field.value?.trim() && (
                <FormDescription className="text-warning">
                  ИНН необходим для входа сотрудников в систему
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Отрасль
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Например: IT, Образование, Медицина"
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
          name="companySize"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Количество сотрудников
              </FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Например: 10"
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '')
                    field.onChange(v)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
