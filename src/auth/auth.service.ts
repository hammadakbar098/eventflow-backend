import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';

import { UsersService } from '../users/users.service';
import { AuthSessionsService } from './auth-sessions/auth-sessions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authSessionsService: AuthSessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.usersService.createForRegistration({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
    });

    return {
      message: 'Account created successfully',
      user,
    };
  }

  async login(
    dto: LoginDto,
    metadata: {
      userAgent?: string;
      ipAddress?: string;
    },
  ) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE' || user.deletedAt !== null) {
      throw new ForbiddenException('This account is not active');
    }

    const accessTokenSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    const accessTokenExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as JwtSignOptions['expiresIn'];

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: accessTokenSecret,
        expiresIn: accessTokenExpiresIn,
      },
    );

    const sessionId = randomUUID();

    const refreshSecret = randomBytes(64).toString('base64url');

    const refreshToken = `${sessionId}.${refreshSecret}`;

    const refreshTokenHash = createHash('sha256')
      .update(refreshSecret)
      .digest('hex');

    const refreshTokenExpiresInDays = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRES_IN_DAYS',
      7,
    );

    const expiresAt = new Date(
      Date.now() + refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
    );

    await this.authSessionsService.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });

    await this.usersService.updateLastLoginAt(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    // 1. Refresh token should be:
    // sessionId.randomSecret
    const parts = refreshToken.split('.');

    if (parts.length !== 2) {
      throw new UnauthorizedException('DEBUG: token format invalid');
    }

    const [sessionId, refreshSecret] = parts;

    if (!sessionId || !refreshSecret) {
      throw new UnauthorizedException('DEBUG: token parts missing');
    }

    // 2. Make sure the session ID is a valid UUID
    if (!isUUID(sessionId)) {
      throw new UnauthorizedException('DEBUG: session ID is not UUID');
    }

    // 3. Find the session from PostgreSQL
    const session = await this.authSessionsService.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException('DEBUG: session not found');
    }

    // 4. Check if session was revoked
    if (session.revokedAt !== null) {
      throw new UnauthorizedException('DEBUG: session revoked');
    }

    // 5. Check if refresh session expired
    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('DEBUG: session expired');
    }

    // 6. Make sure user account is still active
    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('DEBUG: user not active');
    }

    if (session.user.deletedAt !== null) {
      throw new UnauthorizedException('DEBUG: user deleted');
    }

    // 7. Hash the secret that came from the client
    const currentRefreshTokenHash = createHash('sha256')
      .update(refreshSecret)
      .digest('hex');

    // 8. Compare it with the hash stored in DB
    if (currentRefreshTokenHash !== session.refreshTokenHash) {
      console.log('Refresh token hash debug:', {
        calculatedHashLength: currentRefreshTokenHash.length,

        storedHashLength: session.refreshTokenHash.length,

        hashesMatch: currentRefreshTokenHash === session.refreshTokenHash,
      });

      throw new UnauthorizedException('DEBUG: refresh token hash mismatch');
    }

    // 9. Generate a brand-new refresh secret
    const newRefreshSecret = randomBytes(64).toString('base64url');

    // Keep the same session ID, but change the secret
    const newRefreshToken = `${session.id}.${newRefreshSecret}`;

    // 10. Hash the new refresh secret
    const newRefreshTokenHash = createHash('sha256')
      .update(newRefreshSecret)
      .digest('hex');

    // 11. Atomically rotate the refresh token
    const rotationResult = await this.authSessionsService.rotateRefreshToken({
      sessionId: session.id,
      currentRefreshTokenHash,
      newRefreshTokenHash,
    });

    if (rotationResult.count !== 1) {
      throw new UnauthorizedException('DEBUG: refresh token rotation failed');
    }

    // 12. Read access-token configuration
    const accessTokenSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    const accessTokenExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as JwtSignOptions['expiresIn'];

    // 13. Create a brand-new access JWT
    const accessToken = await this.jwtService.signAsync(
      {
        sub: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      {
        secret: accessTokenSecret,
        expiresIn: accessTokenExpiresIn,
      },
    );

    // 14. Return BOTH new tokens
    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const parts = refreshToken.split('.');

    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [sessionId, refreshSecret] = parts;

    if (!sessionId || !refreshSecret || !isUUID(sessionId)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.authSessionsService.findById(sessionId);

    if (!session || session.revokedAt !== null) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenHash = createHash('sha256')
      .update(refreshSecret)
      .digest('hex');

    if (refreshTokenHash !== session.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.authSessionsService.revoke(session.id);

    return {
      message: 'Logged out successfully',
    };
  }

  async logoutAll(userId: string) {
    await this.authSessionsService.revokeAllForUser(userId);

    return {
      message: 'Logged out from all devices successfully',
    };
  }
}
