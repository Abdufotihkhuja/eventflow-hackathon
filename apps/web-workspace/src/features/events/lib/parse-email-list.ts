import { z } from 'zod'

const emailSchema = z.string().email()

export function isEmail(value: string): boolean {
  return emailSchema.safeParse(value).success
}

/** Max addresses per send; mirrors MAX_INVITATIONS_PER_REQUEST in the API. */
export const MAX_INVITATION_EMAILS = 50

/**
 * Splits pasted or typed text into normalized, de-duplicated email chips.
 * Separators: comma, semicolon, whitespace. Invalid entries are kept (check
 * them with `isEmail`) so the organizer can fix them instead of losing them.
 *
 * `existing` chips are skipped, so appending a paste never duplicates.
 */
export function parseEmailList(text: string, existing: readonly string[] = []): string[] {
  const seen = new Set(existing)
  const result: string[] = []
  for (const raw of text.split(/[\s,;]+/)) {
    const email = raw.trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    result.push(email)
  }
  return result
}
