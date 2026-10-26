import { useT } from '@eventflow/i18n/react'

export function HomePage() {
  const t = useT()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">{t('workspace.layout.home.title')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('workspace.layout.home.description')}</p>
      </div>
    </div>
  )
}

export default HomePage
