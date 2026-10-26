import { useEffect, useMemo, useState } from 'react'

import { AlertCircle, AlertTriangle, FileWarning, Loader2, Plus } from 'lucide-react'

import { useT } from '@eventflow/i18n/react'

import type {
  ArtifactBulkPreviewRequest,
  ArtifactBulkPreviewResponse,
  ArtifactType,
} from '@api/services'
import { useArtifactBulkPreview } from '@features/events/api'
import { cn } from '@shared/lib/cn'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@shared/ui'

type BulkPreviewDialogProps = {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  artifactType: ArtifactType
  /** The exact preview request — must match the action filters that will be sent. */
  previewRequest: ArtifactBulkPreviewRequest | null
  /**
   * Called when the user confirms. Receives the policy for ineligible
   * recipients when the user picked one of the "issue anyway" / "exclude"
   * choices, plus the expected number of recipients the action will affect
   * (used as the progress-bar denominator).
   */
  onConfirm: (
    ineligiblePolicy?: 'EXCLUDE' | 'INCLUDE',
    expectedCount?: number,
  ) => void
  /**
   * When both labels are provided and the preview has eligibility exclusions
   * (not-approved / not-attended), the footer offers a choice instead of the
   * single confirm button: "issue anyway" (INCLUDE) vs "exclude & generate"
   * (EXCLUDE).
   */
  includeAnywayLabel?: string
  excludeAndGenerateLabel?: string
  isActionPending?: boolean
  /** When true, disables the confirm button and shows the reason. Used for permission gating. */
  actionDenied?: boolean
  /** Short reason rendered next to the confirm button when `actionDenied` is true. */
  actionDeniedReason?: string
  confirmLabel: string
  title?: string
  description?: string
  /**
   * If provided, the "Не хватает шаблонов" block renders a "Создать шаблон" CTA per role.
   * The dialog will close on click; the parent is expected to open the template editor.
   * `roleCode` is the canonical code (e.g. PARTICIPANT, VOLUNTEER) — the parent can choose to
   * preselect it in the editor or just open the editor for the user to pick.
   */
  onCreateTemplate?: (roleCode: string, roleId: string) => void
}

function StatPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'positive' | 'warning' | 'danger'
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-md border px-3 py-2 text-left',
        tone === 'positive' && 'border-success-soft bg-success-soft/40',
        tone === 'warning' && 'border-warning-soft bg-warning-soft/40',
        tone === 'danger' && 'border-danger-soft bg-danger-soft/40',
        tone === 'neutral' && 'border-border bg-muted/30'
      )}
    >
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}

const EXCLUDED_REASON_KEY: Record<string, string> = {
  ROLE_MISMATCH: 'events.artifactPreview.excluded.reason.roleMismatch',
  NOT_APPROVED: 'events.artifactPreview.excluded.reason.notApproved',
  NOT_ATTENDED: 'events.artifactPreview.excluded.reason.notAttended',
}

/** Reasons that can be overridden via "issue anyway" (unlike role mismatch). */
const ELIGIBILITY_REASONS = new Set(['NOT_APPROVED', 'NOT_ATTENDED'])

