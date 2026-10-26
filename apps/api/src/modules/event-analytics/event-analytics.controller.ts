import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

import { EventAnalyticsService } from './event-analytics.service';
import { EventAnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('event-analytics')
@Controller('events/:eventId/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EventAnalyticsController {
  constructor(private readonly analyticsService: EventAnalyticsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.EVENTS_READ)
  @ApiOperation({
    summary: 'Получить аналитику по событию',
    description:
      'Агрегированная аналитика по регистрациям, демографии, тестам и воронке. ' +
      'Tenant-safe: организатор видит только аналитику своих событий. PII не возвращаются.',
  })
  async getAnalytics(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: EventAnalyticsQueryDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.analyticsService.getEventAnalytics(eventId, query, user);
  }
}
