/**
 * Super Admin — страница управления категориями
 * API: GET/POST/PATCH/DELETE /api/v1/super-admin/categories
 */

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { PaginationState } from '@tanstack/react-table'
import { useLocale, useT } from '@eventflow/i18n/react'
import { translateOptions } from '@eventflow/i18n'

import type { AdminCategory } from '@api/services/superAdmin.types'
import type { CreateAdminCategoryRequest } from '@api/services/superAdmin.types'
import {
  useAdminCategories,
  useCreateAdminCategory,
  useUpdateAdminCategory,
  useDeleteAdminCategory,
} from '@features/super-admin'
import {
  Button,
  DataTable,
  ErrorState,
  FilterToolbar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

import { createCategoriesColumns } from './categories-columns'
import { CategoryFormDialog } from './category-form-dialog'

const ACTIVE_OPTIONS = [
  { value: 'all', labelKey: 'admin.filters.all' },
  { value: 'true', labelKey: 'admin.statuses.active' },
  { value: 'false', labelKey: 'admin.statuses.inactive' },
] as const

export default function SuperAdminCategoriesPage() {
  const t = useT()
  const locale = useLocale()
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState('all')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null)

  const { data, isLoading, error, refetch } = useAdminCategories({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: search || undefined,
    isActive: isActive === 'all' ? undefined : isActive === 'true',
  })

  const createCategory = useCreateAdminCategory()
  const updateCategory = useUpdateAdminCategory()
  const deleteCategory = useDeleteAdminCategory()
  const isPending =
    createCategory.isPending || updateCategory.isPending || deleteCategory.isPending

  const handleCreate = () => {
    setEditingCategory(null)
    setFormOpen(true)
  }

  const handleEdit = (category: AdminCategory) => {
    setEditingCategory(category)
    setFormOpen(true)
  }

  const handleSubmit = (formData: CreateAdminCategoryRequest) => {
    if (editingCategory) {
      const id =
        typeof editingCategory.id === 'string'
          ? editingCategory.id
          : String(editingCategory.id ?? '')
      updateCategory.mutate({ id, data: formData }, { onSuccess: () => setFormOpen(false) })
    } else {
      createCategory.mutate(formData, { onSuccess: () => setFormOpen(false) })
    }
  }

  const handleDelete = (category: AdminCategory) => {
    const id = typeof category.id === 'string' ? category.id : String(category.id ?? '')
    deleteCategory.mutate(id)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const clearFilters = () => {
    setSearch('')
    setIsActive('all')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }
  const hasFilters = !!search || isActive !== 'all'
  const activeOptions = useMemo(() => translateOptions(ACTIVE_OPTIONS, t), [t])

  const columns = useMemo(
    () =>
      createCategoriesColumns({
        t,
        locale,
        onEdit: handleEdit,
        onDelete: handleDelete,
        isPending,
      }),
    [isPending, locale, t]
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

      <FilterToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('admin.filters.searchByTitle')}
        hasFilters={hasFilters}
        onReset={clearFilters}
        resetLabel={t('admin.actions.reset')}
        filters={
          <Select
            value={isActive}
            onValueChange={v => {
              setIsActive(v)
              setPagination(prev => ({ ...prev, pageIndex: 0 }))
            }}
          >
            <SelectTrigger className="h-9 w-[160px]" aria-label={t('admin.filters.status')}>
              <SelectValue placeholder={t('admin.filters.status')} />
            </SelectTrigger>
            <SelectContent>
              {activeOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            {t('admin.categories.newTitle')}
          </Button>
        }
        footer={
          data
            ? t('admin.tables.resultsFound', {
                count: typeof data.total === 'number' ? data.total : Number(data.total) || 0,
                entity: t('admin.tables.entities.categories'),
              })
            : undefined
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={isLoading}
        emptyText={t('admin.tables.empty.categories')}
      />

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        onSubmit={handleSubmit}
        isPending={createCategory.isPending || updateCategory.isPending}
      />
    </div>
  )
}
