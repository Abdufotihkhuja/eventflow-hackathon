import {
  EventAccessType,
  EventStatus,
  OrganizationVerificationStatus,
  Prisma,
} from '@prisma/client';

/**
 * Правила видимости события в публичном каталоге — единая точка для списков
 * (`public.repository`) и для счётчиков (`categories.repository`).
 *
 * Зачем: счётчик категории считался как «все PUBLISHED события категории», а
 * лендинг категории показывает только предстоящие и только публично видимые.
 * Из-за этого карточка на главной обещала «3 события», а страница категории
 * открывалась пустой.
 */
export const PUBLIC_EVENT_VISIBILITY_WHERE = {
  deletedAt: null,
  accessType: {
    notIn: [EventAccessType.INVITE_ONLY, EventAccessType.PRIVATE],
  },
  organization: {
    verificationStatus: OrganizationVerificationStatus.APPROVED,
    deletedAt: null,
  },
} satisfies Prisma.EventWhereInput;

/**
 * Событие, которое реально попадёт в публичный список «предстоящие»:
 * опубликовано, ещё не закончилось и видно анонимному пользователю.
 */
export function upcomingPublicEventWhere(
  now: Date = new Date(),
): Prisma.EventWhereInput {
  return {
    ...PUBLIC_EVENT_VISIBILITY_WHERE,
    status: EventStatus.PUBLISHED,
    endDate: { gte: now },
  };
}
