import { Download, FileText, Loader2, Palette, Ticket } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { type TicketDesign } from '@api/services'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui'

type TicketDownloadMenuProps = {
  onDownload: (design: TicketDesign) => void
  isLoading?: boolean
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
}

/**
 * Компонент выпадающего меню для скачивания билета участника
 * Позволяет выбрать дизайн: фирменный (branded) или простой (simple)
 */
export function TicketDownloadMenu({
  onDownload,
  isLoading = false,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}: TicketDownloadMenuProps) {
  const t = useT()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isLoading}
          className="gap-1.5"
          title={!showLabel ? t('events.tickets.singleButtonTitle') : undefined}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
          {showLabel && <span>{t('events.tickets.singleButtonLabel')}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Download className="h-4 w-4 text-muted-foreground" />
          {t('events.tickets.singleMenuTitle')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDownload('branded')}
          disabled={isLoading}
          className="flex flex-col items-start gap-1 py-3"
        >
          <div className="flex items-center gap-2 font-medium">
            <Palette className="h-4 w-4 text-brand-secondary" />
            <span>{t('events.tickets.brandedTitle')}</span>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {t('events.tickets.brandedDescription')}
          </p>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDownload('simple')}
          disabled={isLoading}
          className="flex flex-col items-start gap-1 py-3"
        >
          <div className="flex items-center gap-2 font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{t('events.tickets.simpleTitle')}</span>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {t('events.tickets.simpleDescription')}
          </p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type BulkTicketDownloadMenuProps = {
  onDownloadAll: (design: TicketDesign) => void
  isLoading?: boolean
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  /** Количество билетов для скачивания (для отображения в UI) */
  ticketsCount?: number
}

/**
 * Компонент для массового скачивания всех билетов в ZIP-архиве
 */
export function BulkTicketDownloadMenu({
  onDownloadAll,
  isLoading = false,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  ticketsCount,
}: BulkTicketDownloadMenuProps) {
  const t = useT()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isLoading}
          className="gap-1.5"
          title={t('events.tickets.bulkButtonTitle')}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>{t('events.tickets.bulkButtonLabel')}</span>
          {ticketsCount !== undefined && ticketsCount > 0 && (
            <span className="ml-1 rounded-full bg-brand-secondary/10 px-1.5 py-0.5 text-xs font-medium text-brand-secondary">
              {ticketsCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-muted-foreground" />
          {t('events.tickets.bulkMenuTitle')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDownloadAll('branded')}
          disabled={isLoading}
          className="flex flex-col items-start gap-1 py-3"
        >
          <div className="flex items-center gap-2 font-medium">
            <Palette className="h-4 w-4 text-brand-secondary" />
            <span>{t('events.tickets.brandedTitle')}</span>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {t('events.tickets.bulkBrandedDescription')}
          </p>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDownloadAll('simple')}
          disabled={isLoading}
          className="flex flex-col items-start gap-1 py-3"
        >
          <div className="flex items-center gap-2 font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{t('events.tickets.simpleTitle')}</span>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {t('events.tickets.bulkSimpleDescription')}
          </p>
        </DropdownMenuItem>
        {isLoading && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs text-muted-foreground text-center">
              <Loader2 className="h-3 w-3 animate-spin inline mr-1.5" />
              {t('events.tickets.bulkLoading')}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
