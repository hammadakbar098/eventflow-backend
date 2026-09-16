import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import { AuthService } from './auth.service';
import { AuthSessionsService } from './auth-sessions/auth-sessions.service';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('AuthService refresh sessions', () => {
  type SessionData = Parameters<AuthSessionsService['create']>[0];

  const credentials = {
    email: 'refresh-test@example.com',
    password: 'test-password',
  };
  const user = {
    id: randomUUID(),
    email: credentials.email,
    passwordHash: '',
    firstName: 'Refresh',
    lastName: 'Test',
    role: 'USER',
    status: 'ACTIVE',
    deletedAt: null,
  };

  let authService: AuthService;
  let session: (SessionData & { revokedAt: null; user: typeof user }) | null;
  let sessionWriteError: Error | undefined;

  beforeAll(async () => {
    user.passwordHash = await argon2.hash(credentials.password);
  });

  beforeEach(() => {
    session = null;
    sessionWriteError = undefined;

    const prisma = {
      user: {
        findUnique: jest.fn(async () => user),
        update: jest.fn(async () => user),
      },
      authSession: {
        create: jest.fn(({ data }: { data: SessionData }) => ({
          // oxlint-disable-next-line unicorn/no-thenable -- Prisma queries execute only when awaited.
          then: (resolve: (value: unknown) => void) => {
            if (sessionWriteError) {
              throw sessionWriteError;
            }
            session = { ...data, revokedAt: null, user };
            resolve(session);
          },
        })),
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(session?.id === where.id ? { ...session } : null),
        ),
        updateMany: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string; refreshTokenHash: string };
            data: { refreshTokenHash: string };
          }) => {
            if (
              !session ||
              session.id !== where.id ||
              session.refreshTokenHash !== where.refreshTokenHash
            ) {
              return Promise.resolve({ count: 0 });
            }
            session.refreshTokenHash = data.refreshTokenHash;
            return Promise.resolve({ count: 1 });
          },
        ),
      },
    } as unknown as PrismaService;

    authService = new AuthService(
      new UsersService(prisma),
      new AuthSessionsService(prisma),
      new JwtService(),
      new ConfigService({
        JWT_ACCESS_SECRET: 'test-only-secret-with-at-least-32-characters',
        JWT_ACCESS_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_IN_DAYS: 7,
      }),
    );
  });

  it('can refresh immediately after login and use the rotated token again', async () => {
    const login = await authService.login(credentials, {});
    const refreshed = await authService.refresh(login.refreshToken);

    expect(refreshed.accessToken).toEqual(expect.any(String));
    expect(refreshed.refreshToken).not.toBe(login.refreshToken);

    const refreshedAgain = await authService.refresh(refreshed.refreshToken);
    expect(refreshedAgain.refreshToken).not.toBe(refreshed.refreshToken);
  });

  it('rejects a refresh token with no stored session', async () => {
    await expect(
      authService.refresh(`${randomUUID()}.missing-session-secret`),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('fails login when the refresh session cannot be saved', async () => {
    sessionWriteError = new Error('Session insert failed');

    await expect(authService.login(credentials, {})).rejects.toThrow(
      'Session insert failed',
    );
  });
});
