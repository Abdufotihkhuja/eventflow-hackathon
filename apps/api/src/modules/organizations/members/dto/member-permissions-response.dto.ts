import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionCatalogItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'events:read' })
  code: string;

  @ApiProperty({ example: 'Просмотр событий' })
  name: string;

  @ApiPropertyOptional({ example: 'Просмотр списка и деталей мероприятий' })
  description?: string | null;

  @ApiProperty({ example: 'events' })
  category: string;

  @ApiProperty({ example: '2026-06-04T00:00:00.000Z' })
  createdAt: Date;
}

export class MemberPermissionsRoleDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Менеджер событий' })
  name: string;
}

export class MemberPermissionsResponseDto {
  @ApiProperty({ type: MemberPermissionsRoleDto })
  role: MemberPermissionsRoleDto;

  @ApiProperty({ type: [PermissionCatalogItemDto] })
  rolePermissions: PermissionCatalogItemDto[];

  @ApiProperty({ type: [PermissionCatalogItemDto] })
  individualPermissions: PermissionCatalogItemDto[];

  @ApiProperty({ type: [PermissionCatalogItemDto] })
  allPermissions: PermissionCatalogItemDto[];

  @ApiProperty({
    example: ['events:read', 'events:create'],
    description: 'Legacy/effective permission codes for compatibility',
  })
  permissions: string[];

  @ApiProperty({
    example: { events: ['events:read'], members: ['members:read'] },
    description: 'Legacy grouping of effective permission codes by category',
  })
  permissionsByCategory: Record<string, string[]>;
}
