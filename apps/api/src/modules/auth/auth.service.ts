import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_CATEGORIES } from '../../common/constants/default-categories';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async signup(dto: SignupDto, meta?: { userAgent?: string; ipAddress?: string }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          id: randomUUID(),
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          timezone: dto.timezone ?? 'UTC',
          reportingCurrency: dto.reportingCurrency ?? 'USD',
          personaHint: dto.personaHint,
          containers: {
            create: {
              id: randomUUID(),
              type: 'PERSONAL',
              name: 'Personal',
              currency: dto.reportingCurrency ?? 'USD',
              status: 'ACTIVE',
            },
          },
          categories: {
            createMany: {
              data: DEFAULT_CATEGORIES.map((cat) => ({
                id: randomUUID(),
                name: cat.name,
                type: cat.type,
                icon: cat.icon,
                isSystem: true,
                status: 'ACTIVE',
              })),
            },
          },
        },
      });

      const tokens = await this.generateTokens(user.id, user.email, meta);

      return {
        user: { id: user.id, email: user.email, name: user.name },
        ...tokens,
      };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, meta?: { userAgent?: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$Q2xvdWR5VHJlZUZvcmV2ZXIxMjM0NTY=';

    if (!user || user.deletedAt) {
      await argon2.verify(dummyHash, dto.password).catch(() => false);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, meta);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.deletedAt) {
        throw new UnauthorizedException('User no longer exists');
      }

      const sessions = await this.prisma.session.findMany({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          revokedAt: null,
        },
      });

      let matchedSessionId: string | null = null;
      for (const session of sessions) {
        if (await argon2.verify(session.tokenHash, refreshToken)) {
          matchedSessionId = session.id;
          break;
        }
      }

      if (!matchedSessionId) {
        throw new UnauthorizedException('Session has been revoked');
      }

      await this.prisma.session.update({
        where: { id: matchedSessionId },
        data: { revokedAt: new Date() },
      });

      return this.generateTokens(user.id, user.email);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.deletedAt) {
      return {
        message: 'If that email exists, a reset link has been sent.',
      };
    }

    const rawToken = randomUUID();
    const tokenHash = await argon2.hash(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.emailVerificationToken.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        tokenHash,
        purpose: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, rawToken);

    return {
      message: 'If that email exists, a reset link has been sent.',
    };
  }

  async confirmPasswordReset(rawToken: string, newPassword: string) {
    const tokens = await this.prisma.emailVerificationToken.findMany({
      where: {
        purpose: 'PASSWORD_RESET',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let validToken: (typeof tokens)[number] | null = null;

    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, rawToken)) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const newHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: validToken.userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: validToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      message: 'Password has been reset successfully.',
    };
  }

  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    if (user.emailVerifiedAt) {
      return { message: 'Email already verified' };
    }

    const rawToken = randomUUID();
    const tokenHash = await argon2.hash(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailVerificationToken.create({
      data: {
        id: randomUUID(),
        userId,
        tokenHash,
        purpose: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    });

    await this.emailService.sendVerificationEmail(user.email, rawToken);

    const response: { message: string; devToken?: string } = {
      message: 'Verification email sent',
    };

    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      response.devToken = rawToken;
    }

    return response;
  }

  async confirmEmailVerification(rawToken: string) {
    const tokens = await this.prisma.emailVerificationToken.findMany({
      where: {
        purpose: 'EMAIL_VERIFICATION',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let validToken: (typeof tokens)[number] | null = null;

    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, rawToken)) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: validToken.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: validToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const sessions = await this.prisma.session.findMany({
        where: { userId: payload.sub, revokedAt: null },
      });

      for (const session of sessions) {
        if (await argon2.verify(session.tokenHash, refreshToken)) {
          await this.prisma.session.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
          });
          break;
        }
      }

      return { message: 'Logged out successfully' };
    } catch {
      return { message: 'Logged out successfully' };
    }
  }

  async logoutAll(userId: string) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out from all devices' };
  }

  private async generateTokens(
    userId: string,
    email: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });

    await this.prisma.session.create({
      data: {
        id: randomUUID(),
        userId,
        tokenHash: await argon2.hash(refreshToken),
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  async listSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });

    return sessions;
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Session revoked' };
  }
}
