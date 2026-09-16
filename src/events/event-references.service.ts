import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service';
import type { CreateVenueDto } from './dto/create-venue.dto';
import type { TagQueryDto } from './dto/tag-query.dto';
import type { VenueQueryDto } from './dto/venue-query.dto';

@Injectable()
export class EventReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  findActiveCategories() {
    return this.prisma.eventCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });
  }

  findActiveTags(query: TagQueryDto) {
    return this.prisma.tag.findMany({
      where: {
        isActive: true,
        ...(query.search
          ? {
              name: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  async findVenues(query: VenueQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                addressLine1: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(query.city
        ? {
            city: {
              contains: query.city,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query.countryCode ? { countryCode: query.countryCode } : {}),
    };

    const [venues, total] = await this.prisma.$transaction([
      this.prisma.venue.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ city: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          countryCode: true,
          latitude: true,
          longitude: true,
        },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return {
      data: venues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findVenueById(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        countryCode: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  createVenue(dto: CreateVenueDto) {
    return this.prisma.venue.create({
      data: {
        name: dto.name,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        countryCode: dto.countryCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        countryCode: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    });
  }
}
