import type { UseFormReturn } from 'react-hook-form'
import { Building2, Briefcase, MapPin, Phone, User } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

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
import { Textarea } from '@shared/ui/shadcn/textarea'

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
  const t = useT()

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
                  {t('profile.fields.firstName')}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('profile.placeholders.firstName')}
                    {...field}
                    disabled={isLoading}
                  />
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
                  {t('profile.fields.lastName')}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('profile.placeholders.lastName')}
                    {...field}
                    disabled={isLoading}
                  />
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
                {t('profile.fields.phone')}
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
                  {t('profile.fields.position')}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('profile.placeholders.position')}
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
                  {t('profile.fields.department')}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('profile.placeholders.department')}
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

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {t('profile.fields.location')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t('profile.placeholders.location')}
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
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {t('profile.fields.bio')}
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t('profile.placeholders.bio')}
                  {...field}
                  value={field.value ?? ''}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isLoading}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
            {isLoading ? t('profile.actions.saving') : t('profile.actions.saveChanges')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
