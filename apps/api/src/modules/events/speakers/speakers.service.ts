import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateSpeakerDto,
  UpdateSpeakerDto,
  InviteSpeakerDto,
} from './dto';
import { Prisma, Speaker, UserType } from '@prisma/client';
import { ICurrentUser } from '../../../common/interfaces';
import { MailService } from '../../mail/mail.service';
import { randomBytes } from 'crypto';
import { MEMBER_INVITATION_EXPIRY_HOURS } from '../../../common/constants/security.constant';
import { SpeakersRepository } from './speakers.repository';
import { pickFallbackTranslation } from '../../translations/dto/business-translation.dto';

@Injectable()
export class SpeakersService {
  constructor(
    private readonly speakersRepository: SpeakersRepository,
    private readonly mailService: MailService,
  ) {}

  /**
   * Создаёт спикера для события
   */
  async create(
    eventId: string,
    dto: CreateSpeakerDto,
    user: ICurrentUser,
  ): Promise<Speaker> {
    await this.checkEventAccess(eventId, user);

    // Получаем максимальный sortOrder
    const nextSortOrder = await this.speakersRepository.getNextSortOrder(eventId);

    const { translations, translationMeta, ...rest } = dto;
    const position = pickFallbackTranslation(translations, 'position', rest.position);
    const company = pickFallbackTranslation(translations, 'company', rest.company);
    const bio = pickFallbackTranslation(translations, 'bio', rest.bio);

    return this.speakersRepository.create({
      ...rest,
      position: position || rest.position,
      company: company || rest.company,
      bio: bio || rest.bio,
      sortOrder: dto.sortOrder ?? nextSortOrder,
      translations: (translations ?? {}) as Prisma.InputJsonValue,
      translationMeta: (translationMeta ?? {}) as Prisma.InputJsonValue,
      event: { connect: { id: eventId } },
    });
  }

  /**
   * Получает всех спикеров события
   */
  async findByEvent(eventId: string): Promise<Speaker[]> {
    return this.speakersRepository.findByEvent(eventId);
  }

  /**
   * Получает спикера по ID
   */
  async findById(id: string): Promise<Speaker> {
    const speaker = await this.speakersRepository.findById(id);

    if (!speaker) {
      throw new NotFoundException('Спикер не найден');
    }

    return speaker;
  }

  /**
   * Обновляет спикера
   */
  async update(
    eventId: string,
    speakerId: string,
    dto: UpdateSpeakerDto,
    user: ICurrentUser,
  ): Promise<Speaker> {
    await this.checkEventAccess(eventId, user);

    const speaker = await this.findById(speakerId);
    if (speaker.eventId !== eventId) {
      throw new NotFoundException('Спикер не найден в этом событии');
    }

    const { translations, translationMeta, ...rest } = dto;
    const updateData: Prisma.SpeakerUpdateInput = { ...rest };

    if (translations !== undefined) {
      updateData.translations = translations as Prisma.InputJsonValue;
      // recompute scalar fallbacks so DB still has a usable plain value
      // (mail templates, search, legacy clients depend on the scalar columns).
      const position = pickFallbackTranslation(translations, 'position', rest.position ?? speaker.position);
      const company = pickFallbackTranslation(translations, 'company', rest.company ?? speaker.company);
      const bio = pickFallbackTranslation(translations, 'bio', rest.bio ?? speaker.bio);
      if (position) updateData.position = position;
      if (company) updateData.company = company;
      if (bio) updateData.bio = bio;
    }
    if (translationMeta !== undefined) {
      updateData.translationMeta = translationMeta as Prisma.InputJsonValue;
    }

    return this.speakersRepository.update(speakerId, updateData);
  }

  /**
   * Удаляет спикера
   */
  async delete(
    eventId: string,
    speakerId: string,
    user: ICurrentUser,
  ): Promise<void> {
    await this.checkEventAccess(eventId, user);

    const speaker = await this.findById(speakerId);
    if (speaker.eventId !== eventId) {
      throw new NotFoundException('Спикер не найден в этом событии');
    }

    await this.speakersRepository.delete(speakerId);
  }

