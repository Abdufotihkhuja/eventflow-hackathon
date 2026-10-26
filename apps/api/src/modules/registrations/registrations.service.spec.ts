import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistrationStatus, UserType } from '@prisma/client';
import { RegistrationsService } from './registrations.service';
import { RegistrationsRepository } from './registrations.repository';
import { TicketNumberService } from '../tickets/application/ticket-number.service';
import { MailService } from '../mail/mail.service';
import { RegistrationFilesService } from '../registration-files/registration-files.service';
import type { ICurrentUser } from '../../common/interfaces';

const ORG_ID = 'org-1';
const OTHER_ORG_ID = 'org-2';
const EVENT_ID = 'event-1';
const REG_ID = '11111111-1111-4111-8111-111111111111';

const organizer = {
  sub: ORG_ID,
  type: UserType.ORGANIZATION,
} as ICurrentUser;

const participant = {
  sub: 'user-1',
  type: UserType.USER,
} as ICurrentUser;

function buildService(opts: {
  status: RegistrationStatus;
  eventOrgId?: string;
}) {
  const registration = {
    id: REG_ID,
    status: opts.status,
    event: {
      id: EVENT_ID,
      title: 'Event',
      organizationId: opts.eventOrgId ?? ORG_ID,
    },
    user: { id: 'user-1', firstName: 'Ali', lastName: 'V', email: 'ali@x.uz' },
  };

  // Голые jest.fn()-объекты (не каст к типу класса) — иначе eslint
  // @typescript-eslint/unbound-method срабатывает на каждом expect(repo.метод).
  const repo = {
    findEventRegistrationSnapshot: jest.fn(),
    findById: jest.fn().mockResolvedValue(registration),
    findEventOrganizationAccess: jest
      .fn()
      .mockResolvedValue({ organizationId: opts.eventOrgId ?? ORG_ID }),
    updateStatus: jest
      .fn()
      .mockImplementation(
        (id: string, status: RegistrationStatus, reason?: string) =>
          Promise.resolve({
            ...registration,
            status,
            rejectionReason: reason ?? null,
          }),
      ),
    update: jest
      .fn()
      .mockImplementation((id: string, data: Record<string, unknown>) =>
        Promise.resolve({ ...registration, ...data }),
      ),
    findEventWithOrgName: jest
      .fn()
      .mockResolvedValue({ title: 'Event', organizationName: 'Acme' }),
  };

  const mail = {
    sendRegistrationCancelled: jest.fn().mockResolvedValue(undefined),
    sendRegistrationRevoked: jest.fn().mockResolvedValue(undefined),
  };

  // Цепочка 2 (Батч 6б): письма cancel/revoke ушли в диспатчер — здесь мок,
  // по которому тесты проверяют сам факт вызова.
  const registrationChain = {
    onRegistrationCreated: jest.fn().mockResolvedValue(undefined),
    onRegistrationApproved: jest.fn().mockResolvedValue(undefined),
    onRegistrationRejected: jest.fn().mockResolvedValue(undefined),
    onCancelledByOrganizer: jest.fn().mockResolvedValue(undefined),
    onCancelledBySelf: jest.fn().mockResolvedValue(undefined),
    onApprovalRevoked: jest.fn().mockResolvedValue(undefined),
  };

  const service = new RegistrationsService(
    repo as unknown as RegistrationsRepository,
    {} as unknown as TicketNumberService,
    mail as unknown as MailService,
    { get: jest.fn() } as unknown as ConfigService,
    {} as unknown as RegistrationFilesService,
    {} as never, // CapacityClampService (не используется в cancel/revoke)
    { isOrgSuspended: jest.fn().mockResolvedValue(false) } as never, // EntitlementsService (E-17)
    {} as never, // PrismaService (не используется в cancel/revoke)
    { emit: jest.fn().mockResolvedValue(undefined) } as never, // NotificationsService
    registrationChain as never, // Цепочка 2 (Батч 6б)
  );

  return { service, repo, mail, registrationChain };
}

