import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogPublicController } from './blog-public.controller';
import { BlogService } from './blog.service';
import { BlogRepository } from './blog.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { BlogCategoriesModule } from '../blog-categories/blog-categories.module';

// Comments submodule
import { BlogCommentsController } from './comments/blog-comments.controller';
import { BlogCommentsService } from './comments/blog-comments.service';
import { BlogCommentsRepository } from './comments/blog-comments.repository';

// Likes submodule
import { BlogLikesController } from './likes/blog-likes.controller';
import { BlogLikesService } from './likes/blog-likes.service';
import { BlogLikesRepository } from './likes/blog-likes.repository';

// Saved submodule
import { SavedBlogPostsService } from './saved/saved-blog-posts.service';
import { SavedBlogPostsRepository } from './saved/saved-blog-posts.repository';

@Module({
  imports: [PrismaModule, BlogCategoriesModule],
  controllers: [
    BlogController,
    BlogPublicController,
    BlogCommentsController,
    BlogLikesController,
  ],
  providers: [
    BlogService,
    BlogRepository,
    BlogCommentsService,
    BlogCommentsRepository,
    BlogLikesService,
    BlogLikesRepository,
    SavedBlogPostsService,
    SavedBlogPostsRepository,
  ],
  exports: [BlogService, BlogRepository, SavedBlogPostsService],
})
export class BlogModule {}
