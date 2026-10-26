import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import {
  VerificationRepository,
  ICodeFilters,
} from '../verification/verification.repository';
import { VerificationCodeType, UserType } from '@prisma/client';

@ApiTags('super-admin')
@Controller('super-admin/verification-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class VerificationCodesController {
  constructor(
    private readonly verificationRepository: VerificationRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Получить историю всех кодов верификации' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: VerificationCodeType })
  @ApiQuery({ name: 'actorType', required: false, enum: UserType })
  @ApiQuery({ name: 'isUsed', required: false, type: Boolean })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    example: '-createdAt',
  })
  @ApiResponse({
    status: 200,
    description: 'Список кодов верификации',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              code: { type: 'string', example: '123456' },
              email: { type: 'string', example: 'user@example.com' },
              type: { type: 'string', example: 'EMAIL_VERIFICATION' },
              actorType: { type: 'string', example: 'USER' },
              actorId: { type: 'string', example: 'uuid', nullable: true },
              newEmail: {
                type: 'string',
                example: 'newemail@example.com',
                nullable: true,
              },
              isUsed: { type: 'boolean', example: false },
              usedAt: { type: 'string', format: 'date-time', nullable: true },
              expiresAt: { type: 'string', format: 'date-time' },
              attempts: { type: 'number', example: 0 },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
        totalPages: { type: 'number', example: 3 },
      },
    },
  })
  async getAllCodes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('email') email?: string,
    @Query('type') type?: VerificationCodeType,
    @Query('actorType') actorType?: UserType,
    @Query('isUsed') isUsed?: string,
    @Query('sort') sort?: string,
  ) {
    const filters: ICodeFilters = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      email,
      type,
      actorType,
      isUsed: isUsed !== undefined ? isUsed === 'true' : undefined,
      sort: sort || '-createdAt',
    };

    return this.verificationRepository.getAllCodes(filters);
  }
}
