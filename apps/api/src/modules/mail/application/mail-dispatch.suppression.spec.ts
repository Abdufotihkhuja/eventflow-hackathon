import { MailDispatchService } from './mail-dispatch.service';
import type { MailJobPayload } from '../../platform/queue/queue.types';

const brand = {
  productName: 'EventFlow',
  siteUrl: 'https://eventflow.uz',
  supportEmail: 'support@eventflow.uz',
  replyTo: 'support@eventflow.uz',
  legalName: 'EventFlow',
  postalAddress: 'Tashkent, Uzbekistan',
  unsubscribeApiUrl: 'https://api.eventflow.uz/api/v1/email/unsubscribe',
  unsubscribePageUrl: 'https://eventflow.uz/unsubscribe',
  logoUrl: 'https://eventflow.uz/assets/email-logo.png',
};

function setup(isSuppressed: boolean) {
  const mailer = { sendMail: jest.fn().mockResolvedValue({ messageId: 'm1' }) };
  const idempotency = {
    hasProcessed: jest.fn().mockResolvedValue(false),
    reserve: jest.fn().mockResolvedValue(true),
    markProcessed: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  const config = { get: jest.fn(() => brand) };
  const tokens = { sign: jest.fn(() => 'SIGNED_TOKEN') };
  const unsubscribe = {
    isSuppressed: jest.fn().mockResolvedValue(isSuppressed),
  };

  const prisma = {
    organization: {
      findFirst: jest.fn().mockResolvedValue({ id: 'org-1' }),
    },
    notificationDelivery: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ status: 'enqueued', organizationId: null }),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const service = new MailDispatchService(
    mailer as never,
    {} as never,
    idempotency as never,
    config as never,
    tokens as never,
    unsubscribe as never,
    prisma as never,
  );
  return { service, mailer, idempotency, unsubscribe, prisma };
}

function payload(
  template: string,
  context: Record<string, unknown>,
): MailJobPayload {
  return {
    jobId: 'j1',
    type: 'mail.template',
    entityId: 'e1',
    attempt: 0,
    idempotencyKey: `k:${template}:${Math.random()}`,
    mail: { to: 'user@example.com', subject: 'S', template, context },
  };
}

const NOTIFICATION = payload('event-notification', {
  userName: 'Ali',
  eventTitle: 'Summit',
  organizationName: 'Acme',
  message: 'Hello',
});
const TRANSACTIONAL = payload('email-verification-code', {
  firstName: 'Ali',
  code: '123456',
});

describe('MailDispatchService — unsubscribe wiring', () => {
  it('suppresses notification mail for an unsubscribed recipient', async () => {
    const { service, mailer, idempotency } = setup(true);
    const result = await service.dispatchQueuedMail(NOTIFICATION);
    expect(result).toEqual({ status: 'suppressed' });
    expect(mailer.sendMail).not.toHaveBeenCalled();
    expect(idempotency.markProcessed).toHaveBeenCalled();
  });

  it('sends notification mail with List-Unsubscribe when not suppressed', async () => {
    const { service, mailer } = setup(false);
    const result = await service.dispatchQueuedMail(NOTIFICATION);
    expect(result).toEqual({ status: 'sent' });
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    const args = mailer.sendMail.mock.calls[0][0];
    expect(args.headers['List-Unsubscribe']).toContain(
      'https://api.eventflow.uz/api/v1/email/unsubscribe?token=SIGNED_TOKEN',
    );
    expect(args.headers['List-Unsubscribe']).toContain('mailto:');
    expect(args.headers['List-Unsubscribe-Post']).toBe(
      'List-Unsubscribe=One-Click',
    );
    expect(typeof args.text).toBe('string');
    expect(args.text.length).toBeGreaterThan(50);
  });

  // Совместная семантика с матрицей преференсов (BL-23): включённый в матрице
  // email доезжает сюда как журнальная delivery-строка — и здесь его гасит
  // второй, независимый opt-out (EmailUnsubscribe). Любой из двух подавляет.
  it('marks a journal delivery suppressed_unsubscribe for an unsubscribed recipient', async () => {
    const { service, mailer, prisma } = setup(true);
    const journal = { ...NOTIFICATION, deliveryId: 'del-1' };

    const result = await service.dispatchQueuedMail(journal);
    expect(result).toEqual({ status: 'suppressed' });
    expect(mailer.sendMail).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'del-1' },
      data: { status: 'suppressed_unsubscribe' },
    });
  });

  it('always delivers transactional mail even if recipient unsubscribed', async () => {
    const { service, mailer, unsubscribe } = setup(true);
    const result = await service.dispatchQueuedMail(TRANSACTIONAL);
    expect(result).toEqual({ status: 'sent' });
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    // transactional path must not gate on suppression
    expect(unsubscribe.isSuppressed).not.toHaveBeenCalled();
    const args = mailer.sendMail.mock.calls[0][0];
    expect(args.headers['List-Unsubscribe']).toContain('SIGNED_TOKEN');
  });

  it('skips a journal email when its organization was archived before SMTP', async () => {
    const { service, mailer, prisma } = setup(false);
    prisma.notificationDelivery.findUnique.mockResolvedValue({
      status: 'enqueued',
      organizationId: 'org-archived',
    });
    prisma.organization.findFirst.mockResolvedValue(null);

    const result = await service.dispatchQueuedMail({
      ...TRANSACTIONAL,
      deliveryId: 'del-archived',
    });

    expect(result).toEqual({ status: 'skipped' });
    expect(mailer.sendMail).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'del-archived' },
      data: { status: 'skipped', error: 'organization_unavailable' },
    });
  });
});
