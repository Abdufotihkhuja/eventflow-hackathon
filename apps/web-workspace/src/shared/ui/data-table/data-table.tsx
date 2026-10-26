/**
 * DataTable — универсальный компонент таблицы на TanStack Table
 */

import { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type PaginationState,
  type OnChangeFn,
} from '@tanstack/react-table'

import { cn } from '@shared/lib/cn'
import { Skeleton } from '@shared/ui/shadcn/skeleton'

import { DataTablePagination } from './data-table-pagination'
import { useT } from '@eventflow/i18n/react'

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Серверная пагинация */
  pageCount?: number
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  /** Показывать пагинацию */
  showPagination?: boolean
  /** Клик по строке */
  onRowClick?: (row: TData) => void
  /** Загрузка */
  isLoading?: boolean
  /** Пустое состояние */
  emptyText?: string
  /** Классы */
  className?: string
  /** Опции размера страницы */
  pageSizeOptions?: number[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pagination: externalPagination,
  onPaginationChange,
  showPagination = true,
  onRowClick,
  isLoading,
  emptyText,
  className,
  pageSizeOptions,
}: DataTableProps<TData, TValue>) {
  const t = useT()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const pagination = externalPagination ?? internalPagination
  const setPagination = onPaginationChange ?? setInternalPagination

  const isServerPagination = !!pageCount

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: isServerPagination,
    manualSorting: false,
    manualFiltering: isServerPagination,
    getRowId: (row, index) => {
      try {
        const id = (row as { id?: unknown }).id;
        if (id === null || id === undefined) {
          return String(index);
        }
        if (typeof id === "string" || typeof id === "number") {
          return String(id);
        }
        if (typeof id === "object") {
          // Если id - объект, пытаемся извлечь строковое представление
          const stringId = JSON.stringify(id);
          return stringId.length > 50 ? String(index) : stringId;
        }
        return String(index);
      } catch {
        return String(index);
      }
    },
  })

  return (
    <div className={cn('space-y-4 max-w-full', className)}>
      <div className="rounded-lg border border-border bg-card overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 touch-scroll">
        <table className="w-full min-w-[600px] text-sm" aria-busy={isLoading || undefined}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="h-12 px-4 text-left font-medium text-muted-foreground"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {(() => {
              if (isLoading) {
                return Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className="border-b border-border">
                    {columns.map((_, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[160px]" />
                      </td>
                    ))}
                  </tr>
                ))
              }

              // При серверной пагинации/фильтрации используем getCoreRowModel напрямую
              // (данные уже отфильтрованы/пагинированы на сервере)
              // При клиентской — используем getRowModel (с пагинацией/фильтрацией)
              const rows = isServerPagination
                ? table.getCoreRowModel().rows
                : table.getRowModel().rows

              if (!rows?.length) {
                return (
                  <tr>
                    <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      {emptyText ?? t('common.noData')}
                    </td>
                  </tr>
                )
              }

              return rows.map(row => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  onKeyDown={
                    onRowClick
                      ? event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick(row.original)
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    'border-b border-border transition-colors hover:bg-muted/50',
                    row.getIsSelected() && 'bg-primary/5',
                    onRowClick &&
                      'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
                  )}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            })()}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <DataTablePagination
          table={table}
          showSelectedCount={Object.keys(rowSelection).length > 0}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  )
}
