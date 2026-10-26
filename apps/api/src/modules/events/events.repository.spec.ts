import {
  EventAccessType,
  OrganizationVerificationStatus,
  RegistrationStatus,
} from '@prisma/client';
import { EventsRepository } from './events.repository';

describe('EventsRepository', () => {
  const prisma = {
    event: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const repository = new EventsRepository(prisma as never);

  beforeEach(() => {
    prisma.event.findMany.mockReset();
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockReset();
    prisma.event.count.mockResolvedValue(0);
    prisma.$transaction.mockReset();
    prisma.$transaction.mockImplementation(async (queries) =>
      Promise.all(queries),
    );
  });

  it('uses public visibility rules for organization event lists', async () => {
    await repository.findPublicByOrganization('org-id', 1, 10, true);

    const args = prisma.event.findMany.mock.calls[0][0];
    expect(args.where).toEqual(
      expect.objectContaining({
        organizationId: 'org-id',
        deletedAt: null,
        endDate: { gte: expect.any(Date) },
        accessType: {
          notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
        },
        organization: {
          verificationStatus: OrganizationVerificationStatus.APPROVED,
          deletedAt: null,
        },
      }),
    );
    // Repository uses the many-to-many `categories` relation; the legacy
    // `category` (singular) field no longer exists on the Event model.
    expect(args.include.categories).toEqual({ select: { slug: true } });
    expect(args.include._count.select.registrations).toEqual({
      where: { status: RegistrationStatus.APPROVED },
    });
  });
});
