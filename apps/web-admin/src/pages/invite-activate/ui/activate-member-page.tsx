import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { useActivateMember } from '@features/users/api'
import { Button, Card } from '@shared/ui'

export function ActivateMemberPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const activate = useActivateMember()
  const triggeredRef = useRef(false)

  useEffect(() => {
    if (!token || triggeredRef.current) return
    triggeredRef.current = true
    activate.mutate(token)
  }, [token, activate])

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-soft">
              <XCircle className="h-10 w-10 text-warning-soft-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ссылка недействительна</h1>
              <p className="mt-2 text-muted-foreground">
                Токен активации не указан. Используйте ссылку из письма приглашения.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/login">Войти</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (activate.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Активация учётной записи...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (activate.isError) {
    const message =
      activate.error instanceof Error
        ? activate.error.message
        : ((activate.error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Не удалось активировать учётную запись')
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft">
              <XCircle className="h-10 w-10 text-danger-soft-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ошибка активации</h1>
              <p className="mt-2 text-muted-foreground">{message}</p>
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/login">На страницу входа</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (activate.isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success">
              <CheckCircle2 className="h-12 w-12 text-success-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Учётная запись активирована</h1>
              <p className="mt-3 text-lg text-muted-foreground">
                Теперь вы можете войти в систему и пользоваться платформой.
              </p>
            </div>
            <Button asChild className="mt-6 w-full">
              <Link to="/login">Войти</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return null
}
