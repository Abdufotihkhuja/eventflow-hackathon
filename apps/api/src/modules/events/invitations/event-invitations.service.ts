import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EventAccessType,
  EventStatus,
  InviteStatus,
  type Event,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ICurrentUser } from '../../../common/interfaces';
import { generateEventInvitationToken } from '../../../common/events';
import { MailService } from '../../mail/mail.service';
import { EventsService } from '../events.service';
import type { SendPrivateInvitationsDto } from './dto/send-private-invitations.dto';

const INVITATION_SELECT = {
  id: true,
  email: true,
  status: true,
  sendCount: true,
  lastSentAt: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

type SkipReason = 'ALREADY_ACCEPTED';

/**
 * Personal email invitations to PRIVATE events, managed from the workspace.
 * Each send issues a fresh token, so only the latest emailed link works.
 * The public side (page access, registration) only checks the token hash.
 */
@Injectable()
export class EventInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly mailService: MailService,
  ) {}

  async list(eventId: string, user: ICurrentUser) {
    const event = await this.eventsService.findByIdWithAccess(eventId, user);
    this.assertPrivate(event);
    return this.prisma.eventInvitation.findMany({
      where: { eventId },
      select: INVITATION_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Invites each email. Already invited (pending or revoked) guests get a new
   * link; guests who already registered through their invite are skipped.
   */
  async send(
    eventId: string,
    dto: SendPrivateInvitationsDto,
    user: ICurrentUser,
  ) {
    const event = await this.getSendableEvent(eventId, user);
    const emails = [...new Set(dto.emails.map(normalizeEmail))];

    const existing = await this.prisma.eventInvitation.findMany({
      where: { eventId, email: { in: emails } },
      select: { email: true, status: true },
    });
    const accepted = new Set(
      existing
        .filter((i) => i.status === InviteStatus.ACCEPTED)
        .map((i) => i.email),
    );

    const organizationName = await this.organizationName(event);
    const sent: string[] = [];
    const skipped: { email: string; reason: SkipReason }[] = [];
    for (const email of emails) {
      if (accepted.has(email)) {
        skipped.push({ email, reason: 'ALREADY_ACCEPTED' });
        continue;
      }
      const { rawToken, tokenHash } = generateEventInvitationToken();
      const now = new Date();
      const invitation = await this.prisma.eventInvitation.upsert({
        where: { eventId_email: { eventId, email } },
        create: {
          eventId,
          email,
          tokenHash,
          lastSentAt: now,
          invitedByUserId: user.sub,
        },
        update: {
          tokenHash,
          status: InviteStatus.PENDING,
          revokedAt: null,
          lastSentAt: now,
          sendCount: { increment: 1 },
        },
        select: { id: true, sendCount: true },
      });
      await this.mail(event, organizationName, email, rawToken, invitation);
      sent.push(email);
    }

    return { sent, skipped };
  }

  /** Re-sends with a new link (the previous one stops working); reopens a revoked invite. */
  async resend(eventId: string, invitationId: string, user: ICurrentUser) {
    const event = await this.getSendableEvent(eventId, user);
    const current = await this.findInvitation(eventId, invitationId);
    if (current.status === InviteStatus.ACCEPTED) {
      throw new ConflictException('Гость уже зарегистрировался по приглашению');
    }

    const { rawToken, tokenHash } = generateEventInvitationToken();
    const invitation = await this.prisma.eventInvitation.update({
      where: { id: invitationId },
      data: {
        tokenHash,
        status: InviteStatus.PENDING,
        revokedAt: null,
        lastSentAt: new Date(),
        sendCount: { increment: 1 },
      },
      select: INVITATION_SELECT,
    });
    await this.mail(
      event,
      await this.organizationName(event),
      invitation.email,
      rawToken,
      {
        id: invitation.id,
        sendCount: invitation.sendCount,
      },
    );
    return invitation;
  }

  /** Voids a pending link. An accepted invite is a registration now: cancel that instead. */
  async revoke(eventId: string, invitationId: string, user: ICurrentUser) {
    const event = await this.eventsService.findByIdWithAccess(eventId, user);
    this.assertPrivate(event);
    const current = await this.findInvitation(eventId, invitationId);
    if (current.status === InviteStatus.ACCEPTED) {
      throw new ConflictException(
        'Гость уже зарегистрировался. Отмените его регистрацию в списке участников',
      );
    }

    return this.prisma.eventInvitation.update({
      where: { id: invitationId },
      data: { status: InviteStatus.REVOKED, revokedAt: new Date() },
      select: INVITATION_SELECT,
    });
  }

  private async getSendableEvent(eventId: string, user: ICurrentUser) {
    const event = await this.eventsService.findByIdWithAccess(eventId, user);
    this.assertPrivate(event);
    // The emailed link opens the public page, which exists only once published.
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        'Приглашения можно отправлять только по опубликованному событию',
      );
    }
    return event;
  }

  private assertPrivate(event: Event): void {
    if (event.accessType !== EventAccessType.PRIVATE) {
      throw new BadRequestException(
        'Персональные приглашения доступны только для приватных событий',
      );
    }
  }

  private async findInvitation(eventId: string, invitationId: string) {
    const invitation = await this.prisma.eventInvitation.findFirst({
      where: { id: invitationId, eventId },
      select: { status: true },
    });
    if (!invitation) {
      throw new NotFoundException('Приглашение не найдено');
    }
    return invitation;
  }

  private async organizationName(event: Event): Promise<string> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: event.organizationId },
      select: { companyName: true, name: true },
    });
    return organization?.companyName || organization?.name || 'Организатор';
  }

  private async mail(
    event: Event,
    organizationName: string,
    email: string,
    rawToken: string,
    invitation: { id: string; sendCount: number },
  ): Promise<void> {
    await this.mailService.sendEventInvitation({
      eventId: event.id,
      email,
      eventTitle: event.title,
      organizationName,
      inviteLink: this.eventsService.buildPublicInviteLink(
        event.slug,
        rawToken,
      ),
      // Each send rotates the token: dedupe per send, never across sends.
      sendKey: `${invitation.id}:${invitation.sendCount}`,
    });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
