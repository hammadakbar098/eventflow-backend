import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import slugify from 'slugify';

import { PrismaService } from '../prisma/prisma/prisma.service';
import {
  EventFormat,
  EventMediaType,
  EventStatus,
} from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import type { CreateEventDto } from './dto/create-event.dto';

import type { EventQueryDto } from './dto/event-query.dto';
import type { MyEventsQueryDto } from './dto/my-events-query.dto';
import type { UpdateEventDto } from './dto/update-event.dto';
import type { CancelEventDto } from './dto/cancel-event.dto';
import type { CreateEventMediaDto } from './dto/create-event-media.dto';
import type { PostponeEventDto } from './dto/postpone-event.dto';
import type { ReorderEventMediaDto } from './dto/reorder-event-media.dto';
import type { RescheduleEventDto } from './dto/reschedule-event.dto';
import type { UpdateEventMediaDto } from './dto/update-event-media.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto, user: AuthenticatedUser) {
    this.validateDates(dto.startAt, dto.endAt);

    this.validateFormatRequirements(dto);

    const category = await this.prisma.eventCategory.findUnique({
      where: {
        id: dto.categoryId,
      },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Event category not found');
    }

    if (dto.venueId) {
      const venue = await this.prisma.venue.findUnique({
        where: {
          id: dto.venueId,
        },
      });

      if (!venue) {
        throw new NotFoundException('Venue not found');
      }
    }

    if (dto.tagIds?.length) {
      const tags = await this.prisma.tag.findMany({
        where: {
          id: {
            in: dto.tagIds,
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (tags.length !== dto.tagIds.length) {
        throw new BadRequestException(
          'One or more tags are invalid or inactive',
        );
      }
    }

    const slug = await this.generateUniqueSlug(dto.title);

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          organizerId: user.id,

          categoryId: dto.categoryId,

          title: dto.title.trim(),
          slug,

          description: dto.description.trim(),

          format: dto.format,

          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          timezone: dto.timezone.trim(),

          capacity: dto.capacity,

          venueId: dto.venueId,

          onlineDetails: dto.onlineDetails
            ? {
                create: {
                  platform: dto.onlineDetails.platform.trim(),

                  accessUrl: dto.onlineDetails.accessUrl,

                  accessCode: dto.onlineDetails.accessCode?.trim(),

                  accessInstructions:
                    dto.onlineDetails.accessInstructions?.trim(),
                },
              }
            : undefined,

          tags: dto.tagIds?.length
            ? {
                create: dto.tagIds.map((tagId) => ({
                  tag: {
                    connect: {
                      id: tagId,
                    },
                  },
                })),
              }
            : undefined,
        },

        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          format: true,
          status: true,
          startAt: true,
          endAt: true,
          timezone: true,
          capacity: true,
          createdAt: true,

          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          venue: true,

          onlineDetails: true,

          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      return event;
    });
  }

  private validateDates(startAt: string, endAt: string) {
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (end <= start) {
      throw new BadRequestException('Event end time must be after start time');
    }
  }

  private validateFormatRequirements(dto: CreateEventDto) {
    switch (dto.format) {
      case EventFormat.PHYSICAL:
        if (!dto.venueId) {
          throw new BadRequestException('Physical events require a venue');
        }

        if (dto.onlineDetails) {
          throw new BadRequestException(
            'Physical events cannot have online details',
          );
        }

        break;

      case EventFormat.ONLINE:
        if (dto.venueId) {
          throw new BadRequestException(
            'Online events cannot have a physical venue',
          );
        }

        if (!dto.onlineDetails) {
          throw new BadRequestException('Online events require online details');
        }

        break;

      case EventFormat.HYBRID:
        if (!dto.venueId) {
          throw new BadRequestException('Hybrid events require a venue');
        }

        if (!dto.onlineDetails) {
          throw new BadRequestException('Hybrid events require online details');
        }

        break;
    }
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = slugify(title, {
      lower: true,
      strict: true,
      trim: true,
    });

    let slug = baseSlug;
    let suffix = 2;

    while (
      await this.prisma.event.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    return slug;
  }

  async findMineBySlug(slug: string, userId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        slug,
        organizerId: userId,
        deletedAt: null,
      },

      select: {
        id: true,
        title: true,
        slug: true,
        description: true,

        status: true,
        format: true,

        startAt: true,
        endAt: true,
        timezone: true,

        capacity: true,

        cancelledAt: true,
        cancellationReason: true,
        postponedAt: true,
        postponementReason: true,

        createdAt: true,
        updatedAt: true,

        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        venue: true,

        onlineDetails: true,

        media: {
          orderBy: {
            sortOrder: 'asc',
          },
        },

        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      ...event,

      tags: event.tags.map((eventTag) => eventTag.tag),
    };
  }
  async findPublicUpcoming(query: EventQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;
    const now = new Date();
    const startFrom = query.startFrom ? new Date(query.startFrom) : now;
    const startTo = query.startTo ? new Date(query.startTo) : undefined;

    if (startTo && startTo < startFrom) {
      throw new BadRequestException('startTo must be after startFrom');
    }

    const tagIds = [...new Set([query.tagId, ...(query.tagIds ?? [])])].filter(
      (tagId): tagId is string => Boolean(tagId),
    );

    const where: Prisma.EventWhereInput = {
      status: {
        in: [EventStatus.PUBLISHED, EventStatus.SOLD_OUT],
      },
      deletedAt: null,
      startAt: {
        gt: startFrom > now ? startFrom : now,
        ...(startTo ? { lte: startTo } : {}),
      },
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.format ? { format: query.format } : {}),
      ...(tagIds.length
        ? {
            tags: {
              some: {
                tagId: { in: tagIds },
              },
            },
          }
        : {}),
      ...(query.city || query.countryCode
        ? {
            venue: {
              is: {
                ...(query.city
                  ? {
                      city: {
                        contains: query.city,
                        mode: 'insensitive' as const,
                      },
                    }
                  : {}),
                ...(query.countryCode
                  ? { countryCode: query.countryCode }
                  : {}),
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          startAt: 'asc',
        },

        select: {
          id: true,
          title: true,
          slug: true,

          format: true,
          startAt: true,
          endAt: true,
          timezone: true,
          capacity: true,

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          venue: {
            select: {
              id: true,
              name: true,
              city: true,
              countryCode: true,
            },
          },

          media: {
            where: {
              type: 'COVER',
            },

            take: 1,

            select: {
              storageKey: true,
              altText: true,
              width: true,
              height: true,
            },
          },

          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.event.count({
        where,
      }),
    ]);

    return {
      data: events.map((event) => ({
        ...event,

        tags: event.tags.map((eventTag) => eventTag.tag),

        coverImage: event.media[0] ?? null,

        media: undefined,
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async publish(slug: string, userId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        slug,
        organizerId: userId,
        deletedAt: null,
      },
      include: {
        category: true,
        venue: true,
        onlineDetails: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only draft events can be published');
    }

    if (!event.category.isActive) {
      throw new BadRequestException('Event category is inactive');
    }

    if (event.startAt <= new Date()) {
      throw new BadRequestException('Event start time must be in the future');
    }

    if (event.endAt <= event.startAt) {
      throw new BadRequestException('Event end time must be after start time');
    }

    switch (event.format) {
      case EventFormat.PHYSICAL:
        if (!event.venueId) {
          throw new BadRequestException('Physical events require a venue');
        }
        if (event.onlineDetails) {
          throw new BadRequestException(
            'Physical events cannot have online details',
          );
        }
        break;

      case EventFormat.ONLINE:
        if (event.venueId) {
          throw new BadRequestException(
            'Online events cannot have a physical venue',
          );
        }
        if (!event.onlineDetails) {
          throw new BadRequestException('Online events require online details');
        }
        break;

      case EventFormat.HYBRID:
        if (!event.venueId || !event.onlineDetails) {
          throw new BadRequestException(
            'Hybrid events require both a venue and online details',
          );
        }
        break;
    }

    return this.prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        status: EventStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        startAt: true,
        endAt: true,
        updatedAt: true,
      },
    });
  }

  async findPublicBySlug(slug: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        slug,
        status: {
          in: [EventStatus.PUBLISHED, EventStatus.SOLD_OUT],
        },
        deletedAt: null,
      },

      select: {
        id: true,
        title: true,
        slug: true,
        description: true,

        status: true,
        format: true,

        startAt: true,
        endAt: true,
        timezone: true,
        capacity: true,

        createdAt: true,
        updatedAt: true,

        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        venue: {
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
        },

        media: {
          orderBy: {
            sortOrder: 'asc',
          },

          select: {
            id: true,
            type: true,
            storageKey: true,
            altText: true,
            width: true,
            height: true,
            sortOrder: true,
          },
        },

        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },

        /*
         * IMPORTANT:
         * Public users can know which platform is used,
         * but NOT the private meeting URL/code.
         */
        onlineDetails: {
          select: {
            platform: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      ...event,

      tags: event.tags.map((eventTag) => eventTag.tag),
    };
  }

  async findMine(userId: string, query: MyEventsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {
      organizerId: userId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.format ? { format: query.format } : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [events, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          createdAt: 'desc',
        },

        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          format: true,
          startAt: true,
          endAt: true,
          timezone: true,
          capacity: true,
          createdAt: true,
          updatedAt: true,

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          venue: {
            select: {
              id: true,
              name: true,
              city: true,
              countryCode: true,
            },
          },

          media: {
            where: {
              type: 'COVER',
            },
            take: 1,
            select: {
              storageKey: true,
              altText: true,
            },
          },
        },
      }),

      this.prisma.event.count({
        where,
      }),
    ]);

    return {
      data: events.map((event) => ({
        ...event,
        coverImage: event.media[0] ?? null,
        media: undefined,
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(slug: string, userId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findFirst({
      where: {
        slug,
        organizerId: userId,
        deletedAt: null,
      },
      include: {
        onlineDetails: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only draft events can be edited');
    }

    const finalStartAt = dto.startAt ? new Date(dto.startAt) : event.startAt;

    const finalEndAt = dto.endAt ? new Date(dto.endAt) : event.endAt;

    if (finalEndAt <= finalStartAt) {
      throw new BadRequestException('Event end time must be after start time');
    }

    const finalFormat = dto.format ?? event.format;

    const venueWasProvided = dto.venueId !== undefined;

    const finalVenueId = venueWasProvided
      ? (dto.venueId ?? null)
      : event.venueId;

    const onlineDetailsWereProvided = dto.onlineDetails !== undefined;

    let hasOnlineDetails: boolean;

    if (onlineDetailsWereProvided) {
      hasOnlineDetails =
        dto.onlineDetails !== null && dto.onlineDetails !== undefined;
    } else {
      hasOnlineDetails = Boolean(event.onlineDetails);
    }
    switch (finalFormat) {
      case EventFormat.PHYSICAL:
        if (!finalVenueId) {
          throw new BadRequestException('Physical events require a venue');
        }

        if (hasOnlineDetails) {
          throw new BadRequestException(
            'Physical events cannot have online details',
          );
        }

        break;

      case EventFormat.ONLINE:
        if (finalVenueId) {
          throw new BadRequestException(
            'Online events cannot have a physical venue',
          );
        }

        if (!hasOnlineDetails) {
          throw new BadRequestException('Online events require online details');
        }

        break;

      case EventFormat.HYBRID:
        if (!finalVenueId) {
          throw new BadRequestException('Hybrid events require a venue');
        }

        if (!hasOnlineDetails) {
          throw new BadRequestException('Hybrid events require online details');
        }

        break;
    }

    if (dto.categoryId) {
      const category = await this.prisma.eventCategory.findFirst({
        where: {
          id: dto.categoryId,
          isActive: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Event category not found');
      }
    }

    if (finalVenueId && venueWasProvided) {
      const venue = await this.prisma.venue.findUnique({
        where: {
          id: finalVenueId,
        },
      });

      if (!venue) {
        throw new NotFoundException('Venue not found');
      }
    }

    if (dto.tagIds) {
      const tags = await this.prisma.tag.findMany({
        where: {
          id: {
            in: dto.tagIds,
          },
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (tags.length !== dto.tagIds.length) {
        throw new BadRequestException(
          'One or more tags are invalid or inactive',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.tagIds) {
        await tx.eventTag.deleteMany({
          where: {
            eventId: event.id,
          },
        });

        if (dto.tagIds.length > 0) {
          await tx.eventTag.createMany({
            data: dto.tagIds.map((tagId) => ({
              eventId: event.id,
              tagId,
            })),
          });
        }
      }

      if (onlineDetailsWereProvided) {
        if (dto.onlineDetails === null) {
          await tx.eventOnlineDetails.deleteMany({
            where: {
              eventId: event.id,
            },
          });
        } else if (dto.onlineDetails) {
          await tx.eventOnlineDetails.upsert({
            where: {
              eventId: event.id,
            },

            create: {
              eventId: event.id,
              platform: dto.onlineDetails.platform.trim(),
              accessUrl: dto.onlineDetails.accessUrl,
              accessCode: dto.onlineDetails.accessCode?.trim(),
              accessInstructions: dto.onlineDetails.accessInstructions?.trim(),
            },

            update: {
              platform: dto.onlineDetails.platform.trim(),
              accessUrl: dto.onlineDetails.accessUrl,
              accessCode: dto.onlineDetails.accessCode?.trim(),
              accessInstructions: dto.onlineDetails.accessInstructions?.trim(),
            },
          });
        }
      }

      return tx.event.update({
        where: {
          id: event.id,
        },

        data: {
          title: dto.title?.trim(),
          description: dto.description?.trim(),
          format: dto.format,
          categoryId: dto.categoryId,
          startAt: dto.startAt ? new Date(dto.startAt) : undefined,
          endAt: dto.endAt ? new Date(dto.endAt) : undefined,
          timezone: dto.timezone?.trim(),
          capacity: dto.capacity,

          ...(venueWasProvided
            ? {
                venueId: dto.venueId ?? null,
              }
            : {}),
        },

        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          format: true,
          startAt: true,
          endAt: true,
          timezone: true,
          capacity: true,
          updatedAt: true,

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          venue: true,

          onlineDetails: true,

          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async remove(slug: string, userId: string) {
    const event = await this.findOwnedEventForAction(slug, userId);

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only draft events can be deleted');
    }

    const result = await this.prisma.event.updateMany({
      where: {
        id: event.id,
        status: EventStatus.DRAFT,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    if (result.count !== 1) {
      throw new BadRequestException('Event can no longer be deleted');
    }

    return { message: 'Event deleted successfully' };
  }

  async cancel(slug: string, userId: string, dto: CancelEventDto) {
    const event = await this.findOwnedEventForAction(slug, userId);
    const cancellableStatuses: EventStatus[] = [
      EventStatus.SCHEDULED,
      EventStatus.PUBLISHED,
      EventStatus.SOLD_OUT,
      EventStatus.POSTPONED,
    ];

    if (event.status === EventStatus.DRAFT) {
      throw new BadRequestException(
        'Draft events should be deleted, not cancelled',
      );
    }

    if (!cancellableStatuses.includes(event.status)) {
      throw new BadRequestException(
        `Events with status ${event.status} cannot be cancelled`,
      );
    }

    const now = new Date();
    const result = await this.prisma.event.updateMany({
      where: {
        id: event.id,
        status: event.status,
        deletedAt: null,
      },
      data: {
        status: EventStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: dto.reason,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException('Event status changed; retry the request');
    }

    return this.prisma.event.findUnique({
      where: { id: event.id },
      select: {
        id: true,
        slug: true,
        status: true,
        cancelledAt: true,
        cancellationReason: true,
        updatedAt: true,
      },
    });
  }

  async postpone(slug: string, userId: string, dto: PostponeEventDto) {
    const event = await this.findOwnedEventForAction(slug, userId);
    const postponableStatuses: EventStatus[] = [
      EventStatus.SCHEDULED,
      EventStatus.PUBLISHED,
      EventStatus.SOLD_OUT,
    ];

    if (!postponableStatuses.includes(event.status)) {
      throw new BadRequestException(
        `Events with status ${event.status} cannot be postponed`,
      );
    }

    if (event.startAt <= new Date()) {
      throw new BadRequestException(
        'An event cannot be postponed after it starts',
      );
    }

    const now = new Date();
    const result = await this.prisma.event.updateMany({
      where: {
        id: event.id,
        status: event.status,
        deletedAt: null,
      },
      data: {
        status: EventStatus.POSTPONED,
        postponedAt: now,
        postponementReason: dto.reason,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException('Event status changed; retry the request');
    }

    return this.prisma.event.findUnique({
      where: { id: event.id },
      select: {
        id: true,
        slug: true,
        status: true,
        postponedAt: true,
        postponementReason: true,
        updatedAt: true,
      },
    });
  }

  async reschedule(slug: string, userId: string, dto: RescheduleEventDto) {
    const event = await this.findOwnedEventForAction(slug, userId);

    if (event.status !== EventStatus.POSTPONED) {
      throw new BadRequestException('Only postponed events can be rescheduled');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt <= new Date()) {
      throw new BadRequestException('Event start time must be in the future');
    }

    if (endAt <= startAt) {
      throw new BadRequestException('Event end time must be after start time');
    }

    const result = await this.prisma.event.updateMany({
      where: {
        id: event.id,
        status: EventStatus.POSTPONED,
        deletedAt: null,
      },
      data: {
        status: EventStatus.PUBLISHED,
        startAt,
        endAt,
        timezone: dto.timezone,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException('Event status changed; retry the request');
    }

    return this.prisma.event.findUnique({
      where: { id: event.id },
      select: {
        id: true,
        slug: true,
        status: true,
        startAt: true,
        endAt: true,
        timezone: true,
        postponedAt: true,
        postponementReason: true,
        updatedAt: true,
      },
    });
  }

  async complete(slug: string, userId: string) {
    const event = await this.findOwnedEventForAction(slug, userId);
    const completableStatuses: EventStatus[] = [
      EventStatus.SCHEDULED,
      EventStatus.PUBLISHED,
      EventStatus.SOLD_OUT,
    ];

    if (!completableStatuses.includes(event.status)) {
      throw new BadRequestException(
        `Events with status ${event.status} cannot be completed`,
      );
    }

    if (event.endAt > new Date()) {
      throw new BadRequestException('Event cannot be completed before it ends');
    }

    const result = await this.prisma.event.updateMany({
      where: {
        id: event.id,
        status: event.status,
        deletedAt: null,
        endAt: { lte: new Date() },
      },
      data: { status: EventStatus.COMPLETED },
    });

    if (result.count !== 1) {
      throw new BadRequestException('Event status changed; retry the request');
    }

    return this.prisma.event.findUnique({
      where: { id: event.id },
      select: {
        id: true,
        slug: true,
        status: true,
        endAt: true,
        updatedAt: true,
      },
    });
  }

  async addMedia(slug: string, userId: string, dto: CreateEventMediaDto) {
    const event = await this.findOwnedEventForAction(slug, userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.type === EventMediaType.COVER) {
        const existingCover = await tx.eventMedia.findFirst({
          where: { eventId: event.id, type: EventMediaType.COVER },
          select: { id: true },
        });

        if (existingCover) {
          throw new BadRequestException('Event already has a cover image');
        }
      }

      let sortOrder = 0;

      if (dto.type === EventMediaType.GALLERY) {
        const aggregate = await tx.eventMedia.aggregate({
          where: { eventId: event.id, type: EventMediaType.GALLERY },
          _max: { sortOrder: true },
        });
        sortOrder = (aggregate._max.sortOrder ?? -1) + 1;
      }

      return tx.eventMedia.create({
        data: {
          eventId: event.id,
          type: dto.type,
          storageKey: dto.storageKey,
          originalName: dto.originalName,
          mimeType: dto.mimeType.toLowerCase(),
          sizeBytes: dto.sizeBytes,
          width: dto.width,
          height: dto.height,
          altText: dto.altText,
          sortOrder,
        },
      });
    });
  }

  async updateMedia(
    slug: string,
    mediaId: string,
    userId: string,
    dto: UpdateEventMediaDto,
  ) {
    const event = await this.findOwnedEventForAction(slug, userId);
    const media = await this.prisma.eventMedia.findFirst({
      where: { id: mediaId, eventId: event.id },
    });

    if (!media) {
      throw new NotFoundException('Event media not found');
    }

    const finalType = dto.type ?? media.type;
    let finalSortOrder = dto.sortOrder;

    if (finalType === EventMediaType.COVER) {
      const existingCover = await this.prisma.eventMedia.findFirst({
        where: {
          eventId: event.id,
          type: EventMediaType.COVER,
          id: { not: media.id },
        },
        select: { id: true },
      });

      if (existingCover) {
        throw new BadRequestException('Event already has a cover image');
      }

      finalSortOrder = 0;
    } else if (
      media.type === EventMediaType.COVER &&
      dto.sortOrder === undefined
    ) {
      const aggregate = await this.prisma.eventMedia.aggregate({
        where: { eventId: event.id, type: EventMediaType.GALLERY },
        _max: { sortOrder: true },
      });
      finalSortOrder = (aggregate._max.sortOrder ?? -1) + 1;
    }

    return this.prisma.eventMedia.update({
      where: { id: media.id },
      data: {
        type: dto.type,
        altText: dto.altText,
        sortOrder: finalSortOrder,
      },
    });
  }

  async removeMedia(slug: string, mediaId: string, userId: string) {
    const event = await this.findOwnedEventForAction(slug, userId);
    const media = await this.prisma.eventMedia.findFirst({
      where: { id: mediaId, eventId: event.id },
      select: { id: true },
    });

    if (!media) {
      throw new NotFoundException('Event media not found');
    }

    await this.prisma.eventMedia.delete({ where: { id: media.id } });

    // Storage deletion belongs to the future object-storage integration.
    return { message: 'Event media metadata deleted successfully' };
  }

  async reorderMedia(slug: string, userId: string, dto: ReorderEventMediaDto) {
    const event = await this.findOwnedEventForAction(slug, userId);
    const mediaIds = dto.items.map((item) => item.mediaId);
    const media = await this.prisma.eventMedia.findMany({
      where: { id: { in: mediaIds }, eventId: event.id },
      select: { id: true, type: true },
    });

    if (media.length !== mediaIds.length) {
      throw new BadRequestException(
        'One or more media items do not belong to this event',
      );
    }

    if (media.some((item) => item.type !== EventMediaType.GALLERY)) {
      throw new BadRequestException('Only gallery images can be reordered');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.eventMedia.update({
          where: { id: item.mediaId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return this.prisma.eventMedia.findMany({
      where: { eventId: event.id, type: EventMediaType.GALLERY },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async findOwnedEventForAction(slug: string, userId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        slug,
        organizerId: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }
}
