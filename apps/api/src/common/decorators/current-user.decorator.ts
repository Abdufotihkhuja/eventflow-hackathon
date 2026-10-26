import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ICurrentUser } from '../interfaces';

interface RequestWithUser {
  user?: ICurrentUser;
}

export const CurrentUser = createParamDecorator(
  (data: keyof ICurrentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
