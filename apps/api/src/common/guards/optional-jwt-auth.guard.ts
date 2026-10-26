import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Опциональная JWT-авторизация: при наличии валидного Bearer-токена
 * подставляет пользователя в request.user, при отсутствии/невалидном токене
 * запрос продолжается без user (без 401).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch {
      return true;
    }
  }
}
