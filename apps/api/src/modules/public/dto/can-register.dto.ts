import { ApiProperty } from '@nestjs/swagger';

/**
 * Результат проверки возможности регистрации на событие.
 * Все поля плоские — типизируются точно (см. PublicService.canRegister).
 */
export class CanRegisterDto {
  @ApiProperty({ description: 'Можно ли зарегистрироваться' })
  canRegister!: boolean;

  @ApiProperty({
    required: false,
    description: 'Человекочитаемая причина запрета (если canRegister=false)',
  })
  reason?: string;

  @ApiProperty({
    required: false,
    enum: [
      'PRIVATE',
      'NOT_PUBLISHED',
      'DEADLINE_PASSED',
      'CAPACITY_FULL',
      'MANUALLY_CLOSED',
    ],
    description: 'Стабильный код причины для локализации на клиенте',
  })
  reasonCode?: string;

  @ApiProperty({ description: 'EventAccessType (OPEN / INVITE_ONLY / PRIVATE)' })
  accessType!: string;

  @ApiProperty({ description: 'Требуется ли inviteCode для регистрации' })
  requiresInviteCode!: boolean;
}
