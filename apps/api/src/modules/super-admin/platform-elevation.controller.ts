import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { CurrentSession, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import {
  PlatformElevationResponseDto,
  RequestPlatformElevationDto,
} from './dto';
import { PlatformElevationService } from './platform-elevation.service';

@ApiTags('super-admin-elevation')
@Controller('super-admin/elevations')
@UseGuards(RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class PlatformElevationController {
  constructor(private readonly elevations: PlatformElevationService) {}

  @Post()
  @ApiOperation({ summary: 'Запросить 30-минутный platform elevation' })
  @ApiResponse({ status: 201, type: PlatformElevationResponseDto })
  request(
    @CurrentSession() actor: ICurrentUser,
    @Body() dto: RequestPlatformElevationDto,
  ): Promise<PlatformElevationResponseDto> {
    return this.elevations.request(actor, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Одобрить WRITE elevation вторым оператором' })
  @ApiResponse({ status: 201, type: PlatformElevationResponseDto })
  approve(
    @CurrentSession() actor: ICurrentUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlatformElevationResponseDto> {
    return this.elevations.approveWrite(actor, id);
  }
}
