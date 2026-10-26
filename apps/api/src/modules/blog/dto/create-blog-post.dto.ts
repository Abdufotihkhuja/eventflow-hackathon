import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import {
  MAX_TITLE_LENGTH,
  MAX_SHORT_DESCRIPTION_LENGTH,
} from '../blog.constants';
import type {
  BusinessTranslationMeta,
  BusinessTranslations,
} from '../../translations/dto/business-translation.dto';
import {
  IsBusinessTranslationMeta,
  IsBusinessTranslations,
} from '../../translations/dto/business-translation.dto';
import type {
  RichTranslationMeta,
  RichTranslations,
} from '../../translations/dto/rich-translation.dto';
import {
  IsRichTranslationMeta,
  IsRichTranslations,
} from '../../translations/dto/rich-translation.dto';

const BLOG_POST_TRANSLATION_FIELDS = ['title', 'shortDescription'] as const;
const BLOG_POST_RICH_TRANSLATION_FIELDS = ['content'] as const;

export class CreateBlogPostDto {
  @ApiProperty({
    description: 'Заголовок статьи',
    example: 'Как организовать успешную конференцию',
    maxLength: MAX_TITLE_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TITLE_LENGTH)
  title: string;

  @ApiProperty({
    description: 'Контент статьи в формате BlockNote JSON',
    example: [
      {
        id: 'block-1',
        type: 'paragraph',
        content: [{ type: 'text', text: 'Контент статьи...' }],
      },
    ],
  })
  @IsNotEmpty()
  content: any; // BlockNote document JSON

  @ApiPropertyOptional({
    description:
      'URL-slug статьи (a-z, 0-9, дефис). Если не передан — генерируется из заголовка.',
    example: 'kak-organizovat-konferentsiyu',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug может содержать только строчные латинские буквы, цифры и дефисы',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Краткое описание статьи',
    maxLength: MAX_SHORT_DESCRIPTION_LENGTH,
    example: 'Практические советы по организации IT-конференций',
  })
  @IsString()
  @IsOptional()
  @MaxLength(MAX_SHORT_DESCRIPTION_LENGTH)
  shortDescription?: string;

  @ApiPropertyOptional({
    description:
      'Plain-text translations for blog post title and shortDescription. Locale keys: ru, uz, en.',
    example: {
      title: { ru: 'Заголовок', uz: 'Sarlavha', en: 'Title' },
      shortDescription: {
        ru: 'Краткое описание',
        uz: 'Qisqa tavsif',
        en: 'Short description',
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslations(BLOG_POST_TRANSLATION_FIELDS)
  translations?: BusinessTranslations;

  @ApiPropertyOptional({
    description: 'Translation metadata for blog post title and shortDescription.',
    example: {
      title: {
        ru: { status: 'manual' },
        en: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsBusinessTranslationMeta(BLOG_POST_TRANSLATION_FIELDS)
  translationMeta?: BusinessTranslationMeta;

  @ApiPropertyOptional({
    description:
      'Rich BlockNote translations for blog post content. Locale keys: ru, uz, en.',
    example: {
      content: {
        ru: [
          {
            id: 'block-1',
            type: 'paragraph',
            content: [{ type: 'text', text: 'Контент', styles: {} }],
            children: [],
          },
        ],
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsRichTranslations(BLOG_POST_RICH_TRANSLATION_FIELDS)
  richTranslations?: RichTranslations;

  @ApiPropertyOptional({
    description: 'Rich translation metadata for blog post content.',
    example: {
      content: {
        ru: { status: 'manual' },
        en: { status: 'auto_translated', sourceLocale: 'ru' },
      },
    },
    additionalProperties: true,
  })
  @IsOptional()
  @IsRichTranslationMeta(BLOG_POST_RICH_TRANSLATION_FIELDS)
  richTranslationMeta?: RichTranslationMeta;

  @ApiPropertyOptional({
    description: 'Путь к обложке статьи (относительный путь или URL)',
    example: '/uploads/image.jpg',
  })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'Разрешены ли комментарии',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  commentsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Массив ID тегов',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tagIds?: string[];

  @ApiPropertyOptional({
    description:
      'ID категории блога (одна на статью). Список: GET /api/v1/blog-categories. ' +
      'Передайте null или пустую строку, чтобы убрать категорию.',
    example: 'uuid-of-blog-category',
    nullable: true,
  })
  @ValidateIf(
    (o: { categoryId?: string | null }) =>
      o.categoryId !== null && o.categoryId !== '',
  )
  @IsUUID('4')
  @IsOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({
    description:
      'ID пользователя-автора (byline). Если задан, публичная страница ' +
      'статьи отдаёт `BlogPosting.author = Person` (с именем/аватаром/' +
      'био из профиля пользователя) для E-E-A-T. Если null/не передан — ' +
      'автор = организация (текущее поведение).',
    example: 'uuid-of-user',
    nullable: true,
  })
  @ValidateIf(
    (o: { authorId?: string | null }) =>
      o.authorId !== null && o.authorId !== '',
  )
  @IsUUID('4')
  @IsOptional()
  authorId?: string | null;
}
