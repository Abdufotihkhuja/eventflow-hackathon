import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  CheckCircle,
  Clock,
  Mail,
  Shield,
  XCircle,
} from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { VerificationStatus } from '@api/services/auth.types'
import { cn } from '@shared/lib/cn'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@shared/ui'

type VerificationStatusCardProps = {
  status?: VerificationStatus | string
  rejectionReason?: string | null
  verifiedAt?: string | null
  isEmailVerified?: boolean
  isLoading: boolean
}

function getStatusConfig(verificationStatus?: VerificationStatus | string) {
  const normalizedStatus =
    verificationStatus === 'APPROVED' ? VerificationStatus.VERIFIED : verificationStatus

  switch (normalizedStatus) {
    case VerificationStatus.VERIFIED:
      return {
        icon: BadgeCheck,
        iconColor: 'text-success',
        iconBgColor: 'bg-success-soft',
        bgColor: 'bg-success-soft',
        borderColor: 'border-success-soft',
        badgeVariant: 'default' as const,
        badgeClassName: 'bg-success text-success-foreground border-0 font-semibold shadow-sm',
        statusKey: 'profile.verification.verified',
        descriptionKey: 'profile.verification.verifiedDescription',
      }
    case VerificationStatus.REJECTED:
      return {
        icon: XCircle,
        iconColor: 'text-destructive',
        iconBgColor: 'bg-destructive/10',
        bgColor: 'bg-destructive/5',
        borderColor: 'border-destructive/30',
        badgeVariant: 'destructive' as const,
        badgeClassName: 'font-semibold',
        statusKey: 'profile.verification.rejected',
        descriptionKey: 'profile.verification.rejectedDescription',
      }
    case VerificationStatus.PENDING:
    default:
      return {
        icon: Clock,
        iconColor: 'text-warning',
        iconBgColor: 'bg-warning-soft',
        bgColor: 'bg-warning-soft',
        borderColor: 'border-warning-soft',
        badgeVariant: 'outline' as const,
        badgeClassName: 'border-warning text-warning-soft-foreground font-semibold',
        statusKey: 'profile.verification.pending',
        descriptionKey: 'profile.verification.pendingDescription',
      }
  }
}

export function VerificationStatusCard({
  status,
  rejectionReason,
  verifiedAt,
  isEmailVerified,
  isLoading,
}: VerificationStatusCardProps) {
  const t = useT()
  const config = getStatusConfig(status)
  const StatusIcon = config.icon

  return (
    <Card className={cn(config.borderColor)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          {t('profile.verification.title')}
        </CardTitle>
        <CardDescription>{t('profile.verification.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={cn('rounded-lg border-2 p-5 transition', config.bgColor, config.borderColor)}
            >
              <div className="flex items-start gap-4">
                <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', config.iconBgColor)}>
                  <StatusIcon className={cn('size-6', config.iconColor)} />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {t(config.statusKey)}
                    </h3>
                    <Badge variant={config.badgeVariant} className={config.badgeClassName}>
                      {status ? t(config.statusKey) : t('profile.verification.unknown')}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{t(config.descriptionKey)}</p>

                  {(status === VerificationStatus.VERIFIED || status === 'APPROVED') && verifiedAt && (
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-success-soft px-3 py-2">
                      <Calendar className="size-4 text-success-soft-foreground" />
                      <p className="text-sm font-medium text-success-soft-foreground">
                        {t('profile.verification.verifiedAt', {
                          date: format(new Date(verifiedAt), 'd MMMM yyyy', { locale: ru }),
                        })}
                      </p>
                    </div>
                  )}

                  {status === VerificationStatus.REJECTED && rejectionReason && (
                    <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="size-5 mt-0.5 shrink-0 text-destructive" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-destructive">
                            {t('profile.verification.rejectionReason')}
                          </p>
                          <p className="text-sm leading-relaxed text-destructive/90">{rejectionReason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {status === VerificationStatus.PENDING && (
                    <div className="mt-3 rounded-md bg-warning-soft px-3 py-2">
                      <p className="text-sm text-warning-soft-foreground">
                        {t('profile.verification.pendingHint')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <span className="text-sm">{t('profile.verification.emailVerified')}</span>
              </div>
              {isEmailVerified ? (
                <Badge variant="default" className="bg-success-soft text-success-soft-foreground hover:bg-success-soft/80">
                  <CheckCircle className="mr-1 size-3" />
                  {t('profile.visibility.yes')}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="mr-1 size-3" />
                  {t('profile.visibility.no')}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
