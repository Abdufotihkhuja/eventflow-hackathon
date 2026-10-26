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
import { MembersService } from '../organizations/members/members.service';
import {
  MemberPermissionsResponseDto,
  MemberProfileResponseDto,
  UpdateMemberPrivacyDto,
  UpdateMemberProfileDto,
} from '../organizations/members/dto';

@ApiTags('workspace-members')
@Controller('workspace/members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkspaceMembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('me')
  @Roles(UserType.MEMBER)
  @ApiOperation({ summary: 'Получить свой профиль участника workspace' })
  @ApiResponse({ status: 200, type: MemberProfileResponseDto })
  async getMe(
    @CurrentUser() user: ICurrentUser,
  ): Promise<MemberProfileResponseDto> {
    return this.membersService.getMyProfile(user.sub);
  }

  @Patch('me')
  @Roles(UserType.MEMBER)
  @ApiOperation({ summary: 'Обновить свой профиль участника workspace' })
  @ApiResponse({ status: 200, type: MemberProfileResponseDto })
  async updateMe(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateMemberProfileDto,
  ): Promise<MemberProfileResponseDto> {
    return this.membersService.updateMyProfile(user.sub, dto);
  }

  @Patch('me/privacy')
  @Roles(UserType.MEMBER)
  @ApiOperation({
    summary: 'Обновить настройки приватности участника workspace',
  })
  @ApiResponse({ status: 200, type: MemberProfileResponseDto })
  async updatePrivacy(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateMemberPrivacyDto,
  ): Promise<MemberProfileResponseDto> {
    return this.membersService.updateMyPrivacy(user.sub, dto);
  }

  @Post('me/avatar')
  @Roles(UserType.MEMBER)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Загрузить аватар участника workspace' })
  @ApiResponse({ status: 200, type: MemberProfileResponseDto })
  async uploadAvatar(
    @CurrentUser() user: ICurrentUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MemberProfileResponseDto> {
    return this.membersService.uploadMyAvatar(user.sub, file);
  }

  @Delete('me/avatar')
  @Roles(UserType.MEMBER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить аватар участника workspace' })
  @ApiResponse({ status: 200, type: MemberProfileResponseDto })
  async deleteAvatar(
    @CurrentUser() user: ICurrentUser,
  ): Promise<MemberProfileResponseDto> {
    return this.membersService.deleteMyAvatar(user.sub);
  }

  @Post('me/complete-onboarding')
  @Roles(UserType.MEMBER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Завершить онбординг участника workspace',
    description: 'Отметить, что сотрудник завершил процесс онбординга',
  })
  @ApiResponse({ status: 200, type: MemberProfileResponseDto })
  async completeOnboarding(
    @CurrentUser() user: ICurrentUser,
  ): Promise<MemberProfileResponseDto> {
    return this.membersService.completeOnboarding(user.sub);
  }

  @Get('me/permissions')
  @Roles(UserType.MEMBER)
  @ApiOperation({ summary: 'Получить свои права доступа участника workspace' })
  @ApiResponse({
    status: 200,
    description: 'Список прав сотрудника с группировкой по категориям',
    type: MemberPermissionsResponseDto,
  })
  async getPermissions(
    @CurrentUser() user: ICurrentUser,
  ): Promise<MemberPermissionsResponseDto> {
    return this.membersService.getMyPermissions(user.sub);
  }
}
