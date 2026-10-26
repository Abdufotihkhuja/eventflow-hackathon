import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistrationStatus, UserType } from '@prisma/client';
import { TicketViewService } from './ticket-view.service';
import { TicketNumberService } from './ticket-number.service';
import { TicketQrService } from './ticket-qr.service';

const userId = '00000000-0000-0000-0000-000000000001';
const eventId = '00000000-0000-0000-0000-000000000099';

function buildRegistration(
  overrides: Partial<{
    status: RegistrationStatus;
    endDate: Date;
    attendances: { checkInAt: Date }[];
    ticketNumber: string | null;
  }> = {},
) {
  const ticketNumber =
    'ticketNumber' in overrides ? overrides.ticketNumber : 'EVF-260429-AB7K3X';
  return {
    id: 'reg-1',
    userId,
    qrCode: 'uuid-qr',
    qrPayloadVersion: 1,
    ticketNumber,
    ticketIssuedAt: new Date('2026-04-29T00:00:00Z'),
    createdAt: new Date('2026-04-28T00:00:00Z'),
    role: 'PARTICIPANT',
    status: overrides.status ?? RegistrationStatus.APPROVED,
    user: {
      id: userId,
      firstName: 'Tony',
      lastName: 'Jackson',
      email: 'tony@example.com',
      avatarUrl: null,
    },
    event: {
      id: eventId,
      title: 'ML Hackathon',
      slug: 'ml-hackathon',
      startDate: new Date('2026-12-15T20:00:00Z'),
      endDate: overrides.endDate ?? new Date('2026-12-15T23:00:00Z'),
      venue: 'C-Space',
      city: 'Ташкент',
      format: 'OFFLINE',
      coverImage: null,
      organization: {
        id: 'org-1',
        companyName: 'Greentech',
        logoUrl: null,
        brandColor: null,
        accentColor: null,
      },
    },
    attendances: overrides.attendances ?? [],
  };
}

function buildService(
  registration: ReturnType<typeof buildRegistration> | null,
  /** Регистрация, найденная по её собственному id (legacy-ссылка из письма). */
  registrationById: ReturnType<typeof buildRegistration> | null = null,
) {
  const findUniqueMock = jest
    .fn()
    .mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(where.id === undefined ? registration : registrationById),
    );
  const prisma = {
    registration: {
      findUnique: findUniqueMock,
    },
  } as never;
  const config = {
    get: jest.fn().mockReturnValue('http://app.localhost'),
  } as unknown as ConfigService;
  const ensureTicketNumberMock = jest
    .fn()
    .mockResolvedValue('EVF-260429-BACKFILLED');
  const encodeQrPayloadMock = jest.fn().mockImplementation(() => 'v2.body.sig');
  const ticketNumberService = {
    ensureTicketNumber: ensureTicketNumberMock,
  } as unknown as TicketNumberService;
  const ticketQrService = {
    encodeQrPayload: encodeQrPayloadMock,
  } as unknown as TicketQrService;
  return {
    service: new TicketViewService(
      prisma,
      config,
      ticketNumberService,
      ticketQrService,
    ),
    ensureTicketNumberMock,
    encodeQrPayloadMock,
    findUniqueMock,
  };
}

const user = { sub: userId, type: UserType.USER } as never;

