import { useEffect, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { formatDate } from '@eventflow/i18n'
import {
  Award,
  ChevronDown,
  Download,
  GraduationCap,
  IdCard,
  Loader2,
  Mic2,
  Search,
  Settings2,
  UserCheck,
  Users,
  UsersRound,
} from 'lucide-react'
import { useI18n, useT } from '@eventflow/i18n/react'

import type {
  ArtifactBulkPreviewRequest,
  ArtifactTemplateRoleSummary,
  Certificate,
  CertificateRecipientRole,
} from '@api/services'
import {
  useEventCertificatesQuery,
  useCertificateGenerationStatus,
  eventCertificatesKeys,
  useGenerateCertificates,
  useDownloadCertificate,
  openCertificateBlobInNewTab,
  useArtifactTemplateSummaryQuery,
  useEventRegistrationsQuery,
} from '@features/events/api'
import {
  BulkPreviewDialog,
  CertificateTemplateEditor,
  RecipientSelector,
  RecipientsRolesSheet,
  TemplateSummarySection,
} from '@features/events/ui'
import { LimitPrompt, mapBillingError } from '@features/billing'
import { usePermissions } from '@features/profile'
import { resolveLocalizedField } from '@entities/event/lib/localized-field'
import { cn } from '@shared/lib/cn'
import { PERMISSION } from '@shared/lib'
import {
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from '@shared/ui'
import { toast } from 'sonner'

type EventCertificatesTabProps = {
  eventId: string
}

/** Max recipients per manual batch — mirrors the backend limit
 * (CERTIFICATES_MAX_BATCH_REGISTRATIONS, default 500). */
const MAX_CERTIFICATE_SELECTION = 500

type PendingAction =
  | { kind: 'role'; role: CertificateIssueRole }
  | { kind: 'selected'; recipientIds: string[] }

const LEGACY_BY_BUILT_IN_KEY: Record<string, CertificateRecipientRole> = {
  PARTICIPANT: 'PARTICIPANT',
  SPEAKER: 'SPEAKER',
  MENTOR: 'MENTOR',
}

/** Заголовки встроенной тройки переведены, у остальных ролей — своё название. */
const LEGACY_ROLE_LABEL_KEY: Record<CertificateRecipientRole, string> = {
  PARTICIPANT: 'events.certificates.roles.participants',
  SPEAKER: 'events.certificates.roles.speakers',
  MENTOR: 'events.certificates.roles.mentors',
}

const LEGACY_ROLE_ICON: Record<CertificateRecipientRole, typeof Users> = {
  PARTICIPANT: Users,
  SPEAKER: Mic2,
  MENTOR: GraduationCap,
}

/**
 * Роль, которой можно выдать сертификаты. Строится из ролей события, а не из
 * двух зашитых значений: ментору, Staff и VIP сертификаты положены так же —
 * раньше выдать их из интерфейса было нельзя.
 */
type CertificateIssueRole = {
  id: string
  label: string
  legacy: CertificateRecipientRole | null
  recipientCount: number
  hasTemplate: boolean
  icon: typeof Users
  /** Участникам сертификат положен только за посещение — остальным ролям нет. */
  onlyAttended: boolean
}

function toIssueRole(
  role: ArtifactTemplateRoleSummary,
  t: ReturnType<typeof useT>,
  locale: string
): CertificateIssueRole {
  const legacy = role.builtInKey ? (LEGACY_BY_BUILT_IN_KEY[role.builtInKey] ?? null) : null
  return {
    id: role.roleId,
    label: legacy
      ? t(LEGACY_ROLE_LABEL_KEY[legacy])
      : resolveLocalizedField(
          role.roleTranslations,
          'displayName',
          locale,
          role.roleDisplayName
        ),
    legacy,
    recipientCount: role.activeAssignmentCount,
    hasTemplate: role.certificateTemplateSummary?.hasActiveDefault ?? false,
    icon: legacy ? LEGACY_ROLE_ICON[legacy] : IdCard,
    onlyAttended: legacy === 'PARTICIPANT',
  }
}

function getCertificateStatus(certificate: Certificate): {
  labelKey: string
  className: string
} {
  if (certificate.isStale) {
    return {
      labelKey: 'events.certificates.status.needsRegeneration',
      className: 'border-warning-soft bg-warning-soft text-warning-soft-foreground',
    }
  }
  if (certificate.generationStatus === 'PROCESSING' || certificate.generationStatus === 'PENDING') {
    return {
      labelKey: 'events.certificates.status.processing',
      className: 'border-info-soft bg-info-soft text-info-soft-foreground',
    }
  }
  if (certificate.generationStatus === 'FAILED') {
    return {
      labelKey: 'events.certificates.status.failed',
      className: 'border-danger-soft bg-danger-soft text-danger-soft-foreground',
    }
  }
  return {
    labelKey: 'events.certificates.status.ready',
    className: 'border-success-soft bg-success-soft text-success-soft-foreground',
  }
}

function SelectRecipientsModal({
  eventId,
  open,
  onOpenChange,
  onConfirm,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (recipientIds: string[]) => void
}) {
  const t = useT()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      toast.error(t('events.certificates.selectAtLeastOne'))
      return
    }
    onConfirm(Array.from(selectedIds))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        onOpenChange(next)
        if (!next) setSelectedIds(new Set())
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>{t('events.certificates.selectRecipientsTitle')}</DialogTitle>
          <DialogDescription>
            {t('events.certificates.selectRecipientsDescription')}
          </DialogDescription>
        </DialogHeader>
        <RecipientSelector
          eventId={eventId}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
          className="min-h-0 flex-1"
          maxSelection={MAX_CERTIFICATE_SELECTION}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            <Award className="mr-1.5 h-4 w-4" />
            {t('events.certificates.nextPreview', { count: selectedIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getCertificateColumns(
  t: ReturnType<typeof useT>,
  locale: string
): ColumnDef<Certificate>[] {
  return [
    {
      id: 'index',
      header: '№',
      size: 48,
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination
        const pos = table.getRowModel().rows.findIndex(r => r.id === row.id)
        return (
          <span className="text-sm tabular-nums text-muted-foreground">
            {pageIndex * pageSize + (pos < 0 ? 0 : pos) + 1}
          </span>
        )
      },
    },
    {
      accessorKey: 'recipientName',
      header: t('events.certificates.columns.participant'),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.original.recipientName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.recipientEmail}</p>
        </div>
      ),
    },
    {
      accessorKey: 'issuedAt',
      header: t('events.certificates.columns.issuedAt'),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.original.issuedAt
            ? formatDate(row.original.issuedAt, locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : ''}
        </span>
      ),
    },
    {
      accessorKey: 'downloadCount',
      header: t('events.certificates.columns.downloads'),
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.downloadCount}</span>,
    },
    {
      id: 'status',
      header: t('events.certificates.columns.status'),
      cell: ({ row }) => {
        const status = getCertificateStatus(row.original)
        return (
          <Badge variant="outline" className={cn('whitespace-nowrap text-xs', status.className)}>
            {t(status.labelKey)}
          </Badge>
        )
      },
    },
  ]
}

