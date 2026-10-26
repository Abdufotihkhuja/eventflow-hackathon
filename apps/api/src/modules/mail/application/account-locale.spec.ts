import { resolveAccountLocale } from './account-locale';

/**
 * BL-37 — резолв локали получателя письма (Account.locale → 'ru').
 */

function prismaWith(result: { locale: string | null } | null, impl?: jest.Mock) {
  const findFirst =
    impl ?? jest.fn().mockResolvedValue(result);
  return { prisma: { account: { findFirst } }, findFirst };
}

describe('resolveAccountLocale (BL-37)', () => {
  it('возвращает локаль аккаунта получателя', async () => {
    const { prisma, findFirst } = prismaWith({ locale: 'uz' });

    await expect(
      resolveAccountLocale(prisma, 'User@Example.com'),
    ).resolves.toBe('uz');

    // Регистронезависимый поиск по email, только живые аккаунты с локалью,
    // самая свежая строка при дублях email у legacy-акторов.
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'User@Example.com', mode: 'insensitive' },
        deletedAt: null,
        locale: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: { locale: true },
    });
  });

  it('нет аккаунта (гость/приглашённый без регистрации) → дефолт ru', async () => {
    const { prisma } = prismaWith(null);
    await expect(resolveAccountLocale(prisma, 'guest@example.com')).resolves.toBe(
      'ru',
    );
  });

  it('нормализует сырое значение локали (en-US → en, мусор → ru)', async () => {
    const { prisma } = prismaWith({ locale: 'EN-us' });
    await expect(resolveAccountLocale(prisma, 'a@b.c')).resolves.toBe('en');

    const { prisma: junk } = prismaWith({ locale: 'xx' });
    await expect(resolveAccountLocale(junk, 'a@b.c')).resolves.toBe('ru');
  });

  it('невалидный адрес и сбой БД не блокируют отправку — дефолт ru', async () => {
    const { prisma, findFirst } = prismaWith(null);
    await expect(resolveAccountLocale(prisma, '')).resolves.toBe('ru');
    expect(findFirst).not.toHaveBeenCalled();

    const { prisma: failing } = prismaWith(
      null,
      jest.fn().mockRejectedValue(new Error('db down')),
    );
    await expect(resolveAccountLocale(failing, 'a@b.c')).resolves.toBe('ru');
  });
});
