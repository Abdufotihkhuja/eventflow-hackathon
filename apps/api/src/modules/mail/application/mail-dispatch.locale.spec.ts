import { MailDispatchService } from './mail-dispatch.service';
import type { MailJobPayload } from '../../platform/queue/queue.types';

/**
 * BL-37 — единая точка локализации писем: enqueueTemplateMail резолвит
 * locale получателя из Account.locale, когда вызывающий его не передал.
 * Покрывает разом все send*-методы MailService и журнальные письма
 * диспатчера уведомлений (EmailChannelSender) — оба идут через этот метод.
 */

function setup(account: { locale: string | null } | null) {
  const queue = {
    enqueueMail: jest.fn().mockResolvedValue({ jobId: 'j1' }),
  };
  const prisma = {
    account: {
      findFirst: jest.fn().mockResolvedValue(account),
    },
  };
  const service = new MailDispatchService(
    {} as never,
    queue as never,
    {} as never,
    { get: jest.fn() } as never,
    {} as never,
    {} as never,
    prisma as never,
  );
  return { service, queue, prisma };
}

function enqueuedContext(queue: {
  enqueueMail: jest.Mock;
}): Record<string, unknown> {
  const payload = queue.enqueueMail.mock.calls[0][0] as MailJobPayload;
  return payload.mail.context;
}

const INPUT = {
  to: 'user@example.com',
  subject: 'S',
  template: 'registration-approved',
  entityId: 'e1',
  idempotencyKey: 'k1',
};

describe('MailDispatchService — Account.locale в письмах (BL-37)', () => {
  it('письмо уходит с локалью аккаунта получателя', async () => {
    const { service, queue, prisma } = setup({ locale: 'uz' });

    await service.enqueueTemplateMail({ ...INPUT, context: { userName: 'A' } });

    expect(prisma.account.findFirst).toHaveBeenCalled();
    expect(enqueuedContext(queue)).toEqual({ userName: 'A', locale: 'uz' });
  });

  it('получатель без Account → дефолт ru (прежнее поведение)', async () => {
    const { service, queue } = setup(null);

    await service.enqueueTemplateMail({ ...INPUT, context: {} });

    expect(enqueuedContext(queue).locale).toBe('ru');
  });

  it('явная locale вызывающего побеждает — резолв не выполняется', async () => {
    const { service, queue, prisma } = setup({ locale: 'uz' });

    await service.enqueueTemplateMail({
      ...INPUT,
      context: { locale: 'en' },
    });

    expect(prisma.account.findFirst).not.toHaveBeenCalled();
    expect(enqueuedContext(queue).locale).toBe('en');
  });

  it('context.locale: undefined (методы с необязательным параметром) → резолв из Account', async () => {
    const { service, queue } = setup({ locale: 'en' });

    await service.enqueueTemplateMail({
      ...INPUT,
      context: { locale: undefined, organizationName: 'Acme' },
    });

    expect(enqueuedContext(queue).locale).toBe('en');
  });
});
