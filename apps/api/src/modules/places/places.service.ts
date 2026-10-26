import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationVerificationStatus,
  Prisma,
  RentalPlaceStatus,
  UserType,
} from '@prisma/client';
import { UploadsService } from '../uploads/uploads.service';
import { ICurrentUser } from '../../common/interfaces';
import { BlockNoteUtil } from '../../common/utils/blocknote.util';
import { generateSlug } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CatalogPlacesQueryDto,
  CatalogPlacesSort,
  CreatePlaceDto,
  PlaceSuggestionsQueryDto,
  PlacesQueryDto,
  UpdatePlaceDto,
} from './dto';
import {
  PlacesRepository,
  RentalPlaceWithRelations,
} from './places.repository';

type PlaceWithDistance = RentalPlaceWithRelations & { distanceKm?: number };

@Injectable()
export class PlacesService {
  constructor(
    private readonly placesRepository: PlacesRepository,
    private readonly uploadsService: UploadsService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreatePlaceDto, user: ICurrentUser) {
    const organizationId = this.getOrganizationId(user, dto.organizationId);
    const organization = await this.ensureFeatureEnabled(organizationId, user);
    const slug = dto.slug
      ? await this.ensureUniqueSlug(dto.slug)
      : await this.generateUniqueSlug(dto.title);
    const description = this.normalizeDescription(dto.description);

    return this.placesRepository.create({
      slug,
      title: dto.title,
      description: description as unknown as Prisma.InputJsonValue,
      shortDescription: dto.shortDescription,
      translations: this.toJsonObject(dto.translations),
      translationMeta: this.toJsonObject(dto.translationMeta),
      richTranslations: this.toJsonObject(dto.richTranslations),
      richTranslationMeta: this.toJsonObject(dto.richTranslationMeta),
      pricePerHour: dto.pricePerHour,
      pricePerDay: dto.pricePerDay,
      currency: dto.currency,
      hourlyConditions: dto.hourlyConditions,
      dailyConditions: dto.dailyConditions,
      capacity: dto.capacity,
      amenities: dto.amenities ?? [],
      address: dto.address,
      addressNotes: dto.addressNotes,
      city: dto.city,
      latitude: dto.latitude,
      longitude: dto.longitude,
      placeId: dto.placeId,
      organization: { connect: { id: organization.id } },
      images: {
        create: this.prepareImageCreates(dto.imageUrls),
      },
    });
  }

  async findMine(query: PlacesQueryDto, user: ICurrentUser) {
    const organizationId = this.getOrganizationId(user);
    await this.ensureFeatureEnabled(organizationId, user);
    const result = await this.placesRepository.findByOrganization(
      organizationId,
      query,
    );

    return {
      ...result,
      data: result.data.map((place: RentalPlaceWithRelations) =>
        this.mapPlace(place),
      ),
    };
  }

  async findOneForOwner(id: string, user: ICurrentUser) {
    const organizationId = this.getOrganizationId(user);
    await this.ensureFeatureEnabled(organizationId, user);
    const place = await this.getOwnedPlace(id, organizationId);
    return this.mapPlace(place);
  }