  /**
   * Изменяет порядок спикеров
   */
  async reorder(
    eventId: string,
    speakerIds: string[],
    user: ICurrentUser,
  ): Promise<Speaker[]> {
    await this.checkEventAccess(eventId, user);

    await this.speakersRepository.reorder(speakerIds);

    return this.findByEvent(eventId);
  }

  // === Speaker Invitation Methods ===

  /**
   * Отправляет приглашение спикеру
   * @throws ConflictException если спикер с таким email уже приглашен
   * @throws BadRequestException если не удалось отправить email
   */
  async inviteSpeaker(
    eventId: string,
    dto: InviteSpeakerDto,
    user: ICurrentUser,
  ): Promise<Speaker> {
    // 1. Проверить доступ к событию
    await this.checkEventAccess(eventId, user);

    // 2. Проверить существование User с таким email
    const existingUser = await this.speakersRepository.findUserByEmail(dto.email);

    // 3. Проверить, нет ли уже спикера с таким email для этого события
    const existingSpeaker = await this.speakersRepository.findExistingInvitationByEmail(
      eventId,
      dto.email,
    );

    if (existingSpeaker) {
      throw new ConflictException('Спикер с таким email уже приглашен');
    }

    // 4. Генерация токена (48 часов)
    const invitationToken = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(
      tokenExpiresAt.getHours() + MEMBER_INVITATION_EXPIRY_HOURS,
    );

    // 5. Получить информацию о событии для email
    const event = await this.speakersRepository.findEventInvitationContext(eventId);

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    // 6. Scalar position/company/bio — fallback из translations
    const invitePosition =
      pickFallbackTranslation(dto.translations, 'position', dto.position) || dto.position;
    const inviteCompany =
      pickFallbackTranslation(dto.translations, 'company', dto.company) || dto.company;
    const inviteBio =
      pickFallbackTranslation(dto.translations, 'bio', dto.bio) || dto.bio;

    const speaker = await this.speakersRepository.create({
      event: { connect: { id: eventId } },
      invitedEmail: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      position: invitePosition,
      company: inviteCompany,
      bio: inviteBio,
      linkedinUrl: dto.linkedinUrl,
      instagramUrl: dto.instagramUrl,
      facebookUrl: dto.facebookUrl,
      websiteUrl: dto.websiteUrl,
      translations: (dto.translations ?? {}) as Prisma.InputJsonValue,
      translationMeta: (dto.translationMeta ?? {}) as Prisma.InputJsonValue,
      invitationStatus: 'PENDING',
      invitationToken,
      tokenExpiresAt,
    });

    const displayName = `${dto.firstName} ${dto.lastName}`.trim();

    // 7. Отправить email
    try {
      await this.mailService.sendSpeakerInvitation(
        dto.email,
        displayName,
        event.title,
        event.organization.name,
        invitationToken,
        existingUser !== null, // Указываем нужна ли регистрация
      );
    } catch {
      // Откатываем создание спикера если не удалось отправить email
      await this.speakersRepository.delete(speaker.id);
      throw new BadRequestException(
        'Не удалось отправить приглашение. Проверьте корректность email адреса.',
      );
    }

    return speaker;
  }

  /**
   * Получает информацию о приглашении по токену
   * @throws NotFoundException если приглашение не найдено
   * @throws BadRequestException если срок действия истек или приглашение уже обработано
   */
  async findByInvitationToken(token: string) {
    const speaker = await this.speakersRepository.findInvitationByToken(token);

    if (!speaker) {
      throw new NotFoundException('Приглашение не найдено');
    }

    if (speaker.tokenExpiresAt && speaker.tokenExpiresAt < new Date()) {
      throw new BadRequestException('Срок действия приглашения истек');
    }

    if (speaker.invitationStatus !== 'PENDING') {
      throw new BadRequestException('Приглашение уже обработано');
    }

    // Принять приглашение можно только из-под аккаунта участника с тем же email,
    // поэтому публичная страница должна знать, на какой адрес пришло письмо и
    // нужно ли предложить вход или регистрацию.
    const invitedUser = speaker.invitedEmail
      ? await this.speakersRepository.findUserByEmail(speaker.invitedEmail)
      : null;

    return {
      speakerId: speaker.id,
      eventId: speaker.event.id,
      eventTitle: speaker.event.title,
      eventStartDate: speaker.event.startDate,
      eventEndDate: speaker.event.endDate,
      organizationName: speaker.event.organization.name,
      role: 'SPEAKER',
      firstName: speaker.firstName,
      lastName: speaker.lastName,
      invitedEmail: speaker.invitedEmail,
      userExists: !!invitedUser,
    };
  }

