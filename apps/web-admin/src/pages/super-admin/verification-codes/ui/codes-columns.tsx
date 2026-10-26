/**
 * Колонки таблицы кодов верификации для Super Admin
 * Согласно API: GET /api/v1/super-admin/verification-codes
 */

import type { ColumnDef } from '@tanstack/react-table'
import { formatDateTime, type Locale, type Translator } from '@eventflow/i18n'
import { CheckCircle2, XCircle, Mail, User, Copy } from 'lucide-react'
import { toast } from 'sonner'

import type { VerificationCode } from '@api/services/superAdmin.types'
import { cn } from '@shared/lib/cn'
import { Button, DataTableColumnHeader, StatusPill, type StatusPillTone } from '@shared/ui'

// ================================
// Type Badge
// ================================

const TYPE_CONFIG: Record<
  VerificationCode['type'],
  { labelKey: string; icon: typeof Mail; tone: StatusPillTone }
> = {
  EMAIL_VERIFICATION: {
    labelKey: 'admin.tables.columns.email',
    icon: Mail,
    tone: 'info',
  },
  PASSWORD_RESET: {
    labelKey: 'admin.verificationCodes.typePasswordShort',
    icon: User,
    tone: 'warning',
  },
  EMAIL_CHANGE: {
    labelKey: 'admin.verificationCodes.typeChangeShort',
    icon: Mail,
    tone: 'neutral',
  },
}

// ================================
// Copy Code Button
// ================================

function CopyCodeButton({ code, t }: { code: string; t: Translator }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(t('admin.verificationCodes.codeCopied'))
    } catch {
      toast.error(t('admin.verificationCodes.copyError'))
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 gap-1.5 px-2 font-mono text-xs"
    >
      <Copy className="size-3" />
      {code}
    </Button>
  )
}

// ================================
// Create Columns
// ================================

export function createCodesColumns(t: Translator, locale: Locale): ColumnDef<VerificationCode>[] {
  return [
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => {
        const code = row.original

        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{code.email}</p>
            {code.newEmail && (
              <p className="truncate text-xs text-muted-foreground">→ {code.newEmail}</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {code.actorType === 'USER'
                ? t('admin.verificationCodes.accountUser')
                : code.actorType === 'ORGANIZATION'
                  ? t('admin.verificationCodes.accountOrganization')
                  : t('admin.verificationCodes.accountMember')}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.tables.columns.code')} />,
      cell: ({ row }) => <CopyCodeButton code={row.original.code} t={t} />,
      enableSorting: false,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.tables.columns.type')} />,
      cell: ({ row }) => {
        const type = row.original.type
        const config = TYPE_CONFIG[type]
        const Icon = config.icon

        return (
          <StatusPill tone={config.tone} dot={false}>
            <Icon className="size-3 shrink-0" />
            {t(config.labelKey)}
          </StatusPill>
        )
      },
    },
    {
      accessorKey: 'isUsed',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.tables.columns.status')} />,
      cell: ({ row }) => {
        const code = row.original
        const isExpired = new Date(code.expiresAt) < new Date()

        return (
          <StatusPill
            tone={code.isUsed ? 'success' : isExpired ? 'danger' : 'neutral'}
            dot={false}
          >
            {code.isUsed ? (
              <>
                <CheckCircle2 className="size-3" />
                {t('admin.statuses.used')}
              </>
            ) : isExpired ? (
              <>
                <XCircle className="size-3" />
                {t('admin.statuses.expired')}
              </>
            ) : (
              <>
                <XCircle className="size-3" />
                {t('admin.statuses.active')}
              </>
            )}
          </StatusPill>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.tables.columns.createdAt')} />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.createdAt, locale)}
        </span>
      ),
    },
    {
      accessorKey: 'expiresAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.tables.columns.expiresAt')} />,
      cell: ({ row }) => {
        const expiresAt = new Date(row.original.expiresAt)
        const isExpired = expiresAt < new Date()

        return (
          <span
            className={cn(
              'text-sm',
              isExpired ? 'font-medium text-destructive' : 'text-muted-foreground'
            )}
          >
            {formatDateTime(expiresAt, locale)}
          </span>
        )
      },
    },
    {
      accessorKey: 'attempts',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.verificationCodes.attempts')} />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.attempts}</span>
      ),
    },
    {
      accessorKey: 'usedAt',
      id: 'usedAtDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.tables.columns.usedAt')} />,
      cell: ({ row }) => {
        const usedAt = row.original.usedAt
        return usedAt ? (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(usedAt, locale)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
    },
  ]
}
