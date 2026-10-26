import { useNavigate } from 'react-router-dom'

import { PUBLIC_SITE_URL } from '@api/config'
import { LoginForm } from '@features/auth'
import { ThemeToggle } from '@features/theme'
import { Card, CardContent, CardDescription, CardHeader } from '@shared/ui'

export function LoginPage() {
  const navigate = useNavigate()

  const handleOrganizationSuccess = () => {
    navigate('/dashboard', { replace: true })
  }

  const handleMemberSuccess = () => {
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Переключатель темы */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Логотип и бренд */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src="/logo.svg" alt="EventFlow" className="h-12" />
          <p className="text-sm font-medium text-muted-foreground">
            Платформа для организаторов мероприятий
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-2 pb-4 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Добро пожаловать</h1>
            <CardDescription className="text-base">
              Войдите в ваш аккаунт для управления мероприятиями
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <LoginForm
              onOrganizationSuccess={handleOrganizationSuccess}
              onMemberSuccess={handleMemberSuccess}
            />

            {/* Разделитель */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">или</span>
              </div>
            </div>

            {/* Ссылка на регистрацию */}
            <p className="text-center text-sm text-muted-foreground">
              Ещё нет аккаунта?{' '}
              <a
                href={`${PUBLIC_SITE_URL}/signup`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Зарегистрировать организацию
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Футер */}
        <div className="mt-8 space-y-2 text-center text-xs text-muted-foreground">
          <p>
            Войдя в систему, вы соглашаетесь с{' '}
            <a
              href={`${PUBLIC_SITE_URL}/terms`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              условиями использования
            </a>{' '}
            и{' '}
            <a
              href={`${PUBLIC_SITE_URL}/privacy`}
              className="underline underline-offset-2 hover:text-foreground"
            >
              политикой конфиденциальности
            </a>
          </p>
          <p className="text-muted-foreground/70">
            © {new Date().getFullYear()} EventFlow. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
