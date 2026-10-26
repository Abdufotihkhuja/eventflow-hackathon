import type { Registration } from '@api/services/registration.types'

const PHONE_QUESTION_RE = /\b(phone|telephone)\b|телефон|telefon/i
const MIN_PHONE_DIGITS = 5

function normalizePhoneAnswer(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  const digitCount = trimmed.match(/\d/g)?.length ?? 0
  return digitCount >= MIN_PHONE_DIGITS ? trimmed : undefined
}

export function getRegistrationPhone(
  registration: Pick<Registration, 'user' | 'answers'>
): string | undefined {
  const profilePhone = normalizePhoneAnswer(registration.user.phone)
  if (profilePhone) return profilePhone

  const phoneAnswer = registration.answers?.find(answer => {
    const question = answer.question?.question?.trim()
    return question ? PHONE_QUESTION_RE.test(question) : false
  })

  return normalizePhoneAnswer(phoneAnswer?.answer)
}
