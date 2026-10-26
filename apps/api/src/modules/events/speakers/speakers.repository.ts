import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Prisma,
  Speaker,
  SpeakerInvitationStatus,
} from '@prisma/client';

@Injectable()
export class SpeakersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEventAccess(
    eventId: string,
  ): Promise<{ organizationId: string } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
  }

  async getNextSortOrder(eventId: string): Promise<number> {
    const maxOrder = await this.prisma.speaker.aggregate({
      where: { eventId },
      _max: { sortOrder: true },
    });

    return (maxOrder._max.sortOrder ?? -1) + 1;
  }

  async create(data: Prisma.SpeakerCreateInput): Promise<Speaker> {
    return this.prisma.speaker.create({ data });
  }

  async findByEvent(eventId: string): Promise<Speaker[]> {
    return this.prisma.speaker.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string): Promise<Speaker | null> {
    return this.prisma.speaker.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.SpeakerUpdateInput): Promise<Speaker> {
    return this.prisma.speaker.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.speaker.delete({ where: { id } });
  }

  async reorder(speakerIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      speakerIds.map((id, index) =>
        this.prisma.speaker.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  async findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }

  async findUserById(id: string): Promise<{ id: string; email: string } | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
  }

  async findExistingInvitationByEmail(
    eventId: string,
    email: string,
  ): Promise<Speaker | null> {
    return this.prisma.speaker.findFirst({
      where: { eventId, invitedEmail: email },
    });
  }

  async findEventInvitationContext(eventId: string): Promise<{
    title: string;
    organization: { name: string };
  } | null> {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organization: { select: { name: true } } },
    });
  }

  async findInvitationByToken(token: string): Promise<{
    id: string;
    eventId: string;
    firstName: string;
    lastName: string;
    invitedEmail: string | null;
    invitationStatus: SpeakerInvitationStatus;
    tokenExpiresAt: Date | null;
    event: {
      id: string;
      title: string;
      startDate: Date;
      endDate: Date;
      organization: { name: string };
    };
  } | null> {
    return this.prisma.speaker.findUnique({
      where: { invitationToken: token },
      include: {
        event: {
          include: { organization: { select: { name: true } } },
        },
      },
    });
  }

  async findSpeakerWithInvitationContext(id: string): Promise<{
    id: string;
    eventId: string;
    firstName: string;
    lastName: string;
    invitedEmail: string | null;
    invitationStatus: SpeakerInvitationStatus;
    event: {
      title: string;
      organization: { name: string };
    };
  } | null> {
    return this.prisma.speaker.findUnique({
      where: { id },
      include: {
        event: {
          include: { organization: { select: { name: true } } },
        },
      },
    });
  }

}
