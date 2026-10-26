/**
 * DataTablePagination — пагинация для DataTable
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { Table } from '@tanstack/react-table'

import { Button } from '../shadcn/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../shadcn/select'
import { useT } from '@eventflow/i18n/react'

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
            {table.getFilteredSelectedRowModel().rows.length} {t('common.of')}{' '}
            {table.getFilteredRowModel().rows.length} {t('tables.selected')}
          </>
        ) : (
          <>
            {t('common.page')} {table.getState().pagination.pageIndex + 1} {t('common.of')}{' '}
            {table.getPageCount() || 1}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-sm text-muted-foreground">{t('common.rows')}:</span>
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
            <span className="sr-only">{t('common.firstPage')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">{t('common.previousPage')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">{t('common.nextPage')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="size-4" />
            <span className="sr-only">{t('common.lastPage')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
