/**
 * Детальная информация об организации (Sheet)
 */

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'
import {
  Building2,
  Briefcase,
  CalendarDays,
  Mail,
  Phone,
  FileText,
  Calendar,
  Shield,
  Users,
  Check,
  X,
  Trash2,
  Loader2,
  AlertTriangle,
  Pencil,
  Archive,
  RotateCcw,
} from 'lucide-react'

import type {
  AdminOrganization,
  UpdateAdminOrganizationRequest,
} from '@api/services/superAdmin.types'
import { useUpdateAdminOrganization } from '@features/super-admin'
import {
  applyBatchTranslationResults,
  createBusinessTranslationMeta,
  createBusinessTranslationValues,
  getBatchTranslationItems,
  getFallbackBusinessTranslation,
  MultilingualTabsField,
  resolveBusinessSourceLocale,
  setBusinessTranslationValue,
  summarizeAppliedBatch,
  TranslateFieldsToolbar,
  useTranslateBatch,
  type AppLocale,
  type BusinessTranslationFieldConfig,
  type TranslationApplyMode,
  type TranslationMeta,
  type TranslationValues,
} from '@features/translations'
import { cn } from '@shared/lib/cn'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Separator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  StatusPill,
  statusPillTone,
  Switch,
} from '@shared/ui'

type OrganizationDetailSheetProps = {
  organization: AdminOrganization | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (org: AdminOrganization) => void
  onReject: (org: AdminOrganization) => void
  /** Архивировать активную организацию. */
  onArchive: (org: AdminOrganization) => void
  /** Восстановить архивированную организацию. */
  onRestore: (org: AdminOrganization) => void
  /** Необратимо удалить (только для архивированных). */
  onHardDelete: (org: AdminOrganization) => void
  onOrganizationUpdated?: (org: AdminOrganization) => void
  isPending?: boolean
}

const statusLabelKeys: Record<string, string> = {
  PENDING: 'admin.statuses.pendingVerification',
  APPROVED: 'admin.statuses.approvedFeminine',
  REJECTED: 'admin.statuses.rejectedFeminine',
}

const BUSINESS_LOCALES = ['ru', 'uz', 'en'] as const
const ORGANIZATION_TRANSLATION_FIELD_KEYS = ['name', 'companyName', 'description'] as const

