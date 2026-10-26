import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import {
  CurrentUser,
  RequirePermissions,
  Roles,
} from '../../../common/decorators';
import {
  JwtAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from '../../../common/guards';
import type { ICurrentUser } from '../../../common/interfaces';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto, DashboardActivityDto } from './dto';

@ApiTags('organizations/dashboard')
@Controller('organizations/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.ORGANIZATION, UserType.MEMBER)
@RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Получить статистику Dashboard',
    description:
      'Возвращает статистику по событиям, тикетам, участникам и конверсии для текущей организации',
  })
  @ApiResponse({
    status: 200,
    type: DashboardStatsDto,
    description: 'Статистика Dashboard',
  })
  async getStats(
    @CurrentUser() user: ICurrentUser,
  ): Promise<DashboardStatsDto> {
    const organizationId = this.getOrganizationId(user);
    return this.dashboardService.getStats(organizationId);
  }

  @Get('activity')
  @ApiOperation({
    summary: 'Получить командную активность',
    description:
      'Возвращает список последних действий команды за последние 24 часа: регистрации, создание событий, задачи',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Максимальное количество записей (по умолчанию 20)',
  })
  @ApiResponse({
    status: 200,
    type: DashboardActivityDto,
    description: 'Командная активность за 24 часа',
  })
  async getActivity(
    @CurrentUser() user: ICurrentUser,
    @Query('limit') limit?: number,
  ): Promise<DashboardActivityDto> {
    const organizationId = this.getOrganizationId(user);
    return this.dashboardService.getActivity(
      organizationId,
      limit ? Number(limit) : 20,
    );
  }

  /**
   * Получает ID организации из токена пользователя
   */
  private getOrganizationId(user: ICurrentUser): string {
    return user.type === UserType.ORGANIZATION
      ? user.sub
      : user.organizationId!;
  }
}
