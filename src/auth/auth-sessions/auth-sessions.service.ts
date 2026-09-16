import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma/prisma.service';

@Injectable()
export class AuthSessionsService {
  constructor(private readonly prismaService: PrismaService) {}
  create(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.prismaService.authSession.create({
      data: {
        id: data.id,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
      },
    });
  }

  findById(id: string) {
    return this.prismaService.authSession.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });
  }

  rotateRefreshToken(data: {
    sessionId: string;
    currentRefreshTokenHash: string;
    newRefreshTokenHash: string;
  }) {
    return this.prismaService.authSession.updateMany({
      where: {
        id: data.sessionId,
        refreshTokenHash: data.currentRefreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        refreshTokenHash: data.newRefreshTokenHash,
      },
    });
  }

  revoke(sessionId: string) {
    return this.prismaService.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  revokeAllForUser(userId: string) {
    return this.prismaService.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
