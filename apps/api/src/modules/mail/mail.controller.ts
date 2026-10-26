import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MailService, ISendToParticipantsDto } from './mail.service';
import { JwtAuthGuard, PermissionsGuard } from '../../common/guards';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import type { ICurrentUser } from '../../common/interfaces';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsUUID,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';

class SendToParticipantsDto implements ISendToParticipantsDto {
  @ApiProperty({ example: 'Важное уведомление' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'Текст сообщения для участников...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2'],
    description: 'ID регистраций для отправки',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  registrationIds?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Отправить всем одобренным участникам',
  })
  @IsBoolean()
  @IsOptional()
  sendToAll?: boolean;
}

@ApiTags('event-mail')
@Controller('events/:eventId/mail')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  @RequirePermissions(PERMISSIONS.EVENTS_UPDATE)
  @ApiOperation({ summary: 'Отправить письма участникам мероприятия' })
  async sendToParticipants(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: SendToParticipantsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.mailService.sendToEventParticipants(eventId, dto, user);
  }
}