describe('RegistrationsService — organizer cancel/revoke', () => {
  it('keeps an organization-owner account out of participant registration scope', async () => {
    const { service, repo } = buildService({
      status: RegistrationStatus.PENDING,
    });

    await expect(
      service.register(EVENT_ID, {} as never, organizer),
    ).rejects.toThrow(
      'Только пользователи могут регистрироваться на мероприятия',
    );
    expect(repo.findEventRegistrationSnapshot).not.toHaveBeenCalled();
  });

  describe('cancelByOrganizer', () => {
    it.each([RegistrationStatus.PENDING, RegistrationStatus.APPROVED])(
      'cancels a %s registration → CANCELLED and notifies the participant',
      async (status) => {
        const { service, repo, registrationChain } = buildService({ status });

        const result = await service.cancelByOrganizer(
          REG_ID,
          { reason: 'no longer attending' },
          organizer,
        );

        expect(repo.updateStatus).toHaveBeenCalledWith(
          REG_ID,
          RegistrationStatus.CANCELLED,
          'no longer attending',
        );
        expect(result.status).toBe(RegistrationStatus.CANCELLED);
        // REG-10 уходит через цепочку (push + инбокс + письмо в диспатчере).
        expect(registrationChain.onCancelledByOrganizer).toHaveBeenCalledWith(
          REG_ID,
          'no longer attending',
        );
        expect(registrationChain.onApprovalRevoked).not.toHaveBeenCalled();
      },
    );

    it.each([RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED])(
      'rejects cancelling an already-%s registration',
      async (status) => {
        const { service, repo, registrationChain } = buildService({ status });

        await expect(
          service.cancelByOrganizer(REG_ID, {}, organizer),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(repo.updateStatus).not.toHaveBeenCalled();
        expect(registrationChain.onCancelledByOrganizer).not.toHaveBeenCalled();
      },
    );

    it('forbids organizers from other organizations', async () => {
      const { service, repo } = buildService({
        status: RegistrationStatus.APPROVED,
        eventOrgId: OTHER_ORG_ID,
      });

      await expect(
        service.cancelByOrganizer(REG_ID, {}, organizer),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it('forbids non-organizer (participant) callers', async () => {
      const { service } = buildService({ status: RegistrationStatus.APPROVED });

      await expect(
        service.cancelByOrganizer(REG_ID, {}, participant),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('revokeApproval', () => {
    it('moves an APPROVED registration back to PENDING and clears the rejection reason', async () => {
      const { service, repo, registrationChain } = buildService({
        status: RegistrationStatus.APPROVED,
      });

      const result = await service.revokeApproval(REG_ID, {}, organizer);

      expect(repo.update).toHaveBeenCalledWith(REG_ID, {
        status: RegistrationStatus.PENDING,
        rejectionReason: null,
      });
      expect(result.status).toBe(RegistrationStatus.PENDING);
      // REG-11 уходит через цепочку (push + инбокс + письмо в диспатчере).
      expect(registrationChain.onApprovalRevoked).toHaveBeenCalledWith(
        REG_ID,
        null,
      );
      expect(registrationChain.onCancelledByOrganizer).not.toHaveBeenCalled();
    });

    it.each([
      RegistrationStatus.PENDING,
      RegistrationStatus.CANCELLED,
      RegistrationStatus.REJECTED,
    ])('rejects revoking a non-APPROVED (%s) registration', async (status) => {
      const { service, repo, registrationChain } = buildService({ status });

      await expect(
        service.revokeApproval(REG_ID, {}, organizer),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.update).not.toHaveBeenCalled();
      expect(registrationChain.onApprovalRevoked).not.toHaveBeenCalled();
    });

    it('forbids organizers from other organizations', async () => {
      const { service, repo } = buildService({
        status: RegistrationStatus.APPROVED,
        eventOrgId: OTHER_ORG_ID,
      });

      await expect(
        service.revokeApproval(REG_ID, {}, organizer),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
