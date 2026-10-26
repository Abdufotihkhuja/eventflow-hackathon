import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InviteStatus } from '@prisma/client';
import {
  InviteAuthMethod,
  InviteNextAction,
} from '../invites.constants';

/** Minimal role descriptor shown on invite screens. */
export class InviteRoleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

/** Admin-facing view of a pending/created invite. Never includes the token. */
export class InviteSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: InviteStatus })
  status: InviteStatus;

  @ApiProperty({ type: InviteRoleDto })
  role: InviteRoleDto;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({
    description: 'Существует ли уже пользователь с таким email на платформе',
  })
  userExists: boolean;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Когда приглашённый отказался (status = DECLINED)',
  })
  declinedAt?: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Комментарий приглашённого к отказу, если он его оставил',
  })
  declineReason?: string | null;
}

/**
 * Public, safe payload returned by `GET /organizations/invites/:token`. Contains
 * only what the invite-accept screen needs — no token hash, no userId, no
 * password material, no internal audit fields.
 */
export class InviteInspectionDto {
  @ApiProperty({
    enum: InviteStatus,
    description: 'Эффективный статус (PENDING с истёкшим сроком отдаётся EXPIRED)',
  })
  status: InviteStatus;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: InviteRoleDto })
  role: InviteRoleDto;

  @ApiProperty({ description: 'Есть ли уже аккаунт у этого email' })
  userExists: boolean;

  @ApiProperty({
    isArray: true,
    enum: ['password', 'google', 'linkedin'],
    description: 'Доступные способы входа существующего пользователя',
  })
  authMethods: InviteAuthMethod[];

  @ApiProperty()
  expiresAt: Date;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Совпадает ли email текущего авторизованного пользователя с приглашением (null, если не авторизован)',
  })
  currentUserMatch: boolean | null;

  @ApiProperty({ enum: InviteNextAction })
  nextAction: InviteNextAction;
}

/**
 * Приглашение глазами приглашённого: то, что показывает его личный кабинет,
 * пока письмо ещё не открыто. Токена здесь нет — принятие идёт по id и
 * подтверждается совпадением email авторизованного пользователя.
 */
export class MyInviteDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  organizationName: string;

  @ApiPropertyOptional({ nullable: true })
  organizationLogoUrl?: string | null;

  @ApiProperty({ type: InviteRoleDto })
  role: InviteRoleDto;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;
}

/** Result of a successful accept. */
export class AcceptInviteResultDto {
  @ApiProperty({ example: 'MEMBERSHIP_CREATED' })
  code: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  organizationMemberId: string;

  @ApiProperty({ type: InviteRoleDto })
  role: InviteRoleDto;

  @ApiProperty({
    description:
      'true — новому пользователю нужно войти заданным паролем; false — пользователь уже авторизован и может открыть workspace',
  })
  requiresLogin: boolean;
}
