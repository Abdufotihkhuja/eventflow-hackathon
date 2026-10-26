import { ApiProperty } from '@nestjs/swagger';

export enum ScopeAvailabilityDto {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  ARCHIVED = 'ARCHIVED',
  RECONCILIATION_REQUIRED = 'RECONCILIATION_REQUIRED',
}

export class SessionV2AccountDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true, type: String })
  displayName: string | null;
}

export class PersonalScopeV2Dto {
  @ApiProperty({ enum: ['PERSONAL'] })
  kind: 'PERSONAL';

  @ApiProperty({ enum: ScopeAvailabilityDto })
  availability: ScopeAvailabilityDto;

  @ApiProperty({ nullable: true, type: String })
  userId: string | null;
}

export class OrganizationScopeV2Dto {
  @ApiProperty({ enum: ['ORGANIZATION'] })
  kind: 'ORGANIZATION';

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  membershipId: string;

  @ApiProperty({ enum: ScopeAvailabilityDto })
  availability: ScopeAvailabilityDto;

  @ApiProperty({ nullable: true, type: String })
  roleId: string | null;

  @ApiProperty({ nullable: true, type: String })
  roleLabel: string | null;

  @ApiProperty({ type: [String] })
  capabilities: string[];

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  tombstoneUntil: string | null;
}

export class SessionV2ResponseDto {
  @ApiProperty({ type: SessionV2AccountDto })
  account: SessionV2AccountDto;

  @ApiProperty({ type: PersonalScopeV2Dto })
  personalScope: PersonalScopeV2Dto;

  @ApiProperty({ type: [OrganizationScopeV2Dto] })
  organizationScopes: OrganizationScopeV2Dto[];
}

export class ResolvedScopeV2ResponseDto {
  @ApiProperty({ enum: ['PERSONAL', 'ORGANIZATION'] })
  kind: 'PERSONAL' | 'ORGANIZATION';

  @ApiProperty()
  accountId: string;

  @ApiProperty({ nullable: true, type: String })
  userId: string | null;

  @ApiProperty({ nullable: true, type: String })
  organizationId: string | null;

  @ApiProperty({ nullable: true, type: String })
  membershipId: string | null;

  @ApiProperty({ type: [String] })
  capabilities: string[];
}
