import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  RegistrationsRepository,
  IPaginatedRegistrations,
} from './registrations.repository';
import { TicketNumberService } from '../tickets/application/ticket-number.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateRegistrationDto,
  RegistrationQueryDto,
  MyRegistrationsQueryDto,
  RejectRegistrationDto,
  CancelRegistrationDto,
  UpdateRegistrationDto,
} from './dto';
import {
  Registration,
  RegistrationStatus,
  UserType,
  EventStatus,
  EventAccessType,
  ParticipantRole,
  RegistrationMode,
  TestEvaluationType,
  QuestionCategory,
  QuestionType,
  RegistrationQuestion,
  Event,
  EntitlementKey,
  NotificationType,
  InviteStatus,
} from '@prisma/client';
import { ICurrentUser } from '../../common/interfaces';
import { hashEventInvitationToken } from '../../common/events';
import { v4 as uuidv4 } from 'uuid';
import { RegistrationEventSnapshot } from './registrations.repository';
import { localizeEventBusinessFields } from '../translations/localized-event-fields.util';
import { RegistrationFilesService } from '../registration-files/registration-files.service';
import { CapacityClampService } from '../billing/entitlements/capacity-clamp.service';
import { EntitlementsService } from '../billing/entitlements/entitlements.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegistrationChainService } from '../notifications/chains/registration-chain.service';
import {
  CapExceededException,
  OrgSuspendedException,
} from '../billing/errors/billing-errors';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly registrationsRepository: RegistrationsRepository,
    private readonly ticketNumberService: TicketNumberService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly registrationFilesService: RegistrationFilesService,
    private readonly capacityClamp: CapacityClampService,
    private readonly entitlementsService: EntitlementsService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly registrationChain: RegistrationChainService,
  ) {}

  /**
   * Регистрация пользователя на событие
   * @param inviteCode - код приглашения для INVITE_ONLY событий
   */
  async register(
    eventId: string,
    dto: CreateRegistrationDto,
    user: ICurrentUser,
    inviteCode?: string,
  ): Promise<Registration> {
    // Только обычные пользователи могут регистрироваться
    if (user.type !== UserType.USER) {
      throw new ForbiddenException(
        'Только пользователи могут регистрироваться на мероприятия',
      );
    }

    // Проверяем существование события
    const event =
      await this.registrationsRepository.findEventRegistrationSnapshot(eventId);

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    // Проверяем статус события
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Мероприятие недоступно для регистрации');
    }

    // Ручной переключатель организатора (имеет приоритет над авто-логикой)
    if (event.registrationOpen === false) {
      throw new BadRequestException(
        'Регистрация на это мероприятие закрыта организатором',
      );
    }

    // Проверяем тип доступа к событию. PRIVATE: inviteCode несёт персональный
    // токен приглашения; заявка «съедает» его в транзакции создания ниже.
    let privateInvitationId: string | null = null;
    if (event.accessType === EventAccessType.PRIVATE) {
      const invitation = inviteCode
        ? await this.prisma.eventInvitation.findFirst({
            where: {
              eventId,
              tokenHash: hashEventInvitationToken(inviteCode),
              status: InviteStatus.PENDING,
            },
            select: { id: true },
          })
        : null;
      if (!invitation) {
        throw new ForbiddenException(
          'Приглашение недействительно или уже использовано',
        );
      }
      privateInvitationId = invitation.id;
    }

    if (event.accessType === EventAccessType.INVITE_ONLY) {
      if (!inviteCode || inviteCode !== event.inviteCode) {
        throw new ForbiddenException(
          'Регистрация на это мероприятие доступна только по приглашению',
        );
      }
    }

    // Проверяем дедлайн регистрации
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      throw new BadRequestException('Регистрация закрыта');
    }

    // E-17: события приостановленной организации закрыты для новых регистраций.
    if (await this.entitlementsService.isOrgSuspended(event.organizationId)) {
      throw new OrgSuspendedException({
        suspendedAt: new Date().toISOString(),
      });
    }

    // Лимит участников (E-3): min(организаторский, тарифный) с постоянным
    // грандфазерингом pre-cutover событий; счёт PENDING+APPROVED (OQ-A2-4).
    const capInfo = await this.capacityClamp.effectiveEventCap(
      event.organizationId,
      { createdAt: event.createdAt, maxParticipants: event.maxParticipants },
    );
    // Быстрая ранняя проверка (без блокировки) — отсекает явно переполненные
    // события до тяжёлой работы. Авторитетная атомарная проверка — под
    // advisory-lock в транзакции создания ниже (иначе TOCTOU → перепродажа мест).
    if (capInfo.cap !== null) {
      const count = await this.registrationsRepository.countByEventAndStatus(
        eventId,
        [RegistrationStatus.PENDING, RegistrationStatus.APPROVED],
      );
      this.assertWithinCap(capInfo, count);
    }

    // Проверяем, не зарегистрирован ли уже (активная регистрация)
    const existing = await this.registrationsRepository.findByEventAndUser(
      eventId,
      user.sub,
    );
    const activeStatuses: RegistrationStatus[] = [
      RegistrationStatus.PENDING,
      RegistrationStatus.APPROVED,
    ];
    if (existing && activeStatuses.includes(existing.status)) {
      throw new ConflictException('Вы уже зарегистрированы на это мероприятие');
    }

    // Проверяем обязательные вопросы (кроме FILE_UPLOAD — для них наличие
    // файла проверяется отдельно по факту загруженных файлов, а не по
    // присланному answer, см. prepareForSubmit ниже).
    const requiredQuestions = event.registrationQuestions.filter(
      (q) => q.isRequired && q.type !== QuestionType.FILE_UPLOAD,
    );
    if (requiredQuestions.length > 0) {
      const answeredIds = dto.answers?.map((a) => a.questionId) || [];
      const missingRequired = requiredQuestions.filter(
        (q) => !answeredIds.includes(q.id),
      );
      if (missingRequired.length > 0) {
        throw new BadRequestException(
          `Необходимо ответить на обязательные вопросы: ${missingRequired.map((q) => q.question).join(', ')}`,
        );
      }
    }

    // Валидируем загруженные файлы для вопросов FILE_UPLOAD и формируем
    // server-side answer-строки (список id файлов). Источник истины — файлы,
    // загруженные этим пользователем, а не присланные клиентом id.
    const preparedFileAnswers =
      await this.registrationFilesService.prepareForSubmit(
        eventId,
        event.registrationQuestions,
        user,
      );
    const fileQuestionIds = new Set(
      event.registrationQuestions
        .filter((q) => q.type === QuestionType.FILE_UPLOAD)
        .map((q) => q.id),
    );
    // Ответы клиента по файловым вопросам игнорируем и заменяем серверными.
    const mergedAnswers = [
      ...(dto.answers?.filter((a) => !fileQuestionIds.has(a.questionId)) ?? []),
      ...preparedFileAnswers.map((p) => ({
        questionId: p.questionId,
        answer: p.answer,
      })),
    ];

    // Если режим TEST - проверяем ответы и считаем баллы
    let testResult: {
      score: number;
      maxScore: number;
      passed: boolean;
    } | null = null;
    if (event.registrationMode === RegistrationMode.TEST) {
      testResult = await this.calculateTestScore(
        event.registrationQuestions,
        mergedAnswers,
        event,
      );

      // Если AUTO_REJECT и тест не пройден - отклоняем регистрацию
      if (
        event.testEvaluationType === TestEvaluationType.AUTO_REJECT &&
        !testResult.passed
      ) {
        throw new BadRequestException(
          `Тест не пройден. Набрано ${testResult.score} из ${testResult.maxScore} баллов. Требуется минимум ${event.minTestScore}.`,
        );
      }
    }

    // Определяем статус регистрации
    const status = this.determineStatus(event, testResult);

    // Генерируем QR-код
    const qrCode = uuidv4();

    const baseData = {
      status,
      qrCode,
      role: dto.role || ParticipantRole.PARTICIPANT,
      ...(dto.travelStartDate && {
        travelStartDate: new Date(dto.travelStartDate),
      }),
      ...(dto.travelEndDate && { travelEndDate: new Date(dto.travelEndDate) }),
      ...(dto.preparationDays !== undefined && {
        preparationDays: dto.preparationDays,
      }),
      ...(testResult && {
        testScore: testResult.score,
        testMaxScore: testResult.maxScore,
        testPassed: testResult.passed,
        testCompletedAt: new Date(),
      }),
    };

    // Повторная регистрация после отмены/отклонения — обновляем существующую запись
    const isReregistration = !!(
      existing &&
      (existing.status === RegistrationStatus.CANCELLED ||
        existing.status === RegistrationStatus.REJECTED)
    );

    // Атомарная секция вместимости: advisory-lock по событию сериализует
    // одновременные регистрации, авторитетный пересчёт под локом + вставка в
    // одной транзакции устраняют TOCTOU-перепродажу мест сверх cap. При
    // превышении транзакция откатывается (регистрация не создаётся).
    const registration = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('event-reg:' || ${eventId}))`;

      if (capInfo.cap !== null) {
        const currentCount =
          await this.registrationsRepository.countByEventAndStatus(
            eventId,
            [RegistrationStatus.PENDING, RegistrationStatus.APPROVED],
            tx,
          );
        // Реригистрация (CANCELLED/REJECTED → PENDING) тоже занимает место, а
        // текущая строка не входит в count — проверяем как для новой заявки.
        this.assertWithinCap(capInfo, currentCount);
      }

      let created: Registration;
      if (isReregistration && existing) {
        created = await this.registrationsRepository.recreateForReregistration(
          existing.id,
          {
            ...baseData,
            ...(!testResult && {
              testScore: null,
              testMaxScore: null,
              testPassed: null,
              testCompletedAt: null,
            }),
            answers: mergedAnswers.map((a) => ({
              questionId: a.questionId,
              answer: a.answer,
            })),
          },
          tx,
        );
      } else {
        created = await this.registrationsRepository.create(
          {
            ...baseData,
            event: { connect: { id: eventId } },
            user: { connect: { id: user.sub } },
            ...(mergedAnswers.length && {
              answers: {
                create: mergedAnswers.map((a) => ({
                  answer: a.answer,
                  question: { connect: { id: a.questionId } },
                })),
              },
            }),
          },
          tx,
        );
      }

      if (privateInvitationId) {
        // Условный апдейт: два параллельных запроса с одной ссылкой не пройдут оба.
        const accepted = await tx.eventInvitation.updateMany({
          where: { id: privateInvitationId, status: InviteStatus.PENDING },
          data: {
            status: InviteStatus.ACCEPTED,
            acceptedAt: new Date(),
            acceptedByUserId: user.sub,
            registrationId: created.id,
          },
        });
        if (accepted.count === 0) {
          throw new ForbiddenException(
            'Приглашение недействительно или уже использовано',
          );
        }
      }

      return created;
    });

    // Привязываем загруженные файлы к созданной/пересозданной регистрации.
    // При повторной регистрации удаляем ранее прикреплённые файлы.
    if (preparedFileAnswers.length > 0 || isReregistration) {
      await this.registrationFilesService.attachToRegistration(
        registration.id,
        preparedFileAnswers,
        { resetPrevious: isReregistration },
      );
    }

    // Default e-ticket: гарантируем номер билета сразу после регистрации (idempotent).
    const ticketNumber = await this.ticketNumberService.ensureTicketNumber(
      registration.id,
    );

    // Письмо со ссылкой на e-ticket. Сбой не должен блокировать регистрацию (swallowErrors внутри).
    const userInclude = (registration as Registration & {
      user?: { firstName: string | null; lastName: string | null; email: string };
    }).user;
    if (userInclude) {
      const publicUrl =
        this.configService.get<string>('frontend.publicUrl') ?? '';
      // /profile/tickets/[eventId] — маршрут ищет билет по СОБЫТИЮ,
      // не по регистрации (см. TicketViewService.getMyTicketViewModel).
      const ticketUrl = publicUrl
        ? `${publicUrl}/profile/tickets/${registration.eventId}`
        : undefined;
      const fullName =
        `${userInclude.firstName ?? ''} ${userInclude.lastName ?? ''}`.trim() ||
        userInclude.email;
      const orgSnapshot =
        await this.registrationsRepository.findEventWithOrgName(eventId);
      void this.mailService.sendRegistrationCreated(
        userInclude.email,
        fullName,
        orgSnapshot?.title ?? '',
        orgSnapshot?.organizationName ?? 'EventFlow',
        {
          number: ticketNumber,
          url: ticketUrl,
          isPending: registration.status === RegistrationStatus.PENDING,
        },
      );
    }

    // Уведомление организатору: «на ваше событие подали заявку». Побочный
    // эффект — `emit` не бросает, и регистрация состоится, даже если запись
    // уведомления не удалась.
    const orgForNotice =
      await this.registrationsRepository.findEventWithOrgName(eventId);
    if (orgForNotice?.organizationId) {
      await this.notifications.emit({
        organizationId: orgForNotice.organizationId,
        type: NotificationType.REGISTRATION_CREATED,
        entityType: 'event',
        entityId: eventId,
        // Подстановки, а не готовая фраза: ленту читают на трёх языках.
        payload: {
          eventTitle: orgForNotice.title ?? '',
          personName: userInclude
            ? `${userInclude.firstName ?? ''} ${userInclude.lastName ?? ''}`.trim() ||
              userInclude.email
            : '',
          pending: registration.status === RegistrationStatus.PENDING,
        },
      });
    }

    // Цепочка 2 (BL-24/BL-29): REG-01 участнику (платный флоу сольётся с
    // чекаутом, OQ-21), REG-20 «первая» + пороги REG-21 организатору, CLS-02
    // заинтересованным. REG-08 «билет выдан» коалесцирован: номер билета выдан
    // строкой выше, отдельного пуша нет. Метод не бросает наружу.
    await this.registrationChain.onRegistrationCreated({
      registrationId: registration.id,
      eventId,
      status: registration.status,
      ticketNumber,
    });

    return { ...registration, ticketNumber, ticketIssuedAt: new Date() };
  }

  /**
   * Бросает исключение переполнения, если count достиг эффективного cap.
   * Единая логика для ранней проверки и атомарной проверки под advisory-lock.
   */
  private assertWithinCap(
    capInfo: Awaited<ReturnType<CapacityClampService['effectiveEventCap']>>,
    count: number,
  ): void {
    if (capInfo.cap === null || count < capInfo.cap) {
      return;
    }
    if (capInfo.source === 'TIER') {
      throw new CapExceededException({
        cap: EntitlementKey.MAX_PARTICIPANTS_PER_EVENT,
        limit: capInfo.cap,
        current: count,
        tierKey: capInfo.tierKey,
        upgrade: true,
      });
    }
    throw new BadRequestException('Достигнут лимит участников');
  }

  /**
   * Получает регистрацию по ID
   */
  async findById(id: string): Promise<Registration> {
    const registration = await this.registrationsRepository.findById(id);
    if (!registration) {
      throw new NotFoundException('Регистрация не найдена');
    }
    return registration;
  }

  /**
   * Получает регистрацию по ID для организатора с проверкой доступа.
   * Регистрация должна принадлежать событию :eventId, а событие —
   * организации вызывающего (или вызывающий — супер-админ). Без этой
   * проверки любой сотрудник с EVENTS_READ мог читать PII чужих регистраций
   * по UUID (межтенантный IDOR).
   */
  async findByIdForOrganizer(
    eventId: string,
    id: string,
    user: ICurrentUser,
  ): Promise<Registration> {
    const registration = await this.findById(id);
    const registrationEventId = (
      registration as Registration & { event: { id: string } }
    ).event.id;

    // Регистрация не из этого события — отвечаем 404, чтобы не подтверждать
    // существование чужого объекта.
    if (registrationEventId !== eventId) {
      throw new NotFoundException('Регистрация не найдена');
    }

    await this.checkEventAccess(registrationEventId, user);
    return registration;
  }

  /**
   * Получает регистрации события (для организаторов)
   */
  async findByEvent(
    eventId: string,
    query: RegistrationQueryDto,
    user: ICurrentUser,
  ): Promise<IPaginatedRegistrations> {
    await this.checkEventAccess(eventId, user);
    return this.registrationsRepository.findByEvent(eventId, query);
  }

  /**
   * Получает регистрации пользователя для страницы /profile/events
   * Поддерживает фильтры: ALL, APPROVED, PENDING, ATTENDED, CANCELLED
   */
  async findMyRegistrations(
    query: MyRegistrationsQueryDto,
    user: ICurrentUser,
  ): Promise<IPaginatedRegistrations> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }
    const result = await this.registrationsRepository.findMyRegistrations(
      user.sub,
      query,
    );

    const localizedData = result.data.map((reg: any) => {
      if (!reg?.event) return reg;
      const localized = localizeEventBusinessFields(reg.event, query.locale);
      return {
        ...reg,
        event: {
          ...reg.event,
          title: localized.title,
          shortDescription: localized.shortDescription,
          venue: localized.venue,
          city: localized.city,
        },
      };
    });

    return { ...result, data: localizedData };
  }

  /**
   * Одобряет регистрацию
   */
  async approve(id: string, user: ICurrentUser): Promise<Registration> {
    const registration = await this.findById(id);
    await this.checkEventAccess(
      (registration as Registration & { event: { id: string } }).event.id,
      user,
    );

    if (registration.status !== RegistrationStatus.PENDING) {
      throw new BadRequestException('Можно одобрить только ожидающую заявку');
    }

    const approved = await this.registrationsRepository.updateStatus(
      id,
      RegistrationStatus.APPROVED,
    );

    // REG-06 (оживший approve: push + инбокс + письмо) + план REM-01/03.
    await this.registrationChain.onRegistrationApproved(id);

    return approved;
  }

  /**
   * Отклоняет регистрацию
   */
  async reject(
    id: string,
    dto: RejectRegistrationDto,
    user: ICurrentUser,
  ): Promise<Registration> {
    const registration = await this.findById(id);
    await this.checkEventAccess(
      (registration as Registration & { event: { id: string } }).event.id,
      user,
    );

    if (registration.status !== RegistrationStatus.PENDING) {
      throw new BadRequestException('Можно отклонить только ожидающую заявку');
    }

    const rejected = await this.registrationsRepository.updateStatus(
      id,
      RegistrationStatus.REJECTED,
      dto.reason,
    );

    // REG-07 (оживший reject: push + инбокс + письмо) + снятие плана.
    await this.registrationChain.onRegistrationRejected(id, dto.reason ?? null);

    return rejected;
  }

  /**
   * Отменяет участие участника со стороны организатора.
   * Допустимо для активных регистраций (PENDING/APPROVED) → CANCELLED.
   * Терминальная операция: освобождает место, отменённый QR не пускает на
   * check-in (проверка статуса APPROVED в attendance). Повторная регистрация
   * участником остаётся возможной (см. register → recreateForReregistration).
   */
  async cancelByOrganizer(
    id: string,
    dto: CancelRegistrationDto,
    user: ICurrentUser,
  ): Promise<Registration> {
    const registration = await this.findById(id);
    const event = (registration as Registration & { event: { id: string } })
      .event;
    await this.checkEventAccess(event.id, user);

    if (
      registration.status !== RegistrationStatus.PENDING &&
      registration.status !== RegistrationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Отменить можно только ожидающую или одобренную регистрацию',
      );
    }

    const updated = await this.registrationsRepository.updateStatus(
      id,
      RegistrationStatus.CANCELLED,
      dto.reason,
    );

    // REG-10: push + инбокс + письмо (бывший прямой sendRegistrationCancelled —
    // теперь через диспатчер: журнал, дедуп, судьба денег при PAID-заказе)
    // + каскадное снятие REM/SUM/платёжных job'ов регистрации.
    await this.registrationChain.onCancelledByOrganizer(
      id,
      dto.reason ?? null,
    );

    return updated;
  }

  /**
   * Отзывает подтверждение участия: APPROVED → PENDING.
   * Заявка возвращается на рассмотрение, билет/QR перестаёт действовать
   * (check-in требует статус APPROVED). Причина отклонения сбрасывается.
   */
  async revokeApproval(
    id: string,
    dto: CancelRegistrationDto,
    user: ICurrentUser,
  ): Promise<Registration> {
    const registration = await this.findById(id);
    const event = (registration as Registration & { event: { id: string } })
      .event;
    await this.checkEventAccess(event.id, user);

    if (registration.status !== RegistrationStatus.APPROVED) {
      throw new BadRequestException(
        'Отозвать можно только подтверждённую (одобренную) регистрацию',
      );
    }

    const updated = await this.registrationsRepository.update(id, {
      status: RegistrationStatus.PENDING,
      rejectionReason: null,
    });

    // REG-11: push + инбокс + письмо через диспатчер + снятие REM/SUM
    // регистрации (билет перестал действовать).
    await this.registrationChain.onApprovalRevoked(id, dto.reason ?? null);

    return updated;
  }

  /**
   * Отменяет свою регистрацию (пользователь)
   */
  async cancel(id: string, user: ICurrentUser): Promise<Registration> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }

    const registration = await this.findById(id);

    if (
      (registration as Registration & { user: { id: string } }).user.id !==
      user.sub
    ) {
      throw new ForbiddenException('Нет доступа к этой регистрации');
    }

    if (
      registration.status === RegistrationStatus.CANCELLED ||
      registration.status === RegistrationStatus.REJECTED
    ) {
      throw new BadRequestException('Регистрация уже отменена или отклонена');
    }

    const cancelled = await this.registrationsRepository.updateStatus(
      id,
      RegistrationStatus.CANCELLED,
    );

    // Самоотмена: пуш самому себе не шлём, но плановые REM/SUM и платёжные
    // job'ы регистрации гасим (каскадная инвалидация, инвариант №3).
    await this.registrationChain.onCancelledBySelf(id);

    return cancelled;
  }

  /**
   * Обновляет регистрацию пользователя (роль, даты перелёта, дни подготовки)
   */
  async updateMyRegistration(
    id: string,
    dto: UpdateRegistrationDto,
    user: ICurrentUser,
  ): Promise<Registration> {
    if (user.type !== UserType.USER) {
      throw new ForbiddenException('Доступно только для пользователей');
    }

    const registration = await this.findById(id);

    if (
      (registration as Registration & { user: { id: string } }).user.id !==
      user.sub
    ) {
      throw new ForbiddenException('Нет доступа к этой регистрации');
    }

    if (registration.status !== RegistrationStatus.APPROVED) {
      throw new BadRequestException(
        'Можно редактировать только одобренные регистрации',
      );
    }

    const updateData: any = {};

    if (dto.role !== undefined) {
      updateData.role = dto.role;
    }

    if (dto.travelStartDate !== undefined) {
      updateData.travelStartDate = dto.travelStartDate
        ? new Date(dto.travelStartDate)
        : null;
    }

    if (dto.travelEndDate !== undefined) {
      updateData.travelEndDate = dto.travelEndDate
        ? new Date(dto.travelEndDate)
        : null;
    }

    if (dto.preparationDays !== undefined) {
      updateData.preparationDays = dto.preparationDays;
    }

    return this.registrationsRepository.update(id, updateData);
  }

  /**
   * Массовое одобрение регистраций
   */
  async bulkApprove(ids: string[], user: ICurrentUser): Promise<number> {
    let approved = 0;
    for (const id of ids) {
      try {
        await this.approve(id, user);
        approved++;
      } catch {
        // Пропускаем ошибки для отдельных регистраций
      }
    }
    return approved;
  }

  /**
   * Массовое отклонение регистраций
   */
  async bulkReject(
    ids: string[],
    reason: string | undefined,
    user: ICurrentUser,
  ): Promise<number> {
    let rejected = 0;
    for (const id of ids) {
      try {
        await this.reject(id, { reason }, user);
        rejected++;
      } catch {
        // Пропускаем ошибки для отдельных регистраций
      }
    }
    return rejected;
  }

  // === Private methods ===

  private async checkEventAccess(
    eventId: string,
    user: ICurrentUser,
  ): Promise<void> {
    const event =
      await this.registrationsRepository.findEventOrganizationAccess(eventId);

    if (!event) {
      throw new NotFoundException('Мероприятие не найдено');
    }

    // Супер-админ модерирует регистрации любого события из админ-панели.
    if (user.type === UserType.SUPER_ADMIN) {
      return;
    }

    const organizationId = this.getOrganizationId(user);

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
      'Только организаторы могут управлять регистрациями',
    );
  }

  /**
   * Подсчитывает баллы теста
   */
  private async calculateTestScore(
    questions: RegistrationQuestion[],
    answers: { questionId: string; answer: string }[],
    event: Pick<RegistrationEventSnapshot, 'minTestScore'>,
  ): Promise<{ score: number; maxScore: number; passed: boolean }> {
    let score = 0;
    let maxScore = 0;

    for (const question of questions) {
      // Пропускаем вопросы без баллов (не тестовые)
      if (question.points === 0) continue;

      maxScore += question.points;

      const answer = answers.find((a) => a.questionId === question.id);
      if (!answer) continue; // Нет ответа - 0 баллов

      const isCorrect = this.checkAnswerCorrectness(question, answer.answer);
      if (isCorrect) {
        score += question.points;
      }
    }

    const minScore = event.minTestScore || 0;
    const passed = score >= minScore;

    return { score, maxScore, passed };
  }

  /**
   * Проверяет правильность ответа на вопрос
   */
  private checkAnswerCorrectness(
    question: RegistrationQuestion,
    answer: string,
  ): boolean {
    // Для ALTERNATIVE (SELECT/CHECKBOX) - проверяем по correctOptions
    if (question.category === QuestionCategory.ALTERNATIVE) {
      const userAnswers = answer.split(',').map((a) => a.trim());
      const correctSet = new Set(question.correctOptions);

      // Проверяем, что все ответы пользователя правильные и их количество совпадает
      return (
        userAnswers.every((a) => correctSet.has(a)) &&
        userAnswers.length === correctSet.size
      );
    }

    // Для CLOSED (да/нет) - точное сравнение
    if (question.category === QuestionCategory.CLOSED) {
      return (
        answer.toLowerCase().trim() ===
        question.correctAnswer?.toLowerCase().trim()
      );
    }

    // Для OPEN - проверка ключевых слов (упрощенно)
    if (question.category === QuestionCategory.OPEN && question.correctAnswer) {
      const keywords = question.correctAnswer
        .toLowerCase()
        .split(',')
        .map((k) => k.trim());
      const userAnswer = answer.toLowerCase();

      // Проверяем наличие хотя бы одного ключевого слова
      return keywords.some((keyword) => userAnswer.includes(keyword));
    }

    // Если нет правильного ответа - считаем правильным (ручная проверка)
    return false;
  }

  /**
   * Определяет статус регистрации на основе режима события и результата теста
   */
  private determineStatus(
    event: Pick<
      RegistrationEventSnapshot,
      'registrationMode' | 'accessType' | 'testEvaluationType'
    >,
    testResult: { passed: boolean } | null,
  ): RegistrationStatus {
    // Режим QUESTIONS - стандартная логика
    if (event.registrationMode === RegistrationMode.QUESTIONS) {
      return event.accessType === EventAccessType.REQUEST
        ? RegistrationStatus.PENDING
        : RegistrationStatus.APPROVED;
    }

    // Режим TEST с AUTO_REJECT
    if (event.testEvaluationType === TestEvaluationType.AUTO_REJECT) {
      return testResult?.passed
        ? RegistrationStatus.APPROVED
        : RegistrationStatus.REJECTED;
    }

    // Режим TEST с EVALUATION - все одобрены, но результаты сохранены
    return RegistrationStatus.APPROVED;
  }
}
