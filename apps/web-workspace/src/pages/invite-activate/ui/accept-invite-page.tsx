import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  ShieldX,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'

import { clearAuthTokens } from '@api/config'
import { invitesService } from '@api/services'
import { markWorkspaceSelectionPending, type ApiError, type InvitePreview } from '@api/index'
import { LoginForm, useEnterWorkspace } from '@features/auth'
import type { UnifiedLoginResult } from '@features/auth'
import { useMeLogin } from '../lib/use-me-login'
import { useAcceptInvite } from '../lib/use-accept-invite'
import { Button, Card, Input, Label } from '@shared/ui'

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/

// Server-side domain error codes that have a dedicated localized message.
const INVITE_ERROR_CODES = new Set([
  'AUTH_REQUIRED',
  'WRONG_ACCOUNT',
  'INVITE_EXPIRED',
  'INVITE_REVOKED',
  'INVITE_ALREADY_ACCEPTED',
  'USER_ALREADY_ORGANIZATION_MEMBER',
  'PENDING_INVITE_ALREADY_EXISTS',
  'PASSWORD_REQUIRED_FOR_NEW_ACCOUNT',
  'OAUTH_EMAIL_MISMATCH',
])

function errorCodeOf(error: unknown): string | undefined {
  const details = (error as ApiError | undefined)?.details as { code?: string } | undefined
  return details?.code
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">{children}</Card>
    </div>
  )
}

