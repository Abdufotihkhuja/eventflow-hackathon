import { Injectable } from '@nestjs/common';
import { Prisma, BlogCategory, BlogPostStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogCategoryQueryDto } from './dto';

export interface BlogCategoryWithPostCount extends BlogCategory {
  _count: {
    posts: number;
  };
}

@Injectable()
export class BlogCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.BlogCategoryCreateInput,
  ): Promise<BlogCategory> {
    return this.prisma.blogCategory.create({ data });
  }

  async findById(id: string): Promise<BlogCategory | null> {
    return this.prisma.blogCategory.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<BlogCategory | null> {
    return this.prisma.blogCategory.findUnique({ where: { slug } });
  }

  async findByName(name: string): Promise<BlogCategory | null> {
    return this.prisma.blogCategory.findUnique({ where: { name } });
  }

  async findMany(
    query: BlogCategoryQueryDto,
  ): Promise<{ data: BlogCategoryWithPostCount[]; total: number }> {
    const { search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BlogCategoryWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.blogCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              posts: {
                where: { status: BlogPostStatus.PUBLISHED, deletedAt: null },
              },
            },
          },
        },
      }),
      this.prisma.blogCategory.count({ where }),
    ]);

    return { data, total };
  }

  async findAllActive(): Promise<BlogCategoryWithPostCount[]> {
    return this.prisma.blogCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            posts: {
              where: { status: BlogPostStatus.PUBLISHED, deletedAt: null },
            },
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.BlogCategoryUpdateInput,
  ): Promise<BlogCategory> {
    return this.prisma.blogCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.blogCategory.delete({ where: { id } });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.blogCategory.count({ where: { id } });
    return count > 0;
  }

  async findAllIds(): Promise<string[]> {
    const rows = await this.prisma.blogCategory.findMany({
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => r.id);
  }

  async reorder(categoryIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      categoryIds.map((id, index) =>
        this.prisma.blogCategory.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
