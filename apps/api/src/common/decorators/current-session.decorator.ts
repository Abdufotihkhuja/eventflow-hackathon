import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ICurrentUser } from '../interfaces';

interface RequestWithSession {
  user?: ICurrentUser;
}

export const CurrentSession = createParamDecorator(
  (data: keyof ICurrentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithSession>();
    const session = request.user;

    return data ? session?.[data] : session;
  },
);
