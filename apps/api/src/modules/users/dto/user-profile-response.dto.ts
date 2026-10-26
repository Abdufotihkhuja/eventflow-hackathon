import { ApiProperty } from '@nestjs/swagger';

/**
 * Профиль аккаунта (UserProfile = User без passwordHash + needsProfileInfo).
 * Типизируются поля, которые читает экран Profile мобильного приложения;
 * имена совпадают с runtime-ключами Prisma `User` (firstName, avatarUrl, …).
 */
export class UserProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true, type: String })
  firstName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  lastName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ nullable: true, type: String })
  location!: string | null;

  @ApiProperty({ nullable: true, type: String })
  bio!: string | null;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiProperty()
  isPublicProfile!: boolean;

  @ApiProperty()
  isOnboardingCompleted!: boolean;

  @ApiProperty()
  profileInfoCompleted!: boolean;

  @ApiProperty({ description: 'Нужно ли показать popup доп. полей профиля' })
  needsProfileInfo!: boolean;

  @ApiProperty({ nullable: true, type: String, description: 'Gender (MALE / FEMALE) или null' })
  gender!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  dateOfBirth!: Date | null;

  @ApiProperty({ nullable: true, type: String })
  region!: string | null;

  @ApiProperty({ type: [String] })
  languages!: string[];

  @ApiProperty({ nullable: true, type: String })
  workOrStudyPlace!: string | null;

  @ApiProperty({ type: [String] })
  skills!: string[];

  @ApiProperty({ nullable: true, type: String })
  shortBio!: string | null;

  @ApiProperty({ nullable: true, type: String })
  linkedinUrl!: string | null;

  @ApiProperty({ nullable: true, type: String })
  instagramUrl!: string | null;

  @ApiProperty({ nullable: true, type: String })
  facebookUrl!: string | null;

  @ApiProperty({ nullable: true, type: String })
  websiteUrl!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
