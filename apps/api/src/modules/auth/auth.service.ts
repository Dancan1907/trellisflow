import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Signup
   */
  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

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
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  /**
   * Login
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  /**
   * Refresh Token
   */
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

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Request Password Reset
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!user) {
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

    return {
      message: 'If that email exists, a reset link has been sent.',
      devToken: rawToken,
    };
  }

  /**
   * Confirm Password Reset
   */
  async confirmPasswordReset(rawToken: string, newPassword: string) {
    const tokens = await this.prisma.emailVerificationToken.findMany({
      where: {
        purpose: 'PASSWORD_RESET',
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    let validToken = null;

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
        where: {
          id: validToken.userId,
        },
        data: {
          passwordHash: newHash,
        },
      }),

      this.prisma.emailVerificationToken.update({
        where: {
          id: validToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Password has been reset successfully.',
    };
  }

  /**
   * Logout (Single Session)
   * Revokes the current session by deleting it from the database.
   */
  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      await this.prisma.session.deleteMany({
        where: { userId: payload.sub },
      });

      return { message: 'Logged out successfully' };
    } catch {
      return { message: 'Logged out successfully' };
    }
  }

  /**
   * Logout All
   * Revokes every session for the user.
   */
  async logoutAll(userId: string) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out from all devices' };
  }

  /**
   * Helper: Generate JWT Access Token and Refresh Token
   */
  private async generateTokens(userId: string, email: string) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });

    await this.prisma.session.create({
      data: {
        id: randomUUID(),
        userId,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
