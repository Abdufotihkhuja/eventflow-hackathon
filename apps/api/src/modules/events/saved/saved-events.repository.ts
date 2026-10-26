import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SavedEvent, Event } from '@prisma/client';

export interface ISavedEventWithEvent extends SavedEvent {
  event: Event & {
    organization: {
      id: string;
      companyName: string;
      logoUrl: string | null;
    };
    _count: {
      registrations: number;
    };
  };
}

export interface IPaginatedSavedEvents {
  data: ISavedEventWithEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SavedEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, eventId: string): Promise<SavedEvent> {
    return this.prisma.savedEvent.create({
      data: {
        user: { connect: { id: userId } },
        event: { connect: { id: eventId } },
      },
    });
  }

  async unsave(userId: string, eventId: string): Promise<void> {
    await this.prisma.savedEvent.deleteMany({
      where: { userId, eventId },
    });
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<IPaginatedSavedEvents> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.savedEvent.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { savedAt: 'desc' },
        include: {
          event: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  companyName: true,
                  logoUrl: true,
                  translations: true,
                },
              },
              _count: {
                select: { registrations: true },
              },
            },
          },
        },
      }),
      this.prisma.savedEvent.count({ where: { userId } }),
    ]);

    return {
      data: data as ISavedEventWithEvent[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exists(userId: string, eventId: string): Promise<boolean> {
    const count = await this.prisma.savedEvent.count({
      where: { userId, eventId },
    });
    return count > 0;
  }
}
