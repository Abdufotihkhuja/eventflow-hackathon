import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { UserType } from '@prisma/client';
import { Observable } from 'rxjs';
import type { ICurrentUser } from '../../../common/interfaces';
import { OrgSuspendedException } from '../errors/billing-errors';
import { EntitlementsRepository } from './entitlements.repository';

/**
 * Глобальный перехватчик приостановки (E-17, пакет решений D-1 группы D).
 * Интерцептор (не гард): выполняется ПОСЛЕ контроллерных гардов, когда
 * request.user уже установлен JwtAuthGuard'ом.
 *
 * Семантика: приостановленная организация (и её сотрудники) — read-only:
 * любые не-GET запросы → 403 ORG_SUSPENDED. Вход и чтение доступны;
 * публичная видимость опубликованных событий не трогается; новые
 * регистрации участников блокируются отдельной проверкой в
 * registrations.service (актор там — USER). Один индексированный запрос
 * suspendedAt на запись — дёшево. USER/SUPER_ADMIN-акторов не касается.
 */
@Injectable()
export class SuspensionInterceptor implements NestInterceptor {
  constructor(
    private readonly entitlementsRepository: EntitlementsRepository,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; user?: ICurrentUser }>();

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const user = request.user;
      const organizationId =
        user?.type === UserType.ORGANIZATION
          ? user.sub
          : user?.type === UserType.MEMBER && user.organizationId
            ? user.organizationId
            : null;
      if (
        organizationId &&
        (await this.entitlementsRepository.isSuspended(organizationId))
      ) {
        throw new OrgSuspendedException({
          suspendedAt: new Date().toISOString(),
        });
      }
    }
    return next.handle();
  }
}