describe('TicketViewService', () => {
  it('rejects non-USER actors', async () => {
    const { service } = buildService(null);
    await expect(
      service.getMyTicketViewModel(eventId, {
        sub: 'org',
        type: UserType.ORGANIZATION,
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns view-model with active status when APPROVED + no attendance + future event', async () => {
    const { service, encodeQrPayloadMock } = buildService(buildRegistration());
    const vm = await service.getMyTicketViewModel(eventId, user);
    expect(vm.ticket.status).toBe('active');
    expect(vm.ticket.qrPayload).toBe('v2.body.sig');
    expect(vm.ticket.qrCheckInUrl).toContain('check-in');
    expect(vm.ticket.number).toBe('EVF-260429-AB7K3X');
    expect(vm.attendee.fullName).toBe('Tony Jackson');
    expect(vm.organization.name).toBe('Greentech');
    expect(encodeQrPayloadMock).toHaveBeenCalled();
  });

  it('reads the personal ticket by User id without requiring a live organization scope', async () => {
    const { service, findUniqueMock } = buildService(buildRegistration());

    await expect(service.getMyTicketViewModel(eventId, user)).resolves.toEqual(
      expect.objectContaining({
        ticket: expect.objectContaining({ id: 'reg-1' }),
      }),
    );
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId_userId: { eventId, userId } },
      }),
    );
    const serializedQuery = JSON.stringify(findUniqueMock.mock.calls[0][0]);
    expect(serializedQuery).not.toContain('deletedAt');
    expect(serializedQuery).not.toContain('suspendedAt');
    expect(serializedQuery).not.toContain('membership');
  });

  it('returns checked_in when attendance exists', async () => {
    const { service } = buildService(
      buildRegistration({
        attendances: [{ checkInAt: new Date('2026-12-15T20:30:00Z') }],
      }),
    );
    const vm = await service.getMyTicketViewModel(eventId, user);
    expect(vm.ticket.status).toBe('checked_in');
    expect(vm.ticket.lastCheckInAt).toBe('2026-12-15T20:30:00.000Z');
  });

  it('returns used when event has ended', async () => {
    const { service } = buildService(
      buildRegistration({ endDate: new Date('2020-01-01T00:00:00Z') }),
    );
    const vm = await service.getMyTicketViewModel(eventId, user);
    expect(vm.ticket.status).toBe('used');
    expect(vm.ticket.qrPayload).toBeNull();
  });

  it('throws 404 with code=pending_review for PENDING', async () => {
    const { service } = buildService(
      buildRegistration({ status: RegistrationStatus.PENDING }),
    );
    await expect(
      service.getMyTicketViewModel(eventId, user),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'pending_review' }),
    });
  });

  it('throws 404 with code=cancelled for CANCELLED', async () => {
    const { service } = buildService(
      buildRegistration({ status: RegistrationStatus.CANCELLED }),
    );
    await expect(
      service.getMyTicketViewModel(eventId, user),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'cancelled' }),
    });
  });

  it('throws 404 with code=rejected for REJECTED', async () => {
    const { service } = buildService(
      buildRegistration({ status: RegistrationStatus.REJECTED }),
    );
    await expect(
      service.getMyTicketViewModel(eventId, user),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'rejected' }),
    });
  });

  it('throws 404 with code=not_registered when registration is missing', async () => {
    const { service } = buildService(null);
    await expect(
      service.getMyTicketViewModel(eventId, user),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'not_registered' }),
    });
  });

  it('resolves legacy email links that carry the registration id', async () => {
    // Письма до фикса вели на /profile/tickets/<registrationId>: поиск по
    // (eventId, userId) промахивается, добираем по id регистрации того же
    // пользователя — участник видит билет, а не «Билет не выдан».
    const { service, findUniqueMock } = buildService(null, buildRegistration());
    const vm = await service.getMyTicketViewModel('reg-1', user);
    expect(vm.ticket.id).toBe('reg-1');
    expect(findUniqueMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: 'reg-1' } }),
    );
  });

  it("never opens someone else's ticket via the registration-id fallback", async () => {
    const foreign = { ...buildRegistration(), userId: 'another-user' };
    const { service } = buildService(null, foreign);
    await expect(
      service.getMyTicketViewModel('reg-1', user),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'not_registered' }),
    });
  });

  it('backfills ticketNumber when missing', async () => {
    const { service, ensureTicketNumberMock } = buildService(
      buildRegistration({ ticketNumber: null }),
    );
    const vm = await service.getMyTicketViewModel(eventId, user);
    expect(vm.ticket.number).toBe('EVF-260429-BACKFILLED');
    expect(ensureTicketNumberMock).toHaveBeenCalledWith('reg-1');
  });
});