function StatusCard({
  tone,
  icon: Icon,
  title,
  description,
  children,
}: {
  tone: 'success' | 'danger' | 'warning'
  icon: typeof CheckCircle2
  title: string
  description?: string
  children?: React.ReactNode
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-success text-success-foreground'
      : tone === 'warning'
        ? 'bg-warning-soft text-warning-soft-foreground'
        : 'bg-danger-soft text-danger-soft-foreground'

  return (
    <CenteredCard>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${toneClass}`}>
          <Icon className="h-9 w-9" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </div>
    </CenteredCard>
  )
}

export function AcceptInvitePage() {
  const t = useT()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const passwordHint = t('security.invite.passwordHint')

  // Maps a server error to a localized message: dedicated copy for known domain
  // codes, otherwise a generic "could not accept" fallback.
  const messageForError = (error: unknown): string => {
    const code = errorCodeOf(error)
    if (code && INVITE_ERROR_CODES.has(code)) {
      return t(`security.invite.errors.${code}`)
    }
    return (error as ApiError)?.message ?? t('security.invite.acceptFailed')
  }

  const enterWorkspace = useEnterWorkspace()
  const acceptInvite = useAcceptInvite()
  const meLogin = useMeLogin()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const inviteQuery = useQuery<InvitePreview, ApiError>({
    queryKey: ['invite', 'preview', token],
    queryFn: () => invitesService.getByToken(token as string),
    enabled: !!token,
    retry: false,
  })

  const isBusy =
    acceptInvite.isPending || meLogin.isPending || enterWorkspace.isPending

  // Завершающий шаг: войти в workspace и перейти в дашборд.
  const finishIntoWorkspace = async (organizationId: string) => {
    await enterWorkspace.mutateAsync(organizationId)
    toast.success(t('security.invite.accepted'))
    navigate('/dashboard', { replace: true })
  }

  // ACCEPT_INVITE / LOGIN_TO_ACCEPT (после входа): принять без пароля.
  const acceptAsAuthenticated = async () => {
    setSubmitError(null)
    try {
      const result = await acceptInvite.mutateAsync({ token: token as string })
      await finishIntoWorkspace(result.organizationId)
    } catch (error) {
      setSubmitError(messageForError(error))
    }
  }

  // SIGNUP_TO_ACCEPT: создать пароль → accept → login → enter workspace.
  const acceptAsNewUser = async () => {
    setPasswordError(null)
    setSubmitError(null)

    if (!PASSWORD_PATTERN.test(password)) {
      setPasswordError(passwordHint)
      return
    }

    const email = inviteQuery.data?.email
    if (!email) return

    try {
      const result = await acceptInvite.mutateAsync({ token: token as string, password })

      if (result.requiresLogin) {
        await meLogin.mutateAsync({ email, password })
        // Now holding a bare USER token; if entering the workspace below fails,
        // route guards must keep this session on /login rather than /dashboard.
        markWorkspaceSelectionPending()
      }

      await finishIntoWorkspace(result.organizationId)
    } catch (error) {
      setSubmitError(messageForError(error))
    }
  }

  // LOGIN_TO_ACCEPT: после успешного входа существующего пользователя — принять.
  const handleLoginSuccess = async (_result: UnifiedLoginResult) => {
    void _result
    // Existing user just signed in (USER token) but has not entered a workspace
    // yet — guard against a dangling session if accept/enter fails below.
    markWorkspaceSelectionPending()
    await acceptAsAuthenticated()
  }

  const handleLogout = () => {
    clearAuthTokens()
    // Возвращаемся на эту же страницу, чтобы войти под нужным аккаунтом.
    window.location.reload()
  }

  // ------- Рендер -------

  if (!token) {
    return (
      <StatusCard
        tone="warning"
        icon={XCircle}
        title={t('security.invite.missingTitle')}
        description={t('security.invite.missingDescription')}
      >
        <Button asChild variant="outline" className="mt-2">
          <Link to="/login">{t('security.invite.signIn')}</Link>
        </Button>
      </StatusCard>
    )
  }

  if (inviteQuery.isLoading) {
    return (
      <CenteredCard>
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">{t('security.invite.loading')}</p>
        </div>
      </CenteredCard>
    )
  }

  if (inviteQuery.isError) {
    const code = errorCodeOf(inviteQuery.error)
    const notFound = code === 'INVITE_NOT_FOUND' || (inviteQuery.error as ApiError)?.status === 404
    return (
      <StatusCard
        tone="danger"
        icon={XCircle}
        title={
          notFound
            ? t('security.invite.notFoundTitle')
            : t('security.invite.loadFailedTitle')
        }
        description={
          notFound
            ? t('security.invite.notFoundDescription')
            : ((inviteQuery.error as ApiError)?.message ??
              t('security.invite.loadFailedDescription'))
        }
      >
        <Button asChild variant="outline" className="mt-2">
          <Link to="/login">{t('security.invite.toLoginPage')}</Link>
        </Button>
      </StatusCard>
    )
  }

  const invite = inviteQuery.data
  const orgName = invite.organizationName

  switch (invite.nextAction) {
    case 'SIGNUP_TO_ACCEPT':
      return (
        <CenteredCard>
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {t('security.invite.joinTitle', { org: orgName })}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('security.invite.signupHint')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={invite.email} readOnly className="bg-muted text-muted-foreground" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-password">{t('security.invite.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="invite-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value)
                      if (passwordError) setPasswordError(null)
                    }}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{passwordHint}</p>
                {passwordError ? (
                  <p className="text-xs text-destructive">{passwordError}</p>
                ) : null}
              </div>

              {submitError ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5">
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              ) : null}

              <Button className="w-full" onClick={acceptAsNewUser} disabled={isBusy}>
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('security.invite.accept')}
              </Button>
            </div>
          </div>
        </CenteredCard>
      )

    case 'LOGIN_TO_ACCEPT':
      return (
        <CenteredCard>
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {t('security.invite.joinTitle', { org: orgName })}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('security.invite.loginHint')}
                </p>
              </div>
            </div>

            <LoginForm
              compact
              defaultEmail={invite.email}
              readOnlyEmail
              onSuccess={handleLoginSuccess}
            />

            {invite.authMethods.some(m => m === 'google' || m === 'linkedin') ? (
              <p className="text-center text-xs text-muted-foreground">
                {t('security.invite.oauthHint', {
                  provider: invite.authMethods
                    .filter(m => m !== 'password')
                    .map(m => (m === 'google' ? 'Google' : 'LinkedIn'))
                    .join(', '),
                })}
              </p>
            ) : null}

            {submitError ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            ) : null}

            <p className="text-center text-sm text-muted-foreground">
              <Link
                to={`/login`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('security.invite.openFullLogin')}
              </Link>
            </p>
          </div>
        </CenteredCard>
      )

    case 'ACCEPT_INVITE':
      return (
        <CenteredCard>
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {t('security.invite.joinTitle', { org: orgName })}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('security.invite.authenticatedHint', { email: invite.email })}
              </p>
            </div>

            {submitError ? (
              <div className="w-full rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            ) : null}

            <Button className="w-full" onClick={acceptAsAuthenticated} disabled={isBusy}>
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('security.invite.accept')}
            </Button>
          </div>
        </CenteredCard>
      )

    case 'WRONG_ACCOUNT':
      return (
        <StatusCard
          tone="warning"
          icon={AlertTriangle}
          title={t('security.invite.wrongAccountTitle')}
          description={t('security.invite.wrongAccountDescription', { email: invite.email })}
        >
          <Button className="mt-2 w-full" variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('security.invite.logoutAndSwitch')}
          </Button>
        </StatusCard>
      )

    case 'ALREADY_ACCEPTED':
      return (
        <StatusCard
          tone="success"
          icon={CheckCircle2}
          title={t('security.invite.alreadyAcceptedTitle')}
          description={t('security.invite.alreadyAcceptedDescription', { org: orgName })}
        >
          <div className="mt-2 flex w-full flex-col gap-2">
            <Button asChild className="w-full">
              <Link to="/dashboard">{t('security.invite.goToDashboard')}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">{t('security.invite.signIn')}</Link>
            </Button>
          </div>
        </StatusCard>
      )

    case 'EXPIRED':
      return (
        <StatusCard
          tone="danger"
          icon={ShieldX}
          title={t('security.invite.expiredTitle')}
          description={t('security.invite.expiredDescription', { org: orgName })}
        >
          <Button asChild variant="outline" className="mt-2">
            <Link to="/login">{t('security.invite.toLoginPage')}</Link>
          </Button>
        </StatusCard>
      )

    case 'REVOKED':
      return (
        <StatusCard
          tone="danger"
          icon={ShieldX}
          title={t('security.invite.revokedTitle')}
          description={t('security.invite.revokedDescription', { org: orgName })}
        >
          <Button asChild variant="outline" className="mt-2">
            <Link to="/login">{t('security.invite.toLoginPage')}</Link>
          </Button>
        </StatusCard>
      )

    default:
      return (
        <StatusCard
          tone="danger"
          icon={XCircle}
          title={t('security.invite.unknownTitle')}
          description={t('security.invite.unknownDescription')}
        >
          <Button asChild variant="outline" className="mt-2">
            <Link to="/login">{t('security.invite.toLoginPage')}</Link>
          </Button>
        </StatusCard>
      )
  }
}
