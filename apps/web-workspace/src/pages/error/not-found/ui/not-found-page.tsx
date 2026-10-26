import { Button } from '@shared/ui'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        Страница не найдена. Возможно, ссылка устарела или была удалена.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Вернуться на главную</Link>
      </Button>
    </div>
  )
}

export default NotFoundPage
