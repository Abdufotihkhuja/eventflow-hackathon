import { ConfigService } from '@nestjs/config';
import { TicketQrService } from './ticket-qr.service';

function buildService(): TicketQrService {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'TICKET_QR_SECRET')
        return 'unit-test-secret-with-enough-entropy-for-hmac';
      if (key === 'NODE_ENV') return 'test';
      return undefined;
    }),
  } as unknown as ConfigService;
  const service = new TicketQrService(configService);
  service.onModuleInit();
  return service;
}

describe('TicketQrService', () => {
  const reg = { id: '11111111-1111-4111-8111-111111111111', qrCode: 'uuid-x', qrPayloadVersion: 1 };

  it('round-trips encode → verify and recovers registrationId + version', () => {
    const service = buildService();
    const payload = service.encodeQrPayload(reg);
    expect(payload.startsWith('v2.')).toBe(true);
    const result = service.verifyQrPayload(payload);
    expect(result).toMatchObject({
      kind: 'v2',
      registrationId: reg.id,
      version: 1,
    });
  });

  it('returns kind=legacy for raw UUID payloads', () => {
    const service = buildService();
    const result = service.verifyQrPayload('11111111-2222-3333-4444-555555555555');
    expect(result).toEqual({
      kind: 'legacy',
      qrCode: '11111111-2222-3333-4444-555555555555',
    });
  });

  it('rejects tampered signature', () => {
    const service = buildService();
    const payload = service.encodeQrPayload(reg);
    const [prefix, body, sig] = payload.split('.');
    // Меняем ПЕРВЫЙ символ подписи: все его 6 бит значимы при декодировании.
    // Последний символ 43-символьной base64url-подписи несёт 2 хвостовых бита,
    // которые decode игнорирует, — замена там не всегда меняет байты (флаки).
    const tampered = `${prefix}.${body}.${sig[0] === 'A' ? 'B' : 'A'}${sig.slice(1)}`;
    const result = service.verifyQrPayload(tampered);
    expect(result).toEqual({ kind: 'invalid', reason: 'signature mismatch' });
  });

  it('rejects malformed v2 payloads', () => {
    const service = buildService();
    const result = service.verifyQrPayload('v2.broken');
    expect(result).toEqual({ kind: 'invalid', reason: 'malformed v2 payload' });
  });

  it('rejects empty payload', () => {
    const service = buildService();
    expect(service.verifyQrPayload('')).toEqual({
      kind: 'invalid',
      reason: 'empty payload',
    });
  });

  describe('URL-wrapped payloads (badge/ticket QR, hardware scanners type the full URL)', () => {
    it('unwraps a check-in URL carrying a v2 signed payload', () => {
      const service = buildService();
      const payload = service.encodeQrPayload(reg);
      const url = `https://app.eventflow.uz/check-in?code=${encodeURIComponent(payload)}`;
      expect(service.verifyQrPayload(url)).toMatchObject({
        kind: 'v2',
        registrationId: reg.id,
        version: 1,
      });
    });

    it('unwraps a check-in URL carrying a raw uuid (already printed badges) as legacy', () => {
      const service = buildService();
      const result = service.verifyQrPayload(
        'https://app.eventflow.uz/check-in?code=11111111-2222-3333-4444-555555555555',
      );
      expect(result).toEqual({
        kind: 'legacy',
        qrCode: '11111111-2222-3333-4444-555555555555',
      });
    });

    it('keeps the original string when the URL has no code param', () => {
      const service = buildService();
      const url = 'https://app.eventflow.uz/check-in?eventId=abc';
      expect(service.verifyQrPayload(url)).toEqual({
        kind: 'legacy',
        qrCode: url,
      });
    });

    it('keeps the original string for unparseable URL-looking input', () => {
      const service = buildService();
      expect(service.verifyQrPayload('https://')).toEqual({
        kind: 'legacy',
        qrCode: 'https://',
      });
    });

    it('leaves plain (non-URL) payloads untouched', () => {
      const service = buildService();
      const payload = service.encodeQrPayload(reg);
      expect(service.verifyQrPayload(payload)).toMatchObject({ kind: 'v2' });
      expect(service.verifyQrPayload('plain-uuid')).toEqual({
        kind: 'legacy',
        qrCode: 'plain-uuid',
      });
    });
  });

  it('throws at boot in production when secret is missing', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'TICKET_QR_SECRET') return undefined;
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      }),
    } as unknown as ConfigService;
    const service = new TicketQrService(configService);
    expect(() => service.onModuleInit()).toThrow(/TICKET_QR_SECRET/);
  });
});
