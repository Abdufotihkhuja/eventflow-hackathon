import { Injectable } from '@nestjs/common';
import { Prisma, EventCategory, EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { upcomingPublicEventWhere } from '../../common/events';
import { CategoryQueryDto } from './dto';

export interface CategoryWithEventCount extends EventCategory {
  _count: {
    events: number;
  };
}

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.EventCategoryCreateInput): Promise<EventCategory> {
    return this.prisma.eventCategory.create({ data });
  }

  async findById(id: string): Promise<EventCategory | null> {
    return this.prisma.eventCategory.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<EventCategory | null> {
    return this.prisma.eventCategory.findUnique({ where: { slug } });
  }

  async findByName(name: string): Promise<EventCategory | null> {
    return this.prisma.eventCategory.findUnique({ where: { name } });
  }

  async findMany(
    query: CategoryQueryDto,
  ): Promise<{ data: CategoryWithEventCount[]; total: number }> {
    const { search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EventCategoryWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.eventCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              events: {
                where: { status: EventStatus.PUBLISHED },
              },
            },
          },
        },
      }),
      this.prisma.eventCategory.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Активные категории для публичного каталога.
   *
   * `_count.events` — только предстоящие и публично видимые события, ровно те,
   * что вернёт `GET /public/events?filter=upcoming&category=<slug>`. Иначе
   * карточка категории на витрине обещает события, а лендинг категории
   * открывается пустым (прошедшие, приватные и события неподтверждённых
   * организаций в публичный список не попадают).
   */
  async findAllActive(): Promise<CategoryWithEventCount[]> {
    return this.prisma.eventCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            events: { where: upcomingPublicEventWhere() },
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.EventCategoryUpdateInput,
  ): Promise<EventCategory> {
    return this.prisma.eventCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.eventCategory.delete({ where: { id } });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.eventCategory.count({ where: { id } });
    return count > 0;
  }

  async findAllIds(): Promise<string[]> {
    const rows = await this.prisma.eventCategory.findMany({
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => r.id);
  }

  async reorder(categoryIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      categoryIds.map((id, index) =>
        this.prisma.eventCategory.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
