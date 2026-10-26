import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AgendaItem, Prisma } from '@prisma/client';

@Injectable()
export class AgendaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getNextSortOrder(eventId: string): Promise<number> {
    const maxOrder = await this.prisma.agendaItem.aggregate({
      where: { eventId },
      _max: { sortOrder: true },
    });

    return (maxOrder._max.sortOrder ?? -1) + 1;
  }

  async create(data: Prisma.AgendaItemCreateInput): Promise<AgendaItem> {
    return this.prisma.agendaItem.create({
      data,
      include: { speakers: true, room: true },
    });
  }

  async findByEvent(eventId: string): Promise<AgendaItem[]> {
    return this.prisma.agendaItem.findMany({
      where: { eventId },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { sortOrder: 'asc' }],
      include: { speakers: true, room: true },
    });
  }

  async findById(id: string): Promise<AgendaItem | null> {
    return this.prisma.agendaItem.findUnique({
      where: { id },
      include: { speakers: true, room: true },
    });
  }

  async findOverlapCandidates(
    eventId: string,
    date: Date,
    excludeId?: string,
  ): Promise<AgendaItem[]> {
    return this.prisma.agendaItem.findMany({
      where: {
        eventId,
        date,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
      orderBy: [{ startTime: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async update(
    id: string,
    data: Prisma.AgendaItemUpdateInput,
  ): Promise<AgendaItem> {
    return this.prisma.agendaItem.update({
      where: { id },
      data,
      include: { speakers: true, room: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.agendaItem.delete({ where: { id } });
  }

  async reorder(itemIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      itemIds.map((id, index) =>
        this.prisma.agendaItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  async findEventAccess(
    eventId: string,
  ): Promise<{ organizationId: string; startDate: Date; endDate: Date } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true, startDate: true, endDate: true },
    });
  }

  async findEventOrganizationAccess(
    eventId: string,
  ): Promise<{ organizationId: string } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
  }
}
