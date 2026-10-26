import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VerificationCodeType, UserType, Prisma } from '@prisma/client';

export interface ICreateCodeData {
  code: string;
  email: string;
  type: VerificationCodeType;
  actorType: UserType;
  actorId?: string;
  newEmail?: string;
  expiresAt: Date;
}

export interface ICodeFilters {
  email?: string;
  type?: VerificationCodeType;
  actorType?: UserType;
  isUsed?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

@Injectable()
export class VerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создание нового кода верификации
   */
  async createCode(data: ICreateCodeData) {
    return this.prisma.emailVerificationCode.create({
      data: {
        code: data.code,
        email: data.email,
        type: data.type,
        actorType: data.actorType,
        actorId: data.actorId,
        newEmail: data.newEmail,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Поиск активного непросроченного кода
   */
  async findActiveCode(email: string, type: VerificationCodeType) {
    return this.prisma.emailVerificationCode.findFirst({
      where: {
        email,
        type,
        isUsed: false,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 }, // Меньше 5 попыток
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Поиск последнего кода по email и типу, включая уже использованные/истекшие
   */
  async findLatestCode(email: string, type: VerificationCodeType) {
    return this.prisma.emailVerificationCode.findFirst({
      where: {
        email,
        type,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Поиск кода по значению
   */
  async findByCode(code: string, email: string, type: VerificationCodeType) {
    return this.prisma.emailVerificationCode.findFirst({
      where: {
        code,
        email,
        type,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Отметить код как использованный
   */
  async markAsUsed(id: string) {
    return this.prisma.emailVerificationCode.update({
      where: { id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Увеличить счетчик попыток
   */
  async incrementAttempts(id: string) {
    return this.prisma.emailVerificationCode.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Инвалидация старых кодов
   */
  async invalidateCodes(email: string, type: VerificationCodeType) {
    return this.prisma.emailVerificationCode.updateMany({
      where: {
        email,
        type,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Получение всех кодов с фильтрами (для супер-админа)
   */
  async getAllCodes(filters: ICodeFilters) {
    const {
      email,
      type,
      actorType,
      isUsed,
      page = 1,
      limit = 50,
      sort = '-createdAt',
    } = filters;

    const where: Prisma.EmailVerificationCodeWhereInput = {
      ...(email && { email: { contains: email, mode: 'insensitive' } }),
      ...(type && { type }),
      ...(actorType && { actorType }),
      ...(isUsed !== undefined && { isUsed }),
    };

    // Парсинг сортировки
    const orderBy: Prisma.EmailVerificationCodeOrderByWithRelationInput = {};
    if (sort.startsWith('-')) {
      orderBy[
        sort.substring(
          1,
        ) as keyof Prisma.EmailVerificationCodeOrderByWithRelationInput
      ] = 'desc';
    } else {
      orderBy[
        sort as keyof Prisma.EmailVerificationCodeOrderByWithRelationInput
      ] = 'asc';
    }

    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.emailVerificationCode.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.emailVerificationCode.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
