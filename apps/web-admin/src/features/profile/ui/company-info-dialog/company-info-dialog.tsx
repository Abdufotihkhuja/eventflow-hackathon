import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Briefcase, Globe, Users } from 'lucide-react'

import type { Organization } from '@api/services/auth.types'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/shadcn/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@shared/ui/shadcn/form'
import { Input } from '@shared/ui/shadcn/input'
import { Button } from '@shared/ui/shadcn/button'

import {
  companyInfoSchema,
  type CompanyInfoFormValues,
} from '../../lib/schemas/company-info-schema'
import { useUpdateProfile } from '../../api/use-update-profile'
import { useCompleteCompanyInfo } from '../../api/use-complete-company-info'

type CompanyInfoDialogProps = {
  open: boolean
  organization: Organization
  onComplete?: () => void
}

/**
 * Popup «Заполните доп. поля» для организатора.
 * Показывается при actorType === 'organization' и needsCompanyInfo === true.
 * Организатор может закрыть без сохранения и заполнить при следующем входе.
 */
export function CompanyInfoDialog({ open, organization, onComplete }: CompanyInfoDialogProps) {
  const updateProfile = useUpdateProfile()
  const completeCompanyInfo = useCompleteCompanyInfo()

  const form = useForm<CompanyInfoFormValues>({
    resolver: zodResolver(companyInfoSchema),
    mode: 'onBlur',
    defaultValues: {
      industry: organization.industry ?? '',
      website: '',
      companySize:
        organization.companySize != null && organization.companySize !== ''
          ? String(organization.companySize)
          : '',
    },
  })

  useEffect(() => {
    if (open && organization) {
      form.reset({
        industry: organization.industry ?? '',
        website: '',
        companySize:
          organization.companySize != null && organization.companySize !== ''
            ? String(organization.companySize)
            : '',
      })
    }
  }, [open, organization, form])

  const onSubmit = useCallback(
    async (values: CompanyInfoFormValues) => {
      form.clearErrors('root')

      const industry = values.industry?.trim() || undefined
      const website = values.website?.trim() || undefined
      const companySize =
        values.companySize !== undefined && values.companySize !== ''
          ? Number(values.companySize)
          : undefined

      if (!industry && !website && companySize === undefined) {
        form.setError('root', {
          type: 'manual',
          message: 'Заполните хотя бы одно поле, прежде чем продолжить.',
        })
        return
      }

      try {
        await updateProfile.mutateAsync({
          industry,
          companySize,
          website,
        })
        await completeCompanyInfo.mutateAsync()
        onComplete?.()
      } catch {
        // Ошибки обрабатываются в мутациях / тостере
      }
    },
    [updateProfile, completeCompanyInfo, onComplete]
  )

  const isPending = updateProfile.isPending || completeCompanyInfo.isPending
  const rootError = form.formState.errors.root?.message

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Заполните доп. поля</DialogTitle>
          <DialogDescription>
            Укажите данные о компании — это поможет участникам лучше узнать вашу организацию.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {rootError ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {rootError}
              </div>
            ) : null}

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
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Веб-сайт
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="Например: https://example.com"
                      {...field}
                      value={field.value ?? ''}
                      disabled={isPending}
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
                      disabled={isPending}
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

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
