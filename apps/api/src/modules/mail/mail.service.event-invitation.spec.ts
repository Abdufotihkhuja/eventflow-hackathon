import { MailService } from './mail.service';

type QueuedMail = { idempotencyKey: string; context: Record<string, unknown> };

function createService() {
  const enqueueTemplateMail = jest.fn().mockResolvedValue('job-1');
  const service = new MailService(
    { get: jest.fn().mockReturnValue('https://app.eventflow.test') } as never,
    {} as never,
    { enqueueTemplateMail } as never,
  );
  const queued = (call: number) =>
    enqueueTemplateMail.mock.calls[call][0] as QueuedMail;
  return { service, queued };
}

const base = {
  eventId: 'event-1',
  email: 'guest@example.com',
  eventTitle: 'LexHackathon',
  organizationName: 'Lex',
  inviteLink: 'https://eventflow.test/events/lex?inviteCode=EVT-1',
  inviteCode: 'EVT-1',
};

describe('MailService.sendEventInvitation', () => {
  // Regression: the key was `event-invitation:{code}:{email}` with a 7-day
  // dedupe TTL, so a resend to the same guest was dropped while the API
  // answered "sent".
  it('lets a later resend to the same guest through', async () => {
    const { service, queued } = createService();

    await service.sendEventInvitation({
      ...base,
      now: new Date('2026-10-20T10:00:00Z'),
    });
    await service.sendEventInvitation({
      ...base,
      now: new Date('2026-10-20T12:00:00Z'),
    });

    expect(queued(0).idempotencyKey).not.toBe(queued(1).idempotencyKey);
  });

  it('collapses a double-click within the same minute', async () => {
    const { service, queued } = createService();

    await service.sendEventInvitation({
      ...base,
      now: new Date('2026-10-20T10:00:05Z'),
    });
    await service.sendEventInvitation({
      ...base,
      now: new Date('2026-10-20T10:00:40Z'),
    });

    expect(queued(0).idempotencyKey).toBe(queued(1).idempotencyKey);
  });
});
