import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, RegistrationQuestion, RegistrationMode } from '@prisma/client';

@Injectable()
export class QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEventAccess(
    eventId: string,
  ): Promise<{ organizationId: string } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
  }

  async findEventRegistrationMode(
    eventId: string,
  ): Promise<{ registrationMode: RegistrationMode } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { registrationMode: true },
    });
  }

  async getNextSortOrder(eventId: string): Promise<number> {
    const maxOrder = await this.prisma.registrationQuestion.aggregate({
      where: { eventId },
      _max: { sortOrder: true },
    });

    return (maxOrder._max.sortOrder ?? -1) + 1;
  }

  async create(data: Prisma.RegistrationQuestionCreateInput): Promise<RegistrationQuestion> {
    return this.prisma.registrationQuestion.create({ data });
  }

  async findByEvent(eventId: string): Promise<RegistrationQuestion[]> {
    return this.prisma.registrationQuestion.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string): Promise<RegistrationQuestion | null> {
    return this.prisma.registrationQuestion.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    data: Prisma.RegistrationQuestionUpdateInput,
  ): Promise<RegistrationQuestion> {
    return this.prisma.registrationQuestion.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.registrationQuestion.delete({
      where: { id },
    });
  }

  async reorder(questionIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      questionIds.map((id, index) =>
        this.prisma.registrationQuestion.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  async findPointsByEvent(eventId: string): Promise<Array<{ points: number }>> {
    return this.prisma.registrationQuestion.findMany({
      where: { eventId },
      select: { points: true },
    });
  }

  async updateEventMaxScore(eventId: string, maxScore: number): Promise<void> {
    await this.prisma.event.update({
      where: { id: eventId },
      data: { maxTestScore: maxScore },
    });
  }
}
