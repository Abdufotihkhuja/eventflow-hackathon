import ExcelJS from 'exceljs';
import { AuthProvider, Gender, UserProfileStatus } from '@prisma/client';
import { UsersExportService } from './users-export.service';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ageInYears, orderExportFields } from './users-export.fields';
import { buildAdminUsersWhere } from './admin-users.filters';

/**
 * Юнит-тесты выгрузки пользователей в XLSX: состав и порядок колонок,
 * значения ячеек, совпадение фильтров со списком.
 */
describe('UsersExportService', () => {
  const USER = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'aziz@example.com',
    firstName: 'Азиз',
    lastName: 'Каримов',
    phone: '+998901234567',
    location: 'Ташкент',
    bio: null,
    shortBio: null,
    gender: Gender.MALE,
    dateOfBirth: new Date('1995-03-15T00:00:00.000Z'),
    region: 'Ташкент',
    languages: ['ru', 'uz'],
    profileStatus: UserProfileStatus.WORKER,
    workOrStudyPlace: 'EventFlow',
    skills: ['python', 'unknown_code'],
    specialization: null,
    authProvider: AuthProvider.EMAIL,
    isEmailVerified: true,
    linkedinUrl: null,
    instagramUrl: null,
    facebookUrl: null,
    websiteUrl: null,
    deletedAt: null,
    createdAt: new Date('2026-01-20T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
  };

  const createService = (users = [USER]) => {
    // Моки держим отдельными ссылками: обращение к ним через объект-сервис
    // ловит unbound-method в assert'ах.
    const count = jest.fn().mockResolvedValue(users.length);
    const findMany = jest.fn().mockResolvedValue(users);
    const resolveUserOrgRoles = jest.fn().mockResolvedValue(
      new Map([[USER.id, { organizationName: 'IT Park', roleName: 'Менеджер' }]]),
    );

    const prisma = { user: { count, findMany } } as unknown as PrismaService;
    const superAdmin = { resolveUserOrgRoles } as unknown as SuperAdminService;

    return {
      service: new UsersExportService(prisma, superAdmin),
      count,
      findMany,
      resolveUserOrgRoles,
    };
  };

  /** Собирает поток в буфер и читает его обратно как книгу Excel. */
  const readWorkbook = async (
    stream: NodeJS.ReadableStream,
  ): Promise<ExcelJS.Worksheet> => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk as Buffer));
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.concat(chunks));
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('в книге нет листов');
    return sheet;
  };

  it('кладёт выбранные колонки в порядке каталога, а не запроса', async () => {
    const { service } = createService();

    const { stream, total } = await service.export({
      fields: ['phone', 'age', 'firstName', 'dateOfBirth', 'lastName'],
      locale: 'ru',
    });
    const sheet = await readWorkbook(stream);

    expect(total).toBe(1);
    const headers = sheet.getRow(1).values as unknown[];
    expect(headers.slice(1)).toEqual([
      'Имя',
      'Фамилия',
      'Телефон',
      'Дата рождения',
      'Возраст',
    ]);
  });

  it('раскрывает словарные значения и булевы поля подписями', async () => {
    const { service } = createService();

    const { stream } = await service.export({
      fields: [
        'gender',
        'languages',
        'skills',
        'profileStatus',
        'isEmailVerified',
        'state',
        'organizationName',
      ],
      locale: 'ru',
    });
    const sheet = await readWorkbook(stream);
    const row = (sheet.getRow(2).values as unknown[]).slice(1);

    expect(row).toEqual([
      'Мужской',
      'Русский, O\'zbek',
      'Работник',
      // Незнакомый код навыка отдаётся как есть, а не теряется.
      'Python, unknown_code',
      'IT Park',
      'Да',
      'Активен',
    ]);
  });

  it('локализует заголовки и служебные значения', async () => {
    const { service } = createService();

    const { stream, filename } = await service.export({
      fields: ['firstName', 'isEmailVerified'],
      locale: 'en',
    });
    const sheet = await readWorkbook(stream);

    expect(filename).toMatch(/^users-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual([
      'First name',
      'Email verified',
    ]);
    expect((sheet.getRow(2).values as unknown[])[2]).toBe('Yes');
  });

  it('без выбранных полей выгружает набор по умолчанию', async () => {
    const { service } = createService();

    const { stream } = await service.export({ locale: 'ru' });
    const sheet = await readWorkbook(stream);

    expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual([
      'Имя',
      'Фамилия',
      'Email',
      'Телефон',
      'Дата регистрации',
    ]);
  });

  it('не ходит за членствами, если колонки организации не выбраны', async () => {
    const { service, resolveUserOrgRoles } = createService();

    const { stream } = await service.export({
      fields: ['email'],
      locale: 'ru',
    });
    await readWorkbook(stream);

    expect(resolveUserOrgRoles).not.toHaveBeenCalled();
  });

  it('фильтрует выборку тем же условием, что и список пользователей', async () => {
    const { service, count, findMany } = createService();

    const query = {
      fields: ['email'],
      search: 'aziz',
      isEmailVerified: true,
      status: 'archived' as const,
    };
    const { stream } = await service.export(query);
    await readWorkbook(stream);

    const expected = buildAdminUsersWhere(query);
    expect(count).toHaveBeenCalledWith({ where: expected });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expected }),
    );
  });
});

describe('users-export.fields', () => {
  it('считает полные годы, а не разницу лет', () => {
    const now = new Date('2026-03-14T00:00:00.000Z');
    // День рождения завтра — значит ещё 30, а не 31.
    expect(ageInYears(new Date('1995-03-15T00:00:00.000Z'), now)).toBe(30);
    expect(ageInYears(new Date('1995-03-14T00:00:00.000Z'), now)).toBe(31);
    expect(ageInYears(null, now)).toBeNull();
  });

  it('игнорирует неизвестные ключи полей', () => {
    expect(orderExportFields(['email', 'passwordHash']).map((f) => f.key)).toEqual(
      ['email'],
    );
  });
});
