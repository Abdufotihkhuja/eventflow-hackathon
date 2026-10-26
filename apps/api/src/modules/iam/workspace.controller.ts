import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import {
  OrganizationEntity,
  UpdateOrganizationDto,
} from '../organizations/dto';
import { OrganizationsService } from '../organizations/organizations.service';

@ApiTags('workspace')
@Controller('workspace')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkspaceController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  @Roles(UserType.ORGANIZATION, UserType.MEMBER)
  @ApiOperation({ summary: 'Получить текущий workspace profile' })
  @ApiResponse({ status: 200, type: OrganizationEntity })
  async getMe(@CurrentUser() user: ICurrentUser): Promise<OrganizationEntity> {
    const orgId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId!;

    return this.organizationsService.findById(orgId);
  }

  @Patch('me')
  @Roles(UserType.ORGANIZATION)
  @ApiOperation({ summary: 'Обновить workspace profile' })
  @ApiResponse({ status: 200, type: OrganizationEntity })
  async updateMe(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationEntity> {
    return this.organizationsService.update(user.sub, dto);
  }

  @Post('me/logo')
  @Roles(UserType.ORGANIZATION)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Загрузить логотип workspace' })
  @ApiResponse({ status: 200, type: OrganizationEntity })
  async uploadLogo(
    @CurrentUser() user: ICurrentUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<OrganizationEntity> {
    return this.organizationsService.uploadLogo(user.sub, file);
  }

  @Delete('me/logo')
  @Roles(UserType.ORGANIZATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить логотип workspace' })
  @ApiResponse({ status: 200, type: OrganizationEntity })
  async deleteLogo(
    @CurrentUser() user: ICurrentUser,
  ): Promise<OrganizationEntity> {
    return this.organizationsService.deleteLogo(user.sub);
  }

  @Post('me/complete-onboarding')
  @Roles(UserType.ORGANIZATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Завершить онбординг workspace' })
  @ApiResponse({ status: 200, type: OrganizationEntity })
  async completeOnboarding(
    @CurrentUser() user: ICurrentUser,
  ): Promise<OrganizationEntity> {
    return this.organizationsService.completeOnboarding(user.sub);
  }

  @Post('me/complete-company-info')
  @Roles(UserType.ORGANIZATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Завершить заполнение доп. полей workspace',
  })
  @ApiResponse({ status: 200, type: OrganizationEntity })
  async completeCompanyInfo(
    @CurrentUser() user: ICurrentUser,
  ): Promise<OrganizationEntity> {
    return this.organizationsService.completeCompanyInfo(user.sub);
  }

  @Delete('me')
  @Roles(UserType.ORGANIZATION)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить workspace (soft delete)' })
  @ApiResponse({ status: 204 })
  async deleteMe(@CurrentUser() user: ICurrentUser): Promise<void> {
    return this.organizationsService.softDelete(user.sub);
  }
}
