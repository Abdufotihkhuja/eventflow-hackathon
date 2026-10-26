import { useMemo } from 'react'

import { AlertCircle, CheckCircle2, FileWarning, Layers, Lock } from 'lucide-react'

import type {
  ArtifactTemplateRoleSummary,
  ArtifactTemplateStatus,
  ArtifactTemplateTypeSummary,
  ArtifactType,
} from '@api/services'
import { useArtifactTemplateSummaryQuery } from '@features/events/api'
import { resolveLocalizedField } from '@entities/event/lib/localized-field'
import { useLocale, useT } from '@eventflow/i18n/react'
import { cn } from '@shared/lib/cn'
import { Badge, Button, Card, Skeleton } from '@shared/ui'

type TemplateSummarySectionProps = {
  eventId: string
  artifactType: ArtifactType
  /** Optional callback when the user clicks "Edit / Create template" for a role */
  onEditTemplateForRole?: (role: ArtifactTemplateRoleSummary) => void
  /** Whether the current user may edit/create templates. Defaults to true for backwards compatibility. */
  canEditTemplate?: boolean
  /** Tooltip shown when the edit button is hidden because the user lacks permission. */
  editDisabledReason?: string
  className?: string
}

const STATUS_LABEL_KEY: Record<ArtifactTemplateStatus, string> = {
  READY: 'events.artifactRoles.status.ready',
  MISSING: 'events.artifactRoles.status.missing',
  INACTIVE_ROLE: 'events.artifactRoles.status.inactiveRole',
  NOT_ARTIFACT_ELIGIBLE: 'events.artifactRoles.status.notEligible',
  DUPLICATE_DEFAULT: 'events.artifactRoles.status.duplicateDefault',
}

const STATUS_TONE: Record<
  ArtifactTemplateStatus,
  { className: string; icon: typeof CheckCircle2 }
> = {
  READY: {
    className: 'border-success-soft bg-success-soft text-success-soft-foreground',
    icon: CheckCircle2,
  },
  MISSING: {
    className: 'border-warning-soft bg-warning-soft text-warning-soft-foreground',
    icon: FileWarning,
  },
  INACTIVE_ROLE: {
    className: 'border-border bg-muted text-muted-foreground',
    icon: Lock,
  },
  NOT_ARTIFACT_ELIGIBLE: {
    className: 'border-border bg-muted text-muted-foreground',
    icon: Lock,
  },
  DUPLICATE_DEFAULT: {
    className: 'border-red-200 bg-red-50 text-destructive dark:border-red-800/60 dark:bg-red-500/10 dark:text-red-300',
    icon: AlertCircle,
  },
}

function effectiveStatus(
  role: ArtifactTemplateRoleSummary,
  type: ArtifactTemplateTypeSummary | undefined
): ArtifactTemplateStatus {
  if (!role.isActive) return 'INACTIVE_ROLE'
  if (!role.isArtifactEligible) return 'NOT_ARTIFACT_ELIGIBLE'
  return type?.templateStatus ?? 'MISSING'
}

function StatusChip({ status }: { status: ArtifactTemplateStatus }) {
  const t = useT()
  const tone = STATUS_TONE[status]
  const Icon = tone.icon
  return (
    <Badge variant="outline" className={cn('gap-1 whitespace-nowrap text-[11px]', tone.className)}>
      <Icon className="h-3 w-3" />
      {t(STATUS_LABEL_KEY[status])}
    </Badge>
  )
}

export function TemplateSummarySection({
  eventId,
  artifactType,
  onEditTemplateForRole,
  canEditTemplate = true,
  editDisabledReason,
  className,
}: TemplateSummarySectionProps) {
  const { data, isLoading } = useArtifactTemplateSummaryQuery(eventId, {
    artifactType,
    includeInactiveRoles: true,
  })
  const uiLocale = useLocale()
  const t = useT()

  const sortedRoles = useMemo(() => {
    const roles = data?.roles ?? []
    return [...roles].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [data?.roles])

  if (isLoading) {
    return (
      <Card className={cn('p-5', className)}>
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    )
  }

  if (sortedRoles.length === 0) {
    return null
  }

  return (
    <Card className={cn('overflow-hidden p-0', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-none">
              {artifactType === 'CERTIFICATE'
                ? t('events.artifactRoles.titleCertificates')
                : t('events.artifactRoles.titleBadges')}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('events.artifactRoles.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {sortedRoles.map(role => {
          const typeSummary =
            artifactType === 'CERTIFICATE'
              ? role.certificateTemplateSummary
              : role.badgeTemplateSummary
          const status = effectiveStatus(role, typeSummary)
          const isCustom = role.kind === 'CUSTOM'
          const showEditButton =
            role.isActive &&
            role.isArtifactEligible &&
            onEditTemplateForRole &&
            canEditTemplate &&
            (status === 'READY' ||
              status === 'MISSING' ||
              status === 'DUPLICATE_DEFAULT')
          return (
            <div
              key={role.roleId}
              className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {resolveLocalizedField(
                      role.roleTranslations,
                      'displayName',
                      uiLocale,
                      role.roleDisplayName,
                    )}
                  </span>
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                    {role.roleCode}
                  </span>
                  {isCustom && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      custom
                    </Badge>
                  )}
                  {!role.isActive && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
                      {t('events.artifactRoles.roleOff')}
                    </Badge>
                  )}
                  {role.isActive && !role.isArtifactEligible && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
                      {t('events.artifactRoles.roleNoArtifacts')}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('events.artifactRoles.activeRecipients')}{' '}
                  <span className="font-medium tabular-nums text-foreground">
                    {role.activeAssignmentCount}
                  </span>
                  {role.assignmentCount !== role.activeAssignmentCount && (
                    <>
                      {' '}
                      <span className="text-muted-foreground/70">
                        {t('events.artifactRoles.totalRecipients', {
                          count: role.assignmentCount,
                        })}
                      </span>
                    </>
                  )}
                  {typeSummary && typeSummary.activeTemplateCount > 0 && (
                    <>
                      {' · '}
                      {t('events.artifactRoles.templatesCount')}{' '}
                      <span className="font-medium tabular-nums text-foreground">
                        {typeSummary.activeTemplateCount}
                      </span>
                    </>
                  )}
                  {typeSummary?.duplicateActiveDefaultCount ? (
                    <>
                      {' · '}
                      <span className="font-medium text-destructive dark:text-red-400">
                        {t('events.artifactRoles.duplicateDefaults', {
                          count: typeSummary.duplicateActiveDefaultCount,
                        })}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusChip status={status} />
                {showEditButton && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onEditTemplateForRole?.(role)}
                  >
                    {status === 'READY'
                      ? t('events.artifactRoles.edit')
                      : t('events.artifactRoles.create')}
                  </Button>
                )}
                {!canEditTemplate &&
                  role.isActive &&
                  role.isArtifactEligible &&
                  editDisabledReason && (
                    <span
                      className="text-[10px] uppercase tracking-wide text-muted-foreground"
                      title={editDisabledReason}
                    >
                      {t('events.artifactRoles.noRights')}
                    </span>
                  )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
