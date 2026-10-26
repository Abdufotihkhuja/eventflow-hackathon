import { ApiProperty } from '@nestjs/swagger';
import { MembershipKind, PlatformRole, UserType } from '@prisma/client';

export class SessionAccountDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  firstName?: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  lastName?: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  displayName?: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  avatarUrl?: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  phone?: string | null;
}

export class SessionWorkspaceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  companyName?: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false, nullable: true, type: String })
  logoUrl?: string | null;

  @ApiProperty({ required: false, nullable: true, type: String })
  verificationStatus?: string;
}

export class SessionMembershipDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: MembershipKind })
  kind: MembershipKind;

  @ApiProperty({ required: false, nullable: true, type: String })
  roleName?: string | null;

  @ApiProperty({ type: [String] })
  permissions: string[];

  @ApiProperty({ required: false, nullable: true, type: String })
  organizationMemberId?: string | null;

  @ApiProperty({ type: SessionWorkspaceDto })
  workspace: SessionWorkspaceDto;
}

export class SessionMeResponseDto {
  @ApiProperty({ type: SessionAccountDto })
  currentAccount: SessionAccountDto;

  @ApiProperty({ type: SessionWorkspaceDto, required: false, nullable: true })
  activeWorkspace: SessionWorkspaceDto | null;

  @ApiProperty({ type: [SessionMembershipDto] })
  memberships: SessionMembershipDto[];

  @ApiProperty({ enum: PlatformRole, required: false, nullable: true })
  platformRole?: PlatformRole | null;

  @ApiProperty({ enum: UserType })
  actorType: UserType;

  @ApiProperty({
    type: [String],
    description:
      'Коды прав, закрытых маской доступа организации (тонкое управление ' +
      'супер-админа). Кабинет прячет соответствующие кнопки/страницы у ' +
      'владельца и сотрудников; сервер — источник истины.',
  })
  accessDeniedPermissions: string[];
}
