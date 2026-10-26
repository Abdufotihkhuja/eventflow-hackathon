import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Ticket } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import { PUBLIC_SITE_URL } from '@api/config'
import {
  clearWorkspaceSelectionPending,
  getAccessToken,
  isWorkspaceSelectionPending,
  markWorkspaceSelectionPending,
  meService,
  type MyOrganizationsResponse,
} from '@api/index'
import { LoginForm, OrganizationSwitcher, useEnterWorkspace } from '@features/auth'
import type { UnifiedLoginResult } from '@features/auth'
import { ThemeToggle } from '@features/theme'
import { Button, Card, CardContent, CardDescription, CardHeader } from '@shared/ui'
import { LanguageSwitcher } from '@widgets/admin-layout'

type LoginView =
  | { kind: 'form' }
  | { kind: 'switcher'; memberships: MyOrganizationsResponse }
  | { kind: 'empty' }

function Shell({ children }: { children: React.ReactNode }) {
  const t = useT()

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src="/logo.svg" alt="EventFlow" className="h-10" />
          <p className="text-sm text-muted-foreground">{t('security.login.workspaceSubtitle')}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function LoginPage() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const enterWorkspace = useEnterWorkspace()
  const loginSearchParams = new URLSearchParams(location.search)
  const handoffEmail = loginSearchParams.get('email')?.trim() || undefined
  const isPublicLoginHandoff =
    loginSearchParams.get('source') === 'public-login' && !!handoffEmail

  // Deep link preserved by ProtectedRoute (state.from): after a successful
  // login we return there instead of /dashboard — this is how the /pricing →
  // /signup → cabinet plan handoff (P-7) reaches /settings/billing?intent=….
  // Only same-app absolute paths are honoured (no open-redirect via state).
  const stateFrom = (location.state as { from?: unknown } | null)?.from
  const redirectTarget =
    typeof stateFrom === 'string' && stateFrom.startsWith('/') && !stateFrom.startsWith('//')
      ? stateFrom
      : '/dashboard'

  const [view, setView] = useState<LoginView>({ kind: 'form' })
  // Resume the org-selection step after a page reload: a USER session that has
  // not yet entered a workspace persists a flag, so we restore the switcher/empty
  // state instead of showing the login form to someone who is already signed in.
  const [isResuming, setIsResuming] = useState(
    () => isWorkspaceSelectionPending() && !!getAccessToken()
  )

  // Маршрутизация USER-аккаунта по его членствам в организациях.
  const routeByMemberships = async (memberships: MyOrganizationsResponse) => {
    if (memberships.length === 0) {
      markWorkspaceSelectionPending()
      setView({ kind: 'empty' })
      return
    }

    if (memberships.length === 1) {
      try {
        await enterWorkspace.mutateAsync(memberships[0].organizationId)
        navigate(redirectTarget, { replace: true })
      } catch {
        // Не удалось войти в workspace — показываем переключатель как запасной вариант.
        markWorkspaceSelectionPending()
        setView({ kind: 'switcher', memberships })
      }
      return
    }

    markWorkspaceSelectionPending()
    setView({ kind: 'switcher', memberships })
  }

  const handleLoginSuccess = async (result: UnifiedLoginResult) => {
    // Владелец организации входит сразу в workspace.
    if (result.session.actorType === 'ORGANIZATION') {
      clearWorkspaceSelectionPending()
      navigate(redirectTarget, { replace: true })
      return
    }

    await routeByMemberships(result.memberships ?? [])
  }

  useEffect(() => {
    if (!isResuming) return
    let cancelled = false
    void (async () => {
      try {
        const memberships = await meService.getMyOrganizations()
        if (!cancelled) await routeByMemberships(memberships)
      } catch {
        // Не удалось восстановить выбор (токен истёк/сеть) — показываем форму входа.
        clearWorkspaceSelectionPending()
      } finally {
        if (!cancelled) setIsResuming(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isResuming) {
    return (
      <Shell>
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t('security.workspace.loading')}
          </CardContent>
        </Card>
      </Shell>
    )
  }

  if (view.kind === 'switcher') {
    return (
      <Shell>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              {t('security.workspace.chooseTitle')}
            </h1>
            <CardDescription>{t('security.workspace.chooseHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationSwitcher
              memberships={view.memberships}
              onEntered={() => navigate(redirectTarget, { replace: true })}
            />
          </CardContent>
        </Card>
      </Shell>
    )
  }

  if (view.kind === 'empty') {
    return (
      <Shell>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              {t('security.workspace.noneTitle')}
            </h1>
            <CardDescription>{t('security.workspace.noneHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-muted-foreground">
                  <Ticket className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t('security.workspace.acceptCardTitle')}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {t('security.workspace.acceptCardHint')}
                  </p>
                </div>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full">
              <a href={PUBLIC_SITE_URL}>
                <ExternalLink className="mr-2 size-4" />
                {t('security.workspace.openPublicProfile')}
              </a>
            </Button>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setView({ kind: 'form' })}
            >
              <ArrowLeft className="mr-2 size-4" />
              {t('security.workspace.backToLogin')}
            </Button>
          </CardContent>
        </Card>
      </Shell>
    )
  }

  return (
    <Shell>
      <Card>
        <CardHeader className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            {isPublicLoginHandoff
              ? t('security.login.organizationHandoffTitle')
              : t('security.login.welcomeTitle')}
          </h1>
          <CardDescription>
            {isPublicLoginHandoff
              ? t('security.login.organizationHandoffDescription')
              : t('security.login.welcomeDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            defaultEmail={handoffEmail}
            onSuccess={handleLoginSuccess}
            onForgotPassword={email => {
              const destination = new URL('/forgot-password', PUBLIC_SITE_URL)
              destination.searchParams.set('source', 'workspace')
              if (email.trim()) {
                destination.searchParams.set('email', email.trim())
              }
              window.location.assign(destination.toString())
            }}
          />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t('security.login.divider')}
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {t('security.login.noAccount')}{' '}
            <a
              href={`${PUBLIC_SITE_URL}/signup?type=organizer`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('security.login.registerOrganization')}
            </a>
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 space-y-2 text-center text-xs text-muted-foreground">
        <p>
          {t('security.login.termsPrefix')}{' '}
          <a
            href={`${PUBLIC_SITE_URL}/terms`}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {t('security.login.terms')}
          </a>{' '}
          {t('security.login.privacyConnector')}{' '}
          <a
            href={`${PUBLIC_SITE_URL}/privacy`}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {t('security.login.privacy')}
          </a>
        </p>
        <p className="text-muted-foreground/70">
          © {new Date().getFullYear()} EventFlow. {t('security.login.copyright')}
        </p>
      </div>
    </Shell>
  )
}

export default LoginPage
