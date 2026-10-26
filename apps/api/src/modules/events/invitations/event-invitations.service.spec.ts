import { BadRequestException } from '@nestjs/common';
import {
  EventAccessType,
  EventStatus,
  InviteStatus,
  UserType,
} from '@prisma/client';
import { EventInvitationsService } from './event-invitations.service';
import type { ICurrentUser } from '../../../common/interfaces';

const organizer = {
  sub: 'org-user',
  type: UserType.ORGANIZATION,
} as ICurrentUser;

function buildService(eventOverrides: Record<string, unknown> = {}) {
  const event = {
    id: 'event-1',
    slug: 'lex',
    title: 'LexHackathon',
    organizationId: 'org-1',
    accessType: EventAccessType.PRIVATE,
    status: EventStatus.PUBLISHED,
    ...eventOverrides,
  };
  const prisma = {
    eventInvitation: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { email: 'done@example.com', status: InviteStatus.ACCEPTED },
        ]),
      upsert: jest.fn().mockResolvedValue({ id: 'inv-1', sendCount: 2 }),
    },
    organization: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ companyName: 'Lex', name: 'lex' }),
    },
  };
  const eventsService = {
    findByIdWithAccess: jest.fn().mockResolvedValue(event),
    buildPublicInviteLink: jest.fn(
      (slug: string, code: string) =>
        `https://e.test/events/${slug}?inviteCode=${code}`,
    ),
  };
  const mail = { sendEventInvitation: jest.fn().mockResolvedValue(undefined) };
  const service = new EventInvitationsService(
    prisma as never,
    eventsService as never,
    mail as never,
  );
  return { service, prisma, mail };
}

describe('EventInvitationsService.send', () => {
  it('normalizes and dedupes emails, skips guests who already registered', async () => {
    const { service, mail } = buildService();

    const result = await service.send(
      'event-1',
      { emails: [' New@Example.com', 'new@example.com', 'DONE@example.com'] },
      organizer,
    );

    expect(result).toEqual({
      sent: ['new@example.com'],
      skipped: [{ email: 'done@example.com', reason: 'ALREADY_ACCEPTED' }],
    });
    expect(mail.sendEventInvitation).toHaveBeenCalledTimes(1);
    expect(mail.sendEventInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        organizationName: 'Lex',
        // Per-send key: a resend with a rotated token is never deduped away.
        sendKey: 'inv-1:2',
      }),
    );
  });

  it('emails a personal link, never a stored hash', async () => {
    const { service, prisma, mail } = buildService();

    await service.send('event-1', { emails: ['new@example.com'] }, organizer);

    const { inviteLink } = mail.sendEventInvitation.mock.calls[0][0] as {
      inviteLink: string;
    };
    const { create } = prisma.eventInvitation.upsert.mock.calls[0][0] as {
      create: { tokenHash: string };
    };
    const rawToken = new URL(inviteLink).searchParams.get('inviteCode');
    expect(rawToken).toBeTruthy();
    expect(rawToken).not.toBe(create.tokenHash);
  });

  it.each([
    ['a non-PRIVATE event', { accessType: EventAccessType.INVITE_ONLY }],
    ['an unpublished event', { status: EventStatus.DRAFT }],
  ])('refuses to send for %s', async (_label, overrides) => {
    const { service, mail } = buildService(overrides);

    await expect(
      service.send('event-1', { emails: ['new@example.com'] }, organizer),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mail.sendEventInvitation).not.toHaveBeenCalled();
  });
});
