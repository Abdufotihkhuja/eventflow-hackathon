import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { UserType, Permission } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PermissionCatalogItemDto } from '../members/dto';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserType.ORGANIZATION, UserType.MEMBER, UserType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Получить список всех доступных прав' })
  @ApiResponse({ status: 200, type: [PermissionCatalogItemDto] })
  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  }
}
