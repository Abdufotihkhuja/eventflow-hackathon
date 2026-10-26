import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { Button } from '@shared/ui'

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[Object]'
    }
  }
  return String(value)
}

export function ErrorPage() {
  const error = useRouteError()

  let title = 'Что-то пошло не так'
  let description = 'Мы уже работаем над устранением проблемы.'

  if (isRouteErrorResponse(error)) {
    const status = typeof error.status === 'number' ? error.status : ''
    const statusText = typeof error.statusText === 'string' ? error.statusText : ''
    title = status ? `${status} — ${statusText}` : 'Ошибка'
    
    const message = error.data?.message
    if (typeof message === 'string') {
      description = message
    } else if (message && typeof message === 'object') {
      description = safeStringify(message)
    }
  } else if (error instanceof Error) {
    description = error.message || description
  }

  const reloadHref = typeof window !== 'undefined' ? window.location.pathname : '/'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">{description}</p>
      <Button asChild className="mt-6">
        <a href={reloadHref}>Попробовать снова</a>
      </Button>
    </div>
  )
}

export default ErrorPage
