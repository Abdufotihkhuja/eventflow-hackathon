import { RegistrationsRepository } from './registrations.repository';

describe('RegistrationsRepository personal-history continuity', () => {
  it('scopes personal history only by User id, not by current staff/org lifecycle', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'registration-1' }]);
    const count = jest.fn().mockResolvedValue(1);
    const prisma = {
      registration: { findMany, count },
      $transaction: jest
        .fn()
        .mockImplementation((operations: Array<Promise<unknown>>) =>
          Promise.all(operations),
        ),
    };
    const repository = new RegistrationsRepository(prisma as never);

    await repository.findMyRegistrations('user-personal', {});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-personal' } }),
    );
    expect(count).toHaveBeenCalledWith({ where: { userId: 'user-personal' } });
    const serializedQuery = JSON.stringify(findMany.mock.calls[0][0]);
    expect(serializedQuery).not.toContain('membership');
    expect(serializedQuery).not.toContain('deletedAt');
    expect(serializedQuery).not.toContain('suspendedAt');
  });
});
