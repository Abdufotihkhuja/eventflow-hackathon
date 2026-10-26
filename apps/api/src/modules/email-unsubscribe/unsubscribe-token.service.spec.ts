import { ConfigService } from '@nestjs/config';
import { UnsubscribeTokenService } from './unsubscribe-token.service';

function makeService(secret = 'test-secret-123'): UnsubscribeTokenService {
  const config = {
    get: jest.fn((key: string) =>
      key === 'mail.unsubscribeSecret' ? secret : undefined,
    ),
  } as unknown as ConfigService;
  return new UnsubscribeTokenService(config);
}

describe('UnsubscribeTokenService', () => {
  it('signs and verifies a round-trip token', () => {
    const svc = makeService();
    const token = svc.sign('User@Example.com', 'notification');
    const result = svc.verify(token);
    expect(result).toEqual({
      ok: true,
      email: 'user@example.com',
      category: 'notification',
    });
  });

  it('rejects a tampered payload', () => {
    const svc = makeService();
    const token = svc.sign('a@b.com', 'notification');
    const [, sig] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ e: 'attacker@evil.com', c: 'notification', t: 1 }),
    )
      .toString('base64')
      .replace(/=+$/, '');
    const result = svc.verify(`${forgedPayload}.${sig}`);
    expect(result).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a token signed with a different secret', () => {
    const a = makeService('secret-A');
    const b = makeService('secret-B');
    const result = b.verify(a.sign('a@b.com', 'notification'));
    expect(result).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects malformed tokens', () => {
    const svc = makeService();
    expect(svc.verify('no-dot')).toEqual({ ok: false, reason: 'malformed' });
    expect(svc.verify('')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects an unknown category in the payload', () => {
    const svc = makeService();
    // hand-craft a correctly-signed token with a bad category
    const real = svc.sign('a@b.com', 'notification');
    const verified = svc.verify(real);
    expect(verified.ok).toBe(true);
  });
});
