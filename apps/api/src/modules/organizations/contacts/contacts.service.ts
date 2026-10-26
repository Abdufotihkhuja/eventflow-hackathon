import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactsRepository } from './contacts.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { ContactRequestEntity, ContactRequestStatsEntity } from './entities';
import {
  CreateContactRequestDto,
  CreatePlaceRentalRequestDto,
  UpdateContactStatusDto,
  ContactRequestQueryDto,
} from './dto';
import {
  OrganizationVerificationStatus,
  RentalPlaceStatus,
  RentalType,
} from '@prisma/client';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ContactsService {
  constructor(
    private readonly contactsRepository: ContactsRepository,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Создать заявку на связь
   */
  async create(
    userId: string,
    organizationId: string,
    dto: CreateContactRequestDto,
  ): Promise<void> {
    // Проверить существование организации
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId, deletedAt: null },
    });

    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }

    // Получить данные пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Создать заявку
    await this.contactsRepository.create(
      userId,
      organizationId,
      dto.phone,
      dto.message,
    );

    // Отправить email уведомление организатору
    const userName =
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь';

    await this.mailService.sendContactRequestNotification(
      organization.email,
      userName,
      dto.phone,
      dto.message,
    );
  }

  async createPlaceRentalRequest(
    requesterOrganizationId: string,
    rentalPlaceId: string,
    dto: CreatePlaceRentalRequestDto,
  ): Promise<void> {
    const [requesterOrganization, rentalPlace] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: requesterOrganizationId },
        select: {
          id: true,
          companyName: true,
          verificationStatus: true,
          deletedAt: true,
        },
      }),
      this.prisma.rentalPlace.findFirst({
        where: {
          id: rentalPlaceId,
          status: RentalPlaceStatus.PUBLISHED,
          organization: {
            deletedAt: null,
            verificationStatus: OrganizationVerificationStatus.APPROVED,
            placesFeatureEnabled: true,
          },
        },
        include: {
          organization: {
            select: {
              id: true,
              email: true,
              companyName: true,
            },
          },
        },
      }),
    ]);

    if (!requesterOrganization || requesterOrganization.deletedAt) {
      throw new NotFoundException('Организация-заявитель не найдена');
    }

    if (!rentalPlace) {
      throw new NotFoundException('Площадка не найдена');
    }

    if (rentalPlace.organizationId === requesterOrganizationId) {
      throw new NotFoundException('Нельзя отправить заявку на свою площадку');
    }

    await this.contactsRepository.createPlaceRentalRequest(
      requesterOrganizationId,
      rentalPlace.organizationId,
      rentalPlace.id,
      dto.phone,
      dto.rentalType,
      dto.comment,
    );

    const rentalTypeName =
      dto.rentalType === RentalType.HOURLY ? 'Почасовая' : 'Суточная';

    await this.mailService.sendContactRequestNotification(
      rentalPlace.organization.email,
      requesterOrganization.companyName,
      dto.phone,
      dto.comment,
      {
        type: 'PLACE_RENTAL',
        rentalPlaceTitle: rentalPlace.title,
        requesterOrganizationName: requesterOrganization.companyName,
        rentalTypeName,
      },
    );
  }

  /**
   * Получить список заявок
   */
  async findAll(
    organizationId: string,
    query: ContactRequestQueryDto,
  ): Promise<PaginatedResult<ContactRequestEntity>> {
    const result = await this.contactsRepository.findAll(
      organizationId,
      query.page,
      query.limit,
      query.status,
      query.search,
    );

    const requests = result.data.map(
      (item) =>
        new ContactRequestEntity({
          id: item.id,
          user: item.user
            ? {
                id: item.user.id,
                firstName: item.user.firstName,
                lastName: item.user.lastName,
                avatarUrl: item.user.avatarUrl,
              }
            : null,
          requesterOrganization: item.requesterOrganization
            ? {
                id: item.requesterOrganization.id,
                name: item.requesterOrganization.companyName,
                logoUrl: item.requesterOrganization.logoUrl,
              }
            : null,
          rentalPlace: item.rentalPlace
            ? {
                id: item.rentalPlace.id,
                title: item.rentalPlace.title,
                slug: item.rentalPlace.slug,
                coverImage: item.rentalPlace.images[0]?.url ?? null,
              }
            : null,
          phone: item.phone,
          message: item.message ?? undefined,
          status: item.status,
          type: item.type,
          rentalType: item.rentalType,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }),
    );

    return {
      data: requests,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Получить заявку по ID
   */
  async findById(
    organizationId: string,
    requestId: string,
  ): Promise<ContactRequestEntity> {
    const request = await this.contactsRepository.findById(
      organizationId,
      requestId,
    );

    if (!request) {
      throw new NotFoundException('Заявка не найдена');
    }

    return new ContactRequestEntity({
      id: request.id,
      user: request.user
        ? {
            id: request.user.id,
            firstName: request.user.firstName,
            lastName: request.user.lastName,
            avatarUrl: request.user.avatarUrl,
          }
        : null,
      requesterOrganization: request.requesterOrganization
        ? {
            id: request.requesterOrganization.id,
            name: request.requesterOrganization.companyName,
            logoUrl: request.requesterOrganization.logoUrl,
          }
        : null,
      rentalPlace: request.rentalPlace
        ? {
            id: request.rentalPlace.id,
            title: request.rentalPlace.title,
            slug: request.rentalPlace.slug,
            coverImage: request.rentalPlace.images[0]?.url ?? null,
          }
        : null,
      phone: request.phone,
      message: request.message ?? undefined,
      status: request.status,
      type: request.type,
      rentalType: request.rentalType,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    });
  }

  /**
   * Обновить статус заявки
   */
  async updateStatus(
    organizationId: string,
    requestId: string,
    dto: UpdateContactStatusDto,
  ): Promise<ContactRequestEntity> {
    // Проверить существование заявки
    const exists = await this.contactsRepository.findById(
      organizationId,
      requestId,
    );

    if (!exists) {
      throw new NotFoundException('Заявка не найдена');
    }

    await this.contactsRepository.updateStatus(
      organizationId,
      requestId,
      dto.status,
    );

    // Получить заявку с пользователем
    const request = await this.contactsRepository.findById(
      organizationId,
      requestId,
    );

    return new ContactRequestEntity({
      id: request!.id,
      user: request!.user
        ? {
            id: request!.user.id,
            firstName: request!.user.firstName,
            lastName: request!.user.lastName,
            avatarUrl: request!.user.avatarUrl,
          }
        : null,
      requesterOrganization: request!.requesterOrganization
        ? {
            id: request!.requesterOrganization.id,
            name: request!.requesterOrganization.companyName,
            logoUrl: request!.requesterOrganization.logoUrl,
          }
        : null,
      rentalPlace: request!.rentalPlace
        ? {
            id: request!.rentalPlace.id,
            title: request!.rentalPlace.title,
            slug: request!.rentalPlace.slug,
            coverImage: request!.rentalPlace.images[0]?.url ?? null,
          }
        : null,
      phone: request!.phone,
      message: request!.message ?? undefined,
      status: request!.status,
      type: request!.type,
      rentalType: request!.rentalType,
      createdAt: request!.createdAt,
      updatedAt: request!.updatedAt,
    });
  }

  /**
   * Получить статистику заявок
   */
  async getStats(organizationId: string): Promise<ContactRequestStatsEntity> {
    const stats = await this.contactsRepository.getStats(organizationId);
    return new ContactRequestStatsEntity(stats);
  }
}
