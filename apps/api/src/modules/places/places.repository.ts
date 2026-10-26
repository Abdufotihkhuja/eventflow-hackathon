import { Injectable } from '@nestjs/common';
import { Prisma, RentalPlaceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogPlacesQueryDto, PlacesQueryDto } from './dto';

const rentalPlaceInclude = {
  images: {
    orderBy: { sortOrder: 'asc' as const },
  },
  organization: {
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      verificationStatus: true,
      placesFeatureEnabled: true,
    },
  },
  _count: {
    select: {
      events: true,
    },
  },
} satisfies Prisma.RentalPlaceInclude;

export type RentalPlaceWithRelations = Prisma.RentalPlaceGetPayload<{
  include: typeof rentalPlaceInclude;
}>;

@Injectable()
export class PlacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.RentalPlaceCreateInput,
  ): Promise<RentalPlaceWithRelations> {
    return this.prisma.rentalPlace.create({
      data,
      include: rentalPlaceInclude,
    });
  }

  async update(
    id: string,
    data: Prisma.RentalPlaceUpdateInput,
  ): Promise<RentalPlaceWithRelations> {
    return this.prisma.rentalPlace.update({
      where: { id },
      data,
      include: rentalPlaceInclude,
    });
  }

  async delete(id: string): Promise<RentalPlaceWithRelations> {
    return this.prisma.rentalPlace.delete({
      where: { id },
      include: rentalPlaceInclude,
    });
  }

  async findById(id: string): Promise<RentalPlaceWithRelations | null> {
    return this.prisma.rentalPlace.findUnique({
      where: { id },
      include: rentalPlaceInclude,
    });
  }

  async findPublicBySlug(
    slug: string,
  ): Promise<RentalPlaceWithRelations | null> {
    return this.prisma.rentalPlace.findFirst({
      where: {
        slug,
        status: RentalPlaceStatus.PUBLISHED,
        organization: {
          deletedAt: null,
          verificationStatus: 'APPROVED',
          placesFeatureEnabled: true,
        },
      },
      include: rentalPlaceInclude,
    });
  }

  async findPublicById(id: string): Promise<RentalPlaceWithRelations | null> {
    return this.prisma.rentalPlace.findFirst({
      where: {
        id,
        status: RentalPlaceStatus.PUBLISHED,
        organization: {
          deletedAt: null,
          verificationStatus: 'APPROVED',
          placesFeatureEnabled: true,
        },
      },
      include: rentalPlaceInclude,
    });
  }

  async findPublishedForEvent(
    id: string,
  ): Promise<RentalPlaceWithRelations | null> {
    return this.prisma.rentalPlace.findFirst({
      where: {
        id,
        status: RentalPlaceStatus.PUBLISHED,
        organization: {
          deletedAt: null,
          verificationStatus: 'APPROVED',
          placesFeatureEnabled: true,
        },
      },
      include: rentalPlaceInclude,
    });
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const place = await this.prisma.rentalPlace.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!place) {
      return false;
    }

    if (excludeId && place.id === excludeId) {
      return false;
    }

    return true;
  }

  async findByOrganization(organizationId: string, query: PlacesQueryDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RentalPlaceWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.rentalPlace.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: rentalPlaceInclude,
      }),
      this.prisma.rentalPlace.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPublishedCatalog(query: CatalogPlacesQueryDto) {
    const { search, city, currency, minPrice, maxPrice, organizationId } =
      query;

    return this.prisma.rentalPlace.findMany({
      where: {
        status: RentalPlaceStatus.PUBLISHED,
        organization: {
          deletedAt: null,
          verificationStatus: 'APPROVED',
          placesFeatureEnabled: true,
          ...(organizationId && { id: organizationId }),
        },
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { shortDescription: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
        ...(currency && { currency }),
        ...((minPrice !== undefined || maxPrice !== undefined) && {
          OR: [
            {
              pricePerHour: {
                ...(minPrice !== undefined && { gte: minPrice }),
                ...(maxPrice !== undefined && { lte: maxPrice }),
              },
            },
            {
              pricePerDay: {
                ...(minPrice !== undefined && { gte: minPrice }),
                ...(maxPrice !== undefined && { lte: maxPrice }),
              },
            },
          ],
        }),
      },
      include: rentalPlaceInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
}
