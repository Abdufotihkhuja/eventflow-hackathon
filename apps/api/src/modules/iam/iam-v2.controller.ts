import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentScope,
  CurrentSession,
  RequireScope,
} from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import {
  ResolvedScopeV2ResponseDto,
  SessionV2ResponseDto,
} from './dto/session-v2.dto';
import { ScopeResolverService } from './scope-resolver.service';

@ApiTags('session-v2')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v2/session')
export class IamV2Controller {
  constructor(private readonly scopeResolver: ScopeResolverService) {}

  @Get('me')
  @ApiOperation({ summary: 'Список доступных account scopes из live-данных' })
  @ApiResponse({ status: 200, type: SessionV2ResponseDto })
  getSession(
    @CurrentSession() session: ICurrentUser,
  ): Promise<SessionV2ResponseDto> {
    return this.scopeResolver.getSession(requireAccountId(session));
  }

  @Get('context')
  @ApiHeader({
    name: 'X-EventFlow-Scope',
    required: true,
    description: 'personal или organization:<canonical-lowercase-v4-uuid>',
  })
  @ApiOperation({ summary: 'Разрешить один live scope без перевыпуска JWT' })
  @ApiResponse({ status: 200, type: ResolvedScopeV2ResponseDto })
  @RequireScope()
  getContext(
    @CurrentScope() scope: ResolvedScopeV2ResponseDto,
  ): ResolvedScopeV2ResponseDto {
    return scope;
  }

  @Patch('scopes/:membershipId/hide')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Скрыть tombstone бывшего organization scope' })
  async hideFormerScope(
    @CurrentSession() session: ICurrentUser,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ): Promise<void> {
    await this.scopeResolver.hideFormerScope(
      requireAccountId(session),
      membershipId,
    );
  }
}

function requireAccountId(session: ICurrentUser): string {
  if (!session.accountId) {
    throw new ForbiddenException({
      code: 'ACCOUNT_CONTEXT_REQUIRED',
      message: 'Account context недоступен',
    });
  }
  return session.accountId;
}
