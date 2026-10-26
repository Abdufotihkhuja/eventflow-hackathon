/**
 * Super Admin — страница управления организациями
 * GET /api/v1/super-admin/organizations?status=active|archived|all
 */

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, X } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'
import { useLocale, useT } from '@eventflow/i18n/react'
import { translateOptions } from '@eventflow/i18n'

import type {
  AdminOrganization,
  AdminRecordStatus,
} from '@api/services/superAdmin.types'
import {
  useAdminOrganizations,
  useApproveOrganization,
  useRejectOrganization,
  useUpdateAdminOrganization,
  useArchiveAdminOrganization,
  useRestoreAdminOrganization,
  useHardDeleteAdminOrganization,
  useOrganizationDeletePreview,
  ConfirmActionDialog,
  HardDeleteDialog,
} from '@features/super-admin'
import {
  Button,
  DataTable,
  Dialog,
  ErrorState,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FilterToolbar,
  PageTabs,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
} from '@shared/ui'

import { createOrganizationsColumns } from './organizations-columns'
import { OrganizationDetailSheet } from './organization-detail-sheet'

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.allStatuses' },
  { value: 'PENDING', labelKey: 'admin.statuses.pendingVerification' },
  { value: 'APPROVED', labelKey: 'admin.statuses.approved' },
  { value: 'REJECTED', labelKey: 'admin.statuses.rejected' },
] as const

const LIFECYCLE_VALUES: AdminRecordStatus[] = ['active', 'archived', 'all']

