import {
  Body,
  Logger,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { VerificationCodeType } from '@prisma/client';
import { CurrentUser, Public } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import type { ICurrentUser } from '../../common/interfaces';
import { MailService } from '../mail/mail.service';
import {
  SendVerificationCodeDto,
  VerifyCodeDto,
  ResetPasswordDto,
  ChangeEmailRequestDto,
  ChangeEmailConfirmDto,
} from './dto';
import { VerificationService } from './verification.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

@ApiTags('verification')
@Controller('verification')
export class VerificationController {
  private readonly logger = new Logger(VerificationController.name);

  constructor(
    private readonly verificationService: VerificationService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Public()
  @Post('send-code')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 запроса в минуту
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить код верификации на email' })
  @ApiResponse({
    status: 200,
    description: 'Код успешно отправлен',
    schema: {
      properties: {
        message: { type: 'string', example: 'Код отправлен на email' },
      },
    },
  })
  async sendCode(
    @Body() dto: SendVerificationCodeDto,
  ): Promise<{ message: string }> {
    await this.dispatchPublicVerificationCode(dto, false);
    return { message: 'Если аккаунт существует, код отправлен на email' };
  }

  @Public()
  @Post('verify-email')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 попыток в минуту
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Подтвердить email по коду' })
  @ApiResponse({
    status: 200,
    description: 'Email успешно подтвержден',
    schema: {
      properties: {
        message: { type: 'string', example: 'Email успешно подтвержден' },
      },
    },
  })
  async verifyEmail(@Body() dto: VerifyCodeDto): Promise<{ message: string }> {
    return this.verificationService.verifyEmail(dto.email, dto.code);
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 попыток в минуту
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Сбросить пароль с кодом верификации' })
  @ApiResponse({
    status: 200,
    description: 'Пароль успешно изменен',
    schema: {
      properties: {
        message: { type: 'string', example: 'Пароль успешно изменен' },
      },
    },
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const result = await this.verificationService.resetPassword(
      dto.email,
      dto.code,
      dto.newPassword,
    );

    // Отправляем уведомление о смене пароля
    const firstName = await this.getUserFirstName(dto.email);
    await this.mailService.sendPasswordChangedNotification(
      dto.email,
      firstName,
    );

    return result;
  }

  @Public()
  @Post('resend-code')
  @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 запрос в минуту
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Повторно отправить код верификации' })
  @ApiResponse({
    status: 200,
    description: 'Код повторно отправлен',
    schema: {
      properties: {
        message: { type: 'string', example: 'Код повторно отправлен на email' },
      },
    },
  })
  async resendCode(
    @Body() dto: SendVerificationCodeDto,
  ): Promise<{ message: string }> {
    await this.dispatchPublicVerificationCode(dto, true);
    return { message: 'Если аккаунт существует, код отправлен на email' };
  }

  // ==================== PROTECTED ENDPOINTS ====================

  @Post('change-email/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запросить смену email' })
  @ApiResponse({
    status: 200,
    description: 'Код отправлен на новый email',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'Код подтверждения отправлен на новый email',
        },
      },
    },
  })
  async requestEmailChange(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: ChangeEmailRequestDto,
  ): Promise<{ message: string }> {
    // Проверяем текущий пароль
    await this.verifyCurrentPassword(user, dto.currentPassword);

    // Проверяем, не занят ли новый email
    await this.checkEmailAvailability(dto.newEmail);

    // Генерируем код для нового email
    const code = await this.verificationService.sendVerificationCode(
      user.email,
      VerificationCodeType.EMAIL_CHANGE,
      user.sub,
      dto.newEmail,
    );

    // Отправляем код на НОВЫЙ email
    const firstName = await this.getUserFirstName(user.email);
    await this.mailService.sendEmailChangeCode(dto.newEmail, firstName, code);

    return { message: 'Код подтверждения отправлен на новый email' };
  }

  @Post('change-email/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Подтвердить смену email' })
  @ApiResponse({
    status: 200,
    description: 'Email успешно изменен',
    schema: {
      properties: {
        message: { type: 'string', example: 'Email успешно изменен' },
        newEmail: { type: 'string', example: 'newemail@example.com' },
      },
    },
  })
  async confirmEmailChange(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: ChangeEmailConfirmDto,
  ): Promise<{ message: string; newEmail: string }> {
    const oldEmail = user.email;

    // Подтверждаем смену email
    const result = await this.verificationService.confirmEmailChange(
      user.email,
      dto.code,
    );

    // Отправляем уведомление на старый email
    const firstName = await this.getUserFirstName(oldEmail);
    await this.mailService.sendEmailChangedNotification(
      oldEmail,
      result.newEmail,
      firstName,
    );

    return result;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Получить имя пользователя по email
   */
  private async getUserFirstName(email: string): Promise<string | null> {
    // Ищем в User
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { firstName: true },
    });
    if (user) return user.firstName;

    // Ищем в Organization
    const org = await this.prisma.organization.findUnique({
      where: { email },
      select: { name: true },
    });
    if (org) return org.name;

    // Ищем в OrganizationMember
    const member = await this.prisma.organizationMember.findFirst({
      where: { email },
      select: { firstName: true },
    });
    if (member) return member.firstName;

    return null;
  }

  private async dispatchPublicVerificationCode(
    dto: SendVerificationCodeDto,
    resend: boolean,
  ): Promise<void> {
    try {
      const code = resend
        ? await this.verificationService.resendCode(dto.email, dto.type)
        : await this.verificationService.sendVerificationCode(
            dto.email,
            dto.type,
          );

      const firstName = await this.getUserFirstName(dto.email);

      switch (dto.type) {
        case VerificationCodeType.EMAIL_VERIFICATION:
          await this.mailService.sendEmailVerificationCode(
            dto.email,
            firstName,
            code,
          );
          return;
        case VerificationCodeType.PASSWORD_RESET:
          await this.mailService.sendPasswordResetCode(
            dto.email,
            firstName,
            code,
          );
          return;
        default:
          throw new BadRequestException('Некорректный тип кода');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        this.logger.warn(
          `Suppressed public verification response detail for ${dto.type} ${dto.email}`,
        );
        return;
      }

      throw error;
    }
  }

  /**
   * Проверить текущий пароль пользователя
   */
  private async verifyCurrentPassword(
    user: ICurrentUser,
    password: string,
  ): Promise<void> {
    let passwordHash: string | null = null;

    // Получаем хеш пароля в зависимости от типа пользователя
    switch (user.type) {
      case 'USER': {
        const userEntity = await this.prisma.user.findUnique({
          where: { id: user.sub },
          select: { passwordHash: true },
        });
        passwordHash = userEntity?.passwordHash || null;
        break;
      }
      case 'ORGANIZATION': {
        const orgEntity = await this.prisma.organization.findUnique({
          where: { id: user.sub },
          select: { passwordHash: true },
        });
        passwordHash = orgEntity?.passwordHash || null;
        break;
      }
      case 'MEMBER': {
        const memberEntity = await this.prisma.organizationMember.findUnique({
          where: { id: user.sub },
          select: { passwordHash: true },
        });
        passwordHash = memberEntity?.passwordHash || null;
        break;
      }
    }

    if (!passwordHash) {
      throw new BadRequestException(
        'Невозможно изменить email для OAuth аккаунта',
      );
    }

    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      throw new BadRequestException('Неверный текущий пароль');
    }
  }

  /**
   * Проверить доступность email (не занят ли другим пользователем)
   */
  private async checkEmailAvailability(email: string): Promise<void> {
    // Проверяем в таблице User
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (user) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Проверяем в таблице Organization
    const org = await this.prisma.organization.findUnique({
      where: { email },
      select: { id: true },
    });
    if (org) {
      throw new ConflictException('Организация с таким email уже существует');
    }

    // Проверяем в таблице OrganizationMember
    const member = await this.prisma.organizationMember.findFirst({
      where: { email },
      select: { id: true },
    });
    if (member) {
      throw new ConflictException('Участник с таким email уже существует');
    }
  }
}
