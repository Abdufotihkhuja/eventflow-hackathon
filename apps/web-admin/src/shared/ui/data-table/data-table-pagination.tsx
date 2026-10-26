/**
 * DataTablePagination — пагинация для DataTable
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { Table } from '@tanstack/react-table'
import { useT } from '@eventflow/i18n/react'

import { Button } from '../shadcn/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../shadcn/select'

type DataTablePaginationProps<TData> = {
  table: Table<TData>
  showSelectedCount?: boolean
  pageSizeOptions?: number[]
}

export function DataTablePagination<TData>({
  table,
  showSelectedCount,
  pageSizeOptions = [10, 20, 30, 50],
}: DataTablePaginationProps<TData>) {
  const t = useT()

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:gap-4">
      <div className="text-sm text-muted-foreground">
        {showSelectedCount ? (
          <>
            {t('admin.tables.pagination.selected', {
              selected: table.getFilteredSelectedRowModel().rows.length,
              total: table.getFilteredRowModel().rows.length,
            })}
          </>
        ) : (
          <>
            {t('admin.tables.pagination.page', {
              page: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount() || 1,
            })}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-sm text-muted-foreground">{t('admin.tables.pagination.rows')}</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={value => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map(size => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="size-4" />
            <span className="sr-only">{t('admin.tables.pagination.firstPage')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">{t('admin.tables.pagination.previousPage')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">{t('admin.tables.pagination.nextPage')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="size-4" />
            <span className="sr-only">{t('admin.tables.pagination.lastPage')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
