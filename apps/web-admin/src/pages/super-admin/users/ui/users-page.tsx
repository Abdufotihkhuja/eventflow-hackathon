/**
 * Super Admin — страница управления пользователями
 * Согласно API: GET /api/v1/super-admin/users?status=active|archived|all
 */

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { PaginationState } from '@tanstack/react-table'
import { useLocale, useT } from '@eventflow/i18n/react'
import { translateOptions } from '@eventflow/i18n'
import { Download } from 'lucide-react'

import type {
  AdminRecordStatus,
  AdminUser,
  AdminUserExportField,
} from '@api/services/superAdmin.types'
import {
  useAdminUsers,
  useArchiveAdminUser,
  useRestoreAdminUser,
  useHardDeleteAdminUser,
  useExportAdminUsers,
  ConfirmActionDialog,
  HardDeleteDialog,
} from '@features/super-admin'
import { formatUserName } from '@shared/lib'
import {
  Button,
  DataTable,
  ErrorState,
  FilterToolbar,
  PageTabs,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

import { createUsersColumns } from './users-columns'
import { UserDetailSheet } from './user-detail-sheet'
import { UsersExportDialog } from './users-export-dialog'

const EMAIL_VERIFIED_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.all' },
  { value: 'true', labelKey: 'admin.filters.verified' },
  { value: 'false', labelKey: 'admin.filters.notVerified' },
] as const

const STATUS_VALUES: AdminRecordStatus[] = ['active', 'archived', 'all']

