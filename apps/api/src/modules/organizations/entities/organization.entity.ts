import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider, OrganizationVerificationStatus, Prisma } from '@prisma/client';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../translations/dto/business-translation.dto';

/**
 * Entity для возврата данных организации
 * Преобразует внутреннюю модель БД в унифицированный API формат
 */
export class OrganizationEntity {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Test OOO' })
  organizationName: string;

  @ApiProperty({ example: 'org@example.com' })
  email: string;

  @ApiProperty({
    example: '123456789',
    description: 'ИНН организации (используется сотрудниками при входе)',
    required: false,
  })
  inn?: string | null;

  @ApiProperty({ example: 'Описание организации', required: false })
  description?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    example: {
      companyName: {
        ru: 'ООО EventFlow',
        uz: 'EventFlow MChJ',
        en: 'EventFlow LLC',
      },
      description: {
        ru: 'Организация мероприятий',
        uz: 'Tadbirlar tashkilotchisi',
        en: 'Event organizer',
      },
    },
    description:
      'Plain-text translations for public organization business fields.',
  })
  translations?: BusinessTranslations | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: true,
      },
    },
    example: {
      companyName: {
        ru: { status: 'manual' },
        en: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    description: 'Translation metadata for public organization business fields.',
  })
  translationMeta?: BusinessTranslationMeta | null;

  @ApiProperty({ example: '+79001234567', required: false })
  phone?: string | null;

  @ApiProperty({
    example: 'г. Ташкент, ул. Мирабадская, д. 1',
    required: false,
  })
  address?: string | null;

  @ApiProperty({ example: 'https://eventflow.uz', required: false })
  website?: string | null;

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  logoUrl?: string | null;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.EMAIL })
  authProvider: AuthProvider;

  @ApiProperty({ example: false })
  isEmailVerified: boolean;

  @ApiProperty({
    example: false,
    description: 'Завершен ли онбординг организации',
  })
  isOnboardingCompleted: boolean;

  @ApiProperty({
    example: 'Technology',
    required: false,
    description: 'Отрасль компании',
  })
  industry?: string | null;

  @ApiProperty({
    example: 50,
    required: false,
    description: 'Размер компании (число сотрудников)',
  })
  companySize?: number | null;

  @ApiProperty({
    example: false,
    description:
      'Заполнены ли доп. поля компании; если false — показывать popup только организатору (не сотрудникам)',
  })
  companyInfoCompleted: boolean;

  @ApiProperty({
    example: false,
    description: 'Включена ли для организации функция арендуемых площадок',
  })
  placesFeatureEnabled: boolean;

  @ApiProperty({
    example: true,
    description:
      'Нужно ли показать popup «Заполните доп. поля» (для организатора)',
  })
  needsCompanyInfo: boolean;

  @ApiProperty({
    enum: OrganizationVerificationStatus,
    example: OrganizationVerificationStatus.PENDING,
    description: 'Статус верификации организации супер-админом',
  })
  verificationStatus: OrganizationVerificationStatus;

  @ApiProperty({
    example: 'Недостаточно информации о компании',
    required: false,
    description: 'Причина отклонения (если статус REJECTED)',
  })
  rejectionReason?: string | null;

  @ApiProperty({
    example: '2025-12-23T10:00:00.000Z',
    required: false,
    description: 'Дата верификации',
  })
  verifiedAt?: Date | null;

  @ApiProperty({ example: '2025-12-23T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-12-23T10:00:00.000Z' })
  updatedAt: Date;

  /**
   * Создает entity из модели Prisma Organization
   * @param organization - модель Organization из БД
   */
  static fromPrisma(organization: {
    id: string;
    email: string;
    name: string;
    companyName: string;
    translations?: Prisma.JsonValue;
    translationMeta?: Prisma.JsonValue;
    inn?: string | null;
    description?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    authProvider: AuthProvider;
    isEmailVerified: boolean;
    isOnboardingCompleted: boolean;
    industry?: string | null;
    companySize?: number | null;
    companyInfoCompleted: boolean;
    placesFeatureEnabled: boolean;
    verificationStatus: OrganizationVerificationStatus;
    rejectionReason?: string | null;
    verifiedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationEntity {
    const entity = new OrganizationEntity();
    entity.id = organization.id;
    entity.organizationName = organization.companyName; // Приоритет companyName
    entity.email = organization.email;
    entity.inn = organization.inn;
    entity.description = organization.description;
    entity.translations = organization.translations as BusinessTranslations;
    entity.translationMeta = organization.translationMeta as BusinessTranslationMeta;
    entity.phone = organization.phone;
    entity.address = organization.address;
    entity.website = organization.website;
    entity.logoUrl = organization.logoUrl;
    entity.authProvider = organization.authProvider;
    entity.isEmailVerified = organization.isEmailVerified;
    entity.isOnboardingCompleted = organization.isOnboardingCompleted;
    entity.industry = organization.industry;
    entity.companySize = organization.companySize;
    entity.companyInfoCompleted = organization.companyInfoCompleted;
    entity.placesFeatureEnabled = organization.placesFeatureEnabled;
    entity.needsCompanyInfo = !organization.companyInfoCompleted;
    entity.verificationStatus = organization.verificationStatus;
    entity.rejectionReason = organization.rejectionReason;
    entity.verifiedAt = organization.verifiedAt;
    entity.createdAt = organization.createdAt;
    entity.updatedAt = organization.updatedAt;
    return entity;
  }
}
