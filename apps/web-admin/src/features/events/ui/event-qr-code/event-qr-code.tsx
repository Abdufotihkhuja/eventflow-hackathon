/**
 * Модалка «QR-код для входа» — QR «один для всех» (docs/CHECK_IN_FRONTEND.md).
 * Данные с API GET /events/:eventId/attendance/check-in-landing-qr.
 * Ссылка в QR ведёт на публичный сайт: eventflow.uz/check-in?eventId=...
 */

import { useState } from 'react'
import { Download, Loader2, QrCode } from 'lucide-react'

import { PUBLIC_SITE_URL } from '@api/config'
import { useCheckInLandingQrQuery } from '@features/events'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Button } from '@shared/ui'

type EventQrCodeDialogProps = {
  eventId: string
  eventTitle: string
}

/** Публичная ссылка для чекина участниками (в QR и в подписи) */
function getCheckInLandingUrl(eventId: string): string {
  const base = PUBLIC_SITE_URL.replace(/\/$/, '')
  return `${base}/check-in?eventId=${eventId}`
}

export function EventQrCodeDialog({ eventId, eventTitle }: EventQrCodeDialogProps) {
  const [open, setOpen] = useState(false)

  const { data, isLoading, isError, error } = useCheckInLandingQrQuery(eventId, { enabled: open })

  const landingUrl = getCheckInLandingUrl(eventId)

  const handleDownload = () => {
    if (!data?.qrCode) return
    const link = document.createElement('a')
    link.href = data.qrCode
    link.download = `qr-check-in-${eventId}.png`
    link.click()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" />
          QR-код
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-md overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-brand-secondary" />
            <DialogTitle>QR-код для входа</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Загрузка QR-кода...</p>
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">
                {error?.message ?? 'Не удалось загрузить QR-код. Попробуйте позже.'}
              </p>
            </div>
          )}

          {data?.qrCode && (
            <>
              <div className="flex justify-center rounded-lg border border-border bg-white p-4 sm:p-8">
                <img
                  src={data.qrCode}
                  alt={`QR-код для входа на ${eventTitle}`}
                  className="h-auto max-h-[256px] w-full max-w-[256px]"
                />
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="mb-2 text-sm font-medium text-foreground">
                  Как использовать:
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground dark:text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-secondary">•</span>
                    <span>Гости сканируют QR-код при входе на мероприятие</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-secondary">•</span>
                    <span>Система автоматически отметит их присутствие</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-secondary">•</span>
                    <span>Участнику нужен вход в свой аккаунт EVENTFLOW</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-secondary">•</span>
                    <span>Скачайте и распечатайте для размещения на входе</span>
                  </li>
                </ul>
              </div>

              <div className="rounded border border-border bg-muted/50 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Ссылка:
                </p>
                <p className="break-all font-mono text-xs text-muted-foreground dark:text-muted-foreground">
                  {landingUrl}
                </p>
              </div>

              <Button onClick={handleDownload} className="w-full gap-2">
                <Download className="h-4 w-4" />
                Скачать QR-код
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
