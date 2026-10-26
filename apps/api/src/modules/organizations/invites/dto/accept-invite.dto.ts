import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

/**
 * Body for accepting an invite. The password is required ONLY when the invitee
 * has no existing account (a brand-new user). For an existing user the request
 * must instead be authenticated (bearer token) and the field is ignored.
 *
 * When present, the password must satisfy the same strength rules as public
 * registration so the new account is consistent with the rest of the platform.
 */
export class AcceptInviteDto {
  @ApiPropertyOptional({
    example: 'NewPassword123!',
    description:
      'Обязателен только при создании нового аккаунта. Для существующего пользователя не требуется.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message:
      'Пароль должен содержать заглавную и строчную буквы, цифру и спецсимвол',
  })
  password?: string;
}