export default function SuperAdminOrganizationsPage() {
  const t = useT()
  const locale = useLocale()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const lifecycle: AdminRecordStatus = LIFECYCLE_VALUES.includes(
    statusParam as AdminRecordStatus
  )
    ? (statusParam as AdminRecordStatus)
    : 'active'

  // Поиск можно инициализировать извне: /admin/organizations?search=<название>
  // (кросс-ссылки из карточек событий и пользователей).
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [status, setStatus] = useState('all')

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const [selectedOrg, setSelectedOrg] = useState<AdminOrganization | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [orgToReject, setOrgToReject] = useState<AdminOrganization | null>(null)

  // Цели опасных действий (страница владеет диалогами).
  const [archiveTarget, setArchiveTarget] = useState<AdminOrganization | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<AdminOrganization | null>(null)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<AdminOrganization | null>(null)

  const { data, isLoading, error, refetch } = useAdminOrganizations({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
    verificationStatus:
      status !== 'all' ? (status as 'PENDING' | 'APPROVED' | 'REJECTED') : undefined,
    status: lifecycle,
  })

  const approveOrg = useApproveOrganization()
  const rejectOrg = useRejectOrganization()
  const updateOrg = useUpdateAdminOrganization()
  const archiveOrg = useArchiveAdminOrganization()
  const restoreOrg = useRestoreAdminOrganization()
  const hardDeleteOrg = useHardDeleteAdminOrganization()

  // Сводка зависимостей подгружается, только когда открыт диалог hard delete.
  const deletePreview = useOrganizationDeletePreview(
    hardDeleteTarget?.id ?? null,
    !!hardDeleteTarget
  )

  const isPending =
    approveOrg.isPending ||
    rejectOrg.isPending ||
    updateOrg.isPending ||
    archiveOrg.isPending ||
    restoreOrg.isPending ||
    hardDeleteOrg.isPending

  const setLifecycle = (next: AdminRecordStatus) => {
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

  const handleView = (org: AdminOrganization) => {
    setSelectedOrg(org)
    setSheetOpen(true)
  }

  const closeAll = () => {
    setSheetOpen(false)
    setSelectedOrg(null)
  }

  const handleApprove = (org: AdminOrganization) => {
    approveOrg.mutate(org.id, { onSuccess: () => closeAll() })
  }

  const handleOpenRejectDialog = (org: AdminOrganization) => {
    setOrgToReject(org)
    setRejectDialogOpen(true)
  }

  const handleReject = () => {
    if (!orgToReject) return
    rejectOrg.mutate(
      { orgId: orgToReject.id, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          setRejectDialogOpen(false)
          setRejectReason('')
          setOrgToReject(null)
          closeAll()
        },
      }
    )
  }

  const confirmArchive = (reason?: string) => {
    if (!archiveTarget) return
    archiveOrg.mutate(
      { orgId: archiveTarget.id, reason },
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
    restoreOrg.mutate(restoreTarget.id, {
      onSuccess: () => {
        setRestoreTarget(null)
        closeAll()
      },
    })
  }

  const confirmHardDelete = () => {
    if (!hardDeleteTarget) return
    hardDeleteOrg.mutate(
      { orgId: hardDeleteTarget.id, confirmation: `DELETE ${hardDeleteTarget.name}` },
      {
        onSuccess: () => {
          setHardDeleteTarget(null)
          closeAll()
        },
      }
    )
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const hasFilters = !!search || status !== 'all'
  const statusOptions = useMemo(() => translateOptions(STATUS_OPTIONS, t), [t])

  const columns = useMemo(
    () =>
      createOrganizationsColumns({
        t,
        locale,
        onView: handleView,
        onBilling: org => navigate(`/admin/organizations/${org.id}/billing`),
        onApprove: handleApprove,
        onReject: handleOpenRejectDialog,
        onArchive: setArchiveTarget,
        onRestore: setRestoreTarget,
        onHardDelete: setHardDeleteTarget,
        isPending,
      }),
    [isPending, locale, navigate, t]
  )

  const pageCount = data ? Math.ceil(data.total / pagination.pageSize) : 0

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
        active={lifecycle}
        onChange={setLifecycle}
      />

      <FilterToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('admin.filters.searchByTitleOrEmail')}
        hasFilters={hasFilters}
        onReset={clearFilters}
        resetLabel={t('admin.actions.reset')}
        filters={
          <Select
            value={status}
            onValueChange={v => {
              setStatus(v)
              setPagination(prev => ({ ...prev, pageIndex: 0 }))
            }}
          >
            <SelectTrigger className="h-9 w-[180px]" aria-label={t('admin.filters.status')}>
              <SelectValue placeholder={t('admin.filters.status')} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        footer={
          data
            ? t('admin.tables.resultsFound', {
                count: data.total,
                entity: t('admin.tables.entities.organizations'),
              })
            : undefined
        }
      />

      <DataTable
        key={`${lifecycle}-${status}-${search}-${pagination.pageIndex}`}
        columns={columns}
        data={data?.data ?? []}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        emptyText={t('admin.tables.empty.organizations')}
        onRowClick={org => navigate(`/admin/organizations/${org.id}`)}
      />

      <OrganizationDetailSheet
        organization={selectedOrg}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onApprove={handleApprove}
        onReject={handleOpenRejectDialog}
        onArchive={setArchiveTarget}
        onRestore={setRestoreTarget}
        onHardDelete={setHardDeleteTarget}
        onOrganizationUpdated={setSelectedOrg}
        isPending={isPending}
      />

      {/* Отклонение организации (модерация) */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.dialogs.rejectOrganizationTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.dialogs.rejectOrganizationDescription', { name: orgToReject?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('admin.dialogs.optionalRejectReasonPlaceholder')}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('admin.actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectOrg.isPending}>
              <X className="mr-2 size-4" aria-hidden="true" />
              {t('admin.actions.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Архивация */}
      <ConfirmActionDialog
        open={!!archiveTarget}
        onOpenChange={o => !o && setArchiveTarget(null)}
        title={t('admin.dialogs.archiveOrganizationTitle')}
        description={t('admin.dialogs.archiveOrganizationDescription', {
          name: archiveTarget?.name ?? '',
        })}
        confirmLabel={t('admin.actions.archive')}
        variant="destructive"
        withReason
        reasonLabel={t('admin.dialogs.archiveReasonLabel')}
        reasonPlaceholder={t('admin.dialogs.archiveReasonPlaceholder')}
        isPending={archiveOrg.isPending}
        onConfirm={confirmArchive}
      />

      {/* Восстановление */}
      <ConfirmActionDialog
        open={!!restoreTarget}
        onOpenChange={o => !o && setRestoreTarget(null)}
        title={t('admin.dialogs.restoreOrganizationTitle')}
        description={t('admin.dialogs.restoreOrganizationDescription', {
          name: restoreTarget?.name ?? '',
        })}
        confirmLabel={t('admin.actions.restore')}
        isPending={restoreOrg.isPending}
        onConfirm={confirmRestore}
      />

      {/* Необратимое удаление (только для архивированных, со сводкой зависимостей) */}
      <HardDeleteDialog
        open={!!hardDeleteTarget}
        onOpenChange={o => !o && setHardDeleteTarget(null)}
        title={t('admin.dialogs.hardDeleteOrganizationTitle')}
        warning={t('admin.dialogs.hardDeleteOrganizationWarning')}
        confirmationPhrase={`DELETE ${hardDeleteTarget?.name ?? ''}`}
        inputLabel={t('admin.dialogs.hardDeleteTypeToConfirm', {
          phrase: `DELETE ${hardDeleteTarget?.name ?? ''}`,
        })}
        confirmLabel={t('admin.actions.hardDeleteOrganization')}
        isPending={hardDeleteOrg.isPending}
        onConfirm={confirmHardDelete}
      >
        <div className="space-y-3">
          <dl className="space-y-2">
            <DepRow label={t('admin.organizations.fields.representativeName')} value={hardDeleteTarget?.name ?? ''} />
            <DepRow label="Email" value={hardDeleteTarget?.email ?? ''} />
          </dl>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground">
            {t('admin.dialogs.hardDeleteDependenciesTitle')}
          </p>
          {deletePreview.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t('admin.dialogs.hardDeleteLoadingPreview')}
            </div>
          ) : deletePreview.data ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <DepRow label={t('admin.dialogs.depMembers')} value={deletePreview.data.members} />
              <DepRow label={t('admin.dialogs.depEvents')} value={deletePreview.data.events} />
              <DepRow label={t('admin.dialogs.depRegistrations')} value={deletePreview.data.registrations} />
              <DepRow label={t('admin.dialogs.depCertificates')} value={deletePreview.data.certificates} />
              <DepRow label={t('admin.dialogs.depTickets')} value={deletePreview.data.tickets} />
              <DepRow label={t('admin.dialogs.depBadges')} value={deletePreview.data.badgeTemplates} />
              <DepRow label={t('admin.dialogs.depBoards')} value={deletePreview.data.boards} />
              <DepRow label={t('admin.dialogs.depBlogPosts')} value={deletePreview.data.blogPosts} />
              <DepRow label={t('admin.dialogs.depRentalPlaces')} value={deletePreview.data.rentalPlaces} />
              <DepRow label={t('admin.dialogs.depFollowers')} value={deletePreview.data.followers} />
              <DepRow label={t('admin.dialogs.depFiles')} value={deletePreview.data.fileUploads} />
              <DepRow label={t('admin.dialogs.depBilling')} value={deletePreview.data.billingRecords} />
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('admin.dialogs.hardDeletePreviewError')}
            </p>
          )}
        </div>
      </HardDeleteDialog>
    </div>
  )
}

function DepRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}