  /**
   * Принимает приглашение спикера
   * @throws NotFoundException если приглашение или пользователь не найдены
   * @throws BadRequestException если email не совпадает
   */
  async acceptInvitation(token: string, userId: string) {
    // 1. Найти Speaker по токену (проверка токена внутри)
    const invitationInfo = await this.findByInvitationToken(token);

    const speaker = await this.speakersRepository.findById(invitationInfo.speakerId);

    if (!speaker) {
      throw new NotFoundException('Приглашение не найдено');
    }

    // 2. Проверить что User существует
    const user = await this.speakersRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // 3. Проверить что email совпадает
    if (user.email !== speaker.invitedEmail) {
      throw new BadRequestException('Email не совпадает с приглашенным');
    }

    // Speaker — отдельное event-bound представление. Принятие приглашения
    // связывает verified User, но не создаёт Registration и не выдаёт роль
    // участника: участие оформляется только через registration flow.
    await this.speakersRepository.update(speaker.id, {
      user: { connect: { id: userId } },
      invitationStatus: 'ACCEPTED',
      invitationToken: null,
      tokenExpiresAt: null,
      rejectionReason: null,
    });

    return { message: 'Приглашение принято' };
  }

  /**
   * Отклоняет приглашение спикера
   * @throws NotFoundException если приглашение не найдено
   */
  async rejectInvitation(token: string, userId: string, reason?: string) {
    // Найти Speaker по токену (проверка токена внутри)
    const invitationInfo = await this.findByInvitationToken(token);

    const speaker = await this.speakersRepository.findById(invitationInfo.speakerId);

    if (!speaker) {
      throw new NotFoundException('Приглашение не найдено');
    }

    const user = await this.speakersRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.email !== speaker.invitedEmail) {
      throw new BadRequestException('Email не совпадает с приглашенным');
    }

    await this.speakersRepository.update(speaker.id, {
      invitationStatus: 'REJECTED',
      invitationToken: null,
      tokenExpiresAt: null,
      rejectionReason: reason ?? null,
    });

    return { message: 'Приглашение отклонено' };
  }

  /**
   * Повторная отправка приглашения
   * @throws NotFoundException если спикер не найден
   * @throws BadRequestException если статус не PENDING
   */
  async resendInvitation(
    eventId: string,
    speakerId: string,
    user: ICurrentUser,
  ) {
    await this.checkEventAccess(eventId, user);

    const speaker =
      await this.speakersRepository.findSpeakerWithInvitationContext(speakerId);

    if (!speaker || speaker.eventId !== eventId) {
      throw new NotFoundException('Спикер не найден');
    }

    if (speaker.invitationStatus !== 'PENDING') {
      throw new BadRequestException(
        'Можно повторно отправить только ожидающее приглашение',
      );
    }

    if (!speaker.invitedEmail) {
      throw new BadRequestException(
        'У спикера отсутствует email для приглашения',
      );
    }

    // Генерация нового токена
    const invitationToken = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(
      tokenExpiresAt.getHours() + MEMBER_INVITATION_EXPIRY_HOURS,
    );

    await this.speakersRepository.update(speakerId, {
      invitationToken,
      tokenExpiresAt,
    });

    // Проверяем существует ли User
    const existingUser = speaker.invitedEmail
      ? await this.speakersRepository.findUserByEmail(speaker.invitedEmail)
      : null;

    const displayName = `${speaker.firstName} ${speaker.lastName}`.trim();
    await this.mailService.resendSpeakerInvitation(
      speaker.invitedEmail,
      displayName,
      speaker.event.title,
      speaker.event.organization.name,
      invitationToken,
      existingUser !== null,
    );

    return { message: 'Приглашение отправлено повторно' };
  }

  // === Private methods ===

  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(user);

    const event = await this.speakersRepository.findEventAccess(eventId);

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
      'Только организаторы могут управлять спикерами',
    );
  }
}
