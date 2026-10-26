import { Injectable, NotFoundException } from '@nestjs/common';
import {
  OrganizationsRepository,
  PublicOrganizationProfileSnapshot,
} from './organizations.repository';
import {
  UpdateOrganizationDto,
  OrganizationEntity,
  PublicOrganizationProfileDto,
} from './dto';
import { UploadsService } from '../uploads/uploads.service';
import { Prisma } from '@prisma/client';
import { pickFallbackTranslation } from '../translations/dto/business-translation.dto';
import { resolveLocalizedBusinessField } from '../translations/localized-business-field.util';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly uploadsService: UploadsService,
  ) {}

  async findById(id: string): Promise<OrganizationEntity> {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }
    return OrganizationEntity.fromPrisma(organization);
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationEntity> {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }

    const updateData: {
      name?: string;
      companyName?: string;
      inn?: string | null;
      description?: string | null;
      phone?: string;
      address?: string;
      website?: string;
      logoUrl?: string;
      industry?: string;
      companySize?: number;
      translations?: Prisma.InputJsonValue;
      translationMeta?: Prisma.InputJsonValue;
    } = {};

    if (dto.organizationName !== undefined || dto.translations !== undefined) {
      updateData.name = pickFallbackTranslation(
        dto.translations,
        'name',
        dto.organizationName ?? organization.name,
      );
      updateData.companyName = pickFallbackTranslation(
        dto.translations,
        'companyName',
        dto.organizationName ?? organization.companyName,
      );
    }

    if (dto.inn !== undefined) {
      updateData.inn = dto.inn;
    }

    if (dto.description !== undefined || dto.translations !== undefined) {
      const description = pickFallbackTranslation(
        dto.translations,
        'description',
        dto.description ?? organization.description,
      );
      updateData.description = description || null;
    }

    if (dto.translations !== undefined) {
      updateData.translations = dto.translations as Prisma.InputJsonValue;
    }

    if (dto.translationMeta !== undefined) {
      updateData.translationMeta = dto.translationMeta as Prisma.InputJsonValue;
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
    }

    if (dto.address !== undefined) {
      updateData.address = dto.address;
    }

    if (dto.website !== undefined) {
      updateData.website = dto.website;
    }

    if (dto.logoUrl !== undefined) {
      updateData.logoUrl = dto.logoUrl;
    }

    if (dto.industry !== undefined) {
      updateData.industry = dto.industry;
    }

    if (dto.companySize !== undefined) {
      updateData.companySize = dto.companySize;
    }

    const updated = await this.organizationsRepository.update(id, updateData);
    return OrganizationEntity.fromPrisma(updated);
  }

  /**
   * Завершает онбординг организации
   */
  async completeOnboarding(id: string): Promise<OrganizationEntity> {
    await this.findById(id);
    const updated = await this.organizationsRepository.update(id, {
      isOnboardingCompleted: true,
    });
    return OrganizationEntity.fromPrisma(updated);
  }

  /**
   * Отмечает, что организатор заполнил доп. поля компании (popup больше не показывать).
   * Вызывать только для входа организатора (UserType.ORGANIZATION), не для сотрудников.
   */
  async completeCompanyInfo(id: string): Promise<OrganizationEntity> {
    await this.findById(id);
    const updated = await this.organizationsRepository.update(id, {
      companyInfoCompleted: true,
    });
    return OrganizationEntity.fromPrisma(updated);
  }

  /**
   * Soft delete — помечает организацию как удалённую
   * Все сессии станут недействительны т.к. deletedAt != null
   */
  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.organizationsRepository.softDelete(id);
  }

  /**
   * Загружает логотип организации
   */
  async uploadLogo(
    id: string,
    file: Express.Multer.File,
  ): Promise<OrganizationEntity> {
    const organization = await this.findById(id);

    // Удаляем старый логотип если есть
    if (organization.logoUrl) {
      await this.deleteLogoFile(organization.logoUrl);
    }

    const uploaded = await this.uploadsService.uploadImage(file);
    const updated = await this.organizationsRepository.update(id, {
      logoUrl: uploaded.url,
    });

    return OrganizationEntity.fromPrisma(updated);
  }

  /**
   * Удаляет логотип организации
   */
  async deleteLogo(id: string): Promise<OrganizationEntity> {
    const organization = await this.findById(id);

    if (!organization.logoUrl) {
      return organization;
    }

    await this.deleteLogoFile(organization.logoUrl);
    const updated = await this.organizationsRepository.update(id, {
      logoUrl: null,
    });

    return OrganizationEntity.fromPrisma(updated);
  }

  /**
   * Получить публичный профиль организатора
   */
  async getPublicProfile(
    organizationId: string,
    currentUserId?: string,
    locale?: string,
  ): Promise<PublicOrganizationProfileDto> {
    const snapshot =
      await this.organizationsRepository.findPublicProfileSnapshot(
        organizationId,
        currentUserId,
      );

    if (!snapshot) {
      throw new NotFoundException('Организация не найдена');
    }

    return this.toPublicProfileDto(snapshot, locale);
  }

  /**
   * Удаляет файл логотипа с диска
   */
  private async deleteLogoFile(logoUrl: string): Promise<void> {
    try {
      const filename = logoUrl.split('/').pop();
      if (filename) {
        await this.uploadsService.deleteFile(filename);
      }
    } catch {
      // Игнорируем ошибку если файл не найден
    }
  }

  private toPublicProfileDto(
    snapshot: PublicOrganizationProfileSnapshot,
    locale?: string,
  ): PublicOrganizationProfileDto {
    return new PublicOrganizationProfileDto({
      id: snapshot.organization.id,
      name: resolveLocalizedBusinessField(
        snapshot.organization.translations,
        'name',
        locale,
        snapshot.organization.name,
      ),
      companyName: resolveLocalizedBusinessField(
        snapshot.organization.translations,
        'companyName',
        locale,
        snapshot.organization.companyName,
      ),
      description:
        resolveLocalizedBusinessField(
          snapshot.organization.translations,
          'description',
          locale,
          snapshot.organization.description,
        ) || undefined,
      logoUrl: snapshot.organization.logoUrl ?? undefined,
      website: snapshot.organization.website ?? undefined,
      address: snapshot.organization.address ?? undefined,
      followersCount: snapshot.followersCount,
      eventsCount: snapshot.eventsCount,
      verificationStatus: snapshot.organization.verificationStatus,
      verifiedAt: snapshot.organization.verifiedAt ?? undefined,
      isFollowing: snapshot.isFollowing,
    });
  }
}
