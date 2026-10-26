import { useState } from 'react'

import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

import {
  useSendVerificationCode,
  useVerifyEmail,
  useResendCode,
  VerificationCodeType,
} from '@features/profile'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@shared/ui'

type EmailVerificationCardProps = {
  email: string
}

export function EmailVerificationCard({ email }: EmailVerificationCardProps) {
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')

  const sendCode = useSendVerificationCode({
    onSuccess: () => {
      setCodeSent(true)
      toast.success('Код отправлен на вашу почту')
    },
    onError: (err: { message?: string }) => toast.error(err.message || 'Не удалось отправить код'),
  })

  const verifyEmail = useVerifyEmail({
    onSuccess: () => toast.success('Почта подтверждена'),
    onError: (err: { message?: string }) => toast.error(err.message || 'Неверный код'),
  })

  const resendCode = useResendCode({
    onSuccess: () => toast.success('Код переотправлен'),
    onError: (err: { message?: string }) => toast.error(err.message || 'Не удалось переотправить'),
  })

  const handleSendCode = () => {
    sendCode.mutate({ email, type: VerificationCodeType.EMAIL_VERIFICATION })
  }

  const handleVerify = () => {
    const trimmed = code.trim()
    if (trimmed.length !== 6) {
      toast.error('Введите 6-значный код')
      return
    }
    verifyEmail.mutate({ email, code: trimmed })
  }

  const handleResend = () => {
    resendCode.mutate({ email, type: VerificationCodeType.EMAIL_VERIFICATION })
  }

  return (
    <Card className="border-warning/20 bg-warning-soft">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5 text-primary" />
          Подтверждение почты
        </CardTitle>
        <CardDescription>
          Ваша почта не подтверждена. Отправьте код на {email} и введите его ниже.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!codeSent ? (
          <Button onClick={handleSendCode} disabled={sendCode.isPending}>
            {sendCode.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Отправить код
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="6-значный код"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="max-w-[140px] font-mono text-center text-lg tracking-widest"
                disabled={verifyEmail.isPending}
              />
              <Button onClick={handleVerify} disabled={verifyEmail.isPending || code.length !== 6}>
                {verifyEmail.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Подтвердить
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resendCode.isPending}
              className="text-muted-foreground"
            >
              {resendCode.isPending ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
              Переотправить код
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