export function BulkPreviewDialog({
  eventId,
  open,
  onOpenChange,
  artifactType,
  previewRequest,
  onConfirm,
  includeAnywayLabel,
  excludeAndGenerateLabel,
  isActionPending,
  actionDenied,
  actionDeniedReason,
  confirmLabel,
  title,
  description,
  onCreateTemplate,
}: BulkPreviewDialogProps) {
  const t = useT()
  const previewMutation = useArtifactBulkPreview(eventId)
  const [preview, setPreview] = useState<ArtifactBulkPreviewResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [acknowledgedLarge, setAcknowledgedLarge] = useState(false)

  useEffect(() => {
    if (!open || !previewRequest) return
    setPreview(null)
    setErrorMessage(null)
    setAcknowledgedLarge(false)
    previewMutation.mutate(previewRequest, {
      onSuccess: data => setPreview(data),
      onError: (err: { message?: string }) =>
        setErrorMessage(err?.message ?? t('events.artifactPreview.loadError')),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(previewRequest)])

  const isLoading = previewMutation.isPending && !preview
  const largeWarning = preview?.warnings.find(w => w.code === 'LARGE_BULK_ACTION')
  const otherWarnings = preview?.warnings.filter(w => w.code !== 'LARGE_BULK_ACTION') ?? []

  const sortedRoles = useMemo(() => {
    return [...(preview?.roles ?? [])].sort((a, b) => b.recipientCount - a.recipientCount)
  }, [preview?.roles])

  const hardBlocked =
    !!errorMessage ||
    !preview ||
    (!!largeWarning && !acknowledgedLarge) ||
    !!actionDenied
  const blocked = hardBlocked || !preview || preview.recipientCount === 0

  // Recipients excluded by approval/attendance (overridable via "issue anyway",
  // unlike role mismatch which is a hard filter).
  const eligibilityExcludedCount =
    preview?.excludedRecipients.filter(e => ELIGIBILITY_REASONS.has(e.reason))
      .length ?? 0
  const offerIncludeChoice =
    !!includeAnywayLabel &&
    !!excludeAndGenerateLabel &&
    eligibilityExcludedCount > 0 &&
    !hardBlocked

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle>
            {title ??
              (artifactType === 'CERTIFICATE'
                ? t('events.artifactPreview.title.certificate')
                : t('events.artifactPreview.title.badge'))}
          </DialogTitle>
          <DialogDescription>
            {description ?? t('events.artifactPreview.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Concrete max-height so the body scrolls inside the fixed dialog
            (flex-1 alone doesn't bound under a position:fixed max-height parent). */}
        <div className="max-h-[70vh] overflow-auto pr-1">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {errorMessage && !isLoading && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {preview && !isLoading && !errorMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatPill
                  label={t('events.artifactPreview.stats.recipients')}
                  value={preview.recipientCount}
                />
                <StatPill
                  label={t('events.artifactPreview.stats.artifacts')}
                  value={preview.artifactCount}
                />
                <StatPill
                  label={t('events.artifactPreview.stats.willGenerate')}
                  value={preview.willGenerateCount}
                  tone={preview.willGenerateCount > 0 ? 'positive' : 'neutral'}
                />
                <StatPill
                  label={t('events.artifactPreview.stats.willRegenerate')}
                  value={preview.willRegenerateCount}
                  tone={preview.willRegenerateCount > 0 ? 'warning' : 'neutral'}
                />
                <StatPill
                  label={t('events.artifactPreview.stats.ready')}
                  value={preview.readyCount}
                  tone="positive"
                />
                <StatPill
                  label={t('events.artifactPreview.stats.stale')}
                  value={preview.staleCount}
                  tone="warning"
                />
                <StatPill
                  label={t('events.artifactPreview.stats.missingTemplate')}
                  value={preview.missingTemplateCount}
                  tone={preview.missingTemplateCount > 0 ? 'warning' : 'neutral'}
                />
                <StatPill
                  // Renamed from the bare "Заблокировано" — that word implied a permission
                  // failure, while in practice it just means "no template assigned, will be
                  // skipped". Soft wording + warning tone leads the organiser to the actionable
                  // CTA below instead of dead-ending the flow.
                  label={t('events.artifactPreview.stats.blocked')}
                  value={preview.blockedCount}
                  tone={preview.blockedCount > 0 ? 'warning' : 'neutral'}
                />
                <StatPill
                  label={t('events.artifactPreview.stats.notGenerated')}
                  value={preview.notGeneratedCount}
                />
                <StatPill
                  label={t('events.artifactPreview.stats.failed')}
                  value={preview.failedCount}
                  tone={preview.failedCount > 0 ? 'danger' : 'neutral'}
                />
                <StatPill
                  label={t('events.artifactPreview.stats.processing')}
                  value={preview.processingCount}
                />
                <StatPill
                  label={t('events.artifactPreview.stats.willSkip')}
                  value={preview.willSkipCount}
                />
              </div>

              {sortedRoles.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('events.artifactPreview.roles.title')}
                  </p>
                  <div className="overflow-hidden rounded-md border border-border/60">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium">
                            {t('events.artifactPreview.roles.role')}
                          </th>
                          <th className="px-2 py-1.5 text-right font-medium">
                            {t('events.artifactPreview.roles.recipients')}
                          </th>
                          <th className="px-2 py-1.5 text-right font-medium">
                            {t('events.artifactPreview.roles.generate')}
                          </th>
                          <th className="px-2 py-1.5 text-right font-medium">
                            {t('events.artifactPreview.roles.regenerate')}
                          </th>
                          <th className="px-2 py-1.5 text-right font-medium">
                            {t('events.artifactPreview.roles.missingTemplate')}
                          </th>
                          <th className="px-2 py-1.5 text-right font-medium">
                            {t('events.artifactPreview.roles.blocked')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {sortedRoles.map(role => (
                          <tr key={role.roleId}>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-medium text-foreground">
                                  {role.roleDisplayName}
                                </span>
                                <span className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                                  {role.roleCode}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {role.recipientCount}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-success">
                              {role.willGenerateCount}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-warning">
                              {role.willRegenerateCount}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {role.missingTemplateCount}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {role.blockedCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {preview.missingTemplates.length > 0 && (
                <div className="rounded-md border border-warning-soft bg-warning-soft px-3 py-2.5 text-xs">
                  <div className="mb-1.5 flex items-center gap-1.5 font-medium text-warning-soft-foreground">
                    <FileWarning className="h-3.5 w-3.5" />
                    {t('events.artifactPreview.missingTemplates.title')}
                  </div>
                  <p className="mb-2 text-warning-soft-foreground/90">
                    {t('events.artifactPreview.missingTemplates.description')}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {preview.missingTemplates.map(missing => (
                      <li
                        key={`${missing.roleId}-${missing.artifactType}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-warning-soft/60 bg-card px-2 py-1.5"
                      >
                        <span className="inline-flex items-center gap-1.5 text-warning-soft-foreground">
                          <span className="font-medium text-foreground">
                            {missing.roleDisplayName}
                          </span>
                          <span className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                            {missing.roleCode}
                          </span>
                        </span>
                        {onCreateTemplate && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 gap-1 px-2 text-[11px]"
                            onClick={() => {
                              // Close the dialog so the parent can stage the template editor.
                              onOpenChange(false)
                              onCreateTemplate(missing.roleCode, missing.roleId)
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            {t('events.artifactPreview.missingTemplates.create')}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.excludedRecipients.length > 0 && (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t('events.artifactPreview.excluded.count', {
                      count: preview.excludedRecipients.length,
                    })}
                  </span>
                  {t('events.artifactPreview.excluded.reasonsLabel')}
                  {Array.from(new Set(preview.excludedRecipients.map(e => e.reason)))
                    .map(r => (EXCLUDED_REASON_KEY[r] ? t(EXCLUDED_REASON_KEY[r]) : r))
                    .join(', ')}
                </div>
              )}

              {otherWarnings.length > 0 && (
                <div className="space-y-1.5">
                  {otherWarnings.map(warning => (
                    <div
                      key={warning.code}
                      className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      <span>{warning.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {largeWarning && (
                <div className="rounded-md border border-warning-soft bg-warning-soft px-3 py-2.5 text-xs">
                  <div className="mb-1.5 flex items-center gap-1.5 font-medium text-warning-soft-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('events.artifactPreview.large.title')}
                  </div>
                  <p className="mb-2 text-warning-soft-foreground">{largeWarning.message}</p>
                  <label className="flex cursor-pointer items-center gap-2 text-warning-soft-foreground">
                    <Checkbox
                      checked={acknowledgedLarge}
                      onCheckedChange={value => setAcknowledgedLarge(value === true)}
                    />
                    <span>{t('events.artifactPreview.large.acknowledge')}</span>
                  </label>
                </div>
              )}

              {preview.recipientCount === 0 && (
                <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{t('events.artifactPreview.emptyResult')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 pt-3">
          {actionDenied && actionDeniedReason && (
            <span className="mr-auto text-xs text-muted-foreground">
              {actionDeniedReason}
            </span>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('events.artifactPreview.cancel')}
          </Button>
          {offerIncludeChoice ? (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  onConfirm(
                    'INCLUDE',
                    (preview?.recipientCount ?? 0) + eligibilityExcludedCount,
                  )
                }
                disabled={hardBlocked || isActionPending}
              >
                {isActionPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {includeAnywayLabel}
              </Button>
              <Button
                onClick={() =>
                  onConfirm('EXCLUDE', preview?.recipientCount ?? 0)
                }
                disabled={
                  hardBlocked ||
                  isActionPending ||
                  (preview?.recipientCount ?? 0) === 0
                }
              >
                {isActionPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {excludeAndGenerateLabel}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onConfirm('EXCLUDE', preview?.recipientCount ?? 0)}
              disabled={blocked || isActionPending}
              title={actionDenied ? actionDeniedReason : undefined}
            >
              {isActionPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
