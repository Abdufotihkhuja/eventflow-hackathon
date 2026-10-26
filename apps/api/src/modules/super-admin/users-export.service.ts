/**
 * Выгрузка пользователей в XLSX для супер-админки.
 *
 * Файл собирается потоковым писателем ExcelJS и отдаётся как поток: выгрузка
 * идёт по всей выборке (а не по текущей странице), поэтому книга целиком в
 * память не поднимается. Пользователи читаются пачками по CHUNK_SIZE, каждая
 * пачка отдаётся в лист и отпускается.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { SuperAdminService } from './super-admin.service';
import { buildAdminUsersWhere } from './admin-users.filters';
import {
  DATE_ONLY_FIELD_KEYS,
  EXPORT_DATETIME_FORMAT,
  EXPORT_DATE_FORMAT,
  USER_EXPORT_DEFAULT_FIELDS,
  orderExportFields,
  type ExportLocale,
  type ExportUserRow,
} from './users-export.fields';
import type { AdminUsersExportQueryDto } from './dto';

/** Сколько пользователей читаем из БД за один заход. */
const CHUNK_SIZE = 500;

/**
 * Потолок строк в одном файле. Не бизнес-ограничение, а страховка: выгрузка
 * держит соединение открытым, и неограниченный экспорт на растущей базе
 * однажды упрётся в таймаут прокси. При превышении — сузьте фильтры.
 */
const MAX_ROWS = 100_000;

const SHEET_NAME: Record<ExportLocale, string> = {
  ru: 'Пользователи',
  uz: 'Foydalanuvchilar',
  en: 'Users',
};

/** Поля User, из которых считаются все колонки каталога. */
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  location: true,
  bio: true,
  shortBio: true,
  gender: true,
  dateOfBirth: true,
  region: true,
  languages: true,
  profileStatus: true,
  workOrStudyPlace: true,
  skills: true,
  specialization: true,
  authProvider: true,
  isEmailVerified: true,
  linkedinUrl: true,
  instagramUrl: true,
  facebookUrl: true,
  websiteUrl: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type UsersExportResult = {
  stream: PassThrough;
  filename: string;
  /** Сколько строк попадёт в файл (без строки заголовков). */
  total: number;
};

@Injectable()
export class UsersExportService {
  private readonly logger = new Logger(UsersExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly superAdmin: SuperAdminService,
  ) {}

  /**
   * Готовит поток XLSX по тем же фильтрам, что и список пользователей.
   * Возвращает управление сразу — наполнение книги идёт в фоне и пишется
   * в возвращённый поток.
   */
  async export(query: AdminUsersExportQueryDto): Promise<UsersExportResult> {
    const locale: ExportLocale = query.locale ?? 'ru';
    const fields = orderExportFields(
      query.fields?.length ? query.fields : USER_EXPORT_DEFAULT_FIELDS,
    );
    const where = buildAdminUsersWhere(query);

    const matching = await this.prisma.user.count({ where });
    const total = Math.min(matching, MAX_ROWS);

    const stream = new PassThrough();
    void this.writeWorkbook({ stream, fields, locale, where, total }).catch(
      (error: unknown) => {
        // Заголовки ответа уже ушли — единственное, что осталось, оборвать
        // поток: клиент увидит недокачанный файл, а не «тихо пустой».
        this.logger.error('Не удалось собрать выгрузку пользователей', error);
        stream.destroy(error instanceof Error ? error : new Error('export'));
      },
    );

    return { stream, filename: buildFilename(locale), total };
  }

  private async writeWorkbook(params: {
    stream: PassThrough;
    fields: ReturnType<typeof orderExportFields>;
    locale: ExportLocale;
    where: ReturnType<typeof buildAdminUsersWhere>;
    total: number;
  }): Promise<void> {
    const { stream, fields, locale, where, total } = params;

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream,
      useStyles: true,
    });
    workbook.creator = 'EventFlow';

    const sheet = workbook.addWorksheet(SHEET_NAME[locale], {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = fields.map((field) => ({
      header: field.header[locale],
      key: field.key,
      width: field.width,
    }));
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.commit();

    const needsMembership = fields.some(
      (f) => f.key === 'organizationName' || f.key === 'roleName',
    );

    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
      const users = await this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: offset,
        take: Math.min(CHUNK_SIZE, total - offset),
      });
      if (users.length === 0) break;

      const orgRoles = needsMembership
        ? await this.superAdmin.resolveUserOrgRoles(users.map((u) => u.id))
        : new Map<
            string,
            { organizationName: string | null; roleName: string | null }
          >();

      for (const user of users) {
        const membership = orgRoles.get(user.id);
        const source: ExportUserRow = {
          user,
          organizationName: membership?.organizationName ?? null,
          roleName: membership?.roleName ?? null,
        };

        const row = sheet.addRow(
          Object.fromEntries(
            fields.map((field) => [field.key, field.value(source, locale)]),
          ),
        );
        for (const field of fields) {
          const cell = row.getCell(field.key);
          if (cell.value instanceof Date) {
            cell.numFmt = DATE_ONLY_FIELD_KEYS.has(field.key)
              ? EXPORT_DATE_FORMAT
              : EXPORT_DATETIME_FORMAT;
          }
        }
        row.commit();
      }
    }

    sheet.commit();
    await workbook.commit();
  }
}

/** users-2026-07-31.xlsx — дата в имени, чтобы выгрузки не перетирали друг друга. */
function buildFilename(locale: ExportLocale): string {
  const stem: Record<ExportLocale, string> = {
    ru: 'polzovateli',
    uz: 'foydalanuvchilar',
    en: 'users',
  };
  const date = new Date().toISOString().slice(0, 10);
  return `${stem[locale]}-${date}.xlsx`;
}
