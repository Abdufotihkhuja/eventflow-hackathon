import { ApiPropertyOptional } from '@nestjs/swagger';
import { BlogPostStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum AdminBlogPostSortBy {
  CREATED_AT = 'createdAt',
  PUBLISHED_AT = 'publishedAt',
  LIKES = 'likesCount',
  VIEWS = 'viewsCount',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class AdminBlogPostsQueryDto {
  @ApiPropertyOptional({ description: 'Номер страницы', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Количество на странице', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Поиск по названию' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Статус статьи',
    enum: BlogPostStatus,
  })
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @ApiPropertyOptional({ description: 'ID организации' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Сортировка по полю',
    enum: AdminBlogPostSortBy,
    default: AdminBlogPostSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(AdminBlogPostSortBy)
  sortBy?: AdminBlogPostSortBy = AdminBlogPostSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Порядок сортировки',
    enum: AdminSortOrder,
    default: AdminSortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.DESC;
}
