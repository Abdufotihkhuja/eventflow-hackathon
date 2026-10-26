import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

const PAYLOAD_PREFIX = 'v2.';
const PAYLOAD_SEPARATOR = '.';

export interface QrSourceRegistration {
  id: string;
  qrCode: string | null;
  qrPayloadVersion: number;
}

export type QrVerifyResult =
  | { kind: 'v2'; registrationId: string; version: number; issuedAt: number }
  | { kind: 'legacy'; qrCode: string }
  | { kind: 'invalid'; reason: string };

interface SignedPayloadBody {
  rid: string; // registration id
  ver: number; // qrPayloadVersion at issuing time
  iat: number; // unix seconds at issuing time
}

/**
 * Encodes registration into a signed QR payload (`v2.<base64url(body)>.<base64url(hmac)>`)
 * and verifies incoming QR scans, with backwards-compatible fallback to raw UUID lookup.
 *
 * Per-row `qrPayloadVersion` enables single-ticket revocation without rotating the global secret.
 */
@Injectable()
export class TicketQrService implements OnModuleInit {
  private readonly logger = new Logger(TicketQrService.name);
  private secret = '';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const value = this.configService.get<string>('TICKET_QR_SECRET');
    if (!value || value.trim().length < 16) {
      const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
      if (nodeEnv === 'production') {
        throw new Error(
          'TICKET_QR_SECRET must be set to a strong random value (>= 16 chars) in production',
        );
      }
      this.logger.warn(
        'TICKET_QR_SECRET is not configured — using ephemeral dev secret. QR-codes will not survive restarts.',
      );
      this.secret = 'dev-ticket-qr-secret-rotate-me-please-32+';
      return;
    }
    this.secret = value;
  }

  encodeQrPayload(reg: QrSourceRegistration): string {
    const body: SignedPayloadBody = {
      rid: reg.id,
      ver: reg.qrPayloadVersion,
      iat: Math.floor(Date.now() / 1000),
    };
    const bodyB64 = this.base64UrlEncode(Buffer.from(JSON.stringify(body), 'utf8'));
    const sigB64 = this.base64UrlEncode(this.sign(bodyB64));
    return `${PAYLOAD_PREFIX}${bodyB64}${PAYLOAD_SEPARATOR}${sigB64}`;
  }

  verifyQrPayload(payload: string): QrVerifyResult {
    if (!payload || typeof payload !== 'string') {
      return { kind: 'invalid', reason: 'empty payload' };
    }

    payload = this.unwrapCheckInUrl(payload);

    if (!payload.startsWith(PAYLOAD_PREFIX)) {
      // Legacy raw UUID — let caller look up by Registration.qrCode.
      return { kind: 'legacy', qrCode: payload };
    }

    const rest = payload.slice(PAYLOAD_PREFIX.length);
    const parts = rest.split(PAYLOAD_SEPARATOR);
    if (parts.length !== 2) {
      return { kind: 'invalid', reason: 'malformed v2 payload' };
    }

    const [bodyB64, sigB64] = parts;
    let providedSig: Buffer;
    try {
      providedSig = this.base64UrlDecode(sigB64);
    } catch {
      return { kind: 'invalid', reason: 'malformed signature' };
    }

    const expectedSig = this.sign(bodyB64);
    if (
      providedSig.length !== expectedSig.length ||
      !timingSafeEqual(providedSig, expectedSig)
    ) {
      return { kind: 'invalid', reason: 'signature mismatch' };
    }

    let body: SignedPayloadBody;
    try {
      const decoded = this.base64UrlDecode(bodyB64).toString('utf8');
      body = JSON.parse(decoded) as SignedPayloadBody;
    } catch {
      return { kind: 'invalid', reason: 'malformed body' };
    }

    if (
      typeof body.rid !== 'string' ||
      typeof body.ver !== 'number' ||
      typeof body.iat !== 'number'
    ) {
      return { kind: 'invalid', reason: 'invalid body shape' };
    }

    return {
      kind: 'v2',
      registrationId: body.rid,
      version: body.ver,
      issuedAt: body.iat,
    };
  }

  /**
   * Разворачивает payload, завёрнутый в URL страницы check-in.
   *
   * QR билетов и бейджей кодируют не «голый» payload, а ссылку вида
   * `https://…/check-in?code=<payload>` (чтобы обычная камера телефона вела
   * на страницу check-in). Аппаратные сканеры работают как клавиатура и
   * «печатают» весь URL в поле ручного ввода — поэтому принимаем и полный URL,
   * извлекая из него параметр `code` (percent-декодирование делает URL API).
   * Это же чинит уже напечатанные бейджи со старым форматом
   * `…/check-in?code=<raw uuid>`: uuid уходит в legacy-ветку поиска по qrCode.
   */
  private unwrapCheckInUrl(payload: string): string {
    if (!/^https?:\/\//i.test(payload)) {
      return payload;
    }
    try {
      const code = new URL(payload).searchParams.get('code');
      return code && code.trim().length > 0 ? code : payload;
    } catch {
      // Строка лишь похожа на URL — оставляем как есть, дальше обычная классификация.
      return payload;
    }
  }

  private sign(bodyB64: string): Buffer {
    return createHmac('sha256', this.secret).update(bodyB64).digest();
  }

  private base64UrlEncode(buf: Buffer): string {
    return buf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private base64UrlDecode(input: string): Buffer {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    return Buffer.from(padded + '='.repeat(padLen), 'base64');
  }
}
