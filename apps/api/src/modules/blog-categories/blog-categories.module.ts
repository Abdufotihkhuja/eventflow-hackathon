import { Module } from '@nestjs/common';
import {
  BlogCategoriesController,
  AdminBlogCategoriesController,
} from './blog-categories.controller';
import { BlogCategoriesService } from './blog-categories.service';
import { BlogCategoriesRepository } from './blog-categories.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BlogCategoriesController, AdminBlogCategoriesController],
  providers: [BlogCategoriesService, BlogCategoriesRepository],
  exports: [BlogCategoriesService, BlogCategoriesRepository],
})
export class BlogCategoriesModule {}
