import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DownloadTicketsDto, TicketDesign } from './dto';
import { RegistrationStatus, UserType } from '@prisma/client';
import type { ICurrentUser } from '../../common/interfaces';
import {
  TicketGenerationResult,
  TicketGenerationService,
} from './application/ticket-generation.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketGenerationService: TicketGenerationService,
  ) {}

  async generateMyTicket(
    registrationId: string,
    design: TicketDesign,
    user: ICurrentUser,
  ): Promise<TicketGenerationResult> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }

    const registration = await this.getRegistrationAccess(registrationId);
    if (registration.userId !== user.sub) {
      throw new ForbiddenException('Нет доступа к этой регистрации');
    }

    if (registration.status !== RegistrationStatus.APPROVED) {
      throw new BadRequestException(
        'Билет доступен только для одобренных регистраций',
      );
    }

    return this.ticketGenerationService.getOrScheduleSingleTicket(
      registrationId,
      design,
      user,
    );
  }

  async generateTicketForOrganizer(
    eventId: string,
    registrationId: string,
    design: TicketDesign,
    user: ICurrentUser,
  ): Promise<TicketGenerationResult> {
    await this.checkEventAccess(eventId, user);

    const registration = await this.getRegistrationAccess(registrationId);
    if (registration.eventId !== eventId) {
      throw new BadRequestException(
        'Регистрация не принадлежит этому мероприятию',
      );
    }

    if (registration.status !== RegistrationStatus.APPROVED) {
      throw new BadRequestException(
        'Билет доступен только для одобренных регистраций',
      );
    }

    return this.ticketGenerationService.getOrScheduleSingleTicket(
      registrationId,
      design,
      user,
    );
  }

  async generateAllTicketsZip(
    eventId: string,
    dto: DownloadTicketsDto,
    user: ICurrentUser,
  ): Promise<TicketGenerationResult> {
    await this.checkEventAccess(eventId, user);
    return this.ticketGenerationService.getOrScheduleTicketsZip(
      eventId,
      dto,
      user,
    );
  }

  async getTicketUrlByQrCode(
    qrCode: string,
    design: TicketDesign,
  ): Promise<string> {
    const registration = await this.prisma.registration.findUnique({
      where: { qrCode },
      select: { id: true, eventId: true },
    });

    if (!registration) {
      throw new NotFoundException('Регистрация не найдена');
    }

    return `/api/v1/events/${registration.eventId}/tickets/${registration.id}?design=${design}`;
  }

  private async getRegistrationAccess(registrationId: string) {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        userId: true,
        eventId: true,
        status: true,
      },
    });

    if (!registration) {
      throw new NotFoundException('Регистрация не найдена');
    }

    return registration;
  }

  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(user);

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    if (event.organizationId !== organizationId) {
      throw new ForbiddenException('Нет доступа к этому мероприятию');
    }
  }

  private getOrganizationId(user: ICurrentUser): string {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }
    if (user.type === UserType.MEMBER && user.organizationId) {
      return user.organizationId;
    }
    throw new ForbiddenException(
      'Только организаторы могут управлять билетами',
    );
  }
}
