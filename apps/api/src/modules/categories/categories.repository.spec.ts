import {
  EventAccessType,
  EventStatus,
  OrganizationVerificationStatus,
} from '@prisma/client';
import { CategoriesRepository } from './categories.repository';

describe('CategoriesRepository', () => {
  const prisma = {
    eventCategory: {
      findMany: jest.fn(),
    },
  };

  const repository = new CategoriesRepository(prisma as never);

  beforeEach(() => {
    prisma.eventCategory.findMany.mockReset();
    prisma.eventCategory.findMany.mockResolvedValue([]);
  });

  // Регресс: счётчик считал все PUBLISHED события категории, включая
  // прошедшие и непубличные. Витрина обещала «3 события», а лендинг
  // категории открывался пустым.
  it('counts only events the public upcoming list would return', async () => {
    await repository.findAllActive();

    const args = prisma.eventCategory.findMany.mock.calls[0][0];
    const where = args.include._count.select.events.where;

    expect(where.status).toBe(EventStatus.PUBLISHED);
    expect(where.deletedAt).toBeNull();
    expect(where.endDate.gte).toBeInstanceOf(Date);
    expect(where.accessType).toEqual({
      notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
    });
    expect(where.organization).toEqual({
      verificationStatus: OrganizationVerificationStatus.APPROVED,
      deletedAt: null,
    });
  });
});
