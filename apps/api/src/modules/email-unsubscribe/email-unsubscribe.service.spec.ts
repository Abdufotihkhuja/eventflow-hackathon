import { ConfigService } from '@nestjs/config';
import { EmailUnsubscribeService } from './email-unsubscribe.service';
import { UnsubscribeTokenService } from './unsubscribe-token.service';

function makeTokens(): UnsubscribeTokenService {
  const config = {
    get: jest.fn(() => 'spec-secret'),
  } as unknown as ConfigService;
  return new UnsubscribeTokenService(config);
}

function makePrisma() {
  return {
    emailUnsubscribe: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
}

describe('EmailUnsubscribeService', () => {
  it('isSuppressed reflects the suppression row', async () => {
    const prisma = makePrisma();
    const svc = new EmailUnsubscribeService(prisma as never, makeTokens());

    prisma.emailUnsubscribe.findUnique.mockResolvedValueOnce(null);
    expect(await svc.isSuppressed('a@b.com', 'notification')).toBe(false);

    prisma.emailUnsubscribe.findUnique.mockResolvedValueOnce({ id: '1' });
    expect(await svc.isSuppressed('a@b.com', 'notification')).toBe(true);
  });

  it('unsubscribeByToken creates a suppression row (idempotent)', async () => {
    const prisma = makePrisma();
    const tokens = makeTokens();
    const svc = new EmailUnsubscribeService(prisma as never, tokens);
    const token = tokens.sign('User@B.com', 'notification');

    prisma.emailUnsubscribe.findUnique.mockResolvedValueOnce(null);
    prisma.emailUnsubscribe.create.mockResolvedValueOnce({ id: '1' });
    const first = await svc.unsubscribeByToken(token);
    expect(first).toEqual({
      status: 'unsubscribed',
      email: 'user@b.com',
      category: 'notification',
    });
    expect(prisma.emailUnsubscribe.create).toHaveBeenCalledWith({
      data: { email: 'user@b.com', category: 'notification' },
    });

    prisma.emailUnsubscribe.findUnique.mockResolvedValueOnce({ id: '1' });
    const second = await svc.unsubscribeByToken(token);
    expect(second.status).toBe('already');
  });

  it('rejects an invalid token', async () => {
    const prisma = makePrisma();
    const svc = new EmailUnsubscribeService(prisma as never, makeTokens());
    const result = await svc.unsubscribeByToken('garbage');
    expect(result).toEqual({ status: 'invalid_token' });
    expect(prisma.emailUnsubscribe.create).not.toHaveBeenCalled();
  });

  it('statusByToken returns validity + state', async () => {
    const prisma = makePrisma();
    const tokens = makeTokens();
    const svc = new EmailUnsubscribeService(prisma as never, tokens);

    expect(await svc.statusByToken('bad')).toEqual({ valid: false });

    const token = tokens.sign('a@b.com', 'notification');
    prisma.emailUnsubscribe.findUnique.mockResolvedValueOnce(null);
    expect(await svc.statusByToken(token)).toEqual({
      valid: true,
      email: 'a@b.com',
      category: 'notification',
      unsubscribed: false,
    });
  });
});
