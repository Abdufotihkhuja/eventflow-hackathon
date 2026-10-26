import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsPhoneNumber,
  IsUrl,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Gender, UserProfileStatus, Specialization } from '@prisma/client';
import {
  USER_PROFILE_SKILL_CODES,
  UZBEKISTAN_REGIONS,
  USER_PROFILE_LANGUAGE_CODES,
} from '../../../common/constants/user-profile.constants';

export class UpdateUserProfileDto {
  @ApiProperty({ example: 'Иван', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({ example: 'Иванов', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ example: '+998901234567', required: false })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ example: 'Ташкент, Узбекистан', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @ApiProperty({ example: 'Разработчик с 5-летним опытом...', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bio?: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE, required: false })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({
    example: '1990-05-15',
    required: false,
    description: 'Дата рождения (ISO date)',
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({
    example: 'Ташкент',
    required: false,
    description: 'Регион Узбекистана',
    enum: UZBEKISTAN_REGIONS,
  })
  @IsString()
  @IsOptional()
  @IsIn([...UZBEKISTAN_REGIONS])
  region?: string;

  @ApiProperty({
    example: ['ru', 'en'],
    required: false,
    description: 'Языки (коды из списка)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(USER_PROFILE_LANGUAGE_CODES as unknown as string[], { each: true })
  @IsOptional()
  languages?: string[];

  @ApiProperty({
    enum: UserProfileStatus,
    example: UserProfileStatus.WORKER,
    required: false,
  })
  @IsEnum(UserProfileStatus)
  @IsOptional()
  profileStatus?: UserProfileStatus;

  @ApiProperty({
    example: 'ООО «Компания», менеджер',
    required: false,
    description: 'Где работает или учится',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  workOrStudyPlace?: string;

  @ApiProperty({
    example: ['javascript', 'communication', 'leadership'],
    required: false,
    description:
      'Навыки: макс. 3 из списка (коды из GET /public/profile-options)',
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(3, { message: 'Можно выбрать не более 3 навыков' })
  @IsString({ each: true })
  @IsIn(USER_PROFILE_SKILL_CODES as unknown as string[], { each: true })
  @IsOptional()
  skills?: string[];

  @ApiProperty({
    enum: Specialization,
    example: Specialization.PROGRAMMER,
    required: false,
    description: 'Специализация (одна из списка)',
  })
  @IsEnum(Specialization)
  @IsOptional()
  specialization?: Specialization;

  @ApiProperty({
    example: 'Разработчик, увлекаюсь open source.',
    required: false,
    description: 'Коротко о себе (макс. 150 символов)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  shortBio?: string;

  @ApiProperty({ example: 'https://linkedin.com/in/username', required: false })
  @IsUrl()
  @IsOptional()
  linkedinUrl?: string;

  @ApiProperty({ example: 'https://instagram.com/username', required: false })
  @IsUrl()
  @IsOptional()
  instagramUrl?: string;

  @ApiProperty({ example: 'https://facebook.com/username', required: false })
  @IsUrl()
  @IsOptional()
  facebookUrl?: string;

  @ApiProperty({ example: 'https://example.com', required: false })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;
}
