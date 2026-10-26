/**
 * Super Admin — страница кодов верификации
 * Согласно API: GET /api/v1/super-admin/verification-codes
 */

import { useMemo, useState } from 'react'
import type { PaginationState } from '@tanstack/react-table'
import { useLocale, useT } from '@eventflow/i18n/react'
import { translateOptions } from '@eventflow/i18n'

import { useVerificationCodes } from '@features/super-admin'
import {
  DataTable,
  ErrorState,
  FilterToolbar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

import { createCodesColumns } from './codes-columns'

const TYPE_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.allTypes' },
  { value: 'EMAIL_VERIFICATION', labelKey: 'admin.verificationCodes.typeEmailVerification' },
  { value: 'PASSWORD_RESET', labelKey: 'admin.verificationCodes.typePasswordReset' },
  { value: 'EMAIL_CHANGE', labelKey: 'admin.verificationCodes.typeEmailChange' },
] as const

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.allStatuses' },
  { value: 'used', labelKey: 'admin.statuses.used' },
  { value: 'unused', labelKey: 'admin.statuses.unused' },
] as const

const ACTOR_TYPE_OPTIONS = [
  { value: 'all', labelKey: 'admin.verificationCodes.allAccountTypes' },
  { value: 'USER', labelKey: 'admin.verificationCodes.accountUser' },
  { value: 'ORGANIZATION', labelKey: 'admin.verificationCodes.accountOrganization' },
  { value: 'MEMBER', labelKey: 'admin.verificationCodes.accountMember' },
] as const

export default function VerificationCodesPage() {
  const t = useT()
  const locale = useLocale()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [actorTypeFilter, setActorTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  })

  const { data, isLoading, error, refetch } = useVerificationCodes({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    email: search.trim() || undefined,
    type:
      typeFilter !== 'all'
        ? (typeFilter as 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE')
        : undefined,
    actorType:
      actorTypeFilter !== 'all'
        ? (actorTypeFilter as 'USER' | 'ORGANIZATION' | 'MEMBER')
        : undefined,
    isUsed: statusFilter === 'used' ? true : statusFilter === 'unused' ? false : undefined,
    sort: '-createdAt',
  })

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setActorTypeFilter('all')
    setStatusFilter('all')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const hasFilters =
    !!search || typeFilter !== 'all' || actorTypeFilter !== 'all' || statusFilter !== 'all'
  const typeOptions = useMemo(() => translateOptions(TYPE_OPTIONS, t), [t])
  const statusOptions = useMemo(() => translateOptions(STATUS_OPTIONS, t), [t])
  const actorTypeOptions = useMemo(() => translateOptions(ACTOR_TYPE_OPTIONS, t), [t])

  const columns = useMemo(() => createCodesColumns(t, locale), [locale, t])

  const pageCount = data ? Math.ceil(data.total / pagination.pageSize) : 0

  const handleSelectChange =
    (setter: (value: string) => void) =>
    (value: string) => {
      setter(value)
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorState
          title={t('admin.errors.loadFailed')}
          onRetry={() => refetch()}
          retryLabel={t('admin.errors.retry')}
        />
      )}

      <FilterToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('admin.filters.searchByEmail')}
        hasFilters={hasFilters}
        onReset={clearFilters}
        resetLabel={t('admin.actions.reset')}
        filters={
          <>
            <Select value={typeFilter} onValueChange={handleSelectChange(setTypeFilter)}>
              <SelectTrigger className="h-9 w-[200px]" aria-label={t('admin.tables.columns.type')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={actorTypeFilter}
              onValueChange={handleSelectChange(setActorTypeFilter)}
            >
              <SelectTrigger
                className="h-9 w-[180px]"
                aria-label={t('admin.verificationCodes.allAccountTypes')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actorTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={handleSelectChange(setStatusFilter)}>
              <SelectTrigger className="h-9 w-[160px]" aria-label={t('admin.tables.columns.status')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        footer={
          data
            ? t('admin.tables.resultsFound', {
                count: data.total,
                entity: t('admin.tables.entities.codes'),
              })
            : undefined
        }
      />

      <DataTable
        key={`${typeFilter}-${actorTypeFilter}-${statusFilter}-${search}-${pagination.pageIndex}`}
        columns={columns}
        data={data?.data ?? []}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        emptyText={t('admin.tables.empty.verificationCodes')}
        pageSizeOptions={[10, 15, 20, 30, 50]}
      />
    </div>
  )
}
