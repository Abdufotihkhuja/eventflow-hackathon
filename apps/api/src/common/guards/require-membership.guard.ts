import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipKind } from '@prisma/client';
import { REQUIRE_MEMBERSHIP_KEY } from '../decorators/require-membership.decorator';
import type { ICurrentUser } from '../interfaces';

interface RequestWithUser {
  user?: ICurrentUser;
}

@Injectable()
export class RequireMembershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredKinds = this.reflector.getAllAndOverride<MembershipKind[]>(
      REQUIRE_MEMBERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredKinds) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const memberships = request.user?.memberships ?? [];

    if (memberships.length === 0) {
      throw new ForbiddenException('Требуется membership в рабочем пространстве');
    }

    if (
      requiredKinds.length > 0 &&
      !memberships.some((membership) => requiredKinds.includes(membership.kind))
    ) {
      throw new ForbiddenException('Недостаточно прав membership');
    }

    return true;
  }
}