  async update(id: string, dto: UpdatePlaceDto, user: ICurrentUser) {
    const organizationId = this.getOrganizationId(user);
    await this.ensureFeatureEnabled(organizationId, user);
    const place = await this.getOwnedPlace(id, organizationId);

    const updateData: Prisma.RentalPlaceUpdateInput = {};

    if (dto.slug !== undefined) {
      updateData.slug = await this.ensureUniqueSlug(dto.slug, id);
    } else if (dto.title && dto.title !== place.title) {
      updateData.slug = await this.generateUniqueSlug(dto.title, id);
    }

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.shortDescription !== undefined) {
      updateData.shortDescription = dto.shortDescription;
    }
    if (dto.translations !== undefined) {
      updateData.translations = this.toJsonObject(dto.translations);
    }
    if (dto.translationMeta !== undefined) {
      updateData.translationMeta = this.toJsonObject(dto.translationMeta);
    }
    if (dto.richTranslations !== undefined) {
      updateData.richTranslations = this.toJsonObject(dto.richTranslations);
    }
    if (dto.richTranslationMeta !== undefined) {
      updateData.richTranslationMeta = this.toJsonObject(
        dto.richTranslationMeta,
      );
    }
    if (dto.description !== undefined) {
      updateData.description = this.normalizeDescription(
        dto.description,
      ) as unknown as Prisma.InputJsonValue;
    }
    if (dto.pricePerHour !== undefined)
      updateData.pricePerHour = dto.pricePerHour;
    if (dto.pricePerDay !== undefined)
      updateData.pricePerDay = dto.pricePerDay;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.hourlyConditions !== undefined)
      updateData.hourlyConditions = dto.hourlyConditions;
    if (dto.dailyConditions !== undefined)
      updateData.dailyConditions = dto.dailyConditions;
    if (dto.capacity !== undefined) updateData.capacity = dto.capacity;
    if (dto.amenities !== undefined) updateData.amenities = dto.amenities;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.addressNotes !== undefined) {
      updateData.addressNotes = dto.addressNotes;
    }
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.placeId !== undefined) updateData.placeId = dto.placeId;

    if (dto.imageUrls !== undefined) {
      const removedUrls = place.images
        .map((image: { url: string }) => image.url)
        .filter((url: string) => !dto.imageUrls!.includes(url));

      updateData.images = {
        deleteMany: {},
        create: this.prepareImageCreates(dto.imageUrls),
      };

      await this.deleteFilesByUrl(removedUrls);
    }

    const updated = await this.placesRepository.update(id, updateData);
    return this.mapPlace(updated);
  }

  async delete(id: string, user: ICurrentUser): Promise<void> {
    const organizationId = this.getOrganizationId(user);
    await this.ensureFeatureEnabled(organizationId, user);
    const place = await this.getOwnedPlace(id, organizationId);

    await this.deleteFilesByUrl(
      place.images.map((image: { url: string }) => image.url),
    );
    await this.placesRepository.delete(id);
  }

  async publish(id: string, user: ICurrentUser) {
    const organizationId = this.getOrganizationId(user);
    const organization = await this.ensureFeatureEnabled(organizationId, user);
    if (
      organization.verificationStatus !==
      OrganizationVerificationStatus.APPROVED
    ) {
      throw new ForbiddenException(
        'Публикация площадок доступна только верифицированным организациям',
      );
    }

    const place = await this.getOwnedPlace(id, organizationId);
    if (place.images.length === 0) {
      throw new BadRequestException(
        'Нельзя публиковать площадку без хотя бы одной фотографии',
      );
    }

    const updated = await this.placesRepository.update(id, {
      status: RentalPlaceStatus.PUBLISHED,
    });

    return this.mapPlace(updated);
  }

  async archive(id: string, user: ICurrentUser) {
    const organizationId = this.getOrganizationId(user);
    await this.ensureFeatureEnabled(organizationId, user);
    await this.getOwnedPlace(id, organizationId);

    const updated = await this.placesRepository.update(id, {
      status: RentalPlaceStatus.ARCHIVED,
    });

    return this.mapPlace(updated);
  }

  async uploadImage(file: Express.Multer.File, user: ICurrentUser) {
    const organizationId = this.getOrganizationId(user);
    await this.ensureFeatureEnabled(organizationId, user);
    return this.uploadsService.uploadPlaceImage(file);
  }

  async getCatalog(query: CatalogPlacesQueryDto) {
    const places = await this.placesRepository.findPublishedCatalog(query);
    const paginated = this.paginateAndSortPlaces(places, query);

    return {
      ...paginated,
      data: paginated.data.map((place) => this.mapPlace(place, query)),
    };
  }

  async getNearbySuggestions(query: PlaceSuggestionsQueryDto) {
    const places = await this.placesRepository.findPublishedCatalog({
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: query.radiusKm,
      limit: query.limit,
      page: 1,
      sort: CatalogPlacesSort.NEAREST,
    });

    return this.paginateAndSortPlaces(places, {
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: query.radiusKm,
      limit: query.limit,
      page: 1,
      sort: CatalogPlacesSort.NEAREST,
    }).data.map((place) => this.mapPlace(place, query));
  }

  async findPublicBySlug(slug: string) {
    const place = await this.placesRepository.findPublicBySlug(slug);
    if (!place) {
      throw new NotFoundException('Площадка не найдена');
    }

    return this.mapPlace(place);
  }

  async findPublicById(id: string) {
    const place = await this.placesRepository.findPublicById(id);
    if (!place) {
      throw new NotFoundException('Площадка не найдена');
    }

    return this.mapPlace(place);
  }

  async getPublishedPlaceForEvent(
    id: string,
  ): Promise<RentalPlaceWithRelations> {
    const place = await this.placesRepository.findPublishedForEvent(id);
    if (!place) {
      throw new NotFoundException('Площадка для аренды не найдена');
    }
    return place;
  }

  async applyPlaceToEventInput(
    rentalPlaceId: string | null | undefined,
    data: {
      venue?: string | null;
      address?: string | null;
      city?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      placeId?: string | null;
    },
  ) {
    if (rentalPlaceId === undefined) {
      return {};
    }

    if (rentalPlaceId === null) {
      return {
        rentalPlaceId: null,
      };
    }

    const place = await this.getPublishedPlaceForEvent(rentalPlaceId);

    return {
      rentalPlaceId: place.id,
      venue: data.venue ?? place.title,
      address: data.address ?? place.address,
      city: data.city ?? place.city ?? null,
      latitude: data.latitude ?? Number(place.latitude),
      longitude: data.longitude ?? Number(place.longitude),
      placeId: data.placeId ?? place.placeId ?? null,
    };
  }

  private async getOwnedPlace(id: string, organizationId: string) {
    const place = await this.placesRepository.findById(id);
    if (!place || place.organizationId !== organizationId) {
      throw new NotFoundException('Площадка не найдена');
    }
    return place;
  }

  private async ensureFeatureEnabled(
    organizationId: string,
    user: ICurrentUser,
  ) {
    if (user.type === UserType.SUPER_ADMIN) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });
      if (!org) {
        throw new NotFoundException('Организация не найдена');
      }
      return org;
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization || organization.deletedAt) {
      throw new NotFoundException('Организация не найдена');
    }

    if (!organization.placesFeatureEnabled) {
      throw new ForbiddenException(
        'Супер-админ ещё не включил организации функцию арендуемых площадок',
      );
    }

    return organization;
  }

  private getOrganizationId(user: ICurrentUser, overrideId?: string) {
    if (user.type === UserType.ORGANIZATION) {
      return user.sub;
    }

    if (user.type === UserType.MEMBER) {
      return user.organizationId!;
    }

    if (user.type === UserType.SUPER_ADMIN && overrideId) {
      return overrideId;
    }

    throw new ForbiddenException('Недостаточно прав для управления площадками');
  }

  private normalizeDescription(description: unknown) {
    if (description === undefined) {
      return undefined;
    }

    if (description === null) {
      return null;
    }

    const normalized = BlockNoteUtil.normalizeDocument(description as any[]);
    if (!BlockNoteUtil.isValid(normalized)) {
      throw new BadRequestException('Invalid BlockNote document structure');
    }

    return normalized;
  }

  private toJsonObject(value: unknown): Prisma.InputJsonValue {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Prisma.InputJsonValue;
    }

    return {};
  }

  private prepareImageCreates(urls: string[]) {
    return urls.map((url, index) => ({
      url,
      sortOrder: index,
    }));
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string) {
    let result = slug;
    let counter = 1;
    while (await this.placesRepository.slugExists(result, excludeId)) {
      result = `${slug}-${counter}`;
      counter++;
    }
    return result;
  }

  private async generateUniqueSlug(title: string, excludeId?: string) {
    const baseSlug = generateSlug(title);
    return this.ensureUniqueSlug(baseSlug, excludeId);
  }

  private paginateAndSortPlaces(
    places: RentalPlaceWithRelations[],
    query: Pick<
      CatalogPlacesQueryDto,
      'page' | 'limit' | 'sort' | 'latitude' | 'longitude' | 'radiusKm'
    >,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const withDistance =
      query.latitude !== undefined && query.longitude !== undefined;

    let processed: PlaceWithDistance[] = places.map((place) => ({
      ...place,
      distanceKm: withDistance
        ? this.calculateDistanceKm(
            query.latitude!,
            query.longitude!,
            Number(place.latitude),
            Number(place.longitude),
          )
        : undefined,
    }));

    if (query.radiusKm !== undefined && withDistance) {
      processed = processed.filter((place) => {
        return (
          place.distanceKm !== undefined && place.distanceKm <= query.radiusKm!
        );
      });
    }

    const sort =
      query.sort ??
      (withDistance ? CatalogPlacesSort.NEAREST : CatalogPlacesSort.NEWEST);

    const getMinPrice = (p: PlaceWithDistance) =>
      Math.min(
        p.pricePerDay ? Number(p.pricePerDay) : Infinity,
        p.pricePerHour ? Number(p.pricePerHour) : Infinity,
      );

    processed.sort((a, b) => {
      switch (sort) {
        case CatalogPlacesSort.PRICE_ASC:
          return getMinPrice(a) - getMinPrice(b);
        case CatalogPlacesSort.PRICE_DESC:
          return getMinPrice(b) - getMinPrice(a);
        case CatalogPlacesSort.NEAREST:
          return (
            (a.distanceKm ?? Number.MAX_SAFE_INTEGER) -
            (b.distanceKm ?? Number.MAX_SAFE_INTEGER)
          );
        case CatalogPlacesSort.NEWEST:
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    const total = processed.length;
    const start = (page - 1) * limit;
    const data = processed.slice(start, start + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mapPlace(
    place: PlaceWithDistance,
    query?: { latitude?: number; longitude?: number },
  ) {
    const coverImage = place.images?.[0]?.url ?? null;
    const distanceKm =
      query?.latitude !== undefined && query?.longitude !== undefined
        ? this.calculateDistanceKm(
            query.latitude,
            query.longitude,
            Number(place.latitude),
            Number(place.longitude),
          )
        : place.distanceKm;

    return {
      ...place,
      coverImage,
      distanceKm:
        distanceKm !== undefined ? Number(distanceKm.toFixed(2)) : undefined,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      pricePerHour: place.pricePerHour ? Number(place.pricePerHour) : null,
      pricePerDay: place.pricePerDay ? Number(place.pricePerDay) : null,
      organization: place.organization
        ? {
            id: place.organization.id,
            name: place.organization.companyName,
            logoUrl: place.organization.logoUrl,
            verificationStatus: place.organization.verificationStatus,
          }
        : undefined,
    };
  }

  private calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  private async deleteFilesByUrl(urls: string[]) {
    for (const url of urls) {
      try {
        if (!url.startsWith('/uploads/')) {
          continue;
        }
        const relativePath = url.replace('/uploads/', '');
        await this.uploadsService.deleteFile(relativePath);
      } catch {
        // Игнорируем отсутствие файла на диске.
      }
    }
  }
}
