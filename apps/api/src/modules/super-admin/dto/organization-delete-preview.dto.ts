import { ApiProperty } from '@nestjs/swagger';

/**
 * Сводка зависимостей организации, которые будут безвозвратно удалены
 * вместе с ней. Используется для подтверждающего диалога перед hard delete.
 */
export class OrganizationDeletePreviewDto {
  @ApiProperty({ description: 'ID организации' })
  organizationId!: string;

  @ApiProperty({ description: 'Название организации' })
  name!: string;

  @ApiProperty({ description: 'Email организации' })
  email!: string;

  @ApiProperty({
    description: 'Сотрудники организации (учётные записи персонала)',
  })
  members!: number;

  @ApiProperty({ description: 'Связанные сессии/привязки аккаунтов' })
  linkedAccounts!: number;

  @ApiProperty({ description: 'Приглашения сотрудников' })
  invites!: number;

  @ApiProperty({ description: 'Роли организации' })
  roles!: number;

  @ApiProperty({ description: 'Мероприятия' })
  events!: number;

  @ApiProperty({ description: 'Регистрации участников' })
  registrations!: number;

  @ApiProperty({ description: 'Выпущенные сертификаты' })
  certificates!: number;

  @ApiProperty({ description: 'Сгенерированные билеты' })
  tickets!: number;

  @ApiProperty({ description: 'Шаблоны бейджей' })
  badgeTemplates!: number;

  @ApiProperty({ description: 'Загруженные участниками файлы' })
  fileUploads!: number;

  @ApiProperty({ description: 'Доски задач' })
  boards!: number;

  @ApiProperty({ description: 'Статьи блога' })
  blogPosts!: number;

  @ApiProperty({ description: 'Площадки для аренды' })
  rentalPlaces!: number;

  @ApiProperty({ description: 'Подписчики организации' })
  followers!: number;

  @ApiProperty({
    description:
      'Платёжные/биллинговые записи. В текущей БД биллинг отсутствует, поэтому всегда 0.',
  })
  billingRecords!: number;
}
