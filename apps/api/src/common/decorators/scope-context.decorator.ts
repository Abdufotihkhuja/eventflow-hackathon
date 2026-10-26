import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { ResolvedScopeV2ResponseDto } from '../../modules/iam/dto/session-v2.dto';

export const SCOPE_CAPABILITIES_KEY = 'eventflow.scope.capabilities';

/** Marks an endpoint as v2-scoped and optionally requires live capabilities. */
export const RequireScope = (...capabilities: string[]) =>
  SetMetadata(SCOPE_CAPABILITIES_KEY, capabilities);

interface RequestWithResolvedScope {
  resolvedScope?: ResolvedScopeV2ResponseDto;
}

export const CurrentScope = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<RequestWithResolvedScope>().resolvedScope,
);
