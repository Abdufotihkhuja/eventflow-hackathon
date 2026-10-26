import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { VerificationCodeType, UserType } from '@prisma/client';
import { VerificationRepository } from './verification.repository';
import * as bcrypt from 'bcrypt';
import {
  BCRYPT_SALT_ROUNDS,
  VERIFICATION_CODE_EXPIRATION_MINUTES,
} from '../../common/constants/security.constant';
import { IamService } from '../iam/iam.service';

const MAX_ATTEMPTS = 5;

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: VerificationRepository,
    private readonly iamService: IamService,
  ) {}

  /**
   * Генерация 6-значного кода
   */
  private generateCode(): string {
    const randomNum = randomInt(0, 999999);
    return randomNum.toString().padStart(6, '0');
  }

  /**
   * Отправка кода верификации
   * @param email - Email получателя
   * @param type - Тип кода (EMAIL_VERIFICATION, PASSWORD_RESET, EMAIL_CHANGE)
   * @param actorId - ID actor (опционально)
   * @param newEmail - Новый email для смены (опционально)
   * @returns Сгенерированный код
   */
  async sendVerificationCode(
    email: string,
    type: VerificationCodeType,
    actorId?: string,
    newEmail?: string,
  ): Promise<string> {
    // Если caller уже знает конкретный actorId, определяем тип по нему, а не по email.
    // Это предотвращает неверную привязку кода, когда один email существует в разных таблицах.
    const { actorType, actorId: resolvedActorId } =
      await this.resolveVerificationTarget(email, actorId);

    // Инвалидируем все старые коды этого типа
    await this.repository.invalidateCodes(email, type);

    // Генерируем новый код
    const code = this.generateCode();

    // Вычисляем время истечения
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + VERIFICATION_CODE_EXPIRATION_MINUTES,
    );

    // Сохраняем код в БД
    await this.repository.createCode({
      code,
      email,
      type,
      actorType,
      actorId: resolvedActorId,
      newEmail,
      expiresAt,
    });

    this.logger.log(
      `Код ${type} отправлен на ${email} (actorType: ${actorType})`,
    );

    return code;
  }

  /**
   * Проверка кода верификации
   * @throws BadRequestException если код неверный или истек
   */
  async verifyCode(
    email: string,
    code: string,
    type: VerificationCodeType,
  ): Promise<{ actorId: string; actorType: UserType; newEmail?: string }> {
    const codeRecord = await this.repository.findByCode(code, email, type);

    if (!codeRecord) {
      throw new BadRequestException('Неверный или истекший код');
    }

    // Проверяем количество попыток
    if (codeRecord.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Превышено количество попыток. Запросите новый код',
      );
    }

    // Проверяем срок действия
    if (codeRecord.expiresAt < new Date()) {
      throw new BadRequestException('Код истек. Запросите новый код');
    }

    // Отмечаем код как использованный
    await this.repository.markAsUsed(codeRecord.id);

    this.logger.log(`Код успешно проверен для ${email} (${type})`);

    return {
      actorId: codeRecord.actorId!,
      actorType: codeRecord.actorType,
      newEmail: codeRecord.newEmail || undefined,
    };
  }

  /**
   * Проверка кода с увеличением счетчика попыток при неудаче
   */
  async verifyCodeWithAttempts(
    email: string,
    code: string,
    type: VerificationCodeType,
  ): Promise<{ actorId: string; actorType: UserType; newEmail?: string }> {
    const codeRecord = await this.repository.findActiveCode(email, type);

    if (!codeRecord) {
      throw new BadRequestException('Код не найден или истек');
    }

    // Увеличиваем счетчик попыток
    if (codeRecord.code !== code) {
      await this.repository.incrementAttempts(codeRecord.id);
      const remainingAttempts = MAX_ATTEMPTS - (codeRecord.attempts + 1);

      if (remainingAttempts <= 0) {
        throw new BadRequestException(
          'Превышено количество попыток. Запросите новый код',
        );
      }

      throw new BadRequestException(
        `Неверный код. Осталось попыток: ${remainingAttempts}`,
      );
    }

    return this.verifyCode(email, code, type);
  }

  /**
   * Подтверждение email
   */
  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    const { actorId, actorType } = await this.verifyCodeWithAttempts(
      email,
      code,
      VerificationCodeType.EMAIL_VERIFICATION,
    );

    // Обновляем isEmailVerified в соответствующей таблице
    await this.updateEmailVerificationStatus(actorId, actorType, true);
    await this.syncEmailVerificationStatusByEmail(email, true);

    return { message: 'Email успешно подтвержден' };
  }

  /**
   * Сброс пароля с кодом
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const { actorId, actorType } = await this.verifyCodeWithAttempts(
      email,
      code,
      VerificationCodeType.PASSWORD_RESET,
    );

    // Хешируем новый пароль
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // Обновляем пароль в соответствующей таблице
    await this.updatePassword(actorId, actorType, passwordHash);

    // Отзываем все refresh-токены аккаунта: сброс пароля — это событие
    // восстановления доступа, после которого ранее выданные сессии (в т.ч.
    // потенциально скомпрометированные) не должны продолжать работать.
    await this.revokeAllSessions(actorId, actorType);

    this.logger.log(`Пароль сброшен для ${email} (${actorType})`);

    return { message: 'Пароль успешно изменен' };
  }

  /**
   * Удаляет все refresh-токены аккаунта актора (все активные сессии).
   * Резолвит accountId через IAM, т.к. refresh-токены ключуются по аккаунту.
   */
  private async revokeAllSessions(
    actorId: string,
    actorType: UserType,
  ): Promise<void> {
    try {
      const { accountId } = await this.iamService.resolveSessionContextForLogin({
        actorId,
        actorType,
      });
      await this.prisma.refreshToken.deleteMany({ where: { accountId } });
    } catch (error) {
      // Не блокируем смену пароля, если аккаунт не резолвится (legacy-данные):
      // сам пароль уже обновлён. Логируем для наблюдаемости.
      this.logger.warn(
        `Не удалось отозвать сессии для актора ${actorType}:${actorId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Подтверждение смены email
   */
  async confirmEmailChange(
    currentEmail: string,
    code: string,
  ): Promise<{ message: string; newEmail: string }> {
    // Ищем код по текущему email или новому email
    const codeRecord = await this.repository.findActiveCode(
      currentEmail,
      VerificationCodeType.EMAIL_CHANGE,
    );

    if (!codeRecord) {
      throw new BadRequestException('Код не найден или истек');
    }

    if (codeRecord.code !== code) {
      await this.repository.incrementAttempts(codeRecord.id);
      const remainingAttempts = MAX_ATTEMPTS - (codeRecord.attempts + 1);

      if (remainingAttempts <= 0) {
        throw new BadRequestException(
          'Превышено количество попыток. Запросите новый код',
        );
      }

      throw new BadRequestException(
        `Неверный код. Осталось попыток: ${remainingAttempts}`,
      );
    }

    if (!codeRecord.newEmail) {
      throw new BadRequestException('Новый email не указан');
    }

    // Отмечаем код как использованный
    await this.repository.markAsUsed(codeRecord.id);

    // Обновляем email в соответствующей таблице
    await this.updateEmail(
      codeRecord.actorId!,
      codeRecord.actorType,
      codeRecord.newEmail,
    );

    this.logger.log(
      `Email изменен с ${currentEmail} на ${codeRecord.newEmail} (${codeRecord.actorType})`,
    );

    return {
      message: 'Email успешно изменен',
      newEmail: codeRecord.newEmail,
    };
  }

  /**
   * Повторная отправка кода
   */
  async resendCode(email: string, type: VerificationCodeType): Promise<string> {
    // Проверяем, есть ли активный код
    const activeCode = await this.repository.findActiveCode(email, type);
    const latestCode =
      activeCode ?? (await this.repository.findLatestCode(email, type));

    if (activeCode) {
      // Если код был создан менее минуты назад, не отправляем новый
      const timeSinceCreation =
        new Date().getTime() - activeCode.createdAt.getTime();
      const secondsSinceCreation = Math.floor(timeSinceCreation / 1000);

      if (secondsSinceCreation < 60) {
        throw new BadRequestException(
          `Подождите ${60 - secondsSinceCreation} секунд перед повторной отправкой`,
        );
      }
    }

    return this.sendVerificationCode(
      email,
      type,
      latestCode?.actorId ?? undefined,
    );
  }

  // === Private Helper Methods ===

  /**
   * Поиск actor по email
   */
  private async findActorByEmail(
    email: string,
  ): Promise<{ actorType: UserType; actorId?: string }> {
    // Ищем в таблице User
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      return { actorType: UserType.USER, actorId: user.id };
    }

    // Ищем в таблице Organization
    const org = await this.prisma.organization.findUnique({ where: { email } });
    if (org) {
      return { actorType: UserType.ORGANIZATION, actorId: org.id };
    }

    // Ищем в таблице OrganizationMember (по email, нужна организация)
    const member = await this.prisma.organizationMember.findFirst({
      where: { email },
    });
    if (member) {
      return { actorType: UserType.MEMBER, actorId: member.id };
    }

    throw new NotFoundException('Аккаунт с таким email не найден');
  }

  /**
   * Поиск actor по ID
   */
  private async findActorById(
    actorId: string,
  ): Promise<{ actorType: UserType; actorId: string } | null> {
    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (user) {
      return { actorType: UserType.USER, actorId: user.id };
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: actorId },
    });
    if (organization) {
      return { actorType: UserType.ORGANIZATION, actorId: organization.id };
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: { id: actorId },
    });
    if (member) {
      return { actorType: UserType.MEMBER, actorId: member.id };
    }

    return null;
  }

  /**
   * Определение точного владельца кода верификации
   */
  private async resolveVerificationTarget(
    email: string,
    actorId?: string,
  ): Promise<{ actorType: UserType; actorId?: string }> {
    if (actorId) {
      const target = await this.findActorById(actorId);
      if (target) {
        return target;
      }

      this.logger.warn(
        `Не удалось определить actorType по ID ${actorId}, fallback к поиску по email ${email}`,
      );
    }

    return this.findActorByEmail(email);
  }

  /**
   * Обновление статуса верификации email
   */
  private async updateEmailVerificationStatus(
    actorId: string,
    actorType: UserType,
    isVerified: boolean,
  ): Promise<void> {
    switch (actorType) {
      case UserType.USER:
        await this.prisma.user.update({
          where: { id: actorId },
          data: { isEmailVerified: isVerified },
        });
        break;
      case UserType.ORGANIZATION:
        await this.prisma.organization.update({
          where: { id: actorId },
          data: { isEmailVerified: isVerified },
        });
        break;
      case UserType.MEMBER:
        // Members не имеют поля isEmailVerified в текущей схеме
        this.logger.warn(
          `Member email verification not implemented for ${actorId}`,
        );
        break;
    }
  }

  /**
   * Синхронизация статуса верификации по email между User и Organization.
   * Email не уникален между таблицами, поэтому подтверждение одного и того же
   * адреса должно отражаться во всех аккаунтах, использующих этот email.
   */
  private async syncEmailVerificationStatusByEmail(
    email: string,
    isVerified: boolean,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { email, deletedAt: null },
        data: { isEmailVerified: isVerified },
      }),
      this.prisma.organization.updateMany({
        where: { email, deletedAt: null },
        data: { isEmailVerified: isVerified },
      }),
    ]);
  }

  /**
   * Обновление пароля
   */
  private async updatePassword(
    actorId: string,
    actorType: UserType,
    passwordHash: string,
  ): Promise<void> {
    switch (actorType) {
      case UserType.USER:
        await this.prisma.user.update({
          where: { id: actorId },
          data: { passwordHash },
        });
        break;
      case UserType.ORGANIZATION:
        await this.prisma.organization.update({
          where: { id: actorId },
          data: { passwordHash },
        });
        break;
      case UserType.MEMBER:
        await this.prisma.organizationMember.update({
          where: { id: actorId },
          data: { passwordHash },
        });
        break;
    }
  }

  /**
   * Обновление email
   */
  private async updateEmail(
    actorId: string,
    actorType: UserType,
    newEmail: string,
  ): Promise<void> {
    // Проверяем, не занят ли новый email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });
    if (existingUser && existingUser.id !== actorId) {
      throw new BadRequestException('Email уже используется');
    }

    const existingOrg = await this.prisma.organization.findUnique({
      where: { email: newEmail },
    });
    if (existingOrg && existingOrg.id !== actorId) {
      throw new BadRequestException('Email уже используется');
    }

    switch (actorType) {
      case UserType.USER:
        await this.prisma.user.update({
          where: { id: actorId },
          data: { email: newEmail, isEmailVerified: true },
        });
        break;
      case UserType.ORGANIZATION:
        await this.prisma.organization.update({
          where: { id: actorId },
          data: { email: newEmail, isEmailVerified: true },
        });
        break;
      case UserType.MEMBER:
        await this.prisma.organizationMember.update({
          where: { id: actorId },
          data: { email: newEmail },
        });
        break;
    }
  }
}
