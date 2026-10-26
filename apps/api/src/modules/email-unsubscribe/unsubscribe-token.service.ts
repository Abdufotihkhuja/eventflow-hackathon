import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * The only email category a recipient can opt out of today.
 * Transactional mail is always delivered (its unsubscribe link opts the
 * recipient out of *notification* mail, never the transactional itself).
 */
export type UnsubscribeCategory = 'notification';

export const UNSUBSCRIBE_CATEGORIES: readonly UnsubscribeCategory[] = [
  'notification',
];

interface TokenPayload {
  /** recipient email */
  e: string;
  /** category */
  c: UnsubscribeCategory;
  /** issued-at, unix seconds (audit only — tokens do not expire) */
  t: number;
}

export type TokenVerifyResult =
  | { ok: true; email: string; category: UnsubscribeCategory }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'bad_payload' };

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

@Injectable()
export class UnsubscribeTokenService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>('mail.unsubscribeSecret') ?? '';
  }

  /**
   * Stateless HMAC-SHA256 token. Format: `<payloadB64url>.<sigB64url>`.
   * Tokens intentionally do not expire — an unsubscribe link must keep
   * working on an old email.
   */
  sign(email: string, category: UnsubscribeCategory): string {
    const payload: TokenPayload = {
      e: email.trim().toLowerCase(),
      c: category,
      t: Math.floor(Date.now() / 1000),
    };
    const payloadB64 = b64url(JSON.stringify(payload));
    const sig = b64url(
      createHmac('sha256', this.secret).update(payloadB64).digest(),
    );
    return `${payloadB64}.${sig}`;
  }

  verify(token: string): TokenVerifyResult {
    if (typeof token !== 'string' || !token.includes('.')) {
      return { ok: false, reason: 'malformed' };
    }
    const [payloadB64, sig] = token.split('.', 2);
    if (!payloadB64 || !sig) {
      return { ok: false, reason: 'malformed' };
    }

    const expected = b64url(
      createHmac('sha256', this.secret).update(payloadB64).digest(),
    );
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'bad_signature' };
    }

    let payload: TokenPayload;
    try {
      payload = JSON.parse(fromB64url(payloadB64).toString('utf8')) as TokenPayload;
    } catch {
      return { ok: false, reason: 'bad_payload' };
    }

    if (
      !payload ||
      typeof payload.e !== 'string' ||
      !UNSUBSCRIBE_CATEGORIES.includes(payload.c)
    ) {
      return { ok: false, reason: 'bad_payload' };
    }

    return { ok: true, email: payload.e, category: payload.c };
  }
}
