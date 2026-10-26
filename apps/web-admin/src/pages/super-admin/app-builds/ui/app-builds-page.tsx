/**
 * Super Admin — сборки мобильного приложения для тестирования командой
 * API: GET/POST/DELETE /api/v1/super-admin/app-builds
 */

import { useMemo, useState } from 'react'
import { Info, Upload } from 'lucide-react'
import { useLocale, useT } from '@eventflow/i18n/react'

import { useAppBuilds } from '@features/super-admin'
import { Button, DataTable, ErrorState } from '@shared/ui'

import { createAppBuildsColumns } from './app-builds-columns'
import { AppBuildUploadDialog } from './app-build-upload-dialog'

export default function SuperAdminAppBuildsPage() {
  const t = useT()
  const locale = useLocale()
  const [uploadOpen, setUploadOpen] = useState(false)

  const { data, isLoading, error, refetch } = useAppBuilds()

  const columns = useMemo(() => createAppBuildsColumns({ t, locale }), [t, locale])

  return (
    <div className="space-y-6">
      {error && (
        <ErrorState
          title={t('admin.errors.loadFailed')}
          onRetry={() => refetch()}
          retryLabel={t('admin.errors.retry')}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t('admin.appBuilds.pageHint')}
        </p>
        <Button onClick={() => setUploadOpen(true)} size="sm" className="shrink-0">
          <Upload className="mr-1.5 size-4" aria-hidden="true" />
          {t('admin.appBuilds.uploadTitle')}
        </Button>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{t('admin.appBuilds.iosHint')}</span>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        emptyText={t('admin.appBuilds.empty')}
      />

      <AppBuildUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  )
}