export function EventCertificatesTab({ eventId }: EventCertificatesTabProps) {
  const { locale, t } = useI18n()
  const [selectModalOpen, setSelectModalOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false)

  const permissions = usePermissions()
  const canGenerate = permissions.hasPermission(PERMISSION.CERTIFICATES_GENERATE)
  const canExport = permissions.hasPermission(PERMISSION.CERTIFICATES_EXPORT)
  const canManageRecipients = permissions.hasPermission(PERMISSION.ARTIFACT_RECIPIENTS_MANAGE)
  const canManageRoles = permissions.hasPermission(PERMISSION.RECIPIENT_ROLES_MANAGE)
  const canOpenManage = canManageRecipients || canManageRoles
  const generateDeniedReason = t('events.certificates.generateDeniedReason')
  const exportDeniedReason = t('events.certificates.exportDeniedReason')

  const { data: certificatesData, isLoading: certificatesLoading } = useEventCertificatesQuery(
    eventId,
    { page: 1, limit: 200 }
  )
  const { data: registrationsData } = useEventRegistrationsQuery(eventId, { limit: 1 })
  // Те же параметры, что у TemplateSummarySection ниже — запрос делится кэшем.
  const { data: templateSummary } = useArtifactTemplateSummaryQuery(eventId, {
    artifactType: 'CERTIFICATE',
    includeInactiveRoles: true,
  })

  const generateMutation = useGenerateCertificates()
  const downloadMutation = useDownloadCertificate(eventId)

  // ── Async generation progress ──────────────────────────────────────────
  const queryClient = useQueryClient()
  const [genJobId, setGenJobId] = useState<string | null>(null)
  const [genTarget, setGenTarget] = useState(0)
  const genBaselineReadyRef = useRef(0)
  const genStartedAtRef = useRef(0)
  const { data: genStatus } = useCertificateGenerationStatus(eventId, genJobId)

  const genReady = genStatus
    ? Math.max(0, genStatus.counts.ready - genBaselineReadyRef.current)
    : 0
  const genPercent =
    genTarget > 0 ? Math.min(100, Math.round((genReady / genTarget) * 100)) : 0

  useEffect(() => {
    if (!genJobId || !genStatus) return
    // Live-refresh the issued list as certificates become READY (fixes the
    // "list stays empty after generation" issue — no manual reload needed).
    queryClient.invalidateQueries({
      queryKey: [...eventCertificatesKeys.all, 'event', eventId],
    })

    const reachedTarget =
      genTarget > 0 &&
      genStatus.counts.ready - genBaselineReadyRef.current >= genTarget
    const timedOut = Date.now() - genStartedAtRef.current > 15 * 60 * 1000
    const terminal =
      genStatus.state === 'completed' ||
      genStatus.state === 'failed' ||
      reachedTarget ||
      timedOut

    if (terminal) {
      if (genStatus.state === 'failed') {
        toast.error(
          genStatus.failedReason ?? t('events.certificates.toasts.generateError')
        )
      } else {
        toast.success(t('events.certificates.toasts.generationDone'))
      }
      setGenJobId(null)
    }
  }, [genStatus, genJobId, genTarget, eventId, queryClient, t])

  const startGenerationProgress = (jobId: string, expectedTotal: number) => {
    genBaselineReadyRef.current = certificatesData?.total ?? 0
    genStartedAtRef.current = Date.now()
    setGenTarget(expectedTotal)
    setGenJobId(jobId)
  }

  const issueRoles = useMemo<CertificateIssueRole[]>(
    () =>
      (templateSummary?.roles ?? [])
        .filter(role => role.isActive && role.isArtifactEligible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(role => toIssueRole(role, t, locale)),
    [templateSummary?.roles, t, locale]
  )

  const certificates = useMemo(
    () => certificatesData?.certificates ?? [],
    [certificatesData?.certificates]
  )
  const totalCertificates = certificatesData?.total ?? 0
  const totalRegistrations = registrationsData?.total ?? 0
  const downloadedCount = certificates.reduce((acc, c) => acc + (c.downloadCount ?? 0), 0)
  const pendingCount = Math.max(0, totalRegistrations - totalCertificates)

  const filteredCertificates = useMemo(() => {
    if (!searchQuery.trim()) return certificates
    const q = searchQuery.toLowerCase()
    return certificates.filter(
      c => c.recipientName?.toLowerCase().includes(q) || c.recipientEmail?.toLowerCase().includes(q)
    )
  }, [certificates, searchQuery])

  const columnsWithActions = useMemo<ColumnDef<Certificate>[]>(
    () => [
      ...getCertificateColumns(t, locale),
      {
        id: 'actions',
        header: '',
        size: 100,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              downloadMutation.mutate(row.original.id, {
                onSuccess: ({ blob }) => openCertificateBlobInNewTab(blob),
                onError: (err: { message?: string }) =>
                  toast.error(err.message ?? t('toasts.registrations.downloadError')),
              })
            }
            disabled={
              downloadMutation.isPending || !row.original.certificateUrl || !canExport
            }
            title={!canExport ? exportDeniedReason : undefined}
          >
            <Download className="h-3.5 w-3.5" />
            {t('actions.download')}
          </Button>
        ),
      },
    ],
    [downloadMutation, locale, t, canExport, exportDeniedReason]
  )

  // Build the preview request — must mirror generation filters exactly
  // (same onlyAttended default).
  const previewRequest = useMemo<ArtifactBulkPreviewRequest | null>(() => {
    if (!pendingAction) return null
    if (pendingAction.kind === 'role') {
      return {
        artifactType: 'CERTIFICATE',
        scope: 'ROLE',
        recipientRoleId: pendingAction.role.id,
        onlyAttended: pendingAction.role.onlyAttended,
      }
    }
    return {
      artifactType: 'CERTIFICATE',
      scope: 'SELECTED',
      recipientIds: pendingAction.recipientIds,
      onlyAttended: false,
    }
  }, [pendingAction])

  const runPendingAction = (
    ineligiblePolicy?: 'EXCLUDE' | 'INCLUDE',
    expectedCount = 0
  ) => {
    if (!pendingAction) return
    const onSuccess = (result: { status: string; jobId?: string }) => {
      setPreviewOpen(false)
      // Async path: track the queued job so we can show progress and
      // auto-refresh the issued list as PDFs complete.
      if (result.status === 'processing' && result.jobId) {
        startGenerationProgress(result.jobId, expectedCount)
      }
    }
    if (pendingAction.kind === 'role') {
      generateMutation.mutate(
        {
          eventId,
          recipientRoleId: pendingAction.role.id,
          onlyAttended: pendingAction.role.onlyAttended,
        },
        { onSuccess }
      )
      return
    }
    generateMutation.mutate(
      {
        eventId,
        recipientIds: pendingAction.recipientIds,
        onlyAttended: false,
        ineligiblePolicy,
      },
      { onSuccess }
    )
  }

  const startAction = (action: PendingAction) => {
    setPendingAction(action)
    setPreviewOpen(true)
  }

  // C-11: 409 BILLING_QUOTA_EXCEEDED генераций → честная панель с остатком
  // окна и апгрейд-ссылкой (вместо одного лишь тоста с серверным сообщением).
  const billingLimitError = generateMutation.isError
    ? mapBillingError(generateMutation.error)
    : null

  return (
    <div className="space-y-5">
      {billingLimitError && (
        <LimitPrompt error={billingLimitError} onClose={() => generateMutation.reset()} />
      )}

      {/* ── Hero: главное действие + быстрые цифры ─────────────── */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t('events.certificates.issueSectionTitle')}
            </p>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              {t('events.certificates.issueSectionDescription')}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-warning" />
                {t('events.certificates.statsIssued')}:{' '}
                <span className="font-semibold tabular-nums text-foreground">{totalCertificates}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 text-info" />
                {t('events.certificates.statsDownloads')}:{' '}
                <span className="font-semibold tabular-nums text-foreground">{downloadedCount}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-warning" />
                {t('events.certificates.statsPending')}:{' '}
                <span className="font-semibold tabular-nums text-foreground">{pendingCount}</span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="gap-2"
                  disabled={generateMutation.isPending || !canGenerate}
                  title={!canGenerate ? generateDeniedReason : undefined}
                >
                  <Award className="h-4 w-4" />
                  {t('events.certificates.issueSectionTitle')}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {/* Один список ролей: ментору, Staff и VIP сертификаты положены
                    так же, как участникам и спикерам. */}
                {issueRoles.map(role => {
                  const Icon = role.icon
                  return (
                    <DropdownMenuItem
                      key={role.id}
                      className="gap-2"
                      onSelect={() => startAction({ kind: 'role', role })}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{role.label}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {!role.hasTemplate
                          ? t('events.certificates.noTemplate')
                          : role.onlyAttended
                            ? t('events.certificates.onlyAttendedHint')
                            : t('events.certificates.peopleCount', {
                                count: role.recipientCount,
                              })}
                      </span>
                    </DropdownMenuItem>
                  )
                })}
                {issueRoles.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => setSelectModalOpen(true)}
                >
                  <UserCheck className="h-4 w-4" />
                  <span>{t('events.certificates.selectManually')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setManageOpen(true)}
              disabled={!canOpenManage}
              title={
                !canOpenManage
                  ? t('events.certificates.recipientsManageDeniedReason')
                  : undefined
              }
            >
              <UsersRound className="h-4 w-4" />
              <span className="hidden sm:inline">{t('events.certificates.recipientsButton')}</span>
            </Button>
          </div>
        </div>
        {!canGenerate && (
          <p className="mt-3 text-xs text-muted-foreground">{generateDeniedReason}</p>
        )}

        <SelectRecipientsModal
          eventId={eventId}
          open={selectModalOpen}
          onOpenChange={setSelectModalOpen}
          onConfirm={recipientIds => {
            setSelectModalOpen(false)
            startAction({ kind: 'selected', recipientIds })
          }}
        />
      </Card>

      {/* ── Прогресс асинхронной генерации ─────────────────────── */}
      {genJobId && (
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <span className="text-sm font-semibold">
              {t('events.certificates.progress.title')}
            </span>
            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
              {genTarget > 0
                ? t('events.certificates.progress.count', {
                    done: genReady,
                    total: genTarget,
                  })
                : t('events.certificates.progress.working')}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${genTarget > 0 ? genPercent : 100}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {genStatus && genStatus.counts.failed > 0 && (
              <span className="text-danger">
                {t('events.certificates.progress.failed', {
                  count: genStatus.counts.failed,
                })}
              </span>
            )}
            <span className="ml-auto">
              {t('events.certificates.progress.hint')}
            </span>
          </div>
        </Card>
      )}

      {/* ── Кнопка-полоска: открыть редактор шаблона ─────────── */}
      <button
        type="button"
        onClick={() => setTemplateSheetOpen(true)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Settings2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t('events.certificates.templateStripTitle')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totalCertificates === 0
                ? t('events.certificates.templateStripDescriptionEmpty')
                : t('events.certificates.templateStripDescription')}
            </p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>

      <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-4 overflow-hidden sm:max-w-3xl"
        >
          <SheetHeader>
            <SheetTitle>{t('events.certificates.templateStripTitle')}</SheetTitle>
            <SheetDescription>
              {t('events.certificates.templateSheetDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto pr-1">
            <CertificateTemplateEditor eventId={eventId} />
            <TemplateSummarySection
              eventId={eventId}
              artifactType="CERTIFICATE"
              canEditTemplate={canGenerate}
              editDisabledReason={generateDeniedReason}
            />
          </div>
        </SheetContent>
      </Sheet>

      <BulkPreviewDialog
        eventId={eventId}
        open={previewOpen}
        onOpenChange={open => {
          setPreviewOpen(open)
          if (!open) setPendingAction(null)
        }}
        artifactType="CERTIFICATE"
        previewRequest={previewRequest}
        onConfirm={runPendingAction}
        isActionPending={generateMutation.isPending}
        actionDenied={!canGenerate}
        actionDeniedReason={generateDeniedReason}
        confirmLabel={t('events.certificates.generate')}
        includeAnywayLabel={t('events.certificates.issueAnyway')}
        excludeAndGenerateLabel={t('events.certificates.excludeAndGenerate')}
        // When the organiser hits "Создать шаблон" inside the missing-templates callout we
        // dismiss the bulk-preview dialog and immediately stage the template editor sheet so
        // they land in the right place with one click.
        onCreateTemplate={() => {
          setPendingAction(null)
          setTemplateSheetOpen(true)
        }}
      />

      <RecipientsRolesSheet
        eventId={eventId}
        open={manageOpen}
        onOpenChange={setManageOpen}
        canManageRecipients={canManageRecipients}
        canManageRoles={canManageRoles}
        onIssueForRecipients={recipientIds => {
          if (recipientIds.length === 0) return
          startAction({ kind: 'selected', recipientIds })
        }}
      />

      {/* Certificates table */}
      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-foreground">
            {t('events.certificates.issuedCertificates')}
          </h3>
          {certificates.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          )}
        </div>

        {certificatesLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : certificates.length === 0 ? (
          <EmptyState
            icon={Award}
            title={t('events.certificates.emptyTitle')}
            description={t('events.certificates.emptyDescription')}
          />
        ) : (
          <DataTable
            columns={columnsWithActions}
            data={filteredCertificates}
            showPagination={filteredCertificates.length > 10}
            emptyText={t('common.notFound')}
          />
        )}
      </Card>
    </div>
  )
}
