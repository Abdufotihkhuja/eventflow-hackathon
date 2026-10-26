import { ApiProperty } from '@nestjs/swagger';
import {
  BuiltInEventRecipientRoleKey,
  EventRecipientRoleAssignmentStatus,
  EventRecipientRoleKind,
  EventRecipientRoleSourceType,
  EventRecipientSourceType,
  EventRecipientStatus,
} from '@prisma/client';

export class ArtifactRecipientRoleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: EventRecipientRoleKind })
  kind!: EventRecipientRoleKind;

  @ApiProperty({ type: String, nullable: true })
  builtInKey!: BuiltInEventRecipientRoleKey | null;

  @ApiProperty({ enum: EventRecipientRoleAssignmentStatus })
  assignmentStatus!: EventRecipientRoleAssignmentStatus;

  @ApiProperty({ type: String, nullable: true })
  assignmentId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  assignmentSourceType!: EventRecipientRoleSourceType | null;
}

export class ArtifactRecipientSourceSummaryDto {
  @ApiProperty({ type: String, nullable: true })
  userId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  registrationId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  speakerId!: string | null;

  @ApiProperty({ enum: EventRecipientSourceType, isArray: true })
  sourceTypes!: EventRecipientSourceType[];
}

export class ArtifactRecipientDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: String, nullable: true })
  firstName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  email!: string | null;

  @ApiProperty({ enum: EventRecipientStatus })
  status!: EventRecipientStatus;

  @ApiProperty({ type: [ArtifactRecipientRoleDto] })
  roles!: ArtifactRecipientRoleDto[];

  @ApiProperty({ type: ArtifactRecipientSourceSummaryDto })
  sources!: ArtifactRecipientSourceSummaryDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ArtifactRecipientCreateResultDto {
  @ApiProperty({ type: ArtifactRecipientDto })
  recipient!: ArtifactRecipientDto;

  @ApiProperty()
  created!: boolean;

  @ApiProperty()
  reused!: boolean;
}

export class ArtifactRecipientRoleAssignmentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  roleId!: string;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty({ enum: EventRecipientRoleAssignmentStatus })
  status!: EventRecipientRoleAssignmentStatus;

  @ApiProperty({ type: String, nullable: true })
  sourceType!: EventRecipientRoleSourceType | null;
}

export class ArtifactRecipientRoleAssignmentResultDto {
  @ApiProperty({ type: ArtifactRecipientDto })
  recipient!: ArtifactRecipientDto;

  @ApiProperty({ type: ArtifactRecipientRoleAssignmentSummaryDto })
  assignment!: ArtifactRecipientRoleAssignmentSummaryDto;
}

export class ArtifactRecipientsPageDto {
  @ApiProperty({ type: [ArtifactRecipientDto] })
  data!: ArtifactRecipientDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class RecipientRoleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: EventRecipientRoleKind })
  kind!: EventRecipientRoleKind;

  @ApiProperty({ type: String, nullable: true })
  builtInKey!: BuiltInEventRecipientRoleKey | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isArtifactEligible!: boolean;

  @ApiProperty({ type: String, nullable: true })
  sourceMapping!: EventRecipientRoleSourceType | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
