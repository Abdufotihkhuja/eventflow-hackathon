import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useT } from '@eventflow/i18n/react'

import type { SpeakerInvitation } from '@api/services'
import { LoginForm } from '@features/auth'
import { Button, Input, Label } from '@shared/ui'

import { useSpeakerSignup } from '../lib/use-speaker-signup'

// Совпадает с RegisterUserDto на бэкенде: спецсимвол только из этого набора.
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

type InvitationAuthGateProps = {
  invitation: SpeakerInvitation
  /** Вызывается после появления валидной USER-сессии. */
  onAuthenticated: () => void
}

/**
 * Вход или регистрация на публичной странице приглашения спикера.
 *
 * Принять и отклонить приглашение может только аккаунт участника с тем email,
 * на который пришло письмо, поэтому email здесь всегда только для чтения.
 * Ветка выбирается по `userExists` из ответа приглашения.
 */
export function InvitationAuthGate({ invitation, onAuthenticated }: InvitationAuthGateProps) {
  const t = useT()
  const signup = useSpeakerSignup()

  const [firstName, setFirstName] = useState(invitation.firstName)
  const [lastName, setLastName] = useState(invitation.lastName)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const email = invitation.invitedEmail ?? ''

  if (invitation.userExists) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('events.speakerInvitations.signInTitle')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('events.speakerInvitations.signInHint', { email })}
          </p>
        </div>
        <LoginForm compact defaultEmail={email} readOnlyEmail onSuccess={onAuthenticated} />
      </div>
    )
  }

  const handleSignup = async () => {
    setFormError(null)

    if (!firstName.trim() || !lastName.trim()) {
      setFormError(t('validation.required'))
      return
    }

    if (!PASSWORD_PATTERN.test(password)) {
      setFormError(t('events.speakerInvitations.passwordHint'))
      return
    }

    if (password !== passwordConfirm) {
      setFormError(t('events.speakerInvitations.passwordMismatch'))
      return
    }

    try {
      await signup.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password,
        passwordConfirm,
      })
      onAuthenticated()
    } catch (error) {
      setFormError(
        (error as { message?: string })?.message ??
          t('events.speakerInvitations.signUpFailed')
      )
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {t('events.speakerInvitations.signUpTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('events.speakerInvitations.signUpHint', { email })}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invitation-email">{t('events.speakerInvitations.emailLabel')}</Label>
        <Input
          id="invitation-email"
          value={email}
          readOnly
          className="bg-muted text-muted-foreground"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="invitation-first-name">
            {t('events.speakerInvitations.firstNameLabel')}
          </Label>
          <Input
            id="invitation-first-name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invitation-last-name">
            {t('events.speakerInvitations.lastNameLabel')}
          </Label>
          <Input
            id="invitation-last-name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invitation-password">
          {t('events.speakerInvitations.passwordLabel')}
        </Label>
        <div className="relative">
          <Input
            id="invitation-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
        <p className="text-xs text-muted-foreground">
          {t('events.speakerInvitations.passwordHint')}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invitation-password-confirm">
          {t('events.speakerInvitations.passwordConfirmLabel')}
        </Label>
        <Input
          id="invitation-password-confirm"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={e => setPasswordConfirm(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {formError ? (
        <div className="rounded-lg border border-danger-soft bg-danger-soft p-3">
          <p className="text-sm font-medium text-danger-soft-foreground">{formError}</p>
        </div>
      ) : null}

      <Button className="h-12 w-full text-base" onClick={handleSignup} disabled={signup.isPending}>
        {signup.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
        {t('events.speakerInvitations.signUpSubmit')}
      </Button>
    </div>
  )
}
