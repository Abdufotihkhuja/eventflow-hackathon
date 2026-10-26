import { ForbiddenException } from '@nestjs/common';
import { UserType } from '@prisma/client';
import { TicketScannerController } from './tickets.controller';
import type { TicketValidationService } from './application/ticket-validation.service';
import type { TicketCheckInService } from './application/ticket-check-in.service';
import type { ICurrentUser } from '../../common/interfaces';

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const EVENT_ORG_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

function buildOrganizerUser(orgId: string): ICurrentUser {
  return { sub: orgId, type: UserType.ORGANIZATION } as ICurrentUser;
}

function buildController(opts: {
  validationResult: ReturnType<
    TicketValidationService['validate']
  > extends Promise<infer R>
    ? R
    : never;
  eventOwnerOrgId: string;
}): {
  controller: TicketScannerController;
  loadEventOrgMock: jest.Mock;
  validateMock: jest.Mock;
  checkInMock: jest.Mock;
} {
  const validateMock = jest.fn().mockResolvedValue(opts.validationResult);
  const loadEventOrgMock = jest
    .fn()
    .mockResolvedValue({ organizationId: opts.eventOwnerOrgId });
  const checkInMock = jest.fn().mockResolvedValue(opts.validationResult);

  const validationService = {
    validate: validateMock,
    loadEventOrganization: loadEventOrgMock,
  } as unknown as TicketValidationService;
  const checkInService = {
    checkIn: checkInMock,
  } as unknown as TicketCheckInService;

  const controller = new TicketScannerController(
    validationService,
    checkInService,
  );
  return { controller, loadEventOrgMock, validateMock, checkInMock };
}

describe('TicketScannerController — cross-tenant isolation', () => {
  const validResultForOrgA = {
    valid: true as const,
    status: 'valid' as const,
    message: 'ok',
    attendee: { id: 'u', fullName: 'A B', email: 'a@b.c', role: 'PARTICIPANT' },
    event: { id: EVENT_ORG_A, title: 'Org A event' },
    ticket: { number: 'EVF-260101-AAAAAA', type: 'PARTICIPANT' },
  };

  describe('POST /tickets/validate', () => {
    it('allows organizer of the owning org to validate', async () => {
      const { controller } = buildController({
        validationResult: validResultForOrgA,
        eventOwnerOrgId: ORG_A,
      });
      const result = await controller.validate(
        { qrCode: 'v2.x' },
        buildOrganizerUser(ORG_A),
      );
      expect(result.valid).toBe(true);
    });

    it('refuses organizer from a different org with 403', async () => {
      const { controller, loadEventOrgMock } = buildController({
        validationResult: validResultForOrgA,
        eventOwnerOrgId: ORG_A,
      });
      await expect(
        controller.validate({ qrCode: 'v2.x' }, buildOrganizerUser(ORG_B)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(loadEventOrgMock).toHaveBeenCalledWith(EVENT_ORG_A);
    });

    it('skips ownership check when validation result has no event (e.g. invalid_signature)', async () => {
      const { controller, loadEventOrgMock } = buildController({
        validationResult: {
          valid: false as const,
          status: 'invalid_signature' as const,
          message: 'tampered',
        },
        eventOwnerOrgId: ORG_A,
      });
      const result = await controller.validate(
        { qrCode: 'v2.x' },
        buildOrganizerUser(ORG_B),
      );
      expect(result.status).toBe('invalid_signature');
      expect(loadEventOrgMock).not.toHaveBeenCalled();
    });
  });

  describe('POST /tickets/check-in', () => {
    it('refuses cross-org check-in BEFORE writing Attendance', async () => {
      const { controller, checkInMock } = buildController({
        validationResult: validResultForOrgA,
        eventOwnerOrgId: ORG_A,
      });
      await expect(
        controller.checkIn({ qrCode: 'v2.x' }, buildOrganizerUser(ORG_B)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      // Critical: never reached the writer — no spurious Attendance row.
      expect(checkInMock).not.toHaveBeenCalled();
    });

    it('allows owner-org organizer to check-in and delegates write', async () => {
      const { controller, checkInMock } = buildController({
        validationResult: validResultForOrgA,
        eventOwnerOrgId: ORG_A,
      });
      const result = await controller.checkIn(
        { qrCode: 'v2.x' },
        buildOrganizerUser(ORG_A),
      );
      expect(checkInMock).toHaveBeenCalledTimes(1);
      expect(result.valid).toBe(true);
    });
  });

  describe('actor-type guard', () => {
    it('refuses regular USER actors with 403', async () => {
      const { controller } = buildController({
        validationResult: validResultForOrgA,
        eventOwnerOrgId: ORG_A,
      });
      await expect(
        controller.validate(
          { qrCode: 'v2.x' },
          { sub: 'user-1', type: UserType.USER } as ICurrentUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows MEMBER with organizationId scoped to event owner org', async () => {
      const { controller } = buildController({
        validationResult: validResultForOrgA,
        eventOwnerOrgId: ORG_A,
      });
      const result = await controller.validate({ qrCode: 'v2.x' }, {
        sub: 'member-1',
        type: UserType.MEMBER,
        organizationId: ORG_A,
      } as ICurrentUser);
      expect(result.valid).toBe(true);
    });
  });
});
