import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
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
import { UserType } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constant';
import { FollowersService } from './followers.service';
import {
  FollowerEntity,
  FollowingOrganizationEntity,
  FollowersStatsEntity,
} from './entities';
import { FollowersQueryDto } from './dto';

@ApiTags('organizations/followers')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  // ==================== ENDPOINTS ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ====================

  @Post('organizations/:id/follow')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Подписаться на организатора' })
  @ApiParam({ name: 'id', description: 'ID организации' })
  @ApiResponse({ status: 204, description: 'Подписка успешно создана' })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  @ApiResponse({ status: 409, description: 'Уже подписаны на организатора' })
  async follow(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) organizationId: string,
  ): Promise<void> {
    await this.followersService.follow(user.sub, organizationId);
  }

  @Delete('organizations/:id/unfollow')
  @Roles(UserType.USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отписаться от организатора' })
  @ApiParam({ name: 'id', description: 'ID организации' })
  @ApiResponse({ status: 204, description: 'Подписка успешно удалена' })
  @ApiResponse({ status: 404, description: 'Подписка не найдена' })
  async unfollow(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) organizationId: string,
  ): Promise<void> {
    await this.followersService.unfollow(user.sub, organizationId);
  }

  @Get('organizations/:id/is-following')
  @Roles(UserType.USER)
  @ApiOperation({ summary: 'Проверить, подписан ли на организатора' })
  @ApiParam({ name: 'id', description: 'ID организации' })
  @ApiResponse({
    status: 200,
    description: 'Статус подписки',
    schema: {
      type: 'object',
      properties: {
        isFollowing: { type: 'boolean', example: true },
      },
    },
  })
  async isFollowing(
    @CurrentUser() user: ICurrentUser,
    @Param('id', ParseUUIDPipe) organizationId: string,
  ): Promise<{ isFollowing: boolean }> {
    return this.followersService.isFollowing(user.sub, organizationId);
  }

  @Get('account/me/following-organizations')
  @Roles(UserType.USER)
  @ApiOperation({
    summary: 'Получить список организаторов, на которых подписан',
  })
  @ApiResponse({
    status: 200,
    description: 'Список подписок',
    type: [FollowingOrganizationEntity],
  })
  async getMyFollowingOrganizations(
    @CurrentUser() user: ICurrentUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    data: FollowingOrganizationEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.followersService.getFollowingOrganizations(
      user.sub,
      page,
      limit,
    );
  }

  // ==================== ENDPOINTS ДЛЯ ОРГАНИЗАТОРОВ ====================

  @Get('organizations/followers')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.FOLLOWERS_READ)
  @ApiOperation({ summary: 'Получить список подписчиков' })
  @ApiResponse({
    status: 200,
    description: 'Список подписчиков',
    type: [FollowerEntity],
  })
  async getFollowers(
    @CurrentUser() user: ICurrentUser,
    @Query() query: FollowersQueryDto,
  ): Promise<{
    data: FollowerEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const organizationId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;

    return this.followersService.getFollowers(organizationId, query);
  }

  @Get('organizations/followers/stats')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @RequirePermissions(PERMISSIONS.FOLLOWERS_READ)
  @ApiOperation({ summary: 'Получить статистику подписчиков' })
  @ApiResponse({
    status: 200,
    description: 'Статистика подписчиков',
    type: FollowersStatsEntity,
  })
  async getFollowersStats(
    @CurrentUser() user: ICurrentUser,
  ): Promise<FollowersStatsEntity> {
    const organizationId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;

    return this.followersService.getFollowersStats(organizationId);
  }
}