export default function SuperAdminUsersPage() {
  const t = useT()
  const locale = useLocale()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status: AdminRecordStatus = STATUS_VALUES.includes(
    statusParam as AdminRecordStatus
  )
    ? (statusParam as AdminRecordStatus)
    : 'active'

  const [search, setSearch] = useState('')
  const [emailVerified, setEmailVerified] = useState('all')

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  // Цели для подтверждающих диалогов (страница владеет опасными действиями).
  const [archiveTarget, setArchiveTarget] = useState<AdminUser | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<AdminUser | null>(null)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<AdminUser | null>(null)

  const { data, isLoading, error, refetch } = useAdminUsers({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
    isEmailVerified: emailVerified === 'all' ? undefined : emailVerified === 'true',
    status,
  })

  const archiveUser = useArchiveAdminUser()
  const restoreUser = useRestoreAdminUser()
  const hardDeleteUser = useHardDeleteAdminUser()
  const exportUsers = useExportAdminUsers()
  const isPending =
    archiveUser.isPending || restoreUser.isPending || hardDeleteUser.isPending

  const setStatus = (next: AdminRecordStatus) => {
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev)
        if (next === 'active') params.delete('status')
        else params.set('status', next)
        return params
      },
      { replace: true }
    )
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const handleView = (user: AdminUser) => {
    setSelectedUser(user)
    setSheetOpen(true)
  }

  const closeAll = () => {
    setSheetOpen(false)
    setSelectedUser(null)
  }

  const confirmArchive = (reason?: string) => {
    if (!archiveTarget) return
    archiveUser.mutate(
      { userId: archiveTarget.id, reason },
      {
        onSuccess: () => {
          setArchiveTarget(null)
          closeAll()
        },
      }
    )
  }

  const confirmRestore = () => {
    if (!restoreTarget) return
    restoreUser.mutate(restoreTarget.id, {
      onSuccess: () => {
        setRestoreTarget(null)
        closeAll()
      },
    })
  }

  const confirmHardDelete = () => {
    if (!hardDeleteTarget) return
    hardDeleteUser.mutate(hardDeleteTarget.id, {
      onSuccess: () => {
        setHardDeleteTarget(null)
        closeAll()
      },
    })
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const clearFilters = () => {
    setSearch('')
    setEmailVerified('all')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  // Выгрузка идёт по тем же фильтрам, что и таблица, — вкладка входит в них.
  const handleExport = (fields: AdminUserExportField[]) => {
    exportUsers.mutate(
      {
        fields,
        search: search || undefined,
        isEmailVerified:
          emailVerified === 'all' ? undefined : emailVerified === 'true',
        status,
      },
      { onSuccess: () => setExportOpen(false) }
    )
  }

  const hasFilters = !!search || emailVerified !== 'all'
  const emailVerifiedOptions = useMemo(() => translateOptions(EMAIL_VERIFIED_OPTIONS, t), [t])

  const columns = useMemo(
    () =>
      createUsersColumns({
        t,
        locale,
        onView: handleView,
        onArchive: setArchiveTarget,
        onRestore: setRestoreTarget,
        onHardDelete: setHardDeleteTarget,
        isPending,
      }),
    [isPending, locale, t]
  )

  const pageCount = data ? Math.ceil(data.total / pagination.pageSize) : 0

  const archiveName = archiveTarget
    ? formatUserName(archiveTarget.firstName, archiveTarget.lastName)
    : ''
  const restoreName = restoreTarget
    ? formatUserName(restoreTarget.firstName, restoreTarget.lastName)
    : ''
  const hardDeleteName = hardDeleteTarget
    ? formatUserName(hardDeleteTarget.firstName, hardDeleteTarget.lastName)
    : ''

  return (
    <div className="space-y-6">
      {error && (
        <ErrorState
          title={t('admin.errors.loadFailed')}
          onRetry={() => refetch()}
          retryLabel={t('admin.errors.retry')}
        />
      )}

      <PageTabs<AdminRecordStatus>
        items={[
          { id: 'active', label: t('admin.tabs.active') },
          { id: 'archived', label: t('admin.tabs.archived') },
          { id: 'all', label: t('admin.tabs.all') },
        ]}
        active={status}
        onChange={setStatus}
      />

      <FilterToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('admin.filters.searchByNameOrEmail')}
        hasFilters={hasFilters}
        onReset={clearFilters}
        resetLabel={t('admin.actions.reset')}
        filters={
          <Select
            value={emailVerified}
            onValueChange={v => {
              setEmailVerified(v)
              setPagination(prev => ({ ...prev, pageIndex: 0 }))
            }}
          >
            <SelectTrigger className="h-9 w-[180px]" aria-label={t('admin.filters.email')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {emailVerifiedOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setExportOpen(true)}
            disabled={!data || data.total === 0}
          >
            <Download className="size-3.5" aria-hidden="true" />
            {t('admin.usersExport.trigger')}
          </Button>
        }
        footer={
          data
            ? t('admin.tables.resultsFound', {
                count: data.total,
                entity: t('admin.tables.entities.users'),
              })
            : undefined
        }
      />

      <DataTable
        key={`${status}-${search}-${pagination.pageIndex}`}
        columns={columns}
        data={data?.data ?? []}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        emptyText={t('admin.tables.empty.users')}
        onRowClick={user => navigate(`/admin/users/${user.id}`)}
      />

      <UsersExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        matchingCount={data?.total}
        hasFilters={hasFilters || status !== 'active'}
        isPending={exportUsers.isPending}
        onExport={handleExport}
      />

      <UserDetailSheet
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onArchive={setArchiveTarget}
        onRestore={setRestoreTarget}
        onHardDelete={setHardDeleteTarget}
        onUserUpdated={setSelectedUser}
        isBusy={isPending}
      />

      {/* Архивация */}
      <ConfirmActionDialog
        open={!!archiveTarget}
        onOpenChange={o => !o && setArchiveTarget(null)}
        title={t('admin.dialogs.archiveUserTitle')}
        description={t('admin.dialogs.archiveUserDescription', { name: archiveName })}
        confirmLabel={t('admin.actions.archive')}
        variant="destructive"
        withReason
        reasonLabel={t('admin.dialogs.archiveReasonLabel')}
        reasonPlaceholder={t('admin.dialogs.archiveReasonPlaceholder')}
        isPending={archiveUser.isPending}
        onConfirm={confirmArchive}
      />

      {/* Восстановление */}
      <ConfirmActionDialog
        open={!!restoreTarget}
        onOpenChange={o => !o && setRestoreTarget(null)}
        title={t('admin.dialogs.restoreUserTitle')}
        description={t('admin.dialogs.restoreUserDescription', { name: restoreName })}
        confirmLabel={t('admin.actions.restore')}
        isPending={restoreUser.isPending}
        onConfirm={confirmRestore}
      />

      {/* Необратимое удаление (только для архивированных) */}
      <HardDeleteDialog
        open={!!hardDeleteTarget}
        onOpenChange={o => !o && setHardDeleteTarget(null)}
        title={t('admin.dialogs.hardDeleteUserTitle')}
        warning={t('admin.dialogs.hardDeleteUserWarning')}
        confirmationPhrase="DELETE"
        inputLabel={t('admin.dialogs.hardDeleteTypeToConfirm', { phrase: 'DELETE' })}
        confirmLabel={t('admin.actions.hardDeleteUser')}
        isPending={hardDeleteUser.isPending}
        onConfirm={confirmHardDelete}
      >
        <dl className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{t('admin.users.fields.name')}</dt>
            <dd className="truncate font-medium">{hardDeleteName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{t('admin.users.fields.email')}</dt>
            <dd className="truncate font-medium">{hardDeleteTarget?.email}</dd>
          </div>
        </dl>
      </HardDeleteDialog>
    </div>
  )
}
