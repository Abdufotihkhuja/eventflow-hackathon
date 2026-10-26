import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { IamService } from '../iam/iam.service';
import type { AccountOrganizationSummary } from '../iam/iam.service';
import { AuthService } from './auth.service';
import { TokensResponseDto } from './dto';

/**
 * Account-centric "me" endpoints powering user-centric login: the list of
 * organizations the signed-in account actively belongs to, and switching into a
 * specific organization workspace.
 */
@ApiTags('me')
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly iamService: IamService,
    private readonly authService: AuthService,
  ) {}

  @Get('organizations')
  @ApiOperation({
    summary: 'Организации текущего аккаунта (только активные членства)',
  })
  @ApiResponse({ status: 200 })
  organizations(
    @CurrentUser() user: ICurrentUser,
  ): Promise<AccountOrganizationSummary[]> {
    return this.iamService.listAccountOrganizations(this.accountId(user));
  }

  @Post('organizations/:organizationId/session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Открыть workspace организации (выдаёт токен на эту организацию)',
  })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  enterWorkspace(
    @CurrentUser() user: ICurrentUser,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    return this.authService.createWorkspaceSession(
      this.accountId(user),
      organizationId,
      this.extractMetadata(req),
    );
  }

  @Post('participant-profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Завести личный кабинет участника для сотрудника организации',
    description:
      'Создаёт User по данным сотрудника и подвешивает его к тому же Account, ' +
      'после чего возвращает личную (USER) сессию. Владельцу организации ' +
      'недоступно — 403: субъект его сессии организация, а не человек.',
  })
  @ApiResponse({ status: 200, type: TokensResponseDto })
  createParticipantProfile(
    @CurrentUser() user: ICurrentUser,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    return this.authService.createParticipantProfile(
      user,
      this.extractMetadata(req),
    );
  }

  private accountId(user: ICurrentUser): string {
    if (!user.accountId) {
      throw new UnauthorizedException('Аккаунт сессии не найден');
    }
    return user.accountId;
  }

  private extractMetadata(req: Request): {
    userAgent?: string;
    ipAddress?: string;
  } {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }
}
