import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RegistrationFileStatus,
  RegistrationFileUpload,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RegistrationFilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestion(eventId: string, questionId: string) {
    return this.prisma.registrationQuestion.findFirst({
      where: { id: questionId, eventId },
      select: {
        id: true,
        eventId: true,
        type: true,
        isRequired: true,
        fileUploadConfig: true,
        event: { select: { organizationId: true } },
      },
    });
  }

  async findEventOrganization(
    eventId: string,
  ): Promise<{ organizationId: string } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
  }

  countPendingForUser(
    eventId: string,
    questionId: string,
    userId: string,
  ): Promise<number> {
    return this.prisma.registrationFileUpload.count({
      where: {
        eventId,
        questionId,
        uploadedById: userId,
        status: RegistrationFileStatus.PENDING,
        registrationId: null,
      },
    });
  }

  findPendingForUser(
    eventId: string,
    questionId: string,
    userId: string,
  ): Promise<RegistrationFileUpload[]> {
    return this.prisma.registrationFileUpload.findMany({
      where: {
        eventId,
        questionId,
        uploadedById: userId,
        status: RegistrationFileStatus.PENDING,
        registrationId: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Все PENDING-файлы пользователя по событию — черновик незавершённой
   * регистрации (в отличие от findPendingForUser не сужается до одного вопроса).
   */
  findPendingDraftForUser(
    eventId: string,
    userId: string,
  ): Promise<RegistrationFileUpload[]> {
    return this.prisma.registrationFileUpload.findMany({
      where: {
        eventId,
        uploadedById: userId,
        status: RegistrationFileStatus.PENDING,
        registrationId: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Брошенные черновики: неотправленные файлы старше cutoff, чей владелец
   * так и не вернулся. Батчами, чтобы один прогон уборки не тянул всю таблицу.
   */
  findStaleDrafts(
    cutoff: Date,
    limit: number,
  ): Promise<RegistrationFileUpload[]> {
    return this.prisma.registrationFileUpload.findMany({
      where: {
        status: RegistrationFileStatus.PENDING,
        registrationId: null,
        createdAt: { lt: cutoff },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  create(
    data: Prisma.RegistrationFileUploadCreateInput,
  ): Promise<RegistrationFileUpload> {
    return this.prisma.registrationFileUpload.create({ data });
  }

  findById(id: string): Promise<RegistrationFileUpload | null> {
    return this.prisma.registrationFileUpload.findUnique({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.registrationFileUpload.delete({ where: { id } });
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.registrationFileUpload.deleteMany({
      where: { id: { in: ids } },
    });
  }

  /** Attach a set of pending files to a registration (idempotent updateMany). */
  async claim(ids: string[], registrationId: string): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.registrationFileUpload.updateMany({
      where: { id: { in: ids } },
      data: { registrationId, status: RegistrationFileStatus.ATTACHED },
    });
  }

  findAttachedByRegistration(
    registrationId: string,
  ): Promise<RegistrationFileUpload[]> {
    return this.prisma.registrationFileUpload.findMany({
      where: { registrationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteByRegistration(registrationId: string): Promise<void> {
    await this.prisma.registrationFileUpload.deleteMany({
      where: { registrationId },
    });
  }

  /** Organizer view: files attached to a registration within an event. */
  findAttachedForEventRegistration(
    eventId: string,
    registrationId: string,
  ): Promise<RegistrationFileUpload[]> {
    return this.prisma.registrationFileUpload.findMany({
      where: {
        eventId,
        registrationId,
        status: RegistrationFileStatus.ATTACHED,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
