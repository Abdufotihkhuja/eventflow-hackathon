import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public } from '../../common/decorators';
import { OptionalJwtAuthGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { PublicOrganizationProfileDto } from './dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':id/public')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Получить публичный профиль организатора' })
  @ApiParam({ name: 'id', description: 'ID организации' })
  @ApiResponse({
    status: 200,
    description: 'Публичный профиль организатора',
    type: PublicOrganizationProfileDto,
  })
  @ApiResponse({ status: 404, description: 'Организация не найдена' })
  async getPublicProfile(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Query('locale') locale: string | undefined,
    @CurrentUser() user: ICurrentUser | undefined,
  ): Promise<PublicOrganizationProfileDto> {
    return this.organizationsService.getPublicProfile(
      organizationId,
      user?.sub,
      locale,
    );
  }
}
