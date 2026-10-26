import { ForbiddenException } from '@nestjs/common';
import { UserType } from '@prisma/client';
import type { ICurrentUser } from '../../common/interfaces';

export interface UserContext {
  orgId: string;
  memberId: string | null;
}

/**
 * Определяет orgId и memberId в зависимости от типа пользователя
 * Для ORGANIZATION: orgId = sub, memberId = null (полный доступ)
 * Для MEMBER: orgId = organizationId, memberId = sub
 */
export function resolveUserContext(user: ICurrentUser): UserContext {
  if (user.type === UserType.ORGANIZATION) {
    return { orgId: user.sub, memberId: null };
  }
  if (user.type === UserType.MEMBER) {
    return { orgId: user.organizationId!, memberId: user.sub };
  }
  throw new ForbiddenException('Доступ запрещён для данного типа пользователя');
}

/**
 * Получает memberId для операций или null для Organization
 */
export function getMemberId(user: ICurrentUser): string | null {
  if (user.type === UserType.ORGANIZATION) {
    return null;
  }
  if (user.type === UserType.MEMBER) {
    return user.sub;
  }
  throw new ForbiddenException('Доступ запрещён для данного типа пользователя');
}
