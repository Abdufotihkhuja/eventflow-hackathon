import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '@prisma/client';

/**
 * Роль в организации
 */
export class MemberRoleDto {
  @ApiProperty({ example: 'uuid-роли' })
  id: string;

  @ApiProperty({ example: 'Менеджер событий' })
  name: string;

  @ApiProperty({
    example: false,
    description: 'Системная роль (нельзя удалить)',
  })
  isSystem: boolean;
}

/**
 * Организация сотрудника (краткая информация)
 */
export class MemberOrganizationDto {
  @ApiProperty({ example: 'uuid-организации' })
  id: string;

  @ApiProperty({ example: 'EventFlow Inc.' })
  name: string;

  @ApiProperty({ example: 'EventFlow Inc.' })
  companyName: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  logoUrl?: string;
}

/**
 * Полный профиль сотрудника (для /members/me)
 */
export class MemberProfileResponseDto {
  @ApiProperty({ example: 'uuid-сотрудника' })
  id: string;

  @ApiProperty({ example: 'member@company.com' })
  email: string;

  @ApiProperty({ example: 'Иван' })
  firstName: string;

  @ApiProperty({ example: 'Иванов' })
  lastName: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Менеджер проектов' })
  position?: string;

  @ApiPropertyOptional({ example: 'Отдел разработки' })
  department?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Опытный менеджер с 5-летним стажем...' })
  bio?: string;

  @ApiPropertyOptional({ example: 'Ташкент, Узбекистан' })
  location?: string;

  @ApiProperty({ example: MemberStatus.ACTIVE, enum: MemberStatus })
  status: MemberStatus;

  // Настройки приватности
  @ApiProperty({ example: true })
  isPublicProfile: boolean;

  @ApiProperty({ example: false })
  showEmail: boolean;

  @ApiProperty({ example: false })
  showPhone: boolean;

  @ApiProperty({
    example: false,
    description: 'Завершен ли онбординг сотрудника',
  })
  isOnboardingCompleted: boolean;

  // Связи
  @ApiProperty({ type: MemberRoleDto })
  role: MemberRoleDto;

  @ApiProperty({ type: MemberOrganizationDto })
  organization: MemberOrganizationDto;

  // Права доступа
  @ApiProperty({
    example: ['events:read', 'events:create', 'boards:read'],
    description: 'Список кодов разрешений сотрудника',
  })
  permissions: string[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;
}

/**
 * Публичный профиль сотрудника (для просмотра другими)
 * Содержит только публичные данные в зависимости от настроек приватности
 */
export class PublicMemberProfileDto {
  @ApiProperty({ example: 'uuid-сотрудника' })
  id: string;

  @ApiProperty({ example: 'Иван' })
  firstName: string;

  @ApiProperty({ example: 'Иванов' })
  lastName: string;

  @ApiPropertyOptional({
    example: 'member@company.com',
    description: 'Только если showEmail = true',
  })
  email?: string;

  @ApiPropertyOptional({
    example: '+998901234567',
    description: 'Только если showPhone = true',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'Менеджер проектов' })
  position?: string;

  @ApiPropertyOptional({ example: 'Отдел разработки' })
  department?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Опытный менеджер с 5-летним стажем...' })
  bio?: string;

  @ApiPropertyOptional({ example: 'Ташкент, Узбекистан' })
  location?: string;

  @ApiProperty({ type: MemberRoleDto })
  role: MemberRoleDto;
}
