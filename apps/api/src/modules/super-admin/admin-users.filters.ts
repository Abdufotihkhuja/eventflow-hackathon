/**
 * Фильтр списка пользователей супер-админки.
 *
 * Вынесен из SuperAdminService, потому что тем же условием пользуется выгрузка
 * в XLSX: админ скачивает ровно то, что видит в таблице, — совпадение фильтров
 * должно быть гарантировано кодом, а не дисциплиной.
 */

import { Prisma } from '@prisma/client';

/** Фильтр активные / архивированные / все. */
export type AdminRecordStatus = 'active' | 'archived' | 'all';

/** active → deletedAt null; archived → deletedAt set; all → без фильтра. */
export function resolveAdminRecordStatus(
  status: string | undefined,
  includeDeleted: boolean | undefined,
): AdminRecordStatus {
  if (status === 'active' || status === 'archived' || status === 'all') {
    return status;
  }
  return includeDeleted ? 'all' : 'active';
}

export function buildAdminUsersWhere(query: {
  search?: string;
  isEmailVerified?: boolean;
  includeDeleted?: boolean;
  status?: string;
}): Prisma.UserWhereInput {
  const status = resolveAdminRecordStatus(query.status, query.includeDeleted);
  return {
    ...(query.search && {
      OR: [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ],
    }),
    ...(query.isEmailVerified !== undefined && {
      isEmailVerified: query.isEmailVerified,
    }),
    ...(status === 'active'
      ? { deletedAt: null }
      : status === 'archived'
        ? { deletedAt: { not: null } }
        : {}),
  };
}