export function OrganizationDetailSheet({
  organization: org,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onArchive,
  onRestore,
  onHardDelete,
  onOrganizationUpdated,
  isPending,
}: OrganizationDetailSheetProps) {
  const t = useT()
  const locale = useLocale()
  const [editOpen, setEditOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [inn, setInn] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [placesFeatureEnabled, setPlacesFeatureEnabled] = useState(false)
  const [activeLocale, setActiveLocale] = useState<AppLocale>('ru')
  const [translationValues, setTranslationValues] = useState<TranslationValues>(() =>
    createBusinessTranslationValues(ORGANIZATION_TRANSLATION_FIELD_KEYS, undefined, {})
  )
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta>(() =>
    createBusinessTranslationMeta(
      ORGANIZATION_TRANSLATION_FIELD_KEYS,
      undefined,
      translationValues
    )
  )

  const updateOrganization = useUpdateAdminOrganization()
  const translateBatch = useTranslateBatch()
  const sourceLocale = resolveBusinessSourceLocale(
    translationValues,
    ORGANIZATION_TRANSLATION_FIELD_KEYS,
    activeLocale
  )
  const translationFields = useMemo<BusinessTranslationFieldConfig[]>(
    () => [
      {
        key: 'name',
        label: t('admin.organizations.fields.representativeName'),
        placeholder: t('admin.organizations.placeholders.name'),
        maxLength: 100,
      },
      {
        key: 'companyName',
        label: t('admin.organizations.fields.companyName'),
        placeholder: t('admin.organizations.placeholders.company'),
        maxLength: 200,
      },
      {
        key: 'description',
        label: t('admin.organizations.sections.description'),
        placeholder: t('admin.organizations.placeholders.description'),
        maxLength: 2000,
        multiline: true,
        rows: 3,
      },
    ],
    [t]
  )

  useEffect(() => {
    if (org) {
      setEmail(org.email)
      setName(org.name)
      setCompanyName(org.companyName)
      setInn(org.inn)
      setDescription(org.description ?? '')
      setPhone(org.phone ?? '')
      setLogoUrl(org.logoUrl ?? '')
      setIndustry(org.industry ?? '')
      setCompanySize(
        org.companySize != null && org.companySize !== '' ? String(org.companySize) : ''
      )
      setIsEmailVerified(org.isEmailVerified)
      setPlacesFeatureEnabled(Boolean(org.placesFeatureEnabled))
      const values = createBusinessTranslationValues(
        ORGANIZATION_TRANSLATION_FIELD_KEYS,
        org.translations,
        {
          name: org.name,
          companyName: org.companyName,
          description: org.description,
        }
      )
      setTranslationValues(values)
      setTranslationMeta(
        createBusinessTranslationMeta(
          ORGANIZATION_TRANSLATION_FIELD_KEYS,
          org.translationMeta,
          values
        )
      )
      setActiveLocale('ru')
    }
  }, [org])

  if (!org) return null

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fallbackName = getFallbackBusinessTranslation(translationValues, 'name', name)
    const fallbackCompanyName = getFallbackBusinessTranslation(
      translationValues,
      'companyName',
      companyName
    )
    const fallbackDescription = getFallbackBusinessTranslation(
      translationValues,
      'description',
      description
    )
    const data: UpdateAdminOrganizationRequest = {
      email: email.trim() || undefined,
      name: fallbackName || undefined,
      companyName: fallbackCompanyName || undefined,
      inn: inn.trim() || undefined,
      description: fallbackDescription || undefined,
      translations: translationValues,
      translationMeta,
      phone: phone.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      industry: industry.trim() || null,
      companySize: companySize.trim() ? Number(companySize) : null,
      isEmailVerified,
      placesFeatureEnabled,
    }
    updateOrganization.mutate(
      { orgId: org.id, data },
      {
        onSuccess: updated => {
          setEditOpen(false)
          onOrganizationUpdated?.(updated)
        },
      }
    )
  }

  const syncScalarFallbacks = (values: TranslationValues) => {
    setName(getFallbackBusinessTranslation(values, 'name', org.name))
    setCompanyName(getFallbackBusinessTranslation(values, 'companyName', org.companyName))
    setDescription(getFallbackBusinessTranslation(values, 'description', org.description ?? ''))
  }

  const handleTranslationChange = (fieldKey: string, locale: AppLocale, value: string) => {
    const next = setBusinessTranslationValue(
      translationValues,
      translationMeta,
      fieldKey,
      locale,
      value
    )
    setTranslationValues(next.values)
    setTranslationMeta(next.meta)
    syncScalarFallbacks(next.values)
  }

  const handleTranslate = (mode: TranslationApplyMode) => {
    if (!sourceLocale) {
      toast.error('Add text in at least one language before translating.')
      return
    }

    const items = getBatchTranslationItems(
      translationValues,
      translationMeta,
      ORGANIZATION_TRANSLATION_FIELD_KEYS,
      sourceLocale,
      mode
    )

    if (items.length === 0) {
      toast.info('No eligible fields to translate.')
      return
    }

    const beforeValues = translationValues
    const beforeMeta = translationMeta
    translateBatch.mutate(
      {
        sourceLocale,
        targetLocales: BUSINESS_LOCALES.filter(locale => locale !== sourceLocale),
        items,
      },
      {
        onSuccess: response => {
          const applied = applyBatchTranslationResults(beforeValues, beforeMeta, response, {
            mode,
          })
          const summary = summarizeAppliedBatch(beforeValues, beforeMeta, response, mode)
          setTranslationValues(applied.values)
          setTranslationMeta(applied.meta)
          syncScalarFallbacks(applied.values)
          toast.success(
            `Translated: ${summary.translated}. Skipped: ${summary.skipped}. Failed: ${summary.failed}.`
          )
        },
        onError: error => {
          toast.error(error?.message ?? 'Translation service failed.')
        },
      }
    )
  }

  const initials = org.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const isPendingStatus = org.verificationStatus === 'PENDING'
  const isArchived = !!org.deletedAt

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('admin.organizations.title')}</SheetTitle>
            <SheetDescription>{t('admin.organizations.description')}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Logo & Name */}
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={org.logoUrl ?? undefined} />
                <AvatarFallback className="bg-muted text-lg font-semibold">
                  {initials || '??'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{org.name}</h3>
                <p className="text-sm text-muted-foreground">{org.companyName}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {isArchived ? (
                    <StatusPill tone={statusPillTone('archived')} size="sm">
                      {t('admin.statuses.archived')}
                    </StatusPill>
                  ) : null}
                  <StatusPill tone={statusPillTone(org.verificationStatus)} size="sm">
                    {statusLabelKeys[org.verificationStatus]
                      ? t(statusLabelKeys[org.verificationStatus])
                      : org.verificationStatus}
                  </StatusPill>
                  <Badge variant="outline" className="text-xs">
                    {org.authProvider}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <Section
              title={t('admin.organizations.sections.contact')}
              icon={<Building2 className="size-4" />}
            >
              <InfoRow icon={<Mail />} label="Email" value={org.email} />
              <InfoRow
                icon={<Phone />}
                label={t('admin.organizations.fields.phone')}
                value={org.phone || '—'}
              />
              <InfoRow icon={<FileText />} label={t('admin.organizations.fields.inn')} value={org.inn} mono />
              <InfoRow
                icon={<Briefcase className="size-4" />}
                label={t('admin.organizations.fields.industry')}
                value={org.industry || '—'}
              />
              <InfoRow
                icon={<Users />}
                label={t('admin.organizations.fields.companySize')}
                value={
                  org.companySize != null && org.companySize !== '' ? String(org.companySize) : '—'
                }
              />
            </Section>

            <Separator />

            {/* Status */}
            <Section
              title={t('admin.organizations.sections.status')}
              icon={<Shield className="size-4" />}
            >
              <InfoRow
                icon={<Shield />}
                label={t('admin.organizations.fields.status')}
                value={
                  <StatusPill tone={statusPillTone(org.verificationStatus)} size="sm">
                    {statusLabelKeys[org.verificationStatus]
                      ? t(statusLabelKeys[org.verificationStatus])
                      : org.verificationStatus}
                  </StatusPill>
                }
              />
              <InfoRow
                icon={<Mail />}
                label={t('admin.organizations.fields.emailVerified')}
                value={org.isEmailVerified ? t('admin.statuses.yes') : t('admin.statuses.no')}
              />
              {org.verifiedAt && (
                <InfoRow
                  icon={<Check />}
                  label={t('admin.organizations.fields.verifiedAt')}
                  value={formatDateTime(org.verifiedAt, locale)}
                />
              )}
            </Section>

            <Separator />

            <Section
              title={t('admin.organizations.sections.modules')}
              icon={<Briefcase className="size-4" />}
            >
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t('admin.organizations.fields.venueRentals')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.organizations.fields.placesAccessHint')}
                  </p>
                </div>
                <Switch
                  checked={placesFeatureEnabled}
                  disabled={updateOrganization.isPending}
                  onCheckedChange={checked => {
                    setPlacesFeatureEnabled(checked)
                    updateOrganization.mutate(
                      {
                        orgId: org.id,
                        data: { placesFeatureEnabled: checked },
                      },
                      {
                        onSuccess: updated => {
                          onOrganizationUpdated?.(updated)
                        },
                        onError: () => {
                          setPlacesFeatureEnabled(Boolean(org.placesFeatureEnabled))
                        },
                      }
                    )
                  }}
                />
              </div>
            </Section>

            <Separator />

            {/* Statistics — фактическое число учётных записей (members) в системе */}
            <Section title={t('admin.organizations.sections.stats')} icon={<Users className="size-4" />}>
              <InfoRow
                icon={<Users />}
                label={t('admin.organizations.fields.systemMembers')}
                value={org._count.members}
              />
            </Section>

            <Separator />

            {/* Dates */}
            <Section title={t('admin.organizations.sections.dates')} icon={<Calendar className="size-4" />}>
              <InfoRow
                icon={<Calendar />}
                label={t('admin.organizations.fields.registration')}
                value={formatDateTime(org.createdAt, locale)}
              />
              <InfoRow
                icon={<Calendar />}
                label={t('admin.organizations.fields.lastUpdate')}
                value={formatDateTime(org.updatedAt, locale)}
              />
            </Section>

            {/* Description */}
            {org.description && (
              <>
                <Separator />
                <Section
                  title={t('admin.organizations.sections.description')}
                  icon={<FileText className="size-4" />}
                >
                  <p className="text-sm text-muted-foreground">{org.description}</p>
                </Section>
              </>
            )}

            {/* Rejection Reason */}
            {org.rejectionReason && (
              <>
                <Separator />
                <div className="rounded-lg border border-border bg-danger-soft p-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-danger-soft-foreground">
                    <AlertTriangle className="size-4" />
                    {t('admin.dialogs.rejectReason')}
                  </h4>
                  <p className="mt-2 text-sm text-danger-soft-foreground">{org.rejectionReason}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/admin/events?organizationId=${encodeURIComponent(org.id)}`}>
                  <CalendarDays className="mr-2 size-4" />
                  {t('admin.actions.organizationEvents')}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setEditOpen(true)}
                disabled={isPending}
              >
                <Pencil className="mr-2 size-4" />
                {t('admin.actions.edit')}
              </Button>
              {isPendingStatus && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => onApprove(org)} disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 size-4" />
                    )}
                    {t('admin.actions.approve')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => onReject(org)}
                    disabled={isPending}
                  >
                    <X className="mr-2 size-4" />
                    {t('admin.actions.reject')}
                  </Button>
                </div>
              )}

            </div>

            {/* Опасная зона — отделена от обычных действий, зависит от состояния */}
            <div className="space-y-3 rounded-lg border border-destructive/40 bg-danger-soft/40 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="size-4" />
                {t('admin.dangerZone.title')}
              </div>

              {isArchived ? (
                <>
                  <dl className="space-y-1.5 rounded-md bg-background/60 p-3 text-sm">
                    <DetailRow
                      label={t('admin.fields.archivedAt')}
                      value={org.deletedAt ? formatDateTime(org.deletedAt, locale) : '—'}
                    />
                    <DetailRow
                      label={t('admin.fields.archivedBy')}
                      value={org.archivedByName || '—'}
                    />
                    {org.archiveReason ? (
                      <DetailRow
                        label={t('admin.fields.archiveReason')}
                        value={org.archiveReason}
                      />
                    ) : null}
                  </dl>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isPending}
                    onClick={() => onRestore(org)}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    {t('admin.actions.restoreOrganization')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isPending}
                    onClick={() => onHardDelete(org)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t('admin.actions.hardDeleteOrganization')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.dangerZone.organizationArchiveHint')}
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isPending}
                    onClick={() => onArchive(org)}
                  >
                    <Archive className="mr-2 size-4" />
                    {t('admin.actions.archiveOrganization')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.dialogs.editOrganizationTitle')}</DialogTitle>
            <DialogDescription>{t('admin.dialogs.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <MultilingualTabsField
              fields={translationFields}
              values={translationValues}
              meta={translationMeta}
              activeLocale={activeLocale}
              onLocaleChange={setActiveLocale}
              onValueChange={handleTranslationChange}
            />
            <TranslateFieldsToolbar
              sourceLocale={sourceLocale}
              activeLocale={activeLocale}
              isPending={translateBatch.isPending}
              disabled={updateOrganization.isPending || !sourceLocale}
              onTranslateEmpty={() => handleTranslate('fill_empty')}
              onUpdateAuto={() => handleTranslate('update_auto')}
            />
            <div className="space-y-2">
              <Label htmlFor="org-email">Email</Label>
              <Input
                id="org-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-inn">{t('admin.organizations.fields.inn')}</Label>
              <Input
                id="org-inn"
                value={inn}
                onChange={e => setInn(e.target.value)}
                placeholder={t('admin.organizations.placeholders.inn')}
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-phone">{t('admin.organizations.fields.phone')}</Label>
              <Input
                id="org-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+7 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-logo">{t('admin.organizations.fields.logoUrl')}</Label>
              <Input
                id="org-logo"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-industry">{t('admin.organizations.fields.industry')}</Label>
              <Input
                id="org-industry"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder={t('admin.organizations.placeholders.industry')}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-company-size">{t('admin.tables.columns.companySize')}</Label>
              <Input
                id="org-company-size"
                inputMode="numeric"
                pattern="[0-9]*"
                value={companySize}
                onChange={e => setCompanySize(e.target.value.replace(/\D/g, ''))}
                placeholder={t('admin.organizations.placeholders.companySize')}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="org-email-verified">
                {t('admin.organizations.fields.emailVerified')}
              </Label>
              <Switch
                id="org-email-verified"
                checked={isEmailVerified}
                onCheckedChange={setIsEmailVerified}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="org-places-enabled">
                  {t('admin.organizations.fields.placesAccess')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('admin.organizations.fields.placesAccessHint')}
                </p>
              </div>
              <Switch
                id="org-places-enabled"
                checked={placesFeatureEnabled}
                onCheckedChange={setPlacesFeatureEnabled}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                {t('admin.actions.cancel')}
              </Button>
              <Button type="submit" disabled={updateOrganization.isPending}>
                {updateOrganization.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {t('admin.actions.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ================================
// Helper Components
// ================================

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="[&>svg]:size-4">{icon}</span>
        {label}
      </span>
      <span className={cn('font-medium', mono && 'font-mono')}>{value}</span>
    </div>
  )
}
