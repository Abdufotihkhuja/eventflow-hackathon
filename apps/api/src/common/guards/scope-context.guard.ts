import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPE_CAPABILITIES_KEY } from '../decorators/scope-context.decorator';
import type { ICurrentUser } from '../interfaces';
import type { ResolvedScopeV2ResponseDto } from '../../modules/iam/dto/session-v2.dto';
import { ScopeResolverService } from '../../modules/iam/scope-resolver.service';
import { parseScopeSelector } from '../../modules/iam/scope-selector';

interface ScopedRequest {
  user?: ICurrentUser;
  headers: Record<string, unknown>;
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  resolvedScope?: ResolvedScopeV2ResponseDto;
}

@Injectable()
export class ScopeContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly scopeResolver: ScopeResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapabilities = this.reflector.getAllAndOverride<
      string[] | undefined
    >(SCOPE_CAPABILITIES_KEY, [context.getHandler(), context.getClass()]);
    if (requiredCapabilities === undefined) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const accountId = request.user?.accountId;
    if (!accountId) {
      throw scopeDenied('ACCOUNT_CONTEXT_REQUIRED');
    }
    const resolvedScope = await this.scopeResolver.resolve(
      accountId,
      parseScopeSelector(request.headers['x-eventflow-scope']),
    );

    this.assertTenantMatch(resolvedScope, request.params, request.body);
    if (
      requiredCapabilities.some(
        (capability) => !resolvedScope.capabilities.includes(capability),
      )
    ) {
      throw scopeDenied('SCOPE_CAPABILITY_REQUIRED');
    }

    request.resolvedScope = resolvedScope;
    return true;
  }

  private assertTenantMatch(
    scope: ResolvedScopeV2ResponseDto,
    params?: Record<string, unknown>,
    body?: Record<string, unknown>,
  ): void {
    const candidates = [
      params?.organizationId,
      params?.orgId,
      body?.organizationId,
      body?.orgId,
    ].filter((value): value is string => typeof value === 'string');
    if (
      candidates.some(
        (organizationId) => organizationId !== scope.organizationId,
      )
    ) {
      throw scopeDenied('SCOPE_TENANT_MISMATCH');
    }
  }
}

function scopeDenied(code: string): ForbiddenException {
  return new ForbiddenException({
    code,
    message: 'Операция недоступна в выбранном контексте',
  });
}
