import { createHash, randomBytes } from 'crypto';

/**
 * Personal PRIVATE-event invitation tokens. The raw token goes into the emailed
 * link as `?inviteCode=`; only its hash is stored (`EventInvitation.tokenHash`).
 * Public lookups and registration hash the incoming value and match the hash.
 */
export function generateEventInvitationToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString('hex');
  return { rawToken, tokenHash: hashEventInvitationToken(rawToken) };
}

export function hashEventInvitationToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
