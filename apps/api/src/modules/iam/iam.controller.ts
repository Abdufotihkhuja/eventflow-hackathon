import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentSession } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { SessionMeResponseDto } from './dto/session-me.dto';

@ApiTags('session')
@Controller('session')
export class IamController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить текущую account-centric session model' })
  @ApiResponse({ status: 200, type: SessionMeResponseDto })
  getCurrentSession(
    @CurrentSession() session: ICurrentUser,
  ): SessionMeResponseDto {
    return {
      currentAccount: session.currentAccount!,
      activeWorkspace: session.activeWorkspace ?? null,
      memberships: session.memberships ?? [],
      platformRole: session.platformRole ?? null,
      actorType: session.type,
      accessDeniedPermissions: session.accessDeniedPermissions ?? [],
    };
  }
}
