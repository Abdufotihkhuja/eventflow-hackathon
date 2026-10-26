import { Button } from './shadcn/button'

type PaginationBarProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  summary?: string
  previousLabel?: string
  nextLabel?: string
  className?: string
}

/**
 * Single-source pagination control. Replaces the per-page hand-rolled
 * "back/next" rows that appear across pages.
 */
export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  summary,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  className,
}: PaginationBarProps) {
  if (totalPages <= 1 && !summary) return null

  return (
    <div
      className={
        'flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between' +
        (className ? ` ${className}` : '')
      }
    >
      {summary ? (
        <p className="text-xs text-muted-foreground">{summary}</p>
      ) : (
        <span aria-hidden="true" />
      )}
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            {previousLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            {nextLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
